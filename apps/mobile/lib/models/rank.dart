// Mirror of apps/web/lib/rank.ts — keep both in sync when adjusting thresholds.

class RankDef {
  /// 1-based tier (1..10).
  final int tier;

  /// Display name (uppercase, used as the rank label).
  final String name;

  /// Roman numeral marker — the visual signature of the rank.
  final String numeral;

  /// Minimum XP to reach this rank.
  final int threshold;

  const RankDef({
    required this.tier,
    required this.name,
    required this.numeral,
    required this.threshold,
  });

  factory RankDef.fromJson(Map<String, dynamic> json) => RankDef(
        tier: (json['tier'] as num).toInt(),
        name: json['name'] as String,
        numeral: json['numeral'] as String,
        threshold: (json['threshold'] as num).toInt(),
      );
}

const ranks = <RankDef>[
  RankDef(tier: 1, name: 'NOVICE', numeral: 'I', threshold: 0),
  RankDef(tier: 2, name: 'TRAINEE', numeral: 'II', threshold: 250),
  RankDef(tier: 3, name: 'LIFTER', numeral: 'III', threshold: 750),
  RankDef(tier: 4, name: 'REGULAR', numeral: 'IV', threshold: 1750),
  RankDef(tier: 5, name: 'INTERMEDIATE', numeral: 'V', threshold: 3500),
  RankDef(tier: 6, name: 'ADVANCED', numeral: 'VI', threshold: 7000),
  RankDef(tier: 7, name: 'STRONG', numeral: 'VII', threshold: 13000),
  RankDef(tier: 8, name: 'ELITE', numeral: 'VIII', threshold: 24000),
  RankDef(tier: 9, name: 'MASTER', numeral: 'IX', threshold: 45000),
  RankDef(tier: 10, name: 'LEGEND', numeral: 'X', threshold: 80000),
];

RankDef rankForTier(int tier) =>
    ranks.firstWhere((r) => r.tier == tier, orElse: () => ranks.first);

RankDef rankForXp(int xp) {
  RankDef current = ranks.first;
  for (final r in ranks) {
    if (xp >= r.threshold) {
      current = r;
    } else {
      break;
    }
  }
  return current;
}

RankDef? nextRankAfter(int tier) =>
    tier >= ranks.last.tier ? null : rankForTier(tier + 1);
