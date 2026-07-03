import { metadata } from "@/lib/freeExerciseDb";

export const runtime = "nodejs";

// Combined filter vocabularies (body parts / muscles / equipment) for the
// catalogue browser. Now derived from free-exercise-db. Each list mirrors the
// catalogue's { success, data: [{ name }] } metadata envelope.
export async function GET() {
  try {
    const { bodyParts, muscles, equipments } = await metadata();
    const wrap = (names: string[]) => ({
      success: true,
      data: names.map((name) => ({ name })),
    });
    return Response.json({
      bodyParts: wrap(bodyParts),
      muscles: wrap(muscles),
      equipments: wrap(equipments),
    });
  } catch (err) {
    console.error("GET /api/filters failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
