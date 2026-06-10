import 'package:flutter/material.dart';
import '../i18n/app_strings.dart';
import '../models/auth.dart';
import '../services/auth_service.dart';
import '../services/notification_service.dart';
import '../theme/app_theme.dart';

// ---------------------------------------------------------------------------
// Tokens & helpers
// ---------------------------------------------------------------------------
//
// A day's value is one of:
//   • a single exclusive token: `rest`, `workout`, `push`, `pull`, `upper`,
//     `lower`, `fullbody`
//   • one or more muscle-group tokens joined by `+`: e.g. `chest+back+arms`
//
// Single-token modes can't combine with anything; muscle groups can stack.
// The backend validator (`/api/me/weekly-plan/route.ts`) mirrors this.

const _exclusiveTokens = {
  'rest',
  'workout',
  'push',
  'pull',
  'upper',
  'lower',
  'fullbody',
};

// Legacy parser uses this map to recognise old muscle-group tokens
// (e.g. 'chest+arms') and treat them as non-rest days. The new picker
// only writes 'rest' or 'workout' so future days never carry these.
const _muscleLabelKeys = {
  'chest': 'plan.muscle_chest',
  'back': 'plan.muscle_back',
  'shoulders': 'plan.muscle_shoulders',
  'arms': 'plan.muscle_arms',
  'core': 'plan.muscle_core',
  'legs': 'plan.muscle_legs',
};

const _dayLongKeys = [
  'plan.day_h',
  'plan.day_k',
  'plan.day_sze',
  'plan.day_cs',
  'plan.day_p',
  'plan.day_szo',
  'plan.day_v',
];

/// Parses a stored day value into its mode (single exclusive token, if any)
/// and its muscle-group multi-pick set. Together they round-trip through
/// [_DayPlan.token].
class _DayPlan {
  /// One of [_exclusiveTokens], or `null` when only muscle groups are
  /// selected.
  final String? mode;

  /// Muscle-group tokens selected for this day. Empty when [mode] is set.
  final Set<String> muscles;

  const _DayPlan._(this.mode, this.muscles);

  factory _DayPlan.fromToken(String? raw) {
    if (raw == null || raw.isEmpty) return const _DayPlan._('rest', <String>{});
    final parts = raw.split('+').map((p) => p.trim()).where((p) => p.isNotEmpty);
    final muscles = <String>{};
    String? exclusive;
    for (final p in parts) {
      if (_exclusiveTokens.contains(p)) {
        exclusive = p;
      } else if (_muscleLabelKeys.containsKey(p)) {
        muscles.add(p);
      }
    }
    // Legacy: a stand-alone muscle token like `chest` parses straight into
    // the muscles set; the user can multi-select on top of it.
    if (exclusive == null && muscles.isEmpty) {
      return const _DayPlan._('rest', <String>{});
    }
    return _DayPlan._(exclusive, muscles);
  }

  bool get isRest => mode == 'rest';
  bool get hasMuscles => muscles.isNotEmpty;

  /// Serialise back to the storage token. Picks the mode if set; otherwise
  /// joins muscles alphabetically (canonical order matches the backend).
  String get token {
    if (mode != null) return mode!;
    if (muscles.isEmpty) return 'rest';
    final sorted = muscles.toList()..sort();
    return sorted.join('+');
  }

  _DayPlan copyWith({String? mode, Set<String>? muscles, bool clearMode = false}) {
    return _DayPlan._(
      clearMode ? null : (mode ?? this.mode),
      muscles ?? this.muscles,
    );
  }
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class WeeklyPlanEditScreen extends StatefulWidget {
  final AuthService auth;
  // Default plan to pre-fill when the user has no custom plan yet — comes
  // from the same split deduction the WeekPreview uses on the dashboard.
  final List<String> defaultPlan;

  const WeeklyPlanEditScreen({
    super.key,
    required this.auth,
    required this.defaultPlan,
  });

  @override
  State<WeeklyPlanEditScreen> createState() => _WeeklyPlanEditScreenState();
}

class _WeeklyPlanEditScreenState extends State<WeeklyPlanEditScreen> {
  late List<String> _plan;
  late bool _reminderOn;
  late TimeOfDay _reminderTime;
  late Set<int> _reminderDays;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final existing = widget.auth.user?.weeklyPlan;
    _plan = (existing != null && existing.length == 7)
        ? List<String>.from(existing)
        : List<String>.from(widget.defaultPlan);
    while (_plan.length < 7) {
      _plan.add('rest');
    }
    if (_plan.length > 7) _plan = _plan.sublist(0, 7);

    final r = widget.auth.user?.reminders;
    _reminderOn = r?.enabled ?? false;
    _reminderTime = _parseTime(r?.time ?? '18:00');
    _reminderDays = Set<int>.from(r?.days ?? const <int>[]);
    if (_reminderDays.isEmpty) {
      for (var i = 0; i < 7; i++) {
        if (_plan[i] != 'rest') _reminderDays.add(i + 1);
      }
    }
  }

  TimeOfDay _parseTime(String hhmm) {
    final parts = hhmm.split(':');
    if (parts.length != 2) return const TimeOfDay(hour: 18, minute: 0);
    return TimeOfDay(
      hour: int.tryParse(parts[0]) ?? 18,
      minute: int.tryParse(parts[1]) ?? 0,
    );
  }

  String _fmtTime(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  Future<void> _openDayPicker(int dayIndex) async {
    final initial = _DayPlan.fromToken(_plan[dayIndex]);
    final picked = await showModalBottomSheet<_DayPlan>(
      context: context,
      backgroundColor: AppColors.background,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => _DayPickerSheet(
        dayIndex: dayIndex,
        initial: initial,
      ),
    );
    if (picked != null) {
      setState(() {
        _plan[dayIndex] = picked.token;
        // Reminder days now derive from the plan in `_save()` — no need to
        // keep them in lockstep here.
      });
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _reminderTime,
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: AppColors.onSurface,
            surface: AppColors.surfaceLow,
            onSurface: AppColors.onSurface,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _reminderTime = picked);
  }

  Future<void> _save() async {
    if (_saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    try {
      await widget.auth.saveWeeklyPlan(_plan);
      // Reminders auto-fire on the user's workout days — derived from the
      // plan so there's no separate day picker to manage. Stored as ISO
      // weekday indices (1..7, Mon..Sun) matching the backend schema.
      final derivedDays = <int>[
        for (var i = 0; i < 7; i++)
          if (_plan[i] != 'rest') i + 1,
      ];
      _reminderDays = derivedDays.toSet();
      final prefs = ReminderPrefs(
        enabled: _reminderOn,
        time: _fmtTime(_reminderTime),
        days: derivedDays,
      );
      await widget.auth.saveReminders(prefs);
      if (_reminderOn && _reminderDays.isNotEmpty) {
        final granted = await NotificationService.instance.requestPermission();
        if (granted) {
          await NotificationService.instance.reschedule(prefs);
        } else if (mounted) {
          messenger.showSnackBar(
            SnackBar(content: Text(t('plan.notification_permission_required'))),
          );
        }
      } else {
        await NotificationService.instance.reschedule(prefs);
      }
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(content: Text(t('plan.saved'))));
      navigator.pop(true);
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = t('plan.save_failed'));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(color: AppColors.onSurface),
        title: const SizedBox.shrink(),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
          children: [
            Text(
              t('plan.title'),
              style: const TextStyle(
                fontSize: 11,
                letterSpacing: 1.6,
                color: AppColors.muted,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              t('plan.tagline'),
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                letterSpacing: -1,
                color: AppColors.onSurface,
                height: 1.1,
              ),
            ),
            const SizedBox(height: 24),
            for (var i = 0; i < 7; i++) ...[
              _DayRow(
                dayLabel: t(_dayLongKeys[i]),
                token: _plan[i],
                onTap: () => _openDayPicker(i),
              ),
              if (i < 6)
                const Divider(
                  height: 1,
                  thickness: 1,
                  color: AppColors.outline,
                ),
            ],
            const SizedBox(height: 32),
            Text(
              t('plan.reminder_section'),
              style: const TextStyle(
                fontSize: 11,
                letterSpacing: 1.6,
                color: AppColors.muted,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              t('plan.reminder_subtitle'),
              style: const TextStyle(
                  fontSize: 13, color: AppColors.muted, height: 1.4),
            ),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                color: AppColors.surfaceLow,
                borderRadius: BorderRadius.circular(20),
              ),
              padding:
                  const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
              child: Column(
                children: [
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    activeThumbColor: AppColors.background,
                    activeTrackColor: AppColors.onSurface,
                    inactiveThumbColor: AppColors.onSurface,
                    inactiveTrackColor: AppColors.surfaceHigh,
                    value: _reminderOn,
                    onChanged: (v) => setState(() => _reminderOn = v),
                    title: Text(
                      t('plan.reminder_enabled'),
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurface,
                        fontSize: 15,
                      ),
                    ),
                  ),
                  const Divider(
                    height: 1,
                    thickness: 1,
                    color: AppColors.outline,
                  ),
                  Opacity(
                    opacity: _reminderOn ? 1 : 0.5,
                    child: IgnorePointer(
                      ignoring: !_reminderOn,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    t('plan.reminder_time'),
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.onSurface,
                                    ),
                                  ),
                                ),
                                GestureDetector(
                                  onTap: _pickTime,
                                  behavior: HitTestBehavior.opaque,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 14, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: AppColors.surfaceHigh,
                                      borderRadius:
                                          BorderRadius.circular(100),
                                    ),
                                    child: Text(
                                      _fmtTime(_reminderTime),
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.onSurface,
                                        letterSpacing: -0.5,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            // DAYS picker removed by request — reminder
                            // days are now auto-derived from the plan
                            // (workout days = days with non-rest token)
                            // in `_save()` so the user only has to
                            // configure the workout schedule once.
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(_error!,
                  style: const TextStyle(
                      color: AppColors.onSurface, fontSize: 13)),
            ],
            const SizedBox(height: 28),
            SizedBox(
              width: double.infinity,
              child: TextButton(
                style: TextButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.background,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(100)),
                ),
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.background,
                        ),
                      )
                    : Text(
                        t('plan.save'),
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 2,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Day picker bottom sheet
// ---------------------------------------------------------------------------

class _DayPickerSheet extends StatefulWidget {
  final int dayIndex;
  final _DayPlan initial;

  const _DayPickerSheet({
    required this.dayIndex,
    required this.initial,
  });

  @override
  State<_DayPickerSheet> createState() => _DayPickerSheetState();
}

class _DayPickerSheetState extends State<_DayPickerSheet> {
  // The simplified picker only has two states — REST or WORKOUT. We
  // collapse the broader storage model into this binary at open time:
  // any non-`rest` legacy token (push/pull/muscle multi-pick/…) reads as
  // WORKOUT, and saving overwrites it back to a clean `workout`.
  late bool _isRest;

  @override
  void initState() {
    super.initState();
    _isRest = widget.initial.isRest;
  }

  void _confirm() {
    Navigator.of(context).pop(
      _DayPlan._(_isRest ? 'rest' : 'workout', const <String>{}),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 12,
          bottom: 20 + MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              margin: const EdgeInsets.symmetric(vertical: 8),
              height: 4,
              width: 40,
              decoration: BoxDecoration(
                color: AppColors.surfaceHigh,
                borderRadius: BorderRadius.circular(100),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              t(_dayLongKeys[widget.dayIndex]),
              style: const TextStyle(
                fontSize: 11,
                letterSpacing: 1.6,
                color: AppColors.muted,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: _BigChoice(
                    label: t('plan.label_rest'),
                    selected: _isRest,
                    onTap: () => setState(() => _isRest = true),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _BigChoice(
                    label: t('plan.label_workout'),
                    selected: !_isRest,
                    onTap: () => setState(() => _isRest = false),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: TextButton(
                style: TextButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.background,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(100)),
                ),
                onPressed: _confirm,
                child: Text(
                  t('common.done'),
                  style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                      letterSpacing: 1.5),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Full-width tap target with a single label — paired side-by-side they
/// give the user a clear REST / WORKOUT binary without any of the
/// muscle-group / split clutter the previous picker carried.
class _BigChoice extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _BigChoice({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 140),
        padding: const EdgeInsets.symmetric(vertical: 20),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(20),
          border: selected
              ? null
              : Border.all(color: AppColors.outline),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 15,
            letterSpacing: 1.5,
            fontWeight: FontWeight.w800,
            color: selected ? AppColors.background : AppColors.onSurface,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Row + chip widgets
// ---------------------------------------------------------------------------

class _DayRow extends StatelessWidget {
  final String dayLabel;
  final String token;
  final VoidCallback onTap;

  const _DayRow({
    required this.dayLabel,
    required this.token,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isRest = token == 'rest';
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Row(
          children: [
            Expanded(
              child: Text(
                dayLabel,
                style: const TextStyle(
                  fontSize: 13,
                  letterSpacing: 1.4,
                  color: AppColors.onSurface,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            Flexible(
              child: _ValueBadges(token: token, isRest: isRest),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right,
                size: 18, color: AppColors.muted),
          ],
        ),
      ),
    );
  }
}

/// Single pill that reads either REST (outline) or WORKOUT (filled).
/// Legacy data (push/pull/legs/chest+arms/…) collapses to WORKOUT so the
/// row stays one-glance readable even when the user hasn't re-saved the
/// day through the new two-choice picker yet.
class _ValueBadges extends StatelessWidget {
  final String token;
  final bool isRest;
  const _ValueBadges({required this.token, required this.isRest});

  @override
  Widget build(BuildContext context) {
    final label =
        isRest ? t('plan.label_rest') : t('plan.label_workout');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: isRest ? Colors.transparent : AppColors.onSurface,
        border: isRest ? Border.all(color: AppColors.surfaceHigh) : null,
        borderRadius: BorderRadius.circular(100),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          letterSpacing: 1.2,
          fontWeight: FontWeight.w800,
          color: isRest ? AppColors.muted : AppColors.background,
        ),
      ),
    );
  }
}


