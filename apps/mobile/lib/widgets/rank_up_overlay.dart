import 'package:flutter/material.dart';
import '../models/rank.dart';
import '../theme/app_theme.dart';
import '../i18n/app_strings.dart';

/// Full-bleed black celebration shown when a workout save crosses a new
/// rank threshold. Static — no confetti — matching the brutalist tone.
class RankUpOverlay extends StatelessWidget {
  final RankDef previousRank;
  final RankDef newRank;
  final int xpAwarded;

  const RankUpOverlay({
    super.key,
    required this.previousRank,
    required this.newRank,
    required this.xpAwarded,
  });

  /// Convenience push. Returns when the overlay is dismissed.
  static Future<void> show(
    BuildContext context, {
    required RankDef previousRank,
    required RankDef newRank,
    required int xpAwarded,
  }) {
    return Navigator.of(context, rootNavigator: true).push(
      PageRouteBuilder(
        opaque: false,
        barrierColor: AppColors.background,
        transitionDuration: const Duration(milliseconds: 400),
        pageBuilder: (_, __, ___) => RankUpOverlay(
          previousRank: previousRank,
          newRank: newRank,
          xpAwarded: xpAwarded,
        ),
        transitionsBuilder: (_, anim, __, child) =>
            FadeTransition(opacity: anim, child: child),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            children: [
              const Spacer(flex: 2),
              const Text(
                'NEW RANK',
                style: TextStyle(
                  fontSize: 11,
                  letterSpacing: 4,
                  fontWeight: FontWeight.w800,
                  color: AppColors.muted,
                ),
              ),
              const SizedBox(height: 24),
              // Big numeral with a 0→1 fade-in so it lands with weight.
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: 1),
                duration: const Duration(milliseconds: 900),
                curve: Curves.easeOutCubic,
                builder: (_, t, __) {
                  return Opacity(
                    opacity: t,
                    child: Text(
                      newRank.numeral,
                      style: const TextStyle(
                        fontSize: 180,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -8,
                        height: 1,
                        color: AppColors.onSurface,
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 20),
              Container(width: 96, height: 2, color: AppColors.surfaceHigh),
              const SizedBox(height: 20),
              Text(
                newRank.name,
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 4,
                  color: AppColors.onSurface,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                '${previousRank.numeral} → ${newRank.numeral} · +$xpAwarded XP',
                style: const TextStyle(
                  fontSize: 12,
                  letterSpacing: 1.6,
                  fontWeight: FontWeight.w800,
                  color: AppColors.muted,
                ),
              ),
              const Spacer(flex: 3),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  style: TextButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.background,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(100),
                    ),
                  ),
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(
                    t('common.next').toUpperCase(),
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 2,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
