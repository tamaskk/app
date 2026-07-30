"use client";

import { useCallback, useEffect, useState } from "react";
import * as api from "./api";
import { allProgress, type WorkoutProgress } from "./workoutProgress";
import type { SavedTraining, StagnationItem, WorkoutSession } from "./types";

// Shared loader for the dashboard + trainings list: sessions, trainings,
// stagnation and local in-progress state. Mirrors the `_load` flow both screens
// run. Best-effort — a failed call yields empty data, not a crash.

export type AppData = {
  loading: boolean;
  error: string | null;
  sessions: WorkoutSession[];
  trainings: SavedTraining[];
  // HYROX (and other non-strength) trainings that have local in-progress state
  // but aren't in `trainings` (getTrainings excludes hyrox). Kept separate so
  // they surface as resumable cards WITHOUT polluting the strength lists —
  // mirrors the mobile `_resumableExtra`.
  resumableExtra: SavedTraining[];
  stagnation: StagnationItem[];
  inProgress: Record<string, WorkoutProgress>;
  reload: () => void;
};

export function useAppData(opts?: { withStagnation?: boolean }): AppData {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [trainings, setTrainings] = useState<SavedTraining[]>([]);
  const [resumableExtra, setResumableExtra] = useState<SavedTraining[]>([]);
  const [stagnation, setStagnation] = useState<StagnationItem[]>([]);
  const [inProgress, setInProgress] = useState<Record<string, WorkoutProgress>>({});
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      let hadError = false;
      const [tr, se] = await Promise.all([
        api.getTrainings().catch((e) => {
          hadError = true;
          setError(e?.message ?? "Could not reach the server.");
          return [] as SavedTraining[];
        }),
        api.getSessions().catch(() => [] as WorkoutSession[]),
      ]);
      let st: StagnationItem[] = [];
      if (opts?.withStagnation) st = await api.getStagnation().catch(() => []);

      // Resolve in-progress workouts whose training isn't in the strength list
      // (i.e. HYROX). Without this they can never be matched, so a started
      // HYROX workout vanishes from the "continue" list after a reload.
      const progress = allProgress();
      const known = new Set(tr.map((t) => t.id));
      const missingIds = Object.keys(progress).filter((id) => !known.has(id));
      let extra: SavedTraining[] = [];
      if (missingIds.length > 0) {
        const hyrox = await api.getTrainings("hyrox").catch(() => [] as SavedTraining[]);
        const wanted = new Set(missingIds);
        extra = hyrox.filter((t) => wanted.has(t.id));
      }

      if (!alive) return;
      setTrainings(tr);
      setSessions(se);
      setStagnation(st);
      setInProgress(progress);
      setResumableExtra(extra);
      if (!hadError) setError(null);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, opts?.withStagnation]);

  return { loading, error, sessions, trainings, resumableExtra, stagnation, inProgress, reload };
}
