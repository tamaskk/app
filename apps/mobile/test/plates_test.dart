import 'package:flutter_test/flutter_test.dart';
import 'package:heftor/utils/plates.dart';

void main() {
  group('computePlates', () {
    test('100kg loads fewest plates first (25 + 15), exact', () {
      final r = computePlates(100);
      expect(r.perSide, [25, 15]);
      expect(r.achievable, 100);
      expect(r.exact, true);
      expect(r.feasible, true);
    });

    test('without a 15 plate, 100kg loads 25 + 10 + 5', () {
      final r = computePlates(100, availablePlates: [25, 20, 10, 5, 2.5, 1.25]);
      expect(r.perSide, [25, 10, 5]);
      expect(r.achievable, 100);
    });

    test('97.5kg is exactly loadable with 1.25s', () {
      final r = computePlates(97.5);
      expect(r.perSide, [25, 10, 2.5, 1.25]);
      expect(r.exact, true);
    });

    test('unreachable target rounds DOWN to closest achievable', () {
      final r = computePlates(99);
      expect(r.exact, false);
      expect(r.achievable, 97.5);
      expect(closestNote(r), 'closest achievable: 97.5kg');
    });

    test('bar-only weight: no plates, exact', () {
      final r = computePlates(20);
      expect(r.perSide, isEmpty);
      expect(r.achievable, 20);
      expect(r.exact, true);
      expect(formatEquation(r), '20kg = 20kg bar');
    });

    test('below the bar weight is infeasible', () {
      final r = computePlates(15);
      expect(r.feasible, false);
      expect(r.perSide, isEmpty);
      expect(r.achievable, 20);
    });

    test('custom bar weight and plate set', () {
      final r = computePlates(60, barWeight: 15, availablePlates: [20, 10]);
      expect(r.perSide, [20]);
      expect(r.achievable, 55);
      expect(r.exact, false);
    });
  });

  group('rendering', () {
    test('formatEquation spec example (no 15 plate)', () {
      final r = computePlates(100, availablePlates: [25, 20, 10, 5, 2.5, 1.25]);
      expect(formatEquation(r), '100kg = 20kg bar + 2×(25 + 10 + 5)');
    });

    test('formatBarDiagram symmetric around the bar', () {
      final r = computePlates(100, availablePlates: [25, 20, 10, 5, 2.5, 1.25]);
      expect(formatBarDiagram(r), '5 10 25 [I===] 20kg bar [===I] 25 10 5');
    });

    test('formatBarDiagram with no plates is just the bar', () {
      expect(formatBarDiagram(computePlates(20)), '[I===] 20kg bar [===I]');
    });
  });
}
