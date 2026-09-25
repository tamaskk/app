// Ported 1:1 from apps/mobile/lib/screens/trainings_list_screen.dart.
//
// The "Edzések" tab: the whole page is one scroll surface — resume cards,
// recommended story strip, generated story strip / first-plan CTA, hidden-
// section restore chips, and the manual saved-trainings list (with loading /
// error / empty states). Start / continue / edit / delete are all wired.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { Screen } from "../components/ui";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";
import { useAuth } from "../context/AuthContext";
import { Api, ApiException } from "../lib/api";
import { WorkoutProgress, WorkoutProgressStore } from "../lib/workoutProgress";
import { SavedTraining, WorkoutSession } from "../models/apiModels";
import { Workout, Exercise, WorkoutSet } from "../models/workout";
import { predefinedWorkouts, PredefinedWorkout } from "../data/predefinedWorkouts";
import { titleCase } from "../utils/text";
import { relativeDayLabel } from "../utils/recentPr";
import { WorkoutStories } from "../components/WorkoutStories";
import { GeneratedStories } from "../components/GeneratedStories";
import { TrainingActions } from "../components/TrainingActions";
import { Skeleton, Shimmer } from "../components/Skeleton";
import type { TabScreenProps } from "../navigation/types";

// SharedPreferences keys for the per-user section hide toggles.
const kHideRecommended = "hide_recommended_trainings";
const kHideGenerated = "hide_generated_trainings";

const api = new Api();

export function TrainingsListScreen({ navigation, onNavigateTab }: TabScreenProps) {
  // The generate endpoint requires a signed-in session; in the tab context the
  // user is always authenticated, so `auth` (and the generated section) is
  // always available — mirrors `widget.auth != null` in the Dart original.
  const { auth } = useAuth();
  void auth;
  void onNavigateTab;
  const { t } = useLang();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trainings, setTrainings] = useState<SavedTraining[]>([]);
  // Resumable trainings that are hidden from this list (HYROX plans live in
  // their own tab) but still need a "continue" card. Fetched on demand.
  const [resumableExtra, setResumableExtra] = useState<SavedTraining[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  // In-progress workouts the user backed out of, keyed by training id.
  const [inProgress, setInProgress] = useState<Record<string, WorkoutProgress>>({});
  const [hideRecommended, setHideRecommended] = useState(false);
  const [hideGenerated, setHideGenerated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // The training whose long-press action sheet (edit / delete) is open.
  const [actionsFor, setActionsFor] = useState<SavedTraining | null>(null);

  const loadHideFlags = useCallback(async () => {
    try {
      const rec = await AsyncStorage.getItem(kHideRecommended);
      const gen = await AsyncStorage.getItem(kHideGenerated);
      setHideRecommended(rec === "true");
      setHideGenerated(gen === "true");
    } catch {
      // ignore
    }
  }, []);

  const setHide = useCallback(
    async (key: string, value: boolean, isRec: boolean) => {
      try {
        await AsyncStorage.setItem(key, String(value));
      } catch {
        // ignore
      }
      if (isRec) {
        setHideRecommended(value);
      } else {
        setHideGenerated(value);
      }
    },
    [],
  );

  // Fetch trainings for in-progress workouts that aren't in [visible] (HYROX
  // plans are excluded from the main list). Only hits the network when there's
  // an unmatched in-progress workout, and returns just the matching ones.
  const fetchResumableExtra = useCallback(
    async (
      visible: SavedTraining[],
      ip: Record<string, WorkoutProgress>,
    ): Promise<SavedTraining[]> => {
      const knownIds = new Set(visible.map((tr) => tr.id));
      const wanted = new Set(
        Object.entries(ip)
          .filter(([id, p]) => p.hasProgress && !knownIds.has(id))
          .map(([id]) => id),
      );
      if (wanted.size === 0) return [];
      try {
        const hyrox = await api.getTrainings("hyrox");
        return hyrox.filter((tr) => wanted.has(tr.id));
      } catch {
        return [];
      }
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tr = await api.getTrainings();
      let ss: WorkoutSession[] = [];
      try {
        ss = await api.getSessions();
      } catch {
        // ignore
      }
      // In-progress workouts to surface as "continue" cards.
      let ip: Record<string, WorkoutProgress> = {};
      try {
        ip = await WorkoutProgressStore.all();
      } catch {
        // ignore
      }
      // Any in-progress workout whose training isn't in this (hyrox-excluded)
      // list — e.g. a started HYROX workout — still needs a continue card.
      const extra = await fetchResumableExtra(tr, ip);
      setTrainings(tr);
      setResumableExtra(extra);
      setSessions(ss);
      setInProgress(ip);
    } catch (e) {
      if (e instanceof ApiException) {
        setError(e.message);
      } else {
        setError("Could not reach the server. Is it running?");
      }
    } finally {
      setLoading(false);
    }
  }, [fetchResumableExtra]);

  // initState: load hide flags + first fetch.
  useEffect(() => {
    void loadHideFlags();
    void load();
  }, [loadHideFlags, load]);

  // Reload whenever the screen regains focus after a pushed route returns
  // (create / generate / predefined / start / edit / delete) — the RN analogue
  // of the Dart `await Navigator.push(...); _load()` pattern. Skip the very
  // first focus so it doesn't double-fire with the initial load above.
  const firstFocus = useRef(true);
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void load();
    });
    return unsub;
  }, [navigation, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // --- navigation -----------------------------------------------------------

  const toWorkout = useCallback((tr: SavedTraining, index: number): Workout => {
    return new Workout(
      tr.name,
      // Resumable HYROX trainings aren't in [trainings] (index -1) — clamp.
      (index < 0 ? 0 : index) + 1,
      0,
      tr.exercises.map(
        (e) =>
          new Exercise(
            e.name,
            e.category ?? "",
            e.sets.map(
              (s) => new WorkoutSet(s.kg, s.reps, s.done, s.distanceM, s.seconds, s.targetKg),
            ),
            e.exerciseId,
            e.gifUrl,
            e.targetMuscles,
            e.progressionStrategy,
            e.metric,
            e.stationKey,
            e.note,
          ),
      ),
      tr.id,
    );
  }, []);

  const openTraining = useCallback(
    (tr: SavedTraining, index: number) => {
      navigation.navigate("Workout", { workout: toWorkout(tr, index) });
    },
    [navigation, toWorkout],
  );

  const openCreate = useCallback(() => {
    navigation.navigate("CreateTraining");
  }, [navigation]);

  const openGenerator = useCallback(() => {
    navigation.navigate("TrainingGenerator");
  }, [navigation]);

  const openPredefined = useCallback(
    (w: PredefinedWorkout) => {
      navigation.navigate("PredefinedWorkout", { key: w.title });
    },
    [navigation],
  );

  const discardProgress = useCallback(async (tr: SavedTraining) => {
    await WorkoutProgressStore.clear(tr.id);
    setInProgress((prev) => {
      const next = { ...prev };
      delete next[tr.id];
      return next;
    });
  }, []);

  // --- derived buckets ------------------------------------------------------

  // Saved trainings that have a continuable in-progress workout, newest first.
  // Includes hidden (HYROX) trainings resolved via [resumableExtra].
  const resumableTrainings = (() => {
    const out = [...trainings, ...resumableExtra].filter(
      (tr) => inProgress[tr.id]?.hasProgress ?? false,
    );
    out.sort(
      (a, b) =>
        (inProgress[b.id]?.updatedAt.getTime() ?? 0) -
        (inProgress[a.id]?.updatedAt.getTime() ?? 0),
    );
    return out;
  })();

  const generatedTrainings = trainings.filter((tr) => tr.isGenerated);
  const manualTrainings = trainings.filter((tr) => !tr.isGenerated);

  // Most recent time this training was completed. Combines the server-stamped
  // `doneAt` (set on finish) with the session log, matching sessions by
  // trainingId first and falling back to a name match for older sessions that
  // predate trainingId being logged.
  const lastPerformedFor = useCallback(
    (tr: SavedTraining): Date | null => {
      let best: Date | null = tr.doneAt;
      const wantName = tr.name.trim().toLowerCase();
      for (const s of sessions) {
        const byId = s.trainingId != null && s.trainingId === tr.id;
        const byName =
          s.trainingId == null && wantName.length > 0 && s.name.trim().toLowerCase() === wantName;
        if (!byId && !byName) continue;
        const when = s.finishedAt ?? s.startedAt;
        if (when == null) continue;
        if (best == null || when.getTime() > best.getTime()) best = when;
      }
      return best;
    },
    [sessions],
  );

  const plannedVolume = (tr: SavedTraining): number => {
    let total = 0;
    for (const e of tr.exercises) {
      for (const s of e.sets) {
        total += s.kg * s.reps;
      }
    }
    return total;
  };

  const fmtVolume = (kg: number): string => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(1).replace(".", ",")} t`;
    }
    return `${Math.round(kg)} kg`;
  };

  const hasGenerated = generatedTrainings.length > 0;

  // --- section renderers ----------------------------------------------------

  const titleHeader = () => {
    const manual = manualTrainings.length;
    const gen = generatedTrainings.length;
    return (
      <View style={{ paddingLeft: 20, paddingRight: 20, paddingBottom: 12 }}>
        <Text
          style={{
            fontSize: 32,
            fontWeight: "800",
            letterSpacing: -1,
            color: AppColors.onSurface,
          }}
        >
          {t("workouts.title")}
        </Text>
        <View style={{ height: 4 }} />
        <Text
          style={{
            fontSize: 12,
            letterSpacing: 1.2,
            color: AppColors.muted,
            fontWeight: "700",
          }}
        >
          {trainings.length === 0
            ? t("trainings.counts_recommended_only", { n: predefinedWorkouts().length })
            : t("trainings.counts_full", {
                manual,
                gen,
                rec: predefinedWorkouts().length,
              })}
        </Text>
      </View>
    );
  };

  const continueCard = (tr: SavedTraining) => {
    const progress = inProgress[tr.id];
    const done = progress?.doneCount ?? 0;
    const total = tr.totalSets;
    const name = titleCase(tr.name.length === 0 ? t("dashboard.workout_default") : tr.name);
    return (
      <View key={tr.id} style={{ paddingLeft: 20, paddingRight: 20, paddingBottom: 10 }}>
        <TouchableOpacity activeOpacity={0.85} onPress={() => openTraining(tr, trainings.indexOf(tr))}>
          <View
            style={{
              paddingLeft: 18,
              paddingTop: 16,
              paddingRight: 14,
              paddingBottom: 16,
              backgroundColor: AppColors.surfaceLow,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: AppColors.accentAmber,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <MaterialIcons name="play-circle-filled" size={40} color={AppColors.accentAmber} />
            <View style={{ width: 14 }} />
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 19,
                  fontWeight: "800",
                  letterSpacing: -0.5,
                  color: AppColors.onSurface,
                }}
              >
                {name}
              </Text>
              <View style={{ height: 3 }} />
              <Text style={{ fontSize: 13, color: AppColors.muted, fontWeight: "600" }}>
                {t("trainingslist.paused", { done, total })}
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={() => discardProgress(tr)}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: AppColors.surfaceMid,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="close" size={16} color={AppColors.muted} />
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // "Continue workout" cards for any unfinished, partially-completed workouts.
  const continueSection = () => (
    <View>
      <View style={{ paddingLeft: 20, paddingTop: 4, paddingRight: 20, paddingBottom: 12 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "800",
            letterSpacing: 1.5,
            color: AppColors.accentAmber,
          }}
        >
          {t("trainingslist.section_continue")}
        </Text>
      </View>
      {resumableTrainings.map((tr) => continueCard(tr))}
      <View style={{ height: 18 }} />
    </View>
  );

  const firstPlanCta = () => (
    <View style={{ paddingHorizontal: 20 }}>
      <TouchableOpacity activeOpacity={0.85} onPress={openGenerator}>
        <View
          style={{
            paddingLeft: 20,
            paddingTop: 18,
            paddingRight: 18,
            paddingBottom: 18,
            backgroundColor: AppColors.onSurface,
            borderRadius: 20,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 10,
                letterSpacing: 1.6,
                fontWeight: "800",
                color: "#4A4A4A",
              }}
            >
              {t("workouts.generated_for_you")}
            </Text>
            <View style={{ height: 8 }} />
            <Text
              style={{
                fontSize: 24,
                fontWeight: "800",
                letterSpacing: -0.5,
                lineHeight: 24 * 1.1,
                color: AppColors.background,
              }}
            >
              {t("trainings.make_a_plan_title")}
            </Text>
            <View style={{ height: 8 }} />
            <Text style={{ fontSize: 12, color: "#4A4A4A", lineHeight: 12 * 1.45 }}>
              {t("trainings.make_a_plan_body")}
            </Text>
          </View>
          <View style={{ width: 12 }} />
          <View
            style={{
              width: 44,
              height: 44,
              backgroundColor: AppColors.background,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="arrow-forward" size={22} color={AppColors.onSurface} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const restoreChips = () => (
    <View
      style={{
        paddingLeft: 20,
        paddingTop: 4,
        paddingRight: 20,
        paddingBottom: 4,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      {hideRecommended && (
        <RestoreChip
          label={t("trainings.tab_recommended")}
          onPress={() => setHide(kHideRecommended, false, true)}
        />
      )}
      {hideGenerated && (
        <RestoreChip
          label={t("trainings.tab_generated")}
          onPress={() => setHide(kHideGenerated, false, false)}
        />
      )}
    </View>
  );

  const messageState = (opts: {
    icon: keyof typeof MaterialIcons.glyphMap;
    title: string;
    subtitle?: string;
    actionLabel: string;
    onAction: () => void;
  }) => (
    <View style={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 32 }}>
      <View style={{ alignItems: "center" }}>
        <MaterialIcons name={opts.icon} size={48} color={AppColors.muted} />
        <View style={{ height: 16 }} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: AppColors.onSurface,
            textAlign: "center",
          }}
        >
          {opts.title}
        </Text>
        {opts.subtitle != null && (
          <>
            <View style={{ height: 8 }} />
            <Text style={{ color: AppColors.muted, textAlign: "center" }}>{opts.subtitle}</Text>
          </>
        )}
        <View style={{ height: 24 }} />
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={opts.onAction}
          style={{
            backgroundColor: AppColors.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 100,
          }}
        >
          <Text style={{ color: AppColors.background, fontWeight: "700" }}>{opts.actionLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Saved trainings (manual). Empty / loading / error states live in the same
  // scroll region so the whole page scrolls predictably.
  const savedTrainingsSection = () => {
    if (loading && trainings.length === 0) {
      return (
        <View style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 8 }}>
          <Shimmer>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={96} radius={24} margin={{ bottom: 12 }} />
            ))}
          </Shimmer>
        </View>
      );
    }
    if (error != null && trainings.length === 0) {
      return messageState({
        icon: "cloud-off",
        title: error,
        actionLabel: t("common.retry"),
        onAction: load,
      });
    }
    const manual = manualTrainings;
    if (manual.length === 0) {
      return messageState({
        icon: "fitness-center",
        title: t("trainings.empty_my_title"),
        subtitle: t("trainings.empty_my_subtitle"),
        actionLabel: t("workouts.new"),
        onAction: openCreate,
      });
    }
    return (
      <View>
        <View style={{ paddingLeft: 20, paddingTop: 4, paddingRight: 20, paddingBottom: 6 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "800",
              letterSpacing: 1.5,
              color: AppColors.onSurface,
            }}
          >
            {t("trainings.my_section")}
          </Text>
        </View>
        <View style={{ paddingLeft: 20, paddingTop: 8, paddingRight: 20, paddingBottom: 8 }}>
          {manual.map((tr, i) => {
            const lastPerformed = lastPerformedFor(tr);
            const volume = plannedVolume(tr);
            return (
              <View key={tr.id} style={{ marginBottom: 12 }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => openTraining(tr, i)}
                  onLongPress={() => setActionsFor(tr)}
                >
                  <View
                    style={{
                      padding: 20,
                      backgroundColor: AppColors.surfaceLow,
                      borderRadius: 24,
                      flexDirection: "row",
                      alignItems: "flex-start",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: "800",
                          letterSpacing: -0.5,
                          color: AppColors.onSurface,
                        }}
                      >
                        {titleCase(tr.name.length === 0 ? t("dashboard.workout_default") : tr.name)}
                      </Text>
                      <View style={{ height: 4 }} />
                      <Text style={{ fontSize: 14, color: AppColors.muted }}>
                        {`${tr.exercises.length} gyakorlat · ${tr.totalSets} set`}
                      </Text>
                      <View style={{ height: 6 }} />
                      <MetaRow
                        lastPerformed={lastPerformed}
                        volume={volume}
                        volumeLabel={fmtVolume(volume)}
                        t={t}
                      />
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <MaterialIcons name="more-horiz" size={18} color={AppColors.muted} />
                      <View style={{ height: 2 }} />
                      <Text
                        style={{
                          fontSize: 40,
                          fontWeight: "800",
                          color: AppColors.surfaceHigh,
                          lineHeight: 40,
                        }}
                      >
                        {(i + 1).toString().padStart(2, "0")}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Screen edges={["top", "left", "right"]}>
      {/* AppBar: leading generate (auto_awesome), title HEFTOR, trailing add. */}
      <View
        style={{
          height: 56,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 12,
        }}
      >
        <TouchableOpacity
          onPress={openGenerator}
          activeOpacity={0.7}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <MaterialIcons name="auto-awesome" size={24} color={AppColors.onSurface} />
        </TouchableOpacity>
        <Text
          style={{ fontSize: 20, fontWeight: "700", color: AppColors.onSurface, letterSpacing: 1 }}
        >
          HEFTOR
        </Text>
        <TouchableOpacity
          onPress={openCreate}
          activeOpacity={0.7}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <MaterialIcons name="add" size={24} color={AppColors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.onSurface} />
        }
      >
        <View style={{ paddingBottom: 8 }}>{titleHeader()}</View>

        {/* Resume an unfinished workout — first thing the user sees. */}
        {resumableTrainings.length > 0 && continueSection()}

        {/* Recommended row — hide toggle in the section header. */}
        {!hideRecommended && (
          <>
            <SectionHeader
              label={t("workouts.recommended")}
              onClose={() => setHide(kHideRecommended, true, true)}
            />
            <WorkoutStories onTap={openPredefined} />
            <View style={{ height: 18 }} />
          </>
        )}

        {/* Generated section — big CTA when nothing yet, story row when there is. */}
        {!hideGenerated && (
          <>
            <SectionHeader
              label={hasGenerated ? t("workouts.generated_for_you") : t("trainings.your_first_plan")}
              leading={hasGenerated ? <PlusButton onPress={openGenerator} /> : undefined}
              onClose={() => setHide(kHideGenerated, true, false)}
            />
            {hasGenerated ? (
              <GeneratedStories
                trainings={generatedTrainings}
                onTap={openTraining}
                onLongPress={(tr: SavedTraining) => setActionsFor(tr)}
              />
            ) : (
              firstPlanCta()
            )}
            <View style={{ height: 18 }} />
          </>
        )}

        {/* Hidden-section restore chips — bring sections back inline. */}
        {(hideRecommended || hideGenerated) && (
          <>
            {restoreChips()}
            <View style={{ height: 8 }} />
          </>
        )}

        {savedTrainingsSection()}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Long-press action sheet (edit / delete) for a training. */}
      {actionsFor != null && (
        <TrainingActions
          visible
          training={actionsFor}
          onClose={() => setActionsFor(null)}
          onChanged={load}
        />
      )}
    </Screen>
  );
}

// --- private widgets --------------------------------------------------------

/** Section header with optional leading button and a close (×) icon. Used by
 * both AJÁNLOTT EDZÉSEK and NEKED GENERÁLT. */
function SectionHeader({
  label,
  leading,
  onClose,
}: {
  label: string;
  leading?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <View
      style={{
        paddingLeft: 20,
        paddingTop: 4,
        paddingRight: 20,
        paddingBottom: 12,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      {leading != null && (
        <>
          {leading}
          <View style={{ width: 10 }} />
        </>
      )}
      <Text
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: "800",
          letterSpacing: 1.5,
          color: AppColors.onSurface,
        }}
      >
        {label}
      </Text>
      <TouchableOpacity activeOpacity={0.7} onPress={onClose}>
        <View
          style={{
            width: 32,
            height: 32,
            backgroundColor: AppColors.surfaceLow,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="close" size={16} color={AppColors.muted} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

function PlusButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View
        style={{
          width: 32,
          height: 32,
          backgroundColor: AppColors.onSurface,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name="add" size={18} color={AppColors.background} />
      </View>
    </TouchableOpacity>
  );
}

function RestoreChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: AppColors.surfaceHigh,
          borderRadius: 100,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <MaterialIcons name="add" size={14} color={AppColors.muted} />
        <View style={{ width: 6 }} />
        <Text
          style={{
            fontSize: 11,
            letterSpacing: 1.2,
            fontWeight: "800",
            color: AppColors.muted,
          }}
        >
          {`MUTASD · ${label}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function MetaRow({
  lastPerformed,
  volume,
  volumeLabel,
  t,
}: {
  lastPerformed: Date | null;
  volume: number;
  volumeLabel: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const parts: string[] = [];
  if (lastPerformed != null) {
    parts.push(t("trainings.last_done", { when: relativeDayLabel(lastPerformed) }));
  } else {
    parts.push(t("trainings.new_badge"));
  }
  if (volume > 0) parts.push(volumeLabel.toUpperCase());
  return (
    <Text
      style={{
        fontSize: 11,
        letterSpacing: 1.2,
        fontWeight: "700",
        color: AppColors.muted,
      }}
    >
      {parts.join(" · ")}
    </Text>
  );
}
