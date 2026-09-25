// Ported 1:1 from apps/mobile/lib/screens/workout_screen.dart.
//
// The workout PLAYER: set-by-set logger, workout timer, rest countdown + alert,
// plate calculator, auto-progression hints, HYROX metric rows, calorie estimate,
// resume-from-progress, and the save/finish flow.
//
// NOTES ON DEVIATIONS from the Dart original (documented for reviewers):
//  * ExerciseImage is inlined here (expo-image + framesFromUrl) rather than a
//    separate widget file — matches the "use expo-image" convention.
//  * HapticFeedback.heavyImpact() → RN Vibration (expo-haptics not installed).
//  * The Info / Change sheets in Dart live in a separate widget file
//    (exercise_sheets.dart, backed by a dedicated exercise_api service that is
//    not yet ported). They are reproduced here as simplified inline sheets.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  FlatList,
  Modal,
  Vibration,
  Alert,
  ActivityIndicator,
  Linking,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../context/AuthContext";
import { Api, ApiException } from "../lib/api";
import { WorkoutProgressStore } from "../lib/workoutProgress";
import {
  Workout,
  Exercise,
  WorkoutSet,
  sampleWorkouts,
} from "../models/workout";
import {
  ProgressionSuggestion,
  WorkoutSessionWithRank,
  type ExerciseMinimal,
} from "../models/apiModels";
import { PlateCalculatorSheet } from "../components/PlateCalculatorSheet";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";
import { Screen } from "../components/ui";
import { titleCase } from "../utils/text";
import { exLabels } from "../utils/exerciseLabels";
import { framesFromUrl } from "../utils/exerciseFrames";

const api = new Api();

// Selectable rest lengths (seconds) for the long-press picker.
const REST_CHOICES = [30, 45, 60, 90, 120, 180];
const REST_KEY = "rest_seconds";

// --- pure formatters (module scope) ----------------------------------------

function formatKg(kg: number): string {
  return kg === Math.round(kg) ? String(Math.trunc(kg)) : String(kg);
}

function msFmt(seconds: number): string {
  const m = Math.trunc(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function fmtClock(secs: number | null | undefined): string {
  if (secs == null || secs <= 0) return "–";
  const m = Math.trunc(secs / 60);
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function fmtPace(secsPerKm: number | null | undefined): string {
  return secsPerKm == null || secsPerKm <= 0 ? "–" : `${fmtClock(secsPerKm)}/km`;
}

// Serialise one set for the backend. Always carries kg/reps; includes the HYROX
// metric fields only when present, and the done flag only for sessions.
function setPayload(s: WorkoutSet, done: boolean): Record<string, unknown> {
  return {
    kg: s.kg,
    reps: s.reps,
    ...(done ? { done: s.done } : {}),
    ...(s.distanceM != null ? { distanceM: s.distanceM } : {}),
    ...(s.seconds != null ? { seconds: s.seconds } : {}),
    ...(s.targetKg != null ? { targetKg: s.targetKg } : {}),
  };
}

// Stable per-set keys (mirrors Dart's ValueKey(set)) so uncontrolled text
// fields keep focus across parent re-renders.
const setKeys = new WeakMap<object, string>();
let setKeyCounter = 0;
function keyFor(s: object): string {
  let k = setKeys.get(s);
  if (k == null) {
    k = `s${setKeyCounter++}`;
    setKeys.set(s, k);
  }
  return k;
}

type Metric = string | null;

// Column header labels for the sets table, per HYROX metric. Returns
// [left, right]; right is empty when there's only one column.
function columnLabels(
  metric: Metric,
  t: (k: string, p?: Record<string, string | number>) => string,
): [string, string] {
  switch (metric) {
    case "distance":
      return [t("workout.col_meters"), ""];
    case "pace":
      return [t("workout.col_meters"), t("workout.col_pace")];
    case "distance_weight":
      return [t("workout.col_meters"), "KG"];
    case "reps_weight":
      return [t("workout.col_reps"), "KG"];
    case "time":
      return [t("workout.col_time"), ""];
    default:
      return [t("workout.col_reps"), "KG"];
  }
}

// ===========================================================================
// SCREEN
// ===========================================================================

export function WorkoutScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "Workout">) {
  const { t } = useLang();
  useAuth(); // token is read by the Api client from storage.
  const { width } = useWindowDimensions();

  // Falls back to a sample when none is provided (matches the Dart default).
  const workoutRef = useRef<Workout>(route.params?.workout ?? sampleWorkouts[1]);
  const workout = workoutRef.current;
  const resumeSessionId = route.params?.resumeSessionId ?? null;

  // --- render / clock plumbing ----------------------------------------------
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const [nowTick, setNowTick] = useState(Date.now());

  // Elapsed clock = time banked from previous sittings + time since this one
  // opened. Derived from a stored timestamp so it can't drift on re-render.
  const bankedElapsedRef = useRef(route.params?.resumeElapsedSeconds ?? 0);
  const sittingStartRef = useRef<number>(Date.now());
  const elapsedTotal = useCallback(
    () =>
      bankedElapsedRef.current +
      Math.floor((Date.now() - sittingStartRef.current) / 1000),
    [],
  );

  // --- rest timer -----------------------------------------------------------
  const [rest, setRest] = useState<{ running: boolean; remaining: number }>({
    running: false,
    remaining: 0,
  });
  const [restDuration, setRestDuration] = useState(90);
  const [restAlertVisible, setRestAlertVisible] = useState(false);
  const restJustFinishedRef = useRef(false);
  const restAlertShowingRef = useRef(false);
  const buzzTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- exercise paging ------------------------------------------------------
  const [currentExercise, setCurrentExercise] = useState(0);
  const pagerRef = useRef<FlatList<Exercise>>(null);

  // --- persistence ----------------------------------------------------------
  const dirtyRef = useRef(false);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitingRef = useRef(false);
  const mountedRef = useRef(true);
  const [estimating, setEstimating] = useState(false);

  // Auto-progression hints, keyed by exerciseId.
  const [suggestions, setSuggestions] = useState<
    Record<string, ProgressionSuggestion>
  >({});

  // Plate calculator target (null → sheet closed).
  const [plateKg, setPlateKg] = useState<number | null>(null);

  // Bottom-sheet router.
  const [sheet, setSheet] = useState<
    | null
    | { kind: "workoutMenu" }
    | { kind: "exerciseMenu"; index: number }
    | { kind: "progression"; index: number }
    | { kind: "restPicker" }
    | { kind: "info"; index: number }
    | { kind: "change"; index: number }
  >(null);
  const closeSheet = useCallback(() => setSheet(null), []);

  // The calorie estimate needs every set logged: reps > 0 for every set of
  // every exercise (kg may legitimately be 0 for bodyweight).
  const allSetsFilled =
    workout.exercises.length > 0 &&
    workout.exercises.every(
      (e) => e.sets.length > 0 && e.sets.every((s) => s.reps > 0),
    );

  // --- persistence helpers --------------------------------------------------

  const save = useCallback(async () => {
    const wk = workoutRef.current;
    const id = wk.id;
    if (id == null) return;
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = null;
    }
    dirtyRef.current = false;
    try {
      await api.updateTraining(
        id,
        wk.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          name: e.name,
          gifUrl: e.gifUrl,
          targetMuscles: e.targetMuscles,
          category: e.variant.length === 0 ? null : e.variant,
          progressionStrategy: e.progressionStrategy,
          // Round-trip HYROX metadata so a save doesn't strip stations.
          metric: e.metric,
          stationKey: e.stationKey,
          note: e.note,
          // Persist weights/reps (+ HYROX metric fields) only — not the
          // session's done flags.
          sets: e.sets.map((s) => setPayload(s, false)),
        })),
        wk.name,
      );
    } catch {
      dirtyRef.current = true; // keep it pending so a later flush retries
    }
  }, []);

  const saveProgress = useCallback(() => {
    const wk = workoutRef.current;
    const id = wk.id;
    if (id == null) return;
    void WorkoutProgressStore.save(id, elapsedTotal(), wk.exercises);
  }, [elapsedTotal]);

  // Debounced persistence — called after any edit. No-op for unsaved workouts.
  const scheduleSave = useCallback(() => {
    if (workoutRef.current.id == null) return;
    dirtyRef.current = true;
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      void save();
    }, 600);
  }, [save]);

  // --- suggestions / prefs / resume ----------------------------------------

  const loadSuggestions = useCallback(async () => {
    const payload = workoutRef.current.exercises
      .filter((e) => e.exerciseId.length > 0)
      .map((e) => ({
        exerciseId: e.exerciseId,
        strategy: e.progressionStrategy,
        category: e.variant.length === 0 ? null : e.variant,
        targetMuscles: e.targetMuscles,
        name: e.name,
      }));
    const result = await api.getProgressionSuggestions(payload);
    if (mountedRef.current) setSuggestions(result);
  }, []);

  const loadRestPref = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(REST_KEY);
      const parsed = saved != null ? parseInt(saved, 10) : NaN;
      if (!Number.isNaN(parsed) && mountedRef.current) setRestDuration(parsed);
    } catch {
      // keep default
    }
  }, []);

  // Restore an in-progress workout (elapsed + done flags) if the user backed
  // out without finishing; otherwise record this open so it can be resumed.
  const initProgress = useCallback(async () => {
    const wk = workoutRef.current;
    const id = wk.id;
    if (id == null) return; // sample/unsaved: nothing to persist against
    const saved = await WorkoutProgressStore.load(id);
    if (saved != null && mountedRef.current) {
      // Continue the banked clock from where it was left off.
      bankedElapsedRef.current = saved.elapsedSeconds;
      sittingStartRef.current = Date.now();
      // Re-apply the saved done flags, guarding against an edited workout whose
      // exercise/set counts no longer match.
      for (
        let e = 0;
        e < wk.exercises.length && e < saved.done.length;
        e++
      ) {
        const sets = wk.exercises[e].sets;
        const flags = saved.done[e];
        for (let s = 0; s < sets.length && s < flags.length; s++) {
          sets[s].done = flags[s];
        }
      }
      bump();
    } else {
      // First open — seed the entry (carries any resumeElapsed banked above).
      await WorkoutProgressStore.save(id, bankedElapsedRef.current, wk.exercises);
    }
  }, [bump]);

  // --- lifecycle ------------------------------------------------------------

  // One periodic tick repaints the elapsed clock and drives the rest countdown.
  useEffect(() => {
    const id = setInterval(() => {
      setNowTick(Date.now());
      setRest((prev) => {
        if (prev.running && prev.remaining > 0) {
          const r = prev.remaining - 1;
          if (r === 0) {
            restJustFinishedRef.current = true;
            return { running: false, remaining: 0 };
          }
          return { running: true, remaining: r };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Fire the rest-over alert once the countdown lands on 0 (after the render).
  useEffect(() => {
    if (restJustFinishedRef.current) {
      restJustFinishedRef.current = false;
      onRestComplete();
    }
  });

  // Mount: seed clock/resume, fetch suggestions, restore the rest pref.
  useEffect(() => {
    mountedRef.current = true;
    void initProgress();
    void loadSuggestions();
    void loadRestPref();
    return () => {
      mountedRef.current = false;
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      if (buzzTimerRef.current) clearInterval(buzzTimerRef.current);
      Vibration.cancel();
      // Flush any pending edit before tearing down.
      if (dirtyRef.current && workoutRef.current.id != null) void save();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Intercept back / swipe-to-dismiss: save edits, no session (Dart PopScope).
  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e) => {
      if (exitingRef.current) return; // our own programmatic leave — allow
      e.preventDefault();
      void exit({ asSession: false });
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  // --- rest control ---------------------------------------------------------

  function toggleRest() {
    setRest((prev) =>
      prev.running
        ? { running: false, remaining: 0 }
        : { running: true, remaining: restDuration },
    );
  }

  function startRest() {
    setRest({ running: true, remaining: restDuration });
  }

  // Fired when the rest countdown reaches 0: buzz repeatedly and show a
  // full-screen alert that must be tapped away.
  function onRestComplete() {
    if (!mountedRef.current || restAlertShowingRef.current) return;
    restAlertShowingRef.current = true;
    Vibration.vibrate();
    if (buzzTimerRef.current) clearInterval(buzzTimerRef.current);
    buzzTimerRef.current = setInterval(() => Vibration.vibrate(), 700);
    setRestAlertVisible(true);
  }

  function dismissRestAlert() {
    if (buzzTimerRef.current) {
      clearInterval(buzzTimerRef.current);
      buzzTimerRef.current = null;
    }
    Vibration.cancel();
    restAlertShowingRef.current = false;
    setRestAlertVisible(false);
  }

  async function openYoutube(ex: Exercise) {
    const query = encodeURIComponent(`${titleCase(ex.name)} how to`);
    const uri = `https://www.youtube.com/results?search_query=${query}`;
    await Linking.openURL(uri).catch(() => undefined);
  }

  // --- exercise navigation --------------------------------------------------

  function goToExercise(i: number) {
    if (i < 0 || i >= workout.exercises.length || i === currentExercise) return;
    pagerRef.current?.scrollToIndex({ index: i, animated: true });
  }

  function onPagerMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== currentExercise) setCurrentExercise(i);
  }

  // Append a new set, copying the previous set's kg/reps as a sensible start.
  function addSet(ex: Exercise) {
    const last = ex.sets.length > 0 ? ex.sets[ex.sets.length - 1] : null;
    ex.sets.push(new WorkoutSet(last?.kg ?? 0, last?.reps ?? 0));
    bump();
    scheduleSave();
    saveProgress();
  }

  function removeSet(ex: Exercise, set: WorkoutSet) {
    if (ex.sets.length <= 1) return;
    const i = ex.sets.indexOf(set);
    if (i >= 0) ex.sets.splice(i, 1);
    bump();
    scheduleSave();
    saveProgress();
  }

  // --- exit / finish --------------------------------------------------------

  function leave() {
    navigation.goBack();
  }

  // Explicit "leave, continue later": always persist progress (even with no
  // sets ticked) so the workout shows up as continuable, then leave.
  async function pauseAndExit() {
    if (exitingRef.current) return;
    exitingRef.current = true;
    await save();
    saveProgress();
    leave();
  }

  // Discard: drop the saved progress so it won't show as continuable, then
  // leave without logging a session.
  async function discardAndExit() {
    if (exitingRef.current) return;
    exitingRef.current = true;
    const id = workoutRef.current.id;
    if (id != null) await WorkoutProgressStore.clear(id);
    leave();
  }

  // Leave the screen: flush training edits, and (on Finish) log a session.
  async function exit({ asSession }: { asSession: boolean }) {
    if (exitingRef.current) return;
    exitingRef.current = true;
    await save();
    let created: WorkoutSessionWithRank | null = null;
    const wk = workoutRef.current;
    if (asSession && wk.id != null) {
      // Back-date the start so the logged duration matches the elapsed clock.
      const finishedAt = new Date();
      const startedAt = new Date(finishedAt.getTime() - elapsedTotal() * 1000);
      const exercisesPayload = wk.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        name: e.name,
        gifUrl: e.gifUrl,
        targetMuscles: e.targetMuscles,
        metric: e.metric,
        stationKey: e.stationKey,
        note: e.note,
        kcal: e.kcal,
        sets: e.sets.map((s) => setPayload(s, true)),
      }));
      try {
        if (resumeSessionId != null) {
          // Resumed an already-logged session → update in place (no XP re-award).
          created = await api.updateSession(
            resumeSessionId,
            finishedAt,
            exercisesPayload,
          );
        } else {
          created = await api.createSession({
            trainingId: wk.id,
            name: wk.name,
            startedAt,
            finishedAt,
            exercises: exercisesPayload,
          });
        }
      } catch {
        created = null;
      }
      if (created == null) {
        // Save failed (offline / server error). Do NOT wipe the resumable
        // progress; keep it, surface the failure, let the user retry Finish.
        saveProgress();
        exitingRef.current = false;
        if (mountedRef.current) snack(t("workout.save_failed"));
        return;
      }
      // Saved successfully — only now is it safe to drop the local progress.
      if (wk.id != null) await WorkoutProgressStore.clear(wk.id);
    } else if (wk.id != null) {
      // Left without finishing: keep progress only if at least one set was
      // ticked, so the "continue" banner doesn't show untouched workouts.
      const anyDone = wk.exercises.some((e) => e.sets.some((s) => s.done));
      if (anyDone) saveProgress();
      else await WorkoutProgressStore.clear(wk.id);
    }
    // On Finish with a saved session, show the summary; otherwise just leave.
    if (created != null) {
      navigation.replace("WorkoutSummary", {
        session: created.session,
        rankDelta: created.rankDelta,
      });
    } else {
      leave();
    }
  }

  // Finish, but warn first when any exercise still has unchecked sets.
  function confirmFinish() {
    const unfinished = workout.exercises.filter(
      (e) => e.sets.length > 0 && e.sets.some((s) => !s.done),
    ).length;
    if (unfinished === 0) {
      void exit({ asSession: true });
      return;
    }
    Alert.alert(
      t("workout.finish_confirm_title"),
      t("workout.finish_confirm_body", { count: unfinished }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("workout.finish_anyway"),
          onPress: () => void exit({ asSession: true }),
        },
      ],
    );
  }

  function snack(msg: string) {
    if (!mountedRef.current) return;
    Alert.alert(msg);
  }

  // Estimate calories burned for the whole workout via the backend (OpenAI),
  // then stamp per-exercise kcal onto every exercise. Gated on allSetsFilled.
  async function estimateCalories() {
    if (estimating || !allSetsFilled) return;
    setEstimating(true);
    try {
      const wk = workoutRef.current;
      const payload = wk.exercises.map((e) => ({
        name: e.name,
        targetMuscles: e.targetMuscles,
        sets: e.sets.map((s) => ({ kg: s.kg, reps: s.reps })),
      }));
      const kcals = await api.estimateCalories(payload, elapsedTotal());
      if (!mountedRef.current) return;
      for (let i = 0; i < wk.exercises.length && i < kcals.length; i++) {
        wk.exercises[i].kcal = kcals[i];
      }
      bump();
      const total = kcals.reduce((a, b) => a + b, 0);
      snack(t("workout.kcal_estimated", { n: Math.round(total) }));
    } catch (e) {
      if (e instanceof ApiException) snack(e.message);
      else snack(t("workout.kcal_failed"));
    } finally {
      if (mountedRef.current) setEstimating(false);
    }
  }

  // --- exercise menu actions ------------------------------------------------

  function setProgressionStrategy(index: number, value: string) {
    const ex = workout.exercises[index];
    if (ex.progressionStrategy === value) return;
    ex.progressionStrategy = value;
    bump();
    scheduleSave();
    void loadSuggestions();
  }

  // Swap an exercise, keeping its strategy + logged sets (Dart _changeExercise).
  function applyChange(
    index: number,
    picked: {
      name: string;
      exerciseId: string;
      gifUrl: string;
      targetMuscles: string[];
    },
  ) {
    const old = workout.exercises[index];
    workout.exercises[index] = new Exercise(
      picked.name,
      "",
      old.sets, // keep the logged sets
      picked.exerciseId,
      picked.gifUrl,
      picked.targetMuscles,
      old.progressionStrategy, // keep the strategy
    );
    bump();
    scheduleSave();
    void loadSuggestions(); // the new exercise has its own history
  }

  function deleteExercise(index: number) {
    workout.exercises.splice(index, 1);
    let next = currentExercise;
    if (next >= workout.exercises.length) {
      next = workout.exercises.length === 0 ? 0 : workout.exercises.length - 1;
    }
    setCurrentExercise(next);
    bump();
    // Keep the pager aligned with the (possibly clamped) current index.
    requestAnimationFrame(() => {
      if (workoutRef.current.exercises.length > 0) {
        pagerRef.current?.scrollToIndex({ index: next, animated: false });
      }
    });
    scheduleSave();
  }

  // --- derived --------------------------------------------------------------

  const exercises = workout.exercises;
  const hasExercises = exercises.length > 0;
  const index = hasExercises
    ? Math.min(Math.max(currentExercise, 0), exercises.length - 1)
    : 0;

  const rawElapsed = elapsedTotal();
  const secs = rawElapsed < 0 ? 0 : rawElapsed;
  const elapsedString =
    `${String(Math.trunc(secs / 3600)).padStart(2, "0")}:` +
    `${String(Math.trunc((secs % 3600) / 60)).padStart(2, "0")}:` +
    `${String(secs % 60).padStart(2, "0")}`;
  // nowTick keeps the clock repainting each second.
  void nowTick;

  const restString = msFmt(rest.running ? rest.remaining : restDuration);

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {/* Top bar: menu · elapsed · rest pill */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <SquareButton icon="menu" onPress={() => setSheet({ kind: "workoutMenu" })} />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "800",
                letterSpacing: -0.5,
                color: AppColors.onSurface,
                fontVariant: ["tabular-nums"],
              }}
            >
              {elapsedString}
            </Text>
          </View>
          <RestPill
            active={rest.running}
            label={restString}
            onPress={toggleRest}
            onLongPress={() => setSheet({ kind: "restPicker" })}
          />
        </View>

        {/* Thumbnail strip */}
        {hasExercises && (
          <View style={{ height: 76 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
            >
              {exercises.map((ex, i) => {
                const active = i === index;
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.8}
                    onPress={() => goToExercise(i)}
                    style={{
                      width: 60,
                      marginRight: i === exercises.length - 1 ? 0 : 10,
                      opacity: active ? 1 : 0.45,
                      backgroundColor: AppColors.surfaceLow,
                      borderRadius: 14,
                      borderWidth: active ? 2 : 1,
                      borderColor: active ? AppColors.primary : AppColors.outline,
                      overflow: "hidden",
                    }}
                  >
                    <ExerciseImage url={ex.gifUrl} iconSize={18} showLabel compact />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Pager / empty state */}
        <View style={{ flex: 1 }}>
          {hasExercises ? (
            <FlatList
              ref={pagerRef}
              data={exercises}
              extraData={nowTick}
              keyExtractor={(_, i) => `ex-${i}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onPagerMomentumEnd}
              getItemLayout={(_, i) => ({
                length: width,
                offset: width * i,
                index: i,
              })}
              renderItem={({ item, index: i }) => (
                <View style={{ width }}>
                  <ExerciseBody
                    ex={item}
                    index={i}
                    metric={item.metric}
                    suggestion={
                      item.exerciseId.length === 0
                        ? undefined
                        : suggestions[item.exerciseId]
                    }
                    allSetsFilled={allSetsFilled}
                    estimating={estimating}
                    t={t}
                    onInfo={() => setSheet({ kind: "info", index: i })}
                    onChange={() => setSheet({ kind: "change", index: i })}
                    onProgression={() => setSheet({ kind: "progression", index: i })}
                    onMore={() => setSheet({ kind: "exerciseMenu", index: i })}
                    onScheduleSave={scheduleSave}
                    onPlateCalc={(kg) => setPlateKg(kg)}
                    onToggleDone={(s) => {
                      s.done = !s.done;
                      if (s.done) startRest();
                      saveProgress();
                      bump();
                    }}
                    onRemoveSet={(s) => removeSet(item, s)}
                    onAddSet={() => addSet(item)}
                    onEstimate={() => void estimateCalories()}
                    onYoutube={() => void openYoutube(item)}
                  />
                </View>
              )}
            />
          ) : (
            <EmptyState t={t} onExit={() => void exit({ asSession: false })} />
          )}
        </View>
      </View>

      {/* Rest-over full-screen alert */}
      <Modal
        visible={restAlertVisible}
        transparent
        animationType="fade"
        onRequestClose={dismissRestAlert}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.87)",
            justifyContent: "center",
            padding: 28,
          }}
        >
          <MaterialIcons
            name="timer"
            color={AppColors.accentAmber}
            size={88}
            style={{ alignSelf: "center" }}
          />
          <View style={{ height: 28 }} />
          <Text
            style={{
              color: AppColors.onSurface,
              fontSize: 34,
              fontWeight: "800",
              letterSpacing: -0.5,
              textAlign: "center",
            }}
          >
            {t("workout.rest_over")}
          </Text>
          <View style={{ height: 10 }} />
          <Text
            style={{ color: AppColors.muted, fontSize: 16, textAlign: "center" }}
          >
            {t("workout.rest_get_ready")}
          </Text>
          <View style={{ height: 40 }} />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={dismissRestAlert}
            style={{
              height: 56,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: AppColors.accentAmber,
              borderRadius: 100,
            }}
          >
            <Text
              style={{
                color: AppColors.background,
                fontSize: 17,
                fontWeight: "800",
              }}
            >
              {t("common.continue")}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Plate calculator */}
      <PlateCalculatorSheet
        visible={plateKg != null}
        onClose={() => setPlateKg(null)}
        kg={plateKg ?? 0}
      />

      {/* Bottom sheets */}
      <BottomSheet visible={sheet != null} onClose={closeSheet}>
        {sheet?.kind === "workoutMenu" && (
          <>
            <MenuItem
              icon="check-circle-outline"
              label={t("workout.menu_finish")}
              onPress={() => {
                closeSheet();
                confirmFinish();
              }}
            />
            <MenuItem
              icon="pause-circle-outline"
              label={t("workout.menu_pause")}
              onPress={() => {
                closeSheet();
                void pauseAndExit();
              }}
            />
            <MenuItem
              icon="delete-outline"
              label={t("workout.menu_discard")}
              muted
              onPress={() => {
                closeSheet();
                void discardAndExit();
              }}
            />
          </>
        )}

        {sheet?.kind === "exerciseMenu" && (
          <>
            <MenuItem
              icon="info-outline"
              label={t("workout.menu_info")}
              onPress={() => setSheet({ kind: "info", index: sheet.index })}
            />
            <MenuItem
              icon="trending-up"
              label={t("workout.menu_progression")}
              onPress={() => setSheet({ kind: "progression", index: sheet.index })}
            />
            <MenuItem
              icon="swap-horiz"
              label={t("workout.menu_change")}
              onPress={() => setSheet({ kind: "change", index: sheet.index })}
            />
            <MenuItem
              icon="delete-outline"
              label={t("common.delete")}
              muted
              onPress={() => {
                const i = sheet.index;
                closeSheet();
                deleteExercise(i);
              }}
            />
          </>
        )}

        {sheet?.kind === "progression" && (
          <ProgressionPicker
            current={workout.exercises[sheet.index]?.progressionStrategy ?? "linear"}
            t={t}
            onPick={(value) => {
              const i = sheet.index;
              closeSheet();
              setProgressionStrategy(i, value);
            }}
          />
        )}

        {sheet?.kind === "restPicker" && (
          <RestPicker
            current={restDuration}
            t={t}
            onPick={async (seconds) => {
              closeSheet();
              setRestDuration(seconds);
              // If a rest is already counting down, retarget it too.
              setRest((prev) =>
                prev.running ? { ...prev, remaining: seconds } : prev,
              );
              try {
                await AsyncStorage.setItem(REST_KEY, String(seconds));
              } catch {
                // best-effort
              }
            }}
          />
        )}

        {sheet?.kind === "info" && (
          <InfoSheet
            ex={workout.exercises[sheet.index]}
            t={t}
            onYoutube={() => void openYoutube(workout.exercises[sheet.index])}
          />
        )}

        {sheet?.kind === "change" && (
          <ChangeExerciseSheet
            t={t}
            onPicked={(picked) => {
              const i = sheet.index;
              closeSheet();
              applyChange(i, picked);
            }}
          />
        )}
      </BottomSheet>
    </Screen>
  );
}

// ===========================================================================
// SUB-COMPONENTS
// ===========================================================================

type Tfn = (k: string, p?: Record<string, string | number>) => string;

function SquareButton({
  icon,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: AppColors.surfaceLow,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialIcons name={icon} color={AppColors.onSurface} size={22} />
    </TouchableOpacity>
  );
}

function RestPill({
  active,
  label,
  onPress,
  onLongPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const color = active ? AppColors.accentAmber : AppColors.onSurface;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 9,
        backgroundColor: AppColors.surfaceLow,
        borderRadius: 100,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: active ? 1 : 0,
        borderColor: active ? AppColors.accentAmber : "transparent",
      }}
    >
      <MaterialIcons name={active ? "pause" : "timer"} size={16} color={color} />
      <View style={{ width: 6 }} />
      <Text
        style={{
          color,
          fontSize: 15,
          fontWeight: "700",
          fontVariant: ["tabular-nums"],
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ActionButton({
  icon,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: AppColors.surfaceLow,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialIcons name={icon} color={AppColors.onSurface} size={20} />
    </TouchableOpacity>
  );
}

function WideButton({
  icon,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: (() => void) | null;
}) {
  const enabled = onPress != null;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={!enabled}
      onPress={onPress ?? undefined}
      style={{
        flex: 1,
        height: 48,
        borderRadius: 100,
        backgroundColor: AppColors.surfaceLow,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialIcons
        name={icon}
        color={enabled ? AppColors.onSurface : AppColors.surfaceHigh}
        size={22}
      />
    </TouchableOpacity>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  muted = false,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
  muted?: boolean;
}) {
  const color = muted ? AppColors.muted : AppColors.onSurface;
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
      }}
    >
      <MaterialIcons name={icon} color={color} size={22} />
      <View style={{ width: 16 }} />
      <Text style={{ color, fontSize: 16, fontWeight: "600" }}>{label}</Text>
    </TouchableOpacity>
  );
}

function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View
        style={{
          backgroundColor: AppColors.background,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderWidth: 1,
          borderColor: AppColors.outline,
          paddingBottom: 24,
        }}
      >
        <View
          style={{
            alignSelf: "center",
            marginVertical: 12,
            width: 40,
            height: 4,
            borderRadius: 100,
            backgroundColor: AppColors.surfaceHigh,
          }}
        />
        {children}
        <View style={{ height: 8 }} />
      </View>
    </Modal>
  );
}

function ProgressionPicker({
  current,
  t,
  onPick,
}: {
  current: string;
  t: Tfn;
  onPick: (value: string) => void;
}) {
  const options: [string, string, string][] = [
    ["linear", "workout.strat_linear", "workout.strat_linear_desc"],
    ["double-progression", "workout.strat_double", "workout.strat_double_desc"],
    ["rpe-based", "workout.strat_rpe", "workout.strat_rpe_desc"],
    ["none", "workout.strat_none", "workout.strat_none_desc"],
  ];
  return (
    <>
      {options.map(([value, titleKey, subtitleKey]) => (
        <TouchableOpacity
          key={value}
          activeOpacity={0.7}
          onPress={() => onPick(value)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: AppColors.onSurface, fontSize: 16, fontWeight: "600" }}
            >
              {t(titleKey)}
            </Text>
            <Text style={{ color: AppColors.muted, fontSize: 13 }}>
              {t(subtitleKey)}
            </Text>
          </View>
          {current === value && (
            <MaterialIcons name="check" color={AppColors.onSurface} size={22} />
          )}
        </TouchableOpacity>
      ))}
    </>
  );
}

function RestPicker({
  current,
  t,
  onPick,
}: {
  current: number;
  t: Tfn;
  onPick: (seconds: number) => void;
}) {
  return (
    <>
      <View style={{ paddingHorizontal: 20, paddingBottom: 4 }}>
        <Text
          style={{
            color: AppColors.muted,
            fontSize: 13,
            fontWeight: "600",
            letterSpacing: 0.5,
          }}
        >
          {t("workout.rest_time")}
        </Text>
      </View>
      {REST_CHOICES.map((seconds) => (
        <TouchableOpacity
          key={seconds}
          activeOpacity={0.7}
          onPress={() => onPick(seconds)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 14,
          }}
        >
          <Text
            style={{
              flex: 1,
              color: AppColors.onSurface,
              fontSize: 16,
              fontWeight: "600",
              fontVariant: ["tabular-nums"],
            }}
          >
            {msFmt(seconds)}
          </Text>
          {current === seconds && (
            <MaterialIcons name="check" color={AppColors.onSurface} size={22} />
          )}
        </TouchableOpacity>
      ))}
    </>
  );
}

// Simplified Info sheet (Dart's showExerciseInfoSheet lives in a separate,
// api-backed widget file that isn't ported yet).
function InfoSheet({
  ex,
  t,
  onYoutube,
}: {
  ex: Exercise | undefined;
  t: Tfn;
  onYoutube: () => void;
}) {
  if (ex == null) return null;
  const subtitle =
    ex.variant.length > 0
      ? ex.variant
      : ex.targetMuscles.length > 0
        ? titleCase(exLabels(ex.targetMuscles).join(", "))
        : t("workout.exercise_fallback");
  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View
        style={{
          width: "100%",
          height: 200,
          backgroundColor: AppColors.surfaceLow,
          borderRadius: 24,
          overflow: "hidden",
        }}
      >
        <ExerciseImage url={ex.gifUrl} iconSize={56} fit="contain" />
      </View>
      <View style={{ height: 16 }} />
      <Text
        style={{
          fontSize: 24,
          fontWeight: "800",
          letterSpacing: -0.5,
          color: AppColors.onSurface,
        }}
      >
        {titleCase(ex.name)}
      </Text>
      <View style={{ height: 2 }} />
      <Text style={{ fontSize: 15, color: AppColors.muted }}>{subtitle}</Text>
      {ex.note != null && ex.note.length > 0 && (
        <>
          <View style={{ height: 6 }} />
          <Text
            style={{ fontSize: 13, lineHeight: 16, color: AppColors.accentAmber }}
          >
            {ex.note}
          </Text>
        </>
      )}
      <View style={{ height: 16 }} />
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onYoutube}
        style={{
          height: 50,
          borderRadius: 100,
          borderWidth: 1,
          borderColor: AppColors.outline,
          backgroundColor: AppColors.surfaceLow,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons
          name="play-circle-outline"
          color={AppColors.onSurface}
          size={20}
        />
        <View style={{ width: 8 }} />
        <Text
          style={{ color: AppColors.onSurface, fontSize: 15, fontWeight: "700" }}
        >
          {t("workout.watch_youtube")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Simplified exercise-swap picker (Dart's showChangeExerciseSheet is a separate,
// catalogue-api-backed widget). Searches by name and keeps the current sets.
function ChangeExerciseSheet({
  t,
  onPicked,
}: {
  t: Tfn;
  onPicked: (picked: {
    name: string;
    exerciseId: string;
    gifUrl: string;
    targetMuscles: string[];
  }) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ExerciseMinimal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const id = setTimeout(async () => {
      const r = await api.listExercises({ search: q }).catch(() => []);
      if (alive) {
        setResults(r);
        setLoading(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [q]);

  async function pick(item: ExerciseMinimal) {
    const detail = await api.getExercise(item.id).catch(() => null);
    onPicked({
      name: item.name,
      exerciseId: String(item.id),
      gifUrl: "",
      targetMuscles: detail?.primaryMuscles ?? [],
    });
  }

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <Text
        style={{
          color: AppColors.muted,
          fontSize: 13,
          fontWeight: "600",
          letterSpacing: 0.5,
          marginBottom: 10,
        }}
      >
        {t("exercise.change_exercise")}
      </Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={t("exercise.change_exercise")}
        placeholderTextColor={AppColors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        cursorColor={AppColors.onSurface}
        style={{
          backgroundColor: AppColors.surfaceMid,
          borderRadius: 14,
          paddingHorizontal: 16,
          height: 46,
          color: AppColors.onSurface,
          fontSize: 16,
        }}
      />
      <View style={{ height: 12 }} />
      <View style={{ height: 260 }}>
        {loading && results.length === 0 ? (
          <ActivityIndicator color={AppColors.onSurface} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(it) => String(it.id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => void pick(item)}
                style={{ paddingVertical: 14 }}
              >
                <Text
                  style={{
                    color: AppColors.onSurface,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  {titleCase(item.name)}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !loading ? (
                <Text style={{ color: AppColors.muted, marginTop: 20 }}>
                  {t("exercise.no_data")}
                </Text>
              ) : null
            }
          />
        )}
      </View>
    </View>
  );
}

function EmptyState({ t, onExit }: { t: Tfn; onExit: () => void }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <MaterialIcons name="fitness-center" color={AppColors.muted} size={44} />
      <View style={{ height: 12 }} />
      <Text style={{ color: AppColors.muted, fontSize: 16 }}>
        {t("workout.no_more_exercises")}
      </Text>
      <View style={{ height: 20 }} />
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onExit}
        style={{
          backgroundColor: AppColors.primary,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 100,
        }}
      >
        <Text style={{ color: AppColors.background, fontWeight: "700" }}>
          {t("workout.exit")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// --- exercise body ---------------------------------------------------------

function ExerciseBody({
  ex,
  index,
  metric,
  suggestion,
  allSetsFilled,
  estimating,
  t,
  onInfo,
  onChange,
  onProgression,
  onMore,
  onScheduleSave,
  onPlateCalc,
  onToggleDone,
  onRemoveSet,
  onAddSet,
  onEstimate,
  onYoutube,
}: {
  ex: Exercise;
  index: number;
  metric: Metric;
  suggestion: ProgressionSuggestion | undefined;
  allSetsFilled: boolean;
  estimating: boolean;
  t: Tfn;
  onInfo: () => void;
  onChange: () => void;
  onProgression: () => void;
  onMore: () => void;
  onScheduleSave: () => void;
  onPlateCalc: (kg: number) => void;
  onToggleDone: (s: WorkoutSet) => void;
  onRemoveSet: (s: WorkoutSet) => void;
  onAddSet: () => void;
  onEstimate: () => void;
  onYoutube: () => void;
}) {
  void index;
  const subtitle =
    ex.variant.length > 0
      ? ex.variant
      : ex.targetMuscles.length > 0
        ? titleCase(exLabels(ex.targetMuscles).join(", "))
        : t("workout.exercise_fallback");
  const [left, right] = columnLabels(metric, t);
  const hasKcal = ex.kcal != null;
  const estimateEnabled = allSetsFilled && !estimating;
  const estimateTint =
    estimateEnabled || hasKcal ? AppColors.onSurface : AppColors.muted;

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 }}>
      {/* Big exercise illustration */}
      <View
        style={{
          width: "100%",
          height: 200,
          backgroundColor: AppColors.surfaceLow,
          borderRadius: 24,
          overflow: "hidden",
        }}
      >
        <ExerciseImage url={ex.gifUrl} iconSize={56} fit="contain" />
      </View>
      <View style={{ height: 16 }} />

      {/* Name + category + "How to" */}
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={2}
            style={{
              fontSize: 24,
              fontWeight: "800",
              letterSpacing: -0.5,
              color: AppColors.onSurface,
            }}
          >
            {titleCase(ex.name)}
          </Text>
          <View style={{ height: 2 }} />
          <Text style={{ fontSize: 15, color: AppColors.muted }}>{subtitle}</Text>
          {ex.note != null && ex.note.length > 0 && (
            <>
              <View style={{ height: 4 }} />
              <Text
                style={{
                  fontSize: 13,
                  lineHeight: 16,
                  color: AppColors.accentAmber,
                }}
              >
                {ex.note}
              </Text>
            </>
          )}
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onInfo}
          style={{ paddingLeft: 12, paddingTop: 4 }}
        >
          <Text
            style={{
              color: AppColors.muted,
              fontSize: 14,
              fontWeight: "600",
              textDecorationLine: "underline",
              textDecorationColor: AppColors.muted,
            }}
          >
            {t("workout.how_to")}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 14 }} />

      {/* Action buttons */}
      <View style={{ flexDirection: "row" }}>
        <ActionButton icon="info-outline" onPress={onInfo} />
        <View style={{ width: 10 }} />
        <ActionButton icon="swap-horiz" onPress={onChange} />
        <View style={{ width: 10 }} />
        <ActionButton icon="trending-up" onPress={onProgression} />
        <View style={{ width: 10 }} />
        <ActionButton icon="more-horiz" onPress={onMore} />
      </View>
      <View style={{ height: 20 }} />

      {/* Faint next-set hint */}
      {suggestion != null && (
        <View style={{ paddingLeft: 4, paddingBottom: 12 }}>
          <Text style={{ color: "#3A3A3A", fontSize: 13, fontWeight: "500" }}>
            {`${t("workout.suggested")}: ${suggestion.label}`}
          </Text>
        </View>
      )}

      {/* Sets table header */}
      <View style={{ paddingHorizontal: 4, flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 28 }}>
          <Text
            style={{ color: AppColors.muted, fontSize: 12, fontWeight: "600" }}
          >
            #
          </Text>
        </View>
        <HeaderLabel text={left} />
        <View style={{ width: 12 }} />
        <HeaderLabel text={right} />
        <View style={{ width: 12 }} />
        <View style={{ width: 26 }} />
      </View>
      <View style={{ height: 8 }} />

      {/* Sets */}
      {ex.sets.map((s, i) => (
        <SetRow
          key={keyFor(s)}
          index={i}
          set={s}
          metric={metric}
          onChanged={onScheduleSave}
          onPlateCalc={() => onPlateCalc(s.kg)}
          onToggleDone={() => onToggleDone(s)}
          onRemove={ex.sets.length > 1 ? () => onRemoveSet(s) : null}
        />
      ))}
      <View style={{ height: 14 }} />

      {/* Remove / add set controls */}
      <View style={{ flexDirection: "row" }}>
        <WideButton
          icon="remove"
          onPress={
            ex.sets.length > 1 ? () => onRemoveSet(ex.sets[ex.sets.length - 1]) : null
          }
        />
        <View style={{ width: 12 }} />
        <WideButton icon="add" onPress={onAddSet} />
      </View>
      <View style={{ height: 20 }} />

      {/* AI calorie estimate */}
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={!estimateEnabled}
        onPress={onEstimate}
        style={{
          height: 50,
          borderRadius: 100,
          borderWidth: 1,
          borderColor: AppColors.outline,
          backgroundColor: hasKcal ? AppColors.surfaceHigh : AppColors.surfaceLow,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
        }}
      >
        {estimating ? (
          <ActivityIndicator size="small" color={AppColors.onSurface} />
        ) : (
          <>
            <MaterialIcons
              name="local-fire-department"
              color={estimateTint}
              size={20}
            />
            <View style={{ width: 8 }} />
            <Text style={{ color: estimateTint, fontSize: 15, fontWeight: "700" }}>
              {hasKcal
                ? t("workout.kcal_value", { n: Math.round(ex.kcal ?? 0) })
                : t("workout.estimate_kcal")}
            </Text>
          </>
        )}
      </TouchableOpacity>
      {!allSetsFilled && (
        <>
          <View style={{ height: 8 }} />
          <Text
            style={{ color: AppColors.muted, fontSize: 12, textAlign: "center" }}
          >
            {t("workout.kcal_fill_hint")}
          </Text>
        </>
      )}
      <View style={{ height: 20 }} />

      {/* Watch on YouTube */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onYoutube}
        style={{
          height: 50,
          borderRadius: 100,
          borderWidth: 1,
          borderColor: AppColors.outline,
          backgroundColor: AppColors.surfaceLow,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
        }}
      >
        <MaterialIcons
          name="play-circle-outline"
          color={AppColors.onSurface}
          size={20}
        />
        <View style={{ width: 8 }} />
        <Text
          style={{ color: AppColors.onSurface, fontSize: 15, fontWeight: "700" }}
        >
          {t("workout.watch_youtube")}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function HeaderLabel({ text }: { text: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ color: AppColors.muted, fontSize: 11, letterSpacing: 1.2 }}>
        {text}
      </Text>
    </View>
  );
}

// --- one set row -----------------------------------------------------------

function SetRow({
  index,
  set,
  metric,
  onChanged,
  onPlateCalc,
  onToggleDone,
  onRemove,
}: {
  index: number;
  set: WorkoutSet;
  metric: Metric;
  onChanged: () => void;
  onPlateCalc: () => void;
  onToggleDone: () => void;
  onRemove: (() => void) | null;
}) {
  const m = metric ?? "reps";
  const isStrength = m === "reps";

  const slots = isStrength
    ? strengthSlots()
    : stationSlots();

  function pill(opts: {
    initial: string;
    hint: string;
    decimal: boolean;
    onChangeText: (v: string) => void;
    onLongPress?: () => void;
  }) {
    const field = (
      <View
        style={{
          height: 46,
          borderRadius: 14,
          backgroundColor: AppColors.surfaceMid,
          justifyContent: "center",
        }}
      >
        <TextInput
          defaultValue={opts.initial}
          onChangeText={opts.onChangeText}
          placeholder={opts.hint}
          placeholderTextColor={AppColors.muted}
          textAlign="center"
          keyboardType={opts.decimal ? "decimal-pad" : "number-pad"}
          returnKeyType="done"
          contextMenuHidden={opts.onLongPress != null}
          cursorColor={AppColors.onSurface}
          style={{
            fontSize: 17,
            fontWeight: "700",
            color: AppColors.onSurface,
            paddingVertical: 0,
          }}
        />
      </View>
    );
    if (opts.onLongPress == null) return field;
    return (
      <Pressable onLongPress={opts.onLongPress} delayLongPress={400}>
        {field}
      </Pressable>
    );
  }

  function targetChip(text: string) {
    return (
      <View
        style={{
          height: 46,
          borderRadius: 14,
          backgroundColor: AppColors.surfaceLow,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{ fontSize: 16, fontWeight: "700", color: AppColors.muted }}
        >
          {text}
        </Text>
      </View>
    );
  }

  // [reps pill, gap, kg pill]
  function strengthSlots(): React.ReactNode {
    return (
      <>
        <View style={{ flex: 1 }}>
          {pill({
            initial: set.reps === 0 ? "" : `${set.reps}`,
            hint: "0",
            decimal: false,
            onChangeText: (v) => {
              set.reps = parseInt(v, 10) || 0;
              onChanged();
            },
          })}
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          {pill({
            initial: set.kg === 0 ? "" : formatKg(set.kg),
            hint: "BW",
            decimal: true,
            onLongPress: onPlateCalc,
            onChangeText: (v) => {
              set.kg = parseFloat(v.replace(",", ".")) || 0;
              onChanged();
            },
          })}
        </View>
      </>
    );
  }

  // [primary pill/chip, gap, target chip] — depends on the station metric.
  function stationSlots(): React.ReactNode {
    let leftNode: React.ReactNode;
    if (m === "time") {
      leftNode = targetChip(fmtClock(set.seconds));
    } else if (m === "reps_weight") {
      leftNode = pill({
        initial: set.reps === 0 ? "" : `${set.reps}`,
        hint: "0",
        decimal: false,
        onChangeText: (v) => {
          set.reps = parseInt(v, 10) || 0;
          onChanged();
        },
      });
    } else {
      // distance / distance_weight / pace → editable metres
      leftNode = pill({
        initial: set.distanceM == null || set.distanceM === 0 ? "" : formatKg(set.distanceM),
        hint: "0",
        decimal: true,
        onChangeText: (v) => {
          const parsed = parseFloat(v.replace(",", "."));
          set.distanceM = Number.isNaN(parsed) ? null : parsed;
          onChanged();
        },
      });
    }

    let rightNode: React.ReactNode;
    if (m === "distance_weight" || m === "reps_weight") {
      rightNode =
        set.targetKg != null ? targetChip(`${formatKg(set.targetKg)} kg`) : <View />;
    } else if (m === "pace") {
      rightNode = targetChip(fmtPace(set.seconds));
    } else {
      rightNode = <View />;
    }

    return (
      <>
        <View style={{ flex: 1 }}>{leftNode}</View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>{rightNode}</View>
      </>
    );
  }

  return (
    <Pressable onLongPress={onRemove ?? undefined} delayLongPress={400}>
      <View
        style={{
          paddingVertical: 5,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View style={{ width: 28 }}>
          <Text
            style={{ color: AppColors.muted, fontSize: 15, fontWeight: "600" }}
          >
            {index + 1}
          </Text>
        </View>
        {slots}
        <View style={{ width: 12 }} />
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onToggleDone}
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: set.done ? AppColors.accentAmber : "transparent",
            borderWidth: 2,
            borderColor: set.done ? AppColors.accentAmber : AppColors.surfaceHigh,
          }}
        />
      </View>
    </Pressable>
  );
}

// --- exercise illustration (fake-GIF: flips free-exercise-db 0/1 frames) ----

function ExerciseImage({
  url,
  fit = "cover",
  iconSize = 24,
  showLabel,
  compact = false,
}: {
  url: string;
  fit?: "cover" | "contain";
  iconSize?: number;
  showLabel?: boolean;
  compact?: boolean;
}) {
  const frames = useMemo(() => Array.from(new Set(framesFromUrl(url))), [url]);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIdx(0);
    setFailed(false);
  }, [url]);

  useEffect(() => {
    if (frames.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % frames.length), 500);
    return () => clearInterval(id);
  }, [frames]);

  const label = showLabel ?? iconSize >= 40;

  if (frames.length === 0 || failed) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <MaterialIcons name="fitness-center" color={AppColors.muted} size={iconSize} />
        {label && (
          <>
            <View style={{ height: compact ? 3 : 10 }} />
            <Text
              style={{
                color: AppColors.muted,
                fontSize: compact ? 8.5 : 13,
                fontWeight: "600",
                letterSpacing: compact ? 0 : 0.5,
                textAlign: "center",
              }}
            >
              Hamarosan
            </Text>
          </>
        )}
      </View>
    );
  }

  return (
    <Image
      source={{ uri: frames[idx % frames.length] }}
      style={{ width: "100%", height: "100%" }}
      contentFit={fit}
      transition={250}
      onError={() => setFailed(true)}
    />
  );
}
