// Ported 1:1 from apps/mobile/lib/screens/onboarding_screen.dart.
//
// Post-registration onboarding: 6 question steps that build a personalised
// plan for an already-authenticated user (goal, experience, body basics,
// schedule, split, volume reveal). Builds an OnboardingData and calls
// onComplete. The persistence (saveOnboarding + setUser) is kept inline so the
// existing RootNavigator caller — which passes a no-op onComplete — still
// advances past the onboarding gate.
import React, { useReducer, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Screen } from "../components/ui";
import { WeekPreview } from "../components/WeekPreview";
import { AppColors } from "../theme";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../hooks/useLang";
import { AuthException } from "../lib/authService";
import { OnboardingData } from "../models/onboarding";
import { optimalWeeklyVolume, recommendedDaysPerWeek } from "../utils/optimalVolume";
import type { RootNav } from "../navigation/types";

function _clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function OnboardingScreen({
  onComplete,
  navigation,
}: {
  onComplete?: (data?: OnboardingData) => void;
  navigation?: RootNav;
}) {
  const { auth, setUser } = useAuth();
  const { t } = useLang();

  const dataRef = useRef<OnboardingData>(new OnboardingData());
  const data = dataRef.current;
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const set = (mutator: (d: OnboardingData) => void) => {
    mutator(data);
    forceUpdate();
  };

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Question steps only — the welcome step lives outside this screen now.
  // Reordering here changes the order on screen.
  const steps: Array<() => React.ReactNode> = [
    goalStep,
    experienceStep,
    bodyBasicsStep,
    scheduleStep,
    splitStep,
    volumeRevealStep,
  ];

  async function complete() {
    if (data.optimalVolume === 0) {
      data.optimalVolume = optimalWeeklyVolume(data);
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await auth.saveOnboarding(data.toJson());
      setUser(updated);
      onComplete?.(data);
    } catch (e) {
      if (e instanceof AuthException) {
        setError(e.message);
      } else {
        setError(t("onboarding.save_failed"));
      }
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (step >= steps.length - 1) {
      void complete();
      return;
    }
    setStep((s) => s + 1);
  }

  function back() {
    if (step === 0) return;
    setStep((s) => s - 1);
  }

  // Used after a single-select tap to give a moment of confirmation feedback
  // before sliding forward.
  function autoAdvance() {
    setTimeout(() => {
      next();
    }, 320);
  }

  // --- shell ---------------------------------------------------------------

  function scaffold(opts: {
    title: string;
    subtitle?: string;
    body: React.ReactNode;
    canContinue: boolean;
    continueLabel?: string;
    centerBody?: boolean;
    showContinueButton?: boolean;
    loading?: boolean;
  }) {
    const {
      title,
      subtitle,
      body,
      canContinue,
      continueLabel,
      centerBody = false,
      showContinueButton = true,
      loading = false,
    } = opts;
    return (
      <View style={{ flex: 1, alignItems: "stretch" }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
          {progressBar(step / (steps.length - 1))}
        </View>
        <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
          <Text
            style={{
              fontSize: 34,
              fontWeight: "800",
              letterSpacing: -1,
              color: AppColors.onSurface,
            }}
          >
            {title}
          </Text>
          {subtitle != null && (
            <>
              <View style={{ height: 10 }} />
              <Text style={{ fontSize: 18, lineHeight: 18 * 1.3, color: AppColors.muted }}>
                {subtitle}
              </Text>
            </>
          )}
        </View>
        {centerBody ? (
          <View
            style={{
              flex: 1,
              paddingHorizontal: 24,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {body}
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            {body}
          </ScrollView>
        )}
        {showContinueButton && (
          <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!canContinue || loading}
              onPress={canContinue ? next : undefined}
              style={{
                width: "100%",
                backgroundColor: canContinue ? AppColors.primary : AppColors.surfaceHigh,
                paddingVertical: 18,
                borderRadius: 100,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={AppColors.background} />
              ) : (
                <Text
                  style={{
                    fontWeight: "700",
                    fontSize: 16,
                    color: canContinue ? AppColors.background : AppColors.muted,
                  }}
                >
                  {continueLabel ?? t("common.next")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  function progressBar(p: number) {
    const pct = `${_clamp(p, 0, 1) * 100}%` as const;
    return (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={back}
          style={{
            width: 40,
            height: 40,
            backgroundColor: AppColors.surfaceLow,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons
            name="chevron-left"
            size={26}
            color={step === 0 ? AppColors.surfaceHigh : AppColors.onSurface}
          />
        </TouchableOpacity>
        <View style={{ width: 16 }} />
        <View
          style={{
            flex: 1,
            height: 6,
            borderRadius: 100,
            backgroundColor: AppColors.surfaceHigh,
            overflow: "hidden",
          }}
        >
          <View style={{ width: pct, height: 6, backgroundColor: AppColors.primary }} />
        </View>
        <View style={{ width: 8 }} />
      </View>
    );
  }

  function optionCard(opts: {
    title: string;
    subtitle?: string;
    badge?: string;
    selected: boolean;
    onPress: () => void;
  }) {
    const { title, subtitle, badge, selected, onPress } = opts;
    const fg = selected ? AppColors.background : AppColors.onSurface;
    const sub = selected ? "#4A4A4A" : AppColors.muted;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={{
          marginBottom: 14,
          padding: 20,
          backgroundColor: selected ? AppColors.primary : AppColors.surfaceLow,
          borderRadius: 20,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ flex: 1, fontSize: 20, fontWeight: "800", color: fg }}>{title}</Text>
          {badge != null && monochromeBadge(badge, selected)}
        </View>
        {subtitle != null && (
          <>
            <View style={{ height: 6 }} />
            <Text style={{ fontSize: 15, color: sub }}>{subtitle}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  // Monochrome badge — replaces the prior green accent to stay on-brand.
  function monochromeBadge(text: string, selected: boolean) {
    const color = selected ? AppColors.background : AppColors.onSurface;
    return (
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderWidth: 1,
          borderColor: color,
          borderRadius: 4,
        }}
      >
        <Text style={{ color, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 }}>{text}</Text>
      </View>
    );
  }

  // --- steps ---------------------------------------------------------------

  function goalStep() {
    return scaffold({
      title: t("onboarding.goal_title"),
      subtitle: t("onboarding.goal_subtitle"),
      canContinue: data.goal != null,
      showContinueButton: false,
      body: (
        <View>
          {optionCard({
            title: t("onboarding.goal_lose_fat"),
            subtitle: t("onboarding.goal_lose_fat_sub"),
            selected: data.goal === "lose_fat",
            onPress: () => {
              set((d) => (d.goal = "lose_fat"));
              autoAdvance();
            },
          })}
          {optionCard({
            title: t("onboarding.goal_build_muscle"),
            subtitle: t("onboarding.goal_build_muscle_sub"),
            selected: data.goal === "build_muscle",
            onPress: () => {
              set((d) => (d.goal = "build_muscle"));
              autoAdvance();
            },
          })}
          {optionCard({
            title: t("onboarding.goal_strength"),
            subtitle: t("onboarding.goal_strength_sub"),
            selected: data.goal === "strength",
            onPress: () => {
              set((d) => (d.goal = "strength"));
              autoAdvance();
            },
          })}
          {optionCard({
            title: t("onboarding.goal_maintain"),
            subtitle: t("onboarding.goal_maintain_sub"),
            selected: data.goal === "maintain",
            onPress: () => {
              set((d) => (d.goal = "maintain"));
              autoAdvance();
            },
          })}
        </View>
      ),
    });
  }

  function experienceStep() {
    return scaffold({
      title: t("onboarding.exp_title"),
      subtitle: t("onboarding.exp_subtitle"),
      canContinue: data.experience != null,
      showContinueButton: false,
      body: (
        <View>
          {optionCard({
            title: t("onboarding.exp_beginner"),
            subtitle: t("onboarding.exp_beginner_sub"),
            selected: data.experience === "beginner",
            onPress: () => {
              set((d) => (d.experience = "beginner"));
              autoAdvance();
            },
          })}
          {optionCard({
            title: t("onboarding.exp_intermediate"),
            subtitle: t("onboarding.exp_intermediate_sub"),
            selected: data.experience === "intermediate",
            onPress: () => {
              set((d) => (d.experience = "intermediate"));
              autoAdvance();
            },
          })}
          {optionCard({
            title: t("onboarding.exp_advanced"),
            subtitle: t("onboarding.exp_advanced_sub"),
            selected: data.experience === "advanced",
            onPress: () => {
              set((d) => (d.experience = "advanced"));
              autoAdvance();
            },
          })}
          {optionCard({
            title: t("onboarding.exp_elite"),
            subtitle: t("onboarding.exp_elite_sub"),
            selected: data.experience === "elite",
            onPress: () => {
              set((d) => (d.experience = "elite"));
              autoAdvance();
            },
          })}
        </View>
      ),
    });
  }

  // Combined demographics: gender + age + weight + cardio on one screen.
  function bodyBasicsStep() {
    const canContinue = data.gender != null && data.cardio != null;
    const display = data.useLbs
      ? Math.round(data.weightKg * 2.20462)
      : Math.round(data.weightKg);
    return scaffold({
      title: t("onboarding.body_title"),
      subtitle: t("onboarding.body_subtitle"),
      canContinue,
      body: (
        <View style={{ alignItems: "stretch" }}>
          <SectionLabel text={t("onboarding.gender")} />
          <View style={{ height: 10 }} />
          {chipRow([
            { label: t("onboarding.gender_male"), selected: data.gender === "male", onPress: () => set((d) => (d.gender = "male")) },
            { label: t("onboarding.gender_female"), selected: data.gender === "female", onPress: () => set((d) => (d.gender = "female")) },
            { label: t("onboarding.gender_other"), selected: data.gender === "other", onPress: () => set((d) => (d.gender = "other")) },
          ])}
          <View style={{ height: 28 }} />
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            <SectionLabel text={t("onboarding.age")} />
            <View style={{ flex: 1 }} />
            <Text style={{ fontSize: 28, fontWeight: "800", color: AppColors.onSurface }}>
              {`${data.age}`}
            </Text>
            <View style={{ width: 4 }} />
            <Text style={{ fontSize: 14, color: AppColors.muted }}>
              {t("onboarding.years_unit")}
            </Text>
          </View>
          {stepperRow({
            onDecrement: () => set((d) => (d.age = _clamp(d.age - 1, 16, 80))),
            onIncrement: () => set((d) => (d.age = _clamp(d.age + 1, 16, 80))),
          })}
          <View style={{ height: 24 }} />
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            <SectionLabel text={t("onboarding.weight")} />
            <View style={{ flex: 1 }} />
            <Text style={{ fontSize: 28, fontWeight: "800", color: AppColors.onSurface }}>
              {`${display}`}
            </Text>
            <View style={{ width: 4 }} />
            <TouchableOpacity onPress={() => set((d) => (d.useLbs = !d.useLbs))}>
              <Text
                style={{
                  fontSize: 14,
                  color: AppColors.onSurface,
                  fontWeight: "700",
                  textDecorationLine: "underline",
                  textDecorationColor: AppColors.muted,
                }}
              >
                {data.useLbs ? "lbs" : "kg"}
              </Text>
            </TouchableOpacity>
          </View>
          {stepperRow({
            onDecrement: () => set((d) => (d.weightKg = _clamp(d.weightKg - 1, 35, 220))),
            onIncrement: () => set((d) => (d.weightKg = _clamp(d.weightKg + 1, 35, 220))),
          })}
          <View style={{ height: 28 }} />
          <SectionLabel text={t("onboarding.cardio")} />
          <View style={{ height: 10 }} />
          {chipRow([
            { label: t("onboarding.cardio_none"), selected: data.cardio === "none", onPress: () => set((d) => (d.cardio = "none")) },
            { label: t("onboarding.cardio_light"), selected: data.cardio === "light", onPress: () => set((d) => (d.cardio = "light")) },
            { label: t("onboarding.cardio_moderate"), selected: data.cardio === "moderate", onPress: () => set((d) => (d.cardio = "moderate")) },
            { label: t("onboarding.cardio_high"), selected: data.cardio === "high", onPress: () => set((d) => (d.cardio = "high")) },
          ])}
          <View style={{ height: 12 }} />
        </View>
      ),
    });
  }

  function scheduleStep() {
    const optimal = recommendedDaysPerWeek(data.experience);
    return scaffold({
      title: t("onboarding.schedule_title"),
      subtitle: t("onboarding.schedule_subtitle"),
      canContinue: true,
      body: (
        <View style={{ alignItems: "stretch" }}>
          <SectionLabel text={t("onboarding.days_per_week")} />
          <View style={{ height: 16 }} />
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
            <RoundButton
              icon="remove"
              onPress={() => {
                if (data.daysPerWeek > 1) set((d) => d.daysPerWeek--);
              }}
            />
            <View style={{ paddingHorizontal: 28 }}>
              <Text
                style={{
                  fontSize: 72,
                  fontWeight: "800",
                  lineHeight: 72,
                  color: AppColors.onSurface,
                }}
              >
                {`${data.daysPerWeek}`}
              </Text>
            </View>
            <RoundButton
              icon="add"
              onPress={() => {
                if (data.daysPerWeek < 6) set((d) => d.daysPerWeek++);
              }}
            />
          </View>
          <View style={{ height: 12 }} />
          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "800",
                letterSpacing: 1.6,
                color: AppColors.onSurface,
              }}
            >
              {data.daysPerWeek === optimal
                ? t("onboarding.days_optimal")
                : data.daysPerWeek > 5
                  ? t("onboarding.days_recovery_edge")
                  : t("onboarding.days_fine")}
            </Text>
          </View>
          <View style={{ height: 28 }} />
          <SectionLabel text={t("onboarding.session_length")} />
          <View style={{ height: 10 }} />
          {chipRow([
            { label: "30 min", selected: data.sessionDuration === 30, onPress: () => set((d) => (d.sessionDuration = 30)) },
            { label: "45 min", selected: data.sessionDuration === 45, onPress: () => set((d) => (d.sessionDuration = 45)) },
            { label: "60 min", selected: data.sessionDuration === 60, onPress: () => set((d) => (d.sessionDuration = 60)) },
            { label: "75 min", selected: data.sessionDuration === 75, onPress: () => set((d) => (d.sessionDuration = 75)) },
            { label: "90+ min", selected: data.sessionDuration === 90, onPress: () => set((d) => (d.sessionDuration = 90)) },
          ])}
        </View>
      ),
    });
  }

  function recommendedSplit(): string {
    const d = data.daysPerWeek;
    if (d <= 2) return "full_body";
    if (d === 3) return "full_body";
    if (d === 4) return "upper_lower";
    if (d === 5) return "push_pull_legs";
    return "bro";
  }

  function splitStep() {
    const recommended = recommendedSplit();
    return scaffold({
      title: t("onboarding.split_title"),
      subtitle: t("onboarding.split_subtitle"),
      canContinue: data.split != null,
      body: (
        <View>
          {optionCard({
            title: "Full Body",
            subtitle: t("onboarding.split_full_body_sub"),
            badge: recommended === "full_body" ? t("onboarding.recommended") : undefined,
            selected: data.split === "full_body",
            onPress: () => set((d) => (d.split = "full_body")),
          })}
          {optionCard({
            title: "Upper / Lower",
            subtitle: t("onboarding.split_upper_lower_sub"),
            badge: recommended === "upper_lower" ? t("onboarding.recommended") : undefined,
            selected: data.split === "upper_lower",
            onPress: () => set((d) => (d.split = "upper_lower")),
          })}
          {optionCard({
            title: "Push / Pull / Legs",
            subtitle: t("onboarding.split_ppl_sub"),
            badge: recommended === "push_pull_legs" ? t("onboarding.recommended") : undefined,
            selected: data.split === "push_pull_legs",
            onPress: () => set((d) => (d.split = "push_pull_legs")),
          })}
          {optionCard({
            title: "Bro split",
            subtitle: t("onboarding.split_bro_sub"),
            badge: recommended === "bro" ? t("onboarding.recommended") : undefined,
            selected: data.split === "bro",
            onPress: () => set((d) => (d.split = "bro")),
          })}
        </View>
      ),
    });
  }

  function volumeRevealStep() {
    if (data.optimalVolume === 0) {
      data.optimalVolume = optimalWeeklyVolume(data);
    }
    return scaffold({
      title: t("onboarding.volume_title"),
      subtitle: t("onboarding.volume_subtitle"),
      canContinue: true,
      continueLabel: t("onboarding.save_plan"),
      loading: saving,
      body: (
        <View style={{ alignItems: "center" }}>
          <View style={{ height: 8 }} />
          <Text
            style={{
              fontSize: 110,
              fontWeight: "800",
              lineHeight: 110,
              letterSpacing: -4,
              color: AppColors.onSurface,
            }}
          >
            {`${data.optimalVolume}`}
          </Text>
          <View style={{ height: 4 }} />
          <Text style={{ fontSize: 15, color: AppColors.muted }}>{t("onboarding.volume_unit")}</Text>
          <View style={{ height: 8 }} />
          <Text
            style={{
              fontSize: 11,
              letterSpacing: 1.4,
              color: AppColors.muted,
              fontWeight: "700",
            }}
          >
            {t("onboarding.volume_source")}
          </Text>
          <View style={{ height: 28 }} />
          <View style={{ alignSelf: "stretch" }}>
            <WeekPreview split={data.split} daysPerWeek={data.daysPerWeek} />
          </View>
          <View style={{ height: 16 }} />
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
            <RoundButton
              icon="remove"
              small
              onPress={() => {
                if (data.optimalVolume > 6) set((d) => d.optimalVolume--);
              }}
            />
            <View style={{ width: 16 }} />
            <Text
              style={{
                fontSize: 13,
                color: AppColors.muted,
                fontWeight: "700",
                letterSpacing: 1.2,
              }}
            >
              {t("onboarding.fine_tune")}
            </Text>
            <View style={{ width: 16 }} />
            <RoundButton
              icon="add"
              small
              onPress={() => {
                if (data.optimalVolume < 30) set((d) => d.optimalVolume++);
              }}
            />
          </View>
          <View style={{ height: 20 }} />
          {/* Secondary CTA — defer registration by letting the user try a
              sample workout first. */}
          <TouchableOpacity activeOpacity={0.7} onPress={openDemoWorkout} style={{ paddingVertical: 10 }}>
            <Text
              style={{
                fontSize: 14,
                color: AppColors.onSurface,
                fontWeight: "700",
                textDecorationLine: "underline",
                textDecorationColor: AppColors.muted,
              }}
            >
              {t("onboarding.try_a_set")}
            </Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }

  function openDemoWorkout() {
    navigation?.navigate("DemoWorkout");
  }

  // --- small building blocks -----------------------------------------------

  function chipRow(options: Array<{ label: string; selected: boolean; onPress: () => void }>) {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {options.map((o, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.7}
            onPress={o.onPress}
            style={{
              marginRight: 10,
              marginBottom: 10,
              paddingHorizontal: 18,
              paddingVertical: 12,
              backgroundColor: o.selected ? AppColors.primary : AppColors.surfaceLow,
              borderRadius: 100,
            }}
          >
            <Text
              style={{
                color: o.selected ? AppColors.background : AppColors.onSurface,
                fontWeight: "700",
              }}
            >
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // Slider replaced with a full-width +/- stepper (Slider dep not installed).
  function stepperRow(opts: { onDecrement: () => void; onIncrement: () => void }) {
    return (
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <RoundButton icon="remove" onPress={opts.onDecrement} />
        <RoundButton icon="add" onPress={opts.onIncrement} />
      </View>
    );
  }

  return (
    <Screen>
      {steps[step]()}
    </Screen>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <Text
      style={{
        fontSize: 12,
        letterSpacing: 1.6,
        fontWeight: "800",
        color: AppColors.muted,
      }}
    >
      {text.toUpperCase()}
    </Text>
  );
}

function RoundButton({
  icon,
  onPress,
  small = false,
}: {
  icon: "remove" | "add";
  onPress: () => void;
  small?: boolean;
}) {
  const size = small ? 44 : 56;
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: AppColors.surfaceLow,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialIcons name={icon} size={24} color={AppColors.onSurface} />
    </TouchableOpacity>
  );
}
