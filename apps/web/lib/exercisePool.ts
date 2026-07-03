// Curated exercise pool used by the training generator. Each muscle group has
// 4–6 picks ordered from most-fundamental (the compound that should anchor a
// session) to most-isolating (the finisher). Names + target muscles match
// the MuscleWiki vocabulary so the rest of the app treats these like any
// other catalogue exercise.
//
// IMPORTANT: `exerciseId` strings here are stable, hand-rolled IDs that
// don't collide with MuscleWiki numeric ids. The Workout screen uses
// exerciseId as the key for progression/PR tracking, so keep these stable.

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "abs";

export interface PoolExercise {
  exerciseId: string;
  name: string;
  targetMuscles: MuscleGroup[];
  category: string; // "compound" | "isolation"
  defaultSets: number;
  defaultReps: number;
}

/** Hungarian display label per muscle group — used in the session name. */
export const muscleLabelHu: Record<MuscleGroup, string> = {
  chest: "Mell",
  back: "Hát",
  shoulders: "Váll",
  biceps: "Bicepsz",
  triceps: "Tricepsz",
  quads: "Comb",
  hamstrings: "Combhajlító",
  glutes: "Far",
  calves: "Vádli",
  abs: "Has",
};

export const exercisePool: Record<MuscleGroup, PoolExercise[]> = {
  chest: [
    {
      exerciseId: "gen-chest-bench-barbell",
      name: "Barbell Bench Press",
      targetMuscles: ["chest", "triceps", "shoulders"],
      category: "compound",
      defaultSets: 4,
      defaultReps: 6,
    },
    {
      exerciseId: "gen-chest-incline-db",
      name: "Incline Dumbbell Press",
      targetMuscles: ["chest", "shoulders"],
      category: "compound",
      defaultSets: 3,
      defaultReps: 10,
    },
    {
      exerciseId: "gen-chest-dip",
      name: "Dips",
      targetMuscles: ["chest", "triceps"],
      category: "compound",
      defaultSets: 3,
      defaultReps: 10,
    },
    {
      exerciseId: "gen-chest-cable-fly",
      name: "Cable Fly",
      targetMuscles: ["chest"],
      category: "isolation",
      defaultSets: 3,
      defaultReps: 12,
    },
    {
      exerciseId: "gen-chest-pec-deck",
      name: "Pec Deck",
      targetMuscles: ["chest"],
      category: "isolation",
      defaultSets: 3,
      defaultReps: 12,
    },
  ],
  back: [
    {
      exerciseId: "gen-back-deadlift",
      name: "Deadlift",
      targetMuscles: ["back", "hamstrings", "glutes"],
      category: "compound",
      defaultSets: 3,
      defaultReps: 5,
    },
    {
      exerciseId: "gen-back-pullup",
      name: "Pull-up",
      targetMuscles: ["back", "biceps"],
      category: "compound",
      defaultSets: 4,
      defaultReps: 8,
    },
    {
      exerciseId: "gen-back-barbell-row",
      name: "Barbell Row",
      targetMuscles: ["back", "biceps"],
      category: "compound",
      defaultSets: 4,
      defaultReps: 8,
    },
    {
      exerciseId: "gen-back-lat-pulldown",
      name: "Lat Pulldown",
      targetMuscles: ["back", "biceps"],
      category: "compound",
      defaultSets: 3,
      defaultReps: 10,
    },
    {
      exerciseId: "gen-back-seated-row",
      name: "Seated Cable Row",
      targetMuscles: ["back", "biceps"],
      category: "compound",
      defaultSets: 3,
      defaultReps: 10,
    },
    {
      exerciseId: "gen-back-face-pull",
      name: "Face Pull",
      targetMuscles: ["back", "shoulders"],
      category: "isolation",
      defaultSets: 3,
      defaultReps: 15,
    },
  ],
  shoulders: [
    {
      exerciseId: "gen-shoulders-ohp",
      name: "Overhead Press",
      targetMuscles: ["shoulders", "triceps"],
      category: "compound",
      defaultSets: 4,
      defaultReps: 6,
    },
    {
      exerciseId: "gen-shoulders-db-press",
      name: "Seated Dumbbell Press",
      targetMuscles: ["shoulders", "triceps"],
      category: "compound",
      defaultSets: 3,
      defaultReps: 10,
    },
    {
      exerciseId: "gen-shoulders-lateral",
      name: "Lateral Raise",
      targetMuscles: ["shoulders"],
      category: "isolation",
      defaultSets: 4,
      defaultReps: 12,
    },
    {
      exerciseId: "gen-shoulders-rear-fly",
      name: "Rear Delt Fly",
      targetMuscles: ["shoulders"],
      category: "isolation",
      defaultSets: 3,
      defaultReps: 12,
    },
    {
      exerciseId: "gen-shoulders-arnold",
      name: "Arnold Press",
      targetMuscles: ["shoulders"],
      category: "compound",
      defaultSets: 3,
      defaultReps: 10,
    },
  ],
  biceps: [
    {
      exerciseId: "gen-biceps-barbell-curl",
      name: "Barbell Curl",
      targetMuscles: ["biceps"],
      category: "isolation",
      defaultSets: 4,
      defaultReps: 10,
    },
    {
      exerciseId: "gen-biceps-hammer",
      name: "Hammer Curl",
      targetMuscles: ["biceps"],
      category: "isolation",
      defaultSets: 3,
      defaultReps: 12,
    },
    {
      exerciseId: "gen-biceps-incline-db",
      name: "Incline DB Curl",
      targetMuscles: ["biceps"],
      category: "isolation",
      defaultSets: 3,
      defaultReps: 12,
    },
    {
      exerciseId: "gen-biceps-preacher",
      name: "Preacher Curl",
      targetMuscles: ["biceps"],
      category: "isolation",
      defaultSets: 3,
      defaultReps: 12,
    },
  ],
  triceps: [
    {
      exerciseId: "gen-triceps-close-grip-bench",
      name: "Close-Grip Bench Press",
      targetMuscles: ["triceps", "chest"],
      category: "compound",
      defaultSets: 3,
      defaultReps: 8,
    },
    {
      exerciseId: "gen-triceps-pushdown",
      name: "Tricep Pushdown",
      targetMuscles: ["triceps"],
      category: "isolation",
      defaultSets: 4,
      defaultReps: 12,
    },
    {
      exerciseId: "gen-triceps-overhead",
      name: "Overhead Tricep Extension",
      targetMuscles: ["triceps"],
      category: "isolation",
      defaultSets: 3,
      defaultReps: 12,
    },
    {
      exerciseId: "gen-triceps-skullcrusher",
      name: "Skullcrusher",
      targetMuscles: ["triceps"],
      category: "isolation",
      defaultSets: 3,
      defaultReps: 10,
    },
  ],
  quads: [
    {
      exerciseId: "gen-quads-backsquat",
      name: "Back Squat",
      targetMuscles: ["quads", "glutes"],
      category: "compound",
      defaultSets: 4,
      defaultReps: 6,
    },
    {
      exerciseId: "gen-quads-front-squat",
      name: "Front Squat",
      targetMuscles: ["quads"],
      category: "compound",
      defaultSets: 3,
      defaultReps: 8,
    },
    {
      exerciseId: "gen-quads-leg-press",
      name: "Leg Press",
      targetMuscles: ["quads", "glutes"],
      category: "compound",
      defaultSets: 3,
      defaultReps: 10,
    },
    {
      exerciseId: "gen-quads-lunge",
      name: "Walking Lunge",
      targetMuscles: ["quads", "glutes"],
      category: "compound",
      defaultSets: 3,
      defaultReps: 12,
    },
    {
      exerciseId: "gen-quads-extension",
      name: "Leg Extension",
      targetMuscles: ["quads"],
      category: "isolation",
      defaultSets: 3,
      defaultReps: 12,
    },
  ],
  hamstrings: [
    {
      exerciseId: "gen-ham-rdl",
      name: "Romanian Deadlift",
      targetMuscles: ["hamstrings", "glutes"],
      category: "compound",
      defaultSets: 4,
      defaultReps: 8,
    },
    {
      exerciseId: "gen-ham-leg-curl",
      name: "Lying Leg Curl",
      targetMuscles: ["hamstrings"],
      category: "isolation",
      defaultSets: 3,
      defaultReps: 12,
    },
    {
      exerciseId: "gen-ham-good-morning",
      name: "Good Morning",
      targetMuscles: ["hamstrings", "glutes"],
      category: "compound",
      defaultSets: 3,
      defaultReps: 10,
    },
    {
      exerciseId: "gen-ham-seated-curl",
      name: "Seated Leg Curl",
      targetMuscles: ["hamstrings"],
      category: "isolation",
      defaultSets: 3,
      defaultReps: 12,
    },
  ],
  glutes: [
    {
      exerciseId: "gen-glutes-hip-thrust",
      name: "Hip Thrust",
      targetMuscles: ["glutes", "hamstrings"],
      category: "compound",
      defaultSets: 4,
      defaultReps: 10,
    },
    {
      exerciseId: "gen-glutes-bulgarian",
      name: "Bulgarian Split Squat",
      targetMuscles: ["glutes", "quads"],
      category: "compound",
      defaultSets: 3,
      defaultReps: 10,
    },
    {
      exerciseId: "gen-glutes-cable-kickback",
      name: "Cable Kickback",
      targetMuscles: ["glutes"],
      category: "isolation",
      defaultSets: 3,
      defaultReps: 12,
    },
    {
      exerciseId: "gen-glutes-abduction",
      name: "Glute Abduction",
      targetMuscles: ["glutes"],
      category: "isolation",
      defaultSets: 3,
      defaultReps: 15,
    },
  ],
  calves: [
    {
      exerciseId: "gen-calves-standing-raise",
      name: "Standing Calf Raise",
      targetMuscles: ["calves"],
      category: "isolation",
      defaultSets: 4,
      defaultReps: 12,
    },
    {
      exerciseId: "gen-calves-seated-raise",
      name: "Seated Calf Raise",
      targetMuscles: ["calves"],
      category: "isolation",
      defaultSets: 4,
      defaultReps: 15,
    },
    {
      exerciseId: "gen-calves-leg-press",
      name: "Leg Press Calf Raise",
      targetMuscles: ["calves"],
      category: "isolation",
      defaultSets: 3,
      defaultReps: 15,
    },
  ],
  abs: [
    {
      exerciseId: "gen-abs-hanging-knee",
      name: "Hanging Knee Raise",
      targetMuscles: ["abs"],
      category: "isolation",
      defaultSets: 3,
      defaultReps: 12,
    },
    {
      exerciseId: "gen-abs-plank",
      name: "Plank",
      targetMuscles: ["abs"],
      category: "isolation",
      defaultSets: 3,
      defaultReps: 60,
    },
    {
      exerciseId: "gen-abs-cable-crunch",
      name: "Cable Crunch",
      targetMuscles: ["abs"],
      category: "isolation",
      defaultSets: 3,
      defaultReps: 15,
    },
    {
      exerciseId: "gen-abs-rollout",
      name: "Ab Wheel Rollout",
      targetMuscles: ["abs"],
      category: "isolation",
      defaultSets: 3,
      defaultReps: 10,
    },
  ],
};

export const ALL_MUSCLES: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
];
