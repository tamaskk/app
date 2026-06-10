// Answers collected by the first-launch onboarding flow. Mutable so the stepper
// can fill it in place; serialised to the backend at registration.

class OnboardingData {
  String? goal; // build_muscle | maintain | strength | lose_fat
  String? experience; // beginner | intermediate | advanced
  String? stress; // low | moderate | high
  String? gender; // male | female | other
  int age;
  double weightKg;
  bool useLbs;
  String? cardio; // none | light | moderate | high
  List<String> focusMuscles; // up to 2
  int sessionDuration; // 45 | 60 | 75
  int daysPerWeek;
  String? split; // full_body | upper_lower | push_pull_legs
  bool weightedPullup;
  bool weightedDips;
  int optimalVolume; // computed sets / muscle / week

  OnboardingData({
    this.goal,
    this.experience,
    this.stress,
    this.gender,
    this.age = 25,
    this.weightKg = 70,
    this.useLbs = false,
    this.cardio,
    List<String>? focusMuscles,
    this.sessionDuration = 60,
    this.daysPerWeek = 4,
    this.split,
    this.weightedPullup = false,
    this.weightedDips = false,
    this.optimalVolume = 0,
  }) : focusMuscles = focusMuscles ?? [];

  Map<String, dynamic> toJson() => {
        'goal': goal,
        'experience': experience,
        'stress': stress,
        'gender': gender,
        'age': age,
        'weightKg': weightKg,
        'useLbs': useLbs,
        'cardio': cardio,
        'focusMuscles': focusMuscles,
        'sessionDuration': sessionDuration,
        'daysPerWeek': daysPerWeek,
        'split': split,
        'weightedPullup': weightedPullup,
        'weightedDips': weightedDips,
        'optimalVolume': optimalVolume,
      };
}
