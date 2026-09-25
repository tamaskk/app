// Lightweight heuristic password strength (0..4). Ported from password_strength.dart.
import React from "react";
import { View, Text } from "react-native";
import { AppColors } from "../theme";
import { t } from "../i18n";

export function scorePassword(pw: string): number {
  if (pw.length === 0) return 0;
  let classes = 0;
  if (/[a-z]/.test(pw)) classes++;
  if (/[A-Z]/.test(pw)) classes++;
  if (/[0-9]/.test(pw)) classes++;
  if (/[^A-Za-z0-9]/.test(pw)) classes++;

  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (classes >= 2) score++;
  if (classes >= 3 && pw.length >= 10) score++;

  const weak = new Set([
    "password",
    "12345678",
    "qwerty12",
    "letmein",
    "welcome1",
    "admin123",
    "football",
  ]);
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
  if (weak.has(pw.toLowerCase())) return clamp(score, 0, 1);
  return clamp(score, 0, 4);
}

export function passwordStrengthLabel(score: number): string {
  switch (score) {
    case 0:
      return t("pwstrength.tooShort");
    case 1:
      return t("pwstrength.weak");
    case 2:
      return t("pwstrength.fair");
    case 3:
      return t("pwstrength.strong");
    case 4:
      return t("pwstrength.excellent");
    default:
      return "";
  }
}

/** 4-segment strength bar — monochrome, filled-segment count is the signal. */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const score = scorePassword(password);
  return (
    <View>
      <View style={{ flexDirection: "row" }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              marginRight: i === 3 ? 0 : 6,
              height: 4,
              borderRadius: 100,
              backgroundColor: i < score ? AppColors.onSurface : AppColors.surfaceHigh,
            }}
          />
        ))}
      </View>
      <View style={{ height: 8 }} />
      <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.2, color: AppColors.muted }}>
        {password.length === 0 ? "" : passwordStrengthLabel(score)}
      </Text>
    </View>
  );
}
