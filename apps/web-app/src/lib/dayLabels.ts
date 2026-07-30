import { t } from "./i18n";

// ISO-weekday (0=Mon … 6=Sun) short labels, matching plan.day_short_* order.
const DAY_SHORT_KEYS = [
  "plan.day_short_h",
  "plan.day_short_k",
  "plan.day_short_sze",
  "plan.day_short_cs",
  "plan.day_short_p",
  "plan.day_short_szo",
  "plan.day_short_v",
];

/** Short weekday label for a JS Date (Mon-first). */
export function dayShort(d: Date): string {
  const iso = (d.getDay() + 6) % 7; // 0 = Monday
  return t(DAY_SHORT_KEYS[iso]);
}

/** Uppercase month abbreviation (month.1..12). */
export function monthShort(d: Date): string {
  return t(`month.${d.getMonth() + 1}`);
}
