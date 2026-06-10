// Models for the Gym Exercise API (`/api/v1`), an ExerciseDB-backed catalogue.
//
// List responses are `{ success, meta, data: [...] }`, single/search responses
// `{ success, data }`. Errors are `{ success:false, error:{ code, message } }`.

/// A single exercise from the catalogue (the API's `ExerciseDto`).
class ApiExercise {
  final String exerciseId;
  final String name;
  final String gifUrl;
  final List<String> targetMuscles;
  final List<String> bodyParts;
  final List<String> equipments;
  final List<String> secondaryMuscles;
  final List<String> instructions;

  ApiExercise({
    required this.exerciseId,
    required this.name,
    required this.gifUrl,
    this.targetMuscles = const [],
    this.bodyParts = const [],
    this.equipments = const [],
    this.secondaryMuscles = const [],
    this.instructions = const [],
  });

  factory ApiExercise.fromJson(Map<String, dynamic> json) => ApiExercise(
        exerciseId: json['exerciseId']?.toString() ?? '',
        name: json['name'] as String? ?? '',
        gifUrl: json['gifUrl'] as String? ?? '',
        targetMuscles: _stringList(json['targetMuscles']),
        bodyParts: _stringList(json['bodyParts']),
        equipments: _stringList(json['equipments']),
        secondaryMuscles: _stringList(json['secondaryMuscles']),
        instructions: _stringList(json['instructions']),
      );

  /// Comma-joined target muscles, e.g. "chest, triceps" — handy for subtitles.
  String get muscleSummary => targetMuscles.join(', ');
}

/// One page of exercises plus the keyset cursor for fetching the next page.
class ExercisePage {
  final List<ApiExercise> items;
  final int total;
  final bool hasNextPage;
  final String? nextCursor;

  ExercisePage({
    required this.items,
    required this.total,
    required this.hasNextPage,
    required this.nextCursor,
  });

  factory ExercisePage.fromJson(Map<String, dynamic> json) {
    final meta = (json['meta'] as Map<String, dynamic>?) ?? const {};
    final data = (json['data'] as List?) ?? const [];
    return ExercisePage(
      items: data
          .map((e) => ApiExercise.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: (meta['total'] as num?)?.toInt() ?? data.length,
      hasNextPage: meta['hasNextPage'] as bool? ?? false,
      nextCursor: meta['nextCursor'] as String?,
    );
  }
}

List<String> _stringList(dynamic value) =>
    (value as List?)?.map((e) => e.toString()).toList() ?? const [];
