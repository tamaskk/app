// Ported 1:1 from apps/mobile/lib/screens/predefined_workout_screen.dart.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { Screen } from "../components/ui";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";
import { Api, ApiException, FreeTierLimitException } from "../lib/api";
import { ExerciseApi, ApiExercise } from "../lib/exerciseApi";
import { PredefinedWorkout } from "../data/predefinedWorkouts";
import { ExerciseImage } from "../components/ExerciseImage";
import { titleCase } from "../utils/text";
import { t } from "../i18n";
import type { RootNav } from "../navigation/types";

const exApi = new ExerciseApi();
const api = new Api();

// How many exercises to pull per muscle group.
const PER_GROUP = 4;

/// Deterministic Fisher-Yates seeded by the list length — mirrors the Dart
/// `[...items]..shuffle(Random(items.length))`. (The PRNG differs from Dart's
/// `dart:math` Random, so the exact ordering is not identical, but the pick is
/// stable per catalogue page.)
function seededShuffle<T>(list: T[], seed: number): T[] {
  const a = [...list];
  let state = seed >>> 0;
  const rand = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  let length = a.length;
  while (length > 1) {
    const pos = Math.floor(rand() * length);
    length -= 1;
    const tmp = a[length];
    a[length] = a[pos];
    a[pos] = tmp;
  }
  return a;
}

/// Shows a predefined "story" workout: a cover, the two muscle groups, and a
/// set of exercises generated live from the catalogue. The user can save it to
/// their own trainings (with sensible default sets).
export function PredefinedWorkoutScreen({
  navigation,
  workout,
}: {
  navigation: RootNav;
  workout: PredefinedWorkout;
}) {
  useLang(); // re-render on language change
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ApiExercise[]>([]);
  const [coverError, setCoverError] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const seen = new Set<string>();
      const combined: ApiExercise[] = [];
      for (const group of workout.groups) {
        const page = await exApi.listExercises({
          targetMuscles: [group.query],
          limit: 16,
        });
        const shuffled = seededShuffle(page.items, page.items.length);
        let taken = 0;
        for (const e of shuffled) {
          if (taken >= PER_GROUP) break;
          if (seen.has(e.exerciseId)) continue;
          seen.add(e.exerciseId);
          combined.push(e);
          taken += 1;
        }
      }
      if (!mounted.current) return;
      setExercises(combined);
    } catch (e) {
      if (!mounted.current) return;
      if (e instanceof ApiException) {
        setError(e.message);
      } else {
        setError(t("pw.db_unreachable"));
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const save = async () => {
    if (exercises.length === 0) return;
    setSaving(true);
    try {
      await api.createTraining(
        workout.title,
        exercises.map((e) => ({
          exerciseId: e.exerciseId,
          name: e.name,
          gifUrl: e.gifUrl,
          targetMuscles: e.targetMuscles,
          sets: Array.from({ length: 3 }, () => ({ kg: 0, reps: 0 })),
        })),
      );
      if (mounted.current) navigation.goBack();
    } catch (e) {
      if (e instanceof FreeTierLimitException) {
        // Free user already at the cap — explain it and offer the paywall
        // instead of the misleading "is the server running?" message.
        if (mounted.current) showFreeTierLimit(e.limit);
      } else if (e instanceof ApiException) {
        snack(e.message);
      } else {
        snack(t("pw.save_failed"));
      }
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  /// Modal explaining the free-tier ceiling + a single CTA into the paywall.
  const showFreeTierLimit = (limit: number) => {
    Alert.alert(t("free_limit.title"), t("free_limit.body", { n: limit }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("free_limit.cta"), onPress: () => navigation.navigate("Paywall") },
    ]);
  };

  const snack = (msg: string) => {
    Alert.alert(msg);
  };

  const cover = (w: PredefinedWorkout) => (
    <View
      style={{
        borderRadius: 24,
        overflow: "hidden",
        aspectRatio: 16 / 9,
        backgroundColor: AppColors.surfaceLow,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {coverError ? (
        <MaterialIcons name="fitness-center" color={AppColors.muted} size={40} />
      ) : (
        // Grayscale cover (Dart applies a ColorFilter matrix); expo-image has no
        // color-matrix filter, so the cover renders in color.
        <Image
          source={{ uri: w.imageUrl }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          onError={() => setCoverError(true)}
        />
      )}
    </View>
  );

  const exerciseRow = (i: number, ex: ApiExercise) => (
    <View
      key={i}
      style={{
        paddingVertical: 12,
        ...(i === 0
          ? {}
          : { borderTopWidth: 1, borderTopColor: AppColors.outline }),
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 10,
            overflow: "hidden",
            backgroundColor: AppColors.surfaceHigh,
          }}
        >
          <ExerciseImage frames={ex.imageFrames} iconSize={18} compact />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1, alignItems: "flex-start" }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 15, fontWeight: "700", color: AppColors.onSurface }}
          >
            {titleCase(ex.name)}
          </Text>
          {ex.muscleSummary.length > 0 && (
            <>
              <View style={{ height: 2 }} />
              <Text
                numberOfLines={1}
                style={{ fontSize: 12, color: AppColors.muted }}
              >
                {titleCase(ex.muscleSummary)}
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );

  const body = (w: PredefinedWorkout) => {
    if (loading) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={AppColors.onSurface} />
        </View>
      );
    }
    if (error != null) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <View style={{ padding: 32, alignItems: "center" }}>
            <MaterialIcons name="cloud-off" color={AppColors.muted} size={40} />
            <View style={{ height: 12 }} />
            <Text style={{ color: AppColors.muted, textAlign: "center" }}>{error}</Text>
            <View style={{ height: 16 }} />
            <TouchableOpacity activeOpacity={0.7} onPress={load} style={{ paddingVertical: 8, paddingHorizontal: 8 }}>
              <Text style={{ color: AppColors.onSurface, fontSize: 14 }}>{t("common.retry")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return (
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}>
        {cover(w)}
        <View style={{ height: 20 }} />
        <Text
          style={{
            fontSize: 30,
            fontWeight: "800",
            letterSpacing: -1,
            color: AppColors.onSurface,
          }}
        >
          {w.title}
        </Text>
        <View style={{ height: 4 }} />
        <Text style={{ color: AppColors.muted, fontSize: 14 }}>
          {t("pw.subtitle_count", { subtitle: w.subtitle, count: exercises.length })}
        </Text>
        <View style={{ height: 20 }} />
        {exercises.map((ex, i) => exerciseRow(i, ex))}
      </ScrollView>
    );
  };

  const saveBar = () => (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={saving}
        onPress={saving ? undefined : save}
        style={{
          width: "100%",
          paddingVertical: 16,
          borderRadius: 16,
          backgroundColor: AppColors.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {saving ? (
          <ActivityIndicator size="small" color={AppColors.background} />
        ) : (
          <Text style={{ fontWeight: "700", fontSize: 15, color: AppColors.background }}>
            {t("pw.add_to_my_workouts")}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <View style={{ height: 56, justifyContent: "center" }}>
        <Text
          style={{
            textAlign: "center",
            fontSize: 16,
            fontWeight: "700",
            color: AppColors.onSurface,
            letterSpacing: 0.5,
          }}
        >
          {t("pw.appbar_title")}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            position: "absolute",
            left: 4,
            top: 0,
            bottom: 0,
            width: 48,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="arrow-back" size={24} color={AppColors.onSurface} />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>{body(workout)}</View>
      {!loading && error == null && exercises.length > 0 && saveBar()}
    </Screen>
  );
}
