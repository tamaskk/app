import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';
import '../models/api_models.dart';

/// Thrown when the backend responds with a non-2xx status.
class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

/// Thrown specifically when the backend refuses to save another workout
/// because the free-tier ceiling (2 saved workouts) has been reached. The
/// UI catches this and opens the paywall instead of showing a generic
/// error toast.
class FreeTierLimitException implements Exception {
  final int limit;
  FreeTierLimitException(this.limit);

  @override
  String toString() => 'FreeTierLimitException(limit=$limit)';
}

/// Thin client over the HEFTOR backend (apps/web), which in turn proxies the
/// MuscleWiki API. The MuscleWiki key never lives in the app.
class Api {
  Api({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Uri _uri(String path, [Map<String, dynamic>? query]) {
    final params = <String, dynamic>{};
    query?.forEach((key, value) {
      if (value == null) return;
      if (value is Iterable) {
        if (value.isNotEmpty) params[key] = value.map((e) => '$e').toList();
      } else {
        final s = '$value';
        if (s.isNotEmpty) params[key] = s;
      }
    });
    return Uri.parse('$apiBaseUrl$path').replace(
      queryParameters: params.isEmpty ? null : params,
    );
  }

  /// The stored bearer token, if the user is signed in. Best-effort.
  Future<String?> _authToken() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString('auth_token');
    } catch (_) {
      return null;
    }
  }

  Future<dynamic> _get(Uri uri) async {
    // Attach the bearer token so user-scoped endpoints (e.g. /api/trainings,
    // which filters by userId) return THIS user's rows — including generated
    // plans. Without it the server treats the call as anonymous (userId:null)
    // and generated/owned trainings are invisible.
    final token = await _authToken();
    final res = await _client.get(
      uri,
      headers: {if (token != null) 'Authorization': 'Bearer $token'},
    );
    final body = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) return body;
    final detail = body is Map ? (body['detail']?.toString()) : null;
    throw ApiException(res.statusCode, detail ?? 'Request failed');
  }

  /// Available filter values (muscles, difficulties, categories).
  Future<ExerciseFilters> getFilters() async {
    final data = await _get(_uri('/api/filters'));
    return ExerciseFilters.fromJson(data as Map<String, dynamic>);
  }

  /// Search / list exercises. Returns the minimal shape for list views.
  Future<List<ExerciseMinimal>> listExercises({
    String? search,
    String? category,
    List<String>? muscles,
    String? difficulty,
    int limit = 30,
    int offset = 0,
  }) async {
    final data = await _get(_uri('/api/exercises', {
      'search': (search != null && search.length >= 2) ? search : null,
      'category': category,
      'muscles': muscles,
      'difficulty': difficulty,
      'limit': limit,
      'offset': offset,
    }));
    final results = (data as Map<String, dynamic>)['results'] as List? ?? [];
    return results
        .map((e) => ExerciseMinimal.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Full details for a single exercise.
  Future<ExerciseDetail> getExercise(int id) async {
    final data = await _get(_uri('/api/exercises/$id'));
    return ExerciseDetail.fromJson(data as Map<String, dynamic>);
  }

  /// Fetch all saved trainings, newest first.
  Future<List<SavedTraining>> getTrainings() async {
    final data = await _get(_uri('/api/trainings'));
    final results = (data as Map<String, dynamic>)['results'] as List? ?? [];
    return results
        .map((e) => SavedTraining.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Persist a created training to the backend (Mongo).
  Future<void> createTraining({
    required String name,
    required List<Map<String, dynamic>> exercises,
  }) async {
    // Same SharedPreferences-based token grab as createSession — keeps the
    // free-tier check on the backend honest. Anonymous calls (no token) are
    // still accepted; the backend skips the ceiling for those.
    String? token;
    try {
      final prefs = await SharedPreferences.getInstance();
      token = prefs.getString('auth_token');
    } catch (_) {}
    final res = await _client.post(
      _uri('/api/trainings'),
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'name': name, 'exercises': exercises}),
    );
    if (res.statusCode == 402) {
      // FREE_TIER_LIMIT — let the UI open the paywall.
      final body = res.body.isEmpty ? null : jsonDecode(res.body);
      final limit = body is Map ? (body['limit'] as num?)?.toInt() ?? 2 : 2;
      throw FreeTierLimitException(limit);
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final body = res.body.isEmpty ? null : jsonDecode(res.body);
      final detail = body is Map ? body['detail']?.toString() : null;
      throw ApiException(res.statusCode, detail ?? 'Failed to save training');
    }
  }

  /// Update an existing training (persists live workout edits).
  Future<void> updateTraining({
    required String id,
    String? name,
    required List<Map<String, dynamic>> exercises,
  }) async {
    final res = await _client.patch(
      _uri('/api/trainings/$id'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        if (name != null) 'name': name,
        'exercises': exercises,
      }),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final body = res.body.isEmpty ? null : jsonDecode(res.body);
      final detail = body is Map ? body['detail']?.toString() : null;
      throw ApiException(res.statusCode, detail ?? 'Failed to update training');
    }
  }

  /// Save a completed workout session (history); returns the created session.
  Future<WorkoutSessionWithRank> createSession({
    String? trainingId,
    required String name,
    required DateTime startedAt,
    required DateTime finishedAt,
    required List<Map<String, dynamic>> exercises,
  }) async {
    // Pull the auth token directly from SharedPreferences — same key the
    // AuthService writes. The backend awards XP only when this header is
    // present and valid.
    String? token;
    try {
      final prefs = await SharedPreferences.getInstance();
      token = prefs.getString('auth_token');
    } catch (_) {}
    final res = await _client.post(
      _uri('/api/sessions'),
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'trainingId': trainingId,
        'name': name,
        'startedAt': startedAt.toUtc().toIso8601String(),
        'finishedAt': finishedAt.toUtc().toIso8601String(),
        'exercises': exercises,
      }),
    );
    final body = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final detail = body is Map ? body['detail']?.toString() : null;
      throw ApiException(res.statusCode, detail ?? 'Failed to save session');
    }
    final map = body as Map<String, dynamic>;
    return WorkoutSessionWithRank(
      session: WorkoutSession.fromJson(map),
      rankDelta: map['rankDelta'] is Map<String, dynamic>
          ? RankDelta.fromJson(map['rankDelta'] as Map<String, dynamic>)
          : null,
    );
  }

  /// Delete a training.
  Future<void> deleteTraining(String id) async {
    final res = await _client.delete(_uri('/api/trainings/$id'));
    if (res.statusCode != 204 &&
        (res.statusCode < 200 || res.statusCode >= 300)) {
      final body = res.body.isEmpty ? null : jsonDecode(res.body);
      final detail = body is Map ? body['detail']?.toString() : null;
      throw ApiException(res.statusCode, detail ?? 'Failed to delete training');
    }
  }

  /// Next-set suggestions from the auto-progression engine, keyed by
  /// exerciseId. Sends each exercise's strategy + metadata; the backend reads
  /// recent history and computes. Missing/`none` entries are absent from the
  /// map. Never throws — returns an empty map on any failure (hint is optional).
  Future<Map<String, ProgressionSuggestion>> getProgressionSuggestions(
    List<Map<String, dynamic>> exercises,
  ) async {
    if (exercises.isEmpty) return {};
    try {
      final res = await _client.post(
        _uri('/api/progression'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'exercises': exercises}),
      );
      if (res.statusCode < 200 || res.statusCode >= 300) return {};
      final body = res.body.isEmpty ? null : jsonDecode(res.body);
      final map = (body is Map ? body['suggestions'] : null) as Map?;
      if (map == null) return {};
      final out = <String, ProgressionSuggestion>{};
      map.forEach((key, value) {
        if (value is Map) {
          out['$key'] =
              ProgressionSuggestion.fromJson(value.cast<String, dynamic>());
        }
      });
      return out;
    } catch (_) {
      return {};
    }
  }

  /// Exercises whose best e1RM has stalled. Best-effort — returns an empty
  /// list on any failure so the dashboard banner simply stays hidden.
  Future<List<StagnationItem>> getStagnation({int? weeks, double? threshold}) async {
    try {
      final data = await _get(_uri('/api/progress/stagnation', {
        'weeks': weeks,
        'threshold': threshold,
      }));
      final results = (data as Map<String, dynamic>)['results'] as List? ?? [];
      return results
          .map((e) => StagnationItem.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Past workout sessions, newest first.
  Future<List<WorkoutSession>> getSessions() async {
    final data = await _get(_uri('/api/sessions'));
    final results = (data as Map<String, dynamic>)['results'] as List? ?? [];
    return results
        .map((e) => WorkoutSession.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  void dispose() => _client.close();
}
