// Ported 1:1 from apps/mobile/lib/theme/app_theme.dart.
export const AppColors = {
  background: "#000000",
  surfaceLow: "#1C1B1B",
  surfaceMid: "#2A2A2A",
  surfaceHigh: "#353434",
  onSurface: "#E5E2E1",
  muted: "#8E8E93",
  outline: "#2C2C2E",
  primary: "#FFFFFF",
  accentGreen: "#34C759",
  accentRed: "#FF3B30",
  // Warm accent for the active-workout screen (set status, active exercise).
  accentAmber: "#F5A623",
} as const;

// Text style presets mirroring the Flutter TextTheme. Font weights are strings
// per React Native; letterSpacing is in px.
export const AppText = {
  displayLarge: { fontSize: 64, fontWeight: "800", letterSpacing: -3, color: AppColors.onSurface },
  headlineLarge: { fontSize: 48, fontWeight: "800", letterSpacing: -2, color: AppColors.onSurface },
  headlineMedium: { fontSize: 32, fontWeight: "700", letterSpacing: -1, color: AppColors.onSurface },
  titleLarge: { fontSize: 20, fontWeight: "700", color: AppColors.onSurface },
  bodyLarge: { fontSize: 16, fontWeight: "400", color: AppColors.onSurface },
  bodySmall: { fontSize: 12, fontWeight: "500", color: AppColors.muted, letterSpacing: 0.8 },
} as const;
