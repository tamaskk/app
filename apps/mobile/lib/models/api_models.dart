import '../i18n/app_strings.dart';

/// Minimal exercise shape returned by list/search endpoints.
class ExerciseMinimal {
  final int id;
  final String name;

  ExerciseMinimal({required this.id, required this.name});

  factory ExerciseMinimal.fromJson(Map<String, dynamic> json) =>
      ExerciseMinimal(id: json['id'] as int, name: json['name'] as String);
}

/// Detailed exercise shape (ExerciseStandard from the API).
class ExerciseDetail {
  final int id;
  final String name;
  final List<String> primaryMuscles;
  final String? category;
  final String? force;
  final String? mechanic;
  final String? difficulty;
  final List<String> steps;

  ExerciseDetail({
    required this.id,
    required this.name,
    required this.primaryMuscles,
    this.category,
    this.force,
    this.mechanic,
    this.difficulty,
    required this.steps,
  });

  factory ExerciseDetail.fromJson(Map<String, dynamic> json) => ExerciseDetail(
        id: json['id'] as int,
        name: json['name'] as String,
        primaryMuscles: _stringList(json['primary_muscles']),
        category: json['category'] as String?,
        force: json['force'] as String?,
        mechanic: json['mechanic'] as String?,
        difficulty: json['difficulty'] as String?,
        steps: _stringList(json['steps']),
      );
}

/// Available filter values for building the picker UI.
class ExerciseFilters {
  final List<String> muscles;
  final List<String> difficulties;
  final List<String> categories;

  ExerciseFilters({
    required this.muscles,
    required this.difficulties,
    required this.categories,
  });

  factory ExerciseFilters.fromJson(Map<String, dynamic> json) =>
      ExerciseFilters(
        muscles: _stringList(json['muscles']),
        difficulties: _stringList(json['difficulties']),
        categories: _stringList(json['categories']),
      );
}

List<String> _stringList(dynamic value) =>
    (value as List?)?.map((e) => e.toString()).toList() ?? const [];

/// A training the user saved on the backend (Mongo).
class SavedTraining {
  final String id;
  final String name;
  final List<SavedExercise> exercises;
  // Provenance of the training: "manual" for user-created, "generated" for
  // plan-builder output. Drives where the card renders on the trainings list.
  final String source;
  // Last time a session was logged against this training. When non-null we
  // treat the card as "done" — sorted to the end of the generated row but
  // still visible.
  final DateTime? doneAt;
  // Optional plan grouping (only on generated trainings).
  final int? weekIndex;
  final int? dayIndex;
  // Discipline: "strength" (regular Edzések) or "hyrox" (HYROX plan). Drives
  // which tab the training belongs to.
  final String discipline;
  // HYROX 12-week phase (1–4), only set on hyrox trainings.
  final int? phase;

  SavedTraining({
    required this.id,
    required this.name,
    required this.exercises,
    this.source = 'manual',
    this.doneAt,
    this.weekIndex,
    this.dayIndex,
    this.discipline = 'strength',
    this.phase,
  });

  factory SavedTraining.fromJson(Map<String, dynamic> json) => SavedTraining(
        id: json['_id']?.toString() ?? '',
        name: json['name'] as String? ?? '',
        exercises: ((json['exercises'] as List?) ?? [])
            .map((e) => SavedExercise.fromJson(e as Map<String, dynamic>))
            .toList(),
        source: json['source'] as String? ?? 'manual',
        doneAt: _parseTrainingDate(json['doneAt']),
        weekIndex: (json['weekIndex'] as num?)?.toInt(),
        dayIndex: (json['dayIndex'] as num?)?.toInt(),
        discipline: json['discipline'] as String? ?? 'strength',
        phase: (json['phase'] as num?)?.toInt(),
      );

  int get totalSets => exercises.fold(0, (a, e) => a + e.sets.length);
  bool get isGenerated => source == 'generated';
  bool get isDone => doneAt != null;
  bool get isHyrox => discipline == 'hyrox';
}

DateTime? _parseTrainingDate(dynamic v) =>
    v is String ? DateTime.tryParse(v)?.toLocal() : null;

class SavedExercise {
  final String exerciseId;
  final String name;
  final String? category;
  final String gifUrl;
  final List<String> targetMuscles;
  final String progressionStrategy;
  // HYROX metric (null → classic strength). See lib/hyroxMetrics on the backend.
  final String? metric;
  final String? stationKey;
  final String? note;
  final List<SavedSet> sets;

  SavedExercise({
    required this.exerciseId,
    required this.name,
    this.category,
    this.gifUrl = '',
    this.targetMuscles = const [],
    this.progressionStrategy = 'linear',
    this.metric,
    this.stationKey,
    this.note,
    required this.sets,
  });

  factory SavedExercise.fromJson(Map<String, dynamic> json) => SavedExercise(
        exerciseId: json['exerciseId']?.toString() ?? '',
        name: json['name'] as String? ?? '',
        category: json['category'] as String?,
        gifUrl: json['gifUrl'] as String? ?? '',
        targetMuscles: _stringList(json['targetMuscles']),
        progressionStrategy:
            json['progressionStrategy'] as String? ?? 'linear',
        metric: json['metric'] as String?,
        stationKey: json['stationKey'] as String?,
        note: json['note'] as String?,
        sets: ((json['sets'] as List?) ?? [])
            .map((e) => SavedSet.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

/// A completed workout: when it ran and exactly what was logged.
class WorkoutSession {
  final String id;
  final String name;
  final DateTime? startedAt;
  final DateTime? finishedAt;
  final List<SavedExercise> exercises;

  WorkoutSession({
    required this.id,
    required this.name,
    required this.startedAt,
    required this.finishedAt,
    required this.exercises,
  });

  factory WorkoutSession.fromJson(Map<String, dynamic> json) => WorkoutSession(
        id: json['_id']?.toString() ?? '',
        name: json['name'] as String? ?? '',
        startedAt: _parseDate(json['startedAt']),
        finishedAt: _parseDate(json['finishedAt']),
        exercises: ((json['exercises'] as List?) ?? [])
            .map((e) => SavedExercise.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  int get totalSets => exercises.fold(0, (a, e) => a + e.sets.length);
  int get doneSets =>
      exercises.fold(0, (a, e) => a + e.sets.where((s) => s.done).length);
  Duration? get duration => (startedAt != null && finishedAt != null)
      ? finishedAt!.difference(startedAt!)
      : null;
}

DateTime? _parseDate(dynamic v) =>
    v is String ? DateTime.tryParse(v)?.toLocal() : null;

class SavedSet {
  final double kg;
  final int reps;
  final bool done;
  // HYROX metric fields (null for ordinary strength sets).
  final double? distanceM;
  final int? seconds;
  final double? targetKg;

  SavedSet({
    required this.kg,
    required this.reps,
    this.done = false,
    this.distanceM,
    this.seconds,
    this.targetKg,
  });

  factory SavedSet.fromJson(Map<String, dynamic> json) => SavedSet(
        kg: (json['kg'] as num?)?.toDouble() ?? 0,
        reps: (json['reps'] as num?)?.toInt() ?? 0,
        done: json['done'] as bool? ?? false,
        distanceM: (json['distanceM'] as num?)?.toDouble(),
        seconds: (json['seconds'] as num?)?.toInt(),
        targetKg: (json['targetKg'] as num?)?.toDouble(),
      );
}

/// A stagnating exercise: its best e1RM hasn't grown for several weeks.
class StagnationItem {
  final String exerciseId;
  final String name;
  final int weeksStagnant;
  final double e1rm;
  final List<String> tips;

  StagnationItem({
    required this.exerciseId,
    required this.name,
    required this.weeksStagnant,
    required this.e1rm,
    this.tips = const [],
  });

  factory StagnationItem.fromJson(Map<String, dynamic> json) => StagnationItem(
        exerciseId: json['exerciseId']?.toString() ?? '',
        name: json['name'] as String? ?? '',
        weeksStagnant: (json['weeksStagnant'] as num?)?.toInt() ?? 0,
        e1rm: (json['e1rm'] as num?)?.toDouble() ?? 0,
        tips: _stringList(json['tips']),
      );

  /// `Bench Press — stalled for 3 weeks. Try: deload / variation / volume drop`
  String get advice {
    final tipText = tips.isEmpty
        ? ''
        : tFmt('stagnation.try', {'tips': tips.join(' / ')});
    return tFmt('stagnation.advice', {'name': name, 'weeks': weeksStagnant}) +
        tipText;
  }
}

/// The auto-progression engine's next-set suggestion for one exercise.
class ProgressionSuggestion {
  final double suggestedKg;
  final int suggestedReps;
  final String reason;

  ProgressionSuggestion({
    required this.suggestedKg,
    required this.suggestedReps,
    this.reason = '',
  });

  factory ProgressionSuggestion.fromJson(Map<String, dynamic> json) =>
      ProgressionSuggestion(
        suggestedKg: (json['suggestedKg'] as num?)?.toDouble() ?? 0,
        suggestedReps: (json['suggestedReps'] as num?)?.toInt() ?? 0,
        reason: json['reason'] as String? ?? '',
      );

  /// `82,5 × 8` — Hungarian decimal comma, trailing `.0` trimmed.
  String get label {
    final kg = suggestedKg == suggestedKg.roundToDouble()
        ? suggestedKg.toInt().toString()
        : suggestedKg.toString().replaceAll('.', ',');
    return '$kg × $suggestedReps';
  }
}

/// XP / rank summary returned alongside a saved session. `unlocked` is true
/// when the awarded XP crossed a rank threshold — the client uses that to
/// decide whether to push the RankUpOverlay.
class RankDelta {
  final int previousRank;
  final int newRank;
  final int xpAwarded;
  final bool unlocked;

  const RankDelta({
    required this.previousRank,
    required this.newRank,
    required this.xpAwarded,
    required this.unlocked,
  });

  factory RankDelta.fromJson(Map<String, dynamic> json) => RankDelta(
        previousRank: (json['previousRank'] as num?)?.toInt() ?? 1,
        newRank: (json['newRank'] as num?)?.toInt() ?? 1,
        xpAwarded: (json['xpAwarded'] as num?)?.toInt() ?? 0,
        unlocked: json['unlocked'] as bool? ?? false,
      );
}

/// Bundle the persisted session and the rank delta so callers can react to
/// both with a single response.
class WorkoutSessionWithRank {
  final WorkoutSession session;
  final RankDelta? rankDelta;
  const WorkoutSessionWithRank({required this.session, this.rankDelta});
}
