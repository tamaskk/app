// Step 1 of the reset flow. Ported from forgot_password_screen.dart.
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Keyboard } from "react-native";
import { Screen, AuthField, AuthButton, AuthError } from "../components/ui";
import { BackChip } from "../components/BackChip";
import { AppColors, AppText } from "../theme";
import { useLang } from "../hooks/useLang";
import { AuthService, AuthException } from "../lib/authService";

export function ForgotPasswordScreen({
  auth,
  onBack,
  onHaveCode,
}: {
  auth: AuthService;
  onBack: () => void;
  onHaveCode: () => void;
}) {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    Keyboard.dismiss();
    const e = email.trim();
    if (!e.includes("@") || !e.includes(".")) {
      setError(t("auth.invalid_email"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await auth.requestPasswordReset(e);
      setSent(true);
    } catch (err) {
      setError(err instanceof AuthException ? err.message : t("auth.server_unreachable"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <BackChip onPress={onBack} />
        {!sent ? (
          <>
            <Text style={AppText.headlineLarge}>{t("auth.reset_title")}</Text>
            <View style={{ height: 8 }} />
            <Text style={{ fontSize: 15, color: AppColors.muted }}>{t("auth.reset_subtitle")}</Text>
            <View style={{ height: 32 }} />
            <AuthField value={email} onChangeText={setEmail} label={t("auth.email")} keyboardType="email-address" onSubmitEditing={submit} />
            {error && (
              <>
                <View style={{ height: 16 }} />
                <AuthError message={error} />
              </>
            )}
            <View style={{ height: 24 }} />
            <AuthButton label={t("auth.send_reset_link")} loading={loading} onPress={submit} />
            <View style={{ height: 12 }} />
            <View style={{ alignItems: "center" }}>
              <TouchableOpacity disabled={loading} onPress={onHaveCode} style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: AppColors.muted }}>{t("auth.reset_have_code")}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={AppText.headlineLarge}>{t("auth.reset_sent_title")}</Text>
            <View style={{ height: 12 }} />
            <Text style={{ fontSize: 15, color: AppColors.muted, lineHeight: 22.5 }}>
              {t("auth.reset_sent_body", { email: email.trim() })}
            </Text>
            <View style={{ height: 32 }} />
            <AuthButton label={t("auth.reset_have_code")} onPress={onHaveCode} />
            <View style={{ height: 12 }} />
            <View style={{ alignItems: "center" }}>
              <TouchableOpacity onPress={onBack} style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: AppColors.muted }}>{t("common.back")}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
