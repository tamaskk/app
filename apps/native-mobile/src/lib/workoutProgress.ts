// Locally-saved, in-progress workout (timer + done sets) so a workout can be
// backed out of and resumed. Ported from services/workout_progress.dart, using
// AsyncStorage under the `workout_progress_<id>` key.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Exercise } from "../models/workout";

export class WorkoutProgress {
  constructor(
    public trainingId: string,
    public elapsedSeconds: number,
    public updatedAt: Date,
    public done: boolean[][],
  ) {}

  get doneCount(): number {
    return this.done.reduce((a, sets) => a + sets.filter((d) => d).length, 0);
  }
  get hasProgress(): boolean {
    return this.doneCount > 0 || this.elapsedSeconds > 0;
  }

  toJson(): Record<string, unknown> {
    return { elapsedSeconds: this.elapsedSeconds, updatedAt: this.updatedAt.getTime(), done: this.done };
  }

  static fromJson(id: string, j: any): WorkoutProgress | null {
    try {
      const rawDone = (j.done as any[]).map((row: any[]) => row.map((d) => d === true));
      return new WorkoutProgress(
        id,
        typeof j.elapsedSeconds === "number" ? Math.trunc(j.elapsedSeconds) : 0,
        new Date(j.updatedAt as number),
        rawDone,
      );
    } catch {
      return null;
    }
  }
}

const PREFIX = "workout_progress_";
const key = (id: string) => `${PREFIX}${id}`;

export const WorkoutProgressStore = {
  async save(trainingId: string, elapsedSeconds: number, exercises: Exercise[]): Promise<void> {
    const done = exercises.map((e) => e.sets.map((s) => s.done));
    const progress = new WorkoutProgress(trainingId, elapsedSeconds, new Date(), done);
    await AsyncStorage.setItem(key(trainingId), JSON.stringify(progress.toJson()));
  },

  async load(trainingId: string): Promise<WorkoutProgress | null> {
    const raw = await AsyncStorage.getItem(key(trainingId));
    if (raw == null) return null;
    try {
      return WorkoutProgress.fromJson(trainingId, JSON.parse(raw));
    } catch {
      return null;
    }
  },

  async clear(trainingId: string): Promise<void> {
    await AsyncStorage.removeItem(key(trainingId));
  },

  async all(): Promise<Record<string, WorkoutProgress>> {
    const out: Record<string, WorkoutProgress> = {};
    const keys = await AsyncStorage.getAllKeys();
    const relevant = keys.filter((k) => k.startsWith(PREFIX));
    const entries = await AsyncStorage.multiGet(relevant);
    for (const [k, raw] of entries) {
      if (raw == null) continue;
      const id = k.substring(PREFIX.length);
      try {
        const p = WorkoutProgress.fromJson(id, JSON.parse(raw));
        if (p != null) out[id] = p;
      } catch {
        // skip malformed
      }
    }
    return out;
  },
};
