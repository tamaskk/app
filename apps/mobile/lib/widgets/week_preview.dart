import 'package:flutter/material.dart';
import '../i18n/app_strings.dart';
import '../theme/app_theme.dart';

/// Renders a 7-day grid based on a chosen split (full_body / upper_lower /
/// push_pull_legs / bro) and how many training days per week. Each cell
/// reads either REST or WORKOUT — the planner doesn't track muscle
/// groups any more (see weekly_plan_edit_screen.dart), so the strip
/// follows the same binary.
///
/// Used in two places:
///   1. Onboarding Volume Reveal step — preview of the plan being saved.
///   2. Dashboard above the stats grid — daily visual reminder of the plan.
class WeekPreview extends StatelessWidget {
  final String? split;
  final int daysPerWeek;
  // Optional 0..6 (Mon=0) index to highlight as "today".
  final int? todayIndex;
  // When set, overrides the auto-generated REST/WORKOUT layout with the
  // user's saved 7-day plan. Any non-`rest` token (legacy push/chest/…
  // included) renders as WORKOUT — the planner UI only writes `rest` or
  // `workout` going forward.
  final List<String>? customPlan;

  const WeekPreview({
    super.key,
    required this.split,
    required this.daysPerWeek,
    this.todayIndex,
    this.customPlan,
  });

  // Day-of-week initials keyed by language. The planner editor uses these
  // same translation keys.
  static const _dayKeys = [
    'plan.day_short_h',
    'plan.day_short_k',
    'plan.day_short_sze',
    'plan.day_short_cs',
    'plan.day_short_p',
    'plan.day_short_szo',
    'plan.day_short_v',
  ];

  // Deterministic spread of N training days across the week so rest sits
  // between them when possible (no two workouts in a row at low frequencies).
  List<int> _spreadDays(int n) {
    if (n <= 0) return [];
    if (n >= 7) return [0, 1, 2, 3, 4, 5, 6];
    final result = <int>[];
    final step = 7 / n;
    for (var i = 0; i < n; i++) {
      result.add((i * step).round().clamp(0, 6));
    }
    return result;
  }

  /// 7 booleans — true = workout day, false = rest.
  List<bool> _weekDays() {
    if (customPlan != null && customPlan!.length == 7) {
      return customPlan!
          .map((token) => token.toLowerCase().trim() != 'rest')
          .toList();
    }
    final positions = _spreadDays(daysPerWeek.clamp(0, 7));
    final week = List<bool>.filled(7, false);
    for (final p in positions) {
      week[p] = true;
    }
    return week;
  }

  @override
  Widget build(BuildContext context) {
    final days = _weekDays();
    final restLabel = t('plan.chip_rest');
    final workLabel = t('plan.chip_workout');
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceLow,
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: List.generate(7, (i) {
          final isWorkout = days[i];
          final isToday = todayIndex == i;
          return Column(
            children: [
              Text(
                t(_dayKeys[i]),
                style: TextStyle(
                  fontSize: 11,
                  letterSpacing: 1.2,
                  color: isToday ? AppColors.onSurface : AppColors.muted,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 6),
              Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: isWorkout ? AppColors.primary : Colors.transparent,
                  border: Border.all(
                    color: isToday
                        ? AppColors.onSurface
                        : (isWorkout
                            ? Colors.transparent
                            : AppColors.surfaceHigh),
                    width: isToday ? 2 : 1,
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  isWorkout ? workLabel : restLabel,
                  maxLines: 1,
                  overflow: TextOverflow.fade,
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                    color: isWorkout ? AppColors.background : AppColors.muted,
                  ),
                ),
              ),
            ],
          );
        }),
      ),
    );
  }
}
