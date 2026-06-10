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
  // defaultValue: 'https://9326-87-97-31-222.ngrok-free.app',
  defaultValue: 'https://9326-87-97-31-222.ngrok-free.app',
);

/// Base URL of the Gym Exercise API (ExerciseDB-backed catalogue).
/// Endpoints live under `$exerciseApiBaseUrl/api/v1/*`.
///
/// Override at run time with:
///   flutter run --dart-define=EXERCISE_API_BASE_URL=http://localhost:3000
const String exerciseApiBaseUrl = String.fromEnvironment(
  'EXERCISE_API_BASE_URL',
  defaultValue: 'https://gym-exercise-api-nu.vercel.app',
);
