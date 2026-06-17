import 'package:home_widget/home_widget.dart';

/// Pushes data to the native home-screen widgets (iOS WidgetKit today; the
/// same data layer works for an Android widget later).
///
/// The App Group id, the data key, and the iOS widget "kind" must all stay in
/// sync with `ios/StreakWidget/StreakWidget.swift` and the App Group capability
/// on the Runner + extension targets.
class HomeWidgetSync {
  static const _appGroupId = 'group.com.heftor.heftor';
  static const _streakKey = 'streak';
  static const _monthKeyKey = 'month_key';
  static const _monthDaysKey = 'month_days';
  static const _weekDoneKey = 'week_done';
  static const _weekGoalKey = 'week_goal';

  // Match the WidgetKit `kind` strings in StreakWidget.swift / MonthWidget.swift.
  static const _streakWidgetKind = 'StreakWidget';
  static const _monthWidgetKind = 'MonthWidget';

  /// Call once at startup so every later write lands in the shared container.
  static Future<void> init() async {
    try {
      await HomeWidget.setAppGroupId(_appGroupId);
    } catch (_) {
      // Home widgets are a nice-to-have — never block app startup.
    }
  }

  /// Persist everything the home-screen widgets need and ask the OS to redraw
  /// them. Best-effort: failures (e.g. no widget added yet) are swallowed.
  ///
  /// [workoutDates] is the full list of dates with a completed workout; the
  /// current month's day-numbers are derived from it for the month widget.
  /// [weekGoal] is the user's target training days per week (onboarding
  /// `daysPerWeek`) — shown on the month widget as a "done / goal" tally.
  static Future<void> sync({
    required int streak,
    required List<DateTime> workoutDates,
    required int weekGoal,
  }) async {
    try {
      await HomeWidget.setAppGroupId(_appGroupId);

      // Streak widget.
      await HomeWidget.saveWidgetData<int>(_streakKey, streak);

      // Month widget — which days of the *current* month were trained.
      final now = DateTime.now();
      final days = workoutDates
          .where((d) => d.year == now.year && d.month == now.month)
          .map((d) => d.day)
          .toSet()
          .toList()
        ..sort();
      await HomeWidget.saveWidgetData<String>(_monthKeyKey, '${now.year}-${now.month}');
      await HomeWidget.saveWidgetData<String>(_monthDaysKey, days.join(','));

      // This week's progress vs. goal. "Done" = distinct days trained in the
      // current Monday-started week (matches weeklyDoneCount).
      final monday =
          DateTime(now.year, now.month, now.day).subtract(Duration(days: now.weekday - 1));
      final nextMonday = monday.add(const Duration(days: 7));
      final weekDone = workoutDates
          .where((d) => !d.isBefore(monday) && d.isBefore(nextMonday))
          .map((d) => DateTime(d.year, d.month, d.day))
          .toSet()
          .length;
      await HomeWidget.saveWidgetData<int>(_weekDoneKey, weekDone);
      await HomeWidget.saveWidgetData<int>(_weekGoalKey, weekGoal);

      await HomeWidget.updateWidget(iOSName: _streakWidgetKind);
      await HomeWidget.updateWidget(iOSName: _monthWidgetKind);
    } catch (_) {
      // Ignore — the widgets simply keep their last value.
    }
  }
}
