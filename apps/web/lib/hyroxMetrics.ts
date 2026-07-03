// Shared HYROX metric vocabulary. Kept in its own dependency-free module so the
// model normaliser (lib/trainings.ts), the plan builder (lib/hyroxPlan.ts) and
// the session PR guard all agree on the exact set of metric strings.

/**
 * How a HYROX movement is measured / logged:
 *  - `reps`            classic kg×reps strength (squat, RDL, KB swing). Default
 *                      behaviour; counts toward XP and e1RM PRs like any lift.
 *  - `distance`        cover N metres, bodyweight (SkiErg, RowErg, run, burpee).
 *  - `distance_weight` cover N metres loaded (sled push/pull, farmer, lunge).
 *  - `reps_weight`     fixed reps at a fixed load (wall ball).
 *  - `time`            hold/effort for N seconds (plank, easy / tempo runs).
 *  - `pace`            cover N metres at a target pace (interval runs).
 */
export type HyroxMetric =
  | "reps"
  | "distance"
  | "distance_weight"
  | "reps_weight"
  | "time"
  | "pace";

export const HYROX_METRICS: HyroxMetric[] = [
  "reps",
  "distance",
  "distance_weight",
  "reps_weight",
  "time",
  "pace",
];

/**
 * Only `reps` (pure kg×reps strength work) is eligible for e1RM-based PR
 * detection and the strength XP rules. Every station metric is excluded so a
 * 152 kg sled or a 100-rep wall-ball never registers as a one-rep-max PR.
 * `null`/absent metric → treated as strength (keeps every pre-HYROX training
 * and session behaving exactly as before).
 */
export function isStrengthMetric(metric: string | null | undefined): boolean {
  return metric == null || metric === "reps";
}
