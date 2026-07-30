"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useAppData } from "@/lib/useAppData";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { AccountSheet } from "@/components/shell/AccountSheet";
import { DashboardSkeleton } from "./DashboardSkeleton";
import {
  displayName,
  doneSets,
  sessionDistanceM,
  sessionDurationMs,
  totalSets as trainingTotalSets,
  type SavedTraining,
  type WorkoutSession,
} from "@/lib/types";
import { doneCount, type WorkoutProgress } from "@/lib/workoutProgress";
import {
  dayKey,
  e1rm,
  fmtCount,
  fmtKm,
  fmtTimeMin,
  fmtVolume,
  pad2,
  relativeDayLabel,
  rankNumeral,
  titleCase,
  volumeUnit,
  weeklyStreak,
} from "@/lib/format";
import { dayShort, monthShort } from "@/lib/dayLabels";

const SPLIT_LABELS: Record<string, string> = {
  upper_lower: "Upper / Lower",
  push_pull_legs: "Push / Pull / Legs",
  bro: "Bro split",
  full_body: "Full Body",
};

export function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, tFmt, lang } = useI18n();
  const data = useAppData({ withStagnation: true });
  const [accountOpen, setAccountOpen] = useState(false);
  const [stagOpen, setStagOpen] = useState(false);

  // 29-day strip: 14 before … today … 14 after. Today = index 14.
  const days = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 29 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + (i - 14));
      return d;
    });
  }, []);
  const [selectedIndex, setSelectedIndex] = useState(14);

  const workoutDays = useMemo(() => {
    const s = new Set<string>();
    for (const se of data.sessions) {
      if (se.finishedAt) s.add(dayKey(new Date(se.finishedAt)));
      else if (se.startedAt) s.add(dayKey(new Date(se.startedAt)));
    }
    return s;
  }, [data.sessions]);

  const streak = useMemo(
    () =>
      weeklyStreak(
        data.sessions
          .map((s) => (s.finishedAt ? new Date(s.finishedAt) : null))
          .filter((d): d is Date => d != null),
      ),
    [data.sessions],
  );

  const weeklyGoal = user?.onboarding?.daysPerWeek ?? 3;
  const weeklyDone = useMemo(() => {
    const now = new Date();
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    mon.setHours(0, 0, 0, 0);
    const next = new Date(mon);
    next.setDate(mon.getDate() + 7);
    return data.sessions.filter((s) => {
      const d = s.finishedAt ? new Date(s.finishedAt) : null;
      return d && d >= mon && d < next;
    }).length;
  }, [data.sessions]);

  if (data.loading) return <DashboardSkeleton />;

  const name = user ? displayName(user) : "Alex";
  const selectedDay = days[selectedIndex];
  const isToday = dayKey(selectedDay) === dayKey(new Date());
  const isPast = selectedDay < new Date(new Date().setHours(0, 0, 0, 0));

  const sessionsOnDay = data.sessions.filter((s) => {
    const d = s.finishedAt ?? s.startedAt;
    return d && dayKey(new Date(d)) === dayKey(selectedDay);
  });

  // ----- personal headline -----
  const monthVolume = (() => {
    const now = new Date();
    return data.sessions
      .filter((s) => {
        const d = s.finishedAt ? new Date(s.finishedAt) : null;
        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce(
        (a, s) => a + s.exercises.reduce((b, e) => b + e.sets.reduce((c, set) => c + set.kg * set.reps, 0), 0),
        0,
      );
  })();
  let headline: string | null = null;
  if (monthVolume >= 100) {
    const key = volumeUnit(monthVolume) === "t" ? "dashboard.month_total_t" : "dashboard.month_total_kg";
    headline = tFmt(key, { kg: fmtVolume(monthVolume) });
  } else if (user?.onboarding?.split && user?.onboarding?.daysPerWeek) {
    headline = tFmt("dashboard.split_per_week", {
      split: SPLIT_LABELS[user.onboarding.split] ?? user.onboarding.split,
      days: user.onboarding.daysPerWeek,
    });
  }

  // ----- recent PR -----
  const pr = findRecentPr(data.sessions);

  // ----- stats -----
  const totalSetsAll = data.sessions.reduce((a, s) => a + trainingTotalSets(s), 0);
  const totalVolume = data.sessions.reduce(
    (a, s) => a + s.exercises.reduce((b, e) => b + e.sets.reduce((c, set) => c + set.kg * set.reps, 0), 0),
    0,
  );
  const totalMinutes = data.sessions.reduce((a, s) => {
    const ms = sessionDurationMs(s);
    return a + (ms ? Math.floor(ms / 60000) : 0);
  }, 0);

  const weeklyLabel = tFmt("dashboard.weekly_done", { done: weeklyDone, goal: weeklyGoal });
  const progress = Math.max(0, Math.min(1, weeklyGoal ? weeklyDone / weeklyGoal : 0));

  const openWorkout = (id: string) => router.push(`/workout/${id}`);

  return (
    <div className="px-5 pt-2 lg:px-0">
      {/* ---------- App bar ---------- */}
      <header className="flex h-14 items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-xl bg-surface-low px-2.5 py-[5px]">
            <Icon name="fire" size={15} className="text-accent-amber" />
            <span className="text-sm font-extrabold leading-none tracking-[-0.02em] text-on-surface">
              {streak}
            </span>
          </div>
          <button
            onClick={() => setAccountOpen(true)}
            className="flex items-center gap-1 rounded-xl bg-surface-low px-2.5 py-[5px]"
          >
            <Icon name="medal" size={15} className="text-muted" />
            <span className="text-sm font-extrabold leading-none tracking-[-0.02em] text-on-surface">
              {rankNumeral(user?.rank ?? 1)}
            </span>
          </button>
        </div>
        <span className="text-base font-bold tracking-[0.03em] text-on-surface">HEFTOR</span>
        <div className="flex items-center gap-1">
          <button onClick={() => router.push("/create")} className="p-2 text-on-surface">
            <Icon name="add" size={24} />
          </button>
          <button onClick={() => setAccountOpen(true)} className="p-2 text-on-surface">
            <Icon name="person" size={22} />
          </button>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[1.4fr_1fr] lg:gap-10">
        <div>
          {/* ---------- Header greeting ---------- */}
          <div className="mt-2 flex flex-col items-start">
            <span className="text-base text-muted">{t("dashboard.hi")}</span>
            <span className="max-w-full truncate text-[48px] font-extrabold leading-none tracking-[-0.04em] text-on-surface">
              {name}
            </span>
            {headline && <span className="mt-1.5 text-[13px] font-semibold text-muted">{headline}</span>}
          </div>

          <div className="h-6" />

          {/* ---------- Week strip ---------- */}
          <WeekStrip
            days={days}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            workoutDays={workoutDays}
          />

          {/* ---------- Banners ---------- */}
          {pr && (
            <button
              onClick={() => router.push("/progress")}
              className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-on-surface px-4 py-3.5 text-left"
            >
              <Icon name="trophy" size={22} className="text-background" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-extrabold tracking-[0.14em] text-[#6B6B6B]">
                  {t("dashboard.new_pr")}
                </div>
                <div className="mt-0.5 truncate text-[15px] font-extrabold leading-[1.15] text-background">
                  {titleCase(pr.name)}
                </div>
                <div className="mt-0.5 text-[12px] font-bold text-[#6B6B6B]">
                  {fmtKg(pr.kg)} kg × {pr.reps} · {relativeDayLabel(pr.date)}
                </div>
              </div>
              <Icon name="chevron_right" size={18} className="text-[#6B6B6B]" />
            </button>
          )}

          {data.stagnation.length > 0 && (
            <button
              onClick={() => setStagOpen(true)}
              className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-surface-high bg-surface-low px-4 py-3.5 text-left"
            >
              <span className="flex-1 text-[12px] font-extrabold tracking-[0.1em] text-on-surface">
                {tFmt("dashboard.stagnation_label", { n: data.stagnation.length })}
              </span>
              <Icon name="chevron_right" size={18} className="text-on-surface" />
            </button>
          )}

          <div className="h-6" />

          {/* ---------- Quick actions ---------- */}
          <div className="grid grid-cols-2 gap-3">
            <QuickTile icon="add" label={t("quick.new_workout")} onClick={() => router.push("/create")} />
            <QuickTile icon="sparkles" label={t("quick.generate")} onClick={() => router.push("/trainings")} />
            <QuickTile icon="dumbbell" label={t("quick.trainings")} onClick={() => router.push("/trainings")} />
            <QuickTile icon="trending_up" label={t("quick.progress")} onClick={() => router.push("/progress")} />
            <button
              onClick={() => router.push("/log-run")}
              className="col-span-2 flex items-center gap-3 rounded-[18px] bg-surface-low px-4 py-[18px] text-left"
            >
              <Icon name="run" size={22} className="text-on-surface" />
              <span className="text-sm font-bold text-on-surface">
                {lang === "hu" ? "Futás naplózása" : "Log a run"}
              </span>
            </button>
          </div>

          <div className="h-6" />

          {/* ---------- Day content ---------- */}
          <DayContent
            selectedDay={selectedDay}
            isToday={isToday}
            isPast={isPast}
            sessionsOnDay={sessionsOnDay}
            trainings={[...data.trainings, ...data.resumableExtra]}
            sessions={data.sessions}
            inProgress={data.inProgress}
            weeklyLabel={weeklyLabel}
            progress={progress}
            onOpenWorkout={openWorkout}
          />
        </div>

        <div>
          <div className="h-6 lg:hidden" />

          {/* ---------- Plan section ---------- */}
          {user?.onboarding && (user.weeklyPlan || (user.onboarding.split && user.onboarding.daysPerWeek)) && (
            <div className="mt-6 lg:mt-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium tracking-[0.14em] text-muted">
                  {t("dashboard.weekly_plan")}
                </span>
                <Icon name="tune" size={14} className="text-muted" />
              </div>
              <div className="h-3" />
              <WeekPreview
                customPlan={user.weeklyPlan ?? null}
                daysPerWeek={user.onboarding.daysPerWeek ?? 3}
              />
            </div>
          )}

          <div className="h-6" />

          {/* ---------- Stats ---------- */}
          <div>
            <span className="text-[12px] font-medium tracking-[0.14em] text-muted">
              {t("dashboard.summary")}
            </span>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <StatCard value={fmtCount(totalSetsAll)} label={t("dashboard.stat_total_sets")} />
              <StatCard value={fmtVolume(totalVolume)} unit={volumeUnit(totalVolume)} label={t("dashboard.stat_lifted")} />
              <StatCard value={fmtTimeMin(totalMinutes)} label={t("dashboard.stat_active_time")} />
              <StatCard value={String(data.sessions.length)} label={t("dashboard.stat_sessions")} />
            </div>
          </div>
        </div>
      </div>

      <div className="h-6" />

      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />

      {/* ---------- Stagnation sheet ---------- */}
      <Sheet open={stagOpen} onClose={() => setStagOpen(false)} maxHeight="70vh">
        <div className="px-5 pb-4 pt-1">
          <span className="text-[12px] font-bold tracking-[0.12em] text-muted">
            {t("dashboard.stagnation_badge")}
          </span>
          <div className="mt-2">
            {data.stagnation.map((item, i) => (
              <div key={item.exerciseId + i} className={`py-3.5 ${i > 0 ? "border-t border-outline" : ""}`}>
                <div className="text-base font-bold text-on-surface">{titleCase(item.name)}</div>
                <div className="mt-1 text-[13px] text-muted">
                  {tFmt("dashboard.weeks_stagnant", { n: item.weeksStagnant })}
                  {item.tips.length > 0 && ` · ${item.tips.join(" / ")}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WeekStrip({
  days,
  selectedIndex,
  onSelect,
  workoutDays,
}: {
  days: Date[];
  selectedIndex: number;
  onSelect: (i: number) => void;
  workoutDays: Set<string>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(`[data-idx="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={ref} className="no-scrollbar -mx-5 flex h-[72px] overflow-x-auto px-0 lg:mx-0">
      {days.map((d, i) => {
        const selected = i === selectedIndex;
        const has = workoutDays.has(dayKey(d));
        const fg = selected ? "text-on-surface" : "text-muted";
        return (
          <button
            key={i}
            data-idx={i}
            onClick={() => onSelect(i)}
            className="flex shrink-0 basis-[14.2857%] flex-col items-center py-2"
          >
            <span className={`text-[11px] font-medium ${fg}`}>{dayShort(d)}</span>
            <span className={`mt-1 text-sm ${selected ? "font-extrabold" : "font-bold"} ${fg}`}>
              {d.getDate()}
            </span>
            <span
              className={`mt-1.5 h-[3px] rounded-full ${
                selected ? "w-[18px] bg-on-surface" : has ? "w-[14px] bg-muted" : "w-[14px] bg-transparent"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

function DayContent({
  selectedDay,
  isToday,
  isPast,
  sessionsOnDay,
  trainings,
  sessions,
  inProgress,
  weeklyLabel,
  progress,
  onOpenWorkout,
}: {
  selectedDay: Date;
  isToday: boolean;
  isPast: boolean;
  sessionsOnDay: WorkoutSession[];
  trainings: SavedTraining[];
  sessions: WorkoutSession[];
  inProgress: Record<string, WorkoutProgress>;
  weeklyLabel: string;
  progress: number;
  onOpenWorkout: (id: string) => void;
}) {
  const { t, tFmt } = useI18n();
  const dateLabel = isToday ? t("dashboard.today_short") : `${monthShort(selectedDay)} ${selectedDay.getDate()}`;

  // Branch A — sessions on this day
  if (sessionsOnDay.length > 0) {
    const [first, ...rest] = sessionsOnDay;
    const dur = sessionDurationMs(first);
    const durLabel = dur ? ` • ${Math.floor(dur / 60000)}p` : "";
    return (
      <div>
        <HeroCard
          label={`${dateLabel}${durLabel} • ${t("dashboard.done_short")}`.toUpperCase()}
          title={titleCase(first.name || t("dashboard.workout_default"))}
          bigNumber={first.exercises.length}
          progress={progress}
          progressLabel={weeklyLabel}
        />
        {rest.map((s) => (
          <ListCard
            key={s.id}
            title={titleCase(s.name || t("dashboard.workout_default"))}
            subtitle={sessionDistanceM(s) > 0 ? fmtKm(sessionDistanceM(s)) : `${doneSets(s)}/${trainingTotalSets(s)} set`}
            bigNumber={s.exercises.length}
            finished={trainingTotalSets(s) > 0 && doneSets(s) >= trainingTotalSets(s)}
            onClick={() => s.trainingId && onOpenWorkout(s.trainingId)}
          />
        ))}
      </div>
    );
  }

  // Branch B — not past + trainings exist → weekly progress bar + recent list.
  // The recent list is ONLY in-progress trainings + recently logged sessions —
  // NOT every saved plan. A plan you've never started shows no status badge
  // (mirrors the mobile `_recentList`; fixes the bogus "Nincs befejezve").
  if (!isPast && trainings.length > 0) {
    const started = trainings
      .filter((tr) => inProgress[tr.id])
      .sort((a, b) => inProgress[b.id].updatedAt - inProgress[a.id].updatedAt);
    const recentSessions = [...sessions]
      .filter((s) => s.finishedAt || s.startedAt)
      .sort(
        (a, b) =>
          new Date(b.finishedAt ?? b.startedAt!).getTime() -
          new Date(a.finishedAt ?? a.startedAt!).getTime(),
      );
    const items: Array<
      | { kind: "started"; tr: SavedTraining }
      | { kind: "session"; s: WorkoutSession }
    > = [];
    for (const tr of started) {
      if (items.length >= 5) break;
      items.push({ kind: "started", tr });
    }
    for (const s of recentSessions) {
      if (items.length >= 5) break;
      items.push({ kind: "session", s });
    }
    return (
      <div>
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-high">
            <div className="h-full rounded-full bg-on-surface" style={{ width: `${progress * 100}%` }} />
          </div>
          <span className="text-[13px] font-semibold text-muted">{weeklyLabel}</span>
        </div>
        {items.length > 0 && (
          <div className="mt-4">
            {items.map((it) =>
              it.kind === "started" ? (
                <ListCard
                  key={it.tr.id}
                  title={titleCase(it.tr.name || t("dashboard.workout_default"))}
                  subtitle={tFmt("trainingslist.paused", {
                    done: doneCount(inProgress[it.tr.id]),
                    total: trainingTotalSets(it.tr),
                  })}
                  bigNumber={it.tr.exercises.length}
                  finished={false}
                  inProgress
                  onClick={() => onOpenWorkout(it.tr.id)}
                />
              ) : (
                <ListCard
                  key={it.s.id}
                  title={titleCase(it.s.name || t("dashboard.workout_default"))}
                  subtitle={sessionDistanceM(it.s) > 0 ? fmtKm(sessionDistanceM(it.s)) : `${doneSets(it.s)}/${trainingTotalSets(it.s)} set`}
                  bigNumber={it.s.exercises.length}
                  finished={trainingTotalSets(it.s) > 0 && doneSets(it.s) >= trainingTotalSets(it.s)}
                  onClick={() => it.s.trainingId && onOpenWorkout(it.s.trainingId)}
                />
              ),
            )}
          </div>
        )}
      </div>
    );
  }

  // Branch C — empty day
  return (
    <div className="py-10">
      <div className="text-[28px] font-extrabold tracking-[-0.03em] text-on-surface">
        {isPast ? t("dashboard.rest_day") : t("dashboard.no_workout_today_short")}
      </div>
      <div className="mt-1 text-sm text-muted">
        {isPast ? t("dashboard.no_workout_that_day") : t("dashboard.create_with_plus")}
      </div>
    </div>
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
    <div className="py-1">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-on-surface" />
          <span className="text-[11px] font-semibold tracking-[0.08em] text-muted">{label}</span>
        </div>
        <span className="text-[56px] font-extrabold leading-none text-surface-high">{pad2(bigNumber)}</span>
      </div>
      <div className="truncate text-[48px] font-extrabold leading-none tracking-[-0.04em] text-on-surface">
        {title}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded bg-outline">
          <div className="h-full rounded bg-primary" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="text-[11px] text-muted">{progressLabel}</span>
      </div>
    </div>
  );
}

function ListCard({
  title,
  subtitle,
  bigNumber,
  finished,
  inProgress,
  onClick,
}: {
  title: string;
  subtitle: string;
  bigNumber: number;
  finished: boolean;
  inProgress?: boolean;
  onClick: () => void;
}) {
  const statusColor = finished ? "text-accent-green" : "text-accent-amber";
  const statusLabel = finished ? "Befejezve" : "Nincs befejezve";
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between border-t border-outline py-4 text-left">
      <div className="flex min-w-0 items-center gap-3">
        {inProgress && <Icon name="play_circle" size={26} className="text-accent-amber" />}
        <div className="min-w-0">
          <div className="truncate text-[18px] font-bold text-on-surface">{title}</div>
          <div className="mt-0.5 flex items-center gap-2 text-[13px] text-muted">
            <span>{subtitle}</span>
            <Icon name={finished ? "check_circle" : "radio_unchecked"} size={13} className={statusColor} />
            <span className={`truncate text-[12px] font-bold ${statusColor}`}>{statusLabel}</span>
          </div>
        </div>
      </div>
      <span className="text-[40px] font-extrabold leading-none text-surface-high">{pad2(bigNumber)}</span>
    </button>
  );
}

function QuickTile({ icon, label, onClick }: { icon: "add" | "sparkles" | "dumbbell" | "trending_up"; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-[18px] bg-surface-low px-4 py-[18px] text-left">
      <Icon name={icon} size={22} className="text-on-surface" />
      <span className="truncate text-sm font-bold text-on-surface">{label}</span>
    </button>
  );
}

function StatCard({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="flex aspect-[1.6] flex-col justify-center rounded-[18px] bg-surface-low px-4">
      <div className="flex items-baseline gap-1">
        <span className="text-[32px] font-extrabold leading-none tracking-[-0.03em] text-on-surface">{value}</span>
        {unit && <span className="text-base font-semibold text-muted">{unit}</span>}
      </div>
      <span className="mt-1 text-[12px] text-muted">{label}</span>
    </div>
  );
}

function WeekPreview({ customPlan, daysPerWeek }: { customPlan: string[] | null; daysPerWeek: number }) {
  const { t } = useI18n();
  const todayIso = (new Date().getDay() + 6) % 7;
  const workoutSet = new Set<number>();
  if (customPlan && customPlan.length === 7) {
    customPlan.forEach((tok, i) => tok !== "rest" && workoutSet.add(i));
  } else {
    const n = Math.min(daysPerWeek, 7);
    if (n >= 7) for (let i = 0; i < 7; i++) workoutSet.add(i);
    else for (let i = 0; i < n; i++) workoutSet.add(Math.min(6, Math.round((i * 7) / n)));
  }
  const dayKeys = ["plan.day_short_h", "plan.day_short_k", "plan.day_short_sze", "plan.day_short_cs", "plan.day_short_p", "plan.day_short_szo", "plan.day_short_v"];
  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface-low px-2.5 py-3.5">
      {dayKeys.map((k, i) => {
        const isToday = i === todayIso;
        const isWork = workoutSet.has(i);
        return (
          <div key={i} className="flex flex-col items-center">
            <span className={`text-[11px] font-bold tracking-[0.1em] ${isToday ? "text-on-surface" : "text-muted"}`}>
              {t(k)}
            </span>
            <div
              className="mt-1.5 flex h-10 w-10 items-center justify-center rounded-[10px]"
              style={{
                background: isWork ? "var(--color-primary)" : "transparent",
                border: `${isToday ? 2 : 1}px solid ${isToday ? "var(--color-on-surface)" : isWork ? "transparent" : "var(--color-surface-high)"}`,
              }}
            >
              <span
                className="text-[9px] font-extrabold tracking-[0.04em]"
                style={{ color: isWork ? "var(--color-background)" : "var(--color-muted)" }}
              >
                {isWork ? t("plan.chip_workout") : t("plan.chip_rest")}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtKg(kg: number): string {
  return kg === Math.round(kg) ? String(Math.round(kg)) : kg.toFixed(1).replace(".", ",");
}

type Pr = { name: string; kg: number; reps: number; date: Date };

/** A PR in the last 7 days: session e1RM for an exercise beats its prior max by >0.5kg. */
function findRecentPr(sessions: WorkoutSession[]): Pr | null {
  const sorted = [...sessions]
    .filter((s) => s.finishedAt)
    .sort((a, b) => new Date(a.finishedAt!).getTime() - new Date(b.finishedAt!).getTime());
  const best: Record<string, number> = {};
  const weekAgo = Date.now() - 7 * 86_400_000;
  let found: Pr | null = null;
  for (const s of sorted) {
    const when = new Date(s.finishedAt!);
    for (const ex of s.exercises) {
      const key = (ex.exerciseId || ex.name.toLowerCase()).toString();
      let sessionBest = 0;
      let bestSet = { kg: 0, reps: 0 };
      for (const set of ex.sets) {
        const v = e1rm(set.kg, set.reps);
        if (v > sessionBest) {
          sessionBest = v;
          bestSet = { kg: set.kg, reps: set.reps };
        }
      }
      const prior = best[key] ?? 0;
      if (sessionBest > prior + 0.5 && prior > 0 && when.getTime() >= weekAgo) {
        found = { name: ex.name, kg: bestSet.kg, reps: bestSet.reps, date: when };
      }
      if (sessionBest > prior) best[key] = sessionBest;
    }
  }
  return found;
}
