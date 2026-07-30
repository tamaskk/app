import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../i18n/app_strings.dart';

/// GitHub-style 365-day heatmap. Rows = weekday (Mon..Sun), columns = ISO
/// weeks of the chosen [year]. Cell shade is a 5-step monochrome ramp from
/// off (no workout) → bright white (top intensity bucket).
///
/// Pass in a map of `DateTime(day) → intensity` where intensity is any
/// non-negative number you choose (volume in kg, sets count, minutes —
/// whichever metric you want to visualise). When [year] is the current year
/// the grid auto-scrolls to the current week so recent activity is in view.
class YearlyHeatmap extends StatefulWidget {
  final int year;
  final Map<DateTime, double> dayIntensity;
  final double cellSize;
  final double cellGap;

  const YearlyHeatmap({
    super.key,
    required this.year,
    required this.dayIntensity,
    this.cellSize = 12,
    this.cellGap = 3,
  });

  @override
  State<YearlyHeatmap> createState() => _YearlyHeatmapState();
}

class _YearlyHeatmapState extends State<YearlyHeatmap> {
  final _controller = ScrollController();

  // Bucketed shades, dimmest → brightest. The "off" colour is a touch lighter
  // than the surrounding card so empty cells still read as a grid (an off cell
  // matching the card background made the whole heatmap look blank).
  static const _shades = [
    Color(0xFF2A2A2A), // 0 — no activity (visible on the surfaceLow card)
    Color(0xFF454343),
    Color(0xFF6E6C6C),
    Color(0xFFB5B3B3),
    Color(0xFFFFFFFF), // top bucket
  ];

  DateTime get _gridStart {
    final jan1 = DateTime(widget.year, 1, 1);
    return jan1.subtract(Duration(days: jan1.weekday - 1));
  }

  @override
  void initState() {
    super.initState();
    // Jump to the current week on first layout so the newest columns (recent
    // workouts) are visible instead of an empty January.
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToNow());
  }

  void _scrollToNow() {
    if (!_controller.hasClients) return;
    final now = DateTime.now();
    if (widget.year != now.year) return;
    final currentWeek = now.difference(_gridStart).inDays ~/ 7;
    final colWidth = widget.cellSize + widget.cellGap;
    final viewport = _controller.position.viewportDimension;
    // Centre the current week in the viewport.
    final target = (currentWeek + 0.5) * colWidth - viewport / 2;
    _controller.jumpTo(target.clamp(0.0, _controller.position.maxScrollExtent));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

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
      final first = DateTime(widget.year, m, 1);
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
    final year = widget.year;
    final cellSize = widget.cellSize;
    final cellGap = widget.cellGap;
    final dec31 = DateTime(year, 12, 31);
    final gridStart = _gridStart;
    // Grid spans from the Monday before Jan 1 to the Sunday after Dec 31.
    final gridEnd = dec31.add(Duration(days: 7 - dec31.weekday));
    final totalDays = gridEnd.difference(gridStart).inDays + 1;
    final weeks = totalDays ~/ 7;

    final max =
        widget.dayIntensity.values.fold<double>(0, (a, b) => b > a ? b : a);
    final months = _monthLabels(gridStart);
    final today = DateTime.now();

    final colWidth = cellSize + cellGap;
    final rowHeight = cellSize + cellGap;
    final gridWidth = weeks * colWidth;

    return SingleChildScrollView(
      controller: _controller,
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
                      final intensity = widget.dayIntensity[key] ?? 0;
                      final isToday = cellDate.year == today.year &&
                          cellDate.month == today.month &&
                          cellDate.day == today.day;
                      return Padding(
                        padding: EdgeInsets.only(bottom: cellGap),
                        child: Container(
                          width: cellSize,
                          height: cellSize,
                          decoration: BoxDecoration(
                            color: _shadeFor(intensity, max),
                            borderRadius: BorderRadius.circular(2),
                            // Ring today's cell so "now" is easy to spot.
                            border: isToday
                                ? Border.all(
                                    color: AppColors.onSurface, width: 1)
                                : null,
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
