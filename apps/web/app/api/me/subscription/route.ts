import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { bearerToken, verifyToken } from "@/lib/auth";
import { publicSubscription } from "@/lib/subscription";

export const runtime = "nodejs";

/**
 * GET /api/me/subscription
 *
 * Returns the calling user's current subscription state. The mobile app
 * polls this on launch (alongside /me) and after any paywall interaction.
 *
 * Output mirrors the `subscription` block on the user doc but strips
 * `rawReceipt` and adds a server-evaluated `isPro` so the client doesn't
 * need to duplicate the entitlement logic.
 */
export async function GET(req: NextRequest) {
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;
  if (!userId) {
    return Response.json({ detail: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectToDatabase();
    const user = await UserModel.findById(userId).select("subscription");
    if (!user) {
      return Response.json({ detail: "Unauthorized" }, { status: 401 });
    }
    return Response.json({
      subscription: publicSubscription(user.subscription),
    });
  } catch (err) {
    console.error("GET /api/me/subscription failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
