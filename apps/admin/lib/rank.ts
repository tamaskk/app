// 10-rank progression. Thresholds roughly double each tier so the curve is
// front-loaded (early levels feel quick) and back-loaded (legendary takes
// real commitment). Mirrored in apps/mobile/lib/models/rank.dart — keep the
// two files in sync when adjusting.

export interface RankDef {
  /** 1-based numeric tier (1..10). */
  tier: number;
  /** Display name shown in the UI. */
  name: string;
  /** Roman numeral used as the visual marker. */
  numeral: string;
  /** Minimum XP needed to reach this rank. */
  threshold: number;
}

export const RANKS: RankDef[] = [
  { tier: 1, name: "NOVICE", numeral: "I", threshold: 0 },
  { tier: 2, name: "TRAINEE", numeral: "II", threshold: 250 },
  { tier: 3, name: "LIFTER", numeral: "III", threshold: 750 },
  { tier: 4, name: "REGULAR", numeral: "IV", threshold: 1_750 },
  { tier: 5, name: "INTERMEDIATE", numeral: "V", threshold: 3_500 },
  { tier: 6, name: "ADVANCED", numeral: "VI", threshold: 7_000 },
  { tier: 7, name: "STRONG", numeral: "VII", threshold: 13_000 },
  { tier: 8, name: "ELITE", numeral: "VIII", threshold: 24_000 },
  { tier: 9, name: "MASTER", numeral: "IX", threshold: 45_000 },
  { tier: 10, name: "LEGEND", numeral: "X", threshold: 80_000 },
];

/** Highest rank a user with [xp] currently holds. */
export function rankForXp(xp: number): RankDef {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.threshold) current = r;
    else break;
  }
  return current;
}

/** The rank one step above [tier], or null if [tier] is the cap. */
export function nextRank(tier: number): RankDef | null {
  return RANKS.find((r) => r.tier === tier + 1) ?? null;
}
