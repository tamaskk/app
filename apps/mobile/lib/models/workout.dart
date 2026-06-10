class WorkoutSet {
  double kg;
  int reps;
  bool done;

  WorkoutSet({required this.kg, required this.reps, this.done = false});
}

class Exercise {
  final String name;
  final String variant;
  final List<WorkoutSet> sets;
  // Catalogue metadata, kept so live edits can be persisted back.
  final String exerciseId;
  final String gifUrl;
  final List<String> targetMuscles;
  // Auto-progression strategy: linear | double-progression | rpe-based | none.
  String progressionStrategy;

  Exercise({
    required this.name,
    required this.variant,
    required this.sets,
    this.exerciseId = '',
    this.gifUrl = '',
    this.targetMuscles = const [],
    this.progressionStrategy = 'linear',
  });
}

class Workout {
  final String name;
  final int number;
  final int durationMinutes;
  final List<Exercise> exercises;
  // Backend training id; null for sample/unsaved workouts (not persisted).
  final String? id;

  Workout({
    required this.name,
    required this.number,
    required this.durationMinutes,
    required this.exercises,
    this.id,
  });
}

final sampleWorkouts = [
  Workout(
    name: 'Upper',
    number: 1,
    durationMinutes: 45,
    exercises: [
      Exercise(name: 'Bench Press', variant: 'Barbell', sets: [
        WorkoutSet(kg: 80, reps: 8),
        WorkoutSet(kg: 80, reps: 8),
        WorkoutSet(kg: 80, reps: 8),
      ]),
      Exercise(name: 'Incline Press', variant: 'Dumbbell', sets: [
        WorkoutSet(kg: 32, reps: 10),
        WorkoutSet(kg: 32, reps: 10),
      ]),
    ],
  ),
  Workout(
    name: 'Lower',
    number: 2,
    durationMinutes: 57,
    exercises: [
      Exercise(name: 'Pull-up', variant: 'Weighted', sets: [
        WorkoutSet(kg: 40, reps: 5, done: true),
        WorkoutSet(kg: 40, reps: 5, done: true),
        WorkoutSet(kg: 40, reps: 5),
        WorkoutSet(kg: 0, reps: 12),
      ]),
      Exercise(name: 'Chest Press', variant: 'Machine', sets: [
        WorkoutSet(kg: 60, reps: 10),
        WorkoutSet(kg: 60, reps: 10),
        WorkoutSet(kg: 60, reps: 10),
      ]),
    ],
  ),
  Workout(
    name: 'Upper',
    number: 3,
    durationMinutes: 50,
    exercises: [
      Exercise(name: 'Squat', variant: 'Barbell', sets: [
        WorkoutSet(kg: 100, reps: 5),
        WorkoutSet(kg: 100, reps: 5),
        WorkoutSet(kg: 100, reps: 5),
      ]),
    ],
  ),
];
