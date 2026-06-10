import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ContactMessageModel } from "@/lib/models/ContactMessage";

export const runtime = "nodejs";

const ALLOWED_STATUS = new Set(["new", "read", "archived", "spam"]);

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
  if (!body.status || !ALLOWED_STATUS.has(body.status)) {
    return Response.json({ detail: "Invalid status" }, { status: 422 });
  }
  try {
    await connectToDatabase();
    await ContactMessageModel.findByIdAndUpdate(id, { status: body.status });
    return Response.json({ ok: true });
  } catch {
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
    await ContactMessageModel.findByIdAndDelete(id);
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
