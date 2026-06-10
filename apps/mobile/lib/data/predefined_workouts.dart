// Curated "story" workouts shown at the top of the Edzések screen. Each pairs
// two muscle groups; the exercises themselves are generated live from the
// catalogue (gym-exercise-api) by their `query` target-muscle. Cover photos are
// stable Unsplash CDN URLs (rendered grayscale to fit the monochrome design).

/// One muscle group within a predefined workout. [query] is the ExerciseDB
/// target-muscle used to pull exercises; [label] is the Hungarian display name.
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
const predefinedWorkouts = <PredefinedWorkout>[
  PredefinedWorkout(
    title: 'Hát + Váll',
    imageUrl: 'https://images.unsplash.com/photo-1532384748853-8f54a8f476e2?w=320&h=320&fit=crop&q=70',
    groups: [MuscleGroup('Hát', 'lats'), MuscleGroup('Váll', 'delts')],
  ),
  PredefinedWorkout(
    title: 'Mell + Tricepsz',
    imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=320&h=320&fit=crop&q=70',
    groups: [MuscleGroup('Mell', 'pectorals'), MuscleGroup('Tricepsz', 'triceps')],
  ),
  PredefinedWorkout(
    title: 'Bicepsz + Hát',
    imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=320&h=320&fit=crop&q=70',
    groups: [MuscleGroup('Bicepsz', 'biceps'), MuscleGroup('Hát', 'upper back')],
  ),
  PredefinedWorkout(
    title: 'Láb + Vádli',
    imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=320&h=320&fit=crop&q=70',
    groups: [MuscleGroup('Comb', 'quads'), MuscleGroup('Vádli', 'calves')],
  ),
  PredefinedWorkout(
    title: 'Váll + Tricepsz',
    imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=320&h=320&fit=crop&q=70',
    groups: [MuscleGroup('Váll', 'delts'), MuscleGroup('Tricepsz', 'triceps')],
  ),
  PredefinedWorkout(
    title: 'Mell + Hát',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=320&h=320&fit=crop&q=70',
    groups: [MuscleGroup('Mell', 'pectorals'), MuscleGroup('Hát', 'lats')],
  ),
  PredefinedWorkout(
    title: 'Glutesz + Comb',
    imageUrl: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=320&h=320&fit=crop&q=70',
    groups: [MuscleGroup('Glutesz', 'glutes'), MuscleGroup('Hamstring', 'hamstrings')],
  ),
  PredefinedWorkout(
    title: 'Has + Comb',
    imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=320&h=320&fit=crop&q=70',
    groups: [MuscleGroup('Has', 'abs'), MuscleGroup('Comb', 'quads')],
  ),
  PredefinedWorkout(
    title: 'Kar nap',
    imageUrl: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=320&h=320&fit=crop&q=70',
    groups: [MuscleGroup('Bicepsz', 'biceps'), MuscleGroup('Tricepsz', 'triceps')],
  ),
  PredefinedWorkout(
    title: 'Felsőtest',
    imageUrl: 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=320&h=320&fit=crop&q=70',
    groups: [MuscleGroup('Mell', 'pectorals'), MuscleGroup('Váll', 'delts')],
  ),
];
