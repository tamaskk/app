// Ported 1:1 from apps/mobile/lib/widgets/week_preview.dart.
import React from "react";
import { View, Text } from "react-native";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";

/// Renders a 7-day grid based on a chosen split (full_body / upper_lower /
/// push_pull_legs / bro) and how many training days per week. Each cell
/// reads either REST or WORKOUT — the planner doesn't track muscle
/// groups any more (see weekly_plan_edit_screen.dart), so the strip
/// follows the same binary.
///
/// Used in two places:
///   1. Onboarding Volume Reveal step — preview of the plan being saved.
///   2. Dashboard above the stats grid — daily visual reminder of the plan.
export interface WeekPreviewProps {
  split: string | null;
  daysPerWeek: number;
  // Optional 0..6 (Mon=0) index to highlight as "today".
  todayIndex?: number | null;
  // When set, overrides the auto-generated REST/WORKOUT layout with the
  // user's saved 7-day plan. Any non-`rest` token (legacy push/chest/…
  // included) renders as WORKOUT — the planner UI only writes `rest` or
  // `workout` going forward.
  customPlan?: string[] | null;
}

// Day-of-week initials keyed by language. The planner editor uses these
// same translation keys.
const _dayKeys = [
  "plan.day_short_h",
  "plan.day_short_k",
  "plan.day_short_sze",
  "plan.day_short_cs",
  "plan.day_short_p",
  "plan.day_short_szo",
  "plan.day_short_v",
];

// Deterministic spread of N training days across the week so rest sits
// between them when possible (no two workouts in a row at low frequencies).
function _spreadDays(n: number): number[] {
  if (n <= 0) return [];
  if (n >= 7) return [0, 1, 2, 3, 4, 5, 6];
  const result: number[] = [];
  const step = 7 / n;
  for (let i = 0; i < n; i++) {
    result.push(Math.max(0, Math.min(6, Math.round(i * step))));
  }
  return result;
}

export function WeekPreview({
  daysPerWeek,
  todayIndex,
  customPlan,
}: WeekPreviewProps) {
  const { t } = useLang();

  /// 7 booleans — true = workout day, false = rest.
  const _weekDays = (): boolean[] => {
    if (customPlan != null && customPlan.length === 7) {
      return customPlan.map((token) => token.toLowerCase().trim() !== "rest");
    }
    const positions = _spreadDays(Math.max(0, Math.min(7, daysPerWeek)));
    const week: boolean[] = new Array(7).fill(false);
    for (const p of positions) {
      week[p] = true;
    }
    return week;
  };

  const days = _weekDays();
  const restLabel = t("plan.chip_rest");
  const workLabel = t("plan.chip_workout");

  return (
    <View
      style={{
        backgroundColor: AppColors.surfaceLow,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 10,
        flexDirection: "row",
        justifyContent: "space-between",
      }}
    >
      {Array.from({ length: 7 }, (_unused, i) => {
        const isWorkout = days[i];
        const isToday = todayIndex === i;
        return (
          <View key={i} style={{ alignItems: "center" }}>
            <Text
              style={{
                fontSize: 11,
                letterSpacing: 1.2,
                color: isToday ? AppColors.onSurface : AppColors.muted,
                fontWeight: "700",
              }}
            >
              {t(_dayKeys[i])}
            </Text>
            <View style={{ height: 6 }} />
            <View
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isWorkout ? AppColors.primary : "transparent",
                borderColor: isToday
                  ? AppColors.onSurface
                  : isWorkout
                    ? "transparent"
                    : AppColors.surfaceHigh,
                borderWidth: isToday ? 2 : 1,
                borderRadius: 10,
              }}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="clip"
                style={{
                  fontSize: 9,
                  fontWeight: "800",
                  letterSpacing: 0.5,
                  color: isWorkout ? AppColors.background : AppColors.muted,
                }}
              >
                {isWorkout ? workLabel : restLabel}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
