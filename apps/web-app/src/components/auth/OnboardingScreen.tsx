"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Skeleton";

// A compact port of onboarding_screen.dart — collects the fields the app uses
// (goal, experience, split, days/week, session length) and saves them. The
// native flow has more steps (body metrics, volume); the web keeps the ones
// that drive the dashboard/plan. Skip saves an empty payload so the gate clears.

type Choice = { value: string; title: string; sub?: string };

export function OnboardingScreen({
  onComplete,
  saving,
}: {
  onComplete: (data: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<string | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [split, setSplit] = useState<string | null>(null);
  const [days, setDays] = useState<number>(3);
  const [duration, setDuration] = useState<number>(60);

  const goals: Choice[] = [
    { value: "lose_fat", title: t("onboarding.goal_lose_fat"), sub: t("onboarding.goal_lose_fat_sub") },
    { value: "build_muscle", title: t("onboarding.goal_build_muscle"), sub: t("onboarding.goal_build_muscle_sub") },
    { value: "strength", title: t("onboarding.goal_strength"), sub: t("onboarding.goal_strength_sub") },
    { value: "maintain", title: t("onboarding.goal_maintain"), sub: t("onboarding.goal_maintain_sub") },
  ];
  const exps: Choice[] = [
    { value: "beginner", title: t("onboarding.exp_beginner"), sub: t("onboarding.exp_beginner_sub") },
    { value: "intermediate", title: t("onboarding.exp_intermediate"), sub: t("onboarding.exp_intermediate_sub") },
    { value: "advanced", title: t("onboarding.exp_advanced"), sub: t("onboarding.exp_advanced_sub") },
    { value: "elite", title: t("onboarding.exp_elite"), sub: t("onboarding.exp_elite_sub") },
  ];
  const splits: Choice[] = [
    { value: "full_body", title: "Full Body", sub: t("onboarding.split_full_body_sub") },
    { value: "upper_lower", title: "Upper / Lower", sub: t("onboarding.split_upper_lower_sub") },
    { value: "push_pull_legs", title: "Push / Pull / Legs", sub: t("onboarding.split_ppl_sub") },
    { value: "bro", title: "Bro split", sub: t("onboarding.split_bro_sub") },
  ];

  const steps = [
    { title: t("onboarding.goal_title"), subtitle: t("onboarding.goal_subtitle"), value: goal },
    { title: t("onboarding.exp_title"), subtitle: t("onboarding.exp_subtitle"), value: experience },
    { title: t("onboarding.split_title"), subtitle: t("onboarding.split_subtitle"), value: split },
    { title: t("onboarding.schedule_title"), subtitle: t("onboarding.schedule_subtitle"), value: "ok" },
  ];
  const cur = steps[step];
  const canNext = cur.value != null;
  const last = step === steps.length - 1;

  function next() {
    if (last) {
      onComplete({
        goal,
        experience,
        split,
        daysPerWeek: days,
        sessionDuration: duration,
      });
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-6 pt-4 pb-6">
      {/* progress dots */}
      <div className="flex items-center gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-on-surface" : "bg-surface-high"}`}
          />
        ))}
      </div>

      <div className="h-8" />
      <h2 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.02em] text-on-surface">
        {cur.title}
      </h2>
      <div className="h-2" />
      <p className="text-[15px] text-muted">{cur.subtitle}</p>
      <div className="h-7" />

      <div className="flex flex-1 flex-col gap-3">
        {step === 0 && goals.map((c) => <OptionCard key={c.value} c={c} selected={goal === c.value} onClick={() => setGoal(c.value)} />)}
        {step === 1 && exps.map((c) => <OptionCard key={c.value} c={c} selected={experience === c.value} onClick={() => setExperience(c.value)} />)}
        {step === 2 && splits.map((c) => <OptionCard key={c.value} c={c} selected={split === c.value} onClick={() => setSplit(c.value)} />)}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-3 text-[13px] font-bold tracking-[0.1em] text-muted">
                {t("onboarding.days_per_week").toUpperCase()}
              </p>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`flex-1 rounded-xl py-4 text-lg font-extrabold ${
                      days === d ? "bg-on-surface text-background" : "bg-surface-low text-on-surface"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-[13px] font-bold tracking-[0.1em] text-muted">
                {t("onboarding.session_length").toUpperCase()}
              </p>
              <div className="flex gap-2">
                {[45, 60, 75, 90].map((m) => (
                  <button
                    key={m}
                    onClick={() => setDuration(m)}
                    className={`flex-1 rounded-xl py-4 text-base font-extrabold ${
                      duration === m ? "bg-on-surface text-background" : "bg-surface-low text-on-surface"
                    }`}
                  >
                    {m}′
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="h-4" />
      <button
        onClick={next}
        disabled={!canNext || saving}
        className={`flex h-[52px] w-full items-center justify-center rounded-2xl text-base font-bold ${
          !canNext || saving ? "bg-surface-high text-background" : "bg-primary text-background"
        }`}
      >
        {saving ? (
          <Spinner size={18} className="text-background" />
        ) : last ? (
          t("onboarding.save_plan")
        ) : (
          t("onboarding.continue")
        )}
      </button>
      <div className="h-2" />
      <button
        onClick={() => onComplete({})}
        disabled={saving}
        className="py-2 text-center text-sm font-semibold text-muted disabled:opacity-50"
      >
        {t("onboarding.skip")}
      </button>
    </div>
  );
}

function OptionCard({
  c,
  selected,
  onClick,
}: {
  c: Choice;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-left transition-colors ${
        selected ? "border-on-surface bg-surface-low" : "border-outline bg-surface-low/40"
      }`}
    >
      <div className="flex-1">
        <div className="text-[17px] font-bold text-on-surface">{c.title}</div>
        {c.sub && <div className="mt-0.5 text-[13px] text-muted">{c.sub}</div>}
      </div>
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-on-surface bg-on-surface text-background" : "border-surface-high"
        }`}
      >
        {selected && <Icon name="check" size={14} />}
      </div>
    </button>
  );
}
