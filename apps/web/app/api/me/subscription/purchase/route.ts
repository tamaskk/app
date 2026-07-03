import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { bearerToken, verifyToken } from "@/lib/auth";
import {
  PRICING,
  publicSubscription,
  type SubscriptionPlan,
  type SubscriptionProvider,
} from "@/lib/subscription";

export const runtime = "nodejs";

const ALLOWED_PLANS: SubscriptionPlan[] = ["monthly", "yearly"];
const ALLOWED_PROVIDERS: SubscriptionProvider[] = [
  "apple",
  "google",
  "stripe",
  "manual",
];

/**
 * POST /api/me/subscription/purchase
 *
 * Records a successful purchase. In production the `receipt` field will be
 * a StoreKit / Play Store purchase token that we hand off to Apple's
 * `/verifyReceipt` (or App Store Server API) / Google Play Developer API
 * for server-side validation before flipping the user to Pro.
 *
 * For the current MVP we accept the client claim without verification —
 * the gate exists in code but the contract is wire-compatible so dropping
 * in real receipt validation later is one function added below the body
 * parse.
 *
 * Body: { plan: 'monthly'|'yearly', provider, productId?, receipt? }
 */
export async function POST(req: NextRequest) {
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;
  if (!userId) {
    return Response.json({ detail: "Unauthorized" }, { status: 401 });
  }

  let body: {
    plan?: string;
    provider?: string;
    productId?: string;
    receipt?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const plan = body.plan as SubscriptionPlan | undefined;
  const provider = body.provider as SubscriptionProvider | undefined;
  if (!plan || !ALLOWED_PLANS.includes(plan)) {
    return Response.json({ detail: "Invalid plan" }, { status: 422 });
  }
  if (!provider || !ALLOWED_PROVIDERS.includes(provider)) {
    return Response.json({ detail: "Invalid provider" }, { status: 422 });
  }

  // TODO: real receipt validation (Apple App Store Server API, Google Play
  // Developer API, Stripe webhook). For now we trust the client claim and
  // grant the entitlement window so the end-to-end flow can be tested.

  const now = new Date();
  const periodMs =
    plan === "monthly"
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 365 * 24 * 60 * 60 * 1000; // 1 year
  const currentPeriodEnd = new Date(now.getTime() + periodMs);

  try {
    await connectToDatabase();
    const user = await UserModel.findById(userId);
    if (!user) {
      return Response.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const productId =
      body.productId?.trim() || PRICING[plan].productId;

    user.subscription = {
      ...(user.subscription ?? { status: "free" }),
      status: "active",
      plan,
      provider,
      productId,
      currentPeriodEnd,
      lastValidatedAt: now,
      rawReceipt: body.receipt ?? null,
    };
    await user.save();

    return Response.json({
      subscription: publicSubscription(user.subscription),
    });
  } catch (err) {
    console.error("POST /api/me/subscription/purchase failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
