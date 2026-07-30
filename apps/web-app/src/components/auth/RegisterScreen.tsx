"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { AuthError as ApiAuthError } from "@/lib/api";
import {
  AuthButton,
  AuthError,
  AuthField,
  AuthLink,
  PasswordStrength,
  scorePassword,
} from "./AuthPrimitives";
import { OAuthButtons } from "./OAuthButtons";
import { Icon } from "@/components/ui/Icon";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const STRENGTH_KEYS = [
  "pwstrength.tooShort",
  "pwstrength.weak",
  "pwstrength.fair",
  "pwstrength.strong",
  "pwstrength.excellent",
];

// register_screen.dart — back chip, title/subtitle, oauth, fields, strength
// meter, legal note, submit, switch link.
export function RegisterScreen({
  onBack,
  onLoginInstead,
}: {
  onBack: () => void;
  onLoginInstead: () => void;
}) {
  const { t } = useI18n();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    if (!EMAIL_RE.test(email.trim())) {
      setError(t("auth.invalid_email"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.password_min_8"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register({ email: email.trim(), password, name: name.trim() });
    } catch (e) {
      if (e instanceof ApiAuthError) setError(e.message);
      else setError(t("auth.server_unreachable"));
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-6 pt-2 pb-6">
      <button
        onClick={onBack}
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-low text-on-surface"
      >
        <Icon name="chevron_left" size={22} />
      </button>

      <h2 className="text-[30px] font-extrabold tracking-[-0.02em] text-on-surface">
        {t("auth.register_title_default")}
      </h2>
      <div className="h-2" />
      <p className="text-[15px] text-muted">{t("auth.register_subtitle_default")}</p>
      <div className="h-7" />

      <OAuthButtons />
      <div className="h-5" />

      <div className="flex flex-col gap-3">
        <AuthField
          label={t("auth.name_optional")}
          autoComplete="name"
          value={name}
          onChange={setName}
        />
        <AuthField
          label={t("auth.email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
        />
        <AuthField
          label={t("auth.password_min_8_label")}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          onEnter={submit}
        />
      </div>

      <div className="mt-2.5">
        <PasswordStrength
          password={password}
          label={t(STRENGTH_KEYS[scorePassword(password)])}
        />
      </div>

      {error && (
        <div className="mt-4">
          <AuthError message={error} />
        </div>
      )}

      <p className="mt-5 text-[12px] leading-[1.4] text-muted">
        {t("auth.terms_lead")}
        <span className="font-bold text-on-surface">{t("auth.terms_link")}</span>
        {t("auth.terms_and")}
        <span className="font-bold text-on-surface">{t("auth.privacy_link")}</span>.
      </p>

      <div className="h-3" />
      <AuthButton
        label={t("auth.create_account_button")}
        loading={loading}
        onClick={submit}
      />
      <div className="h-4" />
      <AuthLink
        leading={t("auth.have_account_leading")}
        action={t("auth.have_account_action")}
        onClick={onLoginInstead}
        disabled={loading}
      />
    </div>
  );
}
