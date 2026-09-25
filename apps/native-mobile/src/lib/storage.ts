// Thin wrapper over AsyncStorage. Keys match apps/mobile SharedPreferences so
// behaviour (token key, language key, plate settings) stays identical.
import AsyncStorage from "@react-native-async-storage/async-storage";

export const StorageKeys = {
  authToken: "auth_token",
  appLanguage: "app_language",
} as const;

export async function getItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // storage unavailable — ignore, matching the Dart best-effort behaviour
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}
