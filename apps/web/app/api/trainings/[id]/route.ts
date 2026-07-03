import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TrainingModel } from "@/lib/models/Training";
import { bearerToken, verifyToken } from "@/lib/auth";
import { mapExercises, type IncomingExercise } from "@/lib/trainings";

export const runtime = "nodejs";

// Every per-id mutation must match the calling user's scope so a
// determined attacker can't enumerate (or wipe) another account's data by
// guessing IDs. The pattern below — find first, compare userId, then act
// — gives us a clean 404 for both "doesn't exist" and "not yours", which
// avoids leaking existence to outsiders.

// Delete a training.
export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<"/api/trainings/[id]">,
) {
  const { id } = await ctx.params;
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;
  try {
    await connectToDatabase();
    const existing = await TrainingModel.findById(id).select("userId");
    if (!existing || (existing.userId ?? null) !== (userId ?? null)) {
      return Response.json({ detail: "Not found" }, { status: 404 });
    }
    await TrainingModel.findByIdAndDelete(id);
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("DELETE /api/trainings/[id] failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}

// Fetch a single training.
export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/trainings/[id]">,
) {
  const { id } = await ctx.params;
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;
  try {
    await connectToDatabase();
    const training = await TrainingModel.findById(id).lean();
    if (!training || (training.userId ?? null) !== (userId ?? null)) {
      return Response.json({ detail: "Not found" }, { status: 404 });
    }
    return Response.json(training);
  } catch (err) {
    console.error("GET /api/trainings/[id] failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}

// Update a training (name and/or exercises). Used to persist live edits.
export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/trainings/[id]">,
) {
  const { id } = await ctx.params;
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;
  let body: { name?: string; exercises?: IncomingExercise[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const update: { name?: string; exercises?: ReturnType<typeof mapExercises> } =
    {};
  if (typeof body.name === "string" && body.name.trim()) {
    update.name = body.name.trim();
  }
  if (Array.isArray(body.exercises)) {
    update.exercises = mapExercises(body.exercises);
  }

  try {
    await connectToDatabase();
    const existing = await TrainingModel.findById(id).select("userId");
    if (!existing || (existing.userId ?? null) !== (userId ?? null)) {
      return Response.json({ detail: "Not found" }, { status: 404 });
    }
    const updated = await TrainingModel.findByIdAndUpdate(id, update, {
      new: true,
    }).lean();
    return Response.json(updated);
  } catch (err) {
    console.error("PATCH /api/trainings/[id] failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
