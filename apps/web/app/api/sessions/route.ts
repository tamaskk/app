import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { WorkoutSessionModel } from "@/lib/models/WorkoutSession";
import { UserModel } from "@/lib/models/User";
import { TrainingModel } from "@/lib/models/Training";
import { mapExercises, type IncomingExercise } from "@/lib/trainings";
import { bearerToken, verifyToken } from "@/lib/auth";
import { calculateSessionXp } from "@/lib/xp";
import { rankForXp } from "@/lib/rank";
import { isStrengthMetric } from "@/lib/hyroxMetrics";

export const runtime = "nodejs";

// List completed workouts, newest finished first — scoped to the calling
// user. Anonymous calls (no bearer token) only see anonymous (userId: null)
// rows, which keeps the demo flow working but prevents cross-account leakage:
// pre-fix this returned EVERY user's sessions, so the summary/progress screens
// mixed other accounts' workouts into the current user's stats.
export async function GET(req: NextRequest) {
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;
  try {
    await connectToDatabase();
    const sessions = await WorkoutSessionModel.find({ userId: userId ?? null })
      .sort({ finishedAt: -1, createdAt: -1 })
      .lean();
    return Response.json({ results: sessions });
  } catch (err) {
    console.error("GET /api/sessions failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}

// Save a completed workout (start/finish times + the logged sets and checks).
// When the request is authenticated, this also awards XP based on lib/xp.ts
// and bumps the user's rank when a threshold is crossed.
export async function POST(req: NextRequest) {
  let body: {
    trainingId?: string | null;
    name?: string;
    startedAt?: string;
    finishedAt?: string;
    exercises?: IncomingExercise[];
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  // Auth is optional here — older client builds may still post unauthenticated.
  // When present, the session is owned and earns XP; when absent, XP is skipped.
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;

  try {
    await connectToDatabase();

    const startedAt = body.startedAt ? new Date(body.startedAt) : new Date();
    const finishedAt = body.finishedAt ? new Date(body.finishedAt) : new Date();
    const exercises = mapExercises(body.exercises);

    // Create the session first so we can reference its id in the XP audit log.
    const session = await WorkoutSessionModel.create({
      userId,
      trainingId: body.trainingId ?? null,
      name: (body.name ?? "").trim(),
      startedAt,
      finishedAt,
      exercises,
    });

    // Stamp the source Training as "done" so the generated-stories row can
    // sort completed cards to the end. Best-effort — failure here doesn't
    // block the session save.
    if (userId && body.trainingId) {
      try {
        await TrainingModel.updateOne(
          { _id: body.trainingId, userId },
          { $set: { doneAt: finishedAt } },
        );
      } catch {
        // ignore
      }
    }

    let xpAwarded = 0;
    let previousRank = 1;
    let newRank = 1;

    if (userId) {
      const user = await UserModel.findById(userId).select("+xpLog");
      if (user) {
        previousRank = user.rank ?? 1;

        // PR detection: walk the user's prior sessions (including the one we
        // just saved up to but not including the new XP) and compare e1RM.
        // For Csomag 1 we do this with a per-exercise running max over the
        // user's session history — a deliberate simple heuristic that the
        // dedicated /api/progress/stagnation endpoint can be reused later.
        const prCount = await detectPrCount(userId, session._id.toString(), exercises);

        // Weekly goal hit: this session pushes the user from (goal-1) to goal.
        const goal = user.onboarding?.daysPerWeek ?? 0;
        const weeklyAfter = goal > 0
          ? await countWeeklySessions(userId, finishedAt)
          : 0;
        const hitWeeklyGoal = goal > 0 && weeklyAfter === goal;

        const streakWeeks = await computeStreakWeeks(userId, finishedAt);

        const durationMinutes = Math.max(
          0,
          Math.round((finishedAt.getTime() - startedAt.getTime()) / 60_000),
        );

        const breakdown = calculateSessionXp({
          exercises,
          durationMinutes,
          prCount,
          hitWeeklyGoal,
          currentStreakWeeks: streakWeeks,
          at: finishedAt,
          sessionId: session._id.toString(),
        });

        xpAwarded = breakdown.total;
        if (xpAwarded > 0) {
          user.xp = (user.xp ?? 0) + xpAwarded;
          newRank = rankForXp(user.xp).tier;
          if (newRank > previousRank) {
            user.rank = newRank;
            user.lastRankUpAt = finishedAt;
          }
          user.xpLog.push(...breakdown.events);
          await user.save();

          // Denormalise XP onto the session so the summary screen can render
          // the breakdown without re-deriving it.
          session.xpAwarded = xpAwarded;
          await session.save();
        }
      }
    }

    return Response.json(
      {
        ...session.toObject(),
        // Surface the rank delta so the client can show the rank-up overlay.
        rankDelta: {
          previousRank,
          newRank,
          xpAwarded,
          unlocked: newRank > previousRank,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/sessions failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}

/** Count `userId`'s distinct training days inside the ISO week of [finishedAt]. */
async function countWeeklySessions(userId: string, finishedAt: Date): Promise<number> {
  const weekday = finishedAt.getDay() || 7; // Sunday→7, Monday→1
  const monday = new Date(finishedAt);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - (weekday - 1));
  const next = new Date(monday);
  next.setDate(next.getDate() + 7);
  const sessions = await WorkoutSessionModel.find({
    userId,
    finishedAt: { $gte: monday, $lt: next },
  })
    .select("finishedAt")
    .lean();
  const days = new Set<string>();
  for (const s of sessions) {
    if (!s.finishedAt) continue;
    const d = new Date(s.finishedAt);
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  return days.size;
}

/** Best-effort PR detection: counts how many exercises in this session beat
 *  the user's all-time best e1RM (Epley) for that exercise. */
async function detectPrCount(
  userId: string,
  excludeSessionId: string,
  exercises: ReturnType<typeof mapExercises>,
): Promise<number> {
  const exerciseKeys = exercises
    .map((e) => e.exerciseId)
    .filter((id): id is string => !!id);
  if (exerciseKeys.length === 0) return 0;

  const priorSessions = await WorkoutSessionModel.find({
    userId,
    _id: { $ne: excludeSessionId },
  })
    .select("exercises")
    .lean();

  const priorBest = new Map<string, number>();
  for (const s of priorSessions) {
    for (const ex of s.exercises ?? []) {
      if (!ex.exerciseId) continue;
      // Skip HYROX stations (distance/time/loaded carries) — e1RM is meaningless
      // for them and would otherwise register a 152 kg sled as a "PR".
      if (!isStrengthMetric((ex as { metric?: string | null }).metric)) continue;
      for (const set of ex.sets ?? []) {
        if (!set.done || (set.reps ?? 0) < 1 || (set.kg ?? 0) <= 0) continue;
        const e1rm = (set.kg ?? 0) * (1 + (set.reps ?? 0) / 30);
        const cur = priorBest.get(ex.exerciseId) ?? 0;
        if (e1rm > cur) priorBest.set(ex.exerciseId, e1rm);
      }
    }
  }

  let prCount = 0;
  for (const ex of exercises) {
    if (!ex.exerciseId) continue;
    if (!isStrengthMetric(ex.metric)) continue;
    let best = 0;
    for (const set of ex.sets ?? []) {
      if (!set.done || (set.reps ?? 0) < 1 || (set.kg ?? 0) <= 0) continue;
      const e1rm = (set.kg ?? 0) * (1 + (set.reps ?? 0) / 30);
      if (e1rm > best) best = e1rm;
    }
    const prior = priorBest.get(ex.exerciseId) ?? 0;
    // Same 0.5 kg threshold used in the mobile recent_pr utility — keeps the
    // backend and the client in agreement on what counts as a PR.
    if (best > prior + 0.5) prCount++;
  }
  return prCount;
}

/** Consecutive weeks ending in the week of [finishedAt] that have ≥1 session. */
async function computeStreakWeeks(userId: string, finishedAt: Date): Promise<number> {
  const sessions = await WorkoutSessionModel.find({ userId })
    .select("finishedAt startedAt")
    .lean();
  const weekKeys = new Set<number>();
  for (const s of sessions) {
    const d = s.finishedAt ?? s.startedAt;
    if (!d) continue;
    weekKeys.add(weekStart(new Date(d)).getTime());
  }
  let cursor = weekStart(finishedAt);
  let streak = 0;
  while (weekKeys.has(cursor.getTime())) {
    streak++;
    cursor = new Date(cursor.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  return streak;
}

function weekStart(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const weekday = out.getDay() || 7;
  out.setDate(out.getDate() - (weekday - 1));
  return out;
}
