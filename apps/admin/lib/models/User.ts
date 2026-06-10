import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

// Answers from the first-launch onboarding flow. All optional — collected
// before registration and saved with the account.
const OnboardingSchema = new Schema(
  {
    goal: String,
    experience: String,
    stress: String,
    gender: String,
    age: Number,
    weightKg: Number,
    useLbs: Boolean,
    cardio: String,
    focusMuscles: { type: [String], default: [] },
    sessionDuration: Number,
    daysPerWeek: Number,
    split: String,
    weightedPullup: Boolean,
    weightedDips: Boolean,
    optimalVolume: Number,
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, default: "", trim: true },
    // scrypt hash stored as "salt:hash" (see lib/auth.ts). Never returned to clients.
    // Optional because OAuth users sign in without a password.
    passwordHash: { type: String, default: null },
    onboarding: { type: OnboardingSchema, default: null },
    // Forgot-password flow: SHA-256 of the reset token + a UTC expiry.
    // Hashed so a DB leak alone cannot be used to take over accounts.
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
    // OAuth identity. Populated when the user signed up via Apple or Google.
    // `oauthSubject` is the provider-issued user id (Apple `sub`, Google `sub`).
    oauthProvider: { type: String, default: null, enum: [null, "apple", "google"] },
    oauthSubject: { type: String, default: null, index: true },
    // --- Gamification (rank + XP) ----------------------------------------
    // Total XP earned, monotonic — never reduced except via admin tooling.
    // Indexed for global leaderboard queries (Csomag 2 surface).
    xp: { type: Number, default: 0, index: true },
    // Current rank tier 1..10. Derived from xp; kept denormalised so the
    // dashboard chip + leaderboard row can render without a recompute.
    rank: { type: Number, default: 1 },
    // Public handle, opted-in via the leaderboard onboarding (Csomag 2).
    // NO `default: null`: a sparse unique index only skips documents where the
    // field is ABSENT — an explicit null is indexed, so defaulting to null makes
    // the 2nd account collide (E11000). Leave it unset until a handle is chosen.
    username: { type: String, unique: true, sparse: true },
    // ISO 3166-1 alpha-2 (e.g. "HU"). Optional, used for country leaderboard.
    country: { type: String, default: null },
    // Audit log of every XP grant — keeps the per-week breakdown honest and
    // gives admins something to inspect when chasing cheaters.
    xpLog: {
      type: [
        new Schema(
          {
            source: { type: String, required: true },
            amount: { type: Number, required: true },
            at: { type: Date, required: true },
            sessionId: { type: String, default: null },
          },
          { _id: false },
        ),
      ],
      default: [],
      select: false, // Only load this when explicitly requested.
    },
    // Last time the user crossed into a new rank — drives the rank-up overlay
    // surfaced from the workout summary screen.
    lastRankUpAt: { type: Date, default: null },
    // --- Weekly plan + daily reminders ------------------------------------
    // Custom 7-day plan that overrides the onboarding-derived split. Each
    // entry is a short label (REST / PUSH / PULL / LEGS / UPPER / LOWER /
    // FULLBODY / CHEST / BACK / SHOULDERS / ARMS / CORE) — case-insensitive.
    // Stored Monday-first to match the rest of the app.
    weeklyPlan: {
      type: [String],
      default: null,
      validate: {
        validator: (v: string[] | null) => v == null || v.length === 7,
        message: "weeklyPlan must contain exactly 7 entries",
      },
    },
    // Local-notification reminder preferences. Scheduling happens client-side
    // — the server just persists the user's choice.
    reminders: {
      type: new Schema(
        {
          enabled: { type: Boolean, default: false },
          // "HH:mm" in 24h format. Time zone is the device's, not stored here.
          time: { type: String, default: "18:00" },
          // ISO weekday indices (1..7, Mon..Sun) that fire reminders.
          // Empty array = no days, which the client treats as "disabled".
          days: { type: [Number], default: [] },
        },
        { _id: false },
      ),
      default: () => ({ enabled: false, time: "18:00", days: [] }),
    },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof UserSchema>;

// Dev: drop the cached model so schema edits apply without a full restart.
if (process.env.NODE_ENV !== "production" && models.User) {
  mongoose.deleteModel("User");
}

// Reuse the compiled model across hot reloads to avoid OverwriteModelError.
export const UserModel =
  (models.User as mongoose.Model<User>) ?? model<User>("User", UserSchema);
