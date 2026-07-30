"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import * as api from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { e1rm, fmtDurHM, titleCase } from "@/lib/format";
import {
  hasKcal,
  sessionDurationMs,
  totalKcal,
  totalSets as sessionTotalSets,
  type RankDelta,
  type WorkoutSession,
} from "@/lib/types";
import { rankNumeral } from "@/lib/format";

type SummaryPayload = { session: WorkoutSession; rankDelta?: RankDelta | null };

export function SummaryScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [payload, setPayload] = useState<SummaryPayload | null>(null);
  const [prevBest, setPrevBest] = useState<Record<string, number>>({});
  const [showRankUp, setShowRankUp] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("heftor_summary");
      if (raw) setPayload(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const session = payload?.session;
  const rankDelta = payload?.rankDelta;

  useEffect(() => {
    if (!session) return;
    if (rankDelta?.unlocked) setShowRankUp(true);
    api
      .getSessions()
      .then((all) => {
        const sorted = all
          .filter((s) => s.id !== session.id && s.finishedAt)
          .sort((a, b) => new Date(b.finishedAt!).getTime() - new Date(a.finishedAt!).getTime());
        const best: Record<string, number> = {};
        for (const ex of session.exercises) {
          const key = (ex.exerciseId || ex.name.toLowerCase()).toString();
          for (const s of sorted) {
            const match = s.exercises.find(
              (e) => (e.exerciseId || e.name.toLowerCase()).toString() === key,
            );
            if (match) {
              best[key] = Math.max(...match.sets.map((set) => e1rm(set.kg, set.reps)), 0);
              break;
            }
          }
        }
        setPrevBest(best);
      })
      .catch(() => {});
  }, [session, rankDelta]);

  const muscles = useMemo(() => {
    if (!session) return [];
    const set = new Set<string>();
    session.exercises.forEach((e) => e.targetMuscles.forEach((m) => set.add(m)));
    return [...set];
  }, [session]);

  if (!session) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <p className="text-muted">{t("summary.workout")}</p>
        <button onClick={() => router.replace("/")} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-background">
          {t("common.done")}
        </button>
      </div>
    );
  }

  const durMs = sessionDurationMs(session);
  const reps = session.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + s.reps, 0), 0);
  const dateLabel = session.finishedAt
    ? `${t(`summary.month_${new Date(session.finishedAt).getMonth() + 1}`)}. ${new Date(session.finishedAt).getDate()}.`
    : null;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[520px] lg:max-w-[760px]">
      <header className="flex h-14 items-center px-3">
        <button onClick={() => router.replace("/")} className="p-2 text-on-surface">
          <Icon name="chevron_left" size={24} />
        </button>
      </header>

      <div className="px-5 pb-16">
        {muscles.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {muscles.map((m) => (
              <span key={m} className="rounded-full border border-outline px-3.5 py-1.5 text-[13px] font-semibold text-on-surface">
                {titleCase(m)}
              </span>
            ))}
          </div>
        )}

        {dateLabel && <p className="mt-4 text-center text-base text-muted">{dateLabel}</p>}
        <h1 className="mt-1 text-center text-[32px] font-extrabold tracking-[-0.03em] text-on-surface">
          {titleCase(session.name || t("summary.workout"))}
        </h1>

        {/* Stats */}
        <div className="mt-7 grid grid-cols-2 gap-y-5 lg:grid-cols-4">
          <Stat label="Duration" value={fmtDurHM(durMs)} />
          <Stat label="Sets" value={String(sessionTotalSets(session))} />
          <Stat label="Reps" value={String(reps)} />
          {hasKcal(session) && <Stat label="Kcal" value={String(Math.round(totalKcal(session)))} />}
        </div>

        {/* Exercise rows */}
        <div className="mt-7">
          {session.exercises.map((ex, i) => {
            const key = (ex.exerciseId || ex.name.toLowerCase()).toString();
            const cur = Math.max(...ex.sets.map((s) => e1rm(s.kg, s.reps)), 0);
            const prev = prevBest[key] ?? 0;
            const pct = prev > 0 && cur > 0 ? ((cur - prev) / prev) * 100 : null;
            const parts = [
              ex.targetMuscles[0] ? titleCase(ex.targetMuscles[0]) : null,
              `${ex.sets.length} set`,
              ex.kcal != null ? `${Math.round(ex.kcal)} kcal` : null,
            ].filter(Boolean);
            return (
              <div key={key + i} className="flex items-center justify-between border-t border-outline py-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[17px] font-bold text-on-surface">{titleCase(ex.name)}</span>
                    {pct != null && (
                      <span className={`flex items-center text-[13px] font-semibold ${pct >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                        <Icon name={pct >= 0 ? "arrow_upward" : "arrow_downward"} size={13} />
                        {Math.abs(pct).toFixed(2)} %
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[13px] text-muted">{parts.join(" · ")}</div>
                </div>
                <Icon name="chevron_right" size={20} className="text-muted" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Rank-up overlay */}
      {showRankUp && rankDelta && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 px-8 text-center">
          <span className="text-[12px] font-bold tracking-[0.2em] text-muted">RANK UP</span>
          <div className="mt-6 flex items-center gap-6">
            <span className="text-[40px] font-extrabold text-surface-high">{rankNumeral(rankDelta.previousRank)}</span>
            <Icon name="arrow_forward" size={28} className="text-muted" />
            <span className="text-[64px] font-extrabold text-on-surface">{rankNumeral(rankDelta.newRank)}</span>
          </div>
          <p className="mt-6 text-lg font-bold text-accent-amber">+{rankDelta.xpAwarded} XP</p>
          <button
            onClick={() => setShowRankUp(false)}
            className="mt-10 h-14 w-full max-w-xs rounded-full bg-primary text-[17px] font-extrabold text-background"
          >
            {t("common.continue")}
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[12px] text-muted">{label}</span>
      <span className="mt-1 text-[26px] font-extrabold text-on-surface">{value}</span>
    </div>
  );
}
