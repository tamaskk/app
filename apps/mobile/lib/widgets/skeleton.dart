import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// A single placeholder block. Must sit under a [Shimmer], which sweeps the
/// moving highlight across every block at once.
class Skeleton extends StatelessWidget {
  final double? width;
  final double height;
  final double radius;
  final EdgeInsetsGeometry? margin;

  const Skeleton({
    super.key,
    this.width,
    this.height = 16,
    this.radius = 8,
    this.margin,
  });

  @override
  Widget build(BuildContext context) => Container(
        width: width,
        height: height,
        margin: margin,
        decoration: BoxDecoration(
          color: AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(radius),
        ),
      );
}

/// Wraps a subtree of [Skeleton] blocks and sweeps a lighter highlight band
/// across them on a loop — the classic "loading skeleton" shimmer. One
/// controller drives the whole subtree, so all blocks stay in sync. No
/// external package: a [ShaderMask] with a sliding gradient over the blocks.
class Shimmer extends StatefulWidget {
  final Widget child;
  const Shimmer({super.key, required this.child});

  @override
  State<Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<Shimmer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) => ShaderMask(
        // Paint the gradient only where the blocks are (their alpha).
        blendMode: BlendMode.srcATop,
        shaderCallback: (bounds) => LinearGradient(
          colors: const [
            AppColors.surfaceLow,
            AppColors.surfaceHigh,
            AppColors.surfaceLow,
          ],
          stops: const [0.35, 0.5, 0.65],
          transform: _SlideGradient(_controller.value),
        ).createShader(bounds),
        child: child,
      ),
      child: widget.child,
    );
  }
}

/// Translates the highlight band from off-screen left to off-screen right.
class _SlideGradient extends GradientTransform {
  final double t; // 0..1
  const _SlideGradient(this.t);

  @override
  Matrix4? transform(Rect bounds, {TextDirection? textDirection}) {
    final dx = (t * 2 - 1) * bounds.width; // -w .. +w
    return Matrix4.translationValues(dx, 0, 0);
  }
}
