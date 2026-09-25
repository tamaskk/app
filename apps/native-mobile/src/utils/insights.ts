// Ported 1:1 from apps/mobile/lib/utils/insights.dart.
import { WorkoutSession } from "../models/apiModels";
import { t } from "../i18n";

/// One-liner observations the calendar surfaces under "MEGFIGYELÉSEK".
/// Each is a short uppercase string ready to render in a monochrome chip.
export class SmartInsights {
  constructor(
    /// e.g. "PÉNTEKEN EDZESZ LEGTÖBBET (5 ALKALOM)"
    public mostCommonDay: string | null = null,
    /// e.g. "ÁTLAGOSAN 18:30-KOR KEZDESZ"
    public typicalStartTime: string | null = null,
    /// e.g. "HÉTFŐN A LEGRITKÁBB AZ EDZÉS"
    public leastCommonDay: string | null = null,
    /// e.g. "ÁTLAG SESSION: 47 PERC"
    public typicalDuration: string | null = null,
  ) {}

  get hasAny(): boolean {
    return (
      this.mostCommonDay != null ||
      this.typicalStartTime != null ||
      this.leastCommonDay != null ||
      this.typicalDuration != null
    );
  }
}

/// Localized weekday name (1 = Monday … 7 = Sunday) in the form used inside
/// the insight sentences — Hungarian uses the superessive case ("PÉNTEKEN"),
/// English the plain uppercase day ("FRIDAY").
function dayName(weekday: number): string {
  return t(`insights.day.${weekday}`);
}

/// Compute the calendar insight chips from completed sessions. Requires
/// at least 4 sessions before any insight is surfaced — below that the data
/// is too noisy to make a confident claim.
export function computeInsights(sessions: WorkoutSession[]): SmartInsights {
  const dated = sessions.filter((s) => (s.finishedAt ?? s.startedAt) != null);
  if (dated.length < 4) return new SmartInsights();

  const byWeekday = new Map<number, number>(); // 1..7
  const hourSamples: number[] = [];
  const minuteSamples: number[] = [];
  const durationSamples: number[] = [];

  for (const s of dated) {
    const d = (s.finishedAt ?? s.startedAt)!;
    // Dart DateTime.weekday is 1=Monday..7=Sunday; JS getDay is 0=Sunday..6=Saturday.
    const weekday = d.getDay() === 0 ? 7 : d.getDay();
    byWeekday.set(weekday, (byWeekday.get(weekday) ?? 0) + 1);
    const started = s.startedAt;
    if (started != null) {
      hourSamples.push(started.getHours());
      minuteSamples.push(started.getMinutes());
    }
    const dur = s.durationMs != null ? Math.trunc(s.durationMs / 60000) : null;
    if (dur != null && dur > 0) durationSamples.push(dur);
  }

  let mostCommon: string | null = null;
  let leastCommon: string | null = null;
  if (byWeekday.size > 0) {
    const sorted = [...byWeekday.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted[0];
    // Require the top day to account for at least 30% of sessions so we don't
    // overclaim on a 1-vs-1 plurality.
    if (top[1] / dated.length >= 0.3) {
      mostCommon = t("insights.most_common_day", {
        day: dayName(top[0]),
        count: top[1],
      });
    }
    const bottom = sorted[sorted.length - 1];
    if (bottom[1] <= 1 && sorted.length >= 4) {
      leastCommon = t("insights.least_common_day", { day: dayName(bottom[0]) });
    }
  }

  let startTime: string | null = null;
  if (hourSamples.length >= 4) {
    const avgHour = Math.round(
      hourSamples.reduce((a, b) => a + b, 0) / hourSamples.length,
    );
    const avgMin = Math.round(
      minuteSamples.reduce((a, b) => a + b, 0) / minuteSamples.length,
    );
    const hh = String(avgHour).padStart(2, "0");
    const mm = String(avgMin).padStart(2, "0");
    startTime = t("insights.avg_start", { time: `${hh}:${mm}` });
  }

  let duration: string | null = null;
  if (durationSamples.length >= 4) {
    const avg = Math.round(
      durationSamples.reduce((a, b) => a + b, 0) / durationSamples.length,
    );
    duration = t("insights.avg_duration", { min: avg });
  }

  return new SmartInsights(mostCommon, startTime, leastCommon, duration);
}

/// Single highlight row used in the JÚNIUS HIGHLIGHTS section.
export class MonthHighlight {
  constructor(public label: string, public value: string) {}
}

/// Compute the most-quotable wins of a month — biggest session by volume,
/// biggest by sets, count of PRs. Hidden when the data isn't there.
export function computeMonthHighlights(
  monthSessions: WorkoutSession[],
  prSessionIds: Set<string>,
  volumeFormatter: (kg: number) => string,
): MonthHighlight[] {
  const highlights: MonthHighlight[] = [];

  let topVolume: WorkoutSession | null = null;
  let topVolumeKg = 0.0;
  let topSets: WorkoutSession | null = null;
  let topSetCount = 0;
  let prCount = 0;

  for (const s of monthSessions) {
    const vol = s.exercises.reduce(
      (a, e) => a + e.sets.reduce((b, x) => b + x.kg * x.reps, 0),
      0,
    );
    if (vol > topVolumeKg) {
      topVolumeKg = vol;
      topVolume = s;
    }
    if (s.totalSets > topSetCount) {
      topSetCount = s.totalSets;
      topSets = s;
    }
    if (s.id.length > 0 && prSessionIds.has(s.id)) prCount++;
  }

  if (topVolume != null && topVolumeKg > 0) {
    highlights.push(
      new MonthHighlight(
        t("insights.hl_biggest_session"),
        `${shortName(topVolume.name)} · ${volumeFormatter(topVolumeKg)}`,
      ),
    );
  }
  if (topSets != null && topSetCount > 0) {
    highlights.push(
      new MonthHighlight(
        t("insights.hl_most_sets"),
        `${shortName(topSets.name)} · ${t("insights.sets_count", { n: topSetCount })}`,
      ),
    );
  }
  if (prCount > 0) {
    highlights.push(new MonthHighlight(t("insights.hl_new_prs"), `${prCount}`));
  }
  return highlights;
}

function shortName(s: string): string {
  if (s.trim().length === 0) return t("insights.workout_fallback");
  return s.trim().toUpperCase();
}
