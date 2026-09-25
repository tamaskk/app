// First screen a brand-new user sees. Ported from welcome_screen.dart.
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Screen } from "../components/ui";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";

export function WelcomeScreen({
  onRegister,
  onSignIn,
}: {
  onRegister: () => void;
  onSignIn: () => void;
}) {
  const { t } = useLang();
  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }} />
        <View style={{ paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 48, fontWeight: "800", letterSpacing: 2, color: AppColors.onSurface }}>
            HEFTOR
          </Text>
          <View style={{ height: 16 }} />
          <Text style={{ fontSize: 22, lineHeight: 26.4, color: AppColors.onSurface, fontWeight: "600" }}>
            {t("welcome.headline")}
          </Text>
          <View style={{ height: 16 }} />
          <Text style={{ fontSize: 15, lineHeight: 22.5, color: AppColors.muted }}>{t("welcome.body")}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onRegister}
            style={{
              width: "100%",
              backgroundColor: AppColors.primary,
              paddingVertical: 18,
              borderRadius: 100,
              alignItems: "center",
            }}
          >
            <Text style={{ color: AppColors.background, fontWeight: "700", fontSize: 16 }}>
              {t("welcome.cta")}
            </Text>
          </TouchableOpacity>
          <View style={{ height: 12 }} />
          <TouchableOpacity onPress={onSignIn} activeOpacity={0.7} style={{ paddingVertical: 8, alignItems: "center" }}>
            <Text style={{ fontSize: 14, color: AppColors.muted }}>
              {t("welcome.have_account")}
              <Text style={{ color: AppColors.onSurface, fontWeight: "700" }}>{t("welcome.sign_in_link")}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}
