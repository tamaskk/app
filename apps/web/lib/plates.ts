// Barbell plate calculator.
//
// Pure, dependency-free. Given a target weight, the bar weight and the plates
// available, it works out the plates to load PER SIDE (greedy, heaviest first)
// and the nearest achievable weight at or below the target. Text-only render
// helpers produce the overlay strings.

export const DEFAULT_BAR_WEIGHT = 20;
export const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export interface PlateResult {
  target: number;
  barWeight: number;
  /** Plates for ONE side, heaviest first. */
  perSide: number[];
  /** bar + 2 × Σ(perSide) — what you can actually load. */
  achievable: number;
  /** achievable === target (within rounding). */
  exact: boolean;
  /** target is at least the bar weight (otherwise nothing can be loaded). */
  feasible: boolean;
}

const EPS = 1e-9;

/**
 * Plates per side for `target`, using the largest plates first. When the
 * target can't be matched exactly, returns the closest achievable weight BELOW
 * it (you never want to lift more than asked by accident).
 */
export function computePlates(
  target: number,
  barWeight: number = DEFAULT_BAR_WEIGHT,
  availablePlates: number[] = DEFAULT_PLATES,
): PlateResult {
  const feasible = target >= barWeight - EPS;

  if (!feasible) {
    return { target, barWeight, perSide: [], achievable: barWeight, exact: false, feasible: false };
  }

  const plates = [...availablePlates].filter((p) => p > 0).sort((a, b) => b - a);
  let perSideRemaining = (target - barWeight) / 2;
  const perSide: number[] = [];

  for (const plate of plates) {
    while (perSideRemaining >= plate - EPS) {
      perSide.push(plate);
      perSideRemaining -= plate;
    }
  }

  const perSideSum = perSide.reduce((a, p) => a + p, 0);
  const achievable = round2(barWeight + perSideSum * 2);

  return {
    target,
    barWeight,
    perSide,
    achievable,
    exact: Math.abs(achievable - target) < 1e-6,
    feasible: true,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Trim trailing zeros: 2.5 → "2.5", 5 → "5". */
export function fmt(n: number): string {
  return `${Math.round(n * 100) / 100}`;
}

/**
 * `100kg = 20kg bar + 2×(25 + 10 + 5)` — or just `… = 20kg bar` when no plates
 * fit. Uses the achievable weight (which equals target when exact).
 */
export function formatEquation(r: PlateResult): string {
  const head = `${fmt(r.achievable)}kg = ${fmt(r.barWeight)}kg bar`;
  if (r.perSide.length === 0) return head;
  return `${head} + 2×(${r.perSide.map(fmt).join(" + ")})`;
}

/**
 * Single-line text bar: lightest→heaviest on the left, the bar in the middle,
 * heaviest→lightest on the right. e.g. `5 10 25 [I===] 20kg bar [===I] 25 10 5`.
 */
export function formatBarDiagram(r: PlateResult): string {
  const inToOut = [...r.perSide]; // heaviest first
  const left = [...inToOut].reverse().map(fmt).join(" ");
  const right = inToOut.map(fmt).join(" ");
  const bar = `[I===] ${fmt(r.barWeight)}kg bar [===I]`;
  return [left, bar, right].filter((s) => s.length > 0).join(" ");
}

/** `closest achievable: 97.5kg`, or null when the target is exact/loadable. */
export function closestNote(r: PlateResult): string | null {
  if (r.exact) return null;
  return `closest achievable: ${fmt(r.achievable)}kg`;
}
