// Brief splash while the stored session is restored. Ported from main.dart _Splash.
import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { AppColors } from "../theme";

export function SplashScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: AppColors.background, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 14, letterSpacing: 5, fontWeight: "800", color: AppColors.onSurface }}>HEFTOR</Text>
      <View style={{ height: 20 }} />
      <ActivityIndicator size="small" color={AppColors.onSurface} />
    </View>
  );
}
