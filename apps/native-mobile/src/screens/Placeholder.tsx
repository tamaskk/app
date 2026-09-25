// Temporary stand-in for screens still being ported 1:1 from apps/mobile.
// Keeps the navigation shell fully functional while each screen lands.
import React from "react";
import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Screen } from "../components/ui";
import { AppColors } from "../theme";

export function Placeholder({ title }: { title: string }) {
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <MaterialIcons name="construction" size={40} color={AppColors.muted} />
        <View style={{ height: 16 }} />
        <Text style={{ fontSize: 20, fontWeight: "700", color: AppColors.onSurface }}>{title}</Text>
        <View style={{ height: 8 }} />
        <Text style={{ fontSize: 13, color: AppColors.muted, textAlign: "center" }}>
          Porting in progress — 1:1 from apps/mobile.
        </Text>
      </View>
    </Screen>
  );
}
