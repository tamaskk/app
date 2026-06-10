import '../i18n/app_strings.dart';
import '../models/api_models.dart';

/// A new personal record detected by walking sessions in time order.
class RecentPr {
  final String exerciseName;
  final double kg;
  final int reps;
  final double e1rm;
  final DateTime when;

  const RecentPr({
    required this.exerciseName,
    required this.kg,
    required this.reps,
    required this.e1rm,
    required this.when,
  });
}

double _epley(double kg, int reps) => kg * (1 + reps / 30.0);

/// Scan sessions chronologically and return the most recent PR within
/// [withinDays]. A PR for an exercise = the session's max e1RM exceeds the
/// previous all-time max for that exercise by more than 0.5kg (filters out
/// floating-point churn from identical kg/reps).
RecentPr? findRecentPr(List<WorkoutSession> sessions,
    {int withinDays = 7}) {
  // Sort oldest → newest so the running max is built up correctly.
  final sorted = [...sessions]..sort((a, b) {
      final da = a.finishedAt ?? a.startedAt;
      final db = b.finishedAt ?? b.startedAt;
      if (da == null && db == null) return 0;
      if (da == null) return -1;
      if (db == null) return 1;
      return da.compareTo(db);
    });

  final allTimeMax = <String, double>{}; // exerciseId → best e1RM ever
  RecentPr? latest;
  final now = DateTime.now();

  for (final session in sorted) {
    final when = session.finishedAt ?? session.startedAt;
    if (when == null) continue;
    for (final ex in session.exercises) {
      if (ex.exerciseId.isEmpty || ex.sets.isEmpty) continue;
      // Best top-set in this session.
      double bestE1rm = 0;
      double bestKg = 0;
      int bestReps = 0;
      for (final set in ex.sets) {
        if (!set.done || set.reps <= 0) continue;
        final e1rm = _epley(set.kg, set.reps);
        if (e1rm > bestE1rm) {
          bestE1rm = e1rm;
          bestKg = set.kg;
          bestReps = set.reps;
        }
      }
      if (bestE1rm <= 0) continue;
      final prior = allTimeMax[ex.exerciseId] ?? 0;
      if (bestE1rm > prior + 0.5) {
        // It's a PR. Only surface it if it falls inside the window.
        if (now.difference(when).inDays <= withinDays) {
          latest = RecentPr(
            exerciseName: ex.name,
            kg: bestKg,
            reps: bestReps,
            e1rm: bestE1rm,
            when: when,
          );
        }
        allTimeMax[ex.exerciseId] = bestE1rm;
      }
    }
  }
  return latest;
}

/// Returns the set of session ids that contained at least one PR. Walks
/// sessions chronologically, keeps a running max e1RM per exercise, and flags
/// any session whose top set exceeds the previous max by >0.5 kg.
Set<String> sessionsWithPr(List<WorkoutSession> sessions) {
  final sorted = [...sessions]..sort((a, b) {
      final da = a.finishedAt ?? a.startedAt;
      final db = b.finishedAt ?? b.startedAt;
      if (da == null && db == null) return 0;
      if (da == null) return -1;
      if (db == null) return 1;
      return da.compareTo(db);
    });
  final allTimeMax = <String, double>{};
  final flagged = <String>{};
  for (final session in sorted) {
    bool prThisSession = false;
    for (final ex in session.exercises) {
      if (ex.exerciseId.isEmpty || ex.sets.isEmpty) continue;
      double bestE1rm = 0;
      for (final set in ex.sets) {
        if (!set.done || set.reps <= 0) continue;
        final e1rm = _epley(set.kg, set.reps);
        if (e1rm > bestE1rm) bestE1rm = e1rm;
      }
      if (bestE1rm <= 0) continue;
      final prior = allTimeMax[ex.exerciseId] ?? 0;
      if (bestE1rm > prior + 0.5) {
        prThisSession = true;
        allTimeMax[ex.exerciseId] = bestE1rm;
      }
    }
    if (prThisSession && session.id.isNotEmpty) flagged.add(session.id);
  }
  return flagged;
}

/// "Today" / "Yesterday" / "N days ago" — short relative date label for
/// the PR banner. Looks up the canonical strings from the i18n dict so it
/// flips with the language toggle.
String relativeDayLabel(DateTime when, {DateTime? now}) {
  final n = now ?? DateTime.now();
  final today = DateTime(n.year, n.month, n.day);
  final that = DateTime(when.year, when.month, when.day);
  final diff = today.difference(that).inDays;
  if (diff <= 0) return t('date.today');
  if (diff == 1) return t('date.yesterday');
  return tFmt('date.days_ago', {'n': diff});
}
