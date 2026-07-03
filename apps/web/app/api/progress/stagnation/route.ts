import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { WorkoutSessionModel } from "@/lib/models/WorkoutSession";
import { bearerToken, verifyToken } from "@/lib/auth";
import {
  detectStagnation,
  DEFAULT_STAGNATION_WEEKS,
  DEFAULT_STAGNATION_THRESHOLD,
  type StagnationSession,
} from "@/lib/stagnation";

export const runtime = "nodejs";

// Parse a positive query param, falling back to a default.
function num(value: string | null, fallback: number): number {
  const n = value == null ? NaN : Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Exercises whose best e1RM hasn't grown by `threshold` for `weeks` training
// weeks. Both are configurable via ?weeks= & ?threshold= (e.g. 0.01 = 1%).
// Returns an empty list when nothing is stagnating — the banner stays hidden.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const weeks = num(searchParams.get("weeks"), DEFAULT_STAGNATION_WEEKS);
  const threshold = num(searchParams.get("threshold"), DEFAULT_STAGNATION_THRESHOLD);

  // Plateau detection must run over the CALLER's own sessions only. Pre-fix
  // this scanned every user's history, so the dashboard banner reflected
  // strangers' lifts. Anonymous callers (no token) get userId:null → empty.
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;

  try {
    await connectToDatabase();
    // Recent sessions only — a few months is ample for a 3–4 week window.
    const sessions = (await WorkoutSessionModel.find({ userId: userId ?? null })
      .sort({ finishedAt: -1, createdAt: -1 })
      .limit(300)
      .lean()) as unknown as StagnationSession[];

    const results = detectStagnation(sessions, { weeks, threshold });
    return Response.json({ results, weeks, threshold });
  } catch (err) {
    console.error("GET /api/progress/stagnation failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
