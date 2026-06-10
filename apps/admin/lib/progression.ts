// Auto-progression engine.
//
// Pure, dependency-free: given a strategy and the recent history of a single
// exercise, it suggests the next session's working weight and reps. The route
// layer (app/api/progression) does the DB work; this file does the maths so it
// can be unit-tested in isolation.

export type ProgressionStrategy =
  | "linear"
  | "double-progression"
  | "rpe-based"
  | "none";

export const PROGRESSION_STRATEGIES: ProgressionStrategy[] = [
  "linear",
  "double-progression",
  "rpe-based",
  "none",
];

export function normalizeStrategy(value: unknown): ProgressionStrategy {
  return PROGRESSION_STRATEGIES.includes(value as ProgressionStrategy)
    ? (value as ProgressionStrategy)
    : "none";
}

export interface LoggedSet {
  kg: number;
  reps: number;
  done?: boolean;
}

/** One past session's logged sets for the exercise (order within doesn't matter). */
export interface SessionHistoryEntry {
  sets: LoggedSet[];
  finishedAt?: string | number | Date | null;
}

export interface ProgressionContext {
  strategy: ProgressionStrategy;
  /** Recent sessions for THIS exercise, any order — newest is picked internally. */
  history: SessionHistoryEntry[];
  category?: string | null;
  targetMuscles?: string[];
  name?: string;
  /** Double-progression rep window. Defaults to 8–12. */
  repMin?: number;
  repMax?: number;
  /** RPE-based target reps (RPE ~7–8). Defaults to 8. */
  rpeTargetReps?: number;
}

export interface ProgressionSuggestion {
  suggestedKg: number;
  suggestedReps: number;
  strategy: ProgressionStrategy;
  /** Short human note, e.g. "Lineáris +2.5 kg". Safe to ignore in the UI. */
  reason: string;
}

const COMPOUND_CATEGORY_HINTS = [
  "barbell",
  "powerlifting",
  "olympic",
  "strongman",
  "compound",
];

const COMPOUND_NAME_RX =
  /(squat|deadlift|bench|press|row|pull[- ]?up|chin[- ]?up|clean|snatch|lunge|dip|thrust|hip thrust)/i;

/** Multi-joint movements get the larger jump; isolation work the smaller one. */
export function isCompound(ctx: Pick<ProgressionContext, "category" | "targetMuscles" | "name">): boolean {
  const cat = (ctx.category ?? "").toLowerCase();
  if (COMPOUND_CATEGORY_HINTS.some((c) => cat.includes(c))) return true;
  if (ctx.name && COMPOUND_NAME_RX.test(ctx.name)) return true;
  if ((ctx.targetMuscles?.length ?? 0) >= 3) return true;
  return false;
}

/** +2.5 kg for compound lifts, +1.25 kg for isolation. */
export function incrementFor(ctx: ProgressionContext): number {
  return isCompound(ctx) ? 2.5 : 1.25;
}

/** Round to the nearest 0.25 kg so 1.25 increments stay exact. */
function roundKg(kg: number): number {
  return Math.round(kg / 0.25) * 0.25;
}

/** The heaviest working set of a session: max kg, and the best reps at that kg. */
function topSet(entry: SessionHistoryEntry): { kg: number; reps: number } | null {
  const sets = (entry.sets ?? []).filter((s) => (s.reps ?? 0) > 0);
  if (sets.length === 0) return null;
  const maxKg = Math.max(...sets.map((s) => s.kg ?? 0));
  const reps = Math.max(
    ...sets.filter((s) => (s.kg ?? 0) === maxKg).map((s) => s.reps ?? 0),
  );
  return { kg: maxKg, reps };
}

function toTime(v: SessionHistoryEntry["finishedAt"]): number {
  if (v == null) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Most recent session that has a usable top set, or null. */
function latestTopSet(history: SessionHistoryEntry[]): { kg: number; reps: number } | null {
  const sorted = [...(history ?? [])].sort((a, b) => toTime(b.finishedAt) - toTime(a.finishedAt));
  for (const entry of sorted) {
    const top = topSet(entry);
    if (top) return top;
  }
  return null;
}

/**
 * Suggest the next working set. Returns null when no suggestion applies
 * (strategy "none", or no usable history) — the UI then shows nothing.
 */
export function computeSuggestion(ctx: ProgressionContext): ProgressionSuggestion | null {
  if (ctx.strategy === "none") return null;

  const last = latestTopSet(ctx.history);
  if (!last) return null;

  const inc = incrementFor(ctx);

  // Bodyweight / no external load: progress reps, never invent load.
  if (last.kg === 0) {
    const bump = ctx.strategy === "double-progression" ? 1 : 1;
    return {
      suggestedKg: 0,
      suggestedReps: last.reps + bump,
      strategy: ctx.strategy,
      reason: "Testsúly · +1 ismétlés",
    };
  }

  switch (ctx.strategy) {
    case "linear": {
      return {
        suggestedKg: roundKg(last.kg + inc),
        suggestedReps: last.reps,
        strategy: ctx.strategy,
        reason: `Lineáris · +${formatKg(inc)} kg`,
      };
    }

    case "double-progression": {
      const repMin = ctx.repMin ?? 8;
      const repMax = ctx.repMax ?? 12;
      if (last.reps >= repMax) {
        // Top of the window reached — add load, drop back to the bottom.
        return {
          suggestedKg: roundKg(last.kg + inc),
          suggestedReps: repMin,
          strategy: ctx.strategy,
          reason: `Dupla progresszió · +${formatKg(inc)} kg, vissza ${repMin} ismétlésre`,
        };
      }
      // Hold the weight, chase one more rep (capped at the window top).
      return {
        suggestedKg: roundKg(last.kg),
        suggestedReps: Math.min(last.reps + 1, repMax),
        strategy: ctx.strategy,
        reason: `Dupla progresszió · tartsd ${last.kg} kg-ot, +1 ismétlés`,
      };
    }

    case "rpe-based": {
      const target = ctx.rpeTargetReps ?? 8;
      if (last.reps >= target + 3) {
        // Felt easy (well below RPE 8) — add load, reset to the target.
        return {
          suggestedKg: roundKg(last.kg + inc),
          suggestedReps: target,
          strategy: ctx.strategy,
          reason: "RPE 7–8 · könnyű volt, +súly",
        };
      }
      if (last.reps <= target - 2) {
        // Missed the target by a lot — back off slightly.
        return {
          suggestedKg: roundKg(Math.max(0, last.kg - inc)),
          suggestedReps: target,
          strategy: ctx.strategy,
          reason: "RPE 7–8 · nehéz volt, kicsit vissza",
        };
      }
      // In range — dial in the target reps at the same load.
      return {
        suggestedKg: roundKg(last.kg),
        suggestedReps: target,
        strategy: ctx.strategy,
        reason: "RPE 7–8 cél",
      };
    }
  }

  return null;
}

/** Plain kg string (no trailing zeros — JS numbers already drop them). */
export function formatKg(kg: number): string {
  return `${kg}`;
}

/** Display string in Hungarian decimal style, e.g. `82,5 × 8`. */
export function formatSuggestion(s: ProgressionSuggestion): string {
  const kg = `${s.suggestedKg}`.replace(".", ",");
  return `${kg} × ${s.suggestedReps}`;
}
