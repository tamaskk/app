import 'package:flutter/material.dart';
import '../models/api_models.dart';
import '../theme/app_theme.dart';
import '../utils/text.dart';

/// Instagram-story-style horizontal strip of generated trainings.
///
/// Sort order: not-yet-done first (oldest planned day first, so the user
/// always sees the next session at the front), then done sessions at the end
/// (most recently done first). Done cards stay visible at reduced opacity
/// with a check mark — historical, but not in the way.
class GeneratedStories extends StatelessWidget {
  final List<SavedTraining> trainings;
  final void Function(SavedTraining training, int index) onTap;
  final void Function(SavedTraining training)? onLongPress;

  const GeneratedStories({
    super.key,
    required this.trainings,
    required this.onTap,
    this.onLongPress,
  });

  List<SavedTraining> _sorted() {
    final notDone = trainings.where((t) => !t.isDone).toList()
      ..sort((a, b) {
        // Chronological plan order: week-major, day-minor. Sorting by day
        // first grouped every week's "day 1" together, so a multi-week plan's
        // front card wasn't the actual next session.
        final aw = a.weekIndex ?? 0;
        final bw = b.weekIndex ?? 0;
        if (aw != bw) return aw.compareTo(bw);
        final ad = a.dayIndex ?? 0;
        final bd = b.dayIndex ?? 0;
        return ad.compareTo(bd);
      });
    final done = trainings.where((t) => t.isDone).toList()
      ..sort((a, b) {
        // Most recently done first within the done bucket.
        return (b.doneAt ?? DateTime(0))
            .compareTo(a.doneAt ?? DateTime(0));
      });
    return [...notDone, ...done];
  }

  @override
  Widget build(BuildContext context) {
    final list = _sorted();
    return SizedBox(
      height: 108,
      child: Stack(
        children: [
          ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (_, i) => _StoryCard(
              training: list[i],
              onTap: () =>
                  onTap(list[i], trainings.indexOf(list[i])),
              onLongPress: onLongPress == null
                  ? null
                  : () => onLongPress!(list[i]),
            ),
          ),
          // Right-edge fade — matches the recommended carousel pattern.
          Positioned(
            top: 0,
            right: 0,
            bottom: 0,
            child: IgnorePointer(
              child: Container(
                width: 36,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                    colors: [
                      AppColors.background.withValues(alpha: 0),
                      AppColors.background,
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StoryCard extends StatelessWidget {
  final SavedTraining training;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;

  const _StoryCard({
    required this.training,
    required this.onTap,
    this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    final done = training.isDone;
    // Split "Mell + Hát" off the " · 1. nap" suffix so the card can render
    // the muscle bundle big and the day badge small.
    final segments = training.name.split('·');
    final body = (segments.isNotEmpty ? segments[0] : training.name).trim();
    final dayLabel = segments.length > 1 ? segments[1].trim() : '';
    return GestureDetector(
      onTap: onTap,
      onLongPress: onLongPress,
      behavior: HitTestBehavior.opaque,
      child: Opacity(
        opacity: done ? 0.55 : 1,
        child: SizedBox(
          width: 86,
          child: Container(
            padding: const EdgeInsets.fromLTRB(10, 10, 10, 8),
            decoration: BoxDecoration(
              color: AppColors.surfaceLow,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color:
                    done ? AppColors.surfaceHigh : AppColors.surfaceHigh,
                width: 1,
              ),
            ),
            child: Stack(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      titleCase(body).toUpperCase(),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.6,
                        height: 1.15,
                        color: AppColors.onSurface,
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        dayLabel.isEmpty ? '—' : dayLabel.toUpperCase(),
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                          color: AppColors.muted,
                        ),
                      ),
                    ),
                  ],
                ),
                if (done)
                  Positioned(
                    top: 0,
                    right: 0,
                    child: Container(
                      width: 18,
                      height: 18,
                      decoration: const BoxDecoration(
                        color: AppColors.onSurface,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.check,
                        size: 12,
                        color: AppColors.background,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
