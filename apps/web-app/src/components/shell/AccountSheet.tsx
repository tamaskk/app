"use client";

import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { displayName } from "@/lib/types";
import { rankNumeral } from "@/lib/format";

// A compact account sheet reached from the dashboard person button. The full
// account_screen.dart is not ported; this exposes identity, the language switch
// and logout — the parts that matter for the web build.
export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  if (!user) return null;

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-6 pb-2 pt-1">
        <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-on-surface">
          {t("account.title")}
        </h2>

        <div className="mt-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-mid text-lg font-extrabold text-on-surface">
            {rankNumeral(user.rank)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-bold text-on-surface">
              {displayName(user)}
            </div>
            <div className="truncate text-sm text-muted">{user.email}</div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-1 rounded-2xl bg-surface-low p-1">
          {(["en", "hu"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold uppercase transition-colors ${
                lang === l ? "bg-surface-high text-on-surface" : "text-muted"
              }`}
            >
              {l === "en" ? "English" : "Magyar"}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            onClose();
            router.push("/tools/gifs");
          }}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-outline px-4 py-3.5 text-left"
        >
          <Icon name="arrow_downward" size={18} className="text-on-surface" />
          <span className="flex-1 text-[15px] font-semibold text-on-surface">Download exercise GIFs</span>
          <Icon name="chevron_right" size={18} className="text-muted" />
        </button>

        <button
          onClick={() => {
            logout();
            onClose();
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-outline py-4 text-[15px] font-bold text-accent-red"
        >
          <Icon name="logout" size={18} />
          Sign out
        </button>
      </div>
    </Sheet>
  );
}
