// Ported 1:1 from apps/mobile/lib/widgets/muscle_heatmap.dart.
import React from "react";
import { View, Text } from "react-native";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";
import type { WorkoutSession } from "../models/apiModels";

/// Volume-by-muscle landmark from RP. Used as a soft reference on the bar —
/// 0 → MAV reads as 100% width even though MRV could be higher.
const _muscleMav: Record<string, number> = {
  chest: 14,
  mell: 14,
  back: 16,
  lats: 16,
  hát: 16,
  shoulders: 16,
  váll: 16,
  biceps: 14,
  bicepsz: 14,
  triceps: 14,
  tricepsz: 14,
  forearms: 12,
  alkar: 12,
  quads: 14,
  quadricepsz: 14,
  comb: 14,
  hamstrings: 12,
  glutes: 12,
  far: 12,
  calves: 14,
  vádli: 14,
  abs: 16,
  has: 16,
};

function _muscleMavFor(name: string): number {
  const lc = name.toLowerCase().trim();
  for (const [key, value] of Object.entries(_muscleMav)) {
    if (lc.includes(key)) return value;
  }
  return 14; // sensible default
}

export interface MuscleVolumeChartProps {
  sessions: WorkoutSession[];
  maxRows?: number;
}

/// Renders a horizontal bar list of muscles trained in the given sessions,
/// most-trained first. Each row shows the muscle, the set count, and a
/// bar whose length is proportional to MAV.
///
/// Text-only / typography-driven — keeps the brutalist monochrome consistent.
export function MuscleVolumeChart({ sessions, maxRows = 6 }: MuscleVolumeChartProps) {
  const _aggregate = (): Map<string, number> => {
    const out = new Map<string, number>();
    for (const s of sessions) {
      for (const ex of s.exercises) {
        // Skip warmup sets here would require a separate flag; for now we
        // count every set the user performed.
        const setCount = ex.sets.filter((x) => x.reps > 0).length;
        if (setCount === 0) continue;
        // Distribute the sets across each target muscle. A bench-press set
        // contributes to chest AND triceps AND front delts.
        for (const m of ex.targetMuscles) {
          const key = m.trim();
          if (key.length === 0) continue;
          out.set(key, (out.get(key) ?? 0) + setCount);
        }
      }
    }
    return out;
  };

  const agg = _aggregate();
  if (agg.size === 0) return null;
  const entries = Array.from(agg.entries()).sort((a, b) => b[1] - a[1]);
  const shown = entries.slice(0, maxRows);
  return (
    <View style={{ alignItems: "flex-start" }}>
      {shown.map(([name, sets]) => (
        <View key={name} style={{ alignSelf: "stretch", marginBottom: 10 }}>
          <MuscleRow name={name} sets={sets} mav={_muscleMavFor(name)} />
        </View>
      ))}
    </View>
  );
}

function MuscleRow({ name, sets, mav }: { name: string; sets: number; mav: number }) {
  const { t } = useLang();
  // 0..MAV maps to 0..1 fill; above MAV stays clamped at full so the bar
  // never visually overflows.
  const fill = Math.max(0, Math.min(1, sets / mav));
  const hint =
    sets >= mav ? t("heatmap.optimal") : t("heatmap.to_goal", { n: mav - sets });
  return (
    <View style={{ alignItems: "flex-start" }}>
      <View style={{ flexDirection: "row", alignSelf: "stretch" }}>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            flex: 1,
            fontSize: 12,
            fontWeight: "800",
            letterSpacing: 1.2,
            color: AppColors.onSurface,
          }}
        >
          {name.toUpperCase()}
        </Text>
        <Text
          style={{
            fontSize: 11,
            letterSpacing: 1.2,
            fontWeight: "700",
            color: AppColors.muted,
          }}
        >
          {`${sets} SET`}
        </Text>
      </View>
      <View style={{ height: 6 }} />
      <View
        style={{
          height: 4,
          alignSelf: "stretch",
          borderRadius: 4,
          overflow: "hidden",
          backgroundColor: AppColors.surfaceHigh,
        }}
      >
        <View
          style={{
            height: 4,
            width: `${fill * 100}%`,
            backgroundColor: AppColors.onSurface,
          }}
        />
      </View>
      <View style={{ height: 4 }} />
      <Text
        style={{
          fontSize: 10,
          letterSpacing: 1,
          color: AppColors.muted,
          fontWeight: "700",
        }}
      >
        {hint}
      </Text>
    </View>
  );
}
