// Base URL of the HEFTOR backend (apps/web). Override with an env var at build
// time via app.json → extra, or edit here. Mirrors apps/mobile/lib/config.dart.
import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

/// Base URL of the HEFTOR backend (apps/web).
export const apiBaseUrl =
  extra.API_BASE_URL ?? "https://app-web-nu-eight.vercel.app";

/// Base URL of the exercise catalogue API (`$exerciseApiBaseUrl/api/v1/*`).
export const exerciseApiBaseUrl =
  extra.EXERCISE_API_BASE_URL ?? "https://gym-exercise-api-nu.vercel.app";
