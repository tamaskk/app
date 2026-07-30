import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { bearerToken, verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

// POST /api/calories — estimate calories burned per exercise for a workout.
//
// Uses OpenAI to reason over the trainee's bodyweight + sex and the actual sets
// logged (weight kg × reps). Returns a per-exercise kcal breakdown (same order
// as the input) plus the total. The mobile client stamps these onto the session
// so the summary can show per-exercise + total burned calories.
//
// Auth is REQUIRED — bodyweight/sex come from the calling user's onboarding.
// Set OPENAI_API_KEY (+ optional OPENAI_MODEL) in the environment.

type IncomingSet = { kg?: number; reps?: number };
type IncomingExercise = {
  name?: string;
  targetMuscles?: string[];
  sets?: IncomingSet[];
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export async function POST(req: NextRequest) {
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;
  if (!userId) {
    return Response.json(
      { detail: "Sign in to estimate calories." },
      { status: 401 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY ?? process.env.OPENAI;
  if (!apiKey) {
    return Response.json(
      { detail: "Calorie estimation is not configured." },
      { status: 503 },
    );
  }

  let body: { exercises?: IncomingExercise[]; durationSeconds?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const exercises = Array.isArray(body.exercises) ? body.exercises : [];
  if (exercises.length === 0) {
    return Response.json({ detail: "No exercises to estimate." }, { status: 400 });
  }

  // Guard: every set must have reps > 0 (the client also gates the button, but
  // don't trust it). kg may be 0 for bodyweight movements.
  const allFilled = exercises.every(
    (e) =>
      Array.isArray(e.sets) &&
      e.sets.length > 0 &&
      e.sets.every((s) => (s.reps ?? 0) > 0),
  );
  if (!allFilled) {
    return Response.json(
      { detail: "Fill in reps for every set first." },
      { status: 400 },
    );
  }

  let weightKg = 75;
  let sex = "unknown";
  try {
    await connectToDatabase();
    const user = await UserModel.findById(userId).lean();
    const ob = (user as { onboarding?: { weightKg?: number; gender?: string } } | null)
      ?.onboarding;
    if (ob?.weightKg && ob.weightKg > 0) weightKg = ob.weightKg;
    if (ob?.gender) sex = ob.gender;
  } catch {
    // Fall back to defaults; a DB blip shouldn't block the estimate.
  }

  // Compact the exercises for the prompt: name + a per-set (kg×reps) summary.
  const promptExercises = exercises.map((e) => ({
    name: (e.name ?? "").trim() || "Exercise",
    muscles: Array.isArray(e.targetMuscles) ? e.targetMuscles : [],
    sets: (e.sets ?? []).map((s) => ({
      kg: Math.max(0, Number(s.kg) || 0),
      reps: Math.max(0, Number(s.reps) || 0),
    })),
  }));
  const durationMin = body.durationSeconds
    ? Math.round(body.durationSeconds / 60)
    : null;

  const system =
    "You are an exercise physiologist estimating calories burned during " +
    "resistance training. Given a trainee's bodyweight and sex and the exact " +
    "sets performed (external load in kg times reps), estimate the energy " +
    "expended per exercise, including the work sets and the typical short rest " +
    "between them. Account for load, total reps, and the muscle mass involved " +
    "(compound lifts burn more than small isolation moves). Bodyweight " +
    "movements (kg = 0) still cost energy scaled by the trainee's mass. Be " +
    "realistic: a single strength exercise is usually 15-90 kcal. Respond with " +
    "STRICT JSON only.";

  const userMsg = JSON.stringify({
    trainee: { bodyweightKg: weightKg, sex },
    workoutDurationMinutes: durationMin,
    exercises: promptExercises,
    responseFormat:
      'Return {"results":[{"kcal": <integer>}, ...]} with EXACTLY one entry ' +
      "per exercise, in the SAME order as the input. kcal = whole-number " +
      "calories burned during that exercise.",
  });

  let data: unknown;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 25_000);
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("OpenAI calories error:", res.status, errText.slice(0, 500));
      return Response.json(
        { detail: "Calorie estimation failed. Try again." },
        { status: 502 },
      );
    }
    data = await res.json();
  } catch (err) {
    console.error("POST /api/calories fetch failed:", err);
    return Response.json(
      { detail: "Calorie estimation failed. Try again." },
      { status: 502 },
    );
  }

  // Parse the model's JSON payload out of the chat envelope.
  const content = (
    data as { choices?: { message?: { content?: string } }[] }
  )?.choices?.[0]?.message?.content;
  let parsed: { results?: { kcal?: number }[] } = {};
  try {
    parsed = JSON.parse(content ?? "{}");
  } catch {
    console.error("OpenAI calories: unparseable content:", content?.slice(0, 300));
    return Response.json(
      { detail: "Calorie estimation failed. Try again." },
      { status: 502 },
    );
  }

  const results = Array.isArray(parsed.results) ? parsed.results : [];
  // Align to input order; clamp to a sane range; default a missing entry to 0.
  const perExercise = exercises.map((e, i) => {
    const raw = Number(results[i]?.kcal);
    const kcal = Number.isFinite(raw) ? Math.max(0, Math.min(2000, Math.round(raw))) : 0;
    return { name: (e.name ?? "").trim(), kcal };
  });
  const total = perExercise.reduce((a, x) => a + x.kcal, 0);

  return Response.json({ total, perExercise });
}
