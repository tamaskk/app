// Ported 1:1 from apps/mobile/lib/utils/optimal_volume.dart.
import { OnboardingData } from "../models/onboarding";

// A simple heuristic for weekly working sets per muscle, from experience, goal
// and stress. Roughly evidence-based (10–20 sets), not a medical prescription.

export function optimalWeeklyVolume(d: OnboardingData): number {
  let v: number;
  switch (d.experience) {
    case "beginner":
      v = 10;
      break;
    case "advanced":
      v = 14;
      break;
    case "elite":
      v = 16;
      break;
    default:
      v = 12; // intermediate / unset
      break;
  }
  switch (d.goal) {
    case "build_muscle":
      v += 1;
      break;
    case "strength":
      v += -1;
      break;
    case "lose_fat":
      v += -1;
      break;
    default:
      break;
  }
  // High cardio load reduces lifting recovery capacity.
  switch (d.cardio) {
    case "high":
      v += -2;
      break;
    case "moderate":
      v += -1;
      break;
    default:
      break;
  }
  switch (d.stress) {
    case "high":
      v += -2;
      break;
    case "moderate":
      v += -1;
      break;
    default:
      break;
  }
  return Math.min(22, Math.max(8, v));
}

/// Sessions/week that suit the experience level (drives the "optimal" hint).
export function recommendedDaysPerWeek(experience: string | null): number {
  switch (experience) {
    case "beginner":
      return 3;
    case "advanced":
      return 5;
    case "elite":
      return 5;
    default:
      return 4;
  }
}
