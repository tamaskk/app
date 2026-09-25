// Ported 1:1 from apps/mobile/lib/screens/training_generator_screen.dart.
//
// Configures and triggers a server-side training-plan generation. The user
// picks: number of weeks (1..20), sessions per week (1..6), optional focus
// muscles. Submitting the form persists weeks×sessions Training docs.
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Keyboard,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Screen } from "../components/ui";
import { BackChip } from "../components/BackChip";
import { AppColors } from "../theme";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../hooks/useLang";
import { AuthException } from "../lib/authService";
import type { RootNav } from "../navigation/types";

// `key` is the backend muscle vocabulary (sent verbatim in the POST body);
// `labelKey` is an i18n key resolved to the display label at build time.
interface MuscleOption {
  key: string;
  labelKey: string;
}

const _muscleOptions: MuscleOption[] = [
  { key: "chest", labelKey: "generator.muscle_chest" },
  { key: "back", labelKey: "generator.muscle_back" },
  { key: "shoulders", labelKey: "generator.muscle_shoulders" },
  { key: "biceps", labelKey: "generator.muscle_biceps" },
  { key: "triceps", labelKey: "generator.muscle_triceps" },
  { key: "quads", labelKey: "generator.muscle_quads" },
  { key: "hamstrings", labelKey: "generator.muscle_hamstrings" },
  { key: "glutes", labelKey: "generator.muscle_glutes" },
  { key: "calves", labelKey: "generator.muscle_calves" },
  { key: "abs", labelKey: "generator.muscle_abs" },
];

function _clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function TrainingGeneratorScreen({ navigation }: { navigation: RootNav }) {
  const { auth, user } = useAuth();
  const { t } = useLang();

  // Pre-fill from the user's onboarding so the first thing they see matches
  // what they already told us.
  const [weeks, setWeeks] = useState<number>(5);
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number>(
    _clamp(user?.onboarding?.daysPerWeek ?? 4, 1, 6),
  );
  const [selectedMuscles, setSelectedMuscles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSessions = weeks * sessionsPerWeek;

  async function submit() {
    if (loading) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      const res = await auth.generateTrainingPlan({
        weeks,
        sessionsPerWeek,
        focusMuscles: Array.from(selectedMuscles),
      });
      const created = Math.trunc((res?.created as number) ?? 0);
      Alert.alert("", t("generator.generated_snack", { count: created }));
      navigation.goBack();
    } catch (e) {
      if (e instanceof AuthException) {
        setError(e.message);
      } else {
        setError(t("generator.network_error"));
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleMuscle(key: string) {
    setSelectedMuscles((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <Screen>
      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        <BackChip onPress={() => navigation.goBack()} />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* header */}
        <View>
          <Text
            style={{
              fontSize: 11,
              letterSpacing: 1.6,
              color: AppColors.muted,
              fontWeight: "800",
            }}
          >
            {t("generator.eyebrow")}
          </Text>
          <View style={{ height: 6 }} />
          <Text
            style={{
              fontSize: 28,
              fontWeight: "800",
              letterSpacing: -1,
              color: AppColors.onSurface,
              lineHeight: 28 * 1.1,
            }}
          >
            {t("generator.title")}
          </Text>
          <View style={{ height: 6 }} />
          <Text style={{ fontSize: 14, color: AppColors.muted, lineHeight: 14 * 1.5 }}>
            {t("generator.subtitle")}
          </Text>
        </View>

        <View style={{ height: 24 }} />

        {/* weeks */}
        <View>
          <SectionLabel text={t("generator.weeks_label")} />
          <View style={{ height: 6 }} />
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 64,
                fontWeight: "800",
                color: AppColors.onSurface,
                letterSpacing: -2,
                lineHeight: 64,
              }}
            >
              {`${weeks}`}
            </Text>
            <View style={{ width: 6 }} />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "800",
                letterSpacing: 1.4,
                color: AppColors.muted,
                marginBottom: 10,
              }}
            >
              {t("generator.weeks_unit")}
            </Text>
          </View>
          <View style={{ height: 12 }} />
          {/* Slider replaced with a +/- stepper (Slider dep not installed). */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <RoundButton
              icon="remove"
              onPress={() => setWeeks((w) => _clamp(w - 1, 1, 20))}
            />
            <RoundButton
              icon="add"
              onPress={() => setWeeks((w) => _clamp(w + 1, 1, 20))}
            />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
            <Text style={{ fontSize: 11, color: AppColors.muted }}>1</Text>
            <Text style={{ fontSize: 11, color: AppColors.muted }}>20</Text>
          </View>
        </View>

        <View style={{ height: 28 }} />

        {/* sessions per week */}
        <View>
          <SectionLabel text={t("generator.sessions_label")} />
          <View style={{ height: 10 }} />
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={{ marginRight: 8, marginBottom: 8 }}>
                <ChipBtn
                  label={`${i}`}
                  selected={sessionsPerWeek === i}
                  onPress={() => setSessionsPerWeek(i)}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 28 }} />

        {/* focus muscles */}
        <View>
          <SectionLabel text={t("generator.muscles_label")} />
          <View style={{ height: 4 }} />
          <Text style={{ fontSize: 12, color: AppColors.muted }}>
            {t("generator.muscles_hint")}
          </Text>
          <View style={{ height: 10 }} />
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {_muscleOptions.map((m) => (
              <View key={m.key} style={{ marginRight: 8, marginBottom: 8 }}>
                <ChipBtn
                  label={t(m.labelKey)}
                  selected={selectedMuscles.has(m.key)}
                  onPress={() => toggleMuscle(m.key)}
                />
              </View>
            ))}
          </View>
          {selectedMuscles.size > 0 && (
            <>
              <View style={{ height: 8 }} />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSelectedMuscles(new Set())}
                style={{ paddingVertical: 6 }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    letterSpacing: 1.4,
                    color: AppColors.muted,
                    fontWeight: "800",
                  }}
                >
                  {t("generator.clear_selection")}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={{ height: 28 }} />

        {/* preview */}
        <View
          style={{
            padding: 18,
            backgroundColor: AppColors.surfaceLow,
            borderRadius: 20,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              letterSpacing: 1.6,
              color: AppColors.muted,
              fontWeight: "800",
            }}
          >
            {t("generator.preview")}
          </Text>
          <View style={{ height: 12 }} />
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 48,
                fontWeight: "800",
                letterSpacing: -2,
                color: AppColors.onSurface,
                lineHeight: 48,
              }}
            >
              {`${totalSessions}`}
            </Text>
            <View style={{ width: 6 }} />
            <Text
              style={{
                fontSize: 14,
                letterSpacing: 1.6,
                color: AppColors.muted,
                fontWeight: "800",
                marginBottom: 6,
              }}
            >
              {t("generator.plan_unit")}
            </Text>
          </View>
          <View style={{ height: 6 }} />
          <Text style={{ fontSize: 13, color: AppColors.muted, lineHeight: 13 * 1.4 }}>
            {`${t("generator.preview_line", { weeks, sessions: sessionsPerWeek })} ${
              selectedMuscles.size === 0
                ? t("generator.preview_all_muscles")
                : t("generator.preview_focus", { count: selectedMuscles.size })
            }`}
          </Text>
        </View>

        {error != null && (
          <>
            <View style={{ height: 16 }} />
            <Text style={{ color: AppColors.onSurface, fontSize: 13 }}>{error}</Text>
          </>
        )}

        <View style={{ height: 20 }} />

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={loading}
          onPress={submit}
          style={{
            width: "100%",
            backgroundColor: AppColors.primary,
            paddingVertical: 18,
            borderRadius: 100,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={AppColors.background} />
          ) : (
            <Text
              style={{
                fontSize: 14,
                fontWeight: "800",
                letterSpacing: 1.6,
                color: AppColors.background,
              }}
            >
              {t("generator.cta", { count: totalSessions })}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <Text
      style={{
        fontSize: 12,
        letterSpacing: 1.6,
        fontWeight: "800",
        color: AppColors.muted,
      }}
    >
      {text.toUpperCase()}
    </Text>
  );
}

function RoundButton({
  icon,
  onPress,
}: {
  icon: "remove" | "add";
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: AppColors.surfaceLow,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialIcons name={icon} size={24} color={AppColors.onSurface} />
    </TouchableOpacity>
  );
}

function ChipBtn({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: selected ? AppColors.primary : AppColors.surfaceLow,
        borderRadius: 100,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "800",
          letterSpacing: 1.2,
          color: selected ? AppColors.background : AppColors.onSurface,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
