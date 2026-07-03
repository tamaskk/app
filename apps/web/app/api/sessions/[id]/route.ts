import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { WorkoutSessionModel } from "@/lib/models/WorkoutSession";
import { bearerToken, verifyToken } from "@/lib/auth";
import { mapExercises, type IncomingExercise } from "@/lib/trainings";

export const runtime = "nodejs";

// Update an already-logged session in place. This exists so that resuming a
// finished workout (dashboard → "continue") and finishing it again UPDATES the
// original session instead of POSTing a brand-new one. The old flow created a
// second overlapping session and re-awarded XP for sets that were already
// rewarded — so this handler deliberately does NOT touch XP or rank; it only
// refreshes the logged sets and the finish time. The original startedAt is
// preserved to keep the duration honest.
export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/sessions/[id]">,
) {
  const { id } = await ctx.params;
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;

  let body: { finishedAt?: string; exercises?: IncomingExercise[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const update: {
    finishedAt?: Date;
    exercises?: ReturnType<typeof mapExercises>;
  } = {};
  if (typeof body.finishedAt === "string") {
    update.finishedAt = new Date(body.finishedAt);
  }
  if (Array.isArray(body.exercises)) {
    update.exercises = mapExercises(body.exercises);
  }

  try {
    await connectToDatabase();
    // Find-then-compare so "not yours" and "doesn't exist" both 404, matching
    // the /api/trainings/[id] ownership pattern.
    const existing = await WorkoutSessionModel.findById(id).select("userId");
    if (!existing || (existing.userId ?? null) !== (userId ?? null)) {
      return Response.json({ detail: "Not found" }, { status: 404 });
    }
    const updated = await WorkoutSessionModel.findByIdAndUpdate(id, update, {
      new: true,
    }).lean();
    // No rankDelta: XP is unchanged on an update, so the client shows the
    // summary without a rank-up overlay or a second XP award.
    return Response.json(updated);
  } catch (err) {
    console.error("PATCH /api/sessions/[id] failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
