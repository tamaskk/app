// Curated "story" workouts shown at the top of the Edzések screen. Each pairs
// two muscle groups; the exercises themselves are generated live from the
// catalogue (gym-exercise-api) by their `query` target-muscle. Cover photos are
// stable Unsplash CDN URLs (rendered grayscale to fit the monochrome design).

import '../i18n/app_strings.dart';

/// One muscle group within a predefined workout. [query] is the ExerciseDB
/// target-muscle used to pull exercises; [label] is the localized display name.
class MuscleGroup {
  final String label;
  final String query;
  const MuscleGroup(this.label, this.query);
}

class PredefinedWorkout {
  final String title;
  final String imageUrl;
  final List<MuscleGroup> groups; // exactly two

  const PredefinedWorkout({
    required this.title,
    required this.imageUrl,
    required this.groups,
  });

  /// "Hát · Váll" — the two group labels.
  String get subtitle => groups.map((g) => g.label).join(' · ');
}

/// Ten predefined workouts, two muscle groups each.
///
/// A getter (not a const list) so display strings are resolved through `t()`
/// on every access — the strip rebuilds with the active language when the user
/// switches it. `query` values stay hardcoded: they are ExerciseDB identifiers,
/// not user-facing text.
List<PredefinedWorkout> get predefinedWorkouts => <PredefinedWorkout>[
      PredefinedWorkout(
        title: t('predefined.back_shoulders'),
        imageUrl: 'https://images.unsplash.com/photo-1532384748853-8f54a8f476e2?w=320&h=320&fit=crop&q=70',
        groups: [
          MuscleGroup(t('muscle.back'), 'lats'),
          MuscleGroup(t('muscle.shoulders'), 'delts'),
        ],
      ),
      PredefinedWorkout(
        title: t('predefined.chest_triceps'),
        imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=320&h=320&fit=crop&q=70',
        groups: [
          MuscleGroup(t('muscle.chest'), 'pectorals'),
          MuscleGroup(t('muscle.triceps'), 'triceps'),
        ],
      ),
      PredefinedWorkout(
        title: t('predefined.biceps_back'),
        imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=320&h=320&fit=crop&q=70',
        groups: [
          MuscleGroup(t('muscle.biceps'), 'biceps'),
          MuscleGroup(t('muscle.back'), 'upper back'),
        ],
      ),
      PredefinedWorkout(
        title: t('predefined.legs_calves'),
        imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=320&h=320&fit=crop&q=70',
        groups: [
          MuscleGroup(t('muscle.legs'), 'quads'),
          MuscleGroup(t('muscle.calves'), 'calves'),
        ],
      ),
      PredefinedWorkout(
        title: t('predefined.shoulders_triceps'),
        imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=320&h=320&fit=crop&q=70',
        groups: [
          MuscleGroup(t('muscle.shoulders'), 'delts'),
          MuscleGroup(t('muscle.triceps'), 'triceps'),
        ],
      ),
      PredefinedWorkout(
        title: t('predefined.chest_back'),
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=320&h=320&fit=crop&q=70',
        groups: [
          MuscleGroup(t('muscle.chest'), 'pectorals'),
          MuscleGroup(t('muscle.back'), 'lats'),
        ],
      ),
      PredefinedWorkout(
        title: t('predefined.glutes_legs'),
        imageUrl: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=320&h=320&fit=crop&q=70',
        groups: [
          MuscleGroup(t('muscle.glutes'), 'glutes'),
          MuscleGroup(t('muscle.hamstrings'), 'hamstrings'),
        ],
      ),
      PredefinedWorkout(
        title: t('predefined.abs_legs'),
        imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=320&h=320&fit=crop&q=70',
        groups: [
          MuscleGroup(t('muscle.abs'), 'abs'),
          MuscleGroup(t('muscle.legs'), 'quads'),
        ],
      ),
      PredefinedWorkout(
        title: t('predefined.arm_day'),
        imageUrl: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=320&h=320&fit=crop&q=70',
        groups: [
          MuscleGroup(t('muscle.biceps'), 'biceps'),
          MuscleGroup(t('muscle.triceps'), 'triceps'),
        ],
      ),
      PredefinedWorkout(
        title: t('predefined.upper_body'),
        imageUrl: 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=320&h=320&fit=crop&q=70',
        groups: [
          MuscleGroup(t('muscle.chest'), 'pectorals'),
          MuscleGroup(t('muscle.shoulders'), 'delts'),
        ],
      ),
    ];
