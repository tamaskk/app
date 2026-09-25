// Ported 1:1 from apps/mobile/lib/widgets/workout_stories.dart.
//
// Instagram-story-style horizontal strip of predefined workouts. Tapping one
// invokes [onTap] with the chosen workout. A right-edge fade gradient signals
// "scroll for more" so cropped items don't look broken.
import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { AppColors } from "../theme";
import { predefinedWorkouts, PredefinedWorkout } from "../data/predefinedWorkouts";

// NOTE: Flutter renders the cover photos through a grayscale ColorFilter.matrix
// to fit the monochrome design. React Native / expo-image has no equivalent
// on-device color-matrix filter, so the covers render in full color here.

export function WorkoutStories({ onTap }: { onTap: (workout: PredefinedWorkout) => void }) {
  const workouts = predefinedWorkouts();
  return (
    <View style={{ height: 116 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {workouts.map((w, i) => (
          <StoryBubble key={i} workout={w} onTap={onTap} />
        ))}
      </ScrollView>
      {/* Right-edge fade so the user knows there's more content past the
          viewport. Ignores pointer events so it doesn't block taps. */}
      <View pointerEvents="none" style={styles.fade}>
        <Svg width={36} height={116}>
          <Defs>
            <LinearGradient id="wsFade" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={AppColors.background} stopOpacity={0} />
              <Stop offset="1" stopColor={AppColors.background} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={36} height={116} fill="url(#wsFade)" />
        </Svg>
      </View>
    </View>
  );
}

function StoryBubble({
  workout,
  onTap,
}: {
  workout: PredefinedWorkout;
  onTap: (workout: PredefinedWorkout) => void;
}) {
  const [errored, setErrored] = React.useState(false);
  return (
    <Pressable onPress={() => onTap(workout)} style={{ width: 72 }}>
      <View style={{ alignItems: "center" }}>
        {/* Story ring (monochrome) around the cover. */}
        <View style={styles.ring}>
          <View style={styles.cover}>
            {errored ? (
              <View style={styles.coverFallback}>
                <MaterialIcons name="fitness-center" color={AppColors.muted} size={22} />
              </View>
            ) : (
              <Image
                source={workout.imageUrl}
                style={{ width: 60, height: 60 }}
                contentFit="cover"
                onError={() => setErrored(true)}
                placeholder={undefined}
              />
            )}
          </View>
        </View>
        <View style={{ height: 6 }} />
        {/* Fixed 2-line space so all bubbles share the same height, regardless
            of label length. Prevents the strip from jittering and stops the
            rightmost label from looking clipped. */}
        <View style={{ height: 28, width: 72 }}>
          <Text numberOfLines={2} style={styles.title}>
            {workout.title}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 20, gap: 14, alignItems: "flex-start" },
  fade: { position: "absolute", top: 0, right: 0, bottom: 0, width: 36 },
  ring: {
    padding: 2.5,
    borderWidth: 2,
    borderColor: AppColors.surfaceHigh,
    borderRadius: 9999,
  },
  cover: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: AppColors.surfaceLow,
  },
  coverFallback: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.surfaceLow,
  },
  title: {
    fontSize: 11,
    lineHeight: 11 * 1.15,
    fontWeight: "600",
    color: AppColors.muted,
    textAlign: "center",
  },
});
