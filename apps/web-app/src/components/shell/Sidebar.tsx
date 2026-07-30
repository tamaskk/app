"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { displayName } from "@/lib/types";
import { rankNumeral } from "@/lib/format";
import { NAV_ITEMS, isActive } from "./navItems";

// Desktop-only left rail (≥ lg). The mobile build never shows this — it uses the
// bottom nav — so this is the "nicer desktop" chrome the brief asks for.
export function Sidebar() {
  const pathname = usePathname();
  const { t, lang, setLang } = useI18n();
  const { user, logout } = useAuth();

  const label = (key: string) => (key.startsWith("!") ? key.slice(1) : t(key));

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-outline bg-surface-low/30 px-4 py-6 lg:flex">
      <div className="px-3">
        <span className="text-2xl font-extrabold tracking-[0.04em] text-on-surface">
          HEFTOR
        </span>
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold outline-none transition-colors focus-visible:outline-none ${
                active
                  ? "bg-surface-mid text-on-surface"
                  : "text-muted hover:bg-surface-low hover:text-on-surface"
              }`}
            >
              <Icon name={item.icon} size={22} />
              {label(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        {/* language toggle — mirrors the app's EN/HU switch */}
        <div className="flex items-center gap-1 rounded-xl bg-surface-low p-1">
          {(["en", "hu"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-bold uppercase transition-colors ${
                lang === l ? "bg-surface-high text-on-surface" : "text-muted"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {user && (
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-mid text-sm font-bold text-on-surface">
              {rankNumeral(user.rank)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-on-surface">
                {displayName(user)}
              </div>
              <div className="truncate text-xs text-muted">{user.email}</div>
            </div>
            <button
              onClick={logout}
              className="text-muted hover:text-on-surface"
              title={t("account.title")}
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
