import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";
import { PROGRESSION_STRATEGIES } from "@/lib/progression";

const SetSchema = new Schema(
  {
    kg: { type: Number, default: 0 },
    reps: { type: Number, default: 0 },
    done: { type: Boolean, default: false },
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
