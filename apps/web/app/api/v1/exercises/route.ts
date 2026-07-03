import { NextRequest } from "next/server";
import { listExercises } from "@/lib/freeExerciseDb";

export const runtime = "nodejs";

// The mobile ExerciseApi joins array filters with commas (e.g.
// "bodyParts=upper legs,chest") but may also repeat the key — accept both.
function arr(sp: URLSearchParams, key: string): string[] {
  return sp
    .getAll(key)
    .flatMap((v) => v.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

// GET /api/v1/exercises — filtered, cursor-paginated catalogue list.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const rawLimit = Number.parseInt(sp.get("limit") ?? "", 10);
  try {
    const data = await listExercises({
      name: sp.get("name") ?? undefined,
      bodyParts: arr(sp, "bodyParts"),
      targetMuscles: arr(sp, "targetMuscles"),
      equipments: arr(sp, "equipments"),
      limit: Number.isFinite(rawLimit) ? rawLimit : undefined,
      after: sp.get("after") ?? undefined,
    });
    return Response.json(data);
  } catch (err) {
    console.error("GET /api/v1/exercises failed:", err);
    return Response.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
