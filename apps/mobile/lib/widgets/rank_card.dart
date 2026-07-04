import 'package:flutter/material.dart';
import '../models/rank.dart';
import '../theme/app_theme.dart';
import '../i18n/app_strings.dart';

/// The signature rank visual — a huge roman numeral above the rank name.
/// Used on the Account rank section, the rank-up overlay, and the dashboard
/// chip (small variant).
///
/// The first 5 tiers render with an outlined numeral and the last 5 with a
/// solid filled numeral — the brand cue for "you've crossed the halfway point".
class RankCard extends StatelessWidget {
  final RankDef rank;
  final int xp;
  final RankDef? nextRank;
  final double percentToNext;

  const RankCard({
    super.key,
    required this.rank,
    required this.xp,
    required this.nextRank,
    required this.percentToNext,
  });

  bool get _solid => rank.tier >= 6;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
      decoration: BoxDecoration(
        color: AppColors.surfaceLow,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        children: [
          // Roman numeral hero.
          _Numeral(text: rank.numeral, solid: _solid),
          const SizedBox(height: 14),
          Container(
            width: 64,
            height: 2,
            color: AppColors.surfaceHigh,
          ),
          const SizedBox(height: 14),
          Text(
            rank.name,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              letterSpacing: 3,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 22),
          Text(
            _formatXp(xp),
            style: const TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.w800,
              letterSpacing: -1,
              color: AppColors.onSurface,
              height: 1,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'XP',
            style: TextStyle(
              fontSize: 11,
              letterSpacing: 1.6,
              fontWeight: FontWeight.w800,
              color: AppColors.muted,
            ),
          ),
          const SizedBox(height: 18),
          if (nextRank != null) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(100),
              child: LinearProgressIndicator(
                value: percentToNext.clamp(0.0, 1.0),
                minHeight: 8,
                backgroundColor: AppColors.surfaceHigh,
                valueColor:
                    const AlwaysStoppedAnimation(AppColors.onSurface),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              '${_formatXp(xp - rank.threshold)} / ${_formatXp(nextRank!.threshold - rank.threshold)} → ${nextRank!.numeral} ${nextRank!.name}',
              style: const TextStyle(
                fontSize: 11,
                letterSpacing: 1.4,
                fontWeight: FontWeight.w800,
                color: AppColors.muted,
              ),
              textAlign: TextAlign.center,
            ),
          ] else ...[
            Text(
              t('rank.cap_reached'),
              style: const TextStyle(
                fontSize: 11,
                letterSpacing: 1.6,
                fontWeight: FontWeight.w800,
                color: AppColors.onSurface,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Compact rank chip — used in the dashboard header next to the streak chip.
class RankChip extends StatelessWidget {
  final RankDef rank;
  final VoidCallback? onTap;
  const RankChip({super.key, required this.rank, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              t('dashboard.rank'),
              style: const TextStyle(
                fontSize: 10,
                letterSpacing: 1.6,
                color: AppColors.muted,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              rank.numeral,
              style: const TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w800,
                color: AppColors.onSurface,
                height: 1,
                letterSpacing: -1,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Numeral extends StatelessWidget {
  final String text;
  final bool solid;
  const _Numeral({required this.text, required this.solid});

  @override
  Widget build(BuildContext context) {
    // Solid → coloured fill. Outlined → use `foreground` with a stroke paint
    // ONLY (no `color`, since Flutter rejects both being set at once).
    const baseStyle = TextStyle(
      fontSize: 96,
      fontWeight: FontWeight.w800,
      letterSpacing: -2,
      height: 1,
    );
    return Text(
      text,
      style: solid
          ? baseStyle.copyWith(color: AppColors.onSurface)
          : baseStyle.copyWith(
              foreground: Paint()
                ..style = PaintingStyle.stroke
                ..strokeWidth = 2
                ..color = AppColors.onSurface,
            ),
    );
  }
}

String _formatXp(int xp) {
  if (xp >= 1000) {
    final v = xp / 1000;
    return '${v.toStringAsFixed(v >= 10 ? 0 : 1).replaceAll('.', ',')}K';
  }
  return xp.toString();
}
