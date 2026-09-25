// Ported 1:1 from apps/mobile/lib/utils/recent_pr.dart.
import { t } from "../i18n";
import { WorkoutSession } from "../models/apiModels";

export class RecentPr {
  constructor(
    public exerciseName: string,
    public kg: number,
    public reps: number,
    public e1rm: number,
    public when: Date,
  ) {}
}

function epley(kg: number, reps: number): number {
  return kg * (1 + reps / 30.0);
}

function sortChrono(sessions: WorkoutSession[]): WorkoutSession[] {
  return [...sessions].sort((a, b) => {
    const da = a.finishedAt ?? a.startedAt;
    const db = b.finishedAt ?? b.startedAt;
    if (da == null && db == null) return 0;
    if (da == null) return -1;
    if (db == null) return 1;
    return da.getTime() - db.getTime();
  });
}

/** Most recent PR within [withinDays] (e1RM exceeds prior max by >0.5kg). */
export function findRecentPr(sessions: WorkoutSession[], withinDays = 7): RecentPr | null {
  const sorted = sortChrono(sessions);
  const allTimeMax: Record<string, number> = {};
  let latest: RecentPr | null = null;
  const now = new Date();

  for (const session of sorted) {
    const when = session.finishedAt ?? session.startedAt;
    if (when == null) continue;
    for (const ex of session.exercises) {
      if (ex.exerciseId.length === 0 || ex.sets.length === 0) continue;
      let bestE1rm = 0;
      let bestKg = 0;
      let bestReps = 0;
      for (const s of ex.sets) {
        if (!s.done || s.reps <= 0) continue;
        const e1rm = epley(s.kg, s.reps);
        if (e1rm > bestE1rm) {
          bestE1rm = e1rm;
          bestKg = s.kg;
          bestReps = s.reps;
        }
      }
      if (bestE1rm <= 0) continue;
      const prior = allTimeMax[ex.exerciseId] ?? 0;
      if (bestE1rm > prior + 0.5) {
        const diffDays = Math.floor((now.getTime() - when.getTime()) / 86400000);
        if (diffDays <= withinDays) {
          latest = new RecentPr(ex.name, bestKg, bestReps, bestE1rm, when);
        }
        allTimeMax[ex.exerciseId] = bestE1rm;
      }
    }
  }
  return latest;
}

/** Set of session ids that contained at least one PR. */
export function sessionsWithPr(sessions: WorkoutSession[]): Set<string> {
  const sorted = sortChrono(sessions);
  const allTimeMax: Record<string, number> = {};
  const flagged = new Set<string>();
  for (const session of sorted) {
    let prThisSession = false;
    for (const ex of session.exercises) {
      if (ex.exerciseId.length === 0 || ex.sets.length === 0) continue;
      let bestE1rm = 0;
      for (const s of ex.sets) {
        if (!s.done || s.reps <= 0) continue;
        const e1rm = epley(s.kg, s.reps);
        if (e1rm > bestE1rm) bestE1rm = e1rm;
      }
      if (bestE1rm <= 0) continue;
      const prior = allTimeMax[ex.exerciseId] ?? 0;
      if (bestE1rm > prior + 0.5) {
        prThisSession = true;
        allTimeMax[ex.exerciseId] = bestE1rm;
      }
    }
    if (prThisSession && session.id.length > 0) flagged.add(session.id);
  }
  return flagged;
}

/** "Today" / "Yesterday" / "N days ago" — short relative date label. */
export function relativeDayLabel(when: Date, now?: Date): string {
  const n = now ?? new Date();
  const today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  const that = new Date(when.getFullYear(), when.getMonth(), when.getDate());
  const diff = Math.floor((today.getTime() - that.getTime()) / 86400000);
  if (diff <= 0) return t("date.today");
  if (diff === 1) return t("date.yesterday");
  return t("date.days_ago", { n: diff });
}
