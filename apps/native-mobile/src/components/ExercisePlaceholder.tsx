// Ported 1:1 from apps/mobile/lib/widgets/exercise_placeholder.dart.
//
// Shown when an exercise GIF is missing or fails to load (e.g. 404). On large
// previews it adds a "Hamarosan" (coming soon) label; small thumbnails show
// just the icon.
import React from "react";
import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { AppColors } from "../theme";

export interface ExercisePlaceholderProps {
  iconSize?: number;
  showLabel?: boolean;
  // Tighter spacing + smaller label for tiny thumbnails (e.g. 52px list rows).
  compact?: boolean;
}

export function ExercisePlaceholder({
  iconSize = 24,
  showLabel = false,
  compact = false,
}: ExercisePlaceholderProps) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <MaterialIcons name="fitness-center" size={iconSize} color={AppColors.muted} />
      {showLabel ? (
        <>
          <View style={{ height: compact ? 3 : 10 }} />
          <Text
            style={{
              textAlign: "center",
              color: AppColors.muted,
              fontSize: compact ? 8.5 : 13,
              fontWeight: "600",
              letterSpacing: compact ? 0 : 0.5,
            }}
          >
            Hamarosan
          </Text>
        </>
      ) : null}
    </View>
  );
}
