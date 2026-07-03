import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { WorkoutSessionModel } from "@/lib/models/WorkoutSession";
import { bearerToken, verifyToken } from "@/lib/auth";
import {
  computeSuggestion,
  normalizeStrategy,
  type ProgressionStrategy,
  type SessionHistoryEntry,
} from "@/lib/progression";

export const runtime = "nodejs";

type RequestExercise = {
  exerciseId?: string;
  strategy?: ProgressionStrategy | string;
  category?: string | null;
  targetMuscles?: string[];
  name?: string;
};

// How many recent sessions of an exercise to feed the engine.
const HISTORY_DEPTH = 3;

// Suggest the next working set for each requested exercise, from its recent
// session history. Batched so the client makes one call per workout, not one
// per exercise. Returns a map keyed by exerciseId; value is null when no
// suggestion applies (strategy "none", or no history yet).
export async function POST(req: NextRequest) {
  let body: { exercises?: RequestExercise[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const requested = (body.exercises ?? []).filter(
    (e) => e.exerciseId != null && `${e.exerciseId}` !== "",
  );
  if (requested.length === 0) {
    return Response.json({ suggestions: {} });
  }

  const ids = [...new Set(requested.map((e) => `${e.exerciseId}`))];

  // Suggestions must be derived from the CALLER's own history only. Without
  // this scoping the engine read every user's sessions, so a new account got
  // next-set weights based on strangers' logs. Anonymous calls (no token) are
  // scoped to userId:null and simply get no history-based suggestion.
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;

  try {
    await connectToDatabase();

    // One query for every relevant session; group the matching exercise
    // entries per id in memory (a session can contain several exercises).
    const sessions = await WorkoutSessionModel.find({
      userId: userId ?? null,
      "exercises.exerciseId": { $in: ids },
    })
      .sort({ finishedAt: -1, createdAt: -1 })
      .limit(200)
      .lean();

    const historyById = new Map<string, SessionHistoryEntry[]>();
    for (const id of ids) historyById.set(id, []);

    for (const session of sessions) {
      const finishedAt = session.finishedAt ?? session.createdAt ?? null;
      for (const ex of session.exercises ?? []) {
        const exId = `${ex.exerciseId ?? ""}`;
        const bucket = historyById.get(exId);
        if (!bucket || bucket.length >= HISTORY_DEPTH) continue;
        bucket.push({
          finishedAt,
          sets: (ex.sets ?? []).map((s) => ({ kg: s.kg, reps: s.reps, done: s.done })),
        });
      }
    }

    const suggestions: Record<string, unknown> = {};
    for (const e of requested) {
      const id = `${e.exerciseId}`;
      const suggestion = computeSuggestion({
        strategy: normalizeStrategy(e.strategy),
        history: historyById.get(id) ?? [],
        category: e.category ?? null,
        targetMuscles: e.targetMuscles ?? [],
        name: e.name,
      });
      suggestions[id] = suggestion; // null when nothing to suggest
    }

    return Response.json({ suggestions });
  } catch (err) {
    console.error("POST /api/progression failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
