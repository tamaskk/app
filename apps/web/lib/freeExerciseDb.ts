// Exercise catalogue backed by the free-exercise-db dataset
// (https://github.com/yuhonas/free-exercise-db, public domain).
//
// This replaces the previous ExerciseDB-backed source whose image CDN
// (static.exercisedb.dev) was decommissioned — every gifUrl it returned 404'd,
// so no exercise media loaded. free-exercise-db is free, key-less, and served
// from the jsDelivr CDN, which we verified returns real images.
//
// Trade-offs vs the old source: images are static JPGs (2 frames per exercise)
// rather than animated GIFs, the dataset is English-only, and it has ~870
// exercises. The adapter maps every record into the exact DTO shape the mobile
// ApiExercise/ExercisePage models already parse, so the app is unchanged.
//
// Override the data/image hosts with FREE_EXERCISE_DB_URL /
// FREE_EXERCISE_DB_IMAGE_BASE (e.g. to self-host a pinned copy).

const DATA_URL =
  process.env.FREE_EXERCISE_DB_URL ??
  "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json";

const IMAGE_BASE =
  process.env.FREE_EXERCISE_DB_IMAGE_BASE ??
  "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises";

/** A raw record as it appears in the free-exercise-db JSON. */
type RawExercise = {
  id: string;
  name: string;
  force?: string | null;
  level?: string;
  mechanic?: string | null;
  equipment?: string | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  category?: string;
  images?: string[];
};

/** The DTO shape the mobile catalogue models (ApiExercise) expect. */
export type CatalogueExercise = {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
  instructions: string[];
};

// free-exercise-db has no bodyPart axis, so derive one from the primary muscle
// using the ExerciseDB bodyPart vocabulary the app's filter UI was built on.
const MUSCLE_TO_BODYPART: Record<string, string> = {
  chest: "chest",
  lats: "back",
  "middle back": "back",
  "lower back": "back",
  traps: "back",
  neck: "neck",
  shoulders: "shoulders",
  biceps: "upper arms",
  triceps: "upper arms",
  forearms: "lower arms",
  abdominals: "waist",
  quadriceps: "upper legs",
  hamstrings: "upper legs",
  glutes: "upper legs",
  abductors: "upper legs",
  adductors: "upper legs",
  calves: "lower legs",
};

function bodyPartsFor(primary: string[]): string[] {
  const set = new Set<string>();
  for (const m of primary) {
    const bp = MUSCLE_TO_BODYPART[m?.toLowerCase?.() ?? ""];
    if (bp) set.add(bp);
  }
  return [...set];
}

function imageUrl(images: string[] | undefined): string {
  if (!images || images.length === 0) return "";
  // images entries look like "Barbell_Bench_Press/0.jpg".
  return `${IMAGE_BASE}/${images[0]}`;
}

/** Map a raw record into the catalogue DTO the mobile app parses. */
export function toCatalogue(r: RawExercise): CatalogueExercise {
  const primary = r.primaryMuscles ?? [];
  return {
    exerciseId: r.id,
    name: r.name,
    gifUrl: imageUrl(r.images),
    targetMuscles: primary,
    bodyParts: bodyPartsFor(primary),
    equipments: r.equipment ? [r.equipment] : [],
    secondaryMuscles: r.secondaryMuscles ?? [],
    instructions: r.instructions ?? [],
  };
}

// Warm-invocation memo. The authoritative cache is Next's fetch cache (below);
// this just skips re-parsing the ~1MB JSON within a single warm lambda.
let _memo: RawExercise[] | null = null;

/** Fetch (and cache for a day) the whole dataset. */
export async function loadAll(): Promise<RawExercise[]> {
  if (_memo) return _memo;
  const res = await fetch(DATA_URL, { next: { revalidate: 86400 } });
  if (!res.ok) {
    throw new Error(`free-exercise-db fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as RawExercise[];
  _memo = Array.isArray(data) ? data : [];
  return _memo;
}

function lc(xs: string[]): string[] {
  return xs.map((x) => x.toLowerCase());
}

function matchesFilters(
  cat: CatalogueExercise,
  f: { bodyParts?: string[]; targetMuscles?: string[]; equipments?: string[] },
): boolean {
  if (f.bodyParts?.length) {
    const have = lc(cat.bodyParts);
    if (!lc(f.bodyParts).some((b) => have.includes(b))) return false;
  }
  if (f.targetMuscles?.length) {
    const have = lc(cat.targetMuscles);
    if (!lc(f.targetMuscles).some((m) => have.includes(m))) return false;
  }
  if (f.equipments?.length) {
    const have = lc(cat.equipments);
    if (!lc(f.equipments).some((e) => have.includes(e))) return false;
  }
  return true;
}

export type ListParams = {
  name?: string;
  bodyParts?: string[];
  targetMuscles?: string[];
  equipments?: string[];
  limit?: number;
  after?: string; // offset-encoded cursor
};

/** Cursor-paginated, filtered list in the catalogue's list-envelope shape. */
export async function listExercises(params: ListParams) {
  const all = await loadAll();
  let filtered = all.map(toCatalogue).filter((c) => matchesFilters(c, params));
  if (params.name && params.name.trim()) {
    const q = params.name.trim().toLowerCase();
    filtered = filtered.filter((c) => c.name.toLowerCase().includes(q));
  }
  const total = filtered.length;
  const limit = Math.min(Math.max(params.limit ?? 25, 1), 100);
  const offset = Math.max(0, Number.parseInt(params.after ?? "0", 10) || 0);
  const slice = filtered.slice(offset, offset + limit);
  const nextOffset = offset + limit;
  const hasNextPage = nextOffset < total;
  const hasPreviousPage = offset > 0;
  return {
    success: true,
    meta: {
      total,
      hasNextPage,
      hasPreviousPage,
      nextCursor: hasNextPage ? String(nextOffset) : null,
      previousCursor: hasPreviousPage
        ? String(Math.max(0, offset - limit))
        : null,
    },
    data: slice,
  };
}

/** Simple contains-based search over name + primary muscles. */
export async function searchExercises(search: string, limit = 20) {
  const all = await loadAll();
  const q = search.trim().toLowerCase();
  const matched = q
    ? all.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.primaryMuscles ?? []).some((m) => m.toLowerCase().includes(q)),
      )
    : [];
  return {
    success: true,
    data: matched.slice(0, Math.min(Math.max(limit, 1), 100)).map(toCatalogue),
  };
}

/** Single exercise by id, or null. */
export async function getExercise(id: string): Promise<CatalogueExercise | null> {
  const all = await loadAll();
  const found = all.find((r) => r.id === id);
  return found ? toCatalogue(found) : null;
}

/** Distinct filter vocabularies, sorted. */
export async function metadata() {
  const all = await loadAll();
  const bodyParts = new Set<string>();
  const muscles = new Set<string>();
  const equipments = new Set<string>();
  for (const r of all) {
    for (const b of bodyPartsFor(r.primaryMuscles ?? [])) bodyParts.add(b);
    for (const m of r.primaryMuscles ?? []) muscles.add(m);
    if (r.equipment) equipments.add(r.equipment);
  }
  const sorted = (s: Set<string>) => [...s].sort();
  return {
    bodyParts: sorted(bodyParts),
    muscles: sorted(muscles),
    equipments: sorted(equipments),
  };
}
