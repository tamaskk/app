// Backend base URL. Empty string = same-origin: the browser calls `/api/...`
// on this app's own origin and Next rewrites it to the real HEFTOR backend
// server-side (see next.config.ts). This sidesteps CORS — the mobile app uses
// a native HTTP client with no browser same-origin policy, but the web build
// can't call the Vercel backend cross-origin directly.
// Override with NEXT_PUBLIC_API_BASE_URL to hit a backend directly.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// Exercise catalogue API (animated GIFs / localized names). Mirrors
// `exerciseApiBaseUrl` in the mobile config.
export const EXERCISE_API_BASE_URL =
  process.env.NEXT_PUBLIC_EXERCISE_API_BASE_URL ??
  "https://gym-exercise-api-nu.vercel.app";

// Base for self-hosted exercise GIFs. Empty = same-origin `/gifs/<id>.gif`
// (served by the /gifs route, which redirects to Vercel Blob or, until the
// upload is done, falls back to the ExerciseDB CDN). Set NEXT_PUBLIC_GIF_BASE
// to an absolute origin (e.g. https://web-app-sepia-two-36.vercel.app) when the
// URL needs to resolve off-origin (mobile, external DB).
export const GIF_BASE = process.env.NEXT_PUBLIC_GIF_BASE ?? "";

/** Own-domain URL for an exercise's GIF, keyed by its ExerciseDB id. */
export const gifUrlFor = (exerciseId: string) => `${GIF_BASE}/gifs/${exerciseId}.gif`;

// LocalStorage keys — kept identical in spirit to the mobile SharedPreferences
// keys so the mental model matches (`auth_token`, `app_language`).
export const TOKEN_KEY = "auth_token";
export const LANG_KEY = "app_language";
export const REST_SECONDS_KEY = "rest_seconds";
export const workoutProgressKey = (id: string) => `workout_progress_${id}`;
