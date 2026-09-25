// Ported from register_screen.dart.
import React, { useState } from "react";
import { View, Text, ScrollView, Alert, Keyboard } from "react-native";
import { Screen, AuthField, AuthButton, AuthError, AuthLink } from "../components/ui";
import { BackChip } from "../components/BackChip";
import { PasswordStrengthMeter } from "../components/PasswordStrength";
import { AppColors, AppText } from "../theme";
import { useLang } from "../hooks/useLang";
import { AuthService, AuthException } from "../lib/authService";
import { AuthUser } from "../models/auth";
import { OnboardingData } from "../models/onboarding";
import { OAuthButtons } from "./OAuthButtons";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function RegisterScreen({
  auth,
  onAuthenticated,
  onboarding,
  onBack,
  onLoginInstead,
}: {
  auth: AuthService;
  onAuthenticated: (u: AuthUser) => void;
  onboarding?: OnboardingData | null;
  onBack?: () => void;
  onLoginInstead?: () => void;
}) {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasOnboarding = onboarding != null;

  async function submit() {
    Keyboard.dismiss();
    const e = email.trim();
    if (!EMAIL_RE.test(e)) {
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
      const user = await auth.register({
        email: e,
        password,
        name: name.trim(),
        onboarding: onboarding?.toJson(),
      });
      onAuthenticated(user);
    } catch (err) {
      setError(err instanceof AuthException ? err.message : t("auth.server_unreachable"));
    } finally {
      setLoading(false);
    }
  }

  function showLegal(which: string) {
    Alert.alert("", `${which} — coming soon`);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <BackChip onPress={() => onBack?.()} />
        <Text style={AppText.headlineLarge}>
          {hasOnboarding ? t("auth.register_title_with_plan") : t("auth.register_title_default")}
        </Text>
        <View style={{ height: 8 }} />
        <Text style={{ fontSize: 15, color: AppColors.muted }}>
          {hasOnboarding ? t("auth.register_subtitle_with_plan") : t("auth.register_subtitle_default")}
        </Text>
        <View style={{ height: 28 }} />
        <OAuthButtons auth={auth} onAuthenticated={onAuthenticated} onboarding={onboarding ?? undefined} />
        <View style={{ height: 20 }} />
        <AuthField value={name} onChangeText={setName} label={t("auth.name_optional")} autoCapitalize="words" />
        <View style={{ height: 12 }} />
        <AuthField value={email} onChangeText={setEmail} label={t("auth.email")} keyboardType="email-address" />
        <View style={{ height: 12 }} />
        <AuthField value={password} onChangeText={setPassword} label={t("auth.password_min_8_label")} secure onSubmitEditing={submit} />
        <View style={{ height: 10 }} />
        <PasswordStrengthMeter password={password} />
        {error && (
          <>
            <View style={{ height: 16 }} />
            <AuthError message={error} />
          </>
        )}
        <View style={{ height: 20 }} />
        <Text style={{ fontSize: 12, color: AppColors.muted, lineHeight: 16.8 }}>
          {t("auth.terms_lead")}
          <Text style={{ color: AppColors.onSurface, fontWeight: "700" }} onPress={() => showLegal(t("auth.terms_link"))}>
            {t("auth.terms_link")}
          </Text>
          {t("auth.terms_and")}
          <Text style={{ color: AppColors.onSurface, fontWeight: "700" }} onPress={() => showLegal(t("auth.privacy_link"))}>
            {t("auth.privacy_link")}
          </Text>
          .
        </Text>
        <View style={{ height: 12 }} />
        <AuthButton label={t("auth.create_account_button")} loading={loading} onPress={submit} />
        <View style={{ height: 16 }} />
        <View style={{ alignItems: "center" }}>
          <AuthLink
            leading={t("auth.have_account_leading")}
            action={t("auth.have_account_action")}
            onPress={loading ? undefined : onLoginInstead}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
