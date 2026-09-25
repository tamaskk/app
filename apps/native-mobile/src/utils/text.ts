// Ported from apps/mobile/lib/utils/text.dart.
/** Capitalises the first letter of every word, leaving the rest as-is. */
export function titleCase(s: string): string {
  return s.replace(/\w+/g, (w) => w[0].toUpperCase() + w.substring(1));
}
