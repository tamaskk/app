// Ported 1:1 from apps/mobile/lib/models/exercise_api_models.dart.
//
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
import { getLang } from "../i18n";
import { framesFromUrl } from "../utils/exerciseFrames";

/// A single exercise from the catalogue (the API's `ExerciseDto`).
export class ApiExercise {
  constructor(
    public exerciseId: string,
    public name: string,
    public gifUrl: string,
    /// Every static frame of the exercise. free-exercise-db ships exactly two
    /// (`.../0.jpg` and `.../1.jpg`); the UI flips between them every 0.5s to
    /// fake a GIF. Empty for user-created exercises with a single [gifUrl].
    public images: string[] = [],
    public targetMuscles: string[] = [],
    public bodyParts: string[] = [],
    public equipments: string[] = [],
    public secondaryMuscles: string[] = [],
    public instructions: string[] = [],
  ) {}

  /// Frames to animate: the explicit [images] list when the catalogue supplied
  /// one, otherwise derived from [gifUrl] (a free-exercise-db `.../0.jpg` URL
  /// yields its `.../1.jpg` sibling). A single non-catalogue URL stays static.
  get imageFrames(): string[] {
    return this.images.length > 0 ? this.images : framesFromUrl(this.gifUrl);
  }

  static fromJson(json: any): ApiExercise {
    return new ApiExercise(
      json.exerciseId != null ? String(json.exerciseId) : "",
      localizedString(json.name),
      (json.gifUrl as string) ?? "",
      Array.isArray(json.images)
        ? (json.images as any[])
            .map((e) => (e != null ? String(e) : ""))
            .filter((s) => s.length > 0)
        : [],
      // Muscle / body-part / equipment values are catalogue KEYS that feed
      // back into API filter queries (the backend matches the English
      // ExerciseDB vocabulary). Resolve them to English, NOT the UI language —
      // otherwise, in Hungarian, targetMuscles became e.g. "mellizmok" and the
      // replace-exercise picker (which pre-selects targetMuscles.first as a
      // filter) opened empty because no catalogue row matches that string.
      localizedListEn(json.targetMuscles),
      localizedListEn(json.bodyParts),
      localizedListEn(json.equipments),
      localizedListEn(json.secondaryMuscles),
      // Instructions are display prose → follow the user's language.
      localizedList(json.instructions),
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
    const meta = (json.meta as Record<string, any>) ?? {};
    const data: any[] = Array.isArray(json.data) ? json.data : [];
    return new ExercisePage(
      data.map((e) => ApiExercise.fromJson(e as Record<string, any>)),
      typeof meta.total === "number" ? Math.trunc(meta.total) : data.length,
      typeof meta.hasNextPage === "boolean" ? meta.hasNextPage : false,
      typeof meta.nextCursor === "string" ? meta.nextCursor : null,
    );
  }
}

// --- Localization-aware parsing --------------------------------------------
//
// A "localized group" is a list of `{lng, value}` maps, e.g.
// `[{lng:hu,value:mellizmok},{lng:en,value:pectorals}]`. We pick the current
// app language, falling back to English, then the first entry.

function isMap(value: unknown): value is Record<string, any> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isLocalizedGroup(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((e) => isMap(e) && "lng" in e && "value" in e)
  );
}

function pickLang(group: any[]): string {
  const lang = getLang();
  let en: string | undefined;
  let first: string | undefined;
  for (const e of group) {
    if (!isMap(e)) continue;
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
    if (!isMap(e)) continue;
    const v = e.value != null ? String(e.value) : undefined;
    if (first === undefined) first = v;
    if ((e.lng != null ? String(e.lng) : undefined) === "en") return v ?? "";
  }
  return first ?? "";
}

/// Like [localizedList] but resolves localized groups to English (for
/// muscle/body-part/equipment keys that must match the catalogue vocabulary).
function localizedListEn(value: unknown): string[] {
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
          : isMap(e)
            ? e.value != null
              ? String(e.value)
              : ""
            : e != null
              ? String(e)
              : "",
    )
    .filter((s) => s.length > 0);
}

/// Resolve a scalar text field that may be a plain String or a localized group.
function localizedString(value: unknown): string {
  if (typeof value === "string") return value;
  if (isLocalizedGroup(value)) return pickLang(value as any[]);
  if (isMap(value)) return value.value != null ? String(value.value) : "";
  return value != null ? String(value) : "";
}

/// Resolve a list field whose items may be plain Strings or localized groups.
/// Also tolerates a single flat localized group (returns one string).
function localizedList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  // A flat localized group sitting where a list is expected → one value.
  if (isLocalizedGroup(value)) {
    const s = pickLang(value);
    return s.length === 0 ? [] : [s];
  }
  return value
    .map((e) =>
      typeof e === "string" ? e : Array.isArray(e) ? pickLang(e) : localizedString(e),
    )
    .filter((s) => s.length > 0);
}
