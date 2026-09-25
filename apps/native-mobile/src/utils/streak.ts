// Ported 1:1 from apps/mobile/lib/utils/streak.dart.
function weekStart(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = (date.getDay() + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() - wd);
  return date;
}

/** Consecutive weeks (ending this/last week) with ≥1 workout. 0 if broken. */
export function weeklyStreak(workoutDates: Date[]): number {
  if (workoutDates.length === 0) return 0;
  const weeks = new Set(workoutDates.map((d) => weekStart(d).getTime()));
  const current = weekStart(new Date());
  const lastWeek = weekStart(new Date(current.getTime() - 7 * 86400000));
  let cursor: Date;
  if (weeks.has(current.getTime())) cursor = current;
  else if (weeks.has(lastWeek.getTime())) cursor = lastWeek;
  else return 0;
  let streak = 0;
  while (weeks.has(cursor.getTime())) {
    streak++;
    cursor = weekStart(new Date(cursor.getTime() - 7 * 86400000));
  }
  return streak;
}

/** Longest consecutive-week streak ever recorded. */
export function allTimeBestStreak(workoutDates: Date[]): number {
  if (workoutDates.length === 0) return 0;
  const weeks = Array.from(new Set(workoutDates.map((d) => weekStart(d).getTime()))).sort((a, b) => a - b);
  if (weeks.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < weeks.length; i++) {
    const prev = new Date(weeks[i - 1]);
    const expectedNext = weekStart(new Date(prev.getTime() + 7 * 86400000));
    if (weeks[i] === expectedNext.getTime()) {
      run++;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}

export enum StreakStatus {
  safe = "safe",
  pending = "pending",
  atRisk = "atRisk",
  broken = "broken",
}

export function streakStatus(workoutDates: Date[], now?: Date): StreakStatus {
  const today = now ?? new Date();
  const monday = weekStart(today);
  const next = new Date(monday.getTime() + 7 * 86400000);
  const trainedThisWeek = workoutDates.some((d) => d >= monday && d < next);
  if (trainedThisWeek) return StreakStatus.safe;
  const isoWeekday = ((today.getDay() + 6) % 7) + 1; // 1=Mon..7=Sun
  const daysLeft = 7 - isoWeekday;
  if (daysLeft <= 2) return StreakStatus.atRisk;
  if (daysLeft >= 3) return StreakStatus.pending;
  return StreakStatus.broken;
}

/** Days-this-week with at least one workout. */
export function weeklyDoneCount(workoutDates: Date[], now?: Date): number {
  const today = now ?? new Date();
  const monday = weekStart(today);
  const next = new Date(monday.getTime() + 7 * 86400000);
  const days = new Set(
    workoutDates
      .filter((d) => d >= monday && d < next)
      .map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()),
  );
  return days.size;
}
