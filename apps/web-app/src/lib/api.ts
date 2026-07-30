// Thin client over the HEFTOR backend (apps/web) — a 1:1 port of
// apps/mobile/lib/services/api.dart + auth_service.dart. Same endpoints,
// same bearer-token scheme (token in localStorage under `auth_token`).

import { API_BASE_URL, TOKEN_KEY, gifUrlFor } from "./config";
import type {
  AuthUser,
  ProgressionSuggestion,
  SavedTraining,
  StagnationItem,
  WorkoutSession,
  WorkoutSessionWithRank,
} from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Free-tier ceiling reached (HTTP 402) — the UI opens the paywall. */
export class FreeTierLimitError extends Error {
  constructor(public limit: number) {
    super(`FreeTierLimit(${limit})`);
    this.name = "FreeTierLimitError";
  }
}

function token(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function authHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = {};
  if (json) h["Content-Type"] = "application/json";
  const tk = token();
  if (tk) h["Authorization"] = `Bearer ${tk}`;
  return h;
}

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      if (v.length) v.forEach((item) => sp.append(k, String(item)));
    } else {
      const s = String(v);
      if (s.length) sp.set(k, s);
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// The backend returns Mongo docs keyed by `_id`; our types (like the Dart
// models) use `id`. Remap so `.id` is populated — otherwise every training /
// session id is undefined (broken keys, broken /workout/<id> links).
function withId<T extends { _id?: unknown; id?: string }>(raw: T): T & { id: string } {
  return { ...raw, id: String(raw._id ?? raw.id ?? "") };
}

async function detail(res: Response, fallback: string): Promise<string> {
  try {
    const body = await parse(res);
    if (body && typeof body === "object" && "detail" in body) {
      return String((body as { detail: unknown }).detail);
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (res.ok) return parse(res);
  throw new ApiError(res.status, await detail(res, "Request failed"));
}

// ---------------------------------------------------------------------------
// Exercise catalogue (free-exercise-db via the backend /api/exercises)
// ---------------------------------------------------------------------------

export type ExerciseDto = {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
};

// The ExerciseDB catalogue (proxied via /exapi) returns localized fields as
// `[{lng,value}]` groups on browse, but plain strings on search. Resolve to a
// display string (prefer English) either way.
function locStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const arr = v as { lng?: string; value?: string }[];
    return arr.find((x) => x.lng === "en")?.value ?? arr[0]?.value ?? "";
  }
  return "";
}
function locList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return (v as unknown[]).map(locStr).filter(Boolean);
}

type RawExercise = { exerciseId?: string; name?: unknown; targetMuscles?: unknown };

function mapExercise(e: RawExercise): ExerciseDto {
  const id = String(e.exerciseId ?? "");
  return {
    exerciseId: id,
    name: locStr(e.name),
    gifUrl: gifUrlFor(id), // own-domain URL, not static.exercisedb.dev
    targetMuscles: locList(e.targetMuscles),
  };
}

/** Fuzzy search (>= 2 chars). Not paginated. */
export async function searchExercises(query: string, limit = 30): Promise<ExerciseDto[]> {
  const data = (await getJson(
    `/exapi/api/v1/exercises/search${qs({ search: query, limit })}`,
  )) as { data?: RawExercise[] };
  return (data?.data ?? []).map(mapExercise);
}

/** Browse the catalogue, cursor-paginated (limit is hard-capped at 25). */
export async function browseExercises(opts: {
  cursor?: string | null;
  limit?: number;
}): Promise<{ items: ExerciseDto[]; nextCursor: string | null }> {
  const data = (await getJson(
    `/exapi/api/v1/exercises${qs({ limit: opts.limit ?? 25, after: opts.cursor ?? undefined })}`,
  )) as { data?: RawExercise[]; meta?: { hasNextPage?: boolean; nextCursor?: string | null } };
  const items = (data?.data ?? []).map(mapExercise);
  const meta = data?.meta ?? {};
  return { items, nextCursor: meta.hasNextPage ? meta.nextCursor ?? null : null };
}

// ---------------------------------------------------------------------------
// Trainings
// ---------------------------------------------------------------------------

export async function getTrainings(discipline?: string): Promise<SavedTraining[]> {
  const data = (await getJson(`/api/trainings${qs({ discipline })}`)) as {
    results?: unknown[];
  };
  return ((data?.results ?? []) as SavedTraining[]).map(withId);
}

export async function getSessions(): Promise<WorkoutSession[]> {
  const data = (await getJson("/api/sessions")) as { results?: unknown[] };
  return ((data?.results ?? []) as WorkoutSession[]).map(withId);
}

export async function getStagnation(opts?: {
  weeks?: number;
  threshold?: number;
}): Promise<StagnationItem[]> {
  try {
    const data = (await getJson(
      `/api/progress/stagnation${qs({ weeks: opts?.weeks, threshold: opts?.threshold })}`,
    )) as { results?: unknown[] };
    return (data?.results ?? []) as StagnationItem[];
  } catch {
    return [];
  }
}

export async function createTraining(payload: {
  name: string;
  exercises: unknown[];
}): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/trainings`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });
  if (res.status === 402) {
    const body = (await parse(res)) as { limit?: number } | null;
    throw new FreeTierLimitError(body?.limit ?? 2);
  }
  if (!res.ok) throw new ApiError(res.status, await detail(res, "Failed to save training"));
}

export async function updateTraining(
  id: string,
  payload: { name?: string; exercises: unknown[] },
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/trainings/${id}`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new ApiError(res.status, await detail(res, "Failed to update training"));
}

export async function deleteTraining(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/trainings/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (res.status !== 204 && !res.ok) {
    throw new ApiError(res.status, await detail(res, "Failed to delete training"));
  }
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function createSession(payload: {
  trainingId?: string | null;
  name: string;
  startedAt: string;
  finishedAt: string;
  exercises: unknown[];
}): Promise<WorkoutSessionWithRank> {
  const res = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new ApiError(res.status, await detail(res, "Failed to save session"));
  const map = (await parse(res)) as WorkoutSession & { rankDelta?: unknown };
  return {
    session: withId(map),
    rankDelta: (map.rankDelta as WorkoutSessionWithRank["rankDelta"]) ?? null,
  };
}

export async function updateSession(
  id: string,
  payload: { finishedAt: string; exercises: unknown[] },
): Promise<WorkoutSessionWithRank> {
  const res = await fetch(`${API_BASE_URL}/api/sessions/${id}`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new ApiError(res.status, await detail(res, "Failed to update session"));
  const map = (await parse(res)) as WorkoutSession & { rankDelta?: unknown };
  return {
    session: withId(map),
    rankDelta: (map.rankDelta as WorkoutSessionWithRank["rankDelta"]) ?? null,
  };
}

// ---------------------------------------------------------------------------
// HYROX
// ---------------------------------------------------------------------------

/** Thrown on 409 — the user already has a HYROX plan. */
export class HyroxPlanExistsError extends Error {
  constructor(public planId: string | null) {
    super("HyroxPlanExists");
    this.name = "HyroxPlanExistsError";
  }
}

export type HyroxPlanResult = {
  planId: string;
  created: number;
  divisionLabel: string;
};

export async function createHyroxPlan(opts: {
  division?: string;
  replace?: boolean;
}): Promise<HyroxPlanResult> {
  const res = await fetch(`${API_BASE_URL}/api/hyrox/plan`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({
      division: opts.division ?? "men_open",
      replace: opts.replace ?? false,
    }),
  });
  const body = (await parse(res)) as
    | { planId?: string; created?: number; divisionLabel?: string; detail?: string }
    | null;
  if (res.status === 409) throw new HyroxPlanExistsError(body?.planId ?? null);
  if (!res.ok) throw new ApiError(res.status, body?.detail ?? "Failed to create HYROX plan");
  return {
    planId: String(body?.planId ?? ""),
    created: body?.created ?? 0,
    divisionLabel: String(body?.divisionLabel ?? ""),
  };
}

export async function deleteHyroxPlan(planId?: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/hyrox/plan${qs({ planId })}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new ApiError(res.status, await detail(res, "Failed to delete HYROX plan"));
}

// ---------------------------------------------------------------------------
// Progression + calories (best-effort helpers)
// ---------------------------------------------------------------------------

export async function getProgressionSuggestions(
  exercises: unknown[],
): Promise<Record<string, ProgressionSuggestion>> {
  if (!exercises.length) return {};
  try {
    const res = await fetch(`${API_BASE_URL}/api/progression`, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ exercises }),
    });
    if (!res.ok) return {};
    const body = (await parse(res)) as { suggestions?: Record<string, ProgressionSuggestion> };
    return body?.suggestions ?? {};
  } catch {
    return {};
  }
}

export async function estimateCalories(
  exercises: unknown[],
  durationSeconds?: number,
): Promise<number[]> {
  const res = await fetch(`${API_BASE_URL}/api/calories`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ exercises, ...(durationSeconds ? { durationSeconds } : {}) }),
  });
  if (!res.ok) throw new ApiError(res.status, await detail(res, "Failed to estimate calories"));
  const body = (await parse(res)) as { perExercise?: { kcal?: number }[] };
  return (body?.perExercise ?? []).map((e) => e.kcal ?? 0);
}

// ---------------------------------------------------------------------------
// Auth (auth_service.dart)
// ---------------------------------------------------------------------------

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function storeToken(tk: string) {
  try {
    localStorage.setItem(TOKEN_KEY, tk);
  } catch {
    /* ignore */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function authPost(
  path: string,
  body: Record<string, unknown>,
): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await parse(res)) as { token?: string; user?: AuthUser; detail?: string } | null;
  if (!res.ok || !data?.token || !data?.user) {
    throw new AuthError(res.status, data?.detail ?? "Authentication failed");
  }
  storeToken(data.token);
  return normalizeUser(data.user);
}

function normalizeUser(u: AuthUser): AuthUser {
  return {
    ...u,
    xp: u.xp ?? 0,
    rank: u.rank ?? 1,
    subscription: u.subscription ?? { status: "free", isPro: false },
  };
}

export async function login(email: string, password: string): Promise<AuthUser> {
  return authPost("/api/auth/login", { email, password });
}

export async function register(input: {
  email: string;
  password: string;
  name?: string;
  onboarding?: unknown;
}): Promise<AuthUser> {
  return authPost("/api/auth/register", {
    email: input.email,
    password: input.password,
    name: input.name ?? "",
    ...(input.onboarding ? { onboarding: input.onboarding } : {}),
  });
}

/** Restore a stored session via GET /api/auth/me. Never throws → null on fail. */
export async function restoreSession(): Promise<AuthUser | null> {
  const tk = token();
  if (!tk) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tk}` },
      cache: "no-store",
    });
    if (!res.ok) {
      clearToken();
      return null;
    }
    const data = (await parse(res)) as { user?: AuthUser };
    return data?.user ? normalizeUser(data.user) : null;
  } catch {
    return null;
  }
}

export async function saveOnboarding(onboarding: unknown): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/api/me/onboarding`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify({ onboarding }),
  });
  const data = (await parse(res)) as { user?: AuthUser; detail?: string } | null;
  if (!res.ok || !data?.user) {
    throw new AuthError(res.status, data?.detail ?? "Failed to save onboarding");
  }
  return normalizeUser(data.user);
}

export function logout() {
  clearToken();
}
