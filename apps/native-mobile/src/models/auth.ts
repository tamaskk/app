// Ported 1:1 from apps/mobile/lib/models/auth.dart.

/** Daily reminder preferences. Time is "HH:mm"; days are ISO weekdays (1..7). */
export class ReminderPrefs {
  constructor(
    public enabled: boolean = false,
    public time: string = "18:00",
    public days: number[] = [],
  ) {}
  static fromJson(j: any): ReminderPrefs {
    return new ReminderPrefs(
      (j.enabled as boolean) ?? false,
      (j.time as string) ?? "18:00",
      Array.isArray(j.days)
        ? j.days.filter((n: unknown) => typeof n === "number").map((n: number) => Math.trunc(n))
        : [],
    );
  }
  toJson(): Record<string, unknown> {
    return { enabled: this.enabled, time: this.time, days: this.days };
  }
  copyWith(p: { enabled?: boolean; time?: string; days?: number[] }): ReminderPrefs {
    return new ReminderPrefs(
      p.enabled ?? this.enabled,
      p.time ?? this.time,
      p.days ?? this.days,
    );
  }
}

/** Subset of onboarding fields the app reads after sign-in. */
export class AuthOnboarding {
  constructor(
    public goal: string | null = null,
    public experience: string | null = null,
    public split: string | null = null,
    public daysPerWeek: number | null = null,
    public sessionDuration: number | null = null,
    public optimalVolume: number | null = null,
  ) {}
  static fromJson(j: any): AuthOnboarding {
    return new AuthOnboarding(
      (j.goal as string) ?? null,
      (j.experience as string) ?? null,
      (j.split as string) ?? null,
      j.daysPerWeek != null ? Math.trunc(j.daysPerWeek) : null,
      j.sessionDuration != null ? Math.trunc(j.sessionDuration) : null,
      j.optimalVolume != null ? Math.trunc(j.optimalVolume) : null,
    );
  }
}

function parseLocalDate(v: unknown): Date | null {
  if (v == null) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

/** Subscription state mirrored from the server. `isPro` is authoritative. */
export class Subscription {
  constructor(
    public status: string,
    public plan: string | null = null,
    public provider: string | null = null,
    public productId: string | null = null,
    public trialUsedAt: Date | null = null,
    public trialEndsAt: Date | null = null,
    public currentPeriodEnd: Date | null = null,
    public lastValidatedAt: Date | null = null,
    public isPro: boolean = false,
  ) {}

  static free(): Subscription {
    return new Subscription("free");
  }

  static fromJson(j: any): Subscription {
    return new Subscription(
      (j.status as string) ?? "free",
      (j.plan as string) ?? null,
      (j.provider as string) ?? null,
      (j.productId as string) ?? null,
      parseLocalDate(j.trialUsedAt),
      parseLocalDate(j.trialEndsAt),
      parseLocalDate(j.currentPeriodEnd),
      parseLocalDate(j.lastValidatedAt),
      (j.isPro as boolean) ?? false,
    );
  }

  get isTrialing(): boolean {
    return this.status === "trialing";
  }
  get hasUsedTrial(): boolean {
    return this.trialUsedAt != null;
  }
  /** Days remaining in the trial — null when not trialing. */
  get trialDaysLeft(): number | null {
    if (!this.isTrialing || this.trialEndsAt == null) return null;
    const ms = this.trialEndsAt.getTime() - Date.now();
    if (ms <= 0) return 0;
    return Math.ceil(ms / (24 * 60 * 60 * 1000));
  }
}

/** The authenticated user returned by the auth endpoints. */
export class AuthUser {
  constructor(
    public id: string,
    public email: string,
    public name: string,
    public onboarding: AuthOnboarding | null = null,
    public xp: number = 0,
    public rank: number = 1,
    public username: string | null = null,
    public weeklyPlan: string[] | null = null,
    public reminders: ReminderPrefs | null = null,
    public subscription: Subscription = Subscription.free(),
  ) {}

  static fromJson(j: any): AuthUser {
    return new AuthUser(
      j.id != null ? String(j.id) : "",
      (j.email as string) ?? "",
      (j.name as string) ?? "",
      j.onboarding && typeof j.onboarding === "object"
        ? AuthOnboarding.fromJson(j.onboarding)
        : null,
      (j.xp as number) ?? 0,
      (j.rank as number) ?? 1,
      (j.username as string) ?? null,
      Array.isArray(j.weeklyPlan) ? j.weeklyPlan.map((e: unknown) => String(e)) : null,
      j.reminders && typeof j.reminders === "object"
        ? ReminderPrefs.fromJson(j.reminders)
        : null,
      j.subscription && typeof j.subscription === "object"
        ? Subscription.fromJson(j.subscription)
        : Subscription.free(),
    );
  }

  copyWith(p: {
    name?: string;
    xp?: number;
    rank?: number;
    username?: string | null;
    weeklyPlan?: string[] | null;
    reminders?: ReminderPrefs | null;
    subscription?: Subscription;
  }): AuthUser {
    return new AuthUser(
      this.id,
      this.email,
      p.name ?? this.name,
      this.onboarding,
      p.xp ?? this.xp,
      p.rank ?? this.rank,
      p.username !== undefined ? p.username : this.username,
      p.weeklyPlan !== undefined ? p.weeklyPlan : this.weeklyPlan,
      p.reminders !== undefined ? p.reminders : this.reminders,
      p.subscription ?? this.subscription,
    );
  }

  /** First name (or the email's local part) for greetings. */
  get displayName(): string {
    if (this.name.trim().length > 0) return this.name.trim().split(" ")[0];
    const at = this.email.indexOf("@");
    return at > 0 ? this.email.substring(0, at) : this.email;
  }
}
