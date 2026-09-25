// Mirror of apps/web/lib/rank.ts — ported from apps/mobile/lib/models/rank.dart.
export class RankDef {
  constructor(
    public tier: number,
    public name: string,
    public numeral: string,
    public threshold: number,
  ) {}
  static fromJson(j: any): RankDef {
    return new RankDef(
      (j.tier as number) ?? 1,
      (j.name as string) ?? "",
      (j.numeral as string) ?? "",
      (j.threshold as number) ?? 0,
    );
  }
}

export const ranks: RankDef[] = [
  new RankDef(1, "NOVICE", "I", 0),
  new RankDef(2, "TRAINEE", "II", 250),
  new RankDef(3, "LIFTER", "III", 750),
  new RankDef(4, "REGULAR", "IV", 1750),
  new RankDef(5, "INTERMEDIATE", "V", 3500),
  new RankDef(6, "ADVANCED", "VI", 7000),
  new RankDef(7, "STRONG", "VII", 13000),
  new RankDef(8, "ELITE", "VIII", 24000),
  new RankDef(9, "MASTER", "IX", 45000),
  new RankDef(10, "LEGEND", "X", 80000),
];

export function rankForTier(tier: number): RankDef {
  return ranks.find((r) => r.tier === tier) ?? ranks[0];
}

export function rankForXp(xp: number): RankDef {
  let current = ranks[0];
  for (const r of ranks) {
    if (xp >= r.threshold) current = r;
    else break;
  }
  return current;
}

export function nextRankAfter(tier: number): RankDef | null {
  return tier >= ranks[ranks.length - 1].tier ? null : rankForTier(tier + 1);
}
