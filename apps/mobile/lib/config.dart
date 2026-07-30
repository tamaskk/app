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
/// The standalone gym-exercise-api (ExerciseDB-backed) is the source again: its
/// image CDN (static.exercisedb.dev) is back online, so exercises serve real
/// animated GIFs (one URL per exercise, animated natively by Image.network) —
/// preferred over free-exercise-db's two static JPGs. It also serves localized
/// (HU+EN) names/muscles; the app matches English filter keys and shows
/// localized labels (see utils/exercise_labels.dart). The apps/web backend
/// still exposes an equivalent free-exercise-db catalogue as a fallback — point
/// EXERCISE_API_BASE_URL at [apiBaseUrl] to use it if the CDN drops again.
///
/// Override at run time with:
///   flutter run --dart-define=EXERCISE_API_BASE_URL=http://localhost:3000
const String exerciseApiBaseUrl = String.fromEnvironment(
  'EXERCISE_API_BASE_URL',
  defaultValue: 'https://gym-exercise-api-nu.vercel.app',
);
