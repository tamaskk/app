// Ported 1:1 from apps/mobile/lib/screens/demo_workout_screen.dart.
//
// A guided, read-only-ish demo of a workout. The user can mark sets done and
// see the rest timer + completion flow — exactly enough to feel the app without
// an account. Data is never persisted.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Screen } from "../components/ui";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";
import type { RootNav } from "../navigation/types";

interface DemoSet {
  kg: number;
  reps: number;
  done: boolean;
}

export function DemoWorkoutScreen({
  navigation,
  onSaveProgress,
  onBack,
}: {
  navigation: RootNav;
  onSaveProgress: () => void;
  onBack?: () => void;
}) {
  const { t } = useLang();

  // 4 sets of 80 kg × 8 — the canonical "looks like a real workout" sample.
  const [sets, setSets] = useState<DemoSet[]>([
    { kg: 80, reps: 8, done: false },
    { kg: 80, reps: 8, done: false },
    { kg: 80, reps: 8, done: false },
    { kg: 80, reps: 8, done: false },
  ]);

  const [restSeconds, setRestSeconds] = useState(0);
  const [resting, setResting] = useState(false);
  const restTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (restTimer.current) clearInterval(restTimer.current);
    };
  }, []);

  const completeSet = (index: number) => {
    if (sets[index].done) return;
    setSets((prev) => prev.map((s, i) => (i === index ? { ...s, done: true } : s)));
    setResting(true);
    setRestSeconds(90); // smart timer default for a compound
    if (restTimer.current) clearInterval(restTimer.current);
    restTimer.current = setInterval(() => {
      setRestSeconds((prevSeconds) => {
        if (prevSeconds > 0) {
          return prevSeconds - 1;
        }
        setResting(false);
        if (restTimer.current) {
          clearInterval(restTimer.current);
          restTimer.current = null;
        }
        return prevSeconds;
      });
    }, 1000);
  };

  const skipRest = () => {
    if (restTimer.current) clearInterval(restTimer.current);
    setResting(false);
    setRestSeconds(0);
  };

  const adjustRest = (delta: number) => {
    setRestSeconds((prev) => Math.min(600, Math.max(0, prev + delta)));
  };

  const completedSets = sets.filter((s) => s.done).length;
  const allDone = completedSets === sets.length;

  const goBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const statBlock = (value: string, unit: string, inverted: boolean) => {
    const fg = inverted ? AppColors.background : AppColors.onSurface;
    const sub = inverted ? "#4A4A4A" : AppColors.muted;
    return (
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: fg }}>{value}</Text>
        <View style={{ width: 4 }} />
        <Text style={{ fontSize: 12, color: sub }}>{unit}</Text>
      </View>
    );
  };

  const setRow = (index: number, set: DemoSet) => (
    <TouchableOpacity
      key={index}
      activeOpacity={1}
      onPress={() => completeSet(index)}
      style={{
        marginBottom: 10,
        paddingVertical: 16,
        paddingHorizontal: 18,
        borderRadius: 16,
        backgroundColor: set.done ? AppColors.primary : AppColors.surfaceLow,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 32 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "800",
              color: set.done ? AppColors.background : AppColors.muted,
            }}
          >
            {`${index + 1}`}
          </Text>
        </View>
        {statBlock(set.kg.toFixed(0), "kg", set.done)}
        <View style={{ width: 24 }} />
        {statBlock(`${set.reps}`, "reps", set.done)}
        <View style={{ flex: 1 }} />
        <View
          style={{
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 16,
            backgroundColor: set.done ? AppColors.background : "transparent",
            borderWidth: 1.5,
            borderColor: set.done ? AppColors.background : AppColors.surfaceHigh,
          }}
        >
          {set.done ? (
            <MaterialIcons name="check" size={18} color={AppColors.primary} />
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );

  const miniButton = (label: string, onTap: () => void, filled = false) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onTap}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 100,
        backgroundColor: filled ? AppColors.primary : "transparent",
        borderWidth: filled ? 0 : 1,
        borderColor: filled ? "transparent" : AppColors.outline,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "800",
          letterSpacing: 1.2,
          color: filled ? AppColors.background : AppColors.onSurface,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const topBar = () => (
    <View
      style={{
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 12,
        paddingBottom: 8,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={goBack}
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: AppColors.surfaceLow,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name="chevron-left" size={26} color={AppColors.onSurface} />
      </TouchableOpacity>
      <View style={{ width: 16 }} />
      <View style={{ flex: 1 }}>
        <View
          style={{
            height: 6,
            borderRadius: 100,
            backgroundColor: AppColors.surfaceHigh,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: 6,
              borderRadius: 100,
              width: `${(completedSets / sets.length) * 100}%`,
              backgroundColor: AppColors.primary,
            }}
          />
        </View>
      </View>
      <View style={{ width: 12 }} />
      <Text
        style={{
          fontSize: 13,
          color: AppColors.muted,
          fontWeight: "700",
          letterSpacing: 1.1,
        }}
      >
        {`${completedSets} / ${sets.length}`}
      </Text>
    </View>
  );

  const restPanel = () => {
    const mm = String(Math.floor(restSeconds / 60)).padStart(1, "0");
    const ss = String(restSeconds % 60).padStart(2, "0");
    return (
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 16,
          backgroundColor: AppColors.surfaceLow,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View style={{ alignItems: "flex-start" }}>
          <Text
            style={{
              fontSize: 11,
              letterSpacing: 2,
              color: AppColors.muted,
              fontWeight: "800",
            }}
          >
            {t("demo.rest_label")}
          </Text>
          <View style={{ height: 4 }} />
          <Text
            style={{
              fontSize: 32,
              fontWeight: "800",
              color: AppColors.onSurface,
              letterSpacing: -1,
            }}
          >
            {`${mm}:${ss}`}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        {miniButton("−10s", () => adjustRest(-10))}
        <View style={{ width: 8 }} />
        {miniButton("+10s", () => adjustRest(10))}
        <View style={{ width: 8 }} />
        {miniButton("SKIP", skipRest, true)}
      </View>
    );
  };

  const completionView = () => (
    <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, alignItems: "center" }}>
      <View style={{ height: 32 }} />
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          borderWidth: 2,
          borderColor: AppColors.onSurface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name="check" size={56} color={AppColors.onSurface} />
      </View>
      <View style={{ height: 28 }} />
      <Text
        style={{
          fontSize: 32,
          fontWeight: "800",
          letterSpacing: -1,
          color: AppColors.onSurface,
        }}
      >
        {t("demo.done_title")}
      </Text>
      <View style={{ height: 8 }} />
      <Text
        style={{ fontSize: 15, color: AppColors.muted, lineHeight: 22.5, textAlign: "center" }}
      >
        {t("demo.done_body")}
      </Text>
      <View style={{ flex: 1 }} />
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onSaveProgress}
        style={{
          width: "100%",
          paddingVertical: 18,
          borderRadius: 100,
          backgroundColor: AppColors.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700", color: AppColors.background }}>
          {t("demo.save_progress")}
        </Text>
      </TouchableOpacity>
      <View style={{ height: 12 }} />
      <TouchableOpacity activeOpacity={0.7} onPress={goBack} style={{ paddingVertical: 12 }}>
        <Text style={{ fontSize: 14, color: AppColors.muted, fontWeight: "700" }}>
          {t("demo.back_to_plan")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {topBar()}
        <View style={{ flex: 1 }}>
          {allDone ? (
            completionView()
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 }}>
              <Text
                style={{
                  fontSize: 11,
                  letterSpacing: 2,
                  color: AppColors.muted,
                  fontWeight: "800",
                }}
              >
                {t("demo.badge_demo")}
              </Text>
              <View style={{ height: 8 }} />
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "800",
                  letterSpacing: -1,
                  color: AppColors.onSurface,
                }}
              >
                Bench Press
              </Text>
              <View style={{ height: 4 }} />
              <Text style={{ fontSize: 13, color: AppColors.muted }}>
                {t("demo.bench_muscles")}
              </Text>
              <View style={{ height: 24 }} />
              {sets.map((set, i) => setRow(i, set))}
              <View style={{ height: 8 }} />
              <Text
                style={{
                  fontSize: 12,
                  color: "rgba(142,142,147,0.8)",
                  fontStyle: "italic",
                }}
              >
                {t("demo.try_hint")}
              </Text>
            </ScrollView>
          )}
        </View>
        {resting && restPanel()}
      </View>
    </Screen>
  );
}
