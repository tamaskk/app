import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { bearerToken, verifyToken } from "@/lib/auth";
import {
  sanitizeOnboarding,
  type IncomingOnboarding,
} from "@/lib/onboarding";

export const runtime = "nodejs";

/**
 * Save the onboarding answers for the currently authenticated user.
 * Used by the post-registration onboarding flow — the user creates the
 * account first and then fills in their training preferences.
 */
export async function PATCH(req: NextRequest) {
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;
  if (!userId) {
    return Response.json({ detail: "Unauthorized" }, { status: 401 });
  }

  let body: { onboarding?: IncomingOnboarding };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const onboarding = sanitizeOnboarding(body.onboarding);
  if (!onboarding) {
    return Response.json(
      { detail: "Onboarding payload was empty or malformed" },
      { status: 422 },
    );
  }

  try {
    await connectToDatabase();
    const user = await UserModel.findById(userId);
    if (!user) {
      return Response.json({ detail: "Unauthorized" }, { status: 401 });
    }
    // The schema marks focusMuscles as a defaulted array; sanitizeOnboarding
    // may return it undefined, so coerce here so Mongoose doesn't complain.
    user.onboarding = {
      ...onboarding,
      focusMuscles: onboarding.focusMuscles ?? [],
    };
    await user.save();
    return Response.json({
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        onboarding: user.onboarding,
        xp: user.xp ?? 0,
        rank: user.rank ?? 1,
        username: user.username ?? null,
        weeklyPlan: user.weeklyPlan ?? null,
        reminders: user.reminders ?? null,
      },
    });
  } catch (err) {
    console.error("PATCH /api/me/onboarding failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
