import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { bearerToken, verifyToken } from "@/lib/auth";
import { publicUserJson } from "@/lib/user-json";

export const runtime = "nodejs";

// Single-token modes — mutually exclusive with each other and with the
// muscle-group multi-pick below.
const EXCLUSIVE_TOKENS = new Set([
  "rest",
  "workout", // generic "training day", no specific focus
  "push",
  "pull",
  "upper",
  "lower",
  "fullbody",
]);

// Muscle-group tokens. A day may carry one or more of these, joined by
// `+` (e.g. "chest+back+arms"). `legs` is in both sets — historically
// it's also a split label, and we want both legacy "legs" entries and
// new "legs+core" multi-picks to parse.
const MUSCLE_TOKENS = new Set([
  "chest",
  "back",
  "shoulders",
  "arms",
  "core",
  "legs",
]);

const ALL_TOKENS = new Set<string>([...EXCLUSIVE_TOKENS, ...MUSCLE_TOKENS]);

/**
 * Validate a single day entry. Accepts either:
 *   • one of EXCLUSIVE_TOKENS alone
 *   • one or more MUSCLE_TOKENS joined by '+' (e.g. "chest+back+core")
 * Returns the canonical lowercase form, or null if invalid.
 */
function sanitizeDay(entry: unknown): string | null {
  if (typeof entry !== "string") return null;
  const trimmed = entry.trim().toLowerCase();
  if (!trimmed) return null;
  const parts = trimmed.split("+").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  // Reject duplicates so "chest+chest" doesn't sneak through.
  const seen = new Set<string>();
  for (const p of parts) {
    if (!ALL_TOKENS.has(p)) return null;
    if (seen.has(p)) return null;
    seen.add(p);
  }
  // Single-token entries: anything in ALL_TOKENS is fine.
  if (parts.length === 1) return parts[0];
  // Multi-token entries: every part must be a muscle group. Mixing an
  // exclusive split label with muscles (`push+chest`) is meaningless and
  // gets rejected.
  for (const p of parts) {
    if (!MUSCLE_TOKENS.has(p)) return null;
  }
  // Canonicalise the order so "back+chest" and "chest+back" hash the
  // same way client-side.
  parts.sort();
  return parts.join("+");
}

function sanitize(plan: unknown): string[] | null {
  if (!Array.isArray(plan)) return null;
  if (plan.length !== 7) return null;
  const out: string[] = [];
  for (const entry of plan) {
    const v = sanitizeDay(entry);
    if (v === null) return null;
    out.push(v);
  }
  return out;
}

/** Save (or clear) the custom 7-day weekly plan for the user. */
export async function PATCH(req: NextRequest) {
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;
  if (!userId) {
    return Response.json({ detail: "Unauthorized" }, { status: 401 });
  }

  let body: { weeklyPlan?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  // null is a sentinel that resets to "use onboarding-derived plan".
  let weeklyPlan: string[] | null;
  if (body.weeklyPlan === null) {
    weeklyPlan = null;
  } else {
    weeklyPlan = sanitize(body.weeklyPlan);
    if (weeklyPlan === null) {
      return Response.json(
        { detail: "weeklyPlan must be 7 valid labels" },
        { status: 422 },
      );
    }
  }

  try {
    await connectToDatabase();
    const user = await UserModel.findById(userId);
    if (!user) {
      return Response.json({ detail: "Unauthorized" }, { status: 401 });
    }
    user.weeklyPlan = weeklyPlan;
    await user.save();
    return Response.json({ user: publicUserJson(user) });
  } catch (err) {
    console.error("PATCH /api/me/weekly-plan failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
