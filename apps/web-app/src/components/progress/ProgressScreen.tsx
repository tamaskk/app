"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAppData } from "@/lib/useAppData";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Skeleton";
import {
  sessionDistanceM,
  sessionDurationMs,
  type SavedExercise,
  type WorkoutSession,
} from "@/lib/types";
import { e1rm, fmtKm, mondayOf, titleCase } from "@/lib/format";
import { t as rawT } from "@/lib/i18n";

// ---- helpers ----
const num = (v: number) => (v === Math.round(v) ? String(Math.round(v)) : v.toFixed(1));
const fmtVol = (kg: number) =>
  kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`;
const fmtMinH = (min: number) => {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
};
function monthAbbr(d: Date) {
  return rawT(`month.${d.getMonth() + 1}`);
}
const hhmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const fmtDateTime = (d: Date) => `${monthAbbr(d)} ${d.getDate()} · ${hhmm(d)}`;

const doneSetsOf = (ex: SavedExercise) => ex.sets.filter((s) => s.done);
const sessionVol = (s: WorkoutSession) =>
  s.exercises.reduce((a, e) => a + doneSetsOf(e).reduce((b, set) => b + set.kg * set.reps, 0), 0);

/** Session ids that set at least one e1RM PR (chronological scan). */
function prSessionIds(sessions: WorkoutSession[]): Set<string> {
  const sorted = [...sessions]
    .filter((s) => s.finishedAt || s.startedAt)
    .sort((a, b) => dateOf(a).getTime() - dateOf(b).getTime());
  const best: Record<string, number> = {};
  const ids = new Set<string>();
  for (const s of sorted) {
    let pr = false;
    for (const ex of s.exercises) {
      const key = (ex.exerciseId || ex.name.toLowerCase()).toString();
      let sb = 0;
      for (const set of ex.sets) {
        if (set.kg <= 0 || set.reps <= 0) continue;
        sb = Math.max(sb, e1rm(set.kg, set.reps));
      }
      const prior = best[key] ?? 0;
      if (sb > prior + 0.5 && prior > 0) pr = true;
      if (sb > prior) best[key] = sb;
    }
    if (pr) ids.add(s.id);
  }
  return ids;
}

const dateOf = (s: WorkoutSession) => new Date(s.finishedAt ?? s.startedAt ?? 0);

const RANGES: { key: string; days: number }[] = [
  { key: "progress.range_all", days: 0 },
  { key: "progress.range_week", days: 7 },
  { key: "progress.range_month", days: 30 },
  { key: "progress.range_90", days: 90 },
  { key: "progress.range_year", days: 365 },
];

export function ProgressScreen() {
  const { t, tFmt } = useI18n();
  const data = useAppData();
  const [tab, setTab] = useState<0 | 1>(0);
  const [range, setRange] = useState(2); // default MONTH
  const [detailSession, setDetailSession] = useState<WorkoutSession | null>(null);
  const [detailExercise, setDetailExercise] = useState<ExerciseGroup | null>(null);

  const sessions = data.sessions;
  const prIds = useMemo(() => prSessionIds(sessions), [sessions]);

  const totalVolume = useMemo(() => sessions.reduce((a, s) => a + sessionVol(s), 0), [sessions]);

  if (data.loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Spinner size={26} className="text-muted" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-2 lg:px-0">
      {/* Title */}
      <h1 className="text-[32px] font-extrabold uppercase tracking-[-0.03em] text-on-surface">
        {t("progress.title")}
      </h1>
      {sessions.length > 0 && (
        <p className="mt-1 text-[12px] font-bold tracking-[0.1em] text-muted">
          {tFmt("progress.subtitle", { n: sessions.length, vol: fmtVol(totalVolume).toUpperCase() })}
        </p>
      )}

      {/* Tabs */}
      <div className="mt-4 flex">
        {[t("progress.tab_history"), t("progress.tab_exercises")].map((label, i) => (
          <button key={i} onClick={() => setTab(i as 0 | 1)} className="flex flex-col items-center pr-8">
            <span className={`text-xl font-bold ${tab === i ? "text-on-surface" : "text-muted"}`}>{label}</span>
            <span className={`mt-1.5 h-[5px] w-[5px] rounded-full ${tab === i ? "bg-on-surface" : "bg-transparent"}`} />
          </button>
        ))}
      </div>

      {tab === 0 ? (
        <HistoryTab
          sessions={sessions}
          prIds={prIds}
          range={range}
          onRange={setRange}
          onOpen={setDetailSession}
        />
      ) : (
        <ExercisesTab sessions={sessions} onOpen={setDetailExercise} />
      )}

      <div className="h-8" />

      {/* Session detail */}
      <Sheet open={detailSession != null} onClose={() => setDetailSession(null)} maxHeight="85vh">
        {detailSession && <SessionDetail session={detailSession} />}
      </Sheet>

      {/* Exercise detail */}
      <Sheet open={detailExercise != null} onClose={() => setDetailExercise(null)} maxHeight="90vh">
        {detailExercise && <ExerciseDetail group={detailExercise} />}
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History tab
// ---------------------------------------------------------------------------

function HistoryTab({
  sessions,
  prIds,
  range,
  onRange,
  onOpen,
}: {
  sessions: WorkoutSession[];
  prIds: Set<string>;
  range: number;
  onRange: (i: number) => void;
  onOpen: (s: WorkoutSession) => void;
}) {
  const { t, tFmt } = useI18n();

  const filtered = useMemo(() => {
    const days = RANGES[range].days;
    const cutoff = days ? Date.now() - days * 86_400_000 : 0;
    return sessions
      .filter((s) => (s.finishedAt || s.startedAt) && dateOf(s).getTime() > cutoff)
      .sort((a, b) => dateOf(b).getTime() - dateOf(a).getTime());
  }, [sessions, range]);

  if (sessions.length === 0) {
    return (
      <MessageBlock
        icon="trending_up"
        title={t("progress.empty_history_title")}
        subtitle={t("progress.empty_history_subtitle")}
      />
    );
  }

  const count = filtered.length;
  const volume = filtered.reduce((a, s) => a + sessionVol(s), 0);
  const minutes = filtered.reduce((a, s) => {
    const ms = sessionDurationMs(s);
    return a + (ms ? Math.floor(ms / 60000) : 0);
  }, 0);
  const prs = filtered.filter((s) => prIds.has(s.id)).length;

  // buckets
  const buckets = bucketize(filtered);

  return (
    <div className="mt-2">
      {/* range strip */}
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 py-1 lg:mx-0">
        {RANGES.map((r, i) => (
          <button
            key={r.key}
            onClick={() => onRange(i)}
            className={`shrink-0 rounded-full px-4 py-2.5 text-[12px] font-extrabold tracking-[0.1em] transition-colors ${
              i === range ? "bg-primary text-background" : "bg-surface-low text-on-surface"
            }`}
          >
            {t(r.key)}
          </button>
        ))}
      </div>

      {/* stat hero */}
      <div className="mt-4 grid grid-cols-4 gap-2 rounded-[20px] bg-surface-low p-4">
        <Stat value={String(count)} label={t("progress.stat_workouts")} />
        <Stat value={fmtVol(volume).split(" ")[0]} label={t("progress.stat_lifted")} />
        <Stat value={fmtMinH(minutes)} label={t("progress.stat_active_time")} />
        <Stat value={String(prs)} label="PR" />
      </div>

      {/* buckets */}
      {buckets.map(({ label, items }) => (
        <div key={label}>
          <p className="pb-1 pt-5 text-[11px] font-extrabold tracking-[0.14em] text-muted">{t(label)}</p>
          {items.map((s, i) => {
            const d = dateOf(s);
            const dur = sessionDurationMs(s);
            const vol = sessionVol(s);
            const dist = sessionDistanceM(s);
            const sub = [
              s.finishedAt ? fmtDateTime(d) : null,
              dur ? fmtMinH(Math.floor(dur / 60000)) : null,
              dist > 0 ? fmtKm(dist) : tFmt("progress.n_exercises", { n: s.exercises.length }),
              dist <= 0 && vol > 0 ? fmtVol(vol) : null,
            ]
              .filter(Boolean)
              .join(" · ")
              .toUpperCase();
            return (
              <button
                key={s.id}
                onClick={() => onOpen(s)}
                className={`flex w-full items-center justify-between py-4 text-left ${i > 0 ? "border-t border-outline" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-lg font-extrabold tracking-[-0.02em] text-on-surface">
                      {titleCase(s.name || t("dashboard.workout_default"))}
                    </span>
                    {prIds.has(s.id) && (
                      <span className="rounded border border-on-surface px-1.5 py-0.5 text-[10px] font-extrabold tracking-[0.12em] text-on-surface">
                        PR
                      </span>
                    )}
                  </div>
                  <div className="mt-1 line-clamp-2 text-[12px] tracking-[0.02em] text-muted">{sub}</div>
                </div>
                <span className="px-3 text-xl font-extrabold text-on-surface">
                  {doneCountOf(s)}/{totalOf(s)}
                </span>
                <Icon name="chevron_right" size={22} className="text-muted" />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const doneCountOf = (s: WorkoutSession) => s.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0);
const totalOf = (s: WorkoutSession) => s.exercises.reduce((a, e) => a + e.sets.length, 0);

function bucketize(sessions: WorkoutSession[]): { label: string; items: WorkoutSession[] }[] {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const thisMon = mondayOf(now).getTime();
  const order = [
    "progress.bucket_today",
    "progress.bucket_yesterday",
    "progress.bucket_this_week",
    "progress.bucket_this_month",
    "progress.bucket_earlier",
  ];
  const map = new Map<string, WorkoutSession[]>();
  for (const s of sessions) {
    const d = dateOf(s);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((startToday - dayStart) / 86_400_000);
    let label: string;
    if (diffDays <= 0) label = "progress.bucket_today";
    else if (diffDays === 1) label = "progress.bucket_yesterday";
    else if (dayStart >= thisMon) label = "progress.bucket_this_week";
    else if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth())
      label = "progress.bucket_this_month";
    else label = "progress.bucket_earlier";
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(s);
  }
  return order.filter((l) => map.has(l)).map((l) => ({ label: l, items: map.get(l)! }));
}

// ---------------------------------------------------------------------------
// Exercises tab
// ---------------------------------------------------------------------------

type ExercisePoint = { date: Date; sets: { kg: number; reps: number; done: boolean }[] };
type ExerciseGroup = { key: string; name: string; points: ExercisePoint[] };

function ExercisesTab({
  sessions,
  onOpen,
}: {
  sessions: WorkoutSession[];
  onOpen: (g: ExerciseGroup) => void;
}) {
  const { t, tFmt } = useI18n();

  const groups = useMemo(() => {
    const map = new Map<string, ExerciseGroup>();
    const sorted = [...sessions]
      .filter((s) => s.finishedAt || s.startedAt)
      .sort((a, b) => dateOf(a).getTime() - dateOf(b).getTime());
    for (const s of sorted) {
      for (const ex of s.exercises) {
        const key = (ex.exerciseId || ex.name.toLowerCase()).toString();
        if (!map.has(key)) map.set(key, { key, name: ex.name, points: [] });
        map.get(key)!.points.push({ date: dateOf(s), sets: ex.sets });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions]);

  if (groups.length === 0) {
    return (
      <MessageBlock
        icon="trending_up"
        title={t("progress.empty_exercises_title")}
        subtitle={t("progress.empty_exercises_subtitle")}
      />
    );
  }

  return (
    <div className="mt-2">
      {groups.map((g, i) => {
        const latest = g.points[g.points.length - 1];
        const maxKg = Math.max(0, ...latest.sets.filter((s) => s.done).map((s) => s.kg));
        return (
          <button
            key={g.key}
            onClick={() => onOpen(g)}
            className={`flex w-full items-center justify-between py-4 text-left ${i > 0 ? "border-t border-outline" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-bold text-on-surface">{titleCase(g.name)}</div>
              <div className="mt-1 text-[13px] text-muted">{tFmt("progress.n_sessions", { n: g.points.length })}</div>
            </div>
            {maxKg > 0 && <span className="pr-1 text-lg font-extrabold text-on-surface">{num(maxKg)} kg</span>}
            <Icon name="chevron_right" size={20} className="text-muted" />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail views
// ---------------------------------------------------------------------------

function SessionDetail({ session }: { session: WorkoutSession }) {
  const { t, tFmt } = useI18n();
  const dur = sessionDurationMs(session);
  return (
    <div className="px-5 pb-4 pt-1">
      <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-on-surface">
        {titleCase(session.name || t("dashboard.workout_default"))}
      </h2>
      <div className="mt-4 flex">
        <div className="pr-8">
          <p className="text-2xl font-extrabold text-on-surface">
            {tFmt("progress.detail_sets_value", { done: doneCountOf(session), total: totalOf(session) })}
          </p>
          <p className="text-[12px] text-muted">{t("progress.detail_done")}</p>
        </div>
        {dur && (
          <div>
            <p className="text-2xl font-extrabold text-on-surface">{fmtMinH(Math.floor(dur / 60000))}</p>
            <p className="text-[12px] text-muted">{t("progress.detail_time")}</p>
          </div>
        )}
      </div>
      <div className="mt-4">
        {session.exercises.map((ex, i) => (
          <div key={ex.exerciseId + i} className="border-t border-outline py-4">
            <p className="text-base font-bold text-on-surface">{titleCase(ex.name)}</p>
            <div className="mt-2">
              {ex.sets.map((s, j) => (
                <div key={j} className="flex items-center py-1">
                  <span className="w-6 text-[13px] font-bold text-muted">{j + 1}</span>
                  <span className="flex-1 text-[15px] font-semibold text-on-surface">{s.kg > 0 ? `${num(s.kg)} kg` : "BW"}</span>
                  <span className="flex-1 text-[15px] font-semibold text-on-surface">{s.reps} {t("common.reps")}</span>
                  <Icon name={s.done ? "check_circle" : "radio_unchecked"} size={20} className={s.done ? "text-on-surface" : "text-outline"} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const METRICS = [
  { key: "1rm", label: "progress.metric_1rm", unit: true },
  { key: "max", label: "progress.metric_max_weight", unit: true },
  { key: "vol", label: "progress.metric_volume", unit: true },
  { key: "reps", label: "progress.metric_total_reps", unit: false },
];

function metricValue(metric: string, sets: { kg: number; reps: number; done: boolean }[]): number {
  const done = sets.filter((s) => s.done);
  if (metric === "1rm") return Math.max(0, ...done.map((s) => e1rm(s.kg, s.reps)));
  if (metric === "max") return Math.max(0, ...done.map((s) => s.kg));
  if (metric === "vol") return done.reduce((a, s) => a + s.kg * s.reps, 0);
  return done.reduce((a, s) => a + s.reps, 0);
}

function ExerciseDetail({ group }: { group: ExerciseGroup }) {
  const { t } = useI18n();
  const [metric, setMetric] = useState("1rm");
  const values = group.points.map((p) => metricValue(metric, p.sets));
  const current = values[values.length - 1] ?? 0;
  const first = values[0] ?? 0;
  const pct = values.length >= 2 && first > 0 ? ((current - first) / first) * 100 : null;
  const hasUnit = METRICS.find((m) => m.key === metric)?.unit;

  return (
    <div className="px-5 pb-6 pt-1">
      <h2 className="text-xl font-extrabold tracking-[-0.02em] text-on-surface">{titleCase(group.name)}</h2>

      <div className="mt-4 flex items-end">
        <span className="text-[44px] font-extrabold leading-none text-on-surface">{num(current)}</span>
        {hasUnit && <span className="ml-1.5 pb-1 text-lg text-muted">kg</span>}
        <div className="flex-1" />
        {pct != null && (
          <span className="flex items-center text-sm font-semibold text-on-surface">
            <Icon name={pct >= 0 ? "arrow_upward" : "arrow_downward"} size={16} />
            {Math.abs(pct).toFixed(1)} %
          </span>
        )}
      </div>

      {/* metric tabs */}
      <div className="no-scrollbar mt-4 flex gap-6 overflow-x-auto">
        {METRICS.map((m) => (
          <button key={m.key} onClick={() => setMetric(m.key)} className="flex shrink-0 flex-col items-start">
            <span className={`text-sm font-semibold ${metric === m.key ? "text-on-surface" : "text-muted"}`}>
              {t(m.label)}
            </span>
            <span className={`mt-1 h-0.5 w-9 ${metric === m.key ? "bg-on-surface" : "bg-transparent"}`} />
          </button>
        ))}
      </div>

      {/* chart */}
      <div className="mt-6">
        {values.length < 2 ? (
          <div className="flex h-[180px] items-center justify-center text-center text-muted">
            {t("progress.chart_need_two")}
          </div>
        ) : (
          <LineChart values={values} />
        )}
      </div>
    </div>
  );
}

function LineChart({ values }: { values: number[] }) {
  const W = 320;
  const H = 180;
  const rightPad = 44;
  const topPad = 10;
  const bottomPad = 10;
  const chartW = W - rightPad;
  const chartH = H - topPad - bottomPad;
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
  const n = values.length;
  const x = (i: number) => (i / (n - 1)) * chartW;
  const y = (v: number) => topPad + (1 - (v - lo) / (hi - lo)) * chartH;
  const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const grid = [0, 1, 2, 3];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
      {grid.map((g) => {
        const tt = g / 3;
        const gy = topPad + tt * chartH;
        return (
          <g key={g}>
            <line x1={0} y1={gy} x2={chartW} y2={gy} stroke="var(--color-outline)" strokeWidth={1} />
            <text x={chartW + 8} y={gy + 4} fill="var(--color-muted)" fontSize={11}>
              {num(hi - tt * (hi - lo))}
            </text>
          </g>
        );
      })}
      <polyline
        points={pts}
        fill="none"
        stroke="var(--color-on-surface)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={3} fill="var(--color-on-surface)" />
      ))}
    </svg>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="truncate text-[26px] font-extrabold leading-none tracking-[-0.03em] text-on-surface">{value}</span>
      <span className="mt-1 text-[10px] font-bold tracking-[0.12em] text-muted">{label}</span>
    </div>
  );
}

function MessageBlock({ icon, title, subtitle }: { icon: "trending_up"; title: string; subtitle?: string }) {
  return (
    <div className="flex min-h-[45vh] flex-col items-center justify-center px-8 text-center">
      <Icon name={icon} size={48} className="text-muted" />
      <h2 className="mt-4 text-lg font-bold text-on-surface">{title}</h2>
      {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
