// Ported 1:1 from apps/mobile/lib/screens/dashboard_screen.dart.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  PanResponder,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Screen } from "../components/ui";
import { AppColors, AppText } from "../theme";
import { useLang } from "../hooks/useLang";
import { useAuth } from "../context/AuthContext";
import { Api } from "../lib/api";
import { WorkoutSession, SavedTraining, StagnationItem } from "../models/apiModels";
import { Workout, Exercise, WorkoutSet } from "../models/workout";
import { rankForTier } from "../models/rank";
import { WorkoutProgress, WorkoutProgressStore } from "../lib/workoutProgress";
import { weeklyStreak } from "../utils/streak";
import { findRecentPr, relativeDayLabel } from "../utils/recentPr";
import { titleCase } from "../utils/text";
import { WeekPreview } from "../components/WeekPreview";
import { Skeleton, Shimmer } from "../components/Skeleton";
import { TrainingActions } from "../components/TrainingActions";
import type { TabScreenProps } from "../navigation/types";

const DAYS_BEFORE = 14;
const DAYS_AFTER = 14;
const TOTAL_DAYS = DAYS_BEFORE + DAYS_AFTER + 1;
const RECENT_LIMIT = 5;
// Fallback when a user predates the onboarding daysPerWeek capture.
const WEEKLY_GOAL_FALLBACK = 3;

const api = new Api();

// --- pure helpers ----------------------------------------------------------

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function fmtCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(".", ",")}K` : `${Math.round(n)}`;
}

function fmtVolume(kg: number): string {
  return kg >= 1000 ? (kg / 1000).toFixed(1).replace(".", ",") : `${Math.round(kg)}`;
}

function volumeUnit(kg: number): string {
  return kg >= 1000 ? "t" : "kg";
}

function fmtTime(minutes: number): string {
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h` : `${minutes}p`;
}

function dayKey(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function splitName(split: string): string {
  switch (split) {
    case "upper_lower":
      return "Upper / Lower";
    case "push_pull_legs":
      return "Push / Pull / Legs";
    case "bro":
      return "Bro split";
    case "full_body":
      return "Full Body";
    default:
      return split;
  }
}

// The Workout route's params are owned by the (concurrently ported) WorkoutScreen;
// cast keeps this file self-consistent while that contract settles.
type WorkoutParams = { workout?: Workout; resumeElapsedMs?: number; resumeSessionId?: string };

export function DashboardScreen({
  navigation,
  onNavigateTab,
  onLogout: _onLogout,
}: TabScreenProps & { onLogout: () => void }) {
  const { t } = useLang();
  const { user } = useAuth();
  const { height: screenHeight } = useWindowDimensions();

  // The 29-day window is fixed at mount, centered on today.
  const days = useMemo<Date[]>(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    start.setDate(start.getDate() - DAYS_BEFORE);
    return Array.from({ length: TOTAL_DAYS }, (_u, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, []);
  const [selectedIndex, setSelectedIndex] = useState(DAYS_BEFORE); // today

  // Live data.
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [trainings, setTrainings] = useState<SavedTraining[]>([]);
  const [resumableExtra, setResumableExtra] = useState<SavedTraining[]>([]);
  const [stagnating, setStagnating] = useState<StagnationItem[]>([]);
  const [inProgress, setInProgress] = useState<Record<string, WorkoutProgress>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stagnationOpen, setStagnationOpen] = useState(false);
  const [actionsFor, setActionsFor] = useState<SavedTraining | null>(null);

  const stripRef = useRef<ScrollView>(null);
  const [stripWidth, setStripWidth] = useState(0);

  const navigate = navigation.navigate as unknown as (name: string, params?: object) => void;
  const openWorkout = useCallback(
    (params: WorkoutParams) => navigate("Workout", params),
    [navigate],
  );

  // Short labels keyed off i18n — resolved at render so they flip with locale.
  const weekDayLabels = (): string[] => [
    t("plan.day_short_h"),
    t("plan.day_short_k"),
    t("plan.day_short_sze"),
    t("plan.day_short_cs"),
    t("plan.day_short_p"),
    t("plan.day_short_szo"),
    t("plan.day_short_v"),
  ];
  const monthLabel = (month1Based: number): string => t(`month.${month1Based}`);

  // --- data load -----------------------------------------------------------

  const fetchResumableExtra = useCallback(
    async (visible: SavedTraining[], progress: Record<string, WorkoutProgress>): Promise<SavedTraining[]> => {
      const knownIds = new Set(visible.map((tr) => tr.id));
      const wanted = new Set(
        Object.entries(progress)
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
    let s: WorkoutSession[] = [];
    let tr: SavedTraining[] = [];
    try {
      s = await api.getSessions();
    } catch {
      // ignore
    }
    try {
      tr = await api.getTrainings();
    } catch {
      // ignore
    }
    const stag = await api.getStagnation(); // best-effort, never throws
    let progress: Record<string, WorkoutProgress> = {};
    try {
      progress = await WorkoutProgressStore.all();
    } catch {
      // ignore
    }
    const extra = await fetchResumableExtra(tr, progress);
    setSessions(s);
    setTrainings(tr);
    setResumableExtra(extra);
    setStagnating(stag);
    setInProgress(progress);
    setLoading(false);
  }, [fetchResumableExtra]);

  // Reloads on first focus and every time we return from a pushed screen
  // (a logged session, a created training, …), mirroring the Dart `_loadData`
  // calls after each `Navigator.push`.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // --- day strip centering + swipe -----------------------------------------

  useEffect(() => {
    if (stripWidth <= 0 || !stripRef.current) return;
    const itemWidth = stripWidth / 7;
    const target = selectedIndex * itemWidth - (stripWidth - itemWidth) / 2;
    const maxScroll = Math.max(0, TOTAL_DAYS * itemWidth - stripWidth);
    const x = Math.max(0, Math.min(target, maxScroll));
    stripRef.current.scrollTo({ x, animated: true });
  }, [selectedIndex, stripWidth]);

  const dayPan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > Math.abs(g.dy) * 1.5 && Math.abs(g.dx) > 12,
        onPanResponderRelease: (_e, g) => {
          if (g.dx < -40) setSelectedIndex((i) => (i + 1 < TOTAL_DAYS ? i + 1 : i));
          else if (g.dx > 40) setSelectedIndex((i) => (i - 1 >= 0 ? i - 1 : i));
        },
      }),
    [],
  );

  // --- derived data --------------------------------------------------------

  const dates = useMemo(
    () => sessions.map((s) => s.finishedAt ?? s.startedAt).filter((d): d is Date => d != null),
    [sessions],
  );
  const streak = useMemo(() => weeklyStreak(dates), [dates]);
  const workoutDays = useMemo(() => new Set(dates.map(dayKey)), [dates]);

  const weeklyDone = useMemo(() => {
    const monday = mondayOf(new Date());
    const next = new Date(monday.getTime() + 7 * 86400000);
    return sessions.filter((s) => {
      const d = s.finishedAt ?? s.startedAt;
      return d != null && d >= monday && d < next;
    }).length;
  }, [sessions]);

  const weeklyGoal = user?.onboarding?.daysPerWeek ?? WEEKLY_GOAL_FALLBACK;

  const sessionsOn = (day: Date): WorkoutSession[] =>
    sessions.filter((s) => {
      const d = s.finishedAt ?? s.startedAt;
      return d != null && isSameDay(d, day);
    });

  const toWorkout = (tr: SavedTraining, index: number): Workout =>
    new Workout(
      tr.name,
      (index < 0 ? 0 : index) + 1,
      0,
      tr.exercises.map(
        (e) =>
          new Exercise(
            e.name,
            e.category ?? "",
            e.sets.map((s) => new WorkoutSet(s.kg, s.reps, s.done, s.distanceM, s.seconds, s.targetKg)),
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

  const startTraining = (tr: SavedTraining, index: number) => {
    openWorkout({ workout: toWorkout(tr, index) });
  };

  const resumeFromSession = (s: WorkoutSession) => {
    let match: SavedTraining | undefined;
    for (const tr of trainings) {
      if (tr.name.trim().toLowerCase() === s.name.trim().toLowerCase()) {
        match = tr;
        break;
      }
    }
    const workout = new Workout(
      s.name,
      0,
      0,
      s.exercises.map(
        (e) =>
          new Exercise(
            e.name,
            e.category ?? "",
            e.sets.map((x) => new WorkoutSet(x.kg, x.reps, x.done)),
            e.exerciseId,
            e.gifUrl,
            e.targetMuscles,
            e.progressionStrategy,
          ),
      ),
      match?.id ?? null,
    );
    openWorkout({
      workout,
      resumeElapsedMs: s.durationMs ?? undefined,
      resumeSessionId: s.id,
    });
  };

  const startedTrainings = (): { training: SavedTraining; progress: WorkoutProgress; index: number }[] => {
    const out: { training: SavedTraining; progress: WorkoutProgress; index: number }[] = [];
    const all = [...trainings, ...resumableExtra];
    for (let i = 0; i < all.length; i++) {
      const p = inProgress[all[i].id];
      if (p != null && p.hasProgress) out.push({ training: all[i], progress: p, index: i });
    }
    out.sort((a, b) => b.progress.updatedAt.getTime() - a.progress.updatedAt.getTime());
    return out;
  };

  const recentSessions = (): WorkoutSession[] => {
    const sorted = [...sessions];
    sorted.sort((a, b) => {
      const da = a.finishedAt ?? a.startedAt;
      const db = b.finishedAt ?? b.startedAt;
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return db.getTime() - da.getTime();
    });
    return sorted;
  };

  // The list under the hero: continuable workouts pinned on top, then recent
  // completed sessions, capped at RECENT_LIMIT total.
  const recentList = (): React.ReactNode[] => {
    const cards: React.ReactNode[] = [];
    for (const s of startedTrainings().slice(0, RECENT_LIMIT)) {
      const tr = s.training;
      cards.push(
        <ListCard
          key={`p-${tr.id}`}
          title={titleCase(tr.name.length === 0 ? t("dashboard.workout_default") : tr.name)}
          subtitle={t("trainingslist.paused", { done: s.progress.doneCount, total: tr.totalSets })}
          bigNumber={tr.exercises.length}
          inProgress
          onPress={() => startTraining(tr, s.index)}
          onLongPress={() => setActionsFor(tr)}
        />,
      );
    }
    const remaining = RECENT_LIMIT - cards.length;
    if (remaining > 0) {
      for (const s of recentSessions().slice(0, remaining)) {
        // "Finished" = every set was ticked off in the logged session.
        const finished = s.totalSets > 0 && s.doneSets >= s.totalSets;
        cards.push(
          <ListCard
            key={`s-${s.id}`}
            title={titleCase(s.name.length === 0 ? t("dashboard.workout_default") : s.name)}
            subtitle={`${s.doneSets}/${s.totalSets} set`}
            bigNumber={s.exercises.length}
            finished={finished}
            onPress={() => resumeFromSession(s)}
          />,
        );
      }
    }
    return cards;
  };

  // --- personal headline / stats -------------------------------------------

  const currentMonthVolume = (): number => {
    const now = new Date();
    return sessions
      .filter((s) => {
        const d = s.finishedAt ?? s.startedAt;
        return d != null && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets.reduce((c, x) => c + x.kg * x.reps, 0), 0), 0);
  };

  const personalHeadline = (): string | null => {
    const monthVolume = currentMonthVolume();
    if (monthVolume >= 100) {
      const isT = volumeUnit(monthVolume) === "t";
      return t(isT ? "dashboard.month_total_t" : "dashboard.month_total_kg", { kg: fmtVolume(monthVolume) });
    }
    const onboarding = user?.onboarding;
    if (onboarding?.split != null && onboarding?.daysPerWeek != null) {
      return t("dashboard.split_per_week", {
        split: splitName(onboarding.split),
        days: onboarding.daysPerWeek,
      });
    }
    return null;
  };

  // --- render helpers ------------------------------------------------------

  const selectedDay = days[selectedIndex];
  const isToday = isSameDay(selectedDay, new Date());
  const dateLabel = isToday
    ? t("dashboard.today_short")
    : `${monthLabel(selectedDay.getMonth() + 1)} ${selectedDay.getDate()}`;

  const weeklyLabel = t("dashboard.weekly_done", { done: weeklyDone, goal: weeklyGoal });
  const progress = clamp01(weeklyGoal > 0 ? weeklyDone / weeklyGoal : 0);

  function dayContent(): React.ReactNode {
    const daySessions = sessionsOn(selectedDay);

    // Completed: what you actually did that day.
    if (daySessions.length > 0) {
      const first = daySessions[0];
      const durLabel =
        first.durationMs != null ? ` • ${fmtTime(Math.floor(first.durationMs / 60000)).toUpperCase()}` : "";
      return (
        <View>
          <HeroCard
            label={`${dateLabel}${durLabel} • ${t("dashboard.done_short")}`}
            title={titleCase(first.name.length === 0 ? t("dashboard.workout_default") : first.name)}
            bigNumber={first.exercises.length}
            progress={progress}
            progressLabel={weeklyLabel}
          />
          <View style={{ height: 8 }} />
          {daySessions.slice(1).map((s) => (
            <ListCard
              key={s.id}
              title={titleCase(s.name.length === 0 ? t("dashboard.workout_default") : s.name)}
              subtitle={`${s.doneSets}/${s.totalSets} set`}
              bigNumber={s.exercises.length}
            />
          ))}
        </View>
      );
    }

    // Today/future with no session yet: week-goal progress + continue/recent list.
    const todayDate = new Date();
    const isPast =
      new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate()).getTime() <
      new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()).getTime();
    if (!isPast && trainings.length > 0) {
      const recent = recentList();
      return (
        <View>
          <WeeklyProgressBar progress={progress} label={weeklyLabel} />
          {recent.length > 0 ? (
            <View>
              <View style={{ height: 16 }} />
              {recent}
            </View>
          ) : null}
        </View>
      );
    }

    // Nothing for this day.
    return (
      <EmptyDayCard
        title={isPast ? t("dashboard.rest_day") : t("dashboard.no_workout_today_short")}
        subtitle={isPast ? t("dashboard.no_workout_that_day") : t("dashboard.create_with_plus")}
      />
    );
  }

  // Stats (overall).
  const totalSets = sessions.reduce((a, s) => a + s.totalSets, 0);
  const totalVolume = sessions.reduce(
    (a, s) => a + s.exercises.reduce((b, e) => b + e.sets.reduce((c, x) => c + x.kg * x.reps, 0), 0),
    0,
  );
  const totalMinutes = sessions.reduce((a, s) => a + (s.durationMs != null ? Math.floor(s.durationMs / 60000) : 0), 0);

  // Plan section visibility.
  const onboarding = user?.onboarding;
  const planSplit = onboarding?.split ?? null;
  const planDays = onboarding?.daysPerWeek ?? null;
  const customPlan = user?.weeklyPlan ?? null;
  const showPlan = !(customPlan == null && (planSplit == null || planDays == null));
  const todayIdx = ((new Date().getDay() + 6) % 7); // Mon=0..Sun=6

  const headline = personalHeadline();
  const rank = rankForTier(user?.rank ?? 1);
  const pr = findRecentPr(sessions);
  const itemWidth = stripWidth > 0 ? stripWidth / 7 : 0;

  return (
    <Screen edges={["top", "left", "right"]}>
      {/* App bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          height: 56,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", minWidth: 150 }}>
          {loading ? (
            <Shimmer>
              <View style={{ flexDirection: "row" }}>
                <Skeleton width={52} height={26} radius={100} />
                <View style={{ width: 6 }} />
                <Skeleton width={52} height={26} radius={100} />
              </View>
            </Shimmer>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <StreakChip streak={streak} />
              <View style={{ width: 6 }} />
              <RankChip numeral={rank.numeral} onPress={() => navigate("Account")} />
            </View>
          )}
        </View>
        <Text style={{ color: AppColors.onSurface, fontSize: 18, fontWeight: "800", letterSpacing: 0.5 }}>HEFTOR</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => navigate("CreateTraining")} hitSlop={8} style={{ padding: 6 }}>
            <MaterialIcons name="add" size={24} color={AppColors.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigate("Account")} hitSlop={8} style={{ padding: 6 }}>
            <MaterialIcons name="person-outline" size={24} color={AppColors.onSurface} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.onSurface} />
          }
        >
          {/* Header greeting */}
          <View>
            <Text style={{ color: AppColors.muted, fontSize: 16 }}>{t("dashboard.hi")}</Text>
            <Text numberOfLines={1} style={AppText.headlineLarge}>
              {user?.displayName ?? "Alex"}
            </Text>
            {headline != null ? (
              <View>
                <View style={{ height: 6 }} />
                <Text style={{ fontSize: 13, color: AppColors.muted, fontWeight: "600", letterSpacing: 0.2 }}>
                  {headline}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={{ height: 24 }} />

          {/* Week strip */}
          <View style={{ height: 72 }}>
            <ScrollView
              ref={stripRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onLayout={(e: LayoutChangeEvent) => setStripWidth(e.nativeEvent.layout.width)}
            >
              {itemWidth > 0
                ? days.map((day, i) => (
                    <DayChip
                      key={i}
                      width={itemWidth}
                      label={weekDayLabels()[(day.getDay() + 6) % 7]}
                      dayNumber={day.getDate()}
                      selected={i === selectedIndex}
                      isToday={isSameDay(day, new Date())}
                      hasWorkout={workoutDays.has(dayKey(day))}
                      onPress={() => setSelectedIndex(i)}
                    />
                  ))
                : null}
            </ScrollView>
          </View>

          {/* Recent PR banner */}
          {pr != null
            ? (() => {
                const kgLabel =
                  pr.kg === Math.round(pr.kg) ? pr.kg.toFixed(0) : pr.kg.toFixed(1).replace(".", ",");
                const subColor = "#6B6B6B";
                return (
                  <View style={{ paddingTop: 16 }}>
                    <TouchableOpacity activeOpacity={0.85} onPress={() => onNavigateTab(3)}>
                      <View
                        style={{
                          width: "100%",
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                          backgroundColor: AppColors.onSurface,
                          borderRadius: 14,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <MaterialIcons name="emoji-events" size={22} color={AppColors.background} />
                        <View style={{ width: 12 }} />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{ color: subColor, fontSize: 10, letterSpacing: 1.4, fontWeight: "800" }}
                          >
                            {t("dashboard.new_pr")}
                          </Text>
                          <View style={{ height: 3 }} />
                          <Text
                            numberOfLines={2}
                            style={{ color: AppColors.background, fontSize: 15, lineHeight: 17, fontWeight: "800" }}
                          >
                            {titleCase(pr.exerciseName)}
                          </Text>
                          <View style={{ height: 3 }} />
                          <Text style={{ color: subColor, fontSize: 12, fontWeight: "700" }}>
                            {`${kgLabel} kg × ${pr.reps} · ${relativeDayLabel(pr.when)}`}
                          </Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={18} color={subColor} />
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })()
            : null}

          {/* Stagnation banner */}
          {stagnating.length > 0 ? (
            <View style={{ paddingTop: 16 }}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => setStagnationOpen(true)}>
                <View
                  style={{
                    width: "100%",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: AppColors.surfaceLow,
                    borderWidth: 1,
                    borderColor: AppColors.surfaceHigh,
                    borderRadius: 14,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      color: AppColors.onSurface,
                      fontSize: 12,
                      letterSpacing: 1.2,
                      fontWeight: "800",
                    }}
                  >
                    {t("dashboard.stagnation_label", { n: stagnating.length })}
                  </Text>
                  <MaterialIcons name="chevron-right" size={18} color={AppColors.onSurface} />
                </View>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={{ height: 24 }} />

          {/* Quick actions */}
          <QuickActions
            onCreate={() => navigate("CreateTraining")}
            onGenerate={() => navigate("TrainingGenerator")}
            onTrainings={() => onNavigateTab(1)}
            onProgress={() => onNavigateTab(3)}
            onLogRun={() => navigate("LogRun")}
            t={t}
          />

          <View style={{ height: 24 }} />

          {/* Day content (swipe left/right to change day) */}
          <View {...dayPan.panHandlers}>{dayContent()}</View>

          <View style={{ height: 24 }} />

          {/* Weekly plan preview */}
          {showPlan ? (
            <View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[AppText.bodySmall, { letterSpacing: 1.5 }]}>{t("dashboard.weekly_plan")}</Text>
                <View style={{ width: 8 }} />
                <MaterialIcons name="tune" size={14} color={AppColors.muted} />
              </View>
              <View style={{ height: 12 }} />
              <TouchableOpacity activeOpacity={0.9} onPress={() => navigate("WeeklyPlanEdit")}>
                <WeekPreview split={planSplit} daysPerWeek={planDays ?? 0} todayIndex={todayIdx} customPlan={customPlan} />
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </View>
          ) : null}

          {/* Stats */}
          <View>
            <Text style={[AppText.bodySmall, { letterSpacing: 1.5 }]}>{t("dashboard.summary")}</Text>
            <View style={{ height: 12 }} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <StatCard value={fmtCount(totalSets)} label={t("dashboard.stat_total_sets")} />
              <StatCard value={fmtVolume(totalVolume)} unit={volumeUnit(totalVolume)} label={t("dashboard.stat_lifted")} />
              <StatCard value={fmtTime(totalMinutes)} label={t("dashboard.stat_active_time")} />
              <StatCard value={`${sessions.length}`} label={t("dashboard.stat_sessions")} />
            </View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* Stagnation sheet */}
      <Modal visible={stagnationOpen} transparent animationType="slide" onRequestClose={() => setStagnationOpen(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setStagnationOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              maxHeight: screenHeight * 0.7,
              backgroundColor: AppColors.background,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 1,
              borderColor: AppColors.outline,
              paddingBottom: 16,
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
            <View style={{ paddingHorizontal: 20, paddingVertical: 4 }}>
              <Text style={{ color: AppColors.muted, fontSize: 12, letterSpacing: 1.5, fontWeight: "700" }}>
                {t("dashboard.stagnation_badge")}
              </Text>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 }}>
              {stagnating.map((item, i) => (
                <View
                  key={`${item.exerciseId}-${i}`}
                  style={{
                    paddingVertical: 14,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: AppColors.outline,
                  }}
                >
                  <Text style={{ color: AppColors.onSurface, fontSize: 16, fontWeight: "700" }}>
                    {titleCase(item.name)}
                  </Text>
                  <View style={{ height: 4 }} />
                  <Text style={{ color: AppColors.muted, fontSize: 13 }}>
                    {t("dashboard.weeks_stagnant", { n: item.weeksStagnant }) +
                      (item.tips.length === 0 ? "" : ` · ${item.tips.join(" / ")}`)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Long-press training actions */}
      {actionsFor != null ? (
        <TrainingActions visible training={actionsFor} onClose={() => setActionsFor(null)} onChanged={load} />
      ) : null}
    </Screen>
  );
}

// --- sub-components ---------------------------------------------------------

function StreakChip({ streak }: { streak: number }) {
  return (
    <View
      style={{
        paddingHorizontal: 9,
        paddingVertical: 5,
        backgroundColor: AppColors.surfaceLow,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <MaterialIcons name="local-fire-department" size={15} color={AppColors.accentAmber} />
      <View style={{ width: 3 }} />
      <Text style={{ fontSize: 14, fontWeight: "800", color: AppColors.onSurface, letterSpacing: -0.5 }}>{`${streak}`}</Text>
    </View>
  );
}

function RankChip({ numeral, onPress }: { numeral: string; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <View
        style={{
          paddingHorizontal: 9,
          paddingVertical: 5,
          backgroundColor: AppColors.surfaceLow,
          borderRadius: 12,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <MaterialIcons name="military-tech" size={15} color={AppColors.muted} />
        <View style={{ width: 3 }} />
        <Text style={{ fontSize: 14, fontWeight: "800", color: AppColors.onSurface, letterSpacing: -0.5 }}>
          {numeral}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function DayChip({
  width,
  label,
  dayNumber,
  selected,
  isToday: _isToday,
  hasWorkout,
  onPress,
}: {
  width: number;
  label: string;
  dayNumber: number;
  selected: boolean;
  isToday: boolean;
  hasWorkout: boolean;
  onPress: () => void;
}) {
  const fg = selected ? AppColors.onSurface : AppColors.muted;
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={{ width }}>
      <View style={{ paddingVertical: 8, alignItems: "center" }}>
        <Text style={{ fontSize: 11, fontWeight: "500", color: fg }}>{label}</Text>
        <View style={{ height: 4 }} />
        <Text style={{ fontSize: 14, fontWeight: selected ? "800" : "700", color: fg }}>{`${dayNumber}`}</Text>
        <View style={{ height: 6 }} />
        {selected ? (
          <View style={{ width: 18, height: 3, backgroundColor: AppColors.onSurface }} />
        ) : hasWorkout ? (
          <View style={{ width: 14, height: 3, backgroundColor: AppColors.muted }} />
        ) : (
          <View style={{ width: 14, height: 3 }} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function ProgressBar({
  value,
  height,
  radius,
  track,
  fill,
}: {
  value: number;
  height: number;
  radius: number;
  track: string;
  fill: string;
}) {
  return (
    <View style={{ flex: 1, height, borderRadius: radius, backgroundColor: track, overflow: "hidden" }}>
      <View style={{ width: `${clamp01(value) * 100}%`, height, backgroundColor: fill }} />
    </View>
  );
}

function WeeklyProgressBar({ progress, label }: { progress: number; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <ProgressBar value={progress} height={8} radius={100} track={AppColors.surfaceHigh} fill={AppColors.onSurface} />
      <View style={{ width: 12 }} />
      <Text style={{ color: AppColors.muted, fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

function HeroCard({
  label,
  title,
  bigNumber,
  progress,
  progressLabel,
}: {
  label: string;
  title: string;
  bigNumber: number;
  progress: number;
  progressLabel: string;
}) {
  return (
    <View style={{ paddingVertical: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: AppColors.onSurface }} />
          <View style={{ width: 8 }} />
          <Text style={{ fontSize: 11, color: AppColors.muted, fontWeight: "600", letterSpacing: 1 }}>{label}</Text>
        </View>
        <Text style={{ fontSize: 56, fontWeight: "800", color: AppColors.surfaceHigh, lineHeight: 56 }}>
          {String(bigNumber).padStart(2, "0")}
        </Text>
      </View>
      <Text numberOfLines={1} style={AppText.headlineLarge}>
        {title}
      </Text>
      <View style={{ height: 12 }} />
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <ProgressBar value={progress} height={4} radius={4} track={AppColors.outline} fill={AppColors.primary} />
        <View style={{ width: 12 }} />
        <Text style={{ fontSize: 11, color: AppColors.muted }}>{progressLabel}</Text>
      </View>
    </View>
  );
}

function ListCard({
  title,
  subtitle,
  bigNumber,
  inProgress = false,
  finished = false,
  onPress,
  onLongPress,
}: {
  title: string;
  subtitle: string;
  bigNumber: number;
  inProgress?: boolean;
  finished?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const statusColor = finished ? AppColors.accentGreen : AppColors.accentAmber;
  const statusIcon = finished ? "check-circle" : "radio-button-unchecked";
  const statusLabel = finished ? "Befejezve" : "Nincs befejezve";
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} onLongPress={onLongPress}>
      <View
        style={{
          paddingVertical: 16,
          borderTopWidth: 1,
          borderTopColor: AppColors.outline,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {inProgress ? (
          <>
            <MaterialIcons name="play-circle-filled" size={26} color={AppColors.accentAmber} />
            <View style={{ width: 12 }} />
          </>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: "700", color: AppColors.onSurface }}>
            {title}
          </Text>
          <View style={{ height: 3 }} />
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 13, color: AppColors.muted }}>{subtitle}</Text>
            <View style={{ width: 8 }} />
            <MaterialIcons name={statusIcon} size={13} color={statusColor} />
            <View style={{ width: 4 }} />
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 12, fontWeight: "700", color: statusColor }}>
              {statusLabel}
            </Text>
          </View>
        </View>
        <View style={{ width: 12 }} />
        <Text style={{ fontSize: 40, fontWeight: "800", color: AppColors.surfaceHigh, lineHeight: 40 }}>
          {String(bigNumber).padStart(2, "0")}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function EmptyDayCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={{ width: "100%", paddingVertical: 40, alignItems: "flex-start" }}>
      <Text style={{ fontSize: 28, fontWeight: "800", color: AppColors.onSurface, letterSpacing: -1 }}>{title}</Text>
      <View style={{ height: 4 }} />
      <Text style={{ fontSize: 14, color: AppColors.muted }}>{subtitle}</Text>
    </View>
  );
}

function StatCard({ value, label, unit }: { value: string; label: string; unit?: string }) {
  return (
    <View style={{ flexBasis: "47%", flexGrow: 1, aspectRatio: 1.6, justifyContent: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
        <Text style={{ fontSize: 32, fontWeight: "800", color: AppColors.onSurface, letterSpacing: -1 }}>{value}</Text>
        {unit != null ? (
          <>
            <View style={{ width: 4 }} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: AppColors.muted }}>{unit}</Text>
          </>
        ) : null}
      </View>
      <View style={{ height: 4 }} />
      <Text style={{ fontSize: 12, color: AppColors.muted }}>{label}</Text>
    </View>
  );
}

function QuickActions({
  onCreate,
  onGenerate,
  onTrainings,
  onProgress,
  onLogRun,
  t,
}: {
  onCreate: () => void;
  onGenerate: () => void;
  onTrainings: () => void;
  onProgress: () => void;
  onLogRun: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <QuickTile icon="add" label={t("quick.new_workout")} onPress={onCreate} />
        <QuickTile icon="auto-awesome" label={t("quick.generate")} onPress={onGenerate} />
      </View>
      <View style={{ height: 12 }} />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <QuickTile icon="fitness-center" label={t("quick.trainings")} onPress={onTrainings} />
        <QuickTile icon="trending-up" label={t("quick.progress")} onPress={onProgress} />
      </View>
      <View style={{ height: 12 }} />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <QuickTile icon="directions-run" label={t("quick.log_run")} onPress={onLogRun} />
      </View>
    </View>
  );
}

function QuickTile({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={{ flex: 1 }}>
      <View
        style={{
          paddingVertical: 18,
          paddingHorizontal: 16,
          backgroundColor: AppColors.surfaceLow,
          borderRadius: 18,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <MaterialIcons name={icon} size={22} color={AppColors.onSurface} />
        <View style={{ width: 12 }} />
        <Text numberOfLines={1} style={{ flex: 1, color: AppColors.onSurface, fontSize: 14, fontWeight: "700" }}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/** Shimmering placeholder shown while the first data load is in flight. */
function DashboardSkeleton() {
  return (
    <Shimmer>
      <ScrollView scrollEnabled={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8 }}>
        {/* Greeting block. */}
        <Skeleton width={70} height={14} />
        <View style={{ height: 10 }} />
        <Skeleton width={190} height={32} radius={10} />
        <View style={{ height: 10 }} />
        <Skeleton width={150} height={12} />
        <View style={{ height: 28 }} />
        {/* Week strip — 7 day circles. */}
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {Array.from({ length: 7 }, (_u, i) => (
            <View key={i} style={{ alignItems: "center" }}>
              <Skeleton width={22} height={10} />
              <View style={{ height: 8 }} />
              <Skeleton width={40} height={40} radius={100} />
            </View>
          ))}
        </View>
        <View style={{ height: 28 }} />
        {/* Day / hero card. */}
        <Skeleton height={190} radius={24} />
        <View style={{ height: 24 }} />
        {/* Plan list. */}
        <Skeleton width={130} height={14} />
        <View style={{ height: 14 }} />
        {Array.from({ length: 3 }, (_u, i) => (
          <View key={i} style={{ marginBottom: 12 }}>
            <Skeleton height={74} radius={18} />
          </View>
        ))}
        <View style={{ height: 12 }} />
        {/* Stats row. */}
        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1 }}>
            <Skeleton height={84} radius={18} />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Skeleton height={84} radius={18} />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Skeleton height={84} radius={18} />
          </View>
        </View>
      </ScrollView>
    </Shimmer>
  );
}
