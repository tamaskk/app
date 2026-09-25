// Answers collected by the first-launch onboarding flow. Ported from
// apps/mobile/lib/models/onboarding_data.dart. Mutable so the stepper can fill
// it in place; serialised to the backend at registration.
export class OnboardingData {
  goal: string | null = null; // build_muscle | maintain | strength | lose_fat
  experience: string | null = null; // beginner | intermediate | advanced
  stress: string | null = null; // low | moderate | high
  gender: string | null = null; // male | female | other
  age = 25;
  weightKg = 70;
  useLbs = false;
  cardio: string | null = null; // none | light | moderate | high
  focusMuscles: string[] = []; // up to 2
  sessionDuration = 60; // 45 | 60 | 75
  daysPerWeek = 4;
  split: string | null = null; // full_body | upper_lower | push_pull_legs
  weightedPullup = false;
  weightedDips = false;
  optimalVolume = 0; // computed sets / muscle / week

  toJson(): Record<string, unknown> {
    return {
      goal: this.goal,
      experience: this.experience,
      stress: this.stress,
      gender: this.gender,
      age: this.age,
      weightKg: this.weightKg,
      useLbs: this.useLbs,
      cardio: this.cardio,
      focusMuscles: this.focusMuscles,
      sessionDuration: this.sessionDuration,
      daysPerWeek: this.daysPerWeek,
      split: this.split,
      weightedPullup: this.weightedPullup,
      weightedDips: this.weightedDips,
      optimalVolume: this.optimalVolume,
    };
  }
}
