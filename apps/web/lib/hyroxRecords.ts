// HYROX station records, time-PR detection and time-based stagnation.
//
// Pure & dependency-free (mirrors lib/stagnation.ts so it can be unit-tested).
// Unlike strength PRs (e1RM, higher = better), HYROX stations are timed:
// LOWER `resultSeconds` is better. The same station shows up at different
// prescriptions across the plan (sled 25 m vs 50 m, run 400 m vs 1 km), so
// records are keyed by stationKey + the set's "spec" (distance or reps) — only
// like-for-like efforts compete.

/** Station metrics whose logged time is a meaningful, comparable result. */
const RECORDABLE = new Set(["distance", "distance_weight", "reps_weight", "pace"]);

export interface HyroxRecordSet {
  done?: boolean;
  resultSeconds?: number | null;
  distanceM?: number | null;
  reps?: number | null;
}

export interface HyroxRecordExercise {
  stationKey?: string | null;
  name?: string;
  metric?: string | null;
  sets?: HyroxRecordSet[];
}

export interface HyroxRecordSession {
  finishedAt?: string | number | Date | null;
  exercises?: HyroxRecordExercise[];
}

export interface HyroxRecord {
  /** stable `stationKey|spec` identity */
  key: string;
  stationKey: string;
  name: string;
  /** human spec, e.g. "1 km", "50 m", "100×" */
  spec: string;
  bestSeconds: number;
  achievedAt: string | null;
}

export interface HyroxStagnationItem {
  key: string;
  stationKey: string;
  name: string;
  spec: string;
  weeksStagnant: number;
  bestSeconds: number;
}

export const DEFAULT_HYROX_STAGNATION_WEEKS = 3;
/** A new best must beat the old by at least this many seconds to count. */
export const HYROX_PR_THRESHOLD_SECONDS = 0.5;

/** The spec (distance or rep count) that makes two efforts comparable. */
function specOf(
  metric: string | null | undefined,
  s: HyroxRecordSet,
): { key: string; label: string } | null {
  if (metric === "reps_weight") {
    const r = s.reps;
    if (!(typeof r === "number" && r > 0)) return null;
    return { key: `${r}r`, label: `${r}×` };
  }
  const d = s.distanceM;
  if (!(typeof d === "number" && d > 0)) return null;
  const label = d >= 1000 && d % 1000 === 0 ? `${d / 1000} km` : `${d} m`;
  return { key: `${d}m`, label };
}

function isoOrNull(v: HyroxRecordSession["finishedAt"]): string | null {
  if (v == null) return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** Days-since-epoch of the Monday starting this date's UTC week (or null). */
function weekStartDay(value: string | number | Date): number | null {
  const d = new Date(value);
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return null;
  const utcMidnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const mondayIndexed = (d.getUTCDay() + 6) % 7;
  return Math.floor(utcMidnight / 86_400_000) - mondayIndexed;
}

interface BestEntry {
  stationKey: string;
  name: string;
  spec: string;
  bestSeconds: number;
  achievedAt: string | null;
}

/** Walk every done station set with a logged time → best (min) per key. */
function bestByKey(sessions: HyroxRecordSession[]): Map<string, BestEntry> {
  const best = new Map<string, BestEntry>();
  for (const session of sessions ?? []) {
    const at = isoOrNull(session.finishedAt);
    for (const ex of session.exercises ?? []) {
      const sk = ex.stationKey;
      if (!sk || !RECORDABLE.has(ex.metric ?? "")) continue;
      for (const s of ex.sets ?? []) {
        if (!s.done) continue;
        const rs = s.resultSeconds;
        if (!(typeof rs === "number" && rs > 0)) continue;
        const spec = specOf(ex.metric, s);
        if (!spec) continue;
        const key = `${sk}|${spec.key}`;
        const cur = best.get(key);
        if (!cur || rs < cur.bestSeconds) {
          best.set(key, {
            stationKey: sk,
            name: ex.name ?? sk,
            spec: spec.label,
            bestSeconds: rs,
            achievedAt: at,
          });
        }
      }
    }
  }
  return best;
}

/** Personal-best time for every station/spec the user has logged. */
export function bestStationTimes(sessions: HyroxRecordSession[]): HyroxRecord[] {
  return [...bestByKey(sessions).entries()]
    .map(([key, e]) => ({ key, ...e }))
    .sort(
      (a, b) =>
        a.stationKey.localeCompare(b.stationKey) || a.spec.localeCompare(b.spec),
    );
}

/**
 * Count how many station/specs in `currentExercises` beat the user's prior
 * best time (by > threshold). Feeds the session XP "PR" bucket so a faster
 * sled or row is rewarded just like a strength PR.
 */
export function hyroxPrCount(
  currentExercises: HyroxRecordExercise[],
  priorSessions: HyroxRecordSession[],
): number {
  const prior = bestByKey(priorSessions);

  const current = new Map<string, number>();
  for (const ex of currentExercises ?? []) {
    const sk = ex.stationKey;
    if (!sk || !RECORDABLE.has(ex.metric ?? "")) continue;
    for (const s of ex.sets ?? []) {
      if (!s.done) continue;
      const rs = s.resultSeconds;
      if (!(typeof rs === "number" && rs > 0)) continue;
      const spec = specOf(ex.metric, s);
      if (!spec) continue;
      const key = `${sk}|${spec.key}`;
      const c = current.get(key);
      if (c == null || rs < c) current.set(key, rs);
    }
  }

  let count = 0;
  for (const [key, rs] of current) {
    const p = prior.get(key);
    if (!p || rs < p.bestSeconds - HYROX_PR_THRESHOLD_SECONDS) count++;
  }
  return count;
}

interface StagAcc {
  stationKey: string;
  name: string;
  spec: string;
  nameWeek: number;
  weekly: Map<number, number>; // week → best (min) seconds
}

/**
 * Flag station/specs whose best time hasn't dropped for `weeks` training weeks.
 * Needs at least `weeks + 1` weeks of data. Sorted most-stagnant first.
 */
export function detectHyroxStagnation(
  sessions: HyroxRecordSession[],
  options: { weeks?: number } = {},
): HyroxStagnationItem[] {
  const weeks = options.weeks ?? DEFAULT_HYROX_STAGNATION_WEEKS;
  const byKey = new Map<string, StagAcc>();

  for (const session of sessions ?? []) {
    const week = weekStartDay(session.finishedAt ?? "");
    if (week == null) continue;
    for (const ex of session.exercises ?? []) {
      const sk = ex.stationKey;
      if (!sk || !RECORDABLE.has(ex.metric ?? "")) continue;
      for (const s of ex.sets ?? []) {
        if (!s.done) continue;
        const rs = s.resultSeconds;
        if (!(typeof rs === "number" && rs > 0)) continue;
        const spec = specOf(ex.metric, s);
        if (!spec) continue;
        const key = `${sk}|${spec.key}`;
        const acc =
          byKey.get(key) ??
          {
            stationKey: sk,
            name: ex.name ?? sk,
            spec: spec.label,
            nameWeek: -Infinity,
            weekly: new Map<number, number>(),
          };
        if (ex.name && week >= acc.nameWeek) {
          acc.name = ex.name;
          acc.nameWeek = week;
        }
        const prev = acc.weekly.get(week);
        if (prev == null || rs < prev) acc.weekly.set(week, rs);
        byKey.set(key, acc);
      }
    }
  }

  const items: HyroxStagnationItem[] = [];
  for (const [key, acc] of byKey) {
    const series = [...acc.weekly.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, secs]) => secs);
    if (series.length < weeks + 1) continue;

    // Lower is better → track the running MIN; improvement = a new lower time.
    let runningMin = series[0];
    let lastImprovement = 0;
    for (let i = 1; i < series.length; i++) {
      if (series[i] < runningMin - HYROX_PR_THRESHOLD_SECONDS) {
        runningMin = series[i];
        lastImprovement = i;
      } else if (series[i] < runningMin) {
        runningMin = series[i];
      }
    }

    const weeksStagnant = series.length - 1 - lastImprovement;
    if (weeksStagnant >= weeks) {
      items.push({
        key,
        stationKey: acc.stationKey,
        name: acc.name,
        spec: acc.spec,
        weeksStagnant,
        bestSeconds: Math.min(...series),
      });
    }
  }

  items.sort(
    (a, b) => b.weeksStagnant - a.weeksStagnant || a.name.localeCompare(b.name),
  );
  return items;
}
