import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";
import { PROGRESSION_STRATEGIES } from "@/lib/progression";

const SetSchema = new Schema(
  {
    kg: { type: Number, default: 0 },
    reps: { type: Number, default: 0 },
    done: { type: Boolean, default: false },
    // --- HYROX metric fields (optional, additive) ----------------------------
    // Stations are distance/time/load based rather than kg×reps. These stay
    // absent (null) for ordinary strength sets, so the XP / PR / e1RM engines
    // — which only ever look at kg×reps with kg>0 — keep working unchanged.
    // The prescribed station load lives in `targetKg`, NOT `kg`, on purpose:
    // that keeps a 152 kg sled out of the e1RM PR maths.
    distanceM: { type: Number, default: null }, // metres to cover (ski/row/run/sled…)
    seconds: { type: Number, default: null }, // target / prescribed duration or pace
    targetKg: { type: Number, default: null }, // prescribed station load (display only)
    // The athlete's LOGGED time for this set (lower = better). Drives HYROX
    // station records & time-based PRs. Separate from `seconds` (the target).
    resultSeconds: { type: Number, default: null },
  },
  { _id: false },
);

const TrainingExerciseSchema = new Schema(
  {
    // Reference back to the catalogue exercise this came from (string id).
    exerciseId: { type: String, required: true },
    name: { type: String, required: true },
    gifUrl: { type: String, default: "" },
    targetMuscles: { type: [String], default: [] },
    category: { type: String, default: null },
    // How the auto-progression engine suggests the next session's load/reps.
    progressionStrategy: {
      type: String,
      enum: PROGRESSION_STRATEGIES,
      default: "linear",
    },
    // --- HYROX metric fields (optional, additive) ----------------------------
    // `metric` tells the workout player how to render/log this movement:
    //   reps           – classic kg×reps strength (default; behaves as before)
    //   distance        – cover N metres, bodyweight (ski/row/run/burpee)
    //   distance_weight – cover N metres loaded (sled push/pull, carry, lunge)
    //   reps_weight     – fixed reps at a fixed load (wall ball)
    //   time            – hold/effort for N seconds (plank, easy/tempo runs)
    //   pace            – cover N metres at a target pace (interval runs)
    // Absent → undefined → the client treats it as "reps".
    metric: { type: String, default: null },
    // Which official HYROX station this maps to (e.g. "sled_push"), or null.
    stationKey: { type: String, default: null },
    // Coaching cue / target note shown under the exercise ("~70% 1RM", "céltempó").
    note: { type: String, default: null },
    // Prescribed rest after each set, in seconds (doc's "2 p pihenő" etc). The
    // player uses it to set the rest-timer duration. Null → user's default.
    restSeconds: { type: Number, default: null },
    // Target heart-rate zone for runs ("Z2", "tempó", "intervallum", "Z4–5").
    // Display-only; live HR/watch sync is a separate platform feature.
    zone: { type: String, default: null },
    sets: { type: [SetSchema], default: [] },
  },
  { _id: false },
);

const TrainingSchema = new Schema(
  {
    // Owner of the training. Optional for backwards compatibility — older
    // trainings predating gamification can still be loaded. Generated plans
    // always carry this so we can scope queries per-user later.
    userId: { type: String, default: null, index: true },
    name: { type: String, required: true, trim: true },
    exercises: { type: [TrainingExerciseSchema], default: [] },
    // Provenance tag — "generated" for plan-builder output, "manual" otherwise.
    // Lets the trainings list surface a "GENERATED" badge or filter later.
    source: { type: String, default: "manual" },
    // Discipline this training belongs to. "strength" = the regular Edzések
    // experience (default, so every existing training is unchanged); "hyrox" =
    // part of a HYROX plan, surfaced in the dedicated HYROX tab. Indexed so the
    // HYROX screen can query a user's HYROX trainings cheaply.
    discipline: { type: String, default: "strength", index: true },
    // For HYROX plans: which 12-week phase (1–4) this session sits in. Lets the
    // HYROX screen group cards by Alapozás / Építés / Csúcsosítás / Pihentetés.
    phase: { type: Number, default: null },
    // Plan grouping — generated trainings share the same `planId` so the
    // user can replay or delete a whole plan in one operation.
    planId: { type: String, default: null, index: true },
    weekIndex: { type: Number, default: null },
    dayIndex: { type: Number, default: null },
    // Last time a session was logged against this training. Used by the
    // trainings list to sort "done" cards to the end of the generated row.
    doneAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type Training = InferSchemaType<typeof TrainingSchema>;

// In dev, Mongoose caches the compiled model on its singleton, so schema edits
// don't take effect across Next's hot-reload (only a full restart clears it).
// Drop the cached model so the latest schema is always used. Production keeps
// the cache (module is imported once) to avoid needless re-registration.
if (process.env.NODE_ENV !== "production" && models.Training) {
  mongoose.deleteModel("Training");
}

// Reuse the compiled model across hot reloads to avoid OverwriteModelError.
export const TrainingModel =
  (models.Training as mongoose.Model<Training>) ??
  model<Training>("Training", TrainingSchema);
