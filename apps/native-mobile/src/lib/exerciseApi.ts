// Ported 1:1 from apps/mobile/lib/services/exercise_api.dart.
//
// Client for the Gym Exercise API (`$exerciseApiBaseUrl/api/v1`). Wraps the
// ExerciseDB-backed catalogue: filter, fuzzy search, single lookup, and the
// body-part / muscle / equipment metadata lists.
//
// The catalogue models (ApiExercise, ExercisePage) plus their localization-aware
// parsing are ported from apps/mobile/lib/models/exercise_api_models.dart and
// the frame helper from apps/mobile/lib/utils/exercise_frames.dart. They live in
// this file because ../models/exerciseApiModels does not (yet) exist.
import { exerciseApiBaseUrl } from "../config";
import { getLang } from "../i18n";
import { ApiException } from "./api";

// --- Frame helper (from utils/exercise_frames.dart) ------------------------
//
// free-exercise-db serves exactly two static JPGs per exercise, named
// `.../<Id>/0.jpg` and `.../<Id>/1.jpg`. Persisted trainings only keep the
// first frame's URL (`gifUrl`); reconstruct the second from the naming
// convention. URLs that don't match stay single-frame / static.

// Matches a trailing `/0.<ext>` — the free-exercise-db first-frame filename.
const FIRST_FRAME = /\/0(\.[A-Za-z0-9]+)(\?.*)?$/;

/**
 * Expand a single image URL into its animation frames.
 *
 * * empty  → `[]`  (caller shows a placeholder)
 * * a `.../0.jpg`-style URL → `[.../0.jpg, .../1.jpg]`
 * * anything else → `[url]` (static)
 */
export function framesFromUrl(url: string): string[] {
  const u = url.trim();
  if (u.length === 0) return [];
  const m = FIRST_FRAME.exec(u);
  if (m == null) return [u];
  const second = u.slice(0, m.index) + `/1${m[1]}${m[2] ?? ""}` + u.slice(m.index + m[0].length);
  return [u, second];
}

// --- Localization-aware parsing --------------------------------------------
//
// A "localized group" is a list of `{lng, value}` maps, e.g.
// `[{lng:hu,value:mellizmok},{lng:en,value:pectorals}]`. We pick the current
// app language, falling back to English, then the first entry.

function isLocalizedGroup(value: any): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (e) =>
        e != null && typeof e === "object" && !Array.isArray(e) && "lng" in e && "value" in e,
    )
  );
}

function pickLang(group: any[]): string {
  const lang = getLang();
  let en: string | undefined;
  let first: string | undefined;
  for (const e of group) {
    if (e == null || typeof e !== "object" || Array.isArray(e)) continue;
    const v = e.value != null ? String(e.value) : undefined;
    if (first === undefined) first = v;
    const l = e.lng != null ? String(e.lng) : undefined;
    if (l === lang) return v ?? "";
    if (l === "en") en = v;
  }
  return en ?? first ?? "";
}

/// English-only resolver for fields used as stable catalogue keys. Always
/// prefers the English entry regardless of the UI language, so the value can be
/// used verbatim as an API filter key.
function pickEn(group: any[]): string {
  let first: string | undefined;
  for (const e of group) {
    if (e == null || typeof e !== "object" || Array.isArray(e)) continue;
    const v = e.value != null ? String(e.value) : undefined;
    if (first === undefined) first = v;
    if ((e.lng != null ? String(e.lng) : undefined) === "en") return v ?? "";
  }
  return first ?? "";
}

/// Like localizedList but resolves localized groups to English (for
/// muscle/body-part/equipment keys that must match the catalogue vocabulary).
function localizedListEn(value: any): string[] {
  if (!Array.isArray(value)) return [];
  if (isLocalizedGroup(value)) {
    const s = pickEn(value);
    return s.length === 0 ? [] : [s];
  }
  return value
    .map((e) =>
      typeof e === "string"
        ? e
        : Array.isArray(e)
          ? pickEn(e)
          : e != null && typeof e === "object"
            ? e.value != null
              ? String(e.value)
              : ""
            : e != null
              ? String(e)
              : "",
    )
    .filter((s) => s.length > 0);
}

/// Resolve a scalar text field that may be a plain string or a localized group.
function localizedString(value: any): string {
  if (typeof value === "string") return value;
  if (isLocalizedGroup(value)) return pickLang(value as any[]);
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value.value != null ? String(value.value) : "";
  }
  return value != null ? String(value) : "";
}

/// Resolve a list field whose items may be plain strings or localized groups.
/// Also tolerates a single flat localized group (returns one string).
function localizedList(value: any): string[] {
  if (!Array.isArray(value)) return [];
  if (isLocalizedGroup(value)) {
    const s = pickLang(value);
    return s.length === 0 ? [] : [s];
  }
  return value
    .map((e) => (typeof e === "string" ? e : Array.isArray(e) ? pickLang(e) : localizedString(e)))
    .filter((s) => s.length > 0);
}

/// A single exercise from the catalogue (the API's `ExerciseDto`).
export class ApiExercise {
  constructor(
    public exerciseId: string,
    public name: string,
    public gifUrl: string,
    public images: string[] = [],
    public targetMuscles: string[] = [],
    public bodyParts: string[] = [],
    public equipments: string[] = [],
    public secondaryMuscles: string[] = [],
    public instructions: string[] = [],
  ) {}

  /// Frames to animate: the explicit [images] list when the catalogue supplied
  /// one, otherwise derived from [gifUrl].
  get imageFrames(): string[] {
    return this.images.length > 0 ? this.images : framesFromUrl(this.gifUrl);
  }

  static fromJson(json: any): ApiExercise {
    return new ApiExercise(
      json?.exerciseId != null ? String(json.exerciseId) : "",
      localizedString(json?.name),
      typeof json?.gifUrl === "string" ? json.gifUrl : "",
      Array.isArray(json?.images)
        ? json.images
            .map((e: any) => (e != null ? String(e) : ""))
            .filter((s: string) => s.length > 0)
        : [],
      // Muscle / body-part / equipment values are catalogue KEYS that feed back
      // into API filter queries — resolve them to English, NOT the UI language.
      localizedListEn(json?.targetMuscles),
      localizedListEn(json?.bodyParts),
      localizedListEn(json?.equipments),
      localizedListEn(json?.secondaryMuscles),
      // Instructions are display prose → follow the user's language.
      localizedList(json?.instructions),
    );
  }

  /// Comma-joined target muscles, e.g. "chest, triceps" — handy for subtitles.
  get muscleSummary(): string {
    return this.targetMuscles.join(", ");
  }
}

/// One page of exercises plus the keyset cursor for fetching the next page.
export class ExercisePage {
  constructor(
    public items: ApiExercise[],
    public total: number,
    public hasNextPage: boolean,
    public nextCursor: string | null,
  ) {}

  static fromJson(json: any): ExercisePage {
    const meta = json?.meta != null && typeof json.meta === "object" ? json.meta : {};
    const data: any[] = Array.isArray(json?.data) ? json.data : [];
    return new ExercisePage(
      data.map((e) => ApiExercise.fromJson(e)),
      typeof meta.total === "number" ? Math.trunc(meta.total) : data.length,
      typeof meta.hasNextPage === "boolean" ? meta.hasNextPage : false,
      typeof meta.nextCursor === "string" ? meta.nextCursor : null,
    );
  }
}

type Query = Record<string, string | number | string[] | null | undefined>;

export class ExerciseApi {
  private uri(path: string, query?: Query): string {
    const params = new URLSearchParams();
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value == null) continue;
        if (Array.isArray(value)) {
          if (value.length > 0) params.set(key, value.map((e) => String(e)).join(","));
        } else {
          const s = String(value);
          if (s.length > 0) params.set(key, s);
        }
      }
    }
    const qs = params.toString();
    return `${exerciseApiBaseUrl}/api/v1${path}${qs ? `?${qs}` : ""}`;
  }

  private async get(uri: string): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(uri, { signal: controller.signal });
      const raw = await res.text();
      const body = raw.length === 0 ? null : JSON.parse(raw);
      if (res.status >= 200 && res.status < 300) {
        return body != null && typeof body === "object" ? body : {};
      }
      // Error envelope: { success:false, error:{ code, message, detail } }
      const error = body != null && typeof body === "object" ? body.error : null;
      const message =
        error != null && typeof error === "object"
          ? (error.message ?? error.detail) != null
            ? String(error.message ?? error.detail)
            : null
          : null;
      throw new ApiException(res.status, message ?? "Request failed");
    } finally {
      clearTimeout(timer);
    }
  }

  /// Filtered, cursor-paginated list. Pass `after` (a `nextCursor`) to page.
  async listExercises(
    opts: {
      name?: string;
      bodyParts?: string[];
      targetMuscles?: string[];
      equipments?: string[];
      limit?: number;
      after?: string;
    } = {},
  ): Promise<ExercisePage> {
    const { name, bodyParts, targetMuscles, equipments, limit = 25, after } = opts;
    const json = await this.get(
      this.uri("/exercises", {
        name,
        bodyParts,
        targetMuscles,
        equipments,
        limit,
        after,
      }),
    );
    return ExercisePage.fromJson(json);
  }

  /// Fuzzy search. `threshold` 0 = exact … 1 = loose (default 0.3 server-side).
  async searchExercises(
    query: string,
    opts: { threshold?: number; limit?: number } = {},
  ): Promise<ApiExercise[]> {
    const { threshold, limit = 20 } = opts;
    const json = await this.get(
      this.uri("/exercises/search", { search: query, threshold, limit }),
    );
    const data: any[] = Array.isArray(json?.data) ? json.data : [];
    return data.map((e) => ApiExercise.fromJson(e));
  }

  /// Single exercise by its catalogue id.
  async getExercise(exerciseId: string): Promise<ApiExercise> {
    const json = await this.get(this.uri(`/exercises/${exerciseId}`));
    return ApiExercise.fromJson(json?.data);
  }

  bodyParts(): Promise<string[]> {
    return this.names("/bodyparts");
  }
  muscles(): Promise<string[]> {
    return this.names("/muscles");
  }
  equipments(): Promise<string[]> {
    return this.names("/equipments");
  }

  /// Metadata endpoints return `{ success, data: [{ name }] }`. `name` is a
  /// plain string in the legacy shape, or a localized group `[{lng,value}]` in
  /// the localized catalogue. We key off the English value so it stays a stable
  /// filter key the catalogue matches against.
  private async names(path: string): Promise<string[]> {
    const json = await this.get(this.uri(path));
    const data: any[] = Array.isArray(json?.data) ? json.data : [];
    return data.map((e) => this.name(e)).filter((s) => s.length > 0);
  }

  private name(entry: any): string {
    const n =
      entry != null && typeof entry === "object" && !Array.isArray(entry) ? entry.name : entry;
    if (typeof n === "string") return n;
    if (Array.isArray(n)) {
      let en: string | undefined;
      let first: string | undefined;
      for (const m of n) {
        if (m == null || typeof m !== "object" || Array.isArray(m)) continue;
        const v = m.value != null ? String(m.value) : undefined;
        if (first === undefined) first = v;
        if ((m.lng != null ? String(m.lng) : undefined) === "en") en = v;
      }
      return en ?? first ?? "";
    }
    return n != null ? String(n) : "";
  }

  /// No-op — fetch keeps no persistent client to close. Kept for API parity
  /// with the Dart original's `dispose()`.
  dispose(): void {}
}
