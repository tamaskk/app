import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { NewsletterSubscriberModel } from "@/lib/models/NewsletterSubscriber";

export const runtime = "nodejs";

const ALLOWED_STATUS = ["active", "unsubscribed", "bounced"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  const status = body.status;
  if (
    !status ||
    !ALLOWED_STATUS.includes(status as (typeof ALLOWED_STATUS)[number])
  ) {
    return Response.json({ detail: "Invalid status" }, { status: 422 });
  }

  try {
    await connectToDatabase();
    const sub = await NewsletterSubscriberModel.findById(id);
    if (!sub) {
      return Response.json({ detail: "Not found" }, { status: 404 });
    }
    sub.status = status as (typeof ALLOWED_STATUS)[number];
    await sub.save();
    return Response.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/newsletter/[id] failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await connectToDatabase();
    const r = await NewsletterSubscriberModel.findByIdAndDelete(id);
    if (!r) {
      return Response.json({ detail: "Not found" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/newsletter/[id] failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
