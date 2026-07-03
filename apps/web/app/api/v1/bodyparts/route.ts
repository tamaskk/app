import { metadata } from "@/lib/freeExerciseDb";

export const runtime = "nodejs";

// GET /api/v1/bodyparts — distinct body-part filter values as [{ name }].
export async function GET() {
  try {
    const { bodyParts } = await metadata();
    return Response.json({
      success: true,
      data: bodyParts.map((name) => ({ name })),
    });
  } catch (err) {
    console.error("GET /api/v1/bodyparts failed:", err);
    return Response.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
