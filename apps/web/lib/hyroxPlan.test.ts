import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildHyroxPlan,
  DIVISIONS,
  HYROX_TOTAL_SESSIONS,
  HYROX_TOTAL_WEEKS,
  HYROX_DAYS_PER_WEEK,
  type HyroxTraining,
} from "./hyroxPlan";
import { HYROX_METRICS } from "./hyroxMetrics";

const plan = buildHyroxPlan();

// --- shape & indexing ------------------------------------------------------

test("builds exactly 12 weeks × 3 days = 36 sessions", () => {
  assert.equal(plan.length, HYROX_TOTAL_SESSIONS);
  assert.equal(HYROX_TOTAL_SESSIONS, HYROX_TOTAL_WEEKS * HYROX_DAYS_PER_WEEK);
});

test("week/day/global indices are contiguous and correct", () => {
  plan.forEach((t, i) => {
    assert.equal(t.globalIndex, i, `globalIndex at ${i}`);
    assert.equal(t.weekIndex, Math.floor(i / HYROX_DAYS_PER_WEEK));
    assert.equal(t.dayIndex, i % HYROX_DAYS_PER_WEEK);
  });
});

test("phases sit on the right week boundaries (1-4 / 5-8 / 9-11 / 12)", () => {
  const phaseOf = (week: number) => plan.find((t) => t.weekIndex === week)!.phase;
  for (let w = 0; w < 4; w++) assert.equal(phaseOf(w), 1, `week ${w + 1}`);
  for (let w = 4; w < 8; w++) assert.equal(phaseOf(w), 2, `week ${w + 1}`);
  for (let w = 8; w < 11; w++) assert.equal(phaseOf(w), 3, `week ${w + 1}`);
  assert.equal(phaseOf(11), 4, "week 12");
});

test("every session has a name, a focus and at least 3 exercises", () => {
  for (const t of plan) {
    assert.ok(t.name.length > 0);
    assert.ok(t.focus.length > 0);
    assert.equal(t.discipline, "hyrox");
    assert.ok(t.exercises.length >= 3, `${t.name} has ${t.exercises.length} exercises`);
  }
});

// --- determinism -----------------------------------------------------------

test("same input → byte-identical plan (deterministic)", () => {
  assert.deepEqual(buildHyroxPlan(), buildHyroxPlan());
  assert.deepEqual(
    buildHyroxPlan({ division: "men_pro", targetTimeMin: 75 }),
    buildHyroxPlan({ division: "men_pro", targetTimeMin: 75 }),
  );
});

// --- metric integrity (the XP / PR safety contract) ------------------------

test("every exercise uses a known metric and a valid progression strategy", () => {
  for (const t of plan) {
    for (const e of t.exercises) {
      assert.ok(HYROX_METRICS.includes(e.metric), `bad metric ${e.metric} in ${e.name}`);
      assert.ok(
        e.progressionStrategy === "none" || e.progressionStrategy === "linear",
        `bad strategy ${e.progressionStrategy} in ${e.name}`,
      );
    }
  }
});

test("station loads live in targetKg, never in kg (keeps e1RM/XP clean)", () => {
  for (const t of plan) {
    for (const e of t.exercises) {
      for (const s of e.sets) {
        // Nothing in a freshly-seeded plan carries a logged kg — the user fills
        // it as they train. Critically, station weight is in targetKg.
        assert.equal(s.kg, 0, `${e.name} has prefilled kg ${s.kg}`);
        if (e.metric === "distance_weight" || e.metric === "reps_weight") {
          assert.ok((s.targetKg ?? 0) > 0, `${e.name} missing targetKg`);
        }
        if (e.metric === "reps") {
          assert.equal(s.targetKg, null, `strength ${e.name} should not set targetKg`);
        }
      }
    }
  }
});

test("strength lifts are metric 'reps' + linear; stations are 'none'", () => {
  const squat = plan[0].exercises.find((e) => e.exerciseId === "hyrox-back-squat")!;
  assert.equal(squat.metric, "reps");
  assert.equal(squat.progressionStrategy, "linear");
  assert.equal(squat.sets[0].reps, 8); // week 1 → 4×8
  assert.equal(squat.sets.length, 4);

  const sled = plan.flatMap((t) => t.exercises).find((e) => e.stationKey === "sled_push")!;
  assert.equal(sled.metric, "distance_weight");
  assert.equal(sled.progressionStrategy, "none");
});

// --- division weights ------------------------------------------------------

test("division fills the official station weights (doc §4)", () => {
  const sledOf = (division: Parameters<typeof buildHyroxPlan>[0]) =>
    buildHyroxPlan(division)
      .flatMap((t) => t.exercises)
      .find((e) => e.stationKey === "sled_push" && e.sets.some((s) => s.distanceM === 50))!
      .sets[0].targetKg;
  assert.equal(sledOf({ division: "men_open" }), DIVISIONS.men_open.sledPush); // 152
  assert.equal(sledOf({ division: "women_open" }), DIVISIONS.women_open.sledPush); // 102
  assert.equal(sledOf({ division: "men_pro" }), DIVISIONS.men_pro.sledPush); // 202
});

test("wall ball in the full race is 100 reps at the division weight", () => {
  const raceDay = plan[plan.length - 1]; // week 12 day 3 — versenynap
  const wb = raceDay.exercises.find((e) => e.stationKey === "wall_ball")!;
  assert.equal(wb.sets[0].reps, 100);
  assert.equal(wb.sets[0].targetKg, DIVISIONS.men_open.wallBall); // 6
});

// --- pacing ----------------------------------------------------------------

test("a faster goal time produces a faster prescribed race pace", () => {
  const paceFor = (targetTimeMin: number) => {
    const t = buildHyroxPlan({ targetTimeMin }).find((x) => x.weekIndex === 4 && x.dayIndex === 1)!;
    const run = t.exercises.find((e) => e.metric === "pace")!;
    return run.sets[0].seconds!;
  };
  assert.ok(paceFor(60) < paceFor(90), "60 min goal should be faster than 90 min");
  assert.ok(paceFor(90) < paceFor(105), "90 min goal should be faster than 105 min");
});

// --- periodisation details -------------------------------------------------

test("week 4 is a deload: squat volume drops to 3×6", () => {
  const wk4Day0 = plan.find((t) => t.weekIndex === 3 && t.dayIndex === 0)!;
  const squat = wk4Day0.exercises.find((e) => e.exerciseId === "hyrox-back-squat")!;
  assert.equal(squat.sets.length, 3);
  assert.equal(squat.sets[0].reps, 6);
});

test("the week-11 simulation is the full race: 8 stations + 8 runs", () => {
  const sim = plan.find((t) => t.weekIndex === 10 && t.dayIndex === 2)!;
  const stationKeys = new Set(
    sim.exercises.map((e) => e.stationKey).filter((k): k is string => !!k && k !== "run"),
  );
  for (const k of [
    "ski_erg",
    "sled_push",
    "sled_pull",
    "burpee_broad_jump",
    "row",
    "farmer_carry",
    "sandbag_lunge",
    "wall_ball",
  ]) {
    assert.ok(stationKeys.has(k), `full race missing station ${k}`);
  }
  const runs = sim.exercises.filter((e) => e.stationKey === "run");
  assert.equal(runs.length, 8, "full race has 8 × 1 km runs");
});

test("invalid division falls back to men_open", () => {
  const bogus = buildHyroxPlan({ division: "nope" as never });
  assert.deepEqual(bogus, buildHyroxPlan({ division: "men_open" }));
});

// Tiny type-only guard so unused imports don't trip eslint in test builds.
const _typecheck: HyroxTraining = plan[0];
void _typecheck;
