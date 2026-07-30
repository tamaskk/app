// TypeScript mirror of apps/mobile/lib/models/*.dart. Field names match the
// backend JSON so parsing is a thin cast.

export type Subscription = {
  status: string; // free | trialing | active | cancelled | expired
  plan?: string | null;
  provider?: string | null;
  productId?: string | null;
  trialUsedAt?: string | null;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  isPro: boolean;
};

export const freeSubscription: Subscription = { status: "free", isPro: false };

export type AuthOnboarding = {
  goal?: string | null;
  experience?: string | null;
  split?: string | null;
  daysPerWeek?: number | null;
  sessionDuration?: number | null;
  optimalVolume?: number | null;
};

export type ReminderPrefs = {
  enabled: boolean;
  time: string; // "HH:mm"
  days: number[]; // 1..7
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  onboarding?: AuthOnboarding | null;
  xp: number;
  rank: number;
  username?: string | null;
  weeklyPlan?: string[] | null;
  reminders?: ReminderPrefs | null;
  subscription: Subscription;
};

export function displayName(user: AuthUser): string {
  if (user.name.trim().length) return user.name.trim().split(" ")[0];
  const at = user.email.indexOf("@");
  return at > 0 ? user.email.substring(0, at) : user.email;
}

export type SavedSet = {
  kg: number;
  reps: number;
  done: boolean;
  distanceM?: number | null;
  seconds?: number | null;
  targetKg?: number | null;
};

export type SavedExercise = {
  exerciseId: string;
  name: string;
  category?: string | null;
  gifUrl: string;
  targetMuscles: string[];
  progressionStrategy: string;
  metric?: string | null;
  stationKey?: string | null;
  note?: string | null;
  kcal?: number | null;
  sets: SavedSet[];
};

export type SavedTraining = {
  id: string;
  name: string;
  exercises: SavedExercise[];
  source: string; // manual | generated
  doneAt?: string | null;
  weekIndex?: number | null;
  dayIndex?: number | null;
  discipline: string; // strength | hyrox
  phase?: number | null;
};

export type WorkoutSession = {
  id: string;
  trainingId?: string | null;
  name: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  exercises: SavedExercise[];
};

export type ProgressionSuggestion = {
  suggestedKg: number;
  suggestedReps: number;
  reason: string;
};

export type StagnationItem = {
  exerciseId: string;
  name: string;
  weeksStagnant: number;
  e1rm: number;
  tips: string[];
};

export type RankDelta = {
  previousRank: number;
  newRank: number;
  xpAwarded: number;
  unlocked: boolean;
};

export type WorkoutSessionWithRank = {
  session: WorkoutSession;
  rankDelta?: RankDelta | null;
};

// ---- derived helpers (mirror the Dart getters) ----

export const totalSets = (t: { exercises: SavedExercise[] }): number =>
  t.exercises.reduce((a, e) => a + e.sets.length, 0);

export const doneSets = (t: { exercises: SavedExercise[] }): number =>
  t.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);

export const isGenerated = (t: SavedTraining) => t.source === "generated";
export const isDone = (t: SavedTraining) => t.doneAt != null;
export const isHyrox = (t: SavedTraining) => t.discipline === "hyrox";

export function sessionDurationMs(s: WorkoutSession): number | null {
  if (!s.startedAt || !s.finishedAt) return null;
  return new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime();
}

export function totalKcal(s: WorkoutSession): number {
  return s.exercises.reduce((a, e) => a + (e.kcal ?? 0), 0);
}

export const hasKcal = (s: WorkoutSession): boolean =>
  s.exercises.some((e) => e.kcal != null);

/** Total logged distance (metres) across a session's sets — cardio/runs. */
export function sessionDistanceM(s: WorkoutSession): number {
  return s.exercises.reduce(
    (a, e) => a + e.sets.reduce((b, set) => b + (set.distanceM ?? 0), 0),
    0,
  );
}
