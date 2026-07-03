/// Base URL of the HEFTOR backend (apps/web).
///
/// Override at run time with:
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.50:3000
///
/// Defaults that work out of the box:
///   • iOS simulator / desktop / web → http://localhost:3000
///   • Android emulator             → http://10.0.2.2:3000  (loopback to host)
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  // defaultValue: 'https://6674-188-143-69-226.ngrok-free.app',
  defaultValue: 'https://app-web-nu-eight.vercel.app',
);

/// Base URL of the exercise catalogue API (`$exerciseApiBaseUrl/api/v1/*`).
///
/// Now served by our own backend (apps/web), which sources the free-exercise-db
/// dataset and returns working image URLs. The previous standalone host
/// (gym-exercise-api) depended on the ExerciseDB image CDN, which was
/// decommissioned — every gifUrl 404'd, so no exercise media loaded. Defaults
/// to [apiBaseUrl] so the catalogue always follows the backend.
///
/// Override at run time with:
///   flutter run --dart-define=EXERCISE_API_BASE_URL=http://localhost:3000
const String exerciseApiBaseUrl = String.fromEnvironment(
  'EXERCISE_API_BASE_URL',
  defaultValue: apiBaseUrl,
);
