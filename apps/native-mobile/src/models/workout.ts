// Ported 1:1 from apps/mobile/lib/models/workout.dart. Mutable classes — the
// workout player edits kg/reps/done in place.
export class WorkoutSet {
  constructor(
    public kg: number,
    public reps: number,
    public done: boolean = false,
    public distanceM: number | null = null,
    public seconds: number | null = null,
    public targetKg: number | null = null,
  ) {}
}

export class Exercise {
  public progressionStrategy: string;
  public kcal: number | null;
  constructor(
    public name: string,
    public variant: string,
    public sets: WorkoutSet[],
    public exerciseId: string = "",
    public gifUrl: string = "",
    public targetMuscles: string[] = [],
    progressionStrategy: string = "linear",
    public metric: string | null = null,
    public stationKey: string | null = null,
    public note: string | null = null,
    kcal: number | null = null,
  ) {
    this.progressionStrategy = progressionStrategy;
    this.kcal = kcal;
  }
  /** True when this is a HYROX station (not classic kg×reps strength). */
  get isHyroxStation(): boolean {
    return this.metric != null && this.metric !== "reps";
  }
}

export class Workout {
  constructor(
    public name: string,
    public number: number,
    public durationMinutes: number,
    public exercises: Exercise[],
    public id: string | null = null,
  ) {}
}

export const sampleWorkouts: Workout[] = [
  new Workout("Upper", 1, 45, [
    new Exercise("Bench Press", "Barbell", [new WorkoutSet(80, 8), new WorkoutSet(80, 8), new WorkoutSet(80, 8)]),
    new Exercise("Incline Press", "Dumbbell", [new WorkoutSet(32, 10), new WorkoutSet(32, 10)]),
  ]),
  new Workout("Lower", 2, 57, [
    new Exercise("Pull-up", "Weighted", [
      new WorkoutSet(40, 5, true),
      new WorkoutSet(40, 5, true),
      new WorkoutSet(40, 5),
      new WorkoutSet(0, 12),
    ]),
    new Exercise("Chest Press", "Machine", [new WorkoutSet(60, 10), new WorkoutSet(60, 10), new WorkoutSet(60, 10)]),
  ]),
  new Workout("Upper", 3, 50, [
    new Exercise("Squat", "Barbell", [new WorkoutSet(100, 5), new WorkoutSet(100, 5), new WorkoutSet(100, 5)]),
  ]),
];
