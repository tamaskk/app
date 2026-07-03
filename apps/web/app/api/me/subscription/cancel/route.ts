import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { bearerToken, verifyToken } from "@/lib/auth";
import { publicSubscription } from "@/lib/subscription";

export const runtime = "nodejs";

/**
 * POST /api/me/subscription/cancel
 *
 * Marks the subscription as `cancelled`. We deliberately do NOT clear
 * `currentPeriodEnd` — the user paid for that window and `hasProAccess`
 * keeps them Pro until it elapses, at which point a separate sweep job
 * (or the next /me/subscription read) flips them to `expired`.
 *
 * Real cancellation lives in the App Store / Play Store — this endpoint
 * just mirrors the user's intent so our UI can show the right banner.
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
    if (sub.status === "free" || sub.status === "expired") {
      return Response.json(
        { detail: "Nothing to cancel" },
        { status: 409 },
      );
    }

    user.subscription = {
      ...sub,
      status: "cancelled",
      lastValidatedAt: new Date(),
    };
    await user.save();

    return Response.json({
      subscription: publicSubscription(user.subscription),
    });
  } catch (err) {
    console.error("POST /api/me/subscription/cancel failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
