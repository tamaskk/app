// Ported 1:1 from apps/mobile/lib/screens/calendar_screen.dart.
// `Naptár` — overview of sessions over time, anchored by a streak card, a
// weekly progress bar and a month grid the user can browse.
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Screen } from "../components/ui";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";
import { useAuth } from "../context/AuthContext";
import { Api } from "../lib/api";
import { WorkoutSession } from "../models/apiModels";
import {
  weeklyStreak,
  allTimeBestStreak,
  streakStatus,
  weeklyDoneCount,
  StreakStatus,
} from "../utils/streak";
import { titleCase } from "../utils/text";
import { computeInsights } from "../utils/insights";
import { MuscleVolumeChart } from "../components/MuscleHeatmap";
import { YearlyHeatmap, yearlyHeatmapKey } from "../components/YearlyHeatmap";
import type { TabScreenProps } from "../navigation/types";

// Month name keys — 1-based month → localized full month name.
const _monthKeys = [
  "calendar.month_january",
  "calendar.month_february",
  "calendar.month_march",
  "calendar.month_april",
  "calendar.month_may",
  "calendar.month_june",
  "calendar.month_july",
  "calendar.month_august",
  "calendar.month_september",
  "calendar.month_october",
  "calendar.month_november",
  "calendar.month_december",
];

function _dayKey(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function _fmtVolume(kg: number): string {
  return kg >= 1000
    ? (kg / 1000).toFixed(1).replace(".", ",")
    : Math.round(kg).toString();
}

function _volumeUnit(kg: number): string {
  return kg >= 1000 ? "t" : "kg";
}

// ISO weekday: Mon=1 .. Sun=7 (JS getDay is Sun=0 .. Sat=6).
function _isoWeekday(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1;
}

const api = new Api();

export function CalendarScreen({ navigation, onNavigateTab }: TabScreenProps) {
  const { t } = useLang();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [monthRef, setMonthRef] = useState<Date>(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await api.getSessions();
      setSessions(s);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const _monthName = (month1Based: number): string =>
    t(_monthKeys[month1Based - 1]);

  const _whenOf = (s: WorkoutSession): Date | null =>
    s.finishedAt ?? s.startedAt;

  /// Sessions logged on the given date (compared by year/month/day only).
  const _sessionsOn = (d: Date): WorkoutSession[] =>
    sessions.filter((s) => {
      const w = _whenOf(s);
      if (w == null) return false;
      return _dayKey(w) === _dayKey(d);
    });

  /// Dates with at least one completed session — input for the streak helpers.
  const _workoutDates: Date[] = [];
  for (const s of sessions) {
    const w = _whenOf(s);
    if (w != null) _workoutDates.push(new Date(w.getFullYear(), w.getMonth(), w.getDate()));
  }

  const _streak = weeklyStreak(_workoutDates);
  const _bestStreak = allTimeBestStreak(_workoutDates);
  const _weeklyDone = weeklyDoneCount(_workoutDates);

  /// Pull weekly goal from onboarding; fall back to a reasonable default.
  const _weeklyGoal = (() => {
    const d = user?.onboarding?.daysPerWeek;
    if (d != null && d > 0) return d;
    return 3;
  })();

  /// Number of sessions in the current month that registered a new
  /// all-time-best e1RM on any exercise. Walks sessions chronologically and
  /// counts the ones whose date is in the current month.
  const _prsThisMonth = (() => {
    const sorted = [...sessions].sort((a, b) => {
      const da = a.finishedAt ?? a.startedAt;
      const db = b.finishedAt ?? b.startedAt;
      if (da == null && db == null) return 0;
      if (da == null) return -1;
      if (db == null) return 1;
      return da.getTime() - db.getTime();
    });
    const allTimeMax: Record<string, number> = {};
    const now = new Date();
    let prs = 0;
    for (const s of sorted) {
      const when = s.finishedAt ?? s.startedAt;
      if (when == null) continue;
      let sessionHadPr = false;
      for (const ex of s.exercises) {
        if (ex.exerciseId.length === 0 || ex.sets.length === 0) continue;
        for (const set of ex.sets) {
          if (set.reps <= 0 || set.kg <= 0) continue;
          // Epley e1RM.
          const e1rm = set.kg * (1 + set.reps / 30.0);
          const prev = allTimeMax[ex.exerciseId] ?? 0;
          if (e1rm > prev + 0.5) {
            allTimeMax[ex.exerciseId] = e1rm;
            sessionHadPr = true;
          }
        }
      }
      if (
        sessionHadPr &&
        when.getFullYear() === now.getFullYear() &&
        when.getMonth() === now.getMonth()
      ) {
        prs++;
      }
    }
    return prs;
  })();

  const now = new Date();

  // -------------------------------------------------------------------
  // Streak hero
  // -------------------------------------------------------------------
  const _streakHero = () => {
    const status = streakStatus(_workoutDates);
    let hint: string | null = null;
    if (status === StreakStatus.safe) {
      if (_streak >= _bestStreak && _streak > 0) {
        hint = t("calendar.alltime_record_caps");
      }
    } else if (status === StreakStatus.atRisk) {
      hint = t("calendar.streak_at_risk");
    } else if (status === StreakStatus.pending) {
      hint = t("calendar.week_still_open");
    } else if (status === StreakStatus.broken) {
      if (_streak === 0) hint = t("calendar.start_streak_again");
    }
    return (
      <View
        style={{
          backgroundColor: AppColors.surfaceLow,
          borderRadius: 20,
          paddingVertical: 22,
          paddingHorizontal: 18,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 72,
            fontWeight: "800",
            letterSpacing: -3,
            color: AppColors.onSurface,
            lineHeight: 72,
          }}
        >
          {`${_streak}`}
        </Text>
        <View style={{ height: 6 }} />
        <Text
          style={{
            fontSize: 11,
            letterSpacing: 1.5,
            color: AppColors.muted,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          {t("calendar.streak_hint_caps")}
        </Text>
        {hint != null ? (
          <>
            <View style={{ height: 14 }} />
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: AppColors.onSurface,
                borderRadius: 100,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  fontWeight: "800",
                  color: AppColors.onSurface,
                }}
              >
                {hint}
              </Text>
            </View>
          </>
        ) : null}
      </View>
    );
  };

  // -------------------------------------------------------------------
  // Week progress
  // -------------------------------------------------------------------
  const _weekProgress = () => {
    const progress =
      _weeklyGoal === 0
        ? 0.0
        : Math.max(0.0, Math.min(1.0, _weeklyDone / _weeklyGoal));
    return (
      <View
        style={{
          backgroundColor: AppColors.surfaceLow,
          borderRadius: 20,
          paddingVertical: 16,
          paddingHorizontal: 18,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={{
              flex: 1,
              fontSize: 11,
              letterSpacing: 1.5,
              fontWeight: "800",
              color: AppColors.muted,
            }}
          >
            {t("calendar.this_week")}
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "800",
              color: AppColors.onSurface,
            }}
          >
            {`${_weeklyDone}/${_weeklyGoal}`}
          </Text>
        </View>
        <View style={{ height: 10 }} />
        <View
          style={{
            height: 6,
            borderRadius: 100,
            overflow: "hidden",
            backgroundColor: AppColors.surfaceHigh,
          }}
        >
          <View
            style={{
              height: 6,
              width: `${progress * 100}%`,
              backgroundColor: AppColors.onSurface,
              borderRadius: 100,
            }}
          />
        </View>
      </View>
    );
  };

  // -------------------------------------------------------------------
  // Month card (grid)
  // -------------------------------------------------------------------
  const _monthCard = () => {
    const ref = monthRef;
    return (
      <View
        style={{
          backgroundColor: AppColors.surfaceLow,
          borderRadius: 20,
          paddingTop: 16,
          paddingBottom: 18,
          paddingHorizontal: 18,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              marginRight: 10,
              backgroundColor: AppColors.onSurface,
            }}
          />
          <Text
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: "800",
              letterSpacing: -0.5,
              color: AppColors.onSurface,
            }}
          >
            {`${_monthName(ref.getMonth() + 1)} ${ref.getFullYear()}`}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setMonthRef(new Date(ref.getFullYear(), ref.getMonth() - 1, 1));
              setSelectedDay(null);
            }}
            style={{ padding: 6 }}
          >
            <MaterialIcons name="chevron-left" size={24} color={AppColors.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setMonthRef(new Date(ref.getFullYear(), ref.getMonth() + 1, 1));
              setSelectedDay(null);
            }}
            style={{ padding: 6 }}
          >
            <MaterialIcons name="chevron-right" size={24} color={AppColors.muted} />
          </TouchableOpacity>
        </View>
        <View style={{ height: 14 }} />
        {_monthGrid(ref)}
      </View>
    );
  };

  const _monthGrid = (ref: Date) => {
    const firstWeekday = _isoWeekday(new Date(ref.getFullYear(), ref.getMonth(), 1)); // 1..7
    const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    const headers = [
      t("plan.day_short_h"),
      t("plan.day_short_k"),
      t("plan.day_short_sze"),
      t("plan.day_short_cs"),
      t("plan.day_short_p"),
      t("plan.day_short_szo"),
      t("plan.day_short_v"),
    ];
    return (
      <View>
        <View style={{ flexDirection: "row" }}>
          {headers.map((h, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 10,
                  letterSpacing: 1.4,
                  fontWeight: "700",
                  color: AppColors.muted,
                }}
              >
                {h}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ height: 8 }} />
        {_buildWeekRows(ref, firstWeekday, daysInMonth)}
      </View>
    );
  };

  const _buildWeekRows = (ref: Date, firstWeekday: number, daysInMonth: number) => {
    const rows: React.ReactNode[] = [];
    const today = new Date();
    let dayNum = 1 - (firstWeekday - 1); // first cell's day-of-month
    let rowIdx = 0;
    while (dayNum <= daysInMonth) {
      const cells: React.ReactNode[] = [];
      for (let i = 0; i < 7; i++) {
        if (dayNum < 1 || dayNum > daysInMonth) {
          cells.push(<View key={i} style={{ flex: 1, height: 40 }} />);
        } else {
          const dn = dayNum;
          const date = new Date(ref.getFullYear(), ref.getMonth(), dn);
          const has = _sessionsOn(date).length > 0;
          const isToday = _dayKey(date) === _dayKey(today);
          const isSelected =
            selectedDay != null && _dayKey(date) === _dayKey(selectedDay);
          const border = isSelected
            ? { borderWidth: 1.5, borderColor: AppColors.onSurface }
            : isToday
              ? { borderWidth: 1, borderColor: AppColors.muted }
              : null;
          cells.push(
            <TouchableOpacity
              key={i}
              activeOpacity={0.7}
              onPress={() => setSelectedDay(date)}
              style={{
                flex: 1,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: has ? AppColors.onSurface : "transparent",
                  ...border,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: has ? AppColors.background : AppColors.onSurface,
                  }}
                >
                  {`${dn}`}
                </Text>
              </View>
            </TouchableOpacity>,
          );
        }
        dayNum++;
      }
      rows.push(
        <View key={rowIdx} style={{ flexDirection: "row", paddingVertical: 2 }}>
          {cells}
        </View>,
      );
      rowIdx++;
    }
    return rows;
  };

  // -------------------------------------------------------------------
  // Day detail
  // -------------------------------------------------------------------
  const _dayDetailCard = (day: Date) => {
    const daySessions = _sessionsOn(day);
    const isPast =
      new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime() <
      Date.now();
    return (
      <View
        style={{
          backgroundColor: AppColors.surfaceLow,
          borderRadius: 20,
          paddingVertical: 16,
          paddingHorizontal: 18,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            letterSpacing: 1.5,
            fontWeight: "800",
            color: AppColors.muted,
          }}
        >
          {`${_monthName(day.getMonth() + 1)} ${day.getDate()}`}
        </Text>
        <View style={{ height: 6 }} />
        {daySessions.length === 0 ? (
          <>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: AppColors.onSurface,
              }}
            >
              {isPast
                ? t("calendar.rest_day_text")
                : t("calendar.rest_day_text")}
            </Text>
            <View style={{ height: 4 }} />
            <Text style={{ fontSize: 13, color: AppColors.muted }}>
              {t("calendar.no_workout_on_day")}
            </Text>
          </>
        ) : (
          daySessions.map((s, idx) => (
            <View key={idx}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: AppColors.onSurface,
                }}
              >
                {titleCase(
                  s.name.length === 0 ? t("dashboard.workout_default") : s.name,
                )}
              </Text>
              <View style={{ height: 4 }} />
              <Text style={{ fontSize: 12, color: AppColors.muted }}>
                {`${s.exercises.length} ${t("dashboard.exercises_short_caps")} · ${s.doneSets}/${s.totalSets} set`}
              </Text>
              <View style={{ height: 8 }} />
            </View>
          ))
        )}
      </View>
    );
  };

  // -------------------------------------------------------------------
  // Month sessions section
  // -------------------------------------------------------------------
  const _monthSection = (nowArg: Date) => {
    const month = sessions.filter((s) => {
      const w = _whenOf(s);
      if (w == null) return false;
      return w.getFullYear() === nowArg.getFullYear() && w.getMonth() === nowArg.getMonth();
    });
    const lm = new Date(nowArg.getFullYear(), nowArg.getMonth() - 1, 1);
    const lastMonth = sessions.filter((s) => {
      const w = _whenOf(s);
      if (w == null) return false;
      return w.getFullYear() === lm.getFullYear() && w.getMonth() === lm.getMonth();
    }).length;
    const delta = month.length - lastMonth;

    let deltaLabel: string;
    if (delta > 0) {
      deltaLabel = t("calendar.delta_up", { n: delta });
    } else if (delta < 0) {
      deltaLabel = t("calendar.delta_down", { n: delta });
    } else {
      deltaLabel = t("calendar.delta_same");
    }

    if (month.length === 0) {
      return (
        <View
          style={{
            padding: 20,
            backgroundColor: AppColors.surfaceLow,
            borderRadius: 20,
            alignItems: "center",
          }}
        >
          <Text style={{ color: AppColors.muted }}>
            {t("calendar.no_workout_this_month")}
          </Text>
        </View>
      );
    }

    let totalVolume = 0;
    for (const s of month) {
      for (const ex of s.exercises) {
        for (const set of ex.sets) {
          totalVolume += set.kg * set.reps;
        }
      }
    }

    return (
      <View>
        <Text
          style={{
            fontSize: 11,
            letterSpacing: 1.5,
            fontWeight: "800",
            color: AppColors.muted,
          }}
        >
          {t("calendar.this_month")}
        </Text>
        <View style={{ height: 10 }} />
        <View
          style={{
            paddingVertical: 16,
            paddingHorizontal: 18,
            backgroundColor: AppColors.surfaceLow,
            borderRadius: 20,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "800",
                color: AppColors.onSurface,
              }}
            >
              {t("calendar.sessions_count_caps", { n: month.length })}
            </Text>
            <View style={{ height: 4 }} />
            <Text
              style={{
                fontSize: 11,
                letterSpacing: 1.2,
                fontWeight: "700",
                color: AppColors.muted,
              }}
            >
              {deltaLabel}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: AppColors.onSurface,
              }}
            >
              {`${_fmtVolume(totalVolume)} ${_volumeUnit(totalVolume)}`}
            </Text>
            <Text
              style={{
                fontSize: 10,
                letterSpacing: 1.4,
                fontWeight: "700",
                color: AppColors.muted,
              }}
            >
              {t("dashboard.stat_lifted").toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // -------------------------------------------------------------------
  // Muscle / observations / yearly
  // -------------------------------------------------------------------
  const _muscleSection = () => {
    const nowLocal = new Date();
    const monthSessions = sessions.filter((s) => {
      const w = _whenOf(s);
      if (w == null) return false;
      return w.getFullYear() === nowLocal.getFullYear() && w.getMonth() === nowLocal.getMonth();
    });
    if (monthSessions.length === 0) return null;
    return (
      <View>
        <Text
          style={{
            fontSize: 11,
            letterSpacing: 1.5,
            fontWeight: "800",
            color: AppColors.muted,
          }}
        >
          {t("calendar.muscles_this_month_caps")}
        </Text>
        <View style={{ height: 10 }} />
        <MuscleVolumeChart sessions={monthSessions} />
      </View>
    );
  };

  const _insightsSection = () => {
    const insights = computeInsights(sessions);
    if (!insights.hasAny) return null;
    const chips: string[] = [];
    if (insights.mostCommonDay != null) chips.push(insights.mostCommonDay);
    if (insights.typicalStartTime != null) chips.push(insights.typicalStartTime);
    if (insights.leastCommonDay != null) chips.push(insights.leastCommonDay);
    if (insights.typicalDuration != null) chips.push(insights.typicalDuration);
    return (
      <View>
        <Text
          style={{
            fontSize: 11,
            letterSpacing: 1.5,
            fontWeight: "800",
            color: AppColors.muted,
          }}
        >
          {t("calendar.observations_caps")}
        </Text>
        <View style={{ height: 10 }} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {chips.map((c, i) => (
            <View
              key={i}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: AppColors.surfaceLow,
                borderRadius: 100,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  letterSpacing: 1.2,
                  fontWeight: "700",
                  color: AppColors.onSurface,
                }}
              >
                {c}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const _yearlySection = (nowArg: Date) => {
    const intensities = new Map<string, number>();
    for (const s of sessions) {
      const w = _whenOf(s);
      if (w == null) continue;
      const key = yearlyHeatmapKey(new Date(w.getFullYear(), w.getMonth(), w.getDate()));
      intensities.set(key, (intensities.get(key) ?? 0) + s.exercises.length);
    }
    return (
      <View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onNavigateTab(3)}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <Text
            style={{
              flex: 1,
              fontSize: 11,
              letterSpacing: 1.5,
              fontWeight: "800",
              color: AppColors.muted,
            }}
          >
            {t("progress.title").toUpperCase()}
          </Text>
          <MaterialIcons name="chevron-right" size={18} color={AppColors.muted} />
        </TouchableOpacity>
        <View style={{ height: 10 }} />
        <View
          style={{
            paddingVertical: 16,
            paddingHorizontal: 14,
            backgroundColor: AppColors.surfaceLow,
            borderRadius: 20,
          }}
        >
          <YearlyHeatmap year={nowArg.getFullYear()} dayIntensity={intensities} />
        </View>
      </View>
    );
  };

  // -------------------------------------------------------------------
  // Build
  // -------------------------------------------------------------------
  return (
    <Screen edges={["top", "left", "right"]}>
      {/* Brand header, consistent with every other tab. The big "NAPTÁR"
          section title still lives in the body below. */}
      <View style={{ height: 48, justifyContent: "center", paddingHorizontal: 20 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "800",
            letterSpacing: 0.5,
            color: AppColors.onSurface,
          }}
        >
          HEFTOR
        </Text>
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={AppColors.onSurface} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingLeft: 20,
            paddingTop: 8,
            paddingRight: 20,
            paddingBottom: 32,
          }}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={load}
              tintColor={AppColors.onSurface}
            />
          }
        >
          <Text
            style={{
              fontSize: 32,
              fontWeight: "800",
              letterSpacing: -1,
              color: AppColors.onSurface,
            }}
          >
            {t("calendar.title_caps")}
          </Text>
          <View style={{ height: 6 }} />
          <Text
            style={{
              fontSize: 12,
              letterSpacing: 1.2,
              color: AppColors.muted,
              fontWeight: "700",
            }}
          >
            {t("calendar.summary_caps", {
              sessions: sessions.length,
              streak: _bestStreak,
              pr: _prsThisMonth,
            })}
          </Text>
          <View style={{ height: 20 }} />
          {_streakHero()}
          <View style={{ height: 12 }} />
          {_weekProgress()}
          <View style={{ height: 20 }} />
          {_monthCard()}
          {selectedDay != null ? (
            <>
              <View style={{ height: 16 }} />
              {_dayDetailCard(selectedDay)}
            </>
          ) : null}
          <View style={{ height: 24 }} />
          {_monthSection(now)}
          <View style={{ height: 24 }} />
          {_muscleSection()}
          <View style={{ height: 24 }} />
          {_insightsSection()}
          <View style={{ height: 24 }} />
          {_yearlySection(now)}
        </ScrollView>
      )}
    </Screen>
  );
}
