import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { bearerToken, verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Save the user's daily reminder preferences. Local scheduling lives on
 *  the client — the backend just remembers the choice. */
export async function PATCH(req: NextRequest) {
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;
  if (!userId) {
    return Response.json({ detail: "Unauthorized" }, { status: 401 });
  }

  let body: { enabled?: unknown; time?: unknown; days?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const enabled = typeof body.enabled === "boolean" ? body.enabled : false;
  const time =
    typeof body.time === "string" && TIME_RE.test(body.time)
      ? body.time
      : "18:00";

  let days: number[] = [];
  if (Array.isArray(body.days)) {
    const set = new Set<number>();
    for (const d of body.days) {
      if (typeof d !== "number") continue;
      const n = Math.round(d);
      if (n >= 1 && n <= 7) set.add(n);
    }
    days = Array.from(set).sort((a, b) => a - b);
  }

  try {
    await connectToDatabase();
    const user = await UserModel.findById(userId);
    if (!user) {
      return Response.json({ detail: "Unauthorized" }, { status: 401 });
    }
    user.reminders = { enabled, time, days };
    await user.save();
    return Response.json({
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        onboarding: user.onboarding ?? null,
        xp: user.xp ?? 0,
        rank: user.rank ?? 1,
        username: user.username ?? null,
        weeklyPlan: user.weeklyPlan,
        reminders: user.reminders,
      },
    });
  } catch (err) {
    console.error("PATCH /api/me/reminders failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
