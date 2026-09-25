// Step 2 of the reset flow. Ported from reset_password_screen.dart.
import React, { useState } from "react";
import { View, Text, ScrollView, Keyboard } from "react-native";
import { Screen, AuthField, AuthButton, AuthError } from "../components/ui";
import { BackChip } from "../components/BackChip";
import { PasswordStrengthMeter } from "../components/PasswordStrength";
import { AppColors, AppText } from "../theme";
import { useLang } from "../hooks/useLang";
import { AuthService, AuthException } from "../lib/authService";
import { AuthUser } from "../models/auth";

/** Accept either a bare token or the full email URL (extract `?token=`). */
function extractToken(input: string): string {
  const raw = input.trim();
  if (raw.length === 0) return raw;
  try {
    const uri = new URL(raw);
    const fromQuery = uri.searchParams.get("token");
    if (fromQuery && fromQuery.length > 0) return fromQuery;
  } catch {
    // not a URL — treat as a bare token
  }
  return raw;
}

export function ResetPasswordScreen({
  auth,
  onAuthenticated,
  onBack,
  onDone,
  initialToken,
}: {
  auth: AuthService;
  onAuthenticated?: (u: AuthUser) => void;
  onBack: () => void;
  onDone: () => void;
  initialToken?: string;
}) {
  const { t } = useLang();
  const [token, setToken] = useState(initialToken ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    Keyboard.dismiss();
    const tok = extractToken(token);
    if (tok.length === 0) {
      setError(t("auth.reset_token_required"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.password_min_8"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.reset_passwords_dont_match"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await auth.resetPassword(tok, password);
      onAuthenticated?.(user);
      onDone();
    } catch (e) {
      if (e instanceof AuthException) {
        setError(
          e.statusCode === 410 || e.statusCode === 404
            ? t("auth.reset_invalid_or_expired")
            : e.message,
        );
      } else {
        setError(t("auth.server_unreachable"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <BackChip onPress={onBack} />
        <Text style={AppText.headlineLarge}>{t("auth.reset_step2_title")}</Text>
        <View style={{ height: 8 }} />
        <Text style={{ fontSize: 15, color: AppColors.muted, lineHeight: 22.5 }}>{t("auth.reset_step2_subtitle")}</Text>
        <View style={{ height: 24 }} />
        <AuthField value={token} onChangeText={setToken} label={t("auth.reset_token_label")} keyboardType="url" />
        <View style={{ height: 12 }} />
        <AuthField value={password} onChangeText={setPassword} label={t("auth.reset_new_password_label")} secure />
        <View style={{ height: 10 }} />
        <PasswordStrengthMeter password={password} />
        <View style={{ height: 12 }} />
        <AuthField value={confirm} onChangeText={setConfirm} label={t("auth.reset_confirm_password_label")} secure onSubmitEditing={submit} />
        {error && (
          <>
            <View style={{ height: 16 }} />
            <AuthError message={error} />
          </>
        )}
        <View style={{ height: 24 }} />
        <AuthButton label={t("auth.reset_button")} loading={loading} onPress={submit} />
      </ScrollView>
    </Screen>
  );
}
