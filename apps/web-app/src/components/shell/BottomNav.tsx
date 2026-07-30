"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { NAV_ITEMS, isActive } from "./navItems";

// main.dart `_BottomNav` — 5 icon tabs on pure-black, each with a 4px active
// dot underneath. Hidden on desktop (sidebar takes over ≥ lg).
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 bg-background pt-2 pb-[max(8px,env(safe-area-inset-bottom))] lg:hidden">
      <div className="mx-auto flex max-w-[480px]">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.labelKey.startsWith("!") ? item.labelKey.slice(1) : item.labelKey}
              className="flex flex-1 flex-col items-center py-1 outline-none focus:outline-none focus-visible:outline-none"
            >
              <Icon
                name={item.icon}
                size={24}
                className={active ? "text-on-surface" : "text-muted"}
              />
              <div
                className={`mt-1.5 h-1 w-1 rounded-full ${
                  active ? "bg-on-surface" : "bg-transparent"
                }`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
