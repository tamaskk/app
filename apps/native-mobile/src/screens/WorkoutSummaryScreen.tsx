// Ported 1:1 from apps/mobile/lib/screens/workout_summary_screen.dart.
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Screen } from "../components/ui";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";
import { Api } from "../lib/api";
import { WorkoutSession, SavedExercise, SavedSet, RankDelta } from "../models/apiModels";
import { rankForTier, RankDef } from "../models/rank";
import { RankUpOverlay } from "../components/RankUpOverlay";
import { titleCase } from "../utils/text";
import { exLabel } from "../utils/exerciseLabels";
import { t } from "../i18n";
import type { RootNav } from "../navigation/types";

/// Localized 3-letter month abbreviation for a 1-based month number.
function monthAbbr(month: number): string {
  return t(`summary.month_${month}`);
}

function fmtDate(d: Date): string {
  return `${monthAbbr(d.getMonth() + 1)}. ${d.getDate()}.`;
}

function fmtDur(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/// Best estimated 1RM across an exercise's sets (Epley). 0 for bodyweight.
function best1rm(sets: SavedSet[]): number {
  return sets.reduce((a, s) => Math.max(a, s.kg * (1 + s.reps / 30.0)), 0.0);
}

function exKey(e: SavedExercise): string {
  return e.exerciseId.length > 0 ? e.exerciseId : e.name.toLowerCase();
}

const api = new Api();

/// Shown right after Finish: the session's stats and each exercise's change
/// vs. the previous time it was performed.
export function WorkoutSummaryScreen({
  navigation,
  session,
  rankDelta,
}: {
  navigation: RootNav;
  session: WorkoutSession;
  rankDelta?: RankDelta | null;
}) {
  useLang(); // re-render on language change
  const [prev, setPrev] = useState<Record<string, number>>({}); // exercise key -> previous 1RM
  const [rankUp, setRankUp] = useState<{ prev: RankDef; next: RankDef; xp: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const all = await api.getSessions();
        all.sort((a, b) => {
          const ad = a.finishedAt ?? a.startedAt;
          const bd = b.finishedAt ?? b.startedAt;
          if (ad == null || bd == null) return 0;
          return bd.getTime() - ad.getTime(); // newest first
        });
        const next: Record<string, number> = {};
        for (const ex of session.exercises) {
          const key = exKey(ex);
          for (const s of all) {
            if (s.id === session.id) continue;
            const found = s.exercises.find((e) => exKey(e) === key);
            if (found != null) {
              next[key] = best1rm(found.sets);
              break; // most recent prior occurrence
            }
          }
        }
        if (mounted) setPrev(next);
      } catch {
        // No comparison data; show the summary without deltas.
      }
    })();
    return () => {
      mounted = false;
    };
  }, [session]);

  // Defer to the next frame so the summary screen is mounted underneath and the
  // user sees it after dismissing the overlay.
  useEffect(() => {
    const delta = rankDelta;
    if (delta == null || !delta.unlocked) return;
    setRankUp({
      prev: rankForTier(delta.previousRank),
      next: rankForTier(delta.newRank),
      xp: delta.xpAwarded,
    });
  }, [rankDelta]);

  const totalReps = session.exercises.reduce(
    (a, e) => a + e.sets.reduce((b, s) => b + s.reps, 0),
    0,
  );

  const muscles = (() => {
    const set = new Set<string>();
    for (const e of session.exercises) {
      for (const m of e.targetMuscles) set.add(m);
    }
    return Array.from(set);
  })();

  const s = session;
  const date = s.finishedAt ?? s.startedAt;

  const stat = (label: string, value: string) => (
    <View style={{ alignItems: "flex-start" }}>
      <Text style={{ color: AppColors.muted, fontSize: 12 }}>{label}</Text>
      <View style={{ height: 4 }} />
      <Text style={{ fontSize: 26, fontWeight: "800", color: AppColors.onSurface }}>{value}</Text>
    </View>
  );

  const exerciseRow = (ex: SavedExercise, i: number) => {
    const current = best1rm(ex.sets);
    const p = prev[exKey(ex)];
    const pct = p != null && p > 0 && current > 0 ? ((current - p) / p) * 100 : null;
    const subtitleParts: string[] = [];
    if (ex.targetMuscles.length > 0) {
      subtitleParts.push(titleCase(exLabel(ex.targetMuscles[0])));
    }
    subtitleParts.push(`${ex.sets.length} set`);
    if (ex.kcal != null) {
      subtitleParts.push(`${Math.round(ex.kcal)} kcal`);
    }

    return (
      <View
        key={i}
        style={{
          paddingVertical: 14,
          borderTopWidth: 1,
          borderTopColor: AppColors.outline,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1, alignItems: "flex-start" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                numberOfLines={1}
                style={{
                  flexShrink: 1,
                  fontSize: 17,
                  fontWeight: "700",
                  color: AppColors.onSurface,
                }}
              >
                {titleCase(ex.name)}
              </Text>
              {pct != null && (
                <>
                  <View style={{ width: 8 }} />
                  <MaterialIcons
                    name={pct >= 0 ? "arrow-upward" : "arrow-downward"}
                    size={13}
                    color={pct >= 0 ? AppColors.accentGreen : AppColors.accentRed}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: pct >= 0 ? AppColors.accentGreen : AppColors.accentRed,
                    }}
                  >
                    {`${Math.abs(pct).toFixed(2)} %`}
                  </Text>
                </>
              )}
            </View>
            <View style={{ height: 2 }} />
            <Text style={{ color: AppColors.muted, fontSize: 13 }}>
              {subtitleParts.join(" · ")}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" color={AppColors.muted} size={20} />
        </View>
      </View>
    );
  };

  return (
    <Screen edges={["top", "left", "right"]}>
      <View style={{ height: 56, justifyContent: "center" }}>
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 0, paddingBottom: 32 }}>
        {/* Muscle chips. */}
        {muscles.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {muscles.map((m, i) => (
              <View
                key={i}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 100,
                  borderWidth: 1,
                  borderColor: AppColors.outline,
                }}
              >
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: AppColors.onSurface }}
                >
                  {titleCase(m)}
                </Text>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 16 }} />
        {date != null && (
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: AppColors.muted, fontSize: 16 }}>{fmtDate(date)}</Text>
          </View>
        )}
        <View style={{ height: 4 }} />
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "800",
              letterSpacing: -1,
              color: AppColors.onSurface,
            }}
          >
            {titleCase(s.name.length === 0 ? t("summary.workout") : s.name)}
          </Text>
        </View>
        <View style={{ height: 28 }} />

        {/* Stats. */}
        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1 }}>
            {stat("Duration", s.durationMs != null ? fmtDur(s.durationMs) : "–")}
          </View>
          <View style={{ flex: 1 }}>{stat("Sets", `${s.totalSets}`)}</View>
          <View style={{ flex: 1 }}>{stat("Reps", `${totalReps}`)}</View>
          {s.hasKcal && (
            <View style={{ flex: 1 }}>{stat("Kcal", `${Math.round(s.totalKcal)}`)}</View>
          )}
        </View>
        <View style={{ height: 24 }} />

        {session.exercises.map((ex, i) => exerciseRow(ex, i))}
      </ScrollView>

      {rankUp && (
        <RankUpOverlay
          visible
          previousRank={rankUp.prev}
          newRank={rankUp.next}
          xpAwarded={rankUp.xp}
          onClose={() => setRankUp(null)}
        />
      )}
    </Screen>
  );
}
