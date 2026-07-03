// Normalisation for the onboarding payload sent at registration. Whitelists
// fields and coerces types so junk never reaches the User document.

export type IncomingOnboarding = Record<string, unknown> | null | undefined;

export interface Onboarding {
  goal?: string;
  experience?: string;
  stress?: string;
  gender?: string;
  age?: number;
  weightKg?: number;
  useLbs?: boolean;
  cardio?: string;
  focusMuscles?: string[];
  sessionDuration?: number;
  daysPerWeek?: number;
  split?: string;
  weightedPullup?: boolean;
  weightedDips?: boolean;
  optimalVolume?: number;
}

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;
const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;
const bool = (v: unknown): boolean | undefined =>
  typeof v === "boolean" ? v : undefined;

/** Returns a clean Onboarding object, or undefined when nothing usable was sent. */
export function sanitizeOnboarding(input: IncomingOnboarding): Onboarding | undefined {
  if (!input || typeof input !== "object") return undefined;
  const o = input as Record<string, unknown>;
  const out: Onboarding = {
    goal: str(o.goal),
    experience: str(o.experience),
    stress: str(o.stress),
    gender: str(o.gender),
    age: num(o.age),
    weightKg: num(o.weightKg),
    useLbs: bool(o.useLbs),
    cardio: str(o.cardio),
    focusMuscles: Array.isArray(o.focusMuscles)
      ? o.focusMuscles.filter((x): x is string => typeof x === "string")
      : undefined,
    sessionDuration: num(o.sessionDuration),
    daysPerWeek: num(o.daysPerWeek),
    split: str(o.split),
    weightedPullup: bool(o.weightedPullup),
    weightedDips: bool(o.weightedDips),
    optimalVolume: num(o.optimalVolume),
  };
  // Drop undefined keys so Mongoose stores only what was provided.
  const cleaned = Object.fromEntries(
    Object.entries(out).filter(([, v]) => v !== undefined),
  ) as Onboarding;
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}
