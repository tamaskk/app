import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { WorkoutSessionModel } from "@/lib/models/WorkoutSession";
import { TrainingModel } from "@/lib/models/Training";
import { rankForXp } from "@/lib/rank";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: {
    name?: string;
    username?: string | null;
    xp?: number;
    country?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const user = await UserModel.findById(id);
    if (!user) {
      return Response.json({ detail: "User not found" }, { status: 404 });
    }
    if (typeof body.name === "string") user.name = body.name.trim();
    if (typeof body.username === "string" || body.username === null) {
      user.username = body.username ? body.username.trim() : null;
    }
    if (typeof body.country === "string" || body.country === null) {
      user.country = body.country ? body.country.toUpperCase() : null;
    }
    if (typeof body.xp === "number" && Number.isFinite(body.xp)) {
      user.xp = Math.max(0, Math.round(body.xp));
      user.rank = rankForXp(user.xp).tier;
    }
    await user.save();
    return Response.json({
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        username: user.username,
        xp: user.xp,
        rank: user.rank,
        rankName: rankForXp(user.xp ?? 0).name,
      },
    });
  } catch (err) {
    console.error("PATCH /api/users/[id] failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await connectToDatabase();
    // Cascade delete the user's training data so we don't leave orphans.
    await Promise.all([
      WorkoutSessionModel.deleteMany({ userId: id }),
      TrainingModel.deleteMany({ userId: id }),
      UserModel.findByIdAndDelete(id),
    ]);
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("DELETE /api/users/[id] failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
