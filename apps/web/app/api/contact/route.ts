import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ContactMessageModel } from "@/lib/models/ContactMessage";

export const runtime = "nodejs";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Save an inbound message from the public /contact page.
 *
 * Body: { name, email, subject?, message, honeypot? }
 *
 * `honeypot` is a hidden field the form sets to empty. Bots that fill every
 * input will populate it — we silently 200 and discard so they can't tell
 * the spam filter is on.
 */
export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
    honeypot?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  // Spam trap — pretend success so the bot doesn't try a different vector.
  if (typeof body.honeypot === "string" && body.honeypot.trim() !== "") {
    return Response.json({ ok: true });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const subject = (body.subject ?? "").trim();
  const message = (body.message ?? "").trim();

  if (!name) {
    return Response.json({ detail: "Name is required" }, { status: 422 });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return Response.json(
      { detail: "Valid email is required" },
      { status: 422 },
    );
  }
  if (!message || message.length < 10) {
    return Response.json(
      { detail: "Message must be at least 10 characters" },
      { status: 422 },
    );
  }
  if (message.length > 4000) {
    return Response.json(
      { detail: "Message is too long (max 4000 chars)" },
      { status: 422 },
    );
  }

  // Best-effort metadata for triage.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const userAgent = req.headers.get("user-agent") ?? null;

  try {
    await connectToDatabase();
    const doc = await ContactMessageModel.create({
      name,
      email,
      subject: subject || "(no subject)",
      message,
      ip,
      userAgent,
    });
    return Response.json({ ok: true, id: String(doc._id) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/contact failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
