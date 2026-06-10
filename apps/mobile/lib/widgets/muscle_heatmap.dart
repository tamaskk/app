import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../models/api_models.dart';

/// Volume-by-muscle landmark from RP. Used as a soft reference on the bar —
/// 0 → MAV reads as 100% width even though MRV could be higher.
const _muscleMav = <String, int>{
  'chest': 14,
  'mell': 14,
  'back': 16,
  'lats': 16,
  'hát': 16,
  'shoulders': 16,
  'váll': 16,
  'biceps': 14,
  'bicepsz': 14,
  'triceps': 14,
  'tricepsz': 14,
  'forearms': 12,
  'alkar': 12,
  'quads': 14,
  'quadricepsz': 14,
  'comb': 14,
  'hamstrings': 12,
  'glutes': 12,
  'far': 12,
  'calves': 14,
  'vádli': 14,
  'abs': 16,
  'has': 16,
};

int _muscleMavFor(String name) {
  final lc = name.toLowerCase().trim();
  for (final entry in _muscleMav.entries) {
    if (lc.contains(entry.key)) return entry.value;
  }
  return 14; // sensible default
}

/// Renders a horizontal bar list of muscles trained in the given sessions,
/// most-trained first. Each row shows the muscle, the set count, and a
/// bar whose length is proportional to MAV.
///
/// Text-only / typography-driven — keeps the brutalist monochrome consistent.
class MuscleVolumeChart extends StatelessWidget {
  final List<WorkoutSession> sessions;
  final int maxRows;

  const MuscleVolumeChart({
    super.key,
    required this.sessions,
    this.maxRows = 6,
  });

  Map<String, int> _aggregate() {
    final out = <String, int>{};
    for (final s in sessions) {
      for (final ex in s.exercises) {
        // Skip warmup sets here would require a separate flag; for now we
        // count every set the user performed.
        final setCount = ex.sets.where((x) => x.reps > 0).length;
        if (setCount == 0) continue;
        // Distribute the sets across each target muscle. A bench-press set
        // contributes to chest AND triceps AND front delts.
        for (final m in ex.targetMuscles) {
          final key = m.trim();
          if (key.isEmpty) continue;
          out[key] = (out[key] ?? 0) + setCount;
        }
      }
    }
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final agg = _aggregate();
    if (agg.isEmpty) return const SizedBox.shrink();
    final entries = agg.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final shown = entries.take(maxRows).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final e in shown) ...[
          _MuscleRow(name: e.key, sets: e.value, mav: _muscleMavFor(e.key)),
          const SizedBox(height: 10),
        ],
      ],
    );
  }
}

class _MuscleRow extends StatelessWidget {
  final String name;
  final int sets;
  final int mav;
  const _MuscleRow({
    required this.name,
    required this.sets,
    required this.mav,
  });

  @override
  Widget build(BuildContext context) {
    // 0..MAV maps to 0..1 fill; above MAV stays clamped at full so the bar
    // never visually overflows.
    final fill = (sets / mav).clamp(0.0, 1.0);
    final hint = sets >= mav ? 'OPTIMÁLIS' : '${mav - sets} A CÉLIG';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                name.toUpperCase(),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.2,
                  color: AppColors.onSurface,
                ),
              ),
            ),
            Text(
              '$sets SET',
              style: const TextStyle(
                fontSize: 11,
                letterSpacing: 1.2,
                fontWeight: FontWeight.w700,
                color: AppColors.muted,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: Stack(
            children: [
              Container(
                height: 4,
                width: double.infinity,
                color: AppColors.surfaceHigh,
              ),
              FractionallySizedBox(
                widthFactor: fill,
                child: Container(height: 4, color: AppColors.onSurface),
              ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        Text(
          hint,
          style: const TextStyle(
            fontSize: 10,
            letterSpacing: 1,
            color: AppColors.muted,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}
