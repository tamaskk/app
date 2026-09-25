// Ported 1:1 from apps/mobile/lib/services/home_widget_sync.dart.
//
// NO-OP STUB. The Flutter original pushed streak / current-month / this-week
// data into a shared App Group container that a native iOS WidgetKit widget
// (and a future Android widget) read off the home screen.
//
// Expo's managed workflow has no first-class home-screen widget: shipping one
// needs a native config plugin + a custom dev build (e.g. @bacons/apple-targets,
// or a bare workflow with a WidgetKit extension + App Group entitlement). That
// work is deferred, so these methods keep the same names/shape as the Dart
// original but are safe no-ops. Callers can wire them up now; the data will
// start flowing once the native widget lands.
export class HomeWidgetSync {
  /// Call once at startup. No-op until a native home widget exists.
  static async init(): Promise<void> {
    // no-op — see file header.
  }

  /// Persist everything the home-screen widgets need and ask the OS to redraw.
  /// Mirrors the Dart `sync({streak, workoutDates, weekGoal})` surface.
  ///
  /// [workoutDates] is the full list of dates with a completed workout;
  /// [weekGoal] is the user's target training days per week.
  static async sync(_opts: {
    streak: number;
    workoutDates: Date[];
    weekGoal: number;
  }): Promise<void> {
    // no-op — see file header.
  }
}
