"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { dict, type Lang } from "./strings.gen";
import { LANG_KEY } from "./config";

// ---------------------------------------------------------------------------
// i18n — a 1:1 port of apps/mobile/lib/i18n/app_strings.dart.
// Default language is English (matches the mobile `_lang = 'en'`). The choice
// persists to localStorage under `app_language`, exactly like the app.
// ---------------------------------------------------------------------------

let currentLang: Lang = "en";

/** Raw lookup. Falls back to en, then to the raw key (visible in dev). */
export function t(key: string, lang: Lang = currentLang): string {
  const pair = dict[key];
  if (!pair) return key;
  return (lang === "hu" ? pair.hu : pair.en) ?? pair.en ?? key;
}

/** Interpolating lookup: replaces `{name}` tokens from `vars`. */
export function tFmt(
  key: string,
  vars: Record<string, string | number>,
  lang: Lang = currentLang,
): string {
  let out = t(key, lang);
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}

type LangContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  tFmt: (key: string, vars: Record<string, string | number>) => string;
};

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_KEY);
      if (stored === "hu" || stored === "en") {
        currentLang = stored;
        setLangState(stored);
      }
    } catch {
      /* stay on default */
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    currentLang = l;
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* in-memory switch still applies */
    }
  }, []);

  const value: LangContextValue = {
    lang,
    setLang,
    t: (key) => t(key, lang),
    tFmt: (key, vars) => tFmt(key, vars, lang),
  };

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useI18n(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useI18n must be used within LangProvider");
  return ctx;
}
