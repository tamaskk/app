import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { bearerToken, verifyToken } from "@/lib/auth";
import { nextRank, rankForXp, RANKS } from "@/lib/rank";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;
  if (!userId) {
    return Response.json({ detail: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const user = await UserModel.findById(userId)
      .select("+xpLog xp rank lastRankUpAt")
      .lean();
    if (!user) {
      return Response.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const xp = user.xp ?? 0;
    const current = rankForXp(xp);
    const next = nextRank(current.tier);
    const percentToNext = next
      ? Math.max(
          0,
          Math.min(
            1,
            (xp - current.threshold) / (next.threshold - current.threshold),
          ),
        )
      : 1;

    // Weekly events — the dashboard breakdown is for the rolling 7 days.
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const events = (user.xpLog ?? []).filter(
      (e) => new Date(e.at).getTime() >= weekAgo.getTime(),
    );
    const weeklyXp = events.reduce((a, e) => a + e.amount, 0);
    const weeklyBySource: Record<string, number> = {};
    for (const e of events) {
      weeklyBySource[e.source] = (weeklyBySource[e.source] ?? 0) + e.amount;
    }

    return Response.json({
      xp,
      rank: current,
      nextRank: next,
      percentToNext,
      weeklyXp,
      weeklyBySource,
      lastRankUpAt: user.lastRankUpAt,
      // Useful for the rank progression list — we send the whole table once,
      // the client doesn't need a second roundtrip.
      ranks: RANKS,
    });
  } catch (err) {
    console.error("GET /api/me/rank failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
