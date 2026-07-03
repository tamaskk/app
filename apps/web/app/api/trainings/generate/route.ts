import { NextRequest } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { TrainingModel } from "@/lib/models/Training";
import { bearerToken, verifyToken } from "@/lib/auth";
import {
  generateTrainingPlan,
  type GeneratorInput,
} from "@/lib/trainingGenerator";
import { ALL_MUSCLES, type MuscleGroup } from "@/lib/exercisePool";

export const runtime = "nodejs";

/**
 * Generate a training plan from the user's onboarding-style preferences.
 *
 * Body: { weeks: 1..20, sessionsPerWeek: 1..6, focusMuscles?: MuscleGroup[] }
 * Returns: { planId, created: number, trainings: Training[] }
 *
 * Each generated session is persisted as its own Training document — same
 * shape as a manually created one, so the rest of the app treats them
 * identically. They share a planId so future PRs can revoke or replay them.
 */
export async function POST(req: NextRequest) {
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;
  if (!userId) {
    return Response.json({ detail: "Unauthorized" }, { status: 401 });
  }

  let body: {
    weeks?: number;
    sessionsPerWeek?: number;
    focusMuscles?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const weeks = clamp(toInt(body.weeks), 1, 20);
  const sessionsPerWeek = clamp(toInt(body.sessionsPerWeek), 1, 6);
  // Filter the incoming focusMuscles down to the supported set so a typo
  // or stale client doesn't blow up the generator.
  const focusMuscles = (body.focusMuscles ?? [])
    .map((m) => m as MuscleGroup)
    .filter((m) => ALL_MUSCLES.includes(m));

  if (!Number.isFinite(weeks) || !Number.isFinite(sessionsPerWeek)) {
    return Response.json(
      { detail: "weeks and sessionsPerWeek are required" },
      { status: 422 },
    );
  }

  const input: GeneratorInput = { weeks, sessionsPerWeek, focusMuscles };
  console.log("[generate] input:", { userId, weeks, sessionsPerWeek, focusMuscles });

  try {
    await connectToDatabase();
    const plan = generateTrainingPlan(input);
    const planId = `plan_${crypto.randomBytes(6).toString("hex")}`;

    console.log("[generate] plan sessions:", plan.length);
    console.log(
      "[generate] exercises per session:",
      plan.map((p) => `${p.name}=${p.exercises.length}`),
    );

    const docs = plan.map((p) => ({
      userId,
      name: p.name,
      exercises: p.exercises,
      source: "generated",
      planId,
      weekIndex: p.weekIndex,
      dayIndex: p.dayIndex,
    }));

    // insertMany is significantly faster than N individual creates for
    // larger plans (e.g. 20 weeks × 6 sessions = 120 docs).
    const created = await TrainingModel.insertMany(docs);
    console.log(
      `[generate] inserted ${created.length} trainings under userId=${userId} planId=${planId}`,
    );

    return Response.json(
      {
        planId,
        created: created.length,
        weeks,
        sessionsPerWeek,
        focusMuscles,
        trainings: created,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/trainings/generate failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}

function toInt(v: unknown): number {
  if (typeof v === "number") return Math.round(v);
  if (typeof v === "string") return parseInt(v, 10);
  return NaN;
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return NaN;
  return Math.max(lo, Math.min(hi, v));
}
