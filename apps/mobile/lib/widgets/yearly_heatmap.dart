import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../i18n/app_strings.dart';

/// GitHub-style 365-day heatmap. Rows = weekday (Mon..Sun), columns = ISO
/// weeks of the chosen [year]. Cell shade is a 5-step monochrome ramp from
/// off (no workout) → bright white (top intensity bucket).
///
/// Pass in a map of `DateTime(day) → intensity` where intensity is any
/// non-negative number you choose (volume in kg, sets count, minutes —
/// whichever metric you want to visualise).
class YearlyHeatmap extends StatelessWidget {
  final int year;
  final Map<DateTime, double> dayIntensity;
  final double cellSize;
  final double cellGap;

  const YearlyHeatmap({
    super.key,
    required this.year,
    required this.dayIntensity,
    this.cellSize = 10,
    this.cellGap = 3,
  });

  // Bucketed shades, dimmest → brightest. The "off" colour matches
  // surfaceHigh so empty cells still register as a grid.
  static const _shades = [
    Color(0xFF1C1B1B), // 0 — no activity
    Color(0xFF3A3838),
    Color(0xFF6E6C6C),
    Color(0xFFB5B3B3),
    Color(0xFFFFFFFF), // top bucket
  ];

  Color _shadeFor(double intensity, double max) {
    if (max <= 0 || intensity <= 0) return _shades[0];
    final ratio = (intensity / max).clamp(0.0, 1.0);
    // 4 visible buckets (skip 0). 0.001..0.25 → 1, .25..0.5 → 2, etc.
    final bucket = (ratio * 4).ceil().clamp(1, 4);
    return _shades[bucket];
  }

  /// Months and the column index they start at — used for the top axis labels.
  List<_MonthLabel> _monthLabels(DateTime jan1) {
    final out = <_MonthLabel>[];
    for (var m = 1; m <= 12; m++) {
      final first = DateTime(year, m, 1);
      final week = first.difference(jan1).inDays ~/ 7;
      // First letter of the localized short month name — keeps the axis to a
      // single glyph while staying in the active language (EN 'A' for April,
      // HU 'Á', etc.).
      out.add(_MonthLabel(t('month.$m').substring(0, 1), week));
    }
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final jan1 = DateTime(year, 1, 1);
    final dec31 = DateTime(year, 12, 31);
    // Grid spans from the Monday before Jan 1 to the Sunday after Dec 31.
    final gridStart = jan1.subtract(Duration(days: jan1.weekday - 1));
    final gridEnd = dec31.add(Duration(days: 7 - dec31.weekday));
    final totalDays = gridEnd.difference(gridStart).inDays + 1;
    final weeks = totalDays ~/ 7;

    final max =
        dayIntensity.values.fold<double>(0, (a, b) => b > a ? b : a);
    final months = _monthLabels(gridStart);

    final colWidth = cellSize + cellGap;
    final rowHeight = cellSize + cellGap;
    final gridWidth = weeks * colWidth;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Month label strip across the top.
          SizedBox(
            width: gridWidth,
            height: 14,
            child: Stack(
              children: [
                for (final m in months)
                  Positioned(
                    left: m.week * colWidth,
                    top: 0,
                    child: Text(
                      m.name,
                      style: const TextStyle(
                        fontSize: 9,
                        letterSpacing: 1,
                        color: AppColors.muted,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          // 7 rows (Mon..Sun) × N week columns.
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (var w = 0; w < weeks; w++)
                Padding(
                  padding: EdgeInsets.only(right: cellGap),
                  child: Column(
                    children: List.generate(7, (dow) {
                      final cellDate =
                          gridStart.add(Duration(days: w * 7 + dow));
                      final inYear = cellDate.year == year;
                      if (!inYear) {
                        // Off-year placeholder keeps row alignment without
                        // bleeding shade in. Transparent = invisible cell.
                        return Padding(
                          padding: EdgeInsets.only(bottom: cellGap),
                          child: SizedBox(width: cellSize, height: cellSize),
                        );
                      }
                      final key = DateTime(
                          cellDate.year, cellDate.month, cellDate.day);
                      final intensity = dayIntensity[key] ?? 0;
                      return Padding(
                        padding: EdgeInsets.only(bottom: cellGap),
                        child: Container(
                          width: cellSize,
                          height: cellSize,
                          decoration: BoxDecoration(
                            color: _shadeFor(intensity, max),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      );
                    }),
                  ),
                ),
            ],
          ),
          SizedBox(height: rowHeight),
          // 5-step legend: kevés → sok.
          Padding(
            padding: const EdgeInsets.only(left: 2),
            child: Row(
              children: [
                Text(
                  t('heatmap.less'),
                  style: const TextStyle(
                    fontSize: 9,
                    letterSpacing: 1,
                    color: AppColors.muted,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(width: 6),
                for (final c in _shades) ...[
                  Container(
                    width: cellSize,
                    height: cellSize,
                    decoration: BoxDecoration(
                      color: c,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  SizedBox(width: cellGap),
                ],
                const SizedBox(width: 4),
                Text(
                  t('heatmap.more'),
                  style: const TextStyle(
                    fontSize: 9,
                    letterSpacing: 1,
                    color: AppColors.muted,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MonthLabel {
  final String name;
  final int week;
  const _MonthLabel(this.name, this.week);
}
