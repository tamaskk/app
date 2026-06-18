// Models for the Gym Exercise API (`/api/v1`), an ExerciseDB-backed catalogue.
//
// List responses are `{ success, meta, data: [...] }`, single/search responses
// `{ success, data }`. Errors are `{ success:false, error:{ code, message } }`.
//
// The catalogue serves two shapes for text fields and we tolerate both:
//   • Legacy plain:   name:"plyo push up", targetMuscles:["pectorals"]
//   • Localized:      name:[{lng,value}…],  targetMuscles:[[{lng,value}…]…]
// Localized values are resolved to the current app language (English fallback)
// so muscle/body-part keys stay in English for filtering, while display names
// follow the user's language.

import '../i18n/app_strings.dart';

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
        name: _localizedString(json['name']),
        gifUrl: json['gifUrl'] as String? ?? '',
        targetMuscles: _localizedList(json['targetMuscles']),
        bodyParts: _localizedList(json['bodyParts']),
        equipments: _localizedList(json['equipments']),
        secondaryMuscles: _localizedList(json['secondaryMuscles']),
        instructions: _localizedList(json['instructions']),
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

// --- Localization-aware parsing --------------------------------------------
//
// A "localized group" is a list of `{lng, value}` maps, e.g.
// `[{lng:hu,value:mellizmok},{lng:en,value:pectorals}]`. We pick the current
// app language, falling back to English, then the first entry.

bool _isLocalizedGroup(dynamic value) =>
    value is List &&
    value.isNotEmpty &&
    value.every((e) => e is Map && e.containsKey('lng') && e.containsKey('value'));

String _pickLang(List<dynamic> group) {
  final lang = AppStrings.instance.lang;
  String? en;
  String? first;
  for (final e in group) {
    if (e is! Map) continue;
    final v = e['value']?.toString();
    first ??= v;
    final l = e['lng']?.toString();
    if (l == lang) return v ?? '';
    if (l == 'en') en = v;
  }
  return en ?? first ?? '';
}

/// Resolve a scalar text field that may be a plain String or a localized group.
String _localizedString(dynamic value) {
  if (value is String) return value;
  if (_isLocalizedGroup(value)) return _pickLang(value as List);
  if (value is Map) return value['value']?.toString() ?? '';
  return value?.toString() ?? '';
}

/// Resolve a list field whose items may be plain Strings or localized groups.
/// Also tolerates a single flat localized group (returns one string).
List<String> _localizedList(dynamic value) {
  if (value is! List) return const [];
  // A flat localized group sitting where a list is expected → one value.
  if (_isLocalizedGroup(value)) {
    final s = _pickLang(value);
    return s.isEmpty ? const [] : [s];
  }
  return value
      .map((e) => e is String ? e : (e is List ? _pickLang(e) : _localizedString(e)))
      .where((s) => s.isNotEmpty)
      .toList();
}
