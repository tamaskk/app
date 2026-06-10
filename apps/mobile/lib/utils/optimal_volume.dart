import '../models/onboarding_data.dart';

// A simple heuristic for weekly working sets per muscle, from experience, goal
// and stress. Roughly evidence-based (10–20 sets), not a medical prescription.

int optimalWeeklyVolume(OnboardingData d) {
  var v = switch (d.experience) {
    'beginner' => 10,
    'advanced' => 14,
    'elite' => 16,
    _ => 12, // intermediate / unset
  };
  v += switch (d.goal) {
    'build_muscle' => 1,
    'strength' => -1,
    'lose_fat' => -1,
    _ => 0,
  };
  // High cardio load reduces lifting recovery capacity.
  v += switch (d.cardio) {
    'high' => -2,
    'moderate' => -1,
    _ => 0,
  };
  v += switch (d.stress) {
    'high' => -2,
    'moderate' => -1,
    _ => 0,
  };
  return v.clamp(8, 22);
}

/// Sessions/week that suit the experience level (drives the "optimal" hint).
int recommendedDaysPerWeek(String? experience) => switch (experience) {
      'beginner' => 3,
      'advanced' => 5,
      'elite' => 5,
      _ => 4,
    };
