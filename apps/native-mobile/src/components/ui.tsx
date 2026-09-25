// Shared UI primitives matching the app's monochrome style.
import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  KeyboardTypeOptions,
} from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { AppColors } from "../theme";

/** Black full-bleed screen background with safe-area insets. */
export function Screen({
  children,
  style,
  edges = ["top", "bottom", "left", "right"],
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: Edge[];
}) {
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: AppColors.background }, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

/** Flat, outlined text field (AuthField). */
export function AuthField({
  value,
  onChangeText,
  label,
  secure = false,
  keyboardType,
  onSubmitEditing,
  autoCapitalize = "none",
}: {
  value: string;
  onChangeText: (v: string) => void;
  label: string;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  onSubmitEditing?: () => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={{ position: "relative" }}>
      <Text style={[styles.floatLabel, { color: focused ? AppColors.onSurface : AppColors.muted }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmitEditing}
        cursorColor={AppColors.onSurface}
        style={[styles.input, { borderColor: focused ? AppColors.onSurface : AppColors.outline }]}
      />
    </View>
  );
}

/** Full-width primary button with a loading state (AuthButton). */
export function AuthButton({
  label,
  loading,
  onPress,
  radius = 16,
}: {
  label: string;
  loading?: boolean;
  onPress: () => void;
  radius?: number;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={loading}
      onPress={onPress}
      style={[
        styles.primaryBtn,
        { borderRadius: radius, backgroundColor: loading ? AppColors.surfaceHigh : AppColors.primary },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={AppColors.background} />
      ) : (
        <Text style={styles.primaryBtnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

/** Inline error message (AuthError). */
export function AuthError({ message }: { message: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
      <MaterialIcons name="error-outline" size={18} color={AppColors.onSurface} />
      <Text style={{ flex: 1, marginLeft: 8, color: AppColors.onSurface, fontSize: 13 }}>{message}</Text>
    </View>
  );
}

/** "Question? Action" link row (AuthLink). */
export function AuthLink({
  leading,
  action,
  onPress,
}: {
  leading: string;
  action: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ paddingVertical: 8 }}>
      <Text style={{ fontSize: 14, color: AppColors.muted }}>
        {leading}{" "}
        <Text style={{ color: AppColors.onSurface, fontWeight: "700" }}>{action}</Text>
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  floatLabel: {
    position: "absolute",
    top: -8,
    left: 12,
    paddingHorizontal: 4,
    fontSize: 12,
    backgroundColor: AppColors.background,
    zIndex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: AppColors.onSurface,
    fontSize: 16,
  },
  primaryBtn: {
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: AppColors.background, fontWeight: "700", fontSize: 16 },
});
