import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../data/predefined_workouts.dart';

// Grayscale matrix so cover photos fit the monochrome design.
const _grayscale = ColorFilter.matrix(<double>[
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0, 0, 0, 1, 0,
]);

/// Instagram-story-style horizontal strip of predefined workouts. Tapping one
/// invokes [onTap] with the chosen workout. A right-edge fade gradient
/// signals "scroll for more" so cropped items don't look broken.
class WorkoutStories extends StatelessWidget {
  final void Function(PredefinedWorkout) onTap;
  const WorkoutStories({super.key, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 116,
      child: Stack(
        children: [
          ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: predefinedWorkouts.length,
            separatorBuilder: (_, __) => const SizedBox(width: 14),
            itemBuilder: (context, i) =>
                _StoryBubble(workout: predefinedWorkouts[i], onTap: onTap),
          ),
          // Right-edge fade so the user knows there's more content past the
          // viewport. Ignores pointer events so it doesn't block taps.
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

class _StoryBubble extends StatelessWidget {
  final PredefinedWorkout workout;
  final void Function(PredefinedWorkout) onTap;
  const _StoryBubble({required this.workout, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onTap(workout),
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 72,
        child: Column(
          children: [
            // Story ring (monochrome) around the grayscale cover.
            Container(
              padding: const EdgeInsets.all(2.5),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.surfaceHigh, width: 2),
              ),
              child: ClipOval(
                child: SizedBox(
                  width: 60,
                  height: 60,
                  child: ColorFiltered(
                    colorFilter: _grayscale,
                    child: Image.network(
                      workout.imageUrl,
                      fit: BoxFit.cover,
                      loadingBuilder: (context, child, progress) =>
                          progress == null
                              ? child
                              : Container(color: AppColors.surfaceLow),
                      errorBuilder: (_, __, ___) => Container(
                        color: AppColors.surfaceLow,
                        alignment: Alignment.center,
                        child: const Icon(Icons.fitness_center,
                            color: AppColors.muted, size: 22),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 6),
            // Fixed 2-line space so all bubbles share the same height,
            // regardless of label length. Prevents the strip from jittering
            // and stops the rightmost label from looking clipped.
            SizedBox(
              height: 28,
              child: Text(
                workout.title,
                maxLines: 2,
                textAlign: TextAlign.center,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 11,
                  height: 1.15,
                  fontWeight: FontWeight.w600,
                  color: AppColors.muted,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
