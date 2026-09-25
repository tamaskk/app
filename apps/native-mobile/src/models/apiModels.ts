// Ported 1:1 from apps/mobile/lib/models/api_models.dart. Classes keep the
// computed getters (totalSets, duration, label, advice) the Dart originals had.
import { t } from "../i18n";

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((e) => String(e)) : [];
}

function parseDate(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/** Minimal exercise shape returned by list/search endpoints. */
export class ExerciseMinimal {
  constructor(public id: number, public name: string) {}
  static fromJson(j: any): ExerciseMinimal {
    return new ExerciseMinimal(j.id as number, j.name as string);
  }
}

/** Detailed exercise shape (ExerciseStandard from the API). */
export class ExerciseDetail {
  constructor(
    public id: number,
    public name: string,
    public primaryMuscles: string[],
    public category: string | null,
    public force: string | null,
    public mechanic: string | null,
    public difficulty: string | null,
    public steps: string[],
  ) {}
  static fromJson(j: any): ExerciseDetail {
    return new ExerciseDetail(
      j.id as number,
      j.name as string,
      stringList(j.primary_muscles),
      (j.category as string) ?? null,
      (j.force as string) ?? null,
      (j.mechanic as string) ?? null,
      (j.difficulty as string) ?? null,
      stringList(j.steps),
    );
  }
}

/** Available filter values for building the picker UI. */
export class ExerciseFilters {
  constructor(
    public muscles: string[],
    public difficulties: string[],
    public categories: string[],
  ) {}
  static fromJson(j: any): ExerciseFilters {
    return new ExerciseFilters(
      stringList(j.muscles),
      stringList(j.difficulties),
      stringList(j.categories),
    );
  }
}

export class SavedSet {
  constructor(
    public kg: number,
    public reps: number,
    public done: boolean = false,
    public distanceM: number | null = null,
    public seconds: number | null = null,
    public targetKg: number | null = null,
  ) {}
  static fromJson(j: any): SavedSet {
    return new SavedSet(
      (j.kg as number) ?? 0,
      (j.reps as number) ?? 0,
      (j.done as boolean) ?? false,
      j.distanceM != null ? (j.distanceM as number) : null,
      j.seconds != null ? (j.seconds as number) : null,
      j.targetKg != null ? (j.targetKg as number) : null,
    );
  }
}

export class SavedExercise {
  constructor(
    public exerciseId: string,
    public name: string,
    public category: string | null = null,
    public gifUrl: string = "",
    public targetMuscles: string[] = [],
    public progressionStrategy: string = "linear",
    public metric: string | null = null,
    public stationKey: string | null = null,
    public note: string | null = null,
    public kcal: number | null = null,
    public sets: SavedSet[] = [],
  ) {}
  static fromJson(j: any): SavedExercise {
    return new SavedExercise(
      j.exerciseId != null ? String(j.exerciseId) : "",
      (j.name as string) ?? "",
      (j.category as string) ?? null,
      (j.gifUrl as string) ?? "",
      stringList(j.targetMuscles),
      (j.progressionStrategy as string) ?? "linear",
      (j.metric as string) ?? null,
      (j.stationKey as string) ?? null,
      (j.note as string) ?? null,
      j.kcal != null ? (j.kcal as number) : null,
      ((j.sets as any[]) ?? []).map(SavedSet.fromJson),
    );
  }
}

/** A training the user saved on the backend (Mongo). */
export class SavedTraining {
  constructor(
    public id: string,
    public name: string,
    public exercises: SavedExercise[],
    public source: string = "manual",
    public doneAt: Date | null = null,
    public weekIndex: number | null = null,
    public dayIndex: number | null = null,
    public discipline: string = "strength",
    public phase: number | null = null,
  ) {}
  static fromJson(j: any): SavedTraining {
    return new SavedTraining(
      j._id != null ? String(j._id) : "",
      (j.name as string) ?? "",
      ((j.exercises as any[]) ?? []).map(SavedExercise.fromJson),
      (j.source as string) ?? "manual",
      parseDate(j.doneAt),
      j.weekIndex != null ? (j.weekIndex as number) : null,
      j.dayIndex != null ? (j.dayIndex as number) : null,
      (j.discipline as string) ?? "strength",
      j.phase != null ? (j.phase as number) : null,
    );
  }
  get totalSets(): number {
    return this.exercises.reduce((a, e) => a + e.sets.length, 0);
  }
  get isGenerated(): boolean {
    return this.source === "generated";
  }
  get isDone(): boolean {
    return this.doneAt != null;
  }
  get isHyrox(): boolean {
    return this.discipline === "hyrox";
  }
}

/** A completed workout: when it ran and exactly what was logged. */
export class WorkoutSession {
  constructor(
    public id: string,
    public trainingId: string | null,
    public name: string,
    public startedAt: Date | null,
    public finishedAt: Date | null,
    public exercises: SavedExercise[],
  ) {}
  static fromJson(j: any): WorkoutSession {
    return new WorkoutSession(
      j._id != null ? String(j._id) : "",
      j.trainingId != null ? String(j.trainingId) : null,
      (j.name as string) ?? "",
      parseDate(j.startedAt),
      parseDate(j.finishedAt),
      ((j.exercises as any[]) ?? []).map(SavedExercise.fromJson),
    );
  }
  get totalSets(): number {
    return this.exercises.reduce((a, e) => a + e.sets.length, 0);
  }
  get doneSets(): number {
    return this.exercises.reduce(
      (a, e) => a + e.sets.filter((s) => s.done).length,
      0,
    );
  }
  /** Duration in milliseconds, or null. */
  get durationMs(): number | null {
    return this.startedAt != null && this.finishedAt != null
      ? this.finishedAt.getTime() - this.startedAt.getTime()
      : null;
  }
  get totalKcal(): number {
    return this.exercises.reduce((a, e) => a + (e.kcal ?? 0), 0);
  }
  get hasKcal(): boolean {
    return this.exercises.some((e) => e.kcal != null);
  }
}

/** A stagnating exercise: its best e1RM hasn't grown for several weeks. */
export class StagnationItem {
  constructor(
    public exerciseId: string,
    public name: string,
    public weeksStagnant: number,
    public e1rm: number,
    public tips: string[] = [],
  ) {}
  static fromJson(j: any): StagnationItem {
    return new StagnationItem(
      j.exerciseId != null ? String(j.exerciseId) : "",
      (j.name as string) ?? "",
      (j.weeksStagnant as number) ?? 0,
      (j.e1rm as number) ?? 0,
      stringList(j.tips),
    );
  }
  get advice(): string {
    const tipText =
      this.tips.length === 0 ? "" : t("stagnation.try", { tips: this.tips.join(" / ") });
    return t("stagnation.advice", { name: this.name, weeks: this.weeksStagnant }) + tipText;
  }
}

/** The auto-progression engine's next-set suggestion for one exercise. */
export class ProgressionSuggestion {
  constructor(
    public suggestedKg: number,
    public suggestedReps: number,
    public reason: string = "",
  ) {}
  static fromJson(j: any): ProgressionSuggestion {
    return new ProgressionSuggestion(
      (j.suggestedKg as number) ?? 0,
      (j.suggestedReps as number) ?? 0,
      (j.reason as string) ?? "",
    );
  }
  /** `82,5 × 8` — Hungarian decimal comma, trailing `.0` trimmed. */
  get label(): string {
    const kg =
      this.suggestedKg === Math.round(this.suggestedKg)
        ? String(Math.trunc(this.suggestedKg))
        : String(this.suggestedKg).replace(".", ",");
    return `${kg} × ${this.suggestedReps}`;
  }
}

/** XP / rank summary returned alongside a saved session. */
export class RankDelta {
  constructor(
    public previousRank: number,
    public newRank: number,
    public xpAwarded: number,
    public unlocked: boolean,
  ) {}
  static fromJson(j: any): RankDelta {
    return new RankDelta(
      (j.previousRank as number) ?? 1,
      (j.newRank as number) ?? 1,
      (j.xpAwarded as number) ?? 0,
      (j.unlocked as boolean) ?? false,
    );
  }
}

export class WorkoutSessionWithRank {
  constructor(
    public session: WorkoutSession,
    public rankDelta: RankDelta | null = null,
  ) {}
}
