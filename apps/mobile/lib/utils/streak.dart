/// Monday of the week containing [d].
DateTime _weekStart(DateTime d) {
  final date = DateTime(d.year, d.month, d.day);
  return date.subtract(Duration(days: date.weekday - 1));
}

/// Consecutive weeks (ending this week, or last week) that have ≥1 workout.
/// Returns 0 if neither this week nor last week has a workout (streak broken).
int weeklyStreak(List<DateTime> workoutDates) {
  if (workoutDates.isEmpty) return 0;
  final weeks =
      workoutDates.map((d) => _weekStart(d).millisecondsSinceEpoch).toSet();
  final current = _weekStart(DateTime.now());
  DateTime cursor;
  if (weeks.contains(current.millisecondsSinceEpoch)) {
    cursor = current;
  } else if (weeks.contains(
      current.subtract(const Duration(days: 7)).millisecondsSinceEpoch)) {
    cursor = current.subtract(const Duration(days: 7));
  } else {
    return 0; // streak broken
  }
  var streak = 0;
  while (weeks.contains(cursor.millisecondsSinceEpoch)) {
    streak++;
    cursor = cursor.subtract(const Duration(days: 7));
  }
  return streak;
}

/// Longest consecutive-week streak ever recorded in [workoutDates].
int allTimeBestStreak(List<DateTime> workoutDates) {
  if (workoutDates.isEmpty) return 0;
  final weeks = workoutDates
      .map((d) => _weekStart(d).millisecondsSinceEpoch)
      .toSet()
      .toList()
    ..sort();
  if (weeks.isEmpty) return 0;
  var best = 1;
  var run = 1;
  for (var i = 1; i < weeks.length; i++) {
    final prev = DateTime.fromMillisecondsSinceEpoch(weeks[i - 1]);
    final curr = DateTime.fromMillisecondsSinceEpoch(weeks[i]);
    if (curr.difference(prev).inDays == 7) {
      run++;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}

/// Status of the user's current streak — used to render context labels in the
/// calendar streak hero.
enum StreakStatus {
  /// User trained this week already — streak is safe.
  safe,

  /// User didn't train this week yet and >2 days remain — neutral nudge.
  pending,

  /// 1–2 days left and no workout this week → the streak will break Monday.
  atRisk,

  /// No workouts this week and Monday already passed without one — broken.
  broken,
}

StreakStatus streakStatus(List<DateTime> workoutDates, {DateTime? now}) {
  final today = now ?? DateTime.now();
  final monday = _weekStart(today);
  final next = monday.add(const Duration(days: 7));
  final trainedThisWeek = workoutDates
      .any((d) => !d.isBefore(monday) && d.isBefore(next));
  if (trainedThisWeek) return StreakStatus.safe;
  // Sunday is weekday 7 → 0 days left after today.
  final daysLeft = 7 - today.weekday;
  if (daysLeft <= 2) return StreakStatus.atRisk;
  if (daysLeft >= 3) return StreakStatus.pending;
  return StreakStatus.broken;
}

/// Returns days-this-week with at least one workout.
int weeklyDoneCount(List<DateTime> workoutDates, {DateTime? now}) {
  final today = now ?? DateTime.now();
  final monday = _weekStart(today);
  final next = monday.add(const Duration(days: 7));
  return workoutDates
      .where((d) => !d.isBefore(monday) && d.isBefore(next))
      .map((d) => DateTime(d.year, d.month, d.day))
      .toSet()
      .length;
}
