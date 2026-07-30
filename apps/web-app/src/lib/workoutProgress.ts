// Local in-progress workout persistence — a web port of
// services/workout_progress.dart. Stored per training under
// `workout_progress_<id>` in localStorage.

import { workoutProgressKey } from "./config";

export type WorkoutProgress = {
  elapsedSeconds: number;
  updatedAt: number; // ms epoch
  done: boolean[][]; // per-exercise, per-set completion flags
};

export function getProgress(id: string): WorkoutProgress | null {
  if (typeof window === "undefined" || !id) return null;
  try {
    const raw = localStorage.getItem(workoutProgressKey(id));
    if (!raw) return null;
    const p = JSON.parse(raw) as WorkoutProgress;
    if (!Array.isArray(p.done)) return null;
    return p;
  } catch {
    return null;
  }
}

export function saveProgress(id: string, p: WorkoutProgress) {
  if (typeof window === "undefined" || !id) return;
  try {
    localStorage.setItem(workoutProgressKey(id), JSON.stringify(p));
  } catch {
    /* ignore quota errors */
  }
}

export function clearProgress(id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    localStorage.removeItem(workoutProgressKey(id));
  } catch {
    /* ignore */
  }
}

export function doneCount(p: WorkoutProgress): number {
  return p.done.reduce((a, ex) => a + ex.filter(Boolean).length, 0);
}

/** All stored progress keyed by training id. */
export function allProgress(): Record<string, WorkoutProgress> {
  const out: Record<string, WorkoutProgress> = {};
  if (typeof window === "undefined") return out;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("workout_progress_")) continue;
      const id = key.slice("workout_progress_".length);
      const p = getProgress(id);
      if (p) out[id] = p;
    }
  } catch {
    /* ignore */
  }
  return out;
}
