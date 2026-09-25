// Ported 1:1 from apps/mobile/lib/widgets/skeleton.dart.
import React from "react";
import { View, Animated, Easing, StyleSheet } from "react-native";
import { AppColors } from "../theme";

export interface SkeletonProps {
  width?: number;
  height?: number;
  radius?: number;
  // EdgeInsets equivalent — a uniform value or per-side offsets.
  margin?: number | { top?: number; right?: number; bottom?: number; left?: number };
}

/// A single placeholder block. Must sit under a `Shimmer`, which sweeps the
/// moving highlight across every block at once.
export function Skeleton({ width, height = 16, radius = 8, margin }: SkeletonProps) {
  const marginStyle =
    typeof margin === "number"
      ? { margin }
      : margin
        ? {
            marginTop: margin.top,
            marginRight: margin.right,
            marginBottom: margin.bottom,
            marginLeft: margin.left,
          }
        : undefined;
  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: AppColors.surfaceLow,
          borderRadius: radius,
        },
        marginStyle,
      ]}
    />
  );
}

/// Wraps a subtree of `Skeleton` blocks and sweeps a lighter highlight band
/// across them on a loop — the classic "loading skeleton" shimmer. One
/// controller drives the whole subtree, so all blocks stay in sync. RN has no
/// ShaderMask/gradient without extra packages, so the sliding gradient is
/// approximated with an Animated highlight band clipped to the subtree.
export function Shimmer({ children }: { children: React.ReactNode }) {
  const progress = React.useRef(new Animated.Value(0)).current;
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  // Translate the highlight band from off-screen left to off-screen right,
  // matching the Flutter `(t * 2 - 1) * bounds.width` sweep.
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <View
      style={{ overflow: "hidden" }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { alignItems: "center", transform: [{ translateX }] },
        ]}
      >
        <View style={{ width: width * 0.3, height: "100%", backgroundColor: AppColors.surfaceHigh, opacity: 0.6 }} />
      </Animated.View>
    </View>
  );
}
