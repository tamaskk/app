import { NextRequest } from "next/server";
import { getExercise } from "@/lib/freeExerciseDb";

export const runtime = "nodejs";

// GET /api/v1/exercises/[id] — single exercise in the { success, data } envelope.
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/v1/exercises/[id]">,
) {
  const { id } = await ctx.params;
  try {
    const ex = await getExercise(id);
    if (!ex) {
      return Response.json(
        { success: false, error: { message: "Exercise not found" } },
        { status: 404 },
      );
    }
    return Response.json({ success: true, data: ex });
  } catch (err) {
    console.error("GET /api/v1/exercises/[id] failed:", err);
    return Response.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
