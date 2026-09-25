// Main authenticated shell: 5 tabs with the custom dot-indicator bottom nav
// and a fade transition on switch. Ported from main.dart _MainShell / _BottomNav.
import React, { useEffect, useRef, useState } from "react";
import { View, TouchableOpacity, Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppColors } from "../theme";
import type { RootStackParamList, RootNav } from "./types";
import { useAuth } from "../context/AuthContext";
import { DashboardScreen } from "../screens/DashboardScreen";
import { TrainingsListScreen } from "../screens/TrainingsListScreen";
import { HyroxScreen } from "../screens/HyroxScreen";
import { ProgressScreen } from "../screens/ProgressScreen";
import { CalendarScreen } from "../screens/CalendarScreen";

type Props = NativeStackScreenProps<RootStackParamList, "Main">;

// Selected / unselected icon pairs, matching the Flutter Material icon choices
// (home, fitness_center, sports_score, trending_up, calendar_today).
const ITEMS: [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap][] = [
  ["home-outline", "home"],
  ["barbell-outline", "barbell"],
  ["flag-outline", "flag"],
  ["trending-up-outline", "trending-up"],
  ["calendar-outline", "calendar"],
];

export function MainShell({ navigation }: Props) {
  const nav = navigation as unknown as RootNav;
  const { logout } = useAuth();
  const [index, setIndex] = useState(0);
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(1)).current;

  function select(i: number) {
    if (i === index) return;
    setIndex(i);
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }

  const tabProps = { navigation: nav, onNavigateTab: select };

  const screens = [
    <DashboardScreen key="dash" {...tabProps} onLogout={logout} />,
    <TrainingsListScreen key="tr" {...tabProps} />,
    <HyroxScreen key="hy" navigation={nav} />,
    <ProgressScreen key="pr" {...tabProps} />,
    <CalendarScreen key="cal" {...tabProps} />,
  ];

  return (
    <View style={{ flex: 1, backgroundColor: AppColors.background }}>
      <Animated.View style={{ flex: 1, opacity: fade }}>{screens[index]}</Animated.View>
      <View style={{ backgroundColor: AppColors.background, paddingTop: 8, paddingBottom: 8 + insets.bottom, flexDirection: "row" }}>
        {ITEMS.map(([outline, filled], i) => {
          const selected = i === index;
          return (
            <TouchableOpacity key={i} activeOpacity={1} onPress={() => select(i)} style={{ flex: 1, alignItems: "center" }}>
              <Ionicons name={selected ? filled : outline} size={24} color={selected ? AppColors.onSurface : AppColors.muted} />
              <View style={{ height: 6 }} />
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: selected ? AppColors.onSurface : "transparent",
                }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
