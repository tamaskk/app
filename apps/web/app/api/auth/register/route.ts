import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { hashPassword, signToken } from "@/lib/auth";
import { sanitizeOnboarding, type IncomingOnboarding } from "@/lib/onboarding";

export const runtime = "nodejs";

// Create an account and return a session token.
export async function POST(req: NextRequest) {
  let body: {
    email?: string;
    password?: string;
    name?: string;
    onboarding?: IncomingOnboarding;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim();
  const onboarding = sanitizeOnboarding(body.onboarding);

  if (!email || !email.includes("@")) {
    return Response.json({ detail: "Valid email is required" }, { status: 422 });
  }
  if (password.length < 6) {
    return Response.json(
      { detail: "Password must be at least 6 characters" },
      { status: 422 },
    );
  }

  try {
    await connectToDatabase();
    const existing = await UserModel.findOne({ email }).lean();
    if (existing) {
      return Response.json(
        { detail: "Email already registered" },
        { status: 409 },
      );
    }
    const user = await UserModel.create({
      email,
      name,
      passwordHash: hashPassword(password),
      onboarding: onboarding ?? null,
    });
    const token = signToken(String(user._id));
    return Response.json(
      {
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
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/auth/register failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
