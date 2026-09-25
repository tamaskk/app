// Stacked Apple + Google buttons with a divider beneath. Ported from
// oauth_buttons.dart. Apple uses expo-apple-authentication; Google uses
// expo-auth-session. SETUP: apps/mobile/OAUTH_SETUP.md + client IDs in
// app.json → extra (googleIosClientId / googleAndroidClientId / googleWebClientId).
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";
import { AuthService, AuthException } from "../lib/authService";
import { AuthUser } from "../models/auth";
import { OnboardingData } from "../models/onboarding";

WebBrowser.maybeCompleteAuthSession();

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

export function OAuthButtons({
  auth,
  onAuthenticated,
  onboarding,
}: {
  auth: AuthService;
  onAuthenticated: (u: AuthUser) => void;
  onboarding?: OnboardingData;
}) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: extra.googleIosClientId,
    androidClientId: extra.googleAndroidClientId,
    webClientId: extra.googleWebClientId,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.authentication?.idToken ?? response.params?.id_token;
      if (idToken) void exchangeGoogle(idToken);
      else showError(t("oauth.google_no_token"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  function showError(msg: string) {
    Alert.alert("", msg);
  }

  async function exchangeGoogle(idToken: string) {
    setBusy(true);
    try {
      const user = await auth.signInWithOAuth({
        provider: "google",
        idToken,
        name: "",
        onboarding: onboarding?.toJson(),
      });
      onAuthenticated(user);
    } catch (e) {
      showError(e instanceof AuthException ? e.message : t("oauth.google_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function signInWithApple() {
    if (busy) return;
    setBusy(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });
      const idToken = credential.identityToken;
      if (!idToken) throw new AuthException(401, t("oauth.apple_no_token"));
      const name = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter((s): s is string => !!s && s.length > 0)
        .join(" ")
        .trim();
      const user = await auth.signInWithOAuth({
        provider: "apple",
        idToken,
        name,
        onboarding: onboarding?.toJson(),
      });
      onAuthenticated(user);
    } catch (e: any) {
      if (e?.code === "ERR_REQUEST_CANCELED") {
        // User cancelled — no toast.
      } else if (e instanceof AuthException) {
        showError(e.message);
      } else {
        showError(t("oauth.apple_failed"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    if (busy) return;
    if (!request) {
      showError(t("oauth.google_failed"));
      return;
    }
    await promptAsync();
  }

  const showApple = Platform.OS === "ios" || Platform.OS === "macos";

  return (
    <View style={{ opacity: busy ? 0.5 : 1 }} pointerEvents={busy ? "none" : "auto"}>
      {showApple && (
        <>
          <OAuthButton
            label={t("oauth.continue_apple")}
            onPress={signInWithApple}
            background={AppColors.onSurface}
            foreground={AppColors.background}
            icon="apple"
          />
          <View style={{ height: 10 }} />
        </>
      )}
      <OAuthButton
        label={t("oauth.continue_google")}
        onPress={signInWithGoogle}
        background={AppColors.surfaceLow}
        foreground={AppColors.onSurface}
        icon="g-translate"
        iconSize={24}
        border={AppColors.outline}
      />
      <View style={{ height: 20 }} />
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1, height: 1, backgroundColor: AppColors.outline }} />
        <Text
          style={{
            marginHorizontal: 12,
            fontSize: 12,
            color: AppColors.muted,
            fontWeight: "700",
            letterSpacing: 1.2,
          }}
        >
          {t("oauth.or")}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: AppColors.outline }} />
      </View>
    </View>
  );
}

function OAuthButton({
  label,
  onPress,
  background,
  foreground,
  icon,
  iconSize = 20,
  border,
}: {
  label: string;
  onPress: () => void;
  background: string;
  foreground: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconSize?: number;
  border?: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        width: "100%",
        backgroundColor: background,
        paddingVertical: 14,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: border ? 1 : 0,
        borderColor: border,
      }}
    >
      <MaterialIcons name={icon} size={iconSize} color={foreground} />
      <View style={{ width: 10 }} />
      <Text style={{ fontSize: 15, fontWeight: "700", color: foreground }}>{label}</Text>
    </TouchableOpacity>
  );
}
