import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { signToken } from "@/lib/auth";
import { sanitizeOnboarding, type IncomingOnboarding } from "@/lib/onboarding";
import { verifyIdToken, type OAuthProvider } from "@/lib/oauth";

export const runtime = "nodejs";

const SUPPORTED: OAuthProvider[] = ["apple", "google"];

// Exchange a provider-issued ID token for an HEFTOR session token.
// First-time users are upserted; the provider's `sub` is the stable key.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerParam } = await params;
  if (!SUPPORTED.includes(providerParam as OAuthProvider)) {
    return Response.json(
      { detail: `Unknown OAuth provider: ${providerParam}` },
      { status: 400 },
    );
  }
  const provider = providerParam as OAuthProvider;

  let body: {
    idToken?: string;
    name?: string;
    onboarding?: IncomingOnboarding;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const idToken = (body.idToken ?? "").trim();
  if (!idToken) {
    return Response.json({ detail: "idToken is required" }, { status: 422 });
  }

  let identity;
  try {
    identity = await verifyIdToken(provider, idToken);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Token verification failed";
    return Response.json({ detail: msg }, { status: 401 });
  }

  // Apple only returns the email on the very first sign-in. If we don't have
  // one here, we still upsert by subject — existing users have it stored.
  try {
    await connectToDatabase();

    // Prefer matching by (provider, subject) — that's the stable identity.
    // Fall back to matching by email so a user who registered with a
    // password can still link their OAuth identity transparently.
    let user = await UserModel.findOne({
      oauthProvider: provider,
      oauthSubject: identity.subject,
    });

    if (!user && identity.email) {
      user = await UserModel.findOne({ email: identity.email.toLowerCase() });
      if (user) {
        user.oauthProvider = provider;
        user.oauthSubject = identity.subject;
      }
    }

    if (!user) {
      if (!identity.email) {
        return Response.json(
          { detail: "Provider did not return an email" },
          { status: 422 },
        );
      }
      const onboarding = sanitizeOnboarding(body.onboarding);
      const name = (body.name ?? identity.name ?? "").trim();
      user = await UserModel.create({
        email: identity.email.toLowerCase(),
        name,
        oauthProvider: provider,
        oauthSubject: identity.subject,
        onboarding: onboarding ?? null,
      });
    }

    await user.save();
    const token = signToken(String(user._id));
    return Response.json({
      token,
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        onboarding: user.onboarding ?? null,
        xp: user.xp ?? 0,
        rank: user.rank ?? 1,
        username: user.username ?? null,
        weeklyPlan: user.weeklyPlan ?? null,
        reminders: user.reminders ?? null,
      },
    });
  } catch {
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
