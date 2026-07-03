import { NextRequest } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { hashPassword, signToken } from "@/lib/auth";
import { publicUserJson } from "@/lib/user-json";

export const runtime = "nodejs";

// Consume a reset token and set a new password. On success, return a fresh
// session token so the user is logged in immediately — no extra login step.
export async function POST(req: NextRequest) {
  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const token = (body.token ?? "").trim();
  const password = body.password ?? "";

  if (!token) {
    return Response.json({ detail: "Token is required" }, { status: 422 });
  }
  if (password.length < 8) {
    return Response.json(
      { detail: "Password must be at least 8 characters" },
      { status: 422 },
    );
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  try {
    await connectToDatabase();
    // Match the hash AND the expiry in the query so an expired token never
    // selects a row — defence in depth against a clock-skew race.
    // Select ONLY the two hidden reset fields with `+` so every default-loaded
    // field (onboarding, xp, rank, username, weeklyPlan, reminders) stays
    // present. The old inclusive projection ("… email name passwordHash")
    // loaded just those three, so the response below emitted onboarding:null,
    // xp:0, rank:1 — bouncing returning users back through onboarding.
    const user = await UserModel.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpiresAt");

    if (!user) {
      return Response.json(
        { detail: "Invalid or expired token" },
        { status: 410 },
      );
    }

    user.passwordHash = hashPassword(password);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    const sessionToken = signToken(String(user._id));
    return Response.json({
      token: sessionToken,
      // Shared serializer → same fully hydrated shape as login/me (onboarding,
      // subscription, xp, rank, …). The old inline object both dropped
      // subscription and, via the inclusive projection above, blanked every
      // unselected field.
      user: publicUserJson(user),
    });
  } catch {
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
