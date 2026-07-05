// Auto-generated English→Hungarian labels for exercise muscle /
// body-part / equipment vocabulary. The catalogue stores/filters these in
// English (a stable key the backend matches on), but the UI should DISPLAY
// them in the app language. Source: the exercise catalogue's localized
// {lng,value} pairs. Keys are lowercased English.
library;

import '../i18n/app_strings.dart';

const Map<String, String> _en2hu = {
  'abdominals': 'hasizom',
  'abductors': 'elrabló izmok',
  'abs': 'hasizom',
  'adductors': 'közelítő izmok',
  'ankle stabilizers': 'bokastabilizálók',
  'ankles': 'bokák',
  'assisted': 'fitball',
  'back': 'hát',
  'band': 'sáv',
  'barbell': 'rúd/súlyzórúd',
  'biceps': 'bicepsz',
  'body weight': 'saját testsúly',
  'bosu ball': 'bosu labda',
  'brachialis': 'brachialis',
  'cable': 'kábelsúly',
  'calves': 'vádli',
  'cardio': 'kardiovaszkuláris rendszer',
  'cardiovascular system': 'kardiovaszkuláris rendszer',
  'chest': 'mellizom',
  'core': 'törzs',
  'deltoids': 'vállizom',
  'delts': 'deltaizom',
  'dumbbell': 'kézisúlyzó',
  'elliptical machine': 'elliptikus gép',
  'ez barbell': 'ez rúd',
  'feet': 'lábak',
  'forearms': 'alkarok',
  'glutes': 'farizom',
  'hammer': 'kalapács',
  'hamstrings': 'hajlító izmok',
  'hands': 'kéz',
  'hip flexors': 'csípőhajlítók',
  'kettlebell': 'kettlebell',
  'latissimus dorsi': 'széles hátizom',
  'lats': 'hátizom',
  'leverage machine': 'karhajlító gép',
  'lower arms': 'alsókar',
  'lower back': 'alsó hát',
  'lower legs': 'alsó láb',
  'medicine ball': 'medicinlabda',
  'middle back': 'középső hát',
  'neck': 'nyak',
  'obliques': 'ferde hasizom',
  'pectorals': 'mellizom',
  'quadriceps': 'négyfejű combizom',
  'quads': 'négyszögű combizom',
  'rear deltoids': 'hátsó delta',
  'resistance band': 'ellenállásos szalag',
  'rhomboids': 'rombuszizom',
  'roller': 'roller',
  'rope': 'kötél',
  'rotator cuff': 'rotátor mandula',
  'serratus anterior': 'elülső fűrészizom',
  'shoulders': 'váll',
  'sled machine': 'húzódzkodó gép',
  'smith machine': 'smith gép',
  'soleus': 'sóleus',
  'spine': 'gerinc',
  'stability ball': 'stabilitási labda',
  'stationary bike': 'szobakerékpár',
  'trapezius': 'trapézizom',
  'traps': 'trapézizom',
  'triceps': 'tricepsz',
  'upper arms': 'felkar',
  'upper back': 'felső hát',
  'upper chest': 'felső mellizom',
  'upper legs': 'felső lábak',
  'waist': 'derék',
  'weighted': 'súlyos',
  'wheel roller': 'kerék kihúzó',
  'wrist extensors': 'csuklófeszítők',
  'wrists': 'csukló',
};

/// Localized display label for a catalogue term stored in English. Falls back
/// to the original string (English UI, or an unmapped term).
String exLabel(String enValue) {
  if (!AppStrings.instance.isHu) return enValue;
  return _en2hu[enValue.toLowerCase().trim()] ?? enValue;
}

/// Localize a list of catalogue terms (e.g. targetMuscles) for display.
List<String> exLabels(Iterable<String> enValues) =>
    enValues.map(exLabel).toList();
