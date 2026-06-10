import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Shown when an exercise GIF is missing or fails to load (e.g. 404). On large
/// previews it adds a "Hamarosan" (coming soon) label; small thumbnails show
/// just the icon.
class ExercisePlaceholder extends StatelessWidget {
  final double iconSize;
  final bool showLabel;
  // Tighter spacing + smaller label for tiny thumbnails (e.g. 52px list rows).
  final bool compact;

  const ExercisePlaceholder({
    super.key,
    this.iconSize = 24,
    this.showLabel = false,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.fitness_center, color: AppColors.muted, size: iconSize),
        if (showLabel) ...[
          SizedBox(height: compact ? 3 : 10),
          Text(
            'Hamarosan',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.muted,
              fontSize: compact ? 8.5 : 13,
              fontWeight: FontWeight.w600,
              letterSpacing: compact ? 0 : 0.5,
            ),
          ),
        ],
      ],
    );
  }
}
