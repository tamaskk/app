import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';
import '../models/auth.dart';

/// Thrown when an auth request fails; `message` is safe to show the user.
class AuthException implements Exception {
  final int statusCode;
  final String message;
  AuthException(this.statusCode, this.message);
  @override
  String toString() => 'AuthException($statusCode): $message';
}

/// Handles register / login / session restore against the apps/web backend,
/// and persists the bearer token across launches via SharedPreferences.
class AuthService {
  AuthService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;
  static const _tokenKey = 'auth_token';

  String? _token;
  AuthUser? _user;

  String? get token => _token;
  AuthUser? get user => _user;
  bool get isAuthenticated => _token != null && _user != null;

  Future<AuthUser> register({
    required String email,
    required String password,
    String name = '',
    Map<String, dynamic>? onboarding,
  }) =>
      _authPost('/api/auth/register', {
        'email': email,
        'password': password,
        'name': name,
        if (onboarding != null) 'onboarding': onboarding,
      });

  Future<AuthUser> login({
    required String email,
    required String password,
  }) =>
      _authPost('/api/auth/login', {'email': email, 'password': password});

  /// Request a password reset link. Always succeeds from the user's POV —
  /// the backend deliberately doesn't disclose whether the email exists.
  Future<void> requestPasswordReset({required String email}) async {
    final res = await _client
        .post(
          Uri.parse('$apiBaseUrl/api/auth/forgot-password'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'email': email}),
        )
        .timeout(const Duration(seconds: 20));
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final json = res.body.isEmpty ? null : jsonDecode(res.body);
      final detail = json is Map ? json['detail']?.toString() : null;
      throw AuthException(res.statusCode, detail ?? 'Hiba történt');
    }
  }

  /// Consume a reset token and set a new password. Returns the authenticated
  /// user so the caller can drop straight into the app.
  Future<AuthUser> resetPassword({
    required String token,
    required String newPassword,
  }) =>
      _authPost('/api/auth/reset-password', {
        'token': token,
        'password': newPassword,
      });

  /// Exchange a provider ID token (Apple or Google) for a session.
  /// Server-side validation lives in /api/auth/oauth/[provider].
  Future<AuthUser> signInWithOAuth({
    required String provider,
    required String idToken,
    String name = '',
    Map<String, dynamic>? onboarding,
  }) =>
      _authPost('/api/auth/oauth/$provider', {
        'idToken': idToken,
        'name': name,
        if (onboarding != null) 'onboarding': onboarding,
      });

  /// Persist onboarding answers for the already-authenticated user. Used by
  /// the post-registration onboarding flow. Updates the in-memory user so
  /// later reads (the dashboard, calendar, etc.) see the new data.
  Future<AuthUser> saveOnboarding(Map<String, dynamic> onboarding) async {
    final res = await _client
        .patch(
          Uri.parse('$apiBaseUrl/api/me/onboarding'),
          headers: {
            'Content-Type': 'application/json',
            if (_token != null) 'Authorization': 'Bearer $_token',
          },
          body: jsonEncode({'onboarding': onboarding}),
        )
        .timeout(const Duration(seconds: 20));
    final json = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final detail = json is Map ? json['detail']?.toString() : null;
      throw AuthException(
          res.statusCode, detail ?? 'Onboarding mentése sikertelen');
    }
    final map = json as Map<String, dynamic>;
    _user = AuthUser.fromJson(map['user'] as Map<String, dynamic>);
    return _user!;
  }

  /// Save the user's custom 7-day plan. Pass `null` to reset back to the
  /// onboarding-derived split.
  Future<AuthUser> saveWeeklyPlan(List<String>? plan) async {
    return _patchMeUser('/api/me/weekly-plan', {'weeklyPlan': plan});
  }

  /// Save the user's reminder preferences.
  Future<AuthUser> saveReminders(ReminderPrefs prefs) async {
    return _patchMeUser('/api/me/reminders', prefs.toJson());
  }

  /// Common helper for PATCH endpoints that return `{ user: ... }`.
  Future<AuthUser> _patchMeUser(
      String path, Map<String, dynamic> body) async {
    final res = await _client
        .patch(
          Uri.parse('$apiBaseUrl$path'),
          headers: {
            'Content-Type': 'application/json',
            if (_token != null) 'Authorization': 'Bearer $_token',
          },
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 20));
    final json = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final detail = json is Map ? json['detail']?.toString() : null;
      throw AuthException(res.statusCode, detail ?? 'Mentés sikertelen');
    }
    final map = json as Map<String, dynamic>;
    _user = AuthUser.fromJson(map['user'] as Map<String, dynamic>);
    return _user!;
  }

  /// Pull the current XP / rank summary for the rank screen.
  Future<Map<String, dynamic>> getRankSummary() async {
    return _get('/api/me/rank');
  }

  // --- Subscription (HEFTOR Pro) ----------------------------------------

  /// Fetch the latest subscription state and mirror it onto the cached
  /// AuthUser. Use this after returning from the paywall screen to refresh
  /// the chrome without a full /me re-fetch.
  Future<Subscription> getSubscription() async {
    final data = await _get('/api/me/subscription');
    final sub = Subscription.fromJson(
        (data['subscription'] as Map<String, dynamic>?) ?? const {});
    if (_user != null) {
      _user = _user!.copyWith(subscription: sub);
    }
    return sub;
  }

  /// Begin the one-time 3-day free trial. Backend refuses (409) if the user
  /// has already used theirs.
  Future<Subscription> startTrial() async {
    final res = await _client
        .post(
          Uri.parse('$apiBaseUrl/api/me/subscription/start-trial'),
          headers: {
            'Content-Type': 'application/json',
            if (_token != null) 'Authorization': 'Bearer $_token',
          },
        )
        .timeout(const Duration(seconds: 20));
    final json = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final detail = json is Map ? json['detail']?.toString() : null;
      throw AuthException(res.statusCode, detail ?? 'Failed to start trial');
    }
    final sub = Subscription.fromJson(
        (json as Map<String, dynamic>)['subscription'] as Map<String, dynamic>);
    if (_user != null) {
      _user = _user!.copyWith(subscription: sub);
    }
    return sub;
  }

  /// Record a purchase. In production [receipt] is the StoreKit / Play
  /// Store purchase token; the backend hands it off to Apple / Google for
  /// receipt validation before granting the entitlement.
  Future<Subscription> purchase({
    required String plan, // 'monthly' | 'yearly'
    required String provider, // 'apple' | 'google' | 'stripe' | 'manual'
    String? productId,
    String? receipt,
  }) async {
    final res = await _client
        .post(
          Uri.parse('$apiBaseUrl/api/me/subscription/purchase'),
          headers: {
            'Content-Type': 'application/json',
            if (_token != null) 'Authorization': 'Bearer $_token',
          },
          body: jsonEncode({
            'plan': plan,
            'provider': provider,
            if (productId != null) 'productId': productId,
            if (receipt != null) 'receipt': receipt,
          }),
        )
        .timeout(const Duration(seconds: 30));
    final json = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final detail = json is Map ? json['detail']?.toString() : null;
      throw AuthException(res.statusCode, detail ?? 'Purchase failed');
    }
    final sub = Subscription.fromJson(
        (json as Map<String, dynamic>)['subscription'] as Map<String, dynamic>);
    if (_user != null) {
      _user = _user!.copyWith(subscription: sub);
    }
    return sub;
  }

  /// Mark the subscription as cancelled. The user keeps Pro access until
  /// [Subscription.currentPeriodEnd] passes.
  Future<Subscription> cancelSubscription() async {
    final res = await _client
        .post(
          Uri.parse('$apiBaseUrl/api/me/subscription/cancel'),
          headers: {
            'Content-Type': 'application/json',
            if (_token != null) 'Authorization': 'Bearer $_token',
          },
        )
        .timeout(const Duration(seconds: 20));
    final json = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final detail = json is Map ? json['detail']?.toString() : null;
      throw AuthException(res.statusCode, detail ?? 'Cancellation failed');
    }
    final sub = Subscription.fromJson(
        (json as Map<String, dynamic>)['subscription'] as Map<String, dynamic>);
    if (_user != null) {
      _user = _user!.copyWith(subscription: sub);
    }
    return sub;
  }

  /// Generate a brand-new training plan from preferences. The backend
  /// persists every session as its own Training so it lands in the user's
  /// training list immediately.
  Future<Map<String, dynamic>> generateTrainingPlan({
    required int weeks,
    required int sessionsPerWeek,
    required List<String> focusMuscles,
  }) async {
    final res = await _client
        .post(
          Uri.parse('$apiBaseUrl/api/trainings/generate'),
          headers: {
            'Content-Type': 'application/json',
            if (_token != null) 'Authorization': 'Bearer $_token',
          },
          body: jsonEncode({
            'weeks': weeks,
            'sessionsPerWeek': sessionsPerWeek,
            'focusMuscles': focusMuscles,
          }),
        )
        .timeout(const Duration(seconds: 30));
    final json = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final detail = json is Map ? json['detail']?.toString() : null;
      throw AuthException(res.statusCode, detail ?? 'Generálás sikertelen');
    }
    return (json as Map<String, dynamic>?) ?? const {};
  }

  /// Fetch a page of the leaderboard. `scope` is one of:
  /// `global`, `country`, `rank`, `weekly`. The response always contains the
  /// caller's own row under `ownPosition`, even when it falls outside `results`.
  Future<Map<String, dynamic>> getLeaderboard({
    required String scope,
    int page = 0,
  }) async {
    return _get('/api/leaderboard?scope=$scope&page=$page');
  }

  /// On launch: load a stored token and confirm it's still valid via /me.
  /// Never throws — any failure (no token, expired, unreachable, missing
  /// plugin) resolves to a signed-out state so the UI can't hang.
  Future<AuthUser?> restoreSession() async {
    try {
      final stored = await _readToken();
      if (stored == null || stored.isEmpty) return null;
      _token = stored;
      final data = await _get('/api/auth/me');
      _user = AuthUser.fromJson(data['user'] as Map<String, dynamic>);
      return _user;
    } catch (_) {
      await logout();
      return null;
    }
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_tokenKey);
    } catch (_) {
      // Storage unavailable (e.g. plugin not registered yet) — ignore.
    }
  }

  /// Update the display name.
  Future<AuthUser> updateProfile({required String name}) async {
    final data = await _patchMe({'name': name});
    _user = AuthUser.fromJson(data['user'] as Map<String, dynamic>);
    return _user!;
  }

  /// Change the password (requires the current one).
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _patchMe({
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
  }

  /// Permanently delete the account, then clear the local session.
  Future<void> deleteAccount() async {
    final res = await _client.delete(
      Uri.parse('$apiBaseUrl/api/auth/me'),
      headers: {if (_token != null) 'Authorization': 'Bearer $_token'},
    ).timeout(const Duration(seconds: 20));
    if (res.statusCode != 204 &&
        (res.statusCode < 200 || res.statusCode >= 300)) {
      final json = res.body.isEmpty ? null : jsonDecode(res.body);
      final detail = json is Map ? json['detail']?.toString() : null;
      throw AuthException(res.statusCode, detail ?? 'Failed to delete account');
    }
    await logout();
  }

  Future<Map<String, dynamic>> _patchMe(Map<String, dynamic> body) async {
    final res = await _client
        .patch(
          Uri.parse('$apiBaseUrl/api/auth/me'),
          headers: {
            'Content-Type': 'application/json',
            if (_token != null) 'Authorization': 'Bearer $_token',
          },
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 20));
    final json = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final detail = json is Map ? json['detail']?.toString() : null;
      throw AuthException(res.statusCode, detail ?? 'Hiba történt');
    }
    return (json as Map<String, dynamic>?) ?? const {};
  }

  // --- internals -----------------------------------------------------------

  Future<AuthUser> _authPost(String path, Map<String, dynamic> body) async {
    final res = await _client
        .post(
          Uri.parse('$apiBaseUrl$path'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 20));
    final json = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final detail = json is Map ? json['detail']?.toString() : null;
      throw AuthException(res.statusCode, detail ?? 'Hiba történt');
    }
    final map = json as Map<String, dynamic>;
    _token = map['token'] as String?;
    _user = AuthUser.fromJson(map['user'] as Map<String, dynamic>);
    if (_token != null) await _writeToken(_token!);
    return _user!;
  }

  Future<String?> _readToken() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_tokenKey);
    } catch (_) {
      return null; // storage unavailable
    }
  }

  Future<void> _writeToken(String token) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenKey, token);
    } catch (_) {
      // Couldn't persist; the token still lives in memory for this session.
    }
  }

  Future<Map<String, dynamic>> _get(String path) async {
    final res = await _client.get(
      Uri.parse('$apiBaseUrl$path'),
      headers: {if (_token != null) 'Authorization': 'Bearer $_token'},
    ).timeout(const Duration(seconds: 20));
    final json = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final detail = json is Map ? json['detail']?.toString() : null;
      throw AuthException(res.statusCode, detail ?? 'Request failed');
    }
    return json as Map<String, dynamic>;
  }

  void dispose() => _client.close();
}
