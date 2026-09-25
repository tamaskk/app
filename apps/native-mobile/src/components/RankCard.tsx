// Ported 1:1 from apps/mobile/lib/widgets/rank_card.dart.
//
// The signature rank visual — a huge roman numeral above the rank name.
// Used on the Account rank section, the rank-up overlay, and the dashboard
// chip (small variant).
//
// The first 5 tiers render with an outlined numeral and the last 5 with a
// solid filled numeral — the brand cue for "you've crossed the halfway point".
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { RankDef } from "../models/rank";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";

export interface RankCardProps {
  rank: RankDef;
  xp: number;
  nextRank: RankDef | null;
  percentToNext: number;
}

export function RankCard({ rank, xp, nextRank, percentToNext }: RankCardProps) {
  const { t } = useLang();
  const solid = rank.tier >= 6;
  const pct = Math.max(0, Math.min(1, percentToNext));

  return (
    <View
      style={{
        width: "100%",
        paddingLeft: 24,
        paddingTop: 28,
        paddingRight: 24,
        paddingBottom: 24,
        backgroundColor: AppColors.surfaceLow,
        borderRadius: 24,
        alignItems: "center",
      }}
    >
      {/* Roman numeral hero. */}
      <Numeral text={rank.numeral} solid={solid} />
      <View style={{ height: 14 }} />
      <View style={{ width: 64, height: 2, backgroundColor: AppColors.surfaceHigh }} />
      <View style={{ height: 14 }} />
      <Text style={{ fontSize: 18, fontWeight: "800", letterSpacing: 3, color: AppColors.onSurface }}>
        {rank.name}
      </Text>
      <View style={{ height: 22 }} />
      <Text
        style={{
          fontSize: 36,
          fontWeight: "800",
          letterSpacing: -1,
          color: AppColors.onSurface,
          lineHeight: 36,
        }}
      >
        {formatXp(xp)}
      </Text>
      <View style={{ height: 4 }} />
      <Text style={{ fontSize: 11, letterSpacing: 1.6, fontWeight: "800", color: AppColors.muted }}>
        XP
      </Text>
      <View style={{ height: 18 }} />
      {nextRank != null ? (
        <>
          <View
            style={{
              width: "100%",
              height: 8,
              borderRadius: 100,
              backgroundColor: AppColors.surfaceHigh,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${pct * 100}%`,
                height: 8,
                borderRadius: 100,
                backgroundColor: AppColors.onSurface,
              }}
            />
          </View>
          <View style={{ height: 10 }} />
          <Text
            style={{
              fontSize: 11,
              letterSpacing: 1.4,
              fontWeight: "800",
              color: AppColors.muted,
              textAlign: "center",
            }}
          >
            {`${formatXp(xp - rank.threshold)} / ${formatXp(nextRank.threshold - rank.threshold)} → ${nextRank.numeral} ${nextRank.name}`}
          </Text>
        </>
      ) : (
        <Text style={{ fontSize: 11, letterSpacing: 1.6, fontWeight: "800", color: AppColors.onSurface }}>
          {t("rank.cap_reached")}
        </Text>
      )}
    </View>
  );
}

/// Compact rank chip — used in the dashboard header next to the streak chip.
export function RankChip({ rank, onTap }: { rank: RankDef; onTap?: () => void }) {
  const { t } = useLang();
  return (
    <TouchableOpacity onPress={onTap} activeOpacity={0.7}>
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: AppColors.surfaceLow,
          borderRadius: 16,
          alignItems: "flex-end",
        }}
      >
        <Text style={{ fontSize: 10, letterSpacing: 1.6, color: AppColors.muted, fontWeight: "800" }}>
          {t("dashboard.rank")}
        </Text>
        <View style={{ height: 2 }} />
        <Text
          style={{
            fontSize: 26,
            fontWeight: "800",
            color: AppColors.onSurface,
            lineHeight: 26,
            letterSpacing: -1,
          }}
        >
          {rank.numeral}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Solid → coloured fill. Outlined → RN has no native text stroke, so a 2px
// onSurface stroke is faked with offset copies behind a surfaceLow fill copy.
const NUMERAL_BASE = {
  fontSize: 96,
  fontWeight: "800",
  letterSpacing: -2,
  lineHeight: 96,
} as const;

const STROKE_OFFSETS: Array<[number, number]> = [
  [-2, -2],
  [0, -2],
  [2, -2],
  [-2, 0],
  [2, 0],
  [-2, 2],
  [0, 2],
  [2, 2],
];

function Numeral({ text, solid }: { text: string; solid: boolean }) {
  if (solid) {
    return <Text style={[NUMERAL_BASE, { color: AppColors.onSurface }]}>{text}</Text>;
  }
  return (
    <View>
      {STROKE_OFFSETS.map(([dx, dy], i) => (
        <Text
          key={i}
          style={[
            NUMERAL_BASE,
            styles.strokeCopy,
            { color: AppColors.onSurface, transform: [{ translateX: dx }, { translateY: dy }] },
          ]}
        >
          {text}
        </Text>
      ))}
      <Text style={[NUMERAL_BASE, { color: AppColors.surfaceLow }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strokeCopy: { position: "absolute", top: 0, left: 0 },
});

function formatXp(xp: number): string {
  if (xp >= 1000) {
    const v = xp / 1000;
    return `${v.toFixed(v >= 10 ? 0 : 1).replace(".", ",")}K`;
  }
  return String(xp);
}
