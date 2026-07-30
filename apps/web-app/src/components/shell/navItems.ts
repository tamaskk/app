import type { IconName } from "@/components/ui/Icon";

// The 5 main tabs — same order as main.dart's _BottomNav.
export type NavItem = {
  href: string;
  labelKey: string; // i18n key, or a literal when prefixed with "!"
  icon: IconName;
  iconFilled: IconName;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "nav.home", icon: "home", iconFilled: "home_filled" },
  { href: "/trainings", labelKey: "nav.workouts", icon: "dumbbell", iconFilled: "dumbbell_filled" },
  { href: "/hyrox", labelKey: "!HYROX", icon: "sports_score", iconFilled: "sports_score_filled" },
  { href: "/progress", labelKey: "nav.progress", icon: "trending_up", iconFilled: "trending_up" },
  { href: "/calendar", labelKey: "nav.calendar", icon: "calendar", iconFilled: "calendar_filled" },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
