import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/plate_settings.dart';
import '../utils/plates.dart';

const _mono = TextStyle(fontFamily: 'monospace');

/// Text-only plate-calculator overlay for a given working weight. Reads the
/// device's bar/plate settings and renders the per-side breakdown.
void showPlateCalculator(BuildContext context, double kg) {
  final s = PlateSettings.instance;
  final r = computePlates(
    kg,
    barWeight: s.barWeight,
    availablePlates: s.availablePlates,
  );
  final note = closestNote(r);

  showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (ctx) => Container(
      decoration: const BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        border: Border.fromBorderSide(BorderSide(color: AppColors.outline)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.surfaceHigh,
                  borderRadius: BorderRadius.circular(100),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('PLATE CALC',
                      style: TextStyle(
                          color: AppColors.muted,
                          fontSize: 12,
                          letterSpacing: 1.5,
                          fontWeight: FontWeight.w700)),
                  const SizedBox(height: 16),
                  if (!r.feasible) ...[
                    Text('${fmtPlate(kg)}kg a rúd súlya alatt van.',
                        style: _mono.copyWith(
                            color: AppColors.onSurface, fontSize: 15)),
                    const SizedBox(height: 6),
                    Text('Minimum: ${fmtPlate(r.barWeight)}kg (üres rúd)',
                        style: _mono.copyWith(
                            color: AppColors.muted, fontSize: 13)),
                  ] else ...[
                    Text(formatEquation(r),
                        style: _mono.copyWith(
                            color: AppColors.onSurface,
                            fontSize: 15,
                            fontWeight: FontWeight.w600)),
                    const SizedBox(height: 16),
                    // Horizontal scroll so a long bar never overflows.
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Text(formatBarDiagram(r),
                          style: _mono.copyWith(
                              color: AppColors.muted,
                              fontSize: 14,
                              height: 1.4)),
                    ),
                    if (note != null) ...[
                      const SizedBox(height: 14),
                      Text(note,
                          style: _mono.copyWith(
                              color: AppColors.muted, fontSize: 13)),
                    ],
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
