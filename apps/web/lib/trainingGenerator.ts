// Pure training-plan generator.
//
// Picks a sensible split based on sessions/week + the muscle groups the
// user wants to hit, then materialises N=weeks×sessions concrete training
// objects. Same inputs always produce the same plan — no randomness — so a
// user who runs Generate twice with identical params sees identical output.

import {
  ALL_MUSCLES,
  exercisePool,
  muscleLabelHu,
  type MuscleGroup,
  type PoolExercise,
} from "./exercisePool";

export interface GeneratorInput {
  weeks: number; // 1..20
  sessionsPerWeek: number; // 1..6
  focusMuscles?: MuscleGroup[]; // empty/undefined → all major groups
}

/** What the generator returns — ready to be saved as `Training` documents. */
export interface GeneratedTraining {
  name: string; // e.g. "Mell + Tricepsz · 1. nap"
  weekIndex: number; // 0-based
  dayIndex: number; // 0-based within the week
  globalIndex: number; // 0-based across the whole plan
  muscleGroups: MuscleGroup[];
  exercises: {
    exerciseId: string;
    name: string;
    targetMuscles: string[];
    category: string;
    progressionStrategy: string;
    sets: { kg: number; reps: number; done: boolean }[];
  }[];
}

/** Public entry point. Returns one entry per session across the whole plan. */
export function generateTrainingPlan(
  input: GeneratorInput,
): GeneratedTraining[] {
  const weeks = clamp(input.weeks, 1, 20);
  const sessionsPerWeek = clamp(input.sessionsPerWeek, 1, 6);
  const focus = pickFocusMuscles(input.focusMuscles);

  // Weekly rotation template: an ordered list of "day muscle bundles".
  // Cycled across the whole plan.
  const weekTemplate = pickWeekTemplate(sessionsPerWeek, focus);

  const out: GeneratedTraining[] = [];
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < sessionsPerWeek; d++) {
      const muscles = weekTemplate[d % weekTemplate.length];
      const exercises = pickSessionExercises(muscles);
      const globalIndex = w * sessionsPerWeek + d;
      out.push({
        name: `${nameFromMuscles(muscles)} · ${globalIndex + 1}. nap`,
        weekIndex: w,
        dayIndex: d,
        globalIndex,
        muscleGroups: muscles,
        exercises: exercises.map((e) => ({
          exerciseId: e.exerciseId,
          name: e.name,
          targetMuscles: e.targetMuscles,
          category: e.category,
          progressionStrategy: "linear",
          sets: Array.from({ length: e.defaultSets }, () => ({
            kg: 0,
            reps: e.defaultReps,
            done: false,
          })),
        })),
      });
    }
  }
  return out;
}

/** Clamp focus muscles to the supported groups, default to all. */
function pickFocusMuscles(input: MuscleGroup[] | undefined): MuscleGroup[] {
  if (!input || input.length === 0) return ALL_MUSCLES;
  const set = new Set(input.filter((m) => ALL_MUSCLES.includes(m)));
  if (set.size === 0) return ALL_MUSCLES;
  return Array.from(set);
}

/**
 * Pick a weekly rotation given the sessions-per-week budget and the muscles
 * the user wants to focus on. The templates below are the canonical splits;
 * focus muscles trim/expand the day bundles when present.
 */
function pickWeekTemplate(
  sessionsPerWeek: number,
  focus: MuscleGroup[],
): MuscleGroup[][] {
  const isFullFocus = focus.length >= ALL_MUSCLES.length - 1;

  if (!isFullFocus) {
    // User opted into specific muscles → distribute them round-robin so
    // every focus muscle gets at least one slot per cycle.
    const days: MuscleGroup[][] = Array.from(
      { length: sessionsPerWeek },
      () => [],
    );
    focus.forEach((m, i) => days[i % sessionsPerWeek].push(m));
    return days.map((d) => (d.length > 0 ? d : [focus[0]]));
  }

  // Full focus → canonical splits.
  switch (sessionsPerWeek) {
    case 1:
      return [["chest", "back", "quads"]]; // Full body lite
    case 2:
      return [
        ["chest", "back", "shoulders", "abs"],
        ["quads", "hamstrings", "glutes", "calves"],
      ];
    case 3:
      // PPL — classic 3 days, hits everything.
      return [
        ["chest", "shoulders", "triceps"],
        ["back", "biceps"],
        ["quads", "hamstrings", "glutes", "calves"],
      ];
    case 4:
      // Upper / Lower / Upper / Lower.
      return [
        ["chest", "back", "shoulders", "triceps", "biceps"],
        ["quads", "hamstrings", "glutes", "calves"],
        ["chest", "back", "shoulders", "triceps", "biceps"],
        ["quads", "hamstrings", "glutes", "calves"],
      ];
    case 5:
      // PPL + Upper/Lower.
      return [
        ["chest", "shoulders", "triceps"],
        ["back", "biceps"],
        ["quads", "hamstrings", "glutes", "calves"],
        ["chest", "back", "shoulders", "abs"],
        ["quads", "hamstrings", "glutes", "calves"],
      ];
    case 6:
    default:
      // PPL × 2.
      return [
        ["chest", "shoulders", "triceps"],
        ["back", "biceps"],
        ["quads", "hamstrings", "glutes", "calves"],
        ["chest", "shoulders", "triceps"],
        ["back", "biceps"],
        ["quads", "hamstrings", "glutes", "calves"],
      ];
  }
}

/**
 * Build a session's exercise list for a given muscle bundle. We aim for
 * 4–6 exercises: prefer 1 compound from the primary muscle, 1 compound from
 * any secondary, then isolations to round it out.
 */
function pickSessionExercises(muscles: MuscleGroup[]): PoolExercise[] {
  const picked: PoolExercise[] = [];
  const usedIds = new Set<string>();

  // Pick one unused exercise for `m`. When `category` is null, take any
  // category (used as the coverage fallback for muscles that have no compound,
  // e.g. calves/abs). Returns false when the muscle's pool is exhausted.
  function take(m: MuscleGroup, category: "compound" | "isolation" | null) {
    const pool = exercisePool[m] ?? [];
    for (const ex of pool) {
      if (category !== null && ex.category !== category) continue;
      if (usedIds.has(ex.exerciseId)) continue;
      picked.push(ex);
      usedIds.add(ex.exerciseId);
      return true;
    }
    return false;
  }

  const MAX_EXERCISES = 6;

  // Coverage first: EVERY muscle in the bundle gets at least one exercise —
  // a compound when it has one, otherwise any exercise. The old code padded by
  // a running count and stopped at a quota, so trailing muscles of a bundle
  // (calves/abs, and biceps in the 4-day split) were silently never trained.
  for (const m of muscles) {
    if (!take(m, "compound")) take(m, null);
  }
  // Round out toward ~5–6 exercises with extra isolations from the bundle,
  // without ever dropping a muscle we already covered above.
  for (const m of muscles) {
    if (picked.length >= MAX_EXERCISES) break;
    take(m, "isolation");
  }
  // Still short of a real session? Backfill with any leftover from the bundle.
  for (const m of muscles) {
    if (picked.length >= MAX_EXERCISES) break;
    take(m, null);
  }
  return picked;
}

/** "Mell + Hát" — joins the Hungarian labels for the day's muscles. */
function nameFromMuscles(muscles: MuscleGroup[]): string {
  if (muscles.length === 0) return "Edzés";
  // Limit display to the first 3 muscles so the card name doesn't get noisy.
  const visible = muscles.slice(0, 3).map((m) => muscleLabelHu[m]);
  return visible.join(" + ");
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(v)));
}
