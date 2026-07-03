// Shared normalisation for incoming training-exercise payloads, used by both
// POST (create) and PATCH (update) so they stay in sync.

import { normalizeStrategy, type ProgressionStrategy } from "@/lib/progression";
import { HYROX_METRICS, type HyroxMetric } from "@/lib/hyroxMetrics";

export type IncomingSet = {
  kg?: number;
  reps?: number;
  done?: boolean;
  // HYROX metric fields — optional, passed through untouched when present.
  distanceM?: number | null;
  seconds?: number | null;
  targetKg?: number | null;
  resultSeconds?: number | null;
};

export type IncomingExercise = {
  exerciseId?: string | number;
  name?: string;
  gifUrl?: string;
  targetMuscles?: string[];
  category?: string | null;
  progressionStrategy?: ProgressionStrategy | string;
  metric?: HyroxMetric | string | null;
  stationKey?: string | null;
  note?: string | null;
  restSeconds?: number | null;
  zone?: string | null;
  sets?: IncomingSet[];
};

/** Coerce a possibly-undefined number into a finite number or null. */
function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Validate the incoming metric against the known set, else null ("reps"). */
function normalizeMetric(v: unknown): HyroxMetric | null {
  return HYROX_METRICS.includes(v as HyroxMetric) ? (v as HyroxMetric) : null;
}

/** Validate + normalise the exercises array into the shape the model stores. */
export function mapExercises(input: IncomingExercise[] | undefined) {
  return (input ?? [])
    .filter((e) => e.exerciseId != null && `${e.exerciseId}` !== "" && e.name)
    .map((e) => ({
      exerciseId: `${e.exerciseId}`,
      name: e.name,
      gifUrl: e.gifUrl ?? "",
      targetMuscles: Array.isArray(e.targetMuscles) ? e.targetMuscles : [],
      category: e.category ?? null,
      // Absent → schema default ("linear"); present → validated (junk → "none").
      progressionStrategy:
        e.progressionStrategy == null
          ? "linear"
          : normalizeStrategy(e.progressionStrategy),
      // HYROX fields — null when absent so ordinary strength is untouched.
      metric: normalizeMetric(e.metric),
      stationKey: typeof e.stationKey === "string" ? e.stationKey : null,
      note: typeof e.note === "string" ? e.note : null,
      restSeconds: numOrNull(e.restSeconds),
      zone: typeof e.zone === "string" ? e.zone : null,
      sets: (e.sets ?? []).map((s) => ({
        kg: s.kg ?? 0,
        reps: s.reps ?? 0,
        done: s.done ?? false,
        distanceM: numOrNull(s.distanceM),
        seconds: numOrNull(s.seconds),
        targetKg: numOrNull(s.targetKg),
        resultSeconds: numOrNull(s.resultSeconds),
      })),
    }));
}
