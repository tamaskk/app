"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAppData } from "@/lib/useAppData";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth";
import {
  doneSets,
  sessionDistanceM,
  totalSets as sessionTotalSets,
  type WorkoutSession,
} from "@/lib/types";
import {
  bestWeeklyStreak,
  dayKey,
  e1rm,
  fmtKm,
  fmtVolume,
  mondayOf,
  monthFull,
  titleCase,
  volumeUnit,
  weeklyStreak,
} from "@/lib/format";

const WEEKDAY_KEYS = [
  "plan.day_short_h", "plan.day_short_k", "plan.day_short_sze",
  "plan.day_short_cs", "plan.day_short_p", "plan.day_short_szo", "plan.day_short_v",
];

function sessionDate(s: WorkoutSession): Date | null {
  const d = s.finishedAt ?? s.startedAt;
  return d ? new Date(d) : null;
}

export function CalendarScreen() {
  const { t, tFmt } = useI18n();
  const { user } = useAuth();
  const data = useAppData();
  const [monthRef, setMonthRef] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selected, setSelected] = useState<Date | null>(null);

  const dated = useMemo(
    () => data.sessions.map((s) => ({ s, d: sessionDate(s) })).filter((x): x is { s: WorkoutSession; d: Date } => x.d != null),
    [data.sessions],
  );
  const workoutDays = useMemo(() => new Set(dated.map((x) => dayKey(x.d))), [dated]);

  const streak = useMemo(() => weeklyStreak(dated.map((x) => x.d)), [dated]);
  const best = useMemo(() => bestWeeklyStreak(dated.map((x) => x.d)), [dated]);

  const weeklyGoal = user?.onboarding?.daysPerWeek || 3;
  const weeklyDone = useMemo(() => {
    const mon = mondayOf(new Date()).getTime();
    const next = mon + 7 * 86_400_000;
    return new Set(dated.filter((x) => x.d.getTime() >= mon && x.d.getTime() < next).map((x) => dayKey(x.d))).size;
  }, [dated]);

  const prsThisMonth = useMemo(() => computePrsThisMonth(dated), [dated]);

  if (data.loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Spinner size={26} className="text-muted" />
      </div>
    );
  }

  const weeklyProgress = Math.max(0, Math.min(1, weeklyGoal ? weeklyDone / weeklyGoal : 0));

  // month grid (Monday-first)
  const year = monthRef.getFullYear();
  const month = monthRef.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const selectedSessions = selected ? dated.filter((x) => dayKey(x.d) === dayKey(selected)).map((x) => x.s) : [];

  // month stats
  const monthSessions = dated.filter((x) => x.d.getFullYear() === year && x.d.getMonth() === month);
  const lastMonth = new Date(year, month - 1, 1);
  const lastMonthCount = dated.filter((x) => x.d.getFullYear() === lastMonth.getFullYear() && x.d.getMonth() === lastMonth.getMonth()).length;
  const delta = monthSessions.length - lastMonthCount;
  const monthVolume = monthSessions.reduce(
    (a, x) => a + x.s.exercises.reduce((b, e) => b + e.sets.reduce((c, s) => c + s.kg * s.reps, 0), 0),
    0,
  );

  const today = new Date();

  return (
    <div className="px-5 pt-2 lg:px-0">
      <h1 className="text-[32px] font-extrabold tracking-[-0.03em] text-on-surface">{t("calendar.title_caps")}</h1>
      <p className="mt-1.5 text-[12px] font-bold tracking-[0.1em] text-muted">
        {tFmt("calendar.summary_caps", { sessions: data.sessions.length, streak: best, pr: prsThisMonth })}
      </p>

      <div className="mt-5 lg:grid lg:grid-cols-2 lg:gap-4">
        {/* Streak hero */}
        <div className="flex flex-col items-center rounded-[20px] bg-surface-low px-[18px] py-[22px]">
          <span className="text-[72px] font-extrabold leading-none tracking-[-0.06em] text-on-surface">{streak}</span>
          <span className="mt-1.5 text-center text-[11px] font-bold tracking-[0.12em] text-muted">
            {t("calendar.streak_hint_caps")}
          </span>
        </div>

        {/* Week progress */}
        <div className="mt-4 rounded-[20px] bg-surface-low px-[18px] py-4 lg:mt-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold tracking-[0.12em] text-muted">{t("calendar.this_week")}</span>
            <span className="text-sm font-extrabold text-on-surface">{weeklyDone}/{weeklyGoal}</span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-high">
            <div className="h-full rounded-full bg-on-surface" style={{ width: `${weeklyProgress * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Month card */}
      <div className="mt-5 rounded-[20px] bg-surface-low p-[18px]">
        <div className="flex items-center">
          <span className="mr-2.5 h-2 w-2 rounded-full bg-on-surface" />
          <span className="flex-1 text-base font-extrabold tracking-[-0.02em] text-on-surface">
            {monthFull(month)} {year}
          </span>
          <button onClick={() => { setMonthRef(new Date(year, month - 1, 1)); setSelected(null); }} className="p-1 text-muted">
            <Icon name="chevron_left" size={22} />
          </button>
          <button onClick={() => { setMonthRef(new Date(year, month + 1, 1)); setSelected(null); }} className="p-1 text-muted">
            <Icon name="chevron_right" size={22} />
          </button>
        </div>
        <div className="mt-3.5 flex">
          {WEEKDAY_KEYS.map((k) => (
            <span key={k} className="flex-1 text-center text-[10px] font-bold tracking-[0.12em] text-muted">
              {t(k)}
            </span>
          ))}
        </div>
        <div className="mt-2">
          {rows.map((row, ri) => (
            <div key={ri} className="flex py-0.5">
              {row.map((d, ci) => {
                if (!d) return <div key={ci} className="h-10 flex-1" />;
                const has = workoutDays.has(dayKey(d));
                const isToday = dayKey(d) === dayKey(today);
                const isSel = selected != null && dayKey(d) === dayKey(selected);
                return (
                  <div key={ci} className="flex h-10 flex-1 items-center justify-center">
                    <button
                      onClick={() => setSelected(d)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold"
                      style={{
                        background: has ? "var(--color-on-surface)" : "transparent",
                        color: has ? "var(--color-background)" : "var(--color-on-surface)",
                        border: isSel
                          ? "1.5px solid var(--color-on-surface)"
                          : isToday
                            ? "1px solid var(--color-muted)"
                            : "none",
                      }}
                    >
                      {d.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Day detail */}
      {selected && (
        <div className="mt-4 rounded-[20px] bg-surface-low px-[18px] py-4">
          <p className="text-[11px] font-extrabold tracking-[0.12em] text-muted">
            {monthFull(selected.getMonth())} {selected.getDate()}
          </p>
          {selectedSessions.length === 0 ? (
            <>
              <p className="mt-1.5 text-lg font-extrabold text-on-surface">{t("calendar.rest_day_text")}</p>
              <p className="mt-1 text-[13px] text-muted">{t("calendar.no_workout_on_day")}</p>
            </>
          ) : (
            selectedSessions.map((s, i) => (
              <div key={s.id} className={i > 0 ? "mt-4" : "mt-1.5"}>
                <p className="text-lg font-extrabold text-on-surface">
                  {titleCase(s.name || t("dashboard.workout_default"))}
                </p>
                <p className="mt-1 text-[12px] text-muted">
                  {sessionDistanceM(s) > 0
                    ? fmtKm(sessionDistanceM(s))
                    : `${s.exercises.length} ${t("dashboard.exercises_short_caps")} · ${doneSets(s)}/${sessionTotalSets(s)} set`}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* This-month stats */}
      <div className="mt-6">
        {monthSessions.length === 0 ? (
          <div className="rounded-[20px] bg-surface-low p-5 text-center text-muted">
            {t("calendar.no_workout_this_month")}
          </div>
        ) : (
          <>
            <p className="text-[11px] font-extrabold tracking-[0.12em] text-muted">{t("calendar.this_month")}</p>
            <div className="mt-2.5 flex items-start justify-between rounded-[20px] bg-surface-low px-[18px] py-4">
              <div>
                <p className="text-sm font-extrabold text-on-surface">
                  {tFmt("calendar.sessions_count_caps", { n: monthSessions.length })}
                </p>
                <p className="mt-1 text-[11px] font-bold tracking-[0.1em] text-muted">
                  {delta > 0
                    ? tFmt("calendar.delta_up", { n: delta })
                    : delta < 0
                      ? tFmt("calendar.delta_down", { n: delta })
                      : t("calendar.delta_same")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold text-on-surface">
                  {fmtVolume(monthVolume)} {volumeUnit(monthVolume)}
                </p>
                <p className="text-[10px] font-bold tracking-[0.12em] text-muted">
                  {t("dashboard.stat_lifted").toUpperCase()}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="h-8" />
    </div>
  );
}

function computePrsThisMonth(dated: { s: WorkoutSession; d: Date }[]): number {
  const sorted = [...dated].sort((a, b) => a.d.getTime() - b.d.getTime());
  const best: Record<string, number> = {};
  const now = new Date();
  let count = 0;
  for (const { s, d } of sorted) {
    let isPr = false;
    for (const ex of s.exercises) {
      const key = (ex.exerciseId || ex.name.toLowerCase()).toString();
      let sessionBest = 0;
      for (const set of ex.sets) {
        if (set.kg <= 0 || set.reps <= 0) continue;
        sessionBest = Math.max(sessionBest, e1rm(set.kg, set.reps));
      }
      const prior = best[key] ?? 0;
      if (sessionBest > prior + 0.5 && prior > 0) isPr = true;
      if (sessionBest > prior) best[key] = sessionBest;
    }
    if (isPr && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) count++;
  }
  return count;
}
