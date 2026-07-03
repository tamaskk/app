import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TrainingModel } from "@/lib/models/Training";
import { UserModel } from "@/lib/models/User";
import { bearerToken, verifyToken } from "@/lib/auth";
import { mapExercises, type IncomingExercise } from "@/lib/trainings";
import { FREE_TIER, hasProAccess } from "@/lib/subscription";

// List saved trainings — scoped to the calling user. Older calls without
// a bearer token only see anonymous (userId: null) rows, which keeps the
// demo flow working but prevents accidental cross-account data leakage.
//
// This was a real bug: pre-fix the handler returned every training in the
// collection regardless of who asked, which meant a brand-new account
// could see (and edit) the previous test user's data.
export async function GET(req: NextRequest) {
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;
  // Discipline scoping: HYROX plans live in their own tab, so the regular
  // Edzések list must NOT see them. When `?discipline=` is given we filter to
  // exactly that; otherwise we exclude hyrox by default. `$ne` also matches
  // documents with no `discipline` field (older trainings), so they still show.
  const discipline = req.nextUrl.searchParams.get("discipline");
  const disciplineFilter = discipline
    ? { discipline }
    : { discipline: { $ne: "hyrox" } };
  try {
    await connectToDatabase();
    const trainings = await TrainingModel.find({
      userId: userId ?? null,
      ...disciplineFilter,
    })
      .sort({ createdAt: -1 })
      .lean();
    return Response.json({ results: trainings });
  } catch {
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}

// Create a new training from the exercises the user picked. Enforces the
// free-tier ceiling (max 2 saved workouts) — paid / trialing users can
// save unlimited. Anonymous calls (no bearer token) are left ungated to
// stay backwards-compatible with older clients that haven't shipped Pro
// awareness yet; those builds will lose the ceiling check, which is OK
// for the rollout window.
export async function POST(req: NextRequest) {
  let body: { name?: string; exercises?: IncomingExercise[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return Response.json({ detail: "Training name is required" }, { status: 422 });
  }

  const exercises = mapExercises(body.exercises);
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;

  try {
    await connectToDatabase();

    if (userId) {
      const user = await UserModel.findById(userId).select("subscription");
      if (user && !hasProAccess(user.subscription)) {
        const count = await TrainingModel.countDocuments({ userId });
        if (count >= FREE_TIER.maxSavedWorkouts) {
          return Response.json(
            {
              detail: "Free tier limit reached",
              code: "FREE_TIER_LIMIT",
              limit: FREE_TIER.maxSavedWorkouts,
            },
            { status: 402 },
          );
        }
      }
    }

    const training = await TrainingModel.create({
      name,
      exercises,
      userId: userId ?? null,
    });
    return Response.json(training, { status: 201 });
  } catch (err) {
    console.error("POST /api/trainings failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
