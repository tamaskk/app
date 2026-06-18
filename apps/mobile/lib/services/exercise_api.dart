import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';
import '../models/exercise_api_models.dart';
import 'api.dart' show ApiException;

/// Client for the Gym Exercise API (`$exerciseApiBaseUrl/api/v1`).
///
/// Wraps the ExerciseDB-backed catalogue: filter, fuzzy search, single lookup,
/// and the body-part / muscle / equipment metadata lists.
class ExerciseApi {
  ExerciseApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Uri _uri(String path, [Map<String, dynamic>? query]) {
    final params = <String, dynamic>{};
    query?.forEach((key, value) {
      if (value == null) return;
      if (value is Iterable) {
        if (value.isNotEmpty) params[key] = value.map((e) => '$e').join(',');
      } else {
        final s = '$value';
        if (s.isNotEmpty) params[key] = s;
      }
    });
    return Uri.parse('$exerciseApiBaseUrl/api/v1$path').replace(
      queryParameters: params.isEmpty ? null : params,
    );
  }

  Future<Map<String, dynamic>> _get(Uri uri) async {
    final res =
        await _client.get(uri).timeout(const Duration(seconds: 15));
    final body = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return (body as Map<String, dynamic>?) ?? const {};
    }
    // Error envelope: { success:false, error:{ code, message, detail } }
    final error = body is Map ? body['error'] : null;
    final message = error is Map
        ? (error['message'] ?? error['detail'])?.toString()
        : null;
    throw ApiException(res.statusCode, message ?? 'Request failed');
  }

  /// Filtered, cursor-paginated list. Pass `after` (a `nextCursor`) to page.
  Future<ExercisePage> listExercises({
    String? name,
    List<String>? bodyParts,
    List<String>? targetMuscles,
    List<String>? equipments,
    int limit = 25,
    String? after,
  }) async {
    final json = await _get(_uri('/exercises', {
      'name': name,
      'bodyParts': bodyParts,
      'targetMuscles': targetMuscles,
      'equipments': equipments,
      'limit': limit,
      'after': after,
    }));
    return ExercisePage.fromJson(json);
  }

  /// Fuzzy search. `threshold` 0 = exact … 1 = loose (default 0.3 server-side).
  Future<List<ApiExercise>> searchExercises(
    String query, {
    double? threshold,
    int limit = 20,
  }) async {
    final json = await _get(_uri('/exercises/search', {
      'search': query,
      'threshold': threshold,
      'limit': limit,
    }));
    final data = (json['data'] as List?) ?? const [];
    return data
        .map((e) => ApiExercise.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Single exercise by its catalogue id.
  Future<ApiExercise> getExercise(String exerciseId) async {
    final json = await _get(_uri('/exercises/$exerciseId'));
    return ApiExercise.fromJson(json['data'] as Map<String, dynamic>);
  }

  Future<List<String>> bodyParts() => _names('/bodyparts');
  Future<List<String>> muscles() => _names('/muscles');
  Future<List<String>> equipments() => _names('/equipments');

  /// Metadata endpoints return `{ success, data: [{ name }] }`. `name` is a
  /// plain string in the legacy shape, or a localized group `[{lng,value}]`
  /// in the localized catalogue. We key off the English value so it stays a
  /// stable filter key the catalogue matches against.
  Future<List<String>> _names(String path) async {
    final json = await _get(_uri(path));
    final data = (json['data'] as List?) ?? const [];
    return data.map(_name).where((s) => s.isNotEmpty).toList();
  }

  String _name(dynamic entry) {
    final n = entry is Map ? entry['name'] : entry;
    if (n is String) return n;
    if (n is List) {
      String? en, first;
      for (final m in n) {
        if (m is! Map) continue;
        final v = m['value']?.toString();
        first ??= v;
        if (m['lng']?.toString() == 'en') en = v;
      }
      return en ?? first ?? '';
    }
    return n?.toString() ?? '';
  }

  void dispose() => _client.close();
}
