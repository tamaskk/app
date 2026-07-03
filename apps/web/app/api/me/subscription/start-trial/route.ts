import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { bearerToken, verifyToken } from "@/lib/auth";
import { TRIAL_DAYS, publicSubscription } from "@/lib/subscription";

export const runtime = "nodejs";

/**
 * POST /api/me/subscription/start-trial
 *
 * Begins a one-time 3-day free trial. Refuses (409) if the user already
 * started one — `trialUsedAt` is the lifetime guard. Refuses (409) if the
 * user is currently entitled (paid or trialing) so the button isn't a
 * trap.
 */
export async function POST(req: NextRequest) {
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;
  if (!userId) {
    return Response.json({ detail: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const user = await UserModel.findById(userId);
    if (!user) {
      return Response.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const sub = user.subscription ?? { status: "free" };
    if (sub.trialUsedAt) {
      return Response.json(
        { detail: "Trial already used" },
        { status: 409 },
      );
    }
    if (sub.status === "trialing" || sub.status === "active") {
      return Response.json(
        { detail: "You already have Pro access" },
        { status: 409 },
      );
    }

    const now = new Date();
    const trialEndsAt = new Date(
      now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
    );

    user.subscription = {
      ...sub,
      status: "trialing",
      // Plan stays null — the trial isn't tied to a plan choice yet.
      plan: null,
      provider: null,
      productId: null,
      trialUsedAt: now,
      trialEndsAt,
      currentPeriodEnd: null,
      lastValidatedAt: now,
    };
    await user.save();

    return Response.json({
      subscription: publicSubscription(user.subscription),
    });
  } catch (err) {
    console.error("POST /api/me/subscription/start-trial failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
