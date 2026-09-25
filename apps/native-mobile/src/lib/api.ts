// Thin client over the HEFTOR backend (apps/web). Ported 1:1 from
// apps/mobile/lib/services/api.dart. Uses fetch + the bearer token persisted by
// the auth service under StorageKeys.authToken.
import { apiBaseUrl } from "../config";
import { StorageKeys, getItem } from "./storage";
import {
  ExerciseFilters,
  ExerciseMinimal,
  ExerciseDetail,
  SavedTraining,
  WorkoutSession,
  WorkoutSessionWithRank,
  RankDelta,
  ProgressionSuggestion,
  StagnationItem,
} from "../models/apiModels";

/** Thrown when the backend responds with a non-2xx status. */
export class ApiException extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "ApiException";
  }
}

/** Free-tier ceiling reached (2 saved workouts) — UI opens the paywall. */
export class FreeTierLimitException extends Error {
  constructor(public limit: number) {
    super(`FreeTierLimitException(limit=${limit})`);
    this.name = "FreeTierLimitException";
  }
}

/** User already has a HYROX plan. Carries the existing planId. */
export class HyroxPlanExistsException extends Error {
  constructor(public planId: string | null) {
    super(`HyroxPlanExistsException(planId=${planId})`);
    this.name = "HyroxPlanExistsException";
  }
}

export interface HyroxPlanResult {
  planId: string;
  created: number;
  divisionLabel: string;
}

type Query = Record<string, string | number | string[] | null | undefined>;

function buildUri(path: string, query?: Query): string {
  const url = new URL(`${apiBaseUrl}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(key, String(v));
      } else {
        const s = String(value);
        if (s.length > 0) url.searchParams.set(key, s);
      }
    }
  }
  return url.toString();
}

async function authToken(): Promise<string | null> {
  return getItem(StorageKeys.authToken);
}

export class Api {
  private async get(uri: string): Promise<any> {
    const token = await authToken();
    const res = await fetch(uri, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (res.status >= 200 && res.status < 300) return body;
    const detail = body && typeof body === "object" ? body.detail?.toString() : null;
    throw new ApiException(res.status, detail ?? "Request failed");
  }

  /** Available filter values (muscles, difficulties, categories). */
  async getFilters(): Promise<ExerciseFilters> {
    return ExerciseFilters.fromJson(await this.get(buildUri("/api/filters")));
  }

  /** Search / list exercises. Returns the minimal shape for list views. */
  async listExercises(opts: {
    search?: string;
    category?: string;
    muscles?: string[];
    difficulty?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ExerciseMinimal[]> {
    const { search, category, muscles, difficulty, limit = 30, offset = 0 } = opts;
    const data = await this.get(
      buildUri("/api/exercises", {
        search: search && search.length >= 2 ? search : null,
        category,
        muscles,
        difficulty,
        limit,
        offset,
      }),
    );
    const results = (data?.results as any[]) ?? [];
    return results.map(ExerciseMinimal.fromJson);
  }

  /** Full details for a single exercise. */
  async getExercise(id: number): Promise<ExerciseDetail> {
    return ExerciseDetail.fromJson(await this.get(buildUri(`/api/exercises/${id}`)));
  }

  /** Fetch saved trainings, newest first. Pass discipline:'hyrox' for those. */
  async getTrainings(discipline?: string): Promise<SavedTraining[]> {
    const data = await this.get(buildUri("/api/trainings", { discipline }));
    const results = (data?.results as any[]) ?? [];
    return results.map(SavedTraining.fromJson);
  }

  /** Persist a created training to the backend (Mongo). */
  async createTraining(name: string, exercises: any[]): Promise<void> {
    const token = await authToken();
    const res = await fetch(buildUri("/api/trainings"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name, exercises }),
    });
    if (res.status === 402) {
      const text = await res.text();
      const body = text ? JSON.parse(text) : null;
      const limit = body && typeof body === "object" ? Number(body.limit ?? 2) : 2;
      throw new FreeTierLimitException(limit);
    }
    if (res.status < 200 || res.status >= 300) {
      const text = await res.text();
      const body = text ? JSON.parse(text) : null;
      throw new ApiException(res.status, body?.detail?.toString() ?? "Failed to save training");
    }
  }

  /** Update an existing training (persists live workout edits). */
  async updateTraining(id: string, exercises: any[], name?: string): Promise<void> {
    const token = await authToken();
    const res = await fetch(buildUri(`/api/trainings/${id}`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...(name != null ? { name } : {}), exercises }),
    });
    if (res.status < 200 || res.status >= 300) {
      const text = await res.text();
      const body = text ? JSON.parse(text) : null;
      throw new ApiException(res.status, body?.detail?.toString() ?? "Failed to update training");
    }
  }

  /** Save a completed workout session (history); returns the created session. */
  async createSession(opts: {
    trainingId?: string | null;
    name: string;
    startedAt: Date;
    finishedAt: Date;
    exercises: any[];
  }): Promise<WorkoutSessionWithRank> {
    const token = await authToken();
    const res = await fetch(buildUri("/api/sessions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        trainingId: opts.trainingId ?? null,
        name: opts.name,
        startedAt: opts.startedAt.toISOString(),
        finishedAt: opts.finishedAt.toISOString(),
        exercises: opts.exercises,
      }),
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (res.status < 200 || res.status >= 300) {
      throw new ApiException(res.status, body?.detail?.toString() ?? "Failed to save session");
    }
    return new WorkoutSessionWithRank(
      WorkoutSession.fromJson(body),
      body.rankDelta && typeof body.rankDelta === "object"
        ? RankDelta.fromJson(body.rankDelta)
        : null,
    );
  }

  /** Update an already-logged session in place (resumed workout). No XP re-award. */
  async updateSession(id: string, finishedAt: Date, exercises: any[]): Promise<WorkoutSessionWithRank> {
    const token = await authToken();
    const res = await fetch(buildUri(`/api/sessions/${id}`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ finishedAt: finishedAt.toISOString(), exercises }),
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (res.status < 200 || res.status >= 300) {
      throw new ApiException(res.status, body?.detail?.toString() ?? "Failed to update session");
    }
    return new WorkoutSessionWithRank(
      WorkoutSession.fromJson(body),
      body.rankDelta && typeof body.rankDelta === "object"
        ? RankDelta.fromJson(body.rankDelta)
        : null,
    );
  }

  /** Estimate calories burned per exercise via the backend's OpenAI endpoint. */
  async estimateCalories(exercises: any[], durationSeconds?: number): Promise<number[]> {
    const token = await authToken();
    const res = await fetch(buildUri("/api/calories"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        exercises,
        ...(durationSeconds != null ? { durationSeconds } : {}),
      }),
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (res.status < 200 || res.status >= 300) {
      throw new ApiException(res.status, body?.detail?.toString() ?? "Failed to estimate calories");
    }
    const per = (body?.perExercise as any[]) ?? [];
    return per.map((e) => Number(e?.kcal ?? 0));
  }

  /** Create the full 12-week HYROX plan in one call. */
  async createHyroxPlan(opts: {
    division?: string;
    targetTimeMin?: number;
    replace?: boolean;
  } = {}): Promise<HyroxPlanResult> {
    const { division = "men_open", targetTimeMin, replace = false } = opts;
    const token = await authToken();
    const res = await fetch(buildUri("/api/hyrox/plan"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        division,
        ...(targetTimeMin != null ? { targetTimeMin } : {}),
        replace,
      }),
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (res.status === 409) {
      throw new HyroxPlanExistsException(body?.planId?.toString() ?? null);
    }
    if (res.status < 200 || res.status >= 300) {
      throw new ApiException(res.status, body?.detail?.toString() ?? "Failed to create HYROX plan");
    }
    return {
      planId: body?.planId?.toString() ?? "",
      created: Number(body?.created ?? 0),
      divisionLabel: body?.divisionLabel?.toString() ?? "",
    };
  }

  /** Delete the user's HYROX plan (planId, or every HYROX training if null). */
  async deleteHyroxPlan(planId?: string | null): Promise<void> {
    const token = await authToken();
    const res = await fetch(buildUri("/api/hyrox/plan", { planId }), {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.status < 200 || res.status >= 300) {
      const text = await res.text();
      const body = text ? JSON.parse(text) : null;
      throw new ApiException(res.status, body?.detail?.toString() ?? "Failed to delete HYROX plan");
    }
  }

  /** Delete a training. */
  async deleteTraining(id: string): Promise<void> {
    const token = await authToken();
    const res = await fetch(buildUri(`/api/trainings/${id}`), {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.status !== 204 && (res.status < 200 || res.status >= 300)) {
      const text = await res.text();
      const body = text ? JSON.parse(text) : null;
      throw new ApiException(res.status, body?.detail?.toString() ?? "Failed to delete training");
    }
  }

  /** Next-set suggestions keyed by exerciseId. Never throws — {} on failure. */
  async getProgressionSuggestions(
    exercises: any[],
  ): Promise<Record<string, ProgressionSuggestion>> {
    if (exercises.length === 0) return {};
    try {
      const token = await authToken();
      const res = await fetch(buildUri("/api/progression"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ exercises }),
      });
      if (res.status < 200 || res.status >= 300) return {};
      const text = await res.text();
      const body = text ? JSON.parse(text) : null;
      const map = body && typeof body === "object" ? body.suggestions : null;
      if (!map || typeof map !== "object") return {};
      const out: Record<string, ProgressionSuggestion> = {};
      for (const [key, value] of Object.entries(map)) {
        if (value && typeof value === "object") {
          out[key] = ProgressionSuggestion.fromJson(value);
        }
      }
      return out;
    } catch {
      return {};
    }
  }

  /** Exercises whose best e1RM has stalled. Best-effort — [] on failure. */
  async getStagnation(opts: { weeks?: number; threshold?: number } = {}): Promise<StagnationItem[]> {
    try {
      const data = await this.get(
        buildUri("/api/progress/stagnation", { weeks: opts.weeks, threshold: opts.threshold }),
      );
      const results = (data?.results as any[]) ?? [];
      return results.map(StagnationItem.fromJson);
    } catch {
      return [];
    }
  }

  /** Past workout sessions, newest first. */
  async getSessions(): Promise<WorkoutSession[]> {
    const data = await this.get(buildUri("/api/sessions"));
    const results = (data?.results as any[]) ?? [];
    return results.map(WorkoutSession.fromJson);
  }
}
