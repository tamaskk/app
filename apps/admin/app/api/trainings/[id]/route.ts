import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TrainingModel } from "@/lib/models/Training";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await connectToDatabase();
    await TrainingModel.findByIdAndDelete(id);
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
