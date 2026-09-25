// Ported 1:1 from apps/mobile/lib/widgets/yearly_heatmap.dart.
import React, { useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  type LayoutChangeEvent,
} from "react-native";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";

/// GitHub-style 365-day heatmap. Rows = weekday (Mon..Sun), columns = ISO
/// weeks of the chosen [year]. Cell shade is a 5-step monochrome ramp from
/// off (no workout) → bright white (top intensity bucket).
///
/// Pass in a map of `dayKey → intensity` where intensity is any non-negative
/// number you choose (volume in kg, sets count, minutes — whichever metric you
/// want to visualise). Keys must be produced with [yearlyHeatmapKey] so the
/// lookup matches the internal per-cell key. When [year] is the current year
/// the grid auto-scrolls to the current week so recent activity is in view.
export interface YearlyHeatmapProps {
  year: number;
  dayIntensity: Map<string, number>;
  cellSize?: number;
  cellGap?: number;
}

/// Canonical day key mirroring Dart's `DateTime(year, month, day)` map keys.
/// month is 1..12, day is 1..31.
export function yearlyHeatmapKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

// Bucketed shades, dimmest → brightest. The "off" colour is a touch lighter
// than the surrounding card so empty cells still read as a grid (an off cell
// matching the card background made the whole heatmap look blank).
const _shades = [
  "#2A2A2A", // 0 — no activity (visible on the surfaceLow card)
  "#454343",
  "#6E6C6C",
  "#B5B3B3",
  "#FFFFFF", // top bucket
];

// ISO weekday: Mon=1 .. Sun=7 (JS getDay is Sun=0 .. Sat=6).
function isoWeekday(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1;
}

// DST-safe whole-day arithmetic — normalise to a UTC day number.
function epochDay(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function _shadeFor(intensity: number, max: number): string {
  if (max <= 0 || intensity <= 0) return _shades[0];
  const ratio = Math.max(0, Math.min(1, intensity / max));
  // 4 visible buckets (skip 0). 0.001..0.25 → 1, .25..0.5 → 2, etc.
  const bucket = Math.max(1, Math.min(4, Math.ceil(ratio * 4)));
  return _shades[bucket];
}

interface MonthLabel {
  name: string;
  week: number;
}

export function YearlyHeatmap({
  year,
  dayIntensity,
  cellSize = 12,
  cellGap = 3,
}: YearlyHeatmapProps) {
  const { t } = useLang();
  const scrollRef = useRef<ScrollView>(null);
  const didScroll = useRef(false);

  const jan1 = new Date(year, 0, 1);
  // Grid starts on the Monday on/before Jan 1.
  const gridStart = addDays(jan1, -(isoWeekday(jan1) - 1));
  const dec31 = new Date(year, 11, 31);
  // Grid spans from the Monday before Jan 1 to the Sunday after Dec 31.
  const gridEnd = addDays(dec31, 7 - isoWeekday(dec31));
  const totalDays = epochDay(gridEnd) - epochDay(gridStart) + 1;
  const weeks = Math.trunc(totalDays / 7);

  const max = Array.from(dayIntensity.values()).reduce(
    (a, b) => (b > a ? b : a),
    0,
  );

  // Month label start columns for the top axis.
  const months: MonthLabel[] = [];
  for (let m = 1; m <= 12; m++) {
    const first = new Date(year, m - 1, 1);
    const week = Math.trunc((epochDay(first) - epochDay(gridStart)) / 7);
    // First letter of the localized short month name — keeps the axis to a
    // single glyph while staying in the active language (EN 'A' for April,
    // HU 'Á', etc.).
    months.push({ name: t(`month.${m}`).substring(0, 1), week });
  }

  const today = new Date();

  const colWidth = cellSize + cellGap;
  const rowHeight = cellSize + cellGap;
  const gridWidth = weeks * colWidth;

  const onLayout = (e: LayoutChangeEvent) => {
    // Jump to the current week on first layout so the newest columns (recent
    // workouts) are visible instead of an empty January.
    if (didScroll.current) return;
    didScroll.current = true;
    const now = new Date();
    if (year !== now.getFullYear()) return;
    const currentWeek = Math.trunc((epochDay(now) - epochDay(gridStart)) / 7);
    const viewport = e.nativeEvent.layout.width;
    // Centre the current week in the viewport.
    const target = (currentWeek + 0.5) * colWidth - viewport / 2;
    scrollRef.current?.scrollTo({ x: Math.max(0, target), animated: false });
  };

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={onLayout}
      contentContainerStyle={{ paddingHorizontal: 4 }}
    >
      <View style={{ alignItems: "flex-start" }}>
        {/* Month label strip across the top. */}
        <View style={{ width: gridWidth, height: 14 }}>
          {months.map((m, i) => (
            <Text
              key={i}
              style={{
                position: "absolute",
                left: m.week * colWidth,
                top: 0,
                fontSize: 9,
                letterSpacing: 1,
                color: AppColors.muted,
                fontWeight: "700",
              }}
            >
              {m.name}
            </Text>
          ))}
        </View>
        <View style={{ height: 6 }} />
        {/* 7 rows (Mon..Sun) × N week columns. */}
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {Array.from({ length: weeks }, (_unused, w) => (
            <View key={w} style={{ marginRight: cellGap }}>
              {Array.from({ length: 7 }, (_u, dow) => {
                const cellDate = addDays(gridStart, w * 7 + dow);
                const inYear = cellDate.getFullYear() === year;
                if (!inYear) {
                  // Off-year placeholder keeps row alignment without bleeding
                  // shade in. Transparent = invisible cell.
                  return (
                    <View
                      key={dow}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        marginBottom: cellGap,
                      }}
                    />
                  );
                }
                const key = yearlyHeatmapKey(cellDate);
                const intensity = dayIntensity.get(key) ?? 0;
                const isToday =
                  cellDate.getFullYear() === today.getFullYear() &&
                  cellDate.getMonth() === today.getMonth() &&
                  cellDate.getDate() === today.getDate();
                return (
                  <View
                    key={dow}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      marginBottom: cellGap,
                      backgroundColor: _shadeFor(intensity, max),
                      borderRadius: 2,
                      // Ring today's cell so "now" is easy to spot.
                      ...(isToday
                        ? { borderWidth: 1, borderColor: AppColors.onSurface }
                        : null),
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
        <View style={{ height: rowHeight }} />
        {/* 5-step legend: kevés → sok. */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: 2,
          }}
        >
          <Text
            style={{
              fontSize: 9,
              letterSpacing: 1,
              color: AppColors.muted,
              fontWeight: "700",
            }}
          >
            {t("heatmap.less")}
          </Text>
          <View style={{ width: 6 }} />
          {_shades.map((c, i) => (
            <React.Fragment key={i}>
              <View
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: c,
                  borderRadius: 2,
                }}
              />
              <View style={{ width: cellGap }} />
            </React.Fragment>
          ))}
          <View style={{ width: 4 }} />
          <Text
            style={{
              fontSize: 9,
              letterSpacing: 1,
              color: AppColors.muted,
              fontWeight: "700",
            }}
          >
            {t("heatmap.more")}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
