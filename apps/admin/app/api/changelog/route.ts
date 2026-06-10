import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ChangelogEntryModel } from "@/lib/models/ChangelogEntry";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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

  const version = (body.version ?? "").trim();
  if (!version) {
    return Response.json({ detail: "Version is required" }, { status: 422 });
  }

  try {
    await connectToDatabase();
    const existing = await ChangelogEntryModel.findOne({ version }).lean();
    if (existing) {
      return Response.json(
        { detail: "This version already exists" },
        { status: 409 },
      );
    }
    const published = body.published === true;
    const doc = await ChangelogEntryModel.create({
      version,
      title: (body.title ?? "").trim(),
      summary: (body.summary ?? "").trim(),
      changes: (body.changes ?? []).map((c) => ({
        type: c.type ?? "feature",
        text: (c.text ?? "").trim(),
      })),
      published,
      releasedAt: published ? new Date() : null,
    });
    return Response.json({ id: String(doc._id) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/changelog failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
