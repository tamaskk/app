// Barbell plate calculator (mirrors apps/web/lib/plates.ts).
//
// Pure: given a target weight, the bar weight and the available plates, it
// works out the plates to load PER SIDE (greedy, heaviest first) and the
// nearest achievable weight at or below the target. Text-only render helpers
// produce the overlay strings. Runs on-device — no backend round-trip.

const double defaultBarWeight = 20;
const List<double> defaultPlates = [25, 20, 15, 10, 5, 2.5, 1.25];

const double _eps = 1e-9;

class PlateResult {
  final double target;
  final double barWeight;

  /// Plates for ONE side, heaviest first.
  final List<double> perSide;

  /// bar + 2 × Σ(perSide) — what you can actually load.
  final double achievable;

  /// achievable == target (within rounding).
  final bool exact;

  /// target is at least the bar weight (otherwise nothing can be loaded).
  final bool feasible;

  PlateResult({
    required this.target,
    required this.barWeight,
    required this.perSide,
    required this.achievable,
    required this.exact,
    required this.feasible,
  });
}

/// Plates per side for [target], largest plates first. When the target can't be
/// matched exactly, returns the closest achievable weight BELOW it.
PlateResult computePlates(
  double target, {
  double barWeight = defaultBarWeight,
  List<double> availablePlates = defaultPlates,
}) {
  final feasible = target >= barWeight - _eps;
  if (!feasible) {
    return PlateResult(
      target: target,
      barWeight: barWeight,
      perSide: const [],
      achievable: barWeight,
      exact: false,
      feasible: false,
    );
  }

  final plates = availablePlates.where((p) => p > 0).toList()
    ..sort((a, b) => b.compareTo(a));
  var remaining = (target - barWeight) / 2;
  final perSide = <double>[];

  for (final plate in plates) {
    while (remaining >= plate - _eps) {
      perSide.add(plate);
      remaining -= plate;
    }
  }

  final perSideSum = perSide.fold<double>(0, (a, p) => a + p);
  final achievable = _round2(barWeight + perSideSum * 2);

  return PlateResult(
    target: target,
    barWeight: barWeight,
    perSide: perSide,
    achievable: achievable,
    exact: (achievable - target).abs() < 1e-6,
    feasible: true,
  );
}

double _round2(double n) => (n * 100).round() / 100;

/// Trim trailing zeros: 2.5 → "2.5", 5 → "5".
String fmtPlate(double n) {
  final r = (n * 100).round() / 100;
  return r == r.roundToDouble() ? r.toInt().toString() : r.toString();
}

/// `100kg = 20kg bar + 2×(25 + 15)` — or just `… = 20kg bar` when none fit.
String formatEquation(PlateResult r) {
  final head = '${fmtPlate(r.achievable)}kg = ${fmtPlate(r.barWeight)}kg bar';
  if (r.perSide.isEmpty) return head;
  return '$head + 2×(${r.perSide.map(fmtPlate).join(' + ')})';
}

/// `5 10 25 [I===] 20kg bar [===I] 25 10 5` — symmetric, heaviest near the bar.
String formatBarDiagram(PlateResult r) {
  final left = r.perSide.reversed.map(fmtPlate).join(' ');
  final right = r.perSide.map(fmtPlate).join(' ');
  final bar = '[I===] ${fmtPlate(r.barWeight)}kg bar [===I]';
  return [left, bar, right].where((s) => s.isNotEmpty).join(' ');
}

/// `closest achievable: 97.5kg`, or null when the target is exact/loadable.
String? closestNote(PlateResult r) =>
    r.exact ? null : 'closest achievable: ${fmtPlate(r.achievable)}kg';
