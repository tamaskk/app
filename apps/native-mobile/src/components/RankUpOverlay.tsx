// Ported 1:1 from apps/mobile/lib/widgets/rank_up_overlay.dart.
//
// Full-bleed black celebration shown when a workout save crosses a new
// rank threshold. Static — no confetti — matching the brutalist tone.
import React from "react";
import { View, Text, TouchableOpacity, Modal, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RankDef } from "../models/rank";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";

export interface RankUpOverlayProps {
  previousRank: RankDef;
  newRank: RankDef;
  xpAwarded: number;
  visible: boolean;
  onClose: () => void;
}

export function RankUpOverlay({
  previousRank,
  newRank,
  xpAwarded,
  visible,
  onClose,
}: RankUpOverlayProps) {
  const { t } = useLang();
  // Big numeral with a 0→1 fade-in so it lands with weight.
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, opacity]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: AppColors.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, paddingHorizontal: 32 }}>
            <View style={{ flex: 2 }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 11, letterSpacing: 4, fontWeight: "800", color: AppColors.muted }}>
                NEW RANK
              </Text>
              <View style={{ height: 24 }} />
              <Animated.View style={{ opacity }}>
                <Text
                  style={{
                    fontSize: 180,
                    fontWeight: "800",
                    letterSpacing: -8,
                    lineHeight: 180,
                    color: AppColors.onSurface,
                  }}
                >
                  {newRank.numeral}
                </Text>
              </Animated.View>
              <View style={{ height: 20 }} />
              <View style={{ width: 96, height: 2, backgroundColor: AppColors.surfaceHigh }} />
              <View style={{ height: 20 }} />
              <Text style={{ fontSize: 28, fontWeight: "800", letterSpacing: 4, color: AppColors.onSurface }}>
                {newRank.name}
              </Text>
              <View style={{ height: 16 }} />
              <Text style={{ fontSize: 12, letterSpacing: 1.6, fontWeight: "800", color: AppColors.muted }}>
                {`${previousRank.numeral} → ${newRank.numeral} · +${xpAwarded} XP`}
              </Text>
            </View>
            <View style={{ flex: 3 }} />
            <View style={{ width: "100%" }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onClose}
                style={{
                  backgroundColor: AppColors.primary,
                  paddingVertical: 18,
                  borderRadius: 100,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: AppColors.background,
                    fontSize: 14,
                    fontWeight: "800",
                    letterSpacing: 2,
                  }}
                >
                  {t("common.next").toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 16 }} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
