// Register / login / session restore against apps/web, persisting the bearer
// token across launches. Ported 1:1 from apps/mobile/lib/services/auth_service.dart.
import { apiBaseUrl } from "../config";
import { StorageKeys, getItem, setItem, removeItem } from "./storage";
import { t } from "../i18n";
import { AuthUser, ReminderPrefs, Subscription } from "../models/auth";

/** Thrown when an auth request fails; `message` is safe to show the user. */
export class AuthException extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "AuthException";
  }
}

const TIMEOUT_MS = 20000;

async function fetchWithTimeout(input: string, init: RequestInit, ms = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export class AuthService {
  private _token: string | null = null;
  private _user: AuthUser | null = null;

  get token(): string | null {
    return this._token;
  }
  get user(): AuthUser | null {
    return this._user;
  }
  get isAuthenticated(): boolean {
    return this._token != null && this._user != null;
  }

  register(opts: {
    email: string;
    password: string;
    name?: string;
    onboarding?: Record<string, unknown> | null;
  }): Promise<AuthUser> {
    return this.authPost("/api/auth/register", {
      email: opts.email,
      password: opts.password,
      name: opts.name ?? "",
      ...(opts.onboarding ? { onboarding: opts.onboarding } : {}),
    });
  }

  login(email: string, password: string): Promise<AuthUser> {
    return this.authPost("/api/auth/login", { email, password });
  }

  /** Request a password reset link. Always succeeds from the user's POV. */
  async requestPasswordReset(email: string): Promise<void> {
    const res = await fetchWithTimeout(`${apiBaseUrl}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.status < 200 || res.status >= 300) {
      const body = await this.body(res);
      throw new AuthException(res.status, body?.detail?.toString() ?? t("common.error"));
    }
  }

  /** Consume a reset token and set a new password; returns the signed-in user. */
  resetPassword(token: string, newPassword: string): Promise<AuthUser> {
    return this.authPost("/api/auth/reset-password", { token, password: newPassword });
  }

  /** Exchange a provider ID token (Apple or Google) for a session. */
  signInWithOAuth(opts: {
    provider: string;
    idToken: string;
    name?: string;
    onboarding?: Record<string, unknown> | null;
  }): Promise<AuthUser> {
    return this.authPost(`/api/auth/oauth/${opts.provider}`, {
      idToken: opts.idToken,
      name: opts.name ?? "",
      ...(opts.onboarding ? { onboarding: opts.onboarding } : {}),
    });
  }

  /** Persist onboarding answers for the already-authenticated user. */
  async saveOnboarding(onboarding: Record<string, unknown>): Promise<AuthUser> {
    const res = await fetchWithTimeout(`${apiBaseUrl}/api/me/onboarding`, {
      method: "PATCH",
      headers: this.jsonHeaders(),
      body: JSON.stringify({ onboarding }),
    });
    const body = await this.body(res);
    if (res.status < 200 || res.status >= 300) {
      throw new AuthException(res.status, body?.detail?.toString() ?? t("onboarding.save_failed"));
    }
    this._user = AuthUser.fromJson(body.user);
    return this._user;
  }

  saveWeeklyPlan(plan: string[] | null): Promise<AuthUser> {
    return this.patchMeUser("/api/me/weekly-plan", { weeklyPlan: plan });
  }

  saveReminders(prefs: ReminderPrefs): Promise<AuthUser> {
    return this.patchMeUser("/api/me/reminders", prefs.toJson());
  }

  private async patchMeUser(path: string, body: Record<string, unknown>): Promise<AuthUser> {
    const res = await fetchWithTimeout(`${apiBaseUrl}${path}`, {
      method: "PATCH",
      headers: this.jsonHeaders(),
      body: JSON.stringify(body),
    });
    const json = await this.body(res);
    if (res.status < 200 || res.status >= 300) {
      throw new AuthException(res.status, json?.detail?.toString() ?? t("autherr.save_failed"));
    }
    this._user = AuthUser.fromJson(json.user);
    return this._user;
  }

  /** Pull the current XP / rank summary for the rank screen. */
  getRankSummary(): Promise<any> {
    return this.getJson("/api/me/rank");
  }

  // --- Subscription (HEFTOR Pro) -----------------------------------------

  async getSubscription(): Promise<Subscription> {
    const data = await this.getJson("/api/me/subscription");
    const sub = Subscription.fromJson(data?.subscription ?? {});
    if (this._user) this._user = this._user.copyWith({ subscription: sub });
    return sub;
  }

  async startTrial(): Promise<Subscription> {
    const res = await fetchWithTimeout(`${apiBaseUrl}/api/me/subscription/start-trial`, {
      method: "POST",
      headers: this.jsonHeaders(),
    });
    const json = await this.body(res);
    if (res.status < 200 || res.status >= 300) {
      throw new AuthException(res.status, json?.detail?.toString() ?? "Failed to start trial");
    }
    const sub = Subscription.fromJson(json.subscription);
    if (this._user) this._user = this._user.copyWith({ subscription: sub });
    return sub;
  }

  async purchase(opts: {
    plan: string;
    provider: string;
    productId?: string;
    receipt?: string;
  }): Promise<Subscription> {
    const res = await fetchWithTimeout(
      `${apiBaseUrl}/api/me/subscription/purchase`,
      {
        method: "POST",
        headers: this.jsonHeaders(),
        body: JSON.stringify({
          plan: opts.plan,
          provider: opts.provider,
          ...(opts.productId != null ? { productId: opts.productId } : {}),
          ...(opts.receipt != null ? { receipt: opts.receipt } : {}),
        }),
      },
      30000,
    );
    const json = await this.body(res);
    if (res.status < 200 || res.status >= 300) {
      throw new AuthException(res.status, json?.detail?.toString() ?? "Purchase failed");
    }
    const sub = Subscription.fromJson(json.subscription);
    if (this._user) this._user = this._user.copyWith({ subscription: sub });
    return sub;
  }

  async cancelSubscription(): Promise<Subscription> {
    const res = await fetchWithTimeout(`${apiBaseUrl}/api/me/subscription/cancel`, {
      method: "POST",
      headers: this.jsonHeaders(),
    });
    const json = await this.body(res);
    if (res.status < 200 || res.status >= 300) {
      throw new AuthException(res.status, json?.detail?.toString() ?? "Cancellation failed");
    }
    const sub = Subscription.fromJson(json.subscription);
    if (this._user) this._user = this._user.copyWith({ subscription: sub });
    return sub;
  }

  /** Generate a brand-new training plan from preferences. */
  async generateTrainingPlan(opts: {
    weeks: number;
    sessionsPerWeek: number;
    focusMuscles: string[];
  }): Promise<any> {
    const res = await fetchWithTimeout(
      `${apiBaseUrl}/api/trainings/generate`,
      {
        method: "POST",
        headers: this.jsonHeaders(),
        body: JSON.stringify(opts),
      },
      30000,
    );
    const json = await this.body(res);
    if (res.status < 200 || res.status >= 300) {
      throw new AuthException(res.status, json?.detail?.toString() ?? t("autherr.generate_failed"));
    }
    return json ?? {};
  }

  /** Fetch a page of the leaderboard. scope: global|country|rank|weekly. */
  getLeaderboard(scope: string, page = 0): Promise<any> {
    return this.getJson(`/api/leaderboard?scope=${scope}&page=${page}`);
  }

  /** On launch: load a stored token and confirm it via /me. Never throws. */
  async restoreSession(): Promise<AuthUser | null> {
    try {
      const stored = await getItem(StorageKeys.authToken);
      if (!stored) return null;
      this._token = stored;
      const data = await this.getJson("/api/auth/me");
      this._user = AuthUser.fromJson(data.user);
      return this._user;
    } catch {
      await this.logout();
      return null;
    }
  }

  async logout(): Promise<void> {
    this._token = null;
    this._user = null;
    await removeItem(StorageKeys.authToken);
  }

  /** Update the display name. */
  async updateProfile(name: string): Promise<AuthUser> {
    const data = await this.patchMe({ name });
    const returnedName = (data?.user?.name as string) ?? name;
    // Merge only the changed field — the PATCH response is a slim projection,
    // so rebuilding from it would wipe the cached subscription/xp/rank/etc.
    this._user = this._user
      ? this._user.copyWith({ name: returnedName })
      : AuthUser.fromJson(data.user);
    return this._user;
  }

  /** Change the password (requires the current one). */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.patchMe({ currentPassword, newPassword });
  }

  /** Permanently delete the account, then clear the local session. */
  async deleteAccount(): Promise<void> {
    const res = await fetchWithTimeout(`${apiBaseUrl}/api/auth/me`, {
      method: "DELETE",
      headers: this._token ? { Authorization: `Bearer ${this._token}` } : {},
    });
    if (res.status !== 204 && (res.status < 200 || res.status >= 300)) {
      const json = await this.body(res);
      throw new AuthException(res.status, json?.detail?.toString() ?? "Failed to delete account");
    }
    await this.logout();
  }

  private async patchMe(body: Record<string, unknown>): Promise<any> {
    const res = await fetchWithTimeout(`${apiBaseUrl}/api/auth/me`, {
      method: "PATCH",
      headers: this.jsonHeaders(),
      body: JSON.stringify(body),
    });
    const json = await this.body(res);
    if (res.status < 200 || res.status >= 300) {
      throw new AuthException(res.status, json?.detail?.toString() ?? t("common.error"));
    }
    return json ?? {};
  }

  // --- internals ---------------------------------------------------------

  private jsonHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...(this._token ? { Authorization: `Bearer ${this._token}` } : {}),
    };
  }

  private async body(res: Response): Promise<any> {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  private async authPost(path: string, body: Record<string, unknown>): Promise<AuthUser> {
    const res = await fetchWithTimeout(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await this.body(res);
    if (res.status < 200 || res.status >= 300) {
      throw new AuthException(res.status, json?.detail?.toString() ?? t("common.error"));
    }
    this._token = (json.token as string) ?? null;
    this._user = AuthUser.fromJson(json.user);
    if (this._token) await setItem(StorageKeys.authToken, this._token);
    return this._user;
  }

  private async getJson(path: string): Promise<any> {
    const res = await fetchWithTimeout(`${apiBaseUrl}${path}`, {
      method: "GET",
      headers: this._token ? { Authorization: `Bearer ${this._token}` } : {},
    });
    const json = await this.body(res);
    if (res.status < 200 || res.status >= 300) {
      throw new AuthException(res.status, json?.detail?.toString() ?? "Request failed");
    }
    return json;
  }
}
