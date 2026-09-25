// Ported from login_screen.dart.
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Keyboard } from "react-native";
import { Screen, AuthField, AuthButton, AuthError, AuthLink } from "../components/ui";
import { AppColors } from "../theme";
import { AppText } from "../theme";
import { useLang } from "../hooks/useLang";
import { AuthService, AuthException } from "../lib/authService";
import { AuthUser } from "../models/auth";
import { OAuthButtons } from "./OAuthButtons";

export function LoginScreen({
  auth,
  onAuthenticated,
  onRegisterInstead,
  onForgot,
}: {
  auth: AuthService;
  onAuthenticated: (u: AuthUser) => void;
  onRegisterInstead: () => void;
  onForgot: () => void;
}) {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      const user = await auth.login(email.trim(), password);
      onAuthenticated(user);
    } catch (e) {
      setError(e instanceof AuthException ? e.message : t("auth.server_unreachable"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 36, letterSpacing: 2, fontWeight: "800", color: AppColors.onSurface }}>
          HEFTOR
        </Text>
        <View style={{ height: 20 }} />
        <Text style={AppText.headlineMedium}>{t("auth.login_title")}</Text>
        <View style={{ height: 8 }} />
        <Text style={{ fontSize: 15, color: AppColors.muted }}>{t("auth.login_subtitle")}</Text>
        <View style={{ height: 28 }} />
        <OAuthButtons auth={auth} onAuthenticated={onAuthenticated} />
        <View style={{ height: 20 }} />
        <AuthField value={email} onChangeText={setEmail} label={t("auth.email")} keyboardType="email-address" />
        <View style={{ height: 12 }} />
        <AuthField value={password} onChangeText={setPassword} label={t("auth.password")} secure onSubmitEditing={submit} />
        {error && (
          <>
            <View style={{ height: 16 }} />
            <AuthError message={error} />
          </>
        )}
        <View style={{ height: 8 }} />
        <TouchableOpacity
          disabled={loading}
          onPress={onForgot}
          style={{ alignSelf: "flex-end", paddingHorizontal: 8, paddingVertical: 8 }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: AppColors.muted }}>{t("auth.forgot_password")}</Text>
        </TouchableOpacity>
        <View style={{ height: 16 }} />
        <AuthButton label={t("auth.login_button")} loading={loading} onPress={submit} />
        {__DEV__ && (
          <>
            <View style={{ height: 12 }} />
            <TouchableOpacity
              disabled={loading}
              onPress={() => {
                setEmail("tamas@blcks.io");
                setPassword("Hdf697123");
                setError(null);
              }}
              style={{ width: "100%", paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: AppColors.outline, alignItems: "center" }}
            >
              <Text style={{ color: AppColors.muted, fontWeight: "700", letterSpacing: 2 }}>TEST</Text>
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: 16 }} />
        <View style={{ alignItems: "center" }}>
          <AuthLink
            leading={t("auth.no_account_leading")}
            action={t("auth.no_account_action")}
            onPress={loading ? undefined : onRegisterInstead}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
