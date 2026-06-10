import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/plates.dart';

/// Device-persistent settings for the plate calculator: the bar weight and the
/// plates the user owns. Loaded once at startup and read synchronously from the
/// workout screen. A [ValueListenable] so settings UIs rebuild on change.
///
/// Stored locally (SharedPreferences) like the auth token — the backend data
/// layer isn't user-scoped yet, so this is per-device.
class PlateSettings extends ChangeNotifier {
  PlateSettings._();
  static final PlateSettings instance = PlateSettings._();

  static const _barKey = 'plate_bar_weight';
  static const _platesKey = 'plate_available';

  double _barWeight = defaultBarWeight;
  List<double> _availablePlates = List.of(defaultPlates);

  double get barWeight => _barWeight;
  List<double> get availablePlates => List.unmodifiable(_availablePlates);

  /// Load persisted values. Never throws — falls back to defaults.
  Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final bar = prefs.getDouble(_barKey);
      final plates = prefs.getStringList(_platesKey);
      if (bar != null && bar > 0) _barWeight = bar;
      if (plates != null && plates.isNotEmpty) {
        final parsed = plates
            .map(double.tryParse)
            .whereType<double>()
            .where((p) => p > 0)
            .toList()
          ..sort((a, b) => b.compareTo(a));
        if (parsed.isNotEmpty) _availablePlates = parsed;
      }
    } catch (_) {
      // Storage unavailable — keep defaults.
    }
    notifyListeners();
  }

  /// Update + persist. Best-effort persistence; in-memory always succeeds.
  Future<void> update({double? barWeight, List<double>? availablePlates}) async {
    if (barWeight != null && barWeight > 0) _barWeight = barWeight;
    if (availablePlates != null) {
      final cleaned = availablePlates.where((p) => p > 0).toSet().toList()
        ..sort((a, b) => b.compareTo(a));
      if (cleaned.isNotEmpty) _availablePlates = cleaned;
    }
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setDouble(_barKey, _barWeight);
      await prefs.setStringList(
        _platesKey,
        _availablePlates.map((p) => p.toString()).toList(),
      );
    } catch (_) {
      // Couldn't persist; values still live for this session.
    }
  }

  /// Reset to the spec defaults.
  Future<void> resetToDefaults() =>
      update(barWeight: defaultBarWeight, availablePlates: List.of(defaultPlates));
}
