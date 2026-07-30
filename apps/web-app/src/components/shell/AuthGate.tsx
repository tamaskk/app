"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Splash } from "./Splash";
import { WelcomeScreen } from "@/components/auth/WelcomeScreen";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { RegisterScreen } from "@/components/auth/RegisterScreen";
import { OnboardingScreen } from "@/components/auth/OnboardingScreen";

type View = "welcome" | "login" | "register";

// main.dart AuthGate: splash → (welcome/login/register) → onboarding → app.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, saveOnboarding } = useAuth();
  const { t } = useI18n();
  const [view, setView] = useState<View>("welcome");
  const [savingOnb, setSavingOnb] = useState(false);
  const [onbError, setOnbError] = useState<string | null>(null);

  if (loading) return <Splash />;

  if (!user) {
    if (view === "login")
      return <LoginScreen onRegisterInstead={() => setView("register")} />;
    if (view === "register")
      return (
        <RegisterScreen
          onBack={() => setView("welcome")}
          onLoginInstead={() => setView("login")}
        />
      );
    return (
      <WelcomeScreen
        onRegister={() => setView("register")}
        onSignIn={() => setView("login")}
      />
    );
  }

  if (user.onboarding == null) {
    return (
      <>
        <OnboardingScreen
          saving={savingOnb}
          onComplete={async (data) => {
            setSavingOnb(true);
            setOnbError(null);
            try {
              await saveOnboarding(data);
            } catch {
              setOnbError(t("onboarding.save_failed"));
              setSavingOnb(false);
            }
          }}
        />
        {onbError && (
          <div className="fixed inset-x-0 bottom-4 mx-auto w-fit rounded-lg bg-surface-high px-4 py-2 text-sm text-on-surface">
            {onbError}
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}
