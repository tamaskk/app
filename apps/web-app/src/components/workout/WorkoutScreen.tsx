"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import * as api from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Sheet, SheetItem } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Skeleton";
import { ExerciseImage } from "./ExerciseImage";
import { ExercisePicker } from "@/components/exercises/ExercisePicker";
import type { ExerciseDto } from "@/lib/api";
import { REST_SECONDS_KEY } from "@/lib/config";
import {
  clearProgress,
  getProgress,
  saveProgress,
} from "@/lib/workoutProgress";
import { fmtClock, fmtMinSec, suggestionLabel, titleCase } from "@/lib/format";
import type {
  ProgressionSuggestion,
  SavedExercise,
  SavedSet,
  SavedTraining,
} from "@/lib/types";

type Ex = SavedExercise & { sets: SavedSet[] };

export function WorkoutScreen({ trainingId }: { trainingId: string }) {
  const router = useRouter();
  const { t, tFmt } = useI18n();

  const [training, setTraining] = useState<SavedTraining | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [exercises, setExercises] = useState<Ex[]>([]);
  const [current, setCurrent] = useState(0);
  const [suggestions, setSuggestions] = useState<Record<string, ProgressionSuggestion>>({});
  const [estimating, setEstimating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [restPickerOpen, setRestPickerOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [confirm, setConfirm] = useState<number | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);

  // ----- elapsed clock: banked + (now - sittingStart) -----
  const bankedRef = useRef(0);
  const startRef = useRef<number>(0);
  const [, forceTick] = useState(0);

  // Live refs so the browser-close/refresh handler can flush the latest state
  // without stale closures. `endedRef` blocks that flush after finish/discard
  // so a completed workout can't resurrect itself as "started".
  const exercisesRef = useRef<Ex[]>([]);
  const trainingIdRef = useRef<string>("");
  const endedRef = useRef(false);

  // ----- rest timer -----
  const [restDuration, setRestDuration] = useState(90);
  const [restRemaining, setRestRemaining] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const [restOver, setRestOver] = useState(false);

  // Persist the workout's live state (elapsed clock + done flags) under its id.
  // Called on load, on every edit, and on browser hide/refresh — so a started
  // workout survives closing the tab and shows up in the "continue" list.
  const writeProgress = useCallback((id: string, exs: Ex[]) => {
    if (!id) return;
    saveProgress(id, {
      elapsedSeconds: bankedRef.current + Math.floor((Date.now() - startRef.current) / 1000),
      updatedAt: Date.now(),
      done: exs.map((e) => e.sets.map((s) => s.done)),
    });
  }, []);

  const saveNow = useCallback(
    (exs: Ex[]) => writeProgress(training?.id ?? "", exs),
    [training, writeProgress],
  );

  // Keep the flush ref in sync with the latest exercises.
  useEffect(() => {
    exercisesRef.current = exercises;
  }, [exercises]);

  // ----- load training -----
  useEffect(() => {
    let alive = true;
    (async () => {
      let list = await api.getTrainings().catch(() => []);
      let tr = list.find((x) => x.id === trainingId);
      if (!tr) {
        list = await api.getTrainings("hyrox").catch(() => []);
        tr = list.find((x) => x.id === trainingId);
      }
      if (!alive) return;
      if (!tr) {
        setNotFound(true);
        return;
      }
      // deep copy sets so edits don't mutate the fetched object
      const exs: Ex[] = tr.exercises.map((e) => ({
        ...e,
        sets: e.sets.map((s) => ({ ...s })),
      }));
      // restore local progress (clock + done flags), guarding shape changes
      const prog = getProgress(tr.id);
      if (prog && prog.done.length === exs.length) {
        exs.forEach((e, i) => {
          if (prog.done[i]?.length === e.sets.length) {
            e.sets.forEach((s, j) => (s.done = prog.done[i][j]));
          }
        });
        bankedRef.current = prog.elapsedSeconds;
      }
      startRef.current = Date.now();
      trainingIdRef.current = tr.id;
      exercisesRef.current = exs;
      endedRef.current = false;
      // Mark the workout as started right away — before any set is touched — so
      // opening it (and letting the timer run) already persists across reloads.
      writeProgress(tr.id, exs);
      setTraining(tr);
      setExercises(exs);
      setRestDuration(readRest());
      // progression suggestions (best effort)
      api
        .getProgressionSuggestions(
          exs.map((e) => ({
            exerciseId: e.exerciseId,
            name: e.name,
            progressionStrategy: e.progressionStrategy,
            targetMuscles: e.targetMuscles,
            sets: e.sets.map((s) => ({ kg: s.kg, reps: s.reps })),
          })),
        )
        .then((m) => alive && setSuggestions(m));
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingId]);

  // Flush the latest state when the tab is hidden or the browser is refreshed/
  // closed — captures the up-to-date elapsed clock without saving every second.
  // Skipped once the workout has been finished or discarded (endedRef) so a
  // completed workout doesn't reappear as "started".
  useEffect(() => {
    const flush = () => {
      if (endedRef.current || !trainingIdRef.current) return;
      writeProgress(trainingIdRef.current, exercisesRef.current);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [writeProgress]);

  // ----- 1s tick drives both the clock and rest countdown -----
  useEffect(() => {
    const id = setInterval(() => {
      forceTick((n) => n + 1);
      if (restRunning) {
        setRestRemaining((r) => {
          if (r <= 1) {
            setRestRunning(false);
            setRestOver(true);
            return 0;
          }
          return r - 1;
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [restRunning]);

  const elapsed = bankedRef.current + Math.floor((Date.now() - startRef.current) / 1000);

  const allSetsFilled = useMemo(
    () => exercises.length > 0 && exercises.every((e) => e.sets.length > 0 && e.sets.every((s) => s.reps > 0)),
    [exercises],
  );

  // Persist the exercise list to the backend (best-effort) — used when the
  // structure changes (swap), so the edit sticks across reloads.
  const persistTraining = useCallback(
    (exs: Ex[]) => {
      const id = training?.id;
      if (!id) return;
      api
        .updateTraining(id, {
          exercises: exs.map((e) => ({
            exerciseId: e.exerciseId,
            name: e.name,
            category: e.category,
            gifUrl: e.gifUrl,
            targetMuscles: e.targetMuscles,
            progressionStrategy: e.progressionStrategy,
            metric: e.metric,
            stationKey: e.stationKey,
            note: e.note,
            kcal: e.kcal ?? null,
            sets: e.sets.map((s) => ({
              kg: s.kg,
              reps: s.reps,
              done: s.done,
              distanceM: s.distanceM,
              seconds: s.seconds,
              targetKg: s.targetKg,
            })),
          })),
        })
        .catch(() => {
          /* keep local state; retry on next edit */
        });
    },
    [training],
  );

  // ----- mutations -----
  const mutate = (fn: (exs: Ex[]) => Ex[]) => {
    setExercises((prev) => {
      const next = fn(prev.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })));
      saveNow(next);
      return next;
    });
  };

  // Replace the current exercise's catalogue identity, keeping its sets
  // (kg/reps/done) — the change-exercise flow. Persists to the backend.
  const swapExercise = (picked: ExerciseDto) => {
    setSwapOpen(false);
    const idx = current;
    setExercises((prev) => {
      const next = prev.map((e, i) =>
        i === idx
          ? {
              ...e,
              exerciseId: picked.exerciseId,
              name: picked.name,
              gifUrl: picked.gifUrl,
              targetMuscles: picked.targetMuscles ?? [],
              sets: e.sets.map((s) => ({ ...s })),
            }
          : { ...e, sets: e.sets.map((s) => ({ ...s })) },
      );
      saveNow(next);
      persistTraining(next);
      return next;
    });
  };

  const setField = (exIdx: number, setIdx: number, field: "kg" | "reps", value: number) =>
    mutate((exs) => {
      exs[exIdx].sets[setIdx][field] = value;
      return exs;
    });

  const toggleDone = (exIdx: number, setIdx: number) =>
    mutate((exs) => {
      const s = exs[exIdx].sets[setIdx];
      s.done = !s.done;
      if (s.done) startRest();
      return exs;
    });

  const addSet = (exIdx: number) =>
    mutate((exs) => {
      const sets = exs[exIdx].sets;
      const last = sets[sets.length - 1];
      sets.push({ kg: last?.kg ?? 0, reps: last?.reps ?? 0, done: false });
      return exs;
    });

  const removeSet = (exIdx: number) =>
    mutate((exs) => {
      if (exs[exIdx].sets.length > 1) exs[exIdx].sets.pop();
      return exs;
    });

  // ----- rest -----
  function startRest() {
    setRestRemaining(readRest());
    setRestRunning(true);
    setRestOver(false);
  }
  function toggleRest() {
    if (restRunning) setRestRunning(false);
    else startRest();
  }
  function chooseRest(sec: number) {
    setRestDuration(sec);
    try {
      localStorage.setItem(REST_SECONDS_KEY, String(sec));
    } catch {}
    setRestPickerOpen(false);
  }
  function readRest(): number {
    try {
      const v = Number(localStorage.getItem(REST_SECONDS_KEY));
      return v > 0 ? v : 90;
    } catch {
      return 90;
    }
  }

  // ----- calories -----
  async function estimate() {
    if (!allSetsFilled || estimating) return;
    setEstimating(true);
    try {
      const kcals = await api.estimateCalories(
        exercises.map((e) => ({
          name: e.name,
          targetMuscles: e.targetMuscles,
          sets: e.sets.map((s) => ({ kg: s.kg, reps: s.reps })),
        })),
        elapsed,
      );
      mutate((exs) => {
        exs.forEach((e, i) => (e.kcal = kcals[i] ?? e.kcal));
        return exs;
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : t("workout.kcal_failed"));
    } finally {
      setEstimating(false);
    }
  }

  // ----- finish -----
  function confirmFinish() {
    setMenuOpen(false);
    const unchecked = exercises.filter((e) => e.sets.some((s) => !s.done)).length;
    if (unchecked === 0) finish();
    else setConfirm(unchecked);
  }

  async function finish() {
    if (!training || finishing) return;
    setConfirm(null);
    setFinishing(true);
    endedRef.current = true; // don't let the hide-flush resurrect this workout
    const now = new Date();
    const started = new Date(now.getTime() - elapsed * 1000);
    const payload = exercises.map((e) => ({
      exerciseId: e.exerciseId,
      name: e.name,
      category: e.category,
      gifUrl: e.gifUrl,
      targetMuscles: e.targetMuscles,
      progressionStrategy: e.progressionStrategy,
      kcal: e.kcal ?? null,
      sets: e.sets.map((s) => ({ kg: s.kg, reps: s.reps, done: true })),
    }));
    try {
      const result = await api.createSession({
        trainingId: training.id || null,
        name: training.name,
        startedAt: started.toISOString(),
        finishedAt: now.toISOString(),
        exercises: payload,
      });
      clearProgress(training.id);
      sessionStorage.setItem("heftor_summary", JSON.stringify(result));
      router.replace("/summary");
    } catch (e) {
      // Save failed — the workout is still in progress, so keep persisting it.
      endedRef.current = false;
      alert(e instanceof Error ? e.message : t("workout.save_failed"));
      setFinishing(false);
    }
  }

  function pause() {
    saveNow(exercises);
    router.back();
  }
  function discard() {
    endedRef.current = true; // discarded — don't re-persist on the way out
    if (training) clearProgress(training.id);
    router.back();
  }

  // ---------------------------------------------------------------------------
  if (notFound) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
        <Icon name="dumbbell" size={44} className="text-muted" />
        <p className="mt-3 text-base text-muted">{t("workout.no_more_exercises")}</p>
        <button onClick={() => router.back()} className="mt-5 rounded-full bg-primary px-6 py-3 text-sm font-bold text-background">
          {t("workout.exit")}
        </button>
      </div>
    );
  }
  if (!training) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner size={26} className="text-muted" />
      </div>
    );
  }

  const ex = exercises[current];
  const suggestion = ex ? suggestions[ex.exerciseId] : undefined;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[520px] lg:max-w-[720px]">
      {/* Top bar */}
      <header className="flex items-center gap-2 px-4 py-2">
        <button onClick={() => setMenuOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-low text-on-surface">
          <Icon name="menu" size={22} />
        </button>
        <div className="flex-1 text-center text-[22px] font-extrabold tracking-[-0.02em] text-on-surface tabular-nums">
          {fmtClock(elapsed)}
        </div>
        <button
          onClick={toggleRest}
          onContextMenu={(e) => {
            e.preventDefault();
            setRestPickerOpen(true);
          }}
          className={`flex items-center gap-1.5 rounded-full bg-surface-low px-3.5 py-2 ${
            restRunning ? "border border-accent-amber text-accent-amber" : "text-on-surface"
          }`}
        >
          <Icon name={restRunning ? "pause" : "timer"} size={16} />
          <span className="text-[15px] font-bold tabular-nums">
            {restRunning ? fmtMinSec(restRemaining) : fmtMinSec(restDuration)}
          </span>
        </button>
      </header>

      {/* Thumbnail strip */}
      {exercises.length > 0 && (
        <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 py-2">
          {exercises.map((e, i) => (
            <button
              key={e.exerciseId + i}
              onClick={() => setCurrent(i)}
              className={`h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[14px] bg-surface-low transition-opacity ${
                i === current ? "border-2 border-primary opacity-100" : "border border-outline opacity-45"
              }`}
            >
              <ExerciseImage url={e.gifUrl} iconSize={18} className="h-full w-full" />
            </button>
          ))}
        </div>
      )}

      {/* Exercise body */}
      {ex ? (
        <div className="px-5 pb-28 pt-1 lg:pb-10">
          <div className="h-[200px] w-full overflow-hidden rounded-3xl bg-surface-low lg:h-[280px]">
            <ExerciseImage url={ex.gifUrl} iconSize={56} className="h-full w-full" fit="contain" />
          </div>
          <div className="mt-4 flex items-start justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-on-surface">{titleCase(ex.name)}</h1>
              <p className="mt-0.5 text-[15px] text-muted">
                {ex.targetMuscles.length ? ex.targetMuscles.map(titleCase).join(", ") : t("workout.exercise_fallback")}
              </p>
              {ex.note && <p className="mt-1 text-[13px] leading-[1.25] text-accent-amber">{ex.note}</p>}
            </div>
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(titleCase(ex.name) + " how to")}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 pl-3 pt-1 text-sm font-semibold text-muted underline"
            >
              {t("workout.how_to")}
            </a>
          </div>

          {/* Change exercise (swap) */}
          <button
            onClick={() => setSwapOpen(true)}
            className="mt-3 flex items-center gap-2 rounded-full border border-outline bg-surface-low px-4 py-2 text-[13px] font-bold text-on-surface"
          >
            <Icon name="swap" size={16} />
            {t("exercise.change_exercise")}
          </button>

          {/* Suggestion hint */}
          {suggestion && (
            <div className="mb-3 mt-3.5 pl-1 text-[13px] font-medium" style={{ color: "#3A3A3A" }}>
              {t("workout.suggested")}: {suggestionLabel(suggestion.suggestedKg, suggestion.suggestedReps)}
            </div>
          )}

          {/* Sets header */}
          <div className="mt-5 flex items-center px-1">
            <span className="w-7 text-[12px] font-semibold text-muted">#</span>
            <span className="flex-1 text-center text-[11px] tracking-[0.1em] text-muted">{t("workout.col_reps")}</span>
            <span className="w-3" />
            <span className="flex-1 text-center text-[11px] tracking-[0.1em] text-muted">KG</span>
            <span className="w-[38px]" />
          </div>

          {/* Set rows */}
          <div className="mt-2 flex flex-col gap-2">
            {ex.sets.map((s, j) => (
              <div key={j} className="flex items-center">
                <span className="w-7 text-[15px] font-semibold text-muted">{j + 1}</span>
                <NumPill
                  value={s.reps}
                  hint="0"
                  onChange={(v) => setField(current, j, "reps", Math.round(v))}
                />
                <span className="w-3" />
                <NumPill
                  value={s.kg}
                  hint="BW"
                  decimal
                  onChange={(v) => setField(current, j, "kg", v)}
                />
                <button
                  onClick={() => toggleDone(current, j)}
                  className={`ml-3 flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 ${
                    s.done ? "border-accent-amber bg-accent-amber text-background" : "border-surface-high"
                  }`}
                >
                  {s.done && <Icon name="check" size={14} />}
                </button>
              </div>
            ))}
          </div>

          {/* Add / remove */}
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => removeSet(current)}
              disabled={ex.sets.length <= 1}
              className="flex h-12 flex-1 items-center justify-center rounded-full bg-surface-low disabled:opacity-40"
            >
              <Icon name="remove" size={22} className={ex.sets.length <= 1 ? "text-surface-high" : "text-on-surface"} />
            </button>
            <button onClick={() => addSet(current)} className="flex h-12 flex-1 items-center justify-center rounded-full bg-surface-low">
              <Icon name="add" size={22} className="text-on-surface" />
            </button>
          </div>

          {/* Calorie estimate */}
          <button
            onClick={estimate}
            disabled={!allSetsFilled || estimating}
            className={`mt-5 flex h-[50px] w-full items-center justify-center gap-2 rounded-full border border-outline ${
              ex.kcal != null ? "bg-surface-high" : "bg-surface-low"
            }`}
          >
            {estimating ? (
              <Spinner size={20} className="text-on-surface" />
            ) : (
              <>
                <Icon name="fire_outline" size={20} className={allSetsFilled || ex.kcal != null ? "text-on-surface" : "text-muted"} />
                <span className={`text-[15px] font-bold ${allSetsFilled || ex.kcal != null ? "text-on-surface" : "text-muted"}`}>
                  {ex.kcal != null ? tFmt("workout.kcal_value", { n: Math.round(ex.kcal) }) : t("workout.estimate_kcal")}
                </span>
              </>
            )}
          </button>
          {!allSetsFilled && <p className="mt-2 text-center text-[12px] text-muted">{t("workout.kcal_fill_hint")}</p>}
        </div>
      ) : (
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-8 text-center">
          <Icon name="dumbbell" size={44} className="text-muted" />
          <p className="mt-3 text-base text-muted">{t("workout.no_more_exercises")}</p>
        </div>
      )}

      {/* Sticky finish (web affordance — the app hides finish in the menu) */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background to-transparent p-4 lg:static lg:bg-none lg:px-5 lg:pb-8">
        <div className="mx-auto max-w-[520px] lg:max-w-[720px]">
          <button
            onClick={confirmFinish}
            disabled={finishing}
            className="flex h-[52px] w-full items-center justify-center rounded-full bg-primary text-base font-bold text-background disabled:opacity-60"
          >
            {finishing ? <Spinner size={18} className="text-background" /> : t("workout.menu_finish")}
          </button>
        </div>
      </div>

      {/* Workout menu */}
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)}>
        <SheetItem icon={<Icon name="check_circle" size={22} />} label={t("workout.menu_finish")} onClick={confirmFinish} />
        <SheetItem icon={<Icon name="pause" size={22} />} label={t("workout.menu_pause")} onClick={pause} />
        <SheetItem icon={<Icon name="delete" size={22} />} label={t("workout.menu_discard")} muted onClick={discard} />
      </Sheet>

      {/* Change exercise (swap) */}
      <Sheet open={swapOpen} onClose={() => setSwapOpen(false)} maxHeight="88vh">
        <div className="flex h-[80vh] flex-col px-5 pb-2 pt-1">
          <h2 className="pb-3 text-[22px] font-extrabold tracking-[-0.02em] text-on-surface">
            {t("exercise.change_exercise")}
          </h2>
          {ex && <ExercisePicker mode="single" onPick={swapExercise} />}
        </div>
      </Sheet>

      {/* Rest picker */}
      <Sheet open={restPickerOpen} onClose={() => setRestPickerOpen(false)}>
        <div className="px-6 pb-2 pt-1">
          <p className="pb-2 text-[13px] font-semibold tracking-[0.04em] text-muted">{t("workout.rest_time")}</p>
          {[30, 45, 60, 90, 120, 180].map((sec) => (
            <button key={sec} onClick={() => chooseRest(sec)} className="flex w-full items-center justify-between py-3">
              <span className="text-base font-semibold tabular-nums text-on-surface">{fmtMinSec(sec)}</span>
              {sec === restDuration && <Icon name="check" size={18} className="text-on-surface" />}
            </button>
          ))}
        </div>
      </Sheet>

      {/* Finish confirm */}
      {confirm != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8" onClick={() => setConfirm(null)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-sm rounded-3xl bg-surface-low p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-on-surface">{t("workout.finish_confirm_title")}</h3>
            <p className="mt-2 text-sm text-muted">{tFmt("workout.finish_confirm_body", { count: confirm })}</p>
            <div className="mt-5 flex justify-end gap-4">
              <button onClick={() => setConfirm(null)} className="py-2 text-sm font-semibold text-muted">
                {t("common.cancel")}
              </button>
              <button onClick={finish} className="py-2 text-sm font-bold text-on-surface">
                {t("workout.finish_anyway")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rest-over overlay */}
      {restOver && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 px-7 text-center">
          <Icon name="timer" size={88} className="text-accent-amber" />
          <h2 className="mt-7 text-[34px] font-extrabold tracking-[-0.02em] text-on-surface">{t("workout.rest_over")}</h2>
          <p className="mt-2.5 text-base text-muted">{t("workout.rest_get_ready")}</p>
          <button
            onClick={() => setRestOver(false)}
            className="mt-10 h-14 w-full max-w-xs rounded-full bg-accent-amber text-[17px] font-extrabold text-background"
          >
            {t("common.continue")}
          </button>
        </div>
      )}
    </div>
  );
}

function NumPill({
  value,
  hint,
  decimal,
  onChange,
}: {
  value: number;
  hint: string;
  decimal?: boolean;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(value ? String(value) : "");
  useEffect(() => {
    setText(value ? String(value) : "");
  }, [value]);
  return (
    <div className="flex h-[46px] flex-1 items-center justify-center rounded-[14px] bg-surface-mid">
      <input
        value={text}
        inputMode={decimal ? "decimal" : "numeric"}
        placeholder={hint}
        onChange={(e) => {
          const raw = e.target.value.replace(",", ".");
          setText(e.target.value);
          const n = decimal ? parseFloat(raw) : parseInt(raw, 10);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="w-full bg-transparent text-center text-[17px] font-bold text-on-surface outline-none placeholder:text-muted"
      />
    </div>
  );
}
