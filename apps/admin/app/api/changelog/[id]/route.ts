import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ChangelogEntryModel } from "@/lib/models/ChangelogEntry";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: {
    version?: string;
    title?: string;
    summary?: string;
    changes?: { type?: string; text?: string }[];
    published?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const entry = await ChangelogEntryModel.findById(id);
    if (!entry) return Response.json({ detail: "Not found" }, { status: 404 });

    if (typeof body.version === "string") entry.version = body.version.trim();
    if (typeof body.title === "string") entry.title = body.title.trim();
    if (typeof body.summary === "string") entry.summary = body.summary.trim();
    if (Array.isArray(body.changes)) {
      // Mongoose typed-DocumentArray is invariant; cast through unknown so
      // the literal union types don't trip the compiler.
      entry.changes = body.changes.map((c) => ({
        type: (c.type ?? "feature") as
          | "feature"
          | "fix"
          | "improvement"
          | "chore",
        text: (c.text ?? "").trim(),
      })) as unknown as typeof entry.changes;
    }
    if (typeof body.published === "boolean") {
      if (body.published && !entry.published && !entry.releasedAt) {
        entry.releasedAt = new Date();
      }
      entry.published = body.published;
    }
    await entry.save();
    return Response.json({ ok: true });
  } catch (err) {
    const e = err as { code?: number };
    if (e && e.code === 11000) {
      return Response.json(
        { detail: "This version already exists" },
        { status: 409 },
      );
    }
    console.error("PATCH /api/changelog/[id] failed:", err);
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
    await ChangelogEntryModel.findByIdAndDelete(id);
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
