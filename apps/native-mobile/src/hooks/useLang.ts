// Re-renders the calling component whenever the app language toggles, and
// returns a bound `t`. Mirrors the AnimatedBuilder(AppStrings) pattern from
// apps/mobile/lib/main.dart that rebuilds every screen on language change.
import { useSyncExternalStore } from "react";
import { getLang, subscribeLang, t as rawT, setLang, type Lang } from "../i18n";

export function useLang() {
  const lang = useSyncExternalStore(subscribeLang, getLang, getLang);
  return {
    lang,
    isHu: lang === "hu",
    setLang: (l: Lang) => setLang(l),
    t: (key: string, params?: Record<string, string | number>) => rawT(key, params),
  };
}
