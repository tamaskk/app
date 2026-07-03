// Stagnation detector.
//
// Pure, dependency-free: given completed sessions, it flags exercises whose
// best estimated 1RM (e1RM) hasn't improved by at least `threshold` for the
// last `weeks` training weeks. The route layer (app/api/progress/stagnation)
// does the DB read; this file does the maths so it can be unit-tested.

export interface StagnationOptions {
  /** Training-weeks without a meaningful gain before flagging. Default 3. */
  weeks?: number;
  /** Minimum relative e1RM gain that counts as progress. Default 0.01 (1%). */
  threshold?: number;
}

export interface StagnationSet {
  kg: number;
  reps: number;
}

export interface StagnationSessionExercise {
  exerciseId?: string;
  name?: string;
  sets?: StagnationSet[];
}

export interface StagnationSession {
  finishedAt?: string | number | Date | null;
  exercises?: StagnationSessionExercise[];
}

export interface StagnationItem {
  exerciseId: string;
  name: string;
  /** Training-weeks since the last >threshold improvement. */
  weeksStagnant: number;
  /** Most recent week's best e1RM (rounded). */
  e1rm: number;
  /** Suggested ways to break the plateau. */
  tips: string[];
}

export const DEFAULT_STAGNATION_WEEKS = 3;
export const DEFAULT_STAGNATION_THRESHOLD = 0.01;

const TIPS = ["deload", "variation", "volume drop"];

/** Epley estimated 1RM. Returns 0 for bodyweight (kg 0) or empty sets. */
export function epley1RM(kg: number, reps: number): number {
  if (!(kg > 0) || !(reps > 0)) return 0;
  return kg * (1 + reps / 30);
}

/** Days-since-epoch of the Monday that starts this date's (UTC) week. */
function weekStartDay(value: string | number | Date): number | null {
  const d = new Date(value);
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return null;
  const utcMidnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const days = Math.floor(utcMidnight / 86_400_000);
  const mondayIndexed = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return days - mondayIndexed;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

interface ExerciseAccumulator {
  name: string;
  nameWeek: number;
  weekly: Map<number, number>; // week-start day → best e1RM that week
}

/**
 * Flag stagnating exercises. An exercise needs at least `weeks + 1` training
 * weeks of e1RM data; it's stagnating when the last >threshold improvement was
 * `weeks` or more weeks ago. Bodyweight-only exercises (e1RM 0) are ignored.
 * Result is sorted most-stagnant first.
 */
export function detectStagnation(
  sessions: StagnationSession[],
  options: StagnationOptions = {},
): StagnationItem[] {
  const weeks = options.weeks ?? DEFAULT_STAGNATION_WEEKS;
  const threshold = options.threshold ?? DEFAULT_STAGNATION_THRESHOLD;

  const byExercise = new Map<string, ExerciseAccumulator>();

  for (const session of sessions ?? []) {
    const week = weekStartDay(session.finishedAt ?? "");
    if (week == null) continue;
    for (const ex of session.exercises ?? []) {
      const id = `${ex.exerciseId ?? ""}`;
      if (!id) continue;
      const best = Math.max(0, ...(ex.sets ?? []).map((s) => epley1RM(s.kg, s.reps)));
      if (best <= 0) continue;

      const acc =
        byExercise.get(id) ?? { name: ex.name ?? id, nameWeek: -Infinity, weekly: new Map() };
      // Display the most recent name we've seen for this exercise id.
      if (ex.name && week >= acc.nameWeek) {
        acc.name = ex.name;
        acc.nameWeek = week;
      }
      const prev = acc.weekly.get(week) ?? 0;
      if (best > prev) acc.weekly.set(week, best);
      byExercise.set(id, acc);
    }
  }

  const items: StagnationItem[] = [];

  for (const [id, acc] of byExercise) {
    const series = [...acc.weekly.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, e1rm]) => e1rm);
    if (series.length < weeks + 1) continue; // not enough history to judge

    let runningMax = series[0];
    let lastImprovement = 0;
    for (let i = 1; i < series.length; i++) {
      if (series[i] > runningMax * (1 + threshold)) {
        runningMax = series[i];
        lastImprovement = i;
      } else if (series[i] > runningMax) {
        runningMax = series[i]; // tiny gain — raises the bar but isn't progress
      }
    }

    const weeksStagnant = series.length - 1 - lastImprovement;
    if (weeksStagnant >= weeks) {
      items.push({
        exerciseId: id,
        name: acc.name,
        weeksStagnant,
        e1rm: round1(series[series.length - 1]),
        tips: TIPS,
      });
    }
  }

  items.sort((a, b) => b.weeksStagnant - a.weeksStagnant || a.name.localeCompare(b.name));
  return items;
}
