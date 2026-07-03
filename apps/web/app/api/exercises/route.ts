import { NextRequest } from "next/server";
import { listExercises, searchExercises } from "@/lib/freeExerciseDb";

export const runtime = "nodejs";

// Legacy catalogue list endpoint (kept for older clients). Now backed by
// free-exercise-db via the shared adapter — the previous ExerciseDB source's
// image CDN was decommissioned. A free-text query routes to search; otherwise
// the structured filters drive the list.
function arr(sp: URLSearchParams, key: string): string[] {
  return sp
    .getAll(key)
    .flatMap((v) => v.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const rawLimit = Number.parseInt(sp.get("limit") ?? "", 10);
  const limit = Number.isFinite(rawLimit) ? rawLimit : undefined;
  try {
    const search = (sp.get("search") ?? sp.get("name") ?? "").trim();
    if (search.length >= 2) {
      return Response.json(await searchExercises(search, limit ?? 25));
    }
    const data = await listExercises({
      bodyParts: arr(sp, "bodyParts"),
      targetMuscles: arr(sp, "targetMuscles"),
      equipments: arr(sp, "equipments"),
      limit,
      after: sp.get("after") ?? sp.get("offset") ?? undefined,
    });
    return Response.json(data);
  } catch (err) {
    console.error("GET /api/exercises failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
