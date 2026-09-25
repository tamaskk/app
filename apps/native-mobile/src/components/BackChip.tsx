// Rounded inline back affordance used across the auth/onboarding screens.
import React from "react";
import { TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { AppColors } from "../theme";

export function BackChip({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        width: 40,
        height: 40,
        marginBottom: 16,
        backgroundColor: AppColors.surfaceLow,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialIcons name="chevron-left" size={26} color={AppColors.onSurface} />
    </TouchableOpacity>
  );
}
