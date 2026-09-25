// Auth gate + root stack. Mirrors main.dart AuthGate: splash while the session
// restores, then the pre-auth flow (welcome/login/register/forgot/reset), the
// onboarding gate, or the authenticated shell.
import React, { useEffect, useState } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppColors } from "../theme";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "./types";
import { SplashScreen } from "../screens/SplashScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { ResetPasswordScreen } from "../screens/ResetPasswordScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { MainShell } from "./MainShell";
import { Placeholder } from "../screens/Placeholder";
import { AccountScreen } from "../screens/AccountScreen";
import { CreateTrainingScreen } from "../screens/CreateTrainingScreen";
import { WorkoutScreen } from "../screens/WorkoutScreen";
import { WorkoutSummaryScreen } from "../screens/WorkoutSummaryScreen";
import { PaywallScreen } from "../screens/PaywallScreen";
import { LeaderboardScreen } from "../screens/LeaderboardScreen";
import { TrainingGeneratorScreen } from "../screens/TrainingGeneratorScreen";
import { PredefinedWorkoutScreen } from "../screens/PredefinedWorkoutScreen";
import { DemoWorkoutScreen } from "../screens/DemoWorkoutScreen";
import { LogRunScreen } from "../screens/LogRunScreen";
import { WeeklyPlanEditScreen } from "../screens/WeeklyPlanEditScreen";
import { predefinedWorkouts } from "../data/predefinedWorkouts";
import { WorkoutSession } from "../models/apiModels";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: AppColors.background, card: AppColors.background, text: AppColors.onSurface, border: AppColors.outline, primary: AppColors.onSurface },
};

export function RootNavigator() {
  const { auth, user, setUser, logout } = useAuth();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const restored = await auth.restoreSession();
      if (alive) {
        setUser(restored);
        setBooting(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [auth, setUser]);

  const needsOnboarding = user != null && user.onboarding == null;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: AppColors.background } }}>
        {booting ? (
          <Stack.Screen name="Splash" component={SplashScreen} />
        ) : user == null ? (
          <Stack.Group>
            <Stack.Screen name="Welcome">
              {({ navigation }) => (
                <WelcomeScreen
                  onRegister={() => navigation.navigate("Register")}
                  onSignIn={() => navigation.navigate("Login")}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Login">
              {({ navigation }) => (
                <LoginScreen
                  auth={auth}
                  onAuthenticated={setUser}
                  onRegisterInstead={() => navigation.navigate("Register")}
                  onForgot={() => navigation.navigate("Forgot")}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Register">
              {({ navigation }) => (
                <RegisterScreen
                  auth={auth}
                  onAuthenticated={setUser}
                  onBack={() => navigation.goBack()}
                  onLoginInstead={() => navigation.navigate("Login")}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Forgot">
              {({ navigation }) => (
                <ForgotPasswordScreen
                  auth={auth}
                  onBack={() => navigation.goBack()}
                  onHaveCode={() => navigation.navigate("Reset")}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Reset">
              {({ navigation, route }) => (
                <ResetPasswordScreen
                  auth={auth}
                  onAuthenticated={setUser}
                  onBack={() => navigation.goBack()}
                  onDone={() => navigation.popToTop()}
                  initialToken={route.params?.initialToken}
                />
              )}
            </Stack.Screen>
          </Stack.Group>
        ) : needsOnboarding ? (
          <Stack.Screen name="Onboarding">
            {() => <OnboardingScreen onComplete={() => {}} />}
          </Stack.Screen>
        ) : (
          <Stack.Group>
            <Stack.Screen name="Main" component={MainShell} />
            <Stack.Screen name="Account">
              {({ navigation }) => <AccountScreen navigation={navigation} onLogout={logout} />}
            </Stack.Screen>
            <Stack.Screen name="CreateTraining">
              {({ navigation, route }) => <CreateTrainingScreen navigation={navigation} route={route} />}
            </Stack.Screen>
            <Stack.Screen name="Workout" component={WorkoutScreen} />
            <Stack.Screen name="WorkoutSummary">
              {({ navigation, route }) => (
                <WorkoutSummaryScreen
                  navigation={navigation}
                  session={(route.params?.session as WorkoutSession) ?? new WorkoutSession("", null, "", null, null, [])}
                  rankDelta={route.params?.rankDelta ?? null}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Paywall">
              {({ navigation }) => (
                <PaywallScreen navigation={navigation} onPurchased={() => setUser(auth.user)} />
              )}
            </Stack.Screen>
            <Stack.Screen name="Ranks">{() => <Placeholder title="Rangok" />}</Stack.Screen>
            <Stack.Screen name="Leaderboard">
              {({ navigation }) => <LeaderboardScreen navigation={navigation} />}
            </Stack.Screen>
            <Stack.Screen name="TrainingGenerator">
              {({ navigation }) => <TrainingGeneratorScreen navigation={navigation} />}
            </Stack.Screen>
            <Stack.Screen name="PredefinedWorkout">
              {({ navigation, route }) => {
                const key = route.params?.key;
                const workout =
                  predefinedWorkouts().find((w) => w.title === key) ?? predefinedWorkouts()[0];
                return <PredefinedWorkoutScreen navigation={navigation} workout={workout} />;
              }}
            </Stack.Screen>
            <Stack.Screen name="DemoWorkout">
              {({ navigation }) => (
                <DemoWorkoutScreen
                  navigation={navigation}
                  onSaveProgress={() => navigation.goBack()}
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="LogRun">
              {({ navigation }) => <LogRunScreen navigation={navigation} />}
            </Stack.Screen>
            <Stack.Screen name="WeeklyPlanEdit">
              {({ navigation }) => (
                <WeeklyPlanEditScreen navigation={navigation} defaultPlan={user?.weeklyPlan ?? []} />
              )}
            </Stack.Screen>
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
