import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectStagnation,
  epley1RM,
  type StagnationSession,
} from "./stagnation";

const DAY = 86_400_000;
const BASE = Date.UTC(2026, 0, 5); // weeks are normalised to Monday internally

// A session `offset` weeks from the base, logging one exercise's sets.
const wk = (
  offset: number,
  sets: Array<[number, number]>,
  name = "Bench Press",
  exerciseId = "bench",
): StagnationSession => ({
  finishedAt: new Date(BASE + offset * 7 * DAY).toISOString(),
  exercises: [{ exerciseId, name, sets: sets.map(([kg, reps]) => ({ kg, reps })) }],
});

// --- e1RM ------------------------------------------------------------------

test("epley1RM: standard estimate", () => {
  assert.equal(Math.round(epley1RM(100, 5) * 100) / 100, 116.67);
});

test("epley1RM: bodyweight / empty is 0", () => {
  assert.equal(epley1RM(0, 12), 0);
  assert.equal(epley1RM(100, 0), 0);
});

// --- core detection --------------------------------------------------------

test("flags an exercise flat for the last 3 weeks", () => {
  const sessions = [
    wk(0, [[100, 5]]),
    wk(1, [[100, 5]]),
    wk(2, [[100, 5]]),
    wk(3, [[100, 5]]),
  ];
  const items = detectStagnation(sessions);
  assert.equal(items.length, 1);
  assert.equal(items[0].exerciseId, "bench");
  assert.equal(items[0].name, "Bench Press");
  assert.equal(items[0].weeksStagnant, 3);
  assert.equal(items[0].e1rm, 116.7);
  assert.deepEqual(items[0].tips, ["deload", "variation", "volume drop"]);
});

test("does not flag steady >1% weekly progress", () => {
  const sessions = [
    wk(0, [[100, 5]]),
    wk(1, [[103, 5]]),
    wk(2, [[106, 5]]),
    wk(3, [[110, 5]]),
  ];
  assert.equal(detectStagnation(sessions).length, 0);
});

test("needs at least weeks+1 of history (3 flat weeks is not enough)", () => {
  const sessions = [wk(0, [[100, 5]]), wk(1, [[100, 5]]), wk(2, [[100, 5]])];
  assert.equal(detectStagnation(sessions).length, 0);
});

test("sub-threshold gains still count as stagnation", () => {
  // ~0.5% weekly — below the 1% default.
  const sessions = [
    wk(0, [[100, 5]]),
    wk(1, [[100.5, 5]]),
    wk(2, [[101, 5]]),
    wk(3, [[101.4, 5]]),
  ];
  const items = detectStagnation(sessions);
  assert.equal(items.length, 1);
  assert.equal(items[0].weeksStagnant, 3);
});

test("a lower threshold treats those same gains as progress", () => {
  const sessions = [
    wk(0, [[100, 5]]),
    wk(1, [[100.5, 5]]),
    wk(2, [[101, 5]]),
    wk(3, [[101.4, 5]]),
  ];
  assert.equal(detectStagnation(sessions, { threshold: 0.001 }).length, 0);
});

test("weeks option is configurable", () => {
  const sessions = [wk(0, [[100, 5]]), wk(1, [[100, 5]]), wk(2, [[100, 5]])];
  const items = detectStagnation(sessions, { weeks: 2 });
  assert.equal(items.length, 1);
  assert.equal(items[0].weeksStagnant, 2);
});

// --- robustness ------------------------------------------------------------

test("uses the best set's e1RM within a week", () => {
  const sessions = [
    wk(0, [[60, 10], [100, 5]]),
    wk(1, [[100, 5], [40, 8]]),
    wk(2, [[100, 5]]),
    wk(3, [[100, 5]]),
  ];
  const items = detectStagnation(sessions);
  assert.equal(items.length, 1);
  assert.equal(items[0].e1rm, 116.7);
});

test("ignores bodyweight-only exercises (e1RM 0)", () => {
  const sessions = [
    wk(0, [[0, 10]], "Pull-up", "pull"),
    wk(1, [[0, 11]], "Pull-up", "pull"),
    wk(2, [[0, 12]], "Pull-up", "pull"),
    wk(3, [[0, 12]], "Pull-up", "pull"),
  ];
  assert.equal(detectStagnation(sessions).length, 0);
});

test("multiple sessions in one week collapse to that week's best", () => {
  const sessions = [
    wk(0, [[100, 5]]),
    { ...wk(1, [[90, 5]]) },
    { ...wk(1, [[100, 5]]) }, // same week, higher — should win
    wk(2, [[100, 5]]),
    wk(3, [[100, 5]]),
  ];
  const items = detectStagnation(sessions);
  assert.equal(items.length, 1);
  assert.equal(items[0].weeksStagnant, 3);
});

test("skips sessions with an unparseable date", () => {
  const sessions: StagnationSession[] = [
    { finishedAt: null, exercises: [{ exerciseId: "bench", name: "Bench", sets: [{ kg: 999, reps: 5 }] }] },
    wk(0, [[100, 5]]),
    wk(1, [[100, 5]]),
    wk(2, [[100, 5]]),
    wk(3, [[100, 5]]),
  ];
  const items = detectStagnation(sessions);
  assert.equal(items.length, 1);
  assert.equal(items[0].e1rm, 116.7); // the null-date 999kg set was ignored
});

test("sorts most-stagnant first", () => {
  const sessions = [
    // bench: stagnant 3 weeks
    wk(0, [[100, 5]], "Bench", "bench"),
    wk(1, [[100, 5]], "Bench", "bench"),
    wk(2, [[100, 5]], "Bench", "bench"),
    wk(3, [[100, 5]], "Bench", "bench"),
    // squat: stagnant 4 weeks
    wk(0, [[140, 5]], "Squat", "squat"),
    wk(1, [[140, 5]], "Squat", "squat"),
    wk(2, [[140, 5]], "Squat", "squat"),
    wk(3, [[140, 5]], "Squat", "squat"),
    wk(4, [[140, 5]], "Squat", "squat"),
  ];
  const items = detectStagnation(sessions);
  assert.equal(items.length, 2);
  assert.equal(items[0].exerciseId, "squat");
  assert.equal(items[0].weeksStagnant, 4);
  assert.equal(items[1].exerciseId, "bench");
});

test("empty input yields no items", () => {
  assert.deepEqual(detectStagnation([]), []);
});
