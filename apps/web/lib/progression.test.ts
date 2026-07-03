import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeSuggestion,
  isCompound,
  incrementFor,
  normalizeStrategy,
  formatSuggestion,
  type ProgressionContext,
} from "./progression";

const session = (sets: Array<[number, number]>, finishedAt?: string) => ({
  sets: sets.map(([kg, reps]) => ({ kg, reps })),
  finishedAt,
});

// --- classification --------------------------------------------------------

test("isCompound: barbell category counts as compound", () => {
  assert.equal(isCompound({ category: "barbell" }), true);
});

test("isCompound: bench/squat/row names count as compound", () => {
  assert.equal(isCompound({ name: "Barbell Bench Press" }), true);
  assert.equal(isCompound({ name: "Back Squat" }), true);
  assert.equal(isCompound({ name: "Bent Over Row" }), true);
});

test("isCompound: curls / raises are isolation", () => {
  assert.equal(isCompound({ name: "Bicep Curl", category: "dumbbell" }), false);
  assert.equal(isCompound({ name: "Lateral Raise" }), false);
});

test("incrementFor: 2.5 compound, 1.25 isolation", () => {
  assert.equal(incrementFor({ strategy: "linear", history: [], name: "Squat" }), 2.5);
  assert.equal(incrementFor({ strategy: "linear", history: [], name: "Bicep Curl" }), 1.25);
});

// --- linear ----------------------------------------------------------------

test("linear: adds compound increment to last top weight, keeps reps", () => {
  const ctx: ProgressionContext = {
    strategy: "linear",
    name: "Squat",
    history: [session([[80, 8], [80, 8]])],
  };
  const s = computeSuggestion(ctx)!;
  assert.equal(s.suggestedKg, 82.5);
  assert.equal(s.suggestedReps, 8);
});

test("linear: isolation uses the 1.25 jump", () => {
  const ctx: ProgressionContext = {
    strategy: "linear",
    name: "Bicep Curl",
    history: [session([[20, 10]])],
  };
  const s = computeSuggestion(ctx)!;
  assert.equal(s.suggestedKg, 21.25);
  assert.equal(s.suggestedReps, 10);
});

test("linear: top set is the heaviest, best reps at that weight", () => {
  const ctx: ProgressionContext = {
    strategy: "linear",
    name: "Squat",
    history: [session([[60, 5], [100, 4], [100, 6], [80, 8]])],
  };
  const s = computeSuggestion(ctx)!;
  assert.equal(s.suggestedKg, 102.5);
  assert.equal(s.suggestedReps, 6);
});

// --- double progression ----------------------------------------------------

test("double-progression: holds weight and adds a rep below the window top", () => {
  const ctx: ProgressionContext = {
    strategy: "double-progression",
    name: "Bicep Curl",
    history: [session([[20, 9]])],
  };
  const s = computeSuggestion(ctx)!;
  assert.equal(s.suggestedKg, 20);
  assert.equal(s.suggestedReps, 10);
});

test("double-progression: at the window top, adds load and resets reps", () => {
  const ctx: ProgressionContext = {
    strategy: "double-progression",
    name: "Bicep Curl",
    history: [session([[20, 12]])],
  };
  const s = computeSuggestion(ctx)!;
  assert.equal(s.suggestedKg, 21.25);
  assert.equal(s.suggestedReps, 8);
});

test("double-progression: respects a custom rep window", () => {
  const ctx: ProgressionContext = {
    strategy: "double-progression",
    name: "Squat",
    history: [session([[100, 5]])],
    repMin: 3,
    repMax: 5,
  };
  const s = computeSuggestion(ctx)!;
  assert.equal(s.suggestedKg, 102.5);
  assert.equal(s.suggestedReps, 3);
});

// --- rpe-based -------------------------------------------------------------

test("rpe-based: clearly easy set bumps weight to the target reps", () => {
  const ctx: ProgressionContext = {
    strategy: "rpe-based",
    name: "Squat",
    history: [session([[100, 12]])], // target 8, 12 >= 8+3
  };
  const s = computeSuggestion(ctx)!;
  assert.equal(s.suggestedKg, 102.5);
  assert.equal(s.suggestedReps, 8);
});

test("rpe-based: missed target backs the weight off", () => {
  const ctx: ProgressionContext = {
    strategy: "rpe-based",
    name: "Squat",
    history: [session([[100, 5]])], // 5 <= 8-2
  };
  const s = computeSuggestion(ctx)!;
  assert.equal(s.suggestedKg, 97.5);
  assert.equal(s.suggestedReps, 8);
});

test("rpe-based: in range holds the weight at target reps", () => {
  const ctx: ProgressionContext = {
    strategy: "rpe-based",
    name: "Squat",
    history: [session([[100, 8]])],
  };
  const s = computeSuggestion(ctx)!;
  assert.equal(s.suggestedKg, 100);
  assert.equal(s.suggestedReps, 8);
});

// --- bodyweight ------------------------------------------------------------

test("bodyweight: progresses reps, never load", () => {
  const ctx: ProgressionContext = {
    strategy: "linear",
    name: "Pull-up",
    history: [session([[0, 10], [0, 8]])],
  };
  const s = computeSuggestion(ctx)!;
  assert.equal(s.suggestedKg, 0);
  assert.equal(s.suggestedReps, 11);
});

// --- history selection -----------------------------------------------------

test("uses the most recent session by finishedAt", () => {
  const ctx: ProgressionContext = {
    strategy: "linear",
    name: "Squat",
    history: [
      session([[90, 8]], "2026-05-01T10:00:00Z"),
      session([[100, 8]], "2026-06-01T10:00:00Z"), // newest
      session([[80, 8]], "2026-04-01T10:00:00Z"),
    ],
  };
  const s = computeSuggestion(ctx)!;
  assert.equal(s.suggestedKg, 102.5);
});

test("skips sessions with no usable sets", () => {
  const ctx: ProgressionContext = {
    strategy: "linear",
    name: "Squat",
    history: [
      session([], "2026-06-02T10:00:00Z"), // empty, newest
      session([[100, 8]], "2026-06-01T10:00:00Z"),
    ],
  };
  const s = computeSuggestion(ctx)!;
  assert.equal(s.suggestedKg, 102.5);
});

// --- null cases ------------------------------------------------------------

test("strategy none returns null", () => {
  assert.equal(
    computeSuggestion({ strategy: "none", name: "Squat", history: [session([[100, 8]])] }),
    null,
  );
});

test("empty history returns null", () => {
  assert.equal(computeSuggestion({ strategy: "linear", name: "Squat", history: [] }), null);
});

// --- helpers ---------------------------------------------------------------

test("normalizeStrategy falls back to none for junk", () => {
  assert.equal(normalizeStrategy("linear"), "linear");
  assert.equal(normalizeStrategy("nonsense"), "none");
  assert.equal(normalizeStrategy(undefined), "none");
});

test("formatSuggestion renders Hungarian decimal comma", () => {
  assert.equal(
    formatSuggestion({ suggestedKg: 82.5, suggestedReps: 8, strategy: "linear", reason: "" }),
    "82,5 × 8",
  );
});
