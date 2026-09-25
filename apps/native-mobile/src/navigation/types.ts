// Root navigation param list. Screens are added as they are ported 1:1.
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Workout } from "../models/workout";
import type { WorkoutSession, RankDelta } from "../models/apiModels";

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Forgot: undefined;
  Reset: { initialToken?: string } | undefined;
  Onboarding: undefined;
  Main: undefined;
  // Pushed detail/modal routes (ported incrementally).
  Workout:
    | {
        trainingId?: string | null;
        name?: string;
        workout?: Workout;
        resumeElapsedSeconds?: number;
        resumeSessionId?: string | null;
      }
    | undefined;
  WorkoutSummary:
    | { sessionId?: string; session?: WorkoutSession; rankDelta?: RankDelta | null }
    | undefined;
  CreateTraining: { trainingId?: string | null } | undefined;
  Paywall: undefined;
  Account: undefined;
  Ranks: undefined;
  Leaderboard: undefined;
  TrainingGenerator: undefined;
  PredefinedWorkout: { key?: string } | undefined;
  DemoWorkout: undefined;
  LogRun: undefined;
  WeeklyPlanEdit: undefined;
};

export type RootNav = NativeStackNavigationProp<RootStackParamList>;

/** Props every top-tab screen receives from the MainShell. */
export interface TabScreenProps {
  navigation: RootNav;
  onNavigateTab: (index: number) => void;
}
