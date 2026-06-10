import 'package:flutter/material.dart';

class AppColors {
  static const background = Color(0xFF000000);
  static const surfaceLow = Color(0xFF1C1B1B);
  static const surfaceMid = Color(0xFF2A2A2A);
  static const surfaceHigh = Color(0xFF353434);
  static const onSurface = Color(0xFFE5E2E1);
  static const muted = Color(0xFF8E8E93);
  static const outline = Color(0xFF2C2C2E);
  static const primary = Color(0xFFFFFFFF);
  static const accentGreen = Color(0xFF34C759);
  static const accentRed = Color(0xFFFF3B30);
  // Warm accent for the active-workout screen (set status, active exercise).
  static const accentAmber = Color(0xFFF5A623);
}

class AppTheme {
  static ThemeData get dark => ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.background,
        colorScheme: const ColorScheme.dark(
          surface: AppColors.background,
          primary: AppColors.primary,
          secondary: AppColors.muted,
          error: AppColors.accentRed,
        ),
        fontFamily: 'Inter',
        textTheme: const TextTheme(
          displayLarge: TextStyle(
            fontSize: 64, fontWeight: FontWeight.w800,
            letterSpacing: -3, color: AppColors.onSurface,
          ),
          headlineLarge: TextStyle(
            fontSize: 48, fontWeight: FontWeight.w800,
            letterSpacing: -2, color: AppColors.onSurface,
          ),
          headlineMedium: TextStyle(
            fontSize: 32, fontWeight: FontWeight.w700,
            letterSpacing: -1, color: AppColors.onSurface,
          ),
          titleLarge: TextStyle(
            fontSize: 20, fontWeight: FontWeight.w700,
            color: AppColors.onSurface,
          ),
          bodyLarge: TextStyle(
            fontSize: 16, fontWeight: FontWeight.w400,
            color: AppColors.onSurface,
          ),
          bodySmall: TextStyle(
            fontSize: 12, fontWeight: FontWeight.w500,
            color: AppColors.muted, letterSpacing: 0.8,
          ),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.background,
          foregroundColor: AppColors.onSurface,
          elevation: 0,
          centerTitle: true,
          titleTextStyle: TextStyle(
            fontSize: 16, fontWeight: FontWeight.w700,
            color: AppColors.onSurface, letterSpacing: 0.5,
          ),
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: AppColors.surfaceLow,
          indicatorColor: AppColors.primary,
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.background);
            }
            return const TextStyle(fontSize: 11, color: AppColors.muted);
          }),
          iconTheme: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return const IconThemeData(color: AppColors.background, size: 22);
            }
            return const IconThemeData(color: AppColors.muted, size: 22);
          }),
        ),
      );
}
