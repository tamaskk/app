// Formatting + math helpers ported from the mobile screens (dashboard/summary
// helper functions, ProgressionSuggestion.label, e1RM, streak, rank numerals).

import { t } from "./i18n";
import type { WorkoutSession } from "./types";

/** Capitalize the first letter of every word. */
export function titleCase(s: string): string {
  return s
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Hungarian-style decimal: trailing `.0` trimmed, `.`→`,`. */
export function numHu(n: number): string {
  if (n === Math.round(n)) return String(Math.round(n));
  return n.toFixed(1).replace(".", ",");
}

/** `_fmtCount` — 1.2K past 1000, else rounded. */
export function fmtCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".", ",") + "K";
  return String(Math.round(n));
}

/** `_fmtVolume` — tonnes past 1000, else kg (number only). */
export function fmtVolume(kg: number): string {
  if (kg >= 1000) return (kg / 1000).toFixed(1).replace(".", ",");
  return String(Math.round(kg));
}

export const volumeUnit = (kg: number): string => (kg >= 1000 ? "t" : "kg");

/** `_fmtTime(minutes)` — `{h}h` past an hour else `{m}p`. */
export function fmtTimeMin(min: number): string {
  if (min >= 60) return `${Math.floor(min / 60)}h`;
  return `${min}p`;
}

/** `HH:MM:SS` elapsed clock from seconds. */
export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

/** `M:SS` for the rest timer / durations under an hour. */
export function fmtMinSec(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** `HH:MM` from a duration in ms (summary "Duration" stat). */
export function fmtDurHM(ms: number | null): string {
  if (ms == null) return "–";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** ProgressionSuggestion.label — `82,5 × 8`. */
export function suggestionLabel(kg: number, reps: number): string {
  const kgLabel =
    kg === Math.round(kg) ? String(Math.round(kg)) : String(kg).replace(".", ",");
  return `${kgLabel} × ${reps}`;
}

/** Epley e1RM. */
export const e1rm = (kg: number, reps: number): number => kg * (1 + reps / 30);

/** Zero-pad to two digits ("01"). */
export const pad2 = (n: number): string => String(n).padStart(2, "0");

/** `MA` / `TEGNAP` / `{n} NAPJA` — relative day label (uppercase keys). */
export function relativeDayLabel(date: Date): string {
  const now = new Date();
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (days <= 0) return t("date.today");
  if (days === 1) return t("date.yesterday");
  return t("date.days_ago").replace("{n}", String(days));
}

/** Rank tier → Roman numeral (I..X), clamped. */
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
export const rankNumeral = (tier: number): string =>
  ROMAN[Math.min(Math.max(tier, 1), 10) - 1];

/** Local midnight key for grouping session dates. */
export const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Monday of the week containing `d` (local, midnight). */
export function mondayOf(d: Date): Date {
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - day);
  return m;
}

/**
 * `weeklyStreak` — consecutive Monday-anchored weeks with ≥1 workout, ending at
 * this week (or last week if this week is empty). 0 if neither this nor last
 * week has a workout. Mirrors the dashboard `weeklyStreak`.
 */
export function weeklyStreak(dates: Date[]): number {
  if (!dates.length) return 0;
  const weekKeys = new Set(dates.map((d) => mondayOf(d).getTime()));
  const thisMon = mondayOf(new Date()).getTime();
  const WEEK = 7 * 86_400_000;
  const hasThis = weekKeys.has(thisMon);
  const hasLast = weekKeys.has(thisMon - WEEK);
  if (!hasThis && !hasLast) return 0;
  let anchor = hasThis ? thisMon : thisMon - WEEK;
  let streak = 0;
  while (weekKeys.has(anchor)) {
    streak++;
    anchor -= WEEK;
  }
  return streak;
}

/** Total volume of a session (Σ kg×reps). */
export function sessionVolume(s: WorkoutSession): number {
  return s.exercises.reduce(
    (a, e) => a + e.sets.reduce((b, set) => b + set.kg * set.reps, 0),
    0,
  );
}

/** Metres → `5.2 km` (or `800 m` under a km). */
export function fmtKm(metres: number): string {
  if (metres <= 0) return "";
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1).replace(/\.0$/, "")} km`;
}

/** Longest-ever run of consecutive Monday-anchored weeks with a workout. */
export function bestWeeklyStreak(dates: Date[]): number {
  if (!dates.length) return 0;
  const weeks = [...new Set(dates.map((d) => mondayOf(d).getTime()))].sort((a, b) => a - b);
  const WEEK = 7 * 86_400_000;
  let best = 1;
  let run = 1;
  for (let i = 1; i < weeks.length; i++) {
    run = weeks[i] - weeks[i - 1] === WEEK ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/** Uppercase full month name via the calendar.month_* keys. */
export function monthFull(monthIndex0: number): string {
  const KEYS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];
  return t(`calendar.month_${KEYS[monthIndex0]}`);
}
