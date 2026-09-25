// Ported 1:1 from apps/mobile/lib/screens/progress_screen.dart.
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  LayoutChangeEvent,
} from "react-native";
import Svg, { Path, Line, Circle, Text as SvgText } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { Screen } from "../components/ui";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";
import { Api, ApiException } from "../lib/api";
import { WorkoutSession, SavedExercise, SavedSet } from "../models/apiModels";
import { sessionsWithPr } from "../utils/recentPr";
import { titleCase } from "../utils/text";
import { t, isHu } from "../i18n";
import type { RootNav } from "../navigation/types";

const api = new Api();

// --- module-level formatting helpers (1:1 with the Dart file) ---------------

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function fmtTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/// Uppercase brutalist date used in session subtitle: `JUN 5 · 19:38`.
/// Month abbreviation is localized via the shared `month.N` keys.
function fmtDateTime(d: Date): string {
  return `${t(`month.${d.getMonth() + 1}`)} ${d.getDate()} · ${fmtTime(d)}`;
}

function fmtDuration(ms: number): string {
  const hu = isHu();
  const m = Math.floor(ms / 60000);
  if (m < 1) {
    const s = Math.floor(ms / 1000);
    return hu ? `${s} mp` : `${s}s`;
  }
  if (m < 60) return hu ? `${m} perc` : `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (rem === 0) return t("progress.hours", { h });
  return t("progress.hours_mins", { h, rem });
}

/// Trim a double for display: 139 not 139.0, 7.5 stays 7.5.
function numFmt(v: number): string {
  return v === Math.round(v) ? Math.trunc(v).toString() : v.toFixed(1);
}

/// Compact volume for the brutalist UI: 12.4 t over 1 ton, kg below.
/// Decimal separator follows the language (comma for HU, dot for EN).
function fmtVolume(kg: number): string {
  if (kg >= 1000) {
    const s = (kg / 1000).toFixed(1);
    return `${isHu() ? s.replace(".", ",") : s} t`;
  }
  return `${Math.round(kg)} kg`;
}

/// Total volume across the COMPLETED sets in a session. Skipped (unchecked)
/// sets still carry their pre-filled kg×reps, so counting them inflated the
/// reported volume for any workout finished before every set was ticked.
function sessionVolume(s: WorkoutSession): number {
  return s.exercises.reduce(
    (a, e) =>
      a + e.sets.filter((x) => x.done).reduce((b, x) => b + x.kg * x.reps, 0),
    0,
  );
}

/// Compact wall-clock-style minutes label for stat hero (8h 12m / 47p).
function fmtMinutesH(minutes: number): string {
  const hu = isHu();
  if (minutes < 60) return hu ? `${minutes}p` : `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `${h}h`;
  return hu ? `${h}h ${rem}p` : `${h}h ${rem}m`;
}

/// History filter windows. `null` means "all time".
type RangeFilter = "mind" | "het" | "honap" | "kilencven" | "ev";
const RANGE_ORDER: RangeFilter[] = ["mind", "het", "honap", "kilencven", "ev"];

function rangeLabel(r: RangeFilter): string {
  switch (r) {
    case "mind":
      return t("progress.range_all");
    case "het":
      return t("progress.range_week");
    case "honap":
      return t("progress.range_month");
    case "kilencven":
      return t("progress.range_90");
    case "ev":
      return t("progress.range_year");
  }
}

/// Window in days, or null for all-time.
function rangeWindowDays(r: RangeFilter): number | null {
  switch (r) {
    case "mind":
      return null;
    case "het":
      return 7;
    case "honap":
      return 30;
    case "kilencven":
      return 90;
    case "ev":
      return 365;
  }
}

/// Relative date bucket used for grouping history rows.
function dateBucket(d: Date, now: Date): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - that.getTime()) / 86400000);
  if (diffDays <= 0) return t("progress.bucket_today");
  if (diffDays === 1) return t("progress.bucket_yesterday");
  // Same ISO week as today (Monday-first) → "THIS WEEK".
  const daysSinceMonday = (today.getDay() + 6) % 7; // Mon=0..Sun=6
  const mondayThisWeek = new Date(today);
  mondayThisWeek.setDate(today.getDate() - daysSinceMonday);
  if (that.getTime() >= mondayThisWeek.getTime()) {
    return t("progress.bucket_this_week");
  }
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
    return t("progress.bucket_this_month");
  }
  return t("progress.bucket_earlier");
}

// --- per-exercise history aggregation ---------------------------------------

/// Aggregate stats for the active range filter — feeds the hero panel.
interface StatBucket {
  count: number;
  volume: number;
  minutes: number;
  prs: number;
}

function statBucketFromSessions(
  sessions: WorkoutSession[],
  prSessionIds: Set<string>,
): StatBucket {
  let volume = 0;
  let minutes = 0;
  let prs = 0;
  for (const s of sessions) {
    volume += sessionVolume(s);
    minutes += s.durationMs != null ? Math.floor(s.durationMs / 60000) : 0;
    if (s.id.length > 0 && prSessionIds.has(s.id)) prs++;
  }
  return { count: sessions.length, volume, minutes, prs };
}

interface SessionPoint {
  date: Date;
  sets: SavedSet[];
}

interface ExerciseHistory {
  key: string;
  name: string;
  gifUrl: string;
  points: SessionPoint[]; // ascending by date
}

const METRICS = ["1RM", "Max Weight", "Volume", "Total Reps"];

function metricValue(metric: string, sets: SavedSet[]): number {
  // Only completed sets count — an unchecked planned set carries pre-filled
  // (or auto-progression) kg×reps that was never actually lifted, which would
  // otherwise spike Max Weight / 1RM to a weight the user never hit and inflate
  // Volume / Total Reps. Matches the PR badge, which already filters on done.
  const done = sets.filter((s) => s.done);
  switch (metric) {
    case "Max Weight":
      return done.reduce((a, s) => Math.max(a, s.kg), 0);
    case "Volume":
      return done.reduce((a, s) => a + s.kg * s.reps, 0);
    case "Total Reps":
      return done.reduce((a, s) => a + s.reps, 0);
    case "1RM":
    default:
      // Epley estimate; best set wins.
      return done.reduce((a, s) => Math.max(a, s.kg * (1 + s.reps / 30.0)), 0);
  }
}

function metricUnit(metric: string): string {
  return metric === "Total Reps" ? "" : "kg";
}

/// Localized display label for a metric. The internal metric strings stay in
/// English so the calculation switches keep working.
function metricLabel(metric: string): string {
  switch (metric) {
    case "Max Weight":
      return t("progress.metric_max_weight");
    case "Volume":
      return t("progress.metric_volume");
    case "Total Reps":
      return t("progress.metric_total_reps");
    default:
      return t("progress.metric_1rm");
  }
}

/// Group every exercise across sessions into a per-exercise history, oldest
/// point first. Matches on exerciseId when present, else lowercased name.
function buildGroups(sessions: WorkoutSession[]): ExerciseHistory[] {
  const map = new Map<string, ExerciseHistory>();
  const dated = sessions
    .filter((s) => (s.finishedAt ?? s.startedAt) != null)
    .sort((a, b) => {
      const da = (a.finishedAt ?? a.startedAt) as Date;
      const db = (b.finishedAt ?? b.startedAt) as Date;
      return da.getTime() - db.getTime();
    });
  for (const s of dated) {
    const date = (s.finishedAt ?? s.startedAt) as Date;
    for (const ex of s.exercises) {
      const key = ex.exerciseId.length > 0 ? ex.exerciseId : ex.name.toLowerCase();
      let h = map.get(key);
      if (h == null) {
        h = { key, name: ex.name, gifUrl: ex.gifUrl, points: [] };
        map.set(key, h);
      }
      h.points.push({ date, sets: ex.sets });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// --- main screen ------------------------------------------------------------

export function ProgressScreen(_props?: {
  navigation?: RootNav;
  onNavigateTab?: (i: number) => void;
}) {
  useLang(); // re-render on language toggle
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  // Sessions sorted newest-first — what the history list renders.
  const [historySorted, setHistorySorted] = useState<WorkoutSession[]>([]);
  // Session ids that contained at least one PR.
  const [prSessionIds, setPrSessionIds] = useState<Set<string>>(new Set());
  const [groups, setGroups] = useState<ExerciseHistory[]>([]);
  const [tab, setTab] = useState(0); // 0 = history, 1 = exercises
  const [range, setRange] = useState<RangeFilter>("honap");
  const [refreshing, setRefreshing] = useState(false);
  // In-file navigation targets (Dart pushes these onto the navigator).
  const [detailSession, setDetailSession] = useState<WorkoutSession | null>(null);
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseHistory | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await api.getSessions();
      // History list is newest-first; the per-exercise grouping still walks
      // oldest→newest internally for running max calculations.
      const sortedDesc = [...fetched].sort((a, b) => {
        const da = a.finishedAt ?? a.startedAt;
        const db = b.finishedAt ?? b.startedAt;
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return db.getTime() - da.getTime();
      });
      setSessions(fetched);
      setHistorySorted(sortedDesc);
      setPrSessionIds(sessionsWithPr(fetched));
      setGroups(buildGroups(fetched));
    } catch (e) {
      if (e instanceof ApiException) setError(e.message);
      else setError(t("auth.server_unreachable"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Sub-screens replace the whole body, matching a Navigator push.
  if (detailSession != null) {
    return (
      <Screen edges={["top", "left", "right"]}>
        <SessionDetailView
          session={detailSession}
          onBack={() => setDetailSession(null)}
        />
      </Screen>
    );
  }
  if (exerciseHistory != null) {
    return (
      <Screen edges={["top", "left", "right"]}>
        <ExerciseProgressView
          history={exerciseHistory}
          onBack={() => setExerciseHistory(null)}
        />
      </Screen>
    );
  }

  // Sessions filtered by the active time range, newest-first.
  const filteredSessions = (): WorkoutSession[] => {
    const windowDays = rangeWindowDays(range);
    if (windowDays == null) return historySorted;
    const cutoff = new Date(Date.now() - windowDays * 86400000);
    return historySorted.filter((s) => {
      const d = s.finishedAt ?? s.startedAt;
      return d != null && d.getTime() > cutoff.getTime();
    });
  };

  // All-time aggregate used as a brutalist subtitle under the title.
  const totalVolume = sessions.reduce((a, s) => a + sessionVolume(s), 0);
  const subtitle =
    sessions.length === 0
      ? null
      : t("progress.subtitle", {
          n: sessions.length,
          vol: fmtVolume(totalVolume).toUpperCase(),
        });

  return (
    <Screen edges={["top", "left", "right"]}>
      <View style={{ flex: 1 }}>
        {/* Title header */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "800",
              letterSpacing: -1,
              color: AppColors.onSurface,
            }}
          >
            {t("progress.title").toUpperCase()}
          </Text>
          {subtitle != null && (
            <>
              <View style={{ height: 4 }} />
              <Text
                style={{
                  fontSize: 12,
                  letterSpacing: 1.2,
                  color: AppColors.muted,
                  fontWeight: "700",
                }}
              >
                {subtitle}
              </Text>
            </>
          )}
        </View>

        {/* Tab bar */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 20,
            paddingTop: 4,
            paddingBottom: 12,
          }}
        >
          <TabButton
            label={t("progress.tab_history")}
            active={tab === 0}
            onPress={() => setTab(0)}
          />
          <TabButton
            label={t("progress.tab_exercises")}
            active={tab === 1}
            onPress={() => setTab(1)}
          />
        </View>

        <View style={{ flex: 1 }}>
          {tab === 0
            ? renderHistory({
                loading,
                error,
                sessions,
                filtered: filteredSessions(),
                prSessionIds,
                range,
                setRange,
                refreshing,
                onRefresh,
                onRetry: load,
                onOpenSession: setDetailSession,
              })
            : renderExercises({
                loading,
                error,
                groups,
                refreshing,
                onRefresh,
                onRetry: load,
                onOpenExercise: setExerciseHistory,
              })}
        </View>
      </View>
    </Screen>
  );
}

// --- tab button -------------------------------------------------------------

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ marginRight: 32 }}>
      <View style={{ alignItems: "center" }}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: active ? AppColors.onSurface : AppColors.muted,
          }}
        >
          {label}
        </Text>
        <View style={{ height: 6 }} />
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: active ? AppColors.onSurface : "transparent",
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

// --- HISTORY tab ------------------------------------------------------------

function renderHistory(p: {
  loading: boolean;
  error: string | null;
  sessions: WorkoutSession[];
  filtered: WorkoutSession[];
  prSessionIds: Set<string>;
  range: RangeFilter;
  setRange: (r: RangeFilter) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  onOpenSession: (s: WorkoutSession) => void;
}) {
  if (p.loading && p.sessions.length === 0) {
    return <Centered />;
  }
  if (p.error != null && p.sessions.length === 0) {
    return (
      <MessageView
        icon="cloud-off"
        title={p.error}
        action={t("common.retry")}
        onAction={p.onRetry}
      />
    );
  }
  if (p.sessions.length === 0) {
    return (
      <MessageView
        icon="history"
        title={t("progress.empty_history_title")}
        subtitle={t("progress.empty_history_subtitle")}
      />
    );
  }

  const stats = statBucketFromSessions(p.filtered, p.prSessionIds);
  const grouped = groupSessionsByBucket(p.filtered);

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 24,
      }}
      refreshControl={
        <RefreshControl
          refreshing={p.refreshing}
          onRefresh={p.onRefresh}
          tintColor={AppColors.onSurface}
        />
      }
    >
      <RangeFilterStrip range={p.range} setRange={p.setRange} />
      <StatHero s={stats} />
      {grouped.map(([bucket, rows]) => (
        <React.Fragment key={bucket}>
          <BucketHeader label={bucket} />
          {rows.map((s, idx) => (
            <SessionRow
              key={s.id.length > 0 ? s.id : `${bucket}-${idx}`}
              session={s}
              first={idx === 0}
              isPr={s.id.length > 0 && p.prSessionIds.has(s.id)}
              onPress={() => p.onOpenSession(s)}
            />
          ))}
        </React.Fragment>
      ))}
    </ScrollView>
  );
}

function RangeFilterStrip({
  range,
  setRange,
}: {
  range: RangeFilter;
  setRange: (r: RangeFilter) => void;
}) {
  return (
    <View style={{ height: 44 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: "center" }}
      >
        {RANGE_ORDER.map((r, i) => {
          const active = range === r;
          return (
            <TouchableOpacity
              key={r}
              activeOpacity={0.8}
              onPress={() => setRange(r)}
              style={{
                marginRight: i === RANGE_ORDER.length - 1 ? 0 : 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 100,
                backgroundColor: active ? AppColors.primary : AppColors.surfaceLow,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  letterSpacing: 1.2,
                  lineHeight: 12,
                  fontWeight: "800",
                  textAlign: "center",
                  color: active ? AppColors.background : AppColors.onSurface,
                }}
              >
                {rangeLabel(r)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function StatHero({ s }: { s: StatBucket }) {
  return (
    <View style={{ paddingTop: 16, paddingBottom: 8 }}>
      <View
        style={{
          padding: 16,
          backgroundColor: AppColors.surfaceLow,
          borderRadius: 20,
          flexDirection: "row",
        }}
      >
        <HeroStat value={`${s.count}`} label={t("progress.stat_workouts")} />
        <HeroStat value={fmtVolume(s.volume)} label={t("progress.stat_lifted")} compact />
        <HeroStat value={fmtMinutesH(s.minutes)} label={t("progress.stat_active_time")} />
        <HeroStat value={`${s.prs}`} label="PR" />
      </View>
    </View>
  );
}

function HeroStat({
  value,
  label,
  compact = false,
}: {
  value: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text
        numberOfLines={1}
        style={{
          fontSize: compact ? 22 : 26,
          fontWeight: "800",
          letterSpacing: -1,
          color: AppColors.onSurface,
          lineHeight: compact ? 22 : 26,
        }}
      >
        {value}
      </Text>
      <View style={{ height: 4 }} />
      <Text
        style={{
          fontSize: 10,
          letterSpacing: 1.4,
          fontWeight: "700",
          color: AppColors.muted,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function BucketHeader({ label }: { label: string }) {
  return (
    <View style={{ paddingTop: 20, paddingBottom: 4 }}>
      <Text
        style={{
          fontSize: 11,
          letterSpacing: 1.6,
          fontWeight: "800",
          color: AppColors.muted,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function SessionRow({
  session,
  first,
  isPr,
  onPress,
}: {
  session: WorkoutSession;
  first: boolean;
  isPr: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        paddingVertical: 16,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: AppColors.outline,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              numberOfLines={1}
              style={{
                flexShrink: 1,
                fontSize: 18,
                fontWeight: "800",
                letterSpacing: -0.5,
                color: AppColors.onSurface,
              }}
            >
              {titleCase(
                session.name.length === 0 ? t("dashboard.workout_default") : session.name,
              )}
            </Text>
            {isPr && (
              <>
                <View style={{ width: 8 }} />
                <PrChip />
              </>
            )}
          </View>
          <View style={{ height: 4 }} />
          <Text
            numberOfLines={2}
            style={{ fontSize: 12, letterSpacing: 0.5, color: AppColors.muted }}
          >
            {sessionSubtitle(session)}
          </Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: "800", color: AppColors.onSurface }}>
          {`${session.doneSets}/${session.totalSets}`}
        </Text>
        <View style={{ paddingLeft: 4 }}>
          <MaterialIcons name="chevron-right" color={AppColors.muted} size={22} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

/// Outlined `PR` chip rendered next to session names that contained a PR.
function PrChip() {
  return (
    <View
      style={{
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: AppColors.onSurface,
        borderRadius: 4,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: "800",
          letterSpacing: 1.4,
          color: AppColors.onSurface,
          lineHeight: 10,
        }}
      >
        PR
      </Text>
    </View>
  );
}

function sessionSubtitle(s: WorkoutSession): string {
  const parts: string[] = [];
  if (s.finishedAt != null) parts.push(fmtDateTime(s.finishedAt));
  if (s.durationMs != null) parts.push(fmtDuration(s.durationMs));
  parts.push(t("progress.n_exercises", { n: s.exercises.length }));
  const vol = sessionVolume(s);
  if (vol > 0) parts.push(fmtVolume(vol).toUpperCase());
  return parts.join(" · ").toUpperCase();
}

/// Walk the filtered list and group by relative-date bucket. Preserves
/// chronological order (newest-first) within and across buckets.
function groupSessionsByBucket(
  sessions: WorkoutSession[],
): [string, WorkoutSession[]][] {
  const now = new Date();
  const out = new Map<string, WorkoutSession[]>();
  for (const s of sessions) {
    const d = s.finishedAt ?? s.startedAt;
    if (d == null) continue;
    const bucket = dateBucket(d, now);
    const arr = out.get(bucket);
    if (arr) arr.push(s);
    else out.set(bucket, [s]);
  }
  return Array.from(out.entries());
}

// --- EXERCISES tab ----------------------------------------------------------

function renderExercises(p: {
  loading: boolean;
  error: string | null;
  groups: ExerciseHistory[];
  refreshing: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  onOpenExercise: (h: ExerciseHistory) => void;
}) {
  if (p.loading && p.groups.length === 0) {
    return <Centered />;
  }
  if (p.error != null && p.groups.length === 0) {
    return (
      <MessageView
        icon="cloud-off"
        title={p.error}
        action={t("common.retry")}
        onAction={p.onRetry}
      />
    );
  }
  if (p.groups.length === 0) {
    return (
      <MessageView
        icon="show-chart"
        title={t("progress.empty_exercises_title")}
        subtitle={t("progress.empty_exercises_subtitle")}
      />
    );
  }
  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 24,
      }}
      refreshControl={
        <RefreshControl
          refreshing={p.refreshing}
          onRefresh={p.onRefresh}
          tintColor={AppColors.onSurface}
        />
      }
    >
      {p.groups.map((g, i) => {
        const latest =
          g.points.length > 0
            ? metricValue("Max Weight", g.points[g.points.length - 1].sets)
            : 0.0;
        return (
          <TouchableOpacity
            key={g.key}
            activeOpacity={0.7}
            onPress={() => p.onOpenExercise(g)}
            style={{
              paddingVertical: 16,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: AppColors.outline,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 16, fontWeight: "700", color: AppColors.onSurface }}
                >
                  {titleCase(g.name)}
                </Text>
                <View style={{ height: 4 }} />
                <Text style={{ fontSize: 13, color: AppColors.muted }}>
                  {t("progress.n_sessions", { n: g.points.length })}
                </Text>
              </View>
              {latest > 0 && (
                <>
                  <Text
                    style={{ fontSize: 18, fontWeight: "800", color: AppColors.onSurface }}
                  >
                    {`${numFmt(latest)} kg`}
                  </Text>
                  <View style={{ width: 4 }} />
                </>
              )}
              <MaterialIcons name="chevron-right" color={AppColors.muted} size={20} />
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// --- shared empty / loading / error views -----------------------------------

function Centered() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={AppColors.onSurface} />
    </View>
  );
}

function MessageView({
  icon,
  title,
  subtitle,
  action,
  onAction,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 32 }}>
      <View style={{ height: 120 }} />
      <View style={{ alignItems: "center" }}>
        <MaterialIcons name={icon} color={AppColors.muted} size={48} />
      </View>
      <View style={{ height: 16 }} />
      <Text
        style={{
          textAlign: "center",
          fontSize: 18,
          fontWeight: "700",
          color: AppColors.onSurface,
        }}
      >
        {title}
      </Text>
      {subtitle != null && (
        <>
          <View style={{ height: 8 }} />
          <Text style={{ textAlign: "center", color: AppColors.muted }}>{subtitle}</Text>
        </>
      )}
      {action != null && onAction != null && (
        <>
          <View style={{ height: 24 }} />
          <View style={{ alignItems: "center" }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onAction}
              style={{
                backgroundColor: AppColors.primary,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 100,
              }}
            >
              <Text style={{ color: AppColors.background, fontWeight: "700" }}>{action}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

// --- per-exercise progression chart screen ----------------------------------

const EXERCISE_RANGES: Record<string, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  All: 0,
};
const EXERCISE_RANGE_KEYS = ["1M", "3M", "6M", "1Y", "All"];

function ExerciseProgressView({
  history,
  onBack,
}: {
  history: ExerciseHistory;
  onBack: () => void;
}) {
  useLang();
  const [metric, setMetric] = useState("1RM");
  const [range, setRange] = useState("All");
  const [chartW, setChartW] = useState(Dimensions.get("window").width - 40);

  const filtered = ((): SessionPoint[] => {
    const days = EXERCISE_RANGES[range] ?? 0;
    if (days === 0) return history.points;
    const cutoff = new Date(Date.now() - days * 86400000);
    const f = history.points.filter((pt) => pt.date.getTime() > cutoff.getTime());
    return f.length === 0 ? history.points : f;
  })();

  const values = filtered.map((pt) => metricValue(metric, pt.sets));
  const unit = metricUnit(metric);
  const current = values.length > 0 ? values[values.length - 1] : 0.0;
  const pct =
    values.length >= 2 && values[0] > 0
      ? ((values[values.length - 1] - values[0]) / values[0]) * 100
      : null;

  return (
    <View style={{ flex: 1 }}>
      <SubHeader title={titleCase(history.name)} onBack={onBack} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 32,
        }}
      >
        {/* Current value + trend. */}
        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          <Text
            style={{
              fontSize: 44,
              fontWeight: "800",
              lineHeight: 44,
              color: AppColors.onSurface,
            }}
          >
            {numFmt(current)}
          </Text>
          {unit.length > 0 && (
            <>
              <View style={{ width: 6 }} />
              <Text
                style={{ fontSize: 18, color: AppColors.muted, paddingBottom: 6 }}
              >
                kg
              </Text>
            </>
          )}
          <View style={{ flex: 1 }} />
          {pct != null && (
            <View
              style={{ flexDirection: "row", alignItems: "center", paddingBottom: 6 }}
            >
              <MaterialIcons
                name={pct >= 0 ? "arrow-upward" : "arrow-downward"}
                size={16}
                color={AppColors.onSurface}
              />
              <View style={{ width: 2 }} />
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: AppColors.onSurface }}
              >
                {`${Math.abs(pct).toFixed(1)} %`}
              </Text>
            </View>
          )}
        </View>
        <View style={{ height: 16 }} />

        {/* Metric tabs. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row" }}>
            {METRICS.map((m) => {
              const active = m === metric;
              return (
                <TouchableOpacity
                  key={m}
                  activeOpacity={0.7}
                  onPress={() => setMetric(m)}
                  style={{ marginRight: 22 }}
                >
                  <View style={{ alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: active ? AppColors.onSurface : AppColors.muted,
                      }}
                    >
                      {metricLabel(m)}
                    </Text>
                    <View style={{ height: 4 }} />
                    {active && (
                      <View
                        style={{ height: 2, width: 36, backgroundColor: AppColors.onSurface }}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        <View style={{ height: 24 }} />

        {/* Chart. */}
        <View
          style={{ height: 180, justifyContent: "center" }}
          onLayout={(e: LayoutChangeEvent) => setChartW(e.nativeEvent.layout.width)}
        >
          {values.length < 2 ? (
            <Text style={{ textAlign: "center", color: AppColors.muted }}>
              {t("progress.chart_need_two")}
            </Text>
          ) : (
            <LineChart values={values} width={chartW} />
          )}
        </View>
        <View style={{ height: 16 }} />

        {/* Time range. */}
        <View style={{ flexDirection: "row" }}>
          {EXERCISE_RANGE_KEYS.map((r) => {
            const active = r === range;
            return (
              <TouchableOpacity
                key={r}
                activeOpacity={0.7}
                onPress={() => setRange(r)}
                style={{
                  marginRight: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 100,
                  backgroundColor: active ? AppColors.primary : "transparent",
                  borderWidth: active ? 0 : 1,
                  borderColor: AppColors.outline,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: active ? AppColors.background : AppColors.muted,
                  }}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

/// Line chart replicating the Dart `_LinePainter` axis/scaling/plot math.
function LineChart({ values, width }: { values: number[]; width: number }) {
  const height = 180;
  if (values.length < 2 || width <= 0) return null;
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi === lo) {
    hi += 1;
    lo -= 1;
  } else {
    const pad = (hi - lo) * 0.15;
    hi += pad;
    lo -= pad;
  }
  const rightPad = 44.0;
  const topPad = 10.0;
  const bottomPad = 10.0;
  const chartW = width - rightPad;
  const chartH = height - topPad - bottomPad;
  const xAt = (i: number) => (i / (values.length - 1)) * chartW;
  const yAt = (v: number) => topPad + (1 - (v - lo) / (hi - lo)) * chartH;

  const grid: { yy: number; val: number }[] = [];
  for (let g = 0; g < 4; g++) {
    const tt = g / 3;
    const yy = topPad + tt * chartH;
    const val = hi - tt * (hi - lo);
    grid.push({ yy, val });
  }

  let d = "";
  for (let i = 0; i < values.length; i++) {
    const x = xAt(i);
    const y = yAt(values[i]);
    d += i === 0 ? `M${x} ${y}` : ` L${x} ${y}`;
  }

  return (
    <Svg width={width} height={height}>
      {grid.map((g, i) => (
        <React.Fragment key={i}>
          <Line
            x1={0}
            y1={g.yy}
            x2={chartW}
            y2={g.yy}
            stroke={AppColors.outline}
            strokeWidth={1}
          />
          <SvgText
            x={chartW + 8}
            y={g.yy + 4}
            fill={AppColors.muted}
            fontSize={11}
          >
            {numFmt(g.val)}
          </SvgText>
        </React.Fragment>
      ))}
      <Path
        d={d}
        stroke={AppColors.onSurface}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map((v, i) => (
        <Circle key={i} cx={xAt(i)} cy={yAt(v)} r={3} fill={AppColors.onSurface} />
      ))}
    </Svg>
  );
}

// --- session detail screen --------------------------------------------------

function SessionDetailView({
  session,
  onBack,
}: {
  session: WorkoutSession;
  onBack: () => void;
}) {
  useLang();
  const started = session.startedAt;
  const finished = session.finishedAt;
  return (
    <View style={{ flex: 1 }}>
      <SubHeader
        title={titleCase(
          session.name.length === 0 ? t("dashboard.workout_default") : session.name,
        )}
        onBack={onBack}
      />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 32,
        }}
      >
        <View style={{ flexDirection: "row" }}>
          <DetailStat
            label={t("progress.detail_done")}
            value={t("progress.detail_sets_value", {
              done: session.doneSets,
              total: session.totalSets,
            })}
          />
          {session.durationMs != null && (
            <DetailStat
              label={t("progress.detail_time")}
              value={fmtDuration(session.durationMs)}
            />
          )}
        </View>
        <View style={{ height: 8 }} />
        {started != null && (
          <Text style={{ color: AppColors.muted, fontSize: 13 }}>
            {t("progress.detail_started", { time: fmtDateTime(started) })}
          </Text>
        )}
        {finished != null && (
          <Text style={{ color: AppColors.muted, fontSize: 13 }}>
            {t("progress.detail_finished", { time: fmtDateTime(finished) })}
          </Text>
        )}
        <View style={{ height: 16 }} />
        {session.exercises.map((ex, i) => (
          <ExerciseBlock key={i} ex={ex} />
        ))}
      </ScrollView>
    </View>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginRight: 32 }}>
      <Text style={{ fontSize: 24, fontWeight: "800", color: AppColors.onSurface }}>
        {value}
      </Text>
      <Text style={{ color: AppColors.muted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function ExerciseBlock({ ex }: { ex: SavedExercise }) {
  return (
    <View
      style={{
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: AppColors.outline,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "700", color: AppColors.onSurface }}>
        {titleCase(ex.name)}
      </Text>
      <View style={{ height: 8 }} />
      {ex.sets.map((s, i) => (
        <View
          key={i}
          style={{ flexDirection: "row", alignItems: "center", paddingVertical: 4 }}
        >
          <View style={{ width: 24 }}>
            <Text style={{ color: AppColors.muted, fontWeight: "700" }}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: AppColors.onSurface, fontSize: 15, fontWeight: "600" }}
            >
              {s.kg > 0 ? `${numFmt(s.kg)} kg` : "BW"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: AppColors.onSurface, fontSize: 15, fontWeight: "600" }}
            >
              {`${s.reps} ${t("common.reps")}`}
            </Text>
          </View>
          <MaterialIcons
            name={s.done ? "check-circle" : "radio-button-unchecked"}
            color={s.done ? AppColors.onSurface : AppColors.outline}
            size={20}
          />
        </View>
      ))}
    </View>
  );
}

// --- sub-screen header (Navigator AppBar + BackButton) ----------------------

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 8,
      }}
    >
      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.7}
        style={{ padding: 8 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialIcons name="arrow-back" size={24} color={AppColors.onSurface} />
      </TouchableOpacity>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: 20,
          fontWeight: "700",
          color: AppColors.onSurface,
        }}
      >
        {title}
      </Text>
    </View>
  );
}
