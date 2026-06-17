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

  // Matches the WidgetKit `kind` string in StreakWidget.swift.
  static const _iosWidgetKind = 'StreakWidget';

  /// Call once at startup so every later write lands in the shared container.
  static Future<void> init() async {
    try {
      await HomeWidget.setAppGroupId(_appGroupId);
    } catch (_) {
      // Home widgets are a nice-to-have — never block app startup.
    }
  }

  /// Persist the current weekly streak and ask the OS to redraw the widget.
  /// Best-effort: failures (e.g. no widget added yet) are swallowed.
  static Future<void> updateStreak(int streak) async {
    try {
      await HomeWidget.setAppGroupId(_appGroupId);
      await HomeWidget.saveWidgetData<int>(_streakKey, streak);
      await HomeWidget.updateWidget(iOSName: _iosWidgetKind);
    } catch (_) {
      // Ignore — the widget simply keeps its last value.
    }
  }
}
