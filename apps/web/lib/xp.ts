// XP awarded per session. The numbers here are intentionally conservative so
// that an average user (3 sessions/week, ~20 sets) earns ~250 XP/week and
// reaches Rank V around the 3-month mark.
//
// All earning rules live here so the audit trail (stored as `xpLog` entries
// on the User) can quote the exact breakdown.

import type { IncomingExercise } from "./trainings";

export const XP_PER_SET = 1;
export const XP_PER_SESSION = 50;
export const XP_PER_PR = 100;
export const XP_PER_WEEKLY_GOAL = 200;
export const XP_PER_STREAK_WEEK = 25;
export const XP_ONBOARDING_BONUS = 100;

// Soft caps — limit grind incentives without locking out big sessions.
export const MAX_SET_XP_PER_SESSION = 30;
export const MAX_PR_XP_PER_SESSION = 3; // = 300 XP cap from PRs
export const MAX_STREAK_BONUS = 250;
export const MIN_SETS_FOR_SESSION_BONUS = 10;
export const MIN_DURATION_MIN_FOR_SESSION_BONUS = 20;

/** Single line item stored in `user.xpLog`. */
export interface XpEvent {
  source: string;
  amount: number;
  at: Date;
  sessionId?: string;
}

export interface XpBreakdown {
  total: number;
  events: XpEvent[];
}

/** Inputs the awarder needs in order to compute deterministically. */
export interface SessionXpInputs {
  exercises: IncomingExercise[];
  durationMinutes: number;
  /** PR count for this session, computed against the user's prior records. */
  prCount: number;
  /** True when this session pushed the user to their weekly goal. */
  hitWeeklyGoal: boolean;
  /** Weeks of streak after this session is included. */
  currentStreakWeeks: number;
  /** When this session is being recorded. Drives the xpLog timestamp. */
  at: Date;
  /** Persisted with each event so a future audit can trace which session
   *  the XP came from. */
  sessionId?: string;
}

/**
 * Calculate XP earned from a single session. Pure function — no I/O. The
 * caller is responsible for persisting the result onto the user.
 *
 * Returns an empty breakdown (total 0) when the session is too small to
 * count — no shame, the user just doesn't get free XP for tapping save.
 */
export function calculateSessionXp(input: SessionXpInputs): XpBreakdown {
  const events: XpEvent[] = [];

  // 1. Per-set XP, filtered to plausibly-real working sets and capped.
  const validSets = input.exercises
    .flatMap((e) => e.sets ?? [])
    .filter(
      (s) =>
        s &&
        s.done === true &&
        typeof s.reps === "number" &&
        s.reps >= 3 &&
        typeof s.kg === "number" &&
        s.kg > 0,
    );
  const setXp = Math.min(validSets.length, MAX_SET_XP_PER_SESSION) * XP_PER_SET;
  if (setXp > 0) {
    events.push({
      source: "sets",
      amount: setXp,
      at: input.at,
      sessionId: input.sessionId,
    });
  }

  // 2. Completed-session bonus — only on substantial sessions.
  if (
    validSets.length >= MIN_SETS_FOR_SESSION_BONUS &&
    input.durationMinutes >= MIN_DURATION_MIN_FOR_SESSION_BONUS
  ) {
    events.push({
      source: "session",
      amount: XP_PER_SESSION,
      at: input.at,
      sessionId: input.sessionId,
    });
  }

  // 3. PRs — capped to avoid abuse from many small-weight novelty lifts.
  const prXp =
    Math.min(input.prCount, MAX_PR_XP_PER_SESSION) * XP_PER_PR;
  if (prXp > 0) {
    events.push({
      source: "pr",
      amount: prXp,
      at: input.at,
      sessionId: input.sessionId,
    });
  }

  // 4. Weekly goal — only the session that pushes the user across the line.
  if (input.hitWeeklyGoal) {
    events.push({
      source: "weekly_goal",
      amount: XP_PER_WEEKLY_GOAL,
      at: input.at,
      sessionId: input.sessionId,
    });
  }

  // 5. Streak bonus, capped so a long streak doesn't snowball uncontrollably.
  const streakXp = Math.min(
    input.currentStreakWeeks * XP_PER_STREAK_WEEK,
    MAX_STREAK_BONUS,
  );
  if (streakXp > 0) {
    events.push({
      source: "streak",
      amount: streakXp,
      at: input.at,
      sessionId: input.sessionId,
    });
  }

  const total = events.reduce((a, e) => a + e.amount, 0);
  return { total, events };
}
