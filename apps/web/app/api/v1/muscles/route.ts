import { metadata } from "@/lib/freeExerciseDb";

export const runtime = "nodejs";

// GET /api/v1/muscles — distinct target-muscle filter values as [{ name }].
export async function GET() {
  try {
    const { muscles } = await metadata();
    return Response.json({
      success: true,
      data: muscles.map((name) => ({ name })),
    });
  } catch (err) {
    console.error("GET /api/v1/muscles failed:", err);
    return Response.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
