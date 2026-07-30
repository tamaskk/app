"use client";

import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/lib/i18n";

/**
 * OAuth block — Google (+ Apple) buttons and the "OR" divider. The native app
 * runs the platform OAuth SDKs; the web build has no configured client IDs, so
 * the buttons are rendered for a 1:1 visual match but explain they're
 * mobile-only when tapped. Mirrors `OAuthButtons` in oauth_buttons.dart.
 */
export function OAuthButtons() {
  const { t } = useI18n();
  const notAvailable = () =>
    alert(t("oauth.or") ? "Social sign-in is available in the mobile app." : "");

  return (
    <div>
      <button
        onClick={notAvailable}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-on-surface px-4 py-3.5 text-[15px] font-bold text-background"
      >
        <Icon name="apple" size={20} />
        {t("oauth.continue_apple")}
      </button>
      <div className="h-2.5" />
      <button
        onClick={notAvailable}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-outline bg-surface-low px-4 py-3.5 text-[15px] font-bold text-on-surface"
      >
        <Icon name="google" size={22} />
        {t("oauth.continue_google")}
      </button>
      <div className="mt-5 flex items-center">
        <div className="h-px flex-1 bg-outline" />
        <span className="px-3 text-[12px] font-bold tracking-[0.1em] text-muted">
          {t("oauth.or")}
        </span>
        <div className="h-px flex-1 bg-outline" />
      </div>
    </div>
  );
}
