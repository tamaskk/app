import { NextRequest } from "next/server";
import { searchExercises } from "@/lib/freeExerciseDb";

export const runtime = "nodejs";

// GET /api/v1/exercises/search?search=…&limit=… — contains-based name search.
// (A static segment, so it takes precedence over /exercises/[id].)
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const search = (sp.get("search") ?? sp.get("q") ?? sp.get("name") ?? "").trim();
  const rawLimit = Number.parseInt(sp.get("limit") ?? "", 10);
  try {
    const data = await searchExercises(
      search,
      Number.isFinite(rawLimit) ? rawLimit : 20,
    );
    return Response.json(data);
  } catch (err) {
    console.error("GET /api/v1/exercises/search failed:", err);
    return Response.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
