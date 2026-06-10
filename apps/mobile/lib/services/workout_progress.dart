import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/workout.dart';

/// A locally-saved, in-progress workout: when it was started and which sets
/// have been ticked off. Lets the user back out of a workout without finishing
/// and resume it later (timer + completed sets restored).
class WorkoutProgress {
  final String trainingId;
  // Total workout time accumulated so far (across sittings), in seconds — so a
  // resumed workout continues the clock instead of restarting at 0.
  final int elapsedSeconds;
  final DateTime updatedAt;
  // Done flags, one inner list per exercise (same order as the workout).
  final List<List<bool>> done;

  WorkoutProgress({
    required this.trainingId,
    required this.elapsedSeconds,
    required this.updatedAt,
    required this.done,
  });

  /// Number of sets marked done across all exercises.
  int get doneCount =>
      done.fold(0, (a, sets) => a + sets.where((d) => d).length);

  /// Worth showing as "continue later": the user either ticked off a set or
  /// spent time in the workout (e.g. paused it from the menu).
  bool get hasProgress => doneCount > 0 || elapsedSeconds > 0;

  Map<String, dynamic> _toJson() => {
        'elapsedSeconds': elapsedSeconds,
        'updatedAt': updatedAt.millisecondsSinceEpoch,
        'done': done,
      };

  static WorkoutProgress? _fromJson(String id, Map<String, dynamic> j) {
    try {
      final rawDone = (j['done'] as List)
          .map((row) => (row as List).map((d) => d == true).toList())
          .toList();
      return WorkoutProgress(
        trainingId: id,
        // Default to 0 for older entries that predate elapsed tracking.
        elapsedSeconds: (j['elapsedSeconds'] as num?)?.toInt() ?? 0,
        updatedAt:
            DateTime.fromMillisecondsSinceEpoch(j['updatedAt'] as int),
        done: rawDone,
      );
    } catch (_) {
      return null;
    }
  }
}

/// Persistence for [WorkoutProgress]. Keyed by training id under the
/// `workout_progress_<id>` SharedPreferences key.
class WorkoutProgressStore {
  static const _prefix = 'workout_progress_';
  static String _key(String id) => '$_prefix$id';

  /// Save the current progress for [trainingId]. [elapsedSeconds] is the total
  /// workout time accumulated so far; done flags are read from [exercises].
  static Future<void> save(
    String trainingId,
    int elapsedSeconds,
    List<Exercise> exercises,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    final done =
        exercises.map((e) => e.sets.map((s) => s.done).toList()).toList();
    final progress = WorkoutProgress(
      trainingId: trainingId,
      elapsedSeconds: elapsedSeconds,
      updatedAt: DateTime.now(),
      done: done,
    );
    await prefs.setString(_key(trainingId), jsonEncode(progress._toJson()));
  }

  static Future<WorkoutProgress?> load(String trainingId) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key(trainingId));
    if (raw == null) return null;
    try {
      return WorkoutProgress._fromJson(
          trainingId, jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  static Future<void> clear(String trainingId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key(trainingId));
  }

  /// All saved progress entries, keyed by training id. Used by the trainings
  /// list to show which workouts can be continued.
  static Future<Map<String, WorkoutProgress>> all() async {
    final prefs = await SharedPreferences.getInstance();
    final out = <String, WorkoutProgress>{};
    for (final key in prefs.getKeys()) {
      if (!key.startsWith(_prefix)) continue;
      final id = key.substring(_prefix.length);
      final raw = prefs.getString(key);
      if (raw == null) continue;
      try {
        final p = WorkoutProgress._fromJson(
            id, jsonDecode(raw) as Map<String, dynamic>);
        if (p != null) out[id] = p;
      } catch (_) {}
    }
    return out;
  }
}
