"use client";

import { useI18n } from "@/lib/i18n";

// welcome_screen.dart — wordmark + tagline centred, pill CTA + sign-in link at
// the bottom. 24px horizontal padding, left-aligned content.
export function WelcomeScreen({
  onRegister,
  onSignIn,
}: {
  onRegister: () => void;
  onSignIn: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-6">
      <div className="flex-1" />
      <div className="flex flex-col items-start">
        <h1 className="text-[48px] font-extrabold tracking-[0.04em] text-on-surface">
          HEFTOR
        </h1>
        <div className="h-4" />
        <p className="whitespace-pre-line text-[22px] font-semibold leading-[1.2] text-on-surface">
          {t("welcome.headline")}
        </p>
        <div className="h-4" />
        <p className="whitespace-pre-line text-[15px] leading-[1.5] text-muted">
          {t("welcome.body")}
        </p>
      </div>
      <div className="flex-1" />
      <div className="pb-4">
        <button
          onClick={onRegister}
          className="w-full rounded-full bg-primary py-[18px] text-base font-bold text-background active:opacity-90"
        >
          {t("welcome.cta")}
        </button>
        <div className="h-3" />
        <button onClick={onSignIn} className="w-full py-2 text-center text-sm">
          <span className="text-muted">{t("welcome.have_account")} </span>
          <span className="font-bold text-on-surface">{t("welcome.sign_in_link")}</span>
        </button>
      </div>
    </div>
  );
}
