import { NextRequest } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { sendMail } from "@/lib/mailer";

export const runtime = "nodejs";

// Reset tokens are valid for 30 minutes — long enough to switch to email,
// short enough that a leaked token decays fast.
const RESET_TTL_MS = 30 * 60 * 1000;

// Issue a reset token and email it to the user. To avoid account enumeration,
// the response is identical whether the email exists or not.
export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return Response.json({ detail: "Valid email is required" }, { status: 422 });
  }

  try {
    await connectToDatabase();
    // Always pretend success — even if the user doesn't exist or has no
    // password (e.g. OAuth-only user). This prevents enumeration probes.
    const user = await UserModel.findOne({ email });

    if (user && user.passwordHash) {
      // Generate a 32-byte random token; only the SHA-256 hash is persisted.
      // The plain token only lives in the email and the user's clipboard.
      const token = crypto.randomBytes(32).toString("base64url");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      user.passwordResetTokenHash = tokenHash;
      user.passwordResetExpiresAt = new Date(Date.now() + RESET_TTL_MS);
      await user.save();

      const appUrl = process.env.APP_URL ?? "https://eronlet.app";
      const resetUrl = `${appUrl}/reset-password?token=${token}`;

      await sendMail({
        to: user.email,
        subject: "HEFTOR — Jelszó visszaállítás",
        text: [
          "Szia,",
          "",
          "Jelszó visszaállítást kértél a HEFTOR fiókodhoz.",
          "Nyisd meg ezt a linket 30 percen belül:",
          "",
          resetUrl,
          "",
          "Ha nem te kérted, biztonságosan figyelmen kívül hagyhatod ezt az emailt.",
          "",
          "— HEFTOR",
        ].join("\n"),
      });
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
