// Ported 1:1 from apps/mobile/lib/widgets/generated_stories.dart.
//
// Instagram-story-style horizontal strip of generated trainings.
//
// Sort order: not-yet-done first (oldest planned day first, so the user always
// sees the next session at the front), then done sessions at the end (most
// recently done first). Done cards stay visible at reduced opacity with a check
// mark — historical, but not in the way.
import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { AppColors } from "../theme";
import { titleCase } from "../utils/text";
import { SavedTraining } from "../models/apiModels";

export function GeneratedStories({
  trainings,
  onTap,
  onLongPress,
}: {
  trainings: SavedTraining[];
  onTap: (training: SavedTraining, index: number) => void;
  onLongPress?: (training: SavedTraining) => void;
}) {
  const list = sorted(trainings);
  return (
    <View style={{ height: 108 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {list.map((tr, i) => (
          <StoryCard
            key={tr.id !== "" ? tr.id : i}
            training={tr}
            onTap={() => onTap(tr, trainings.indexOf(tr))}
            onLongPress={onLongPress == null ? undefined : () => onLongPress(tr)}
          />
        ))}
      </ScrollView>
      {/* Right-edge fade — matches the recommended carousel pattern. */}
      <View pointerEvents="none" style={styles.fade}>
        <Svg width={36} height={108}>
          <Defs>
            <LinearGradient id="gsFade" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={AppColors.background} stopOpacity={0} />
              <Stop offset="1" stopColor={AppColors.background} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={36} height={108} fill="url(#gsFade)" />
        </Svg>
      </View>
    </View>
  );
}

function sorted(trainings: SavedTraining[]): SavedTraining[] {
  const notDone = trainings
    .filter((t) => !t.isDone)
    .sort((a, b) => {
      // Chronological plan order: week-major, day-minor. Sorting by day first
      // grouped every week's "day 1" together, so a multi-week plan's front card
      // wasn't the actual next session.
      const aw = a.weekIndex ?? 0;
      const bw = b.weekIndex ?? 0;
      if (aw !== bw) return aw - bw;
      const ad = a.dayIndex ?? 0;
      const bd = b.dayIndex ?? 0;
      return ad - bd;
    });
  const done = trainings
    .filter((t) => t.isDone)
    .sort((a, b) => {
      // Most recently done first within the done bucket.
      return (b.doneAt?.getTime() ?? 0) - (a.doneAt?.getTime() ?? 0);
    });
  return [...notDone, ...done];
}

function StoryCard({
  training,
  onTap,
  onLongPress,
}: {
  training: SavedTraining;
  onTap: () => void;
  onLongPress?: () => void;
}) {
  const done = training.isDone;
  // Split "Mell + Hát" off the " · 1. nap" suffix so the card can render the
  // muscle bundle big and the day badge small.
  const segments = training.name.split("·");
  const body = (segments.length > 0 ? segments[0] : training.name).trim();
  const dayLabel = segments.length > 1 ? segments[1].trim() : "";
  return (
    <Pressable onPress={onTap} onLongPress={onLongPress} style={[styles.card, { opacity: done ? 0.55 : 1 }]}>
      <View style={styles.cardInner}>
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: "space-between" }}>
            <Text numberOfLines={3} style={styles.title}>
              {titleCase(body).toUpperCase()}
            </Text>
            <View style={{ paddingTop: 4 }}>
              <Text style={styles.day}>{dayLabel === "" ? "—" : dayLabel.toUpperCase()}</Text>
            </View>
          </View>
          {done && (
            <View style={styles.badge}>
              <MaterialIcons name="check" size={12} color={AppColors.background} />
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 20, gap: 10, alignItems: "flex-start" },
  fade: { position: "absolute", top: 0, right: 0, bottom: 0, width: 36 },
  card: { width: 86, height: 108 },
  cardInner: {
    flex: 1,
    paddingLeft: 10,
    paddingTop: 10,
    paddingRight: 10,
    paddingBottom: 8,
    backgroundColor: AppColors.surfaceLow,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.surfaceHigh,
  },
  title: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    lineHeight: 11 * 1.15,
    color: AppColors.onSurface,
  },
  day: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: AppColors.muted,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AppColors.onSurface,
    alignItems: "center",
    justifyContent: "center",
  },
});
