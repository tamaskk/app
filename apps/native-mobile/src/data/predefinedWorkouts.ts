// Ported 1:1 from apps/mobile/lib/data/predefined_workouts.dart.
//
// Curated "story" workouts shown at the top of the Edzések screen. Each pairs
// two muscle groups; the exercises themselves are generated live from the
// catalogue (gym-exercise-api) by their `query` target-muscle. Cover photos are
// stable Unsplash CDN URLs (rendered grayscale to fit the monochrome design).
import { t } from "../i18n";

/// One muscle group within a predefined workout. [query] is the ExerciseDB
/// target-muscle used to pull exercises; [label] is the localized display name.
export class MuscleGroup {
  constructor(public label: string, public query: string) {}
}

export class PredefinedWorkout {
  constructor(
    public title: string,
    public imageUrl: string,
    public groups: MuscleGroup[], // exactly two
  ) {}

  /// "Hát · Váll" — the two group labels.
  get subtitle(): string {
    return this.groups.map((g) => g.label).join(" · ");
  }
}

/// Ten predefined workouts, two muscle groups each.
///
/// A function (not a const list) so display strings are resolved through `t()`
/// on every access — the strip rebuilds with the active language when the user
/// switches it. `query` values stay hardcoded: they are ExerciseDB identifiers,
/// not user-facing text.
export function predefinedWorkouts(): PredefinedWorkout[] {
  return [
    new PredefinedWorkout(
      t("predefined.back_shoulders"),
      "https://images.unsplash.com/photo-1532384748853-8f54a8f476e2?w=320&h=320&fit=crop&q=70",
      [
        new MuscleGroup(t("muscle.back"), "lats"),
        new MuscleGroup(t("muscle.shoulders"), "delts"),
      ],
    ),
    new PredefinedWorkout(
      t("predefined.chest_triceps"),
      "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=320&h=320&fit=crop&q=70",
      [
        new MuscleGroup(t("muscle.chest"), "pectorals"),
        new MuscleGroup(t("muscle.triceps"), "triceps"),
      ],
    ),
    new PredefinedWorkout(
      t("predefined.biceps_back"),
      "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=320&h=320&fit=crop&q=70",
      [
        new MuscleGroup(t("muscle.biceps"), "biceps"),
        new MuscleGroup(t("muscle.back"), "upper back"),
      ],
    ),
    new PredefinedWorkout(
      t("predefined.legs_calves"),
      "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=320&h=320&fit=crop&q=70",
      [
        new MuscleGroup(t("muscle.legs"), "quads"),
        new MuscleGroup(t("muscle.calves"), "calves"),
      ],
    ),
    new PredefinedWorkout(
      t("predefined.shoulders_triceps"),
      "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=320&h=320&fit=crop&q=70",
      [
        new MuscleGroup(t("muscle.shoulders"), "delts"),
        new MuscleGroup(t("muscle.triceps"), "triceps"),
      ],
    ),
    new PredefinedWorkout(
      t("predefined.chest_back"),
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=320&h=320&fit=crop&q=70",
      [
        new MuscleGroup(t("muscle.chest"), "pectorals"),
        new MuscleGroup(t("muscle.back"), "lats"),
      ],
    ),
    new PredefinedWorkout(
      t("predefined.glutes_legs"),
      "https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=320&h=320&fit=crop&q=70",
      [
        new MuscleGroup(t("muscle.glutes"), "glutes"),
        new MuscleGroup(t("muscle.hamstrings"), "hamstrings"),
      ],
    ),
    new PredefinedWorkout(
      t("predefined.abs_legs"),
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=320&h=320&fit=crop&q=70",
      [
        new MuscleGroup(t("muscle.abs"), "abs"),
        new MuscleGroup(t("muscle.legs"), "quads"),
      ],
    ),
    new PredefinedWorkout(
      t("predefined.arm_day"),
      "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=320&h=320&fit=crop&q=70",
      [
        new MuscleGroup(t("muscle.biceps"), "biceps"),
        new MuscleGroup(t("muscle.triceps"), "triceps"),
      ],
    ),
    new PredefinedWorkout(
      t("predefined.upper_body"),
      "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=320&h=320&fit=crop&q=70",
      [
        new MuscleGroup(t("muscle.chest"), "pectorals"),
        new MuscleGroup(t("muscle.shoulders"), "delts"),
      ],
    ),
  ];
}
