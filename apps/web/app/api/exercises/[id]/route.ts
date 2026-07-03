import { NextRequest } from "next/server";
import { getExercise } from "@/lib/freeExerciseDb";

export const runtime = "nodejs";

// Legacy single-exercise endpoint, now backed by free-exercise-db.
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/exercises/[id]">,
) {
  const { id } = await ctx.params;
  try {
    const ex = await getExercise(id);
    if (!ex) {
      return Response.json({ detail: "Not found" }, { status: 404 });
    }
    return Response.json({ success: true, data: ex });
  } catch (err) {
    console.error("GET /api/exercises/[id] failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
