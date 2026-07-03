import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePlates,
  formatEquation,
  formatBarDiagram,
  closestNote,
} from "./plates";

// --- core greedy loading ---------------------------------------------------

test("100kg on a 20kg bar loads fewest plates first (25 + 15), exact", () => {
  // (100-20)/2 = 40 → greedy largest-first picks 25 + 15 (the default set has a
  // 15), which is fewer plates than 25 + 10 + 5. Both total 40kg per side.
  const r = computePlates(100);
  assert.deepEqual(r.perSide, [25, 15]);
  assert.equal(r.achievable, 100);
  assert.equal(r.exact, true);
  assert.equal(r.feasible, true);
});

test("without a 15 plate, 100kg loads 25 + 10 + 5 (the spec example)", () => {
  const r = computePlates(100, 20, [25, 20, 10, 5, 2.5, 1.25]);
  assert.deepEqual(r.perSide, [25, 10, 5]);
  assert.equal(r.achievable, 100);
});

test("97.5kg is exactly loadable with 1.25s", () => {
  const r = computePlates(97.5);
  assert.deepEqual(r.perSide, [25, 10, 2.5, 1.25]);
  assert.equal(r.achievable, 97.5);
  assert.equal(r.exact, true);
});

test("uses the heaviest plates first", () => {
  const r = computePlates(160); // (160-20)/2 = 70 = 25+25+20
  assert.deepEqual(r.perSide, [25, 25, 20]);
  assert.equal(r.achievable, 160);
});

// --- closest-achievable (round down) ---------------------------------------

test("unreachable target rounds DOWN to the closest achievable", () => {
  const r = computePlates(99); // per side 39.5 → 25+10+2.5+1.25 = 38.75
  assert.equal(r.exact, false);
  assert.equal(r.achievable, 97.5);
  assert.equal(closestNote(r), "closest achievable: 97.5kg");
});

test("closestNote is null when exact", () => {
  assert.equal(closestNote(computePlates(100)), null);
});

// --- bar / feasibility edges ----------------------------------------------

test("bar-only weight: no plates, exact", () => {
  const r = computePlates(20);
  assert.deepEqual(r.perSide, []);
  assert.equal(r.achievable, 20);
  assert.equal(r.exact, true);
  assert.equal(formatEquation(r), "20kg = 20kg bar");
});

test("below the bar weight is infeasible", () => {
  const r = computePlates(15);
  assert.equal(r.feasible, false);
  assert.deepEqual(r.perSide, []);
  assert.equal(r.achievable, 20);
});

test("custom bar weight and plate set", () => {
  const r = computePlates(60, 15, [20, 10]); // per side 22.5 → 20 (10 leftover<10? 2.5)
  assert.deepEqual(r.perSide, [20]);
  assert.equal(r.achievable, 55); // 15 + 2*20
  assert.equal(r.exact, false);
});

test("a target unreachable with coarse plates falls back to the bar", () => {
  const r = computePlates(50, 20, [20]); // per side 15 → no 20 fits
  assert.deepEqual(r.perSide, []);
  assert.equal(r.achievable, 20);
  assert.equal(r.exact, false);
});

// --- rendering -------------------------------------------------------------

test("formatEquation matches the spec example (no 15 plate)", () => {
  const r = computePlates(100, 20, [25, 20, 10, 5, 2.5, 1.25]);
  assert.equal(formatEquation(r), "100kg = 20kg bar + 2×(25 + 10 + 5)");
});

test("formatBarDiagram is symmetric around the bar", () => {
  const r = computePlates(100, 20, [25, 20, 10, 5, 2.5, 1.25]);
  assert.equal(formatBarDiagram(r), "5 10 25 [I===] 20kg bar [===I] 25 10 5");
});

test("formatBarDiagram with no plates is just the bar", () => {
  assert.equal(formatBarDiagram(computePlates(20)), "[I===] 20kg bar [===I]");
});
