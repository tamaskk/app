import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

const SetSchema = new Schema(
  {
    kg: { type: Number, default: 0 },
    reps: { type: Number, default: 0 },
    done: { type: Boolean, default: false },
  },
  { _id: false },
);

const SessionExerciseSchema = new Schema(
  {
    exerciseId: { type: String, default: "" },
    name: { type: String, required: true },
    gifUrl: { type: String, default: "" },
    targetMuscles: { type: [String], default: [] },
    sets: { type: [SetSchema], default: [] },
  },
  { _id: false },
);

// A completed workout: when it started/finished and exactly what was logged
// (each set's kg/reps and whether it was checked off).
const WorkoutSessionSchema = new Schema(
  {
    // Owner of the session — required for XP attribution and (in Csomag 2)
    // for the per-user leaderboard query. Older sessions saved before the
    // gamification work may have `null` and should be ignored for XP.
    userId: { type: String, default: null, index: true },
    trainingId: { type: String, default: null },
    name: { type: String, default: "" },
    startedAt: { type: Date },
    finishedAt: { type: Date },
    exercises: { type: [SessionExerciseSchema], default: [] },
    // XP awarded for THIS session — denormalised onto the session so the
    // summary screen can show the breakdown without re-deriving it.
    xpAwarded: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type WorkoutSession = InferSchemaType<typeof WorkoutSessionSchema>;

// Dev: drop the cached model so schema edits apply without a full restart.
if (process.env.NODE_ENV !== "production" && models.WorkoutSession) {
  mongoose.deleteModel("WorkoutSession");
}

export const WorkoutSessionModel =
  (models.WorkoutSession as mongoose.Model<WorkoutSession>) ??
  model<WorkoutSession>("WorkoutSession", WorkoutSessionSchema);
