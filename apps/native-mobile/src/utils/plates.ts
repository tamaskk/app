// Barbell plate calculator (mirrors apps/web/lib/plates.ts). Ported from
// apps/mobile/lib/utils/plates.dart. Pure, on-device.
export const defaultBarWeight = 20;
export const defaultPlates: number[] = [25, 20, 15, 10, 5, 2.5, 1.25];

const EPS = 1e-9;

export interface PlateResult {
  target: number;
  barWeight: number;
  /** Plates for ONE side, heaviest first. */
  perSide: number[];
  /** bar + 2 × Σ(perSide). */
  achievable: number;
  exact: boolean;
  feasible: boolean;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Plates per side for [target], largest first; closest weight ≤ target. */
export function computePlates(
  target: number,
  barWeight: number = defaultBarWeight,
  availablePlates: number[] = defaultPlates,
): PlateResult {
  const feasible = target >= barWeight - EPS;
  if (!feasible) {
    return { target, barWeight, perSide: [], achievable: barWeight, exact: false, feasible: false };
  }
  const plates = availablePlates.filter((p) => p > 0).sort((a, b) => b - a);
  let remaining = (target - barWeight) / 2;
  const perSide: number[] = [];
  for (const plate of plates) {
    while (remaining >= plate - EPS) {
      perSide.push(plate);
      remaining -= plate;
    }
  }
  const perSideSum = perSide.reduce((a, p) => a + p, 0);
  const achievable = round2(barWeight + perSideSum * 2);
  return { target, barWeight, perSide, achievable, exact: Math.abs(achievable - target) < 1e-6, feasible: true };
}

/** Trim trailing zeros: 2.5 → "2.5", 5 → "5". */
export function fmtPlate(n: number): string {
  const r = Math.round(n * 100) / 100;
  return r === Math.round(r) ? String(Math.trunc(r)) : String(r);
}

export function formatEquation(r: PlateResult): string {
  const head = `${fmtPlate(r.achievable)}kg = ${fmtPlate(r.barWeight)}kg bar`;
  if (r.perSide.length === 0) return head;
  return `${head} + 2×(${r.perSide.map(fmtPlate).join(" + ")})`;
}

export function formatBarDiagram(r: PlateResult): string {
  const left = [...r.perSide].reverse().map(fmtPlate).join(" ");
  const right = r.perSide.map(fmtPlate).join(" ");
  const bar = `[I===] ${fmtPlate(r.barWeight)}kg bar [===I]`;
  return [left, bar, right].filter((s) => s.length > 0).join(" ");
}

export function closestNote(r: PlateResult): string | null {
  return r.exact ? null : `closest achievable: ${fmtPlate(r.achievable)}kg`;
}
