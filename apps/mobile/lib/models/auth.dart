/// The authenticated user returned by the auth endpoints.
class AuthUser {
  final String id;
  final String email;
  final String name;
  final AuthOnboarding? onboarding;
  // Gamification — populated from /me, /login, /register, /oauth, /reset.
  final int xp;
  final int rank;
  final String? username;
  // Custom 7-day plan and reminder preferences (null = use defaults).
  final List<String>? weeklyPlan;
  final ReminderPrefs? reminders;
  // HEFTOR Pro subscription state. Always present — defaults to a free
  // sub on accounts that haven't seen the paywall yet.
  final Subscription subscription;

  AuthUser({
    required this.id,
    required this.email,
    required this.name,
    this.onboarding,
    this.xp = 0,
    this.rank = 1,
    this.username,
    this.weeklyPlan,
    this.reminders,
    Subscription? subscription,
  }) : subscription = subscription ?? const Subscription.free();

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id']?.toString() ?? '',
        email: json['email'] as String? ?? '',
        name: json['name'] as String? ?? '',
        onboarding: json['onboarding'] is Map<String, dynamic>
            ? AuthOnboarding.fromJson(json['onboarding'] as Map<String, dynamic>)
            : null,
        xp: (json['xp'] as num?)?.toInt() ?? 0,
        rank: (json['rank'] as num?)?.toInt() ?? 1,
        username: json['username'] as String?,
        weeklyPlan: json['weeklyPlan'] is List
            ? (json['weeklyPlan'] as List).map((e) => e.toString()).toList()
            : null,
        reminders: json['reminders'] is Map<String, dynamic>
            ? ReminderPrefs.fromJson(
                json['reminders'] as Map<String, dynamic>)
            : null,
        subscription: json['subscription'] is Map<String, dynamic>
            ? Subscription.fromJson(
                json['subscription'] as Map<String, dynamic>)
            : const Subscription.free(),
      );

  AuthUser copyWith({
    String? name,
    int? xp,
    int? rank,
    String? username,
    List<String>? weeklyPlan,
    ReminderPrefs? reminders,
    Subscription? subscription,
  }) =>
      AuthUser(
        id: id,
        email: email,
        name: name ?? this.name,
        onboarding: onboarding,
        xp: xp ?? this.xp,
        rank: rank ?? this.rank,
        username: username ?? this.username,
        weeklyPlan: weeklyPlan ?? this.weeklyPlan,
        reminders: reminders ?? this.reminders,
        subscription: subscription ?? this.subscription,
      );

  /// First name (or the email's local part) for greetings.
  String get displayName {
    if (name.trim().isNotEmpty) return name.trim().split(' ').first;
    final at = email.indexOf('@');
    return at > 0 ? email.substring(0, at) : email;
  }
}

/// Daily reminder preferences. Time is "HH:mm" in the device's timezone.
/// Days are ISO weekday indices (1..7, Mon..Sun).
class ReminderPrefs {
  final bool enabled;
  final String time; // "HH:mm"
  final List<int> days; // 1..7

  const ReminderPrefs({
    this.enabled = false,
    this.time = '18:00',
    this.days = const [],
  });

  factory ReminderPrefs.fromJson(Map<String, dynamic> json) => ReminderPrefs(
        enabled: json['enabled'] as bool? ?? false,
        time: json['time'] as String? ?? '18:00',
        days: (json['days'] as List?)
                ?.whereType<num>()
                .map((n) => n.toInt())
                .toList() ??
            const [],
      );

  Map<String, dynamic> toJson() => {
        'enabled': enabled,
        'time': time,
        'days': days,
      };

  ReminderPrefs copyWith({bool? enabled, String? time, List<int>? days}) =>
      ReminderPrefs(
        enabled: enabled ?? this.enabled,
        time: time ?? this.time,
        days: days ?? this.days,
      );
}

/// Subset of onboarding fields the app needs after sign-in. Mirrors the
/// server's User.onboarding shape but only carries what the UI reads.
class AuthOnboarding {
  final String? goal;
  final String? experience;
  final String? split;
  final int? daysPerWeek;
  final int? sessionDuration;
  final int? optimalVolume;

  const AuthOnboarding({
    this.goal,
    this.experience,
    this.split,
    this.daysPerWeek,
    this.sessionDuration,
    this.optimalVolume,
  });

  factory AuthOnboarding.fromJson(Map<String, dynamic> json) => AuthOnboarding(
        goal: json['goal'] as String?,
        experience: json['experience'] as String?,
        split: json['split'] as String?,
        daysPerWeek: (json['daysPerWeek'] as num?)?.toInt(),
        sessionDuration: (json['sessionDuration'] as num?)?.toInt(),
        optimalVolume: (json['optimalVolume'] as num?)?.toInt(),
      );
}

/// Subscription state mirrored from the server. The `isPro` flag is the
/// authoritative entitlement check — it's computed server-side so the app
/// doesn't have to duplicate the trial / period-end logic.
class Subscription {
  /// `free | trialing | active | cancelled | expired`
  final String status;

  /// `monthly | yearly | null`
  final String? plan;

  /// `apple | google | stripe | manual | null`
  final String? provider;

  /// App Store / Play Store product id (e.g. `heftor_pro_monthly`).
  final String? productId;

  /// Set when the user has consumed their once-per-account trial.
  final DateTime? trialUsedAt;
  final DateTime? trialEndsAt;
  final DateTime? currentPeriodEnd;
  final DateTime? lastValidatedAt;

  /// Server-evaluated entitlement check.
  final bool isPro;

  const Subscription({
    required this.status,
    this.plan,
    this.provider,
    this.productId,
    this.trialUsedAt,
    this.trialEndsAt,
    this.currentPeriodEnd,
    this.lastValidatedAt,
    this.isPro = false,
  });

  /// Default for accounts that have never seen the paywall.
  const Subscription.free()
      : status = 'free',
        plan = null,
        provider = null,
        productId = null,
        trialUsedAt = null,
        trialEndsAt = null,
        currentPeriodEnd = null,
        lastValidatedAt = null,
        isPro = false;

  bool get isTrialing => status == 'trialing';
  bool get hasUsedTrial => trialUsedAt != null;

  /// Days remaining in the trial — null when not trialing.
  int? get trialDaysLeft {
    if (!isTrialing || trialEndsAt == null) return null;
    final ms = trialEndsAt!.difference(DateTime.now()).inMilliseconds;
    if (ms <= 0) return 0;
    return (ms / (24 * 60 * 60 * 1000)).ceil();
  }

  factory Subscription.fromJson(Map<String, dynamic> json) {
    DateTime? d(dynamic v) {
      if (v == null) return null;
      try {
        return DateTime.parse(v.toString()).toLocal();
      } catch (_) {
        return null;
      }
    }

    return Subscription(
      status: (json['status'] as String?) ?? 'free',
      plan: json['plan'] as String?,
      provider: json['provider'] as String?,
      productId: json['productId'] as String?,
      trialUsedAt: d(json['trialUsedAt']),
      trialEndsAt: d(json['trialEndsAt']),
      currentPeriodEnd: d(json['currentPeriodEnd']),
      lastValidatedAt: d(json['lastValidatedAt']),
      isPro: (json['isPro'] as bool?) ?? false,
    );
  }
}
