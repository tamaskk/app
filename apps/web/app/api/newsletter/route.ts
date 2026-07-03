import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { NewsletterSubscriberModel } from "@/lib/models/NewsletterSubscriber";

export const runtime = "nodejs";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Subscribe an email to the newsletter list.
 *
 * Body: { email, source?, honeypot? }
 *
 * Idempotent on email: a second POST with the same address re-activates a
 * previously unsubscribed row (so the user can come back) but does NOT
 * overwrite the row created at the original subscribe time. Bots that fill
 * the `honeypot` field get a 200 with no DB write.
 */
export async function POST(req: NextRequest) {
  let body: {
    email?: string;
    source?: string;
    honeypot?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  // Spam trap — silently succeed.
  if (typeof body.honeypot === "string" && body.honeypot.trim() !== "") {
    return Response.json({ ok: true });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const source = (body.source ?? "footer").trim().slice(0, 60) || "footer";

  if (!email || !EMAIL_RE.test(email)) {
    return Response.json(
      { detail: "Valid email is required" },
      { status: 422 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const userAgent = req.headers.get("user-agent") ?? null;

  try {
    await connectToDatabase();

    // Upsert: if we've never seen this address, insert. If we have, only
    // flip the status back to active (re-subscribe). Don't overwrite the
    // original source/metadata so we keep the history of where they came
    // from the first time.
    const existing = await NewsletterSubscriberModel.findOne({ email });
    if (existing) {
      if (existing.status !== "active") {
        existing.status = "active";
        await existing.save();
      }
      return Response.json({ ok: true, existing: true });
    }

    await NewsletterSubscriberModel.create({
      email,
      source,
      ip,
      userAgent,
    });
    return Response.json({ ok: true, existing: false }, { status: 201 });
  } catch (err) {
    console.error("POST /api/newsletter failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
