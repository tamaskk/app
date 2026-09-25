// App-wide i18n runtime. Ported from apps/mobile/lib/i18n/app_strings.dart.
//
// Default language is English. The chosen language is persisted in AsyncStorage
// so the next launch boots into it. A module-level `currentLang` lets non-React
// code (services) call `t()`; React screens subscribe via the listener store so
// toggling the language re-renders them in one frame.
import { DICT, type Lang } from "./strings";
import { StorageKeys, getItem, setItem } from "../lib/storage";

let currentLang: Lang = "en";
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return currentLang;
}

export function isHu(): boolean {
  return currentLang === "hu";
}

/** Subscribe to language changes. Returns an unsubscribe fn. */
export function subscribeLang(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(): void {
  for (const fn of listeners) fn();
}

/** Read the persisted choice on launch. Best-effort — stays on 'en' on failure. */
export async function loadLang(): Promise<void> {
  const stored = await getItem(StorageKeys.appLanguage);
  if (stored === "hu" || stored === "en") {
    currentLang = stored;
    emit();
  }
}

export async function setLang(lang: Lang): Promise<void> {
  if (lang !== "en" && lang !== "hu") return;
  if (currentLang === lang) return;
  currentLang = lang;
  emit();
  await setItem(StorageKeys.appLanguage, lang);
}

/**
 * Lookup + interpolation. Falls back to English, then to the raw key — missing
 * strings surface visibly during development but never crash the UI. `params`
 * replaces `{name}`-style placeholders in the resolved string.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const pair = DICT[key];
  let out = pair ? pair[currentLang] ?? pair.en ?? key : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      out = out.split(`{${k}}`).join(String(v));
    }
  }
  return out;
}

export type { Lang };
