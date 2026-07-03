import { test } from "node:test";
import assert from "node:assert/strict";
import { mapExercises } from "./trainings";
import { isStrengthMetric } from "./hyroxMetrics";
import { buildHyroxPlan, DIVISIONS } from "./hyroxPlan";

// --- ordinary strength (unchanged behaviour) -------------------------------

test("plain strength exercise: metric/station/note default to null, sets carry kg×reps", () => {
  const [e] = mapExercises([
    { exerciseId: 123, name: "Bench", sets: [{ kg: 60, reps: 8, done: true }] },
  ]);
  assert.equal(e.exerciseId, "123"); // coerced to string
  assert.equal(e.metric, null);
  assert.equal(e.stationKey, null);
  assert.equal(e.note, null);
  assert.equal(e.progressionStrategy, "linear"); // absent → default
  assert.deepEqual(e.sets[0], {
    kg: 60,
    reps: 8,
    done: true,
    distanceM: null,
    seconds: null,
    resultSeconds: null,
    targetKg: null,
  });
});

// --- HYROX passthrough -----------------------------------------------------

test("HYROX station fields pass through untouched", () => {
  const [e] = mapExercises([
    {
      exerciseId: "hyrox-sled-push",
      name: "Szán tolás",
      metric: "distance_weight",
      stationKey: "sled_push",
      note: "race súly",
      progressionStrategy: "none",
      sets: [{ distanceM: 25, targetKg: 152 }],
    },
  ]);
  assert.equal(e.metric, "distance_weight");
  assert.equal(e.stationKey, "sled_push");
  assert.equal(e.note, "race súly");
  assert.equal(e.progressionStrategy, "none");
  assert.equal(e.sets[0].distanceM, 25);
  assert.equal(e.sets[0].targetKg, 152);
  assert.equal(e.sets[0].kg, 0); // not provided → default 0, NOT polluted
});

test("unknown metric is rejected to null; junk strategy → none", () => {
  const [e] = mapExercises([
    {
      exerciseId: "x",
      name: "X",
      metric: "telekinesis",
      progressionStrategy: "made-up",
      sets: [],
    },
  ]);
  assert.equal(e.metric, null);
  assert.equal(e.progressionStrategy, "none");
});

test("non-finite metric numbers coerce to null", () => {
  const [e] = mapExercises([
    {
      exerciseId: "x",
      name: "X",
      metric: "pace",
      sets: [{ distanceM: NaN as unknown as number, seconds: 345 }],
    },
  ]);
  assert.equal(e.sets[0].distanceM, null);
  assert.equal(e.sets[0].seconds, 345);
});

test("exercises without id or name are dropped", () => {
  const out = mapExercises([
    { name: "no id" },
    { exerciseId: "", name: "empty id" },
    { exerciseId: "ok" }, // no name
    { exerciseId: "good", name: "keep", sets: [] },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].exerciseId, "good");
});

// --- the PR-guard contract -------------------------------------------------

test("isStrengthMetric: only reps (or absent) counts for e1RM PRs", () => {
  assert.equal(isStrengthMetric(null), true);
  assert.equal(isStrengthMetric(undefined), true);
  assert.equal(isStrengthMetric("reps"), true);
  assert.equal(isStrengthMetric("distance_weight"), false);
  assert.equal(isStrengthMetric("reps_weight"), false);
  assert.equal(isStrengthMetric("distance"), false);
  assert.equal(isStrengthMetric("time"), false);
  assert.equal(isStrengthMetric("pace"), false);
});

// --- end-to-end: a HYROX session save keeps stations out of PR/XP scope ----

test("round-trip: race-day stations survive mapExercises but never count as PRs", () => {
  const plan = buildHyroxPlan();
  const raceDay = plan[plan.length - 1]; // week 12 day 3 — the full race
  // Simulate what the mobile player POSTs to /api/sessions: every set ticked.
  const mapped = mapExercises(
    raceDay.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      name: e.name,
      metric: e.metric,
      stationKey: e.stationKey,
      note: e.note,
      progressionStrategy: e.progressionStrategy,
      sets: e.sets.map((s) => ({
        kg: s.kg,
        reps: s.reps,
        done: true,
        distanceM: s.distanceM,
        seconds: s.seconds,
        targetKg: s.targetKg,
      })),
    })),
  );

  // Station metadata + load survive the normalise step, and kg stays 0.
  const sled = mapped.find((e) => e.stationKey === "sled_push")!;
  assert.equal(sled.metric, "distance_weight");
  assert.equal(sled.sets[0].kg, 0);
  assert.equal(sled.sets[0].targetKg, DIVISIONS.men_open.sledPush);

  // Critically: NOTHING in the race is e1RM-eligible (no fake 152 kg PRs).
  const strengthEligible = mapped.filter((e) => isStrengthMetric(e.metric));
  assert.equal(strengthEligible.length, 0);
});

test("round-trip: a HYROX strength lift stays e1RM-eligible", () => {
  const plan = buildHyroxPlan();
  const day1 = plan[0]; // week 1 day 1 — has the back squat
  const mapped = mapExercises(
    day1.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      name: e.name,
      metric: e.metric,
      sets: e.sets.map((s) => ({ kg: s.kg, reps: s.reps, done: true })),
    })),
  );
  const squat = mapped.find((e) => e.exerciseId === "hyrox-back-squat")!;
  assert.equal(squat.metric, "reps");
  assert.equal(isStrengthMetric(squat.metric), true);
});
