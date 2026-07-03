import { metadata } from "@/lib/freeExerciseDb";

export const runtime = "nodejs";

// GET /api/v1/equipments — distinct equipment filter values as [{ name }].
export async function GET() {
  try {
    const { equipments } = await metadata();
    return Response.json({
      success: true,
      data: equipments.map((name) => ({ name })),
    });
  } catch (err) {
    console.error("GET /api/v1/equipments failed:", err);
    return Response.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
