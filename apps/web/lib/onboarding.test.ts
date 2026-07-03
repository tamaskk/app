import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeOnboarding } from "./onboarding";

test("keeps valid fields and coerces nothing extra", () => {
  const out = sanitizeOnboarding({
    goal: "build_muscle",
    experience: "intermediate",
    age: 25,
    weightKg: 70,
    useLbs: false,
    focusMuscles: ["Chest", "Lats"],
    daysPerWeek: 4,
    optimalVolume: 12,
  });
  assert.equal(out?.goal, "build_muscle");
  assert.equal(out?.age, 25);
  assert.deepEqual(out?.focusMuscles, ["Chest", "Lats"]);
  assert.equal(out?.optimalVolume, 12);
});

test("drops wrong-typed and unknown fields", () => {
  const out = sanitizeOnboarding({
    goal: 123, // wrong type → dropped
    age: "old", // wrong type → dropped
    hacker: "x", // unknown → not included
    weightKg: 80,
  }) as Record<string, unknown>;
  assert.equal("goal" in out, false);
  assert.equal("age" in out, false);
  assert.equal("hacker" in out, false);
  assert.equal(out.weightKg, 80);
});

test("filters non-string focus muscles", () => {
  const out = sanitizeOnboarding({ focusMuscles: ["Chest", 5, null, "Abs"] });
  assert.deepEqual(out?.focusMuscles, ["Chest", "Abs"]);
});

test("returns undefined for empty / non-object input", () => {
  assert.equal(sanitizeOnboarding(null), undefined);
  assert.equal(sanitizeOnboarding(undefined), undefined);
  assert.equal(sanitizeOnboarding({}), undefined);
  assert.equal(sanitizeOnboarding("nope" as unknown as Record<string, unknown>), undefined);
});
