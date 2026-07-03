import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { bearerToken, verifyToken } from "@/lib/auth";
import { rankForXp } from "@/lib/rank";

export const runtime = "nodejs";

const PAGE_SIZE = 20;
const SCOPES = ["global", "country", "rank", "weekly"] as const;
type Scope = (typeof SCOPES)[number];

interface LeaderboardEntry {
  userId: string;
  username: string;
  xp: number;
  rank: { tier: number; numeral: string; name: string };
  position: number;
  isMe: boolean;
}

/**
 * Paginated leaderboard. Each scope returns the same shape so the client
 * can swap tabs without rewriting the list.
 *
 *   ?scope=global|country|rank|weekly
 *   ?page=N (0-indexed, 20 results per page)
 *
 * The caller's own row is always echoed via `ownPosition` even when it
 * isn't in the requested page — the client uses that to render the sticky
 * "this is you" footer.
 */
export async function GET(req: NextRequest) {
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;
  if (!userId) {
    return Response.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const scopeParam = (url.searchParams.get("scope") ?? "global").toLowerCase();
  if (!SCOPES.includes(scopeParam as Scope)) {
    return Response.json({ detail: `Unknown scope: ${scopeParam}` }, { status: 400 });
  }
  const scope = scopeParam as Scope;
  const page = Math.max(0, parseInt(url.searchParams.get("page") ?? "0", 10) || 0);

  try {
    await connectToDatabase();
    const me = await UserModel.findById(userId).lean();
    if (!me) {
      return Response.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const { results, totalCount, ownPosition } = await runScope(scope, me, page);

    return Response.json({
      scope,
      page,
      pageSize: PAGE_SIZE,
      totalCount,
      hasMore: (page + 1) * PAGE_SIZE < totalCount,
      results,
      ownPosition,
    });
  } catch (err) {
    console.error("GET /api/leaderboard failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}

async function runScope(
  scope: Scope,
  me: { _id: unknown; xp?: number; rank?: number; username?: string | null; country?: string | null },
  page: number,
): Promise<{
  results: LeaderboardEntry[];
  totalCount: number;
  ownPosition: LeaderboardEntry;
}> {
  const myId = String(me._id);
  switch (scope) {
    case "global":
      return runAllTime({}, me, myId, page);
    case "country": {
      if (!me.country) {
        // No country set → empty board. The client can prompt to set one.
        return {
          results: [],
          totalCount: 0,
          ownPosition: {
            userId: myId,
            username: usernameOrAlias(me.username, myId),
            xp: me.xp ?? 0,
            rank: rankBundle(me.xp ?? 0),
            position: 0,
            isMe: true,
          },
        };
      }
      return runAllTime({ country: me.country }, me, myId, page);
    }
    case "rank":
      return runAllTime({ rank: me.rank ?? 1 }, me, myId, page);
    case "weekly":
      return runWeekly(me, myId, page);
  }
}

/** All-time scopes (global / country / rank) — share a single query path. */
async function runAllTime(
  filter: Record<string, unknown>,
  me: { _id: unknown; xp?: number; username?: string | null },
  myId: string,
  page: number,
) {
  const baseFilter = { ...filter, xp: { $gt: 0 } };
  const totalCount = await UserModel.countDocuments(baseFilter);

  // Page-of-20 — sorted by XP descending.
  const rows = await UserModel.find(baseFilter)
    .sort({ xp: -1, _id: 1 })
    .skip(page * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .select("_id username xp rank")
    .lean();

  // Position = number of users with strictly more XP + 1.
  // For users tied at the page boundary we'd need a stable tiebreaker, but
  // the +1 logic here matches the sort order well enough for display.
  const firstPos = page * PAGE_SIZE;
  const results = rows.map((u, i) => ({
    userId: String(u._id),
    username: usernameOrAlias(u.username, String(u._id)),
    xp: u.xp ?? 0,
    rank: rankBundle(u.xp ?? 0),
    position: firstPos + i + 1,
    isMe: String(u._id) === myId,
  }));

  const ownPosition = await ownPositionFor(filter, me, myId);
  return { results, totalCount, ownPosition };
}

/** Position of [me] under the same scope filter. */
async function ownPositionFor(
  filter: Record<string, unknown>,
  me: { _id: unknown; xp?: number; username?: string | null },
  myId: string,
): Promise<LeaderboardEntry> {
  const myXp = me.xp ?? 0;
  const above = await UserModel.countDocuments({
    ...filter,
    xp: { $gt: myXp },
  });
  return {
    userId: myId,
    username: usernameOrAlias(me.username, myId),
    xp: myXp,
    rank: rankBundle(myXp),
    position: above + 1,
    isMe: true,
  };
}

/** Weekly scope — sum xpLog amounts over the last 7 days. */
async function runWeekly(
  me: { _id: unknown; xp?: number; username?: string | null },
  myId: string,
  page: number,
) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // First fetch everyone's weekly total via aggregate, then paginate.
  const aggregated = await UserModel.aggregate([
    { $unwind: "$xpLog" },
    { $match: { "xpLog.at": { $gte: weekAgo } } },
    {
      $group: {
        _id: "$_id",
        username: { $first: "$username" },
        xp: { $first: "$xp" },
        weeklyXp: { $sum: "$xpLog.amount" },
      },
    },
    { $sort: { weeklyXp: -1, _id: 1 } },
  ]);

  const totalCount = aggregated.length;
  const slice = aggregated.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const firstPos = page * PAGE_SIZE;

  const results = slice.map((u, i) => ({
    userId: String(u._id),
    username: usernameOrAlias(u.username, String(u._id)),
    xp: u.weeklyXp,
    rank: rankBundle(u.xp ?? 0),
    position: firstPos + i + 1,
    isMe: String(u._id) === myId,
  }));

  const myEntry = aggregated.find((u) => String(u._id) === myId);
  const myWeekly = myEntry ? myEntry.weeklyXp : 0;
  const myPosition = myEntry
    ? aggregated.findIndex((u) => String(u._id) === myId) + 1
    : aggregated.length + 1;
  const ownPosition: LeaderboardEntry = {
    userId: myId,
    username: usernameOrAlias(me.username, myId),
    xp: myWeekly,
    rank: rankBundle(me.xp ?? 0),
    position: myPosition,
    isMe: true,
  };

  return { results, totalCount, ownPosition };
}

function rankBundle(xp: number) {
  const r = rankForXp(xp);
  return { tier: r.tier, numeral: r.numeral, name: r.name };
}

/**
 * Public-facing display name. Users who haven't set a username get an
 * anonymous-but-stable alias derived from their id so the row is still
 * unique on the board.
 */
function usernameOrAlias(username: string | null | undefined, userId: string) {
  if (username && username.trim().length > 0) return username.trim();
  const tail = userId.slice(-5).toUpperCase();
  return `ATLÉTA#${tail}`;
}
