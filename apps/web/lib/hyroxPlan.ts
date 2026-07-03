// Pure HYROX plan builder.
//
// Materialises the full 12-week / 3-day-per-week HYROX programme from the
// official preparation plan (Alapozás → Építés → Csúcsosítás → Pihentetés).
// Deterministic: same { division, targetTimeMin } always yields the identical
// 36 sessions, so re-running the seed endpoint can't drift.
//
// Every session is shaped exactly like a `Training` document — the route layer
// just stamps userId/planId and inserts them, so the rest of the app treats
// HYROX sessions like any other training. The only difference is the per-set
// HYROX metric fields (distanceM / seconds / targetKg) and `metric` on each
// exercise, which the workout player reads to render distance/time/load instead
// of kg×reps.

import type { HyroxMetric } from "@/lib/hyroxMetrics";

export const HYROX_TOTAL_WEEKS = 12;
export const HYROX_DAYS_PER_WEEK = 3;
export const HYROX_TOTAL_SESSIONS = HYROX_TOTAL_WEEKS * HYROX_DAYS_PER_WEEK; // 36

// --- divisions -------------------------------------------------------------
// Official station weights (doc §4). The default plan targets Férfi Open; the
// caller can pass any division to fill the station loads accordingly.
export type Division = "men_open" | "women_open" | "men_pro" | "women_pro";

interface DivisionWeights {
  sledPush: number; // kg incl. sled
  sledPull: number; // kg incl. sled
  farmer: number; // kg per hand (×2)
  lunge: number; // sandbag kg
  wallBall: number; // ball kg
}

export const DIVISIONS: Record<Division, DivisionWeights> = {
  men_open: { sledPush: 152, sledPull: 103, farmer: 24, lunge: 20, wallBall: 6 },
  women_open: { sledPush: 102, sledPull: 78, farmer: 16, lunge: 10, wallBall: 4 },
  men_pro: { sledPush: 202, sledPull: 153, farmer: 32, lunge: 30, wallBall: 9 },
  women_pro: { sledPush: 152, sledPull: 103, farmer: 24, lunge: 20, wallBall: 6 },
};

export const DIVISION_LABELS: Record<Division, string> = {
  men_open: "Férfi Open",
  women_open: "Női Open",
  men_pro: "Férfi Pro",
  women_pro: "Női Pro",
};

// --- pacing ----------------------------------------------------------------
// Target running pace (sec/km) derived from the goal total time (doc §3 table).
// Linearly interpolated between the published anchors and clamped at the ends.
function racePaceSec(targetTimeMin: number): number {
  const anchors: [number, number][] = [
    [60, 255], // 4:15 /km
    [75, 300], // 5:00 /km
    [90, 345], // 5:45 /km
    [105, 400], // 6:40 /km
  ];
  if (targetTimeMin <= anchors[0][0]) return anchors[0][1];
  const last = anchors[anchors.length - 1];
  if (targetTimeMin >= last[0]) return last[1];
  for (let i = 0; i < anchors.length - 1; i++) {
    const [m0, p0] = anchors[i];
    const [m1, p1] = anchors[i + 1];
    if (targetTimeMin >= m0 && targetTimeMin <= m1) {
      const t = (targetTimeMin - m0) / (m1 - m0);
      return Math.round(p0 + t * (p1 - p0));
    }
  }
  return 345;
}

interface Paces {
  race: number; // race-pace 1 km
  racePlus: number; // "céltempó+" — slightly faster
  tempo: number; // tempo / threshold
  z2: number; // easy aerobic
  interval: number; // short fast reps (400 m)
  stride: number; // 100 m strides
}

function buildPaces(targetTimeMin: number): Paces {
  const race = racePaceSec(targetTimeMin);
  return {
    race,
    racePlus: Math.max(180, race - 12),
    tempo: race + 15,
    z2: race + 75,
    interval: Math.max(180, race - 25),
    stride: Math.max(150, race - 35),
  };
}

// --- output types ----------------------------------------------------------
export interface HyroxSet {
  kg: number;
  reps: number;
  done: boolean;
  distanceM: number | null;
  seconds: number | null;
  targetKg: number | null;
  resultSeconds: number | null;
}

export interface HyroxExercise {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  category: string | null;
  progressionStrategy: "none" | "linear";
  metric: HyroxMetric;
  stationKey: string | null;
  note: string | null;
  restSeconds: number | null;
  zone: string | null;
  sets: HyroxSet[];
}

export interface HyroxTraining {
  name: string;
  discipline: "hyrox";
  phase: number; // 1..4
  phaseName: string;
  focus: string;
  weekIndex: number; // 0..11
  dayIndex: number; // 0..2
  globalIndex: number; // 0..35
  exercises: HyroxExercise[];
}

export interface HyroxBuildInput {
  division?: Division;
  targetTimeMin?: number; // goal total race time; default ~90 min (typical 1st race)
}

// --- low-level builders ----------------------------------------------------
function set(partial: Partial<HyroxSet>): HyroxSet {
  return {
    kg: 0,
    reps: 0,
    done: false,
    distanceM: null,
    seconds: null,
    targetKg: null,
    resultSeconds: null,
    ...partial,
  };
}

function mk(
  partial: Partial<HyroxExercise> & { exerciseId: string; name: string },
): HyroxExercise {
  return {
    gifUrl: "",
    targetMuscles: [],
    category: null,
    progressionStrategy: "none",
    metric: "reps",
    stationKey: null,
    note: null,
    restSeconds: null,
    zone: null,
    sets: [],
    ...partial,
  };
}

// warm-up / cool-down (timed, no load → invisible to XP/PR)
const warm = (min: number, note: string): HyroxExercise =>
  mk({
    exerciseId: "hyrox-warmup",
    name: "Bemelegítés",
    metric: "time",
    targetMuscles: ["Bemelegítés"],
    note,
    sets: [set({ seconds: min * 60 })],
  });

const cool = (min: number, note: string): HyroxExercise =>
  mk({
    exerciseId: "hyrox-cooldown",
    name: "Levezetés + nyújtás",
    metric: "time",
    targetMuscles: ["Levezetés"],
    note,
    sets: [set({ seconds: min * 60 })],
  });

const core = (): HyroxExercise =>
  mk({
    exerciseId: "hyrox-core",
    name: "Törzs (plank · dead bug · oldalplank)",
    metric: "time",
    targetMuscles: ["Törzs"],
    note: "3 kör · 30–45 mp/gyakorlat",
    sets: [set({ seconds: 40 }), set({ seconds: 40 }), set({ seconds: 40 })],
  });

// strength (kg×reps → counts toward XP/PR like any lift)
const strength = (
  exerciseId: string,
  name: string,
  sets: number,
  reps: number,
  note: string,
  targetMuscles: string[],
): HyroxExercise =>
  mk({
    exerciseId,
    name,
    metric: "reps",
    progressionStrategy: "linear",
    targetMuscles,
    note,
    sets: Array.from({ length: sets }, () => set({ reps })),
  });

// runs
const runIntervals = (
  name: string,
  count: number,
  distanceM: number,
  paceSec: number,
  note: string,
  zone: string | null = null,
  restSeconds: number | null = null,
): HyroxExercise =>
  mk({
    exerciseId: "hyrox-run",
    name,
    metric: "pace",
    stationKey: "run",
    targetMuscles: ["Futás"],
    note,
    zone,
    restSeconds,
    sets: Array.from({ length: count }, () => set({ distanceM, seconds: paceSec })),
  });

const runTime = (
  name: string,
  count: number,
  minutes: number,
  note: string,
  zone: string | null = null,
  restSeconds: number | null = null,
): HyroxExercise =>
  mk({
    exerciseId: "hyrox-run",
    name,
    metric: "time",
    stationKey: "run",
    targetMuscles: ["Futás"],
    note,
    zone,
    restSeconds,
    sets: Array.from({ length: count }, () => set({ seconds: minutes * 60 })),
  });

// ergometers (distance, bodyweight)
const erg = (
  exerciseId: string,
  stationKey: string,
  name: string,
  count: number,
  distanceM: number,
  note: string,
  restSeconds: number | null = null,
): HyroxExercise =>
  mk({
    exerciseId,
    name,
    metric: "distance",
    stationKey,
    targetMuscles: [name.split(" ")[0]],
    note,
    restSeconds,
    sets: Array.from({ length: count }, () => set({ distanceM })),
  });

const burpee = (
  name: string,
  distanceM: number,
  note: string,
  count = 1,
): HyroxExercise =>
  mk({
    exerciseId: "hyrox-burpee",
    name,
    metric: "distance",
    stationKey: "burpee_broad_jump",
    targetMuscles: ["Burpee"],
    note,
    sets: Array.from({ length: count }, () => set({ distanceM })),
  });

// loaded carries / sleds (distance + targetKg; kg stays 0 → invisible to PR)
const sled = (
  kind: "push" | "pull",
  count: number,
  distanceM: number,
  kg: number,
  note: string,
  restSeconds: number | null = 90,
): HyroxExercise =>
  mk({
    exerciseId: `hyrox-sled-${kind}`,
    name: kind === "push" ? "Szán tolás" : "Szán húzás",
    metric: "distance_weight",
    stationKey: `sled_${kind}`,
    targetMuscles: ["Szán", "Láb"],
    note,
    restSeconds,
    sets: Array.from({ length: count }, () => set({ distanceM, targetKg: kg })),
  });

const farmer = (
  count: number,
  distanceM: number,
  kgPerHand: number,
  note: string,
): HyroxExercise =>
  mk({
    exerciseId: "hyrox-farmer-carry",
    name: "Farmer-járás",
    metric: "distance_weight",
    stationKey: "farmer_carry",
    targetMuscles: ["Markolat", "Törzs"],
    note: `2×${kgPerHand} kg · ${note}`,
    sets: Array.from({ length: count }, () => set({ distanceM, targetKg: kgPerHand })),
  });

const lunge = (
  count: number,
  distanceM: number,
  kg: number,
  note: string,
): HyroxExercise =>
  mk({
    exerciseId: "hyrox-sandbag-lunge",
    name: "Homokzsák lunge",
    metric: "distance_weight",
    stationKey: "sandbag_lunge",
    targetMuscles: ["Láb", "Glutesz"],
    note,
    sets: Array.from({ length: count }, () => set({ distanceM, targetKg: kg })),
  });

const wallBall = (
  count: number,
  reps: number,
  kg: number,
  note: string,
): HyroxExercise =>
  mk({
    exerciseId: "hyrox-wall-ball",
    name: "Wall ball",
    metric: "reps_weight",
    stationKey: "wall_ball",
    targetMuscles: ["Láb", "Váll"],
    note,
    sets: Array.from({ length: count }, () => set({ reps, targetKg: kg })),
  });

function roundKg(n: number): number {
  return Math.round(n);
}

// --- brick / simulation helpers --------------------------------------------
// One rotating station for the compromised-run blocks (doc §6 NAP 3).
function rotatingStation(i: number, w: DivisionWeights): HyroxExercise {
  switch (i % 4) {
    case 0:
      return sled("push", 1, 25, w.sledPush, "állomás · kontrollált");
    case 1:
      return burpee("Burpee broad jump 80 m", 80, "állomás");
    case 2:
      return erg("hyrox-row", "row", "Evezés 500 m", 1, 500, "állomás");
    default:
      return wallBall(1, 25, w.wallBall, "állomás");
  }
}

// N rounds of "1 km run → 1 station", run AT race pace (compromised legs).
function simRounds(rounds: number, w: DivisionWeights, p: Paces): HyroxExercise[] {
  const out: HyroxExercise[] = [];
  for (let i = 0; i < rounds; i++) {
    out.push(
      runIntervals(`Brick ${i + 1}. kör · 1 km futás`, 1, 1000, p.race, "állomás után azonnal", "Z4–5"),
    );
    out.push(rotatingStation(i, w));
  }
  return out;
}

// Full race: official station order, 8 runs interleaved with the 8 stations.
function fullRace(w: DivisionWeights, p: Paces): HyroxExercise[] {
  const stations: HyroxExercise[] = [
    erg("hyrox-skierg", "ski_erg", "SkiErg 1000 m", 1, 1000, "1. állomás"),
    sled("push", 1, 50, w.sledPush, "2. állomás · 4×12,5 m"),
    sled("pull", 1, 50, w.sledPull, "3. állomás · 4×12,5 m"),
    burpee("Burpee broad jump 80 m", 80, "4. állomás"),
    erg("hyrox-row", "row", "Evezés 1000 m", 1, 1000, "5. állomás"),
    farmer(1, 200, w.farmer, "6. állomás"),
    lunge(1, 100, w.lunge, "7. állomás · váltott láb"),
    wallBall(1, 100, w.wallBall, "8. állomás · 100 ismétlés"),
  ];
  const out: HyroxExercise[] = [];
  stations.forEach((station, i) => {
    out.push(
      runIntervals(`${i + 1}. futás · 1 km`, 1, 1000, p.race, i === 0 ? "indíts ~85%-on" : "egyenletes", "küszöb"),
    );
    out.push(station);
  });
  return out;
}

// --- phase / day metadata --------------------------------------------------
const PHASE_NAMES: Record<number, string> = {
  1: "Alapozás",
  2: "Építés",
  3: "Csúcsosítás",
  4: "Pihentetés",
};

const FOCUS: Record<number, [string, string, string]> = {
  1: ["Erő + állomás-technika", "Futás – aerob alap", "Hibrid + bevezető brick"],
  2: ["Erő-állóság + nehéz állomások", "Futás – race-pace", "Kompromittált futás"],
  3: ["Erő-fenntartás + állomás-pacing", "Race-pace élesítő", "Szimuláció"],
  4: ["Rövid élesítő", "Nagyon könnyű", "Versenynap"],
};

function phaseForWeek(week: number): number {
  if (week < 4) return 1;
  if (week < 8) return 2;
  if (week < 11) return 3;
  return 4;
}

// --- per-phase day builders ------------------------------------------------
interface Ctx {
  w: DivisionWeights;
  p: Paces;
}

// Phase 1 — Alapozás. `wp` = 0..3 within the phase (wp===3 is the deload).
function phase1Day(wp: number, day: number, c: Ctx): HyroxExercise[] {
  const { w, p } = c;
  const deload = wp === 3;
  if (day === 0) {
    const squatPlan = [
      [4, 8, "~70% 1RM"],
      [4, 7, "~72–75% 1RM"],
      [4, 6, "~75% 1RM"],
      [3, 6, "deload · könnyű, technika"],
    ][wp] as [number, number, string];
    const sledKg = [
      roundKg(w.sledPush * 0.6),
      roundKg(w.sledPush * 0.6) + 10,
      roundKg(w.sledPush * 0.65),
      roundKg(w.sledPush * 0.5),
    ][wp];
    const farmerKg = [
      Math.max(6, w.farmer - 4),
      Math.max(6, w.farmer - 2),
      w.farmer,
      Math.max(6, w.farmer - 8),
    ][wp];
    return [
      warm(8, "Evezés/kötélugrás + dinamikus mobilitás"),
      strength("hyrox-back-squat", "Hátsó guggolás", squatPlan[0], squatPlan[1], squatPlan[2], ["Comb", "Glutesz"]),
      strength("hyrox-rdl", "Román felhúzás (RDL)", 3, 9, "közepes · ~3 mp engedés", ["Comb hátsó", "Glutesz"]),
      sled("push", 4, 25, sledKg, deload ? "technika · könnyű" : "lábból tolj · ~12–20 mp/25 m"),
      farmer(3, 100, farmerKg, deload ? "könnyű" : "markolat-állóság"),
      core(),
      cool(6, "Comb, csípőhajlító, vádli, hát"),
    ];
  }
  if (day === 1) {
    const main: HyroxExercise[] = [];
    if (wp === 0) {
      main.push(runTime("Folyamatos Z2", 1, 40, "végig beszélhető tempó", "Z2"));
    } else if (wp === 1) {
      main.push(runTime("Z2 alap", 1, 30, "aerob", "Z2"));
      main.push(runIntervals("5×400 m enyhe", 5, 400, p.interval, "kontrollált, nem sprint", "intervallum", 90));
    } else if (wp === 2) {
      main.push(runTime("Tempó 3×8 p", 3, 8, "küszöb · 2 p pihenő", "tempó", 120));
    } else {
      main.push(runTime("Könnyű Z2", 1, 30, "deload", "Z2"));
    }
    return [warm(10, "Lazán + futóiskola"), ...main, cool(5, "Könnyű kocogás/séta")];
  }
  // day 2 — hibrid + bevezető brick
  const wbReps = wp === 2 ? 20 : 15;
  const wbLight = Math.max(4, w.wallBall - 2);
  const brick: HyroxExercise[] = deload
    ? [
        runIntervals("Brick: 500 m futás", 1, 500, p.z2, "tanuló tempó", "Z4–5"),
        wallBall(1, 10, wbLight, "technika"),
      ]
    : [
        runIntervals("Brick: 1 km futás", 1, 1000, p.z2, "érezd, milyen futni állomás után", "Z4–5"),
        wallBall(1, wbReps, wbLight, "állomás"),
        runIntervals("Brick: 1 km futás", 1, 1000, p.z2, "tanuló tempó, szabályos forma", "Z4–5"),
      ];
  return [
    warm(8, "Evezés + váll/törzs/csípő mobilitás"),
    erg("hyrox-skierg", "ski_erg", "SkiErg – technika", 4, 250, "csípőből · ~50–65 mp/250 m", 60),
    erg("hyrox-row", "row", "Evezés (RowErg) – technika", 4, 250, "damper 4–6 · láb→törzs→kar", 60),
    wallBall(4, 15, wbLight, "technika · mély guggolás, célzott dobás"),
    strength("hyrox-pull", "Felsőtest húzás (húzódzkodás / ferde evezés)", 3, 9, "lapocka hátra-le", ["Hát", "Bicepsz"]),
    ...brick,
    cool(5, "Nyújtás, mobilitás"),
  ];
}

// Phase 2 — Építés. wp 0..3 (wp===3 = week 8, slight volume cut).
function phase2Day(wp: number, day: number, c: Ctx): HyroxExercise[] {
  const { w, p } = c;
  if (day === 0) {
    const cut = wp === 3; // week 8 — pull volume back ~20%
    const sledSets = cut ? 3 : 4;
    const lungeSets = cut ? 3 : 4;
    return [
      warm(9, "Mobilitás + 1–2 könnyű ráhangoló szán-tolás"),
      sled("push", sledSets, 25, w.sledPush, "race súly · ~15–25 mp/25 m"),
      sled("pull", sledSets, 25, w.sledPull, "race súly · kéz-kéz húzás"),
      lunge(lungeSets, 50, w.lunge, "race súly · hátsó térd talajt ér, váltott láb"),
      farmer(2, 200, w.farmer, "race súly · egyben, ne tedd le"),
      strength("hyrox-kb-swing", "KB swing / szumó felhúzás", 4, 15, "24–32 kg · csípőből robbants", ["Glutesz", "Hát"]),
      cool(5, cut ? "kötet ~20% vissza, élesítés előtt" : "Nyújtás"),
    ];
  }
  if (day === 1) {
    let main: HyroxExercise;
    if (wp === 0) main = runIntervals("6×1 km @ céltempó", 6, 1000, p.race, "2 p pihenő · egyenletes split", "küszöb", 120);
    else if (wp === 1) main = runTime("Tempó 2×15 p", 2, 15, "küszöb · 3 p pihenő", "tempó", 180);
    else if (wp === 2) main = runIntervals("5×1 km @ céltempó+", 5, 1000, p.racePlus, "90 mp pihenő", "küszöb", 90);
    else main = runIntervals("4×1 km @ céltempó", 4, 1000, p.race, "kis vissza", "küszöb", 120);
    return [warm(12, "Z2 → 4×80 m gyorsulás"), main, cool(8, "Könnyű kocogás + nyújtás")];
  }
  // day 2 — kompromittált futás + mini-szimuláció
  const rounds = [4, 4, 5, 4][wp];
  return [
    warm(10, "Mobilitás + pár könnyű állomás-érintő"),
    ...simRounds(rounds, w, p),
    burpee("Burpee broad jump – gyakorlás", 15, "robbanékony távol-ugrás", 3),
    cool(6, "Nyújtás, mobilitás"),
  ];
}

// Phase 3 — Csúcsosítás. wp 0..2 (weeks 9–11).
function phase3Day(wp: number, day: number, c: Ctx): HyroxExercise[] {
  const { w, p } = c;
  if (day === 0) {
    return [
      warm(8, "Mobilitás + ráhangolás"),
      sled("push", 3, 25, w.sledPush, "verseny-tempó pacing · ne menj pirosba"),
      sled("pull", 3, 25, w.sledPull, "verseny-tempó pacing"),
      farmer(1, 200, w.farmer, "kombó → lunge, fáradtan"),
      lunge(1, 50, w.lunge, "kombó · folyamatos, kontrollált"),
      strength("hyrox-back-squat", "Erő-fenntartás: guggolás", 3, 5, "~80% 1RM · nehéz, kis kötet", ["Comb", "Glutesz"]),
      cool(5, "Nyújtás"),
    ];
  }
  if (day === 1) {
    let main: HyroxExercise;
    if (wp === 0) main = runIntervals("5×1 km @ céltempó", 5, 1000, p.race, "jó splitek, tiszta forma", "küszöb", 120);
    else if (wp === 1) main = runIntervals("4×1 km @ céltempó+", 4, 1000, p.racePlus, "vagy 6×800 m", "küszöb", 90);
    else main = runIntervals("3×1 km élesítő", 3, 1000, p.race, "a hét elején · élesség, nem kifáradás", "küszöb", 120);
    return [warm(12, "Z2 → 4×100 m fokozó"), main, cool(8, "Könnyű kocogás + nyújtás")];
  }
  // day 2 — szimuláció
  let sim: HyroxExercise[];
  if (wp === 0) sim = simRounds(4, w, p); // fél szimuláció
  else if (wp === 1) sim = simRounds(6, w, p); // nagyobb
  else sim = fullRace(w, p); // teljes próba a hét elején
  const note =
    wp === 2 ? "TELJES próba — a hét ELEJÉN, EGYSZER, időmérés" : "verseny-tempó, mérd a spliteket";
  return [warm(13, "Alapos — ezt versenyként kezeld"), ...sim, cool(10, `Átmenet-protokoll · ${note}`)];
}

// Phase 4 — Pihentetés + versenynap (week 12).
function phase4Day(day: number, c: Ctx): HyroxExercise[] {
  const { w, p } = c;
  if (day === 0) {
    return [
      warm(10, "Lazán, mobilitás"),
      runIntervals("Élesítő futás 3×400 m @ céltempó", 3, 400, p.race, "bő pihenő · csak emlékeztető", "intervallum", 120),
      wallBall(2, 20, Math.max(4, w.wallBall - 2), "mozgásminta felfrissítése, NEM terhelés"),
      sled("push", 1, 25, roundKg(w.sledPush * 0.5), "könnyű érintő"),
      cool(5, "Nyújtás"),
    ];
  }
  if (day === 1) {
    return [
      runTime("Könnyű futás Z2", 1, 25, "kötetlen, friss mozgásérzet", "Z2"),
      runIntervals("4×100 m fokozó", 4, 100, p.stride, "élénk, nem sprint", "intervallum", 60),
      cool(8, "Lazítás, alvásra hangolás"),
    ];
  }
  // day 2 — VERSENYNAP (the real race, logged at race weight)
  return [
    warm(20, "Z2 + pár fokozó · indítsd be a fő izmokat, ne hűlj ki"),
    ...fullRace(w, p),
    cool(10, "Alapos nyújtás, mobilitás, regeneráció"),
  ];
}

// --- public entry point ----------------------------------------------------
/**
 * Build the full 36-session HYROX plan. Pure & deterministic.
 *
 * @param input.division     which official weight class (default men_open)
 * @param input.targetTimeMin goal total race time in minutes (default 90)
 */
export function buildHyroxPlan(input: HyroxBuildInput = {}): HyroxTraining[] {
  const division: Division =
    input.division && DIVISIONS[input.division] ? input.division : "men_open";
  const targetTimeMin =
    Number.isFinite(input.targetTimeMin) && (input.targetTimeMin as number) > 0
      ? Math.round(input.targetTimeMin as number)
      : 90;

  const ctx: Ctx = { w: DIVISIONS[division], p: buildPaces(targetTimeMin) };
  const out: HyroxTraining[] = [];

  for (let week = 0; week < HYROX_TOTAL_WEEKS; week++) {
    const phase = phaseForWeek(week);
    const phaseName = PHASE_NAMES[phase];
    for (let day = 0; day < HYROX_DAYS_PER_WEEK; day++) {
      let exercises: HyroxExercise[];
      if (phase === 1) exercises = phase1Day(week, day, ctx);
      else if (phase === 2) exercises = phase2Day(week - 4, day, ctx);
      else if (phase === 3) exercises = phase3Day(week - 8, day, ctx);
      else exercises = phase4Day(day, ctx);

      const focus = FOCUS[phase][day];
      const globalIndex = week * HYROX_DAYS_PER_WEEK + day;
      const prefix = phase === 4 && day === 2 ? "🏁 " : "";
      out.push({
        name: `${prefix}${phaseName} · ${week + 1}. hét · ${focus}`,
        discipline: "hyrox",
        phase,
        phaseName,
        focus,
        weekIndex: week,
        dayIndex: day,
        globalIndex,
        exercises,
      });
    }
  }

  return out;
}
