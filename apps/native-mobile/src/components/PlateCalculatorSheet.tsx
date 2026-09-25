// Ported 1:1 from apps/mobile/lib/widgets/plate_calculator_sheet.dart.
//
// Text-only plate-calculator overlay for a given working weight. Reads the
// device's bar/plate settings and renders the per-side breakdown.
import React from "react";
import { View, Text, Pressable, ScrollView, Modal, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";
import { plateSettings } from "../lib/plateSettings";
import { computePlates, fmtPlate, formatEquation, formatBarDiagram, closestNote } from "../utils/plates";

const MONO = Platform.select({ ios: "Courier", default: "monospace" });

export function PlateCalculatorSheet({
  visible,
  onClose,
  kg,
}: {
  visible: boolean;
  onClose: () => void;
  kg: number;
}) {
  const { t } = useLang();
  const insets = useSafeAreaInsets();

  const r = computePlates(kg, plateSettings.barWeight, plateSettings.availablePlates);
  const note = closestNote(r);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={{ alignItems: "center" }}>
            <View style={styles.handle} />
          </View>
          <View style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 4, paddingBottom: 24 + insets.bottom }}>
            <Text style={styles.eyebrow}>PLATE CALC</Text>
            <View style={{ height: 16 }} />
            {!r.feasible ? (
              <>
                <Text style={[styles.mono, { color: AppColors.onSurface, fontSize: 15 }]}>
                  {t("plate.below_bar", { kg: fmtPlate(kg) })}
                </Text>
                <View style={{ height: 6 }} />
                <Text style={[styles.mono, { color: AppColors.muted, fontSize: 13 }]}>
                  {t("plate.minimum", { kg: fmtPlate(r.barWeight) })}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.mono, { color: AppColors.onSurface, fontSize: 15, fontWeight: "600" }]}>
                  {formatEquation(r)}
                </Text>
                <View style={{ height: 16 }} />
                {/* Horizontal scroll so a long bar never overflows. */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Text style={[styles.mono, { color: AppColors.muted, fontSize: 14, lineHeight: 14 * 1.4 }]}>
                    {formatBarDiagram(r)}
                  </Text>
                </ScrollView>
                {note != null && (
                  <>
                    <View style={{ height: 14 }} />
                    <Text style={[styles.mono, { color: AppColors.muted, fontSize: 13 }]}>{note}</Text>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  card: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: AppColors.outline,
  },
  handle: {
    marginVertical: 12,
    width: 40,
    height: 4,
    backgroundColor: AppColors.surfaceHigh,
    borderRadius: 100,
  },
  eyebrow: {
    color: AppColors.muted,
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: "700",
  },
  mono: { fontFamily: MONO },
});
