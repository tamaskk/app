"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { AuthError as ApiAuthError } from "@/lib/api";
import { AuthButton, AuthError, AuthField, AuthLink } from "./AuthPrimitives";
import { OAuthButtons } from "./OAuthButtons";

// login_screen.dart — vertically-centred column, 24px padding.
export function LoginScreen({
  onRegisterInstead,
}: {
  onRegisterInstead: () => void;
}) {
  const { t } = useI18n();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (e) {
      if (e instanceof ApiAuthError) setError(e.message);
      else setError(t("auth.server_unreachable"));
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-center px-6 py-6">
      <h1 className="text-[36px] font-extrabold tracking-[0.04em] text-on-surface">
        HEFTOR
      </h1>
      <div className="h-5" />
      <h2 className="text-[32px] font-bold tracking-[-0.03em] text-on-surface">
        {t("auth.login_title")}
      </h2>
      <div className="h-2" />
      <p className="text-[15px] text-muted">{t("auth.login_subtitle")}</p>
      <div className="h-7" />

      <OAuthButtons />
      <div className="h-5" />

      <div className="flex flex-col gap-3">
        <AuthField
          label={t("auth.email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
        />
        <AuthField
          label={t("auth.password")}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          onEnter={submit}
        />
      </div>

      {error && (
        <div className="mt-4">
          <AuthError message={error} />
        </div>
      )}

      <div className="mt-2 flex justify-end">
        <button
          disabled={loading}
          className="px-2 py-2 text-[13px] font-semibold text-muted disabled:opacity-50"
          onClick={() => alert(t("auth.forgot_password"))}
        >
          {t("auth.forgot_password")}
        </button>
      </div>

      <div className="h-4" />
      <AuthButton label={t("auth.login_button")} loading={loading} onClick={submit} />
      <div className="h-4" />
      <AuthLink
        leading={t("auth.no_account_leading")}
        action={t("auth.no_account_action")}
        onClick={onRegisterInstead}
        disabled={loading}
      />
    </div>
  );
}
