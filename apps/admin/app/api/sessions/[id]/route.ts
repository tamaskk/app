import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { WorkoutSessionModel } from "@/lib/models/WorkoutSession";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await connectToDatabase();
    await WorkoutSessionModel.findByIdAndDelete(id);
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}

type IncomingSet = { kg?: unknown; reps?: unknown; done?: unknown };
type IncomingExercise = {
  exerciseId?: unknown;
  name?: unknown;
  gifUrl?: unknown;
  targetMuscles?: unknown;
  sets?: unknown;
};

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapExercise(e: IncomingExercise) {
  return {
    exerciseId: e.exerciseId != null ? String(e.exerciseId) : "",
    name: e.name != null ? String(e.name) : "",
    gifUrl: e.gifUrl != null ? String(e.gifUrl) : "",
    targetMuscles: Array.isArray(e.targetMuscles)
      ? e.targetMuscles.map((m) => String(m))
      : [],
    sets: Array.isArray(e.sets)
      ? (e.sets as IncomingSet[]).map((s) => ({
          kg: toNum(s.kg),
          reps: Math.round(toNum(s.reps)),
          done: !!s.done,
        }))
      : [],
  };
}

// Edit a logged session from the admin: name, start/finish times, XP, and the
// full exercise/set list (including each set's done flag).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: {
    name?: unknown;
    startedAt?: unknown;
    finishedAt?: unknown;
    xpAwarded?: unknown;
    exercises?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.name === "string") update.name = body.name.trim();
  if ("startedAt" in body) {
    update.startedAt = body.startedAt ? new Date(String(body.startedAt)) : null;
  }
  if ("finishedAt" in body) {
    update.finishedAt = body.finishedAt
      ? new Date(String(body.finishedAt))
      : null;
  }
  if (body.xpAwarded != null && Number.isFinite(Number(body.xpAwarded))) {
    update.xpAwarded = Math.round(Number(body.xpAwarded));
  }
  if (Array.isArray(body.exercises)) {
    update.exercises = (body.exercises as IncomingExercise[]).map(mapExercise);
  }

  try {
    await connectToDatabase();
    const updated = await WorkoutSessionModel.findByIdAndUpdate(id, update, {
      new: true,
    }).lean();
    if (!updated) {
      return Response.json({ detail: "Not found" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
