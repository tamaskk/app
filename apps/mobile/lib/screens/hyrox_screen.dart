import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/api.dart';
import '../services/auth_service.dart';
import '../models/api_models.dart';
import '../models/workout.dart';
import '../utils/text.dart';
import 'workout_screen.dart';

/// Official HYROX divisions, label-matched to the backend (lib/hyroxPlan.ts).
const _divisions = <(String, String)>[
  ('men_open', 'Férfi Open'),
  ('women_open', 'Női Open'),
  ('men_pro', 'Férfi Pro'),
  ('women_pro', 'Női Pro'),
];

const _phaseNames = {
  1: 'Alapozás',
  2: 'Építés',
  3: 'Csúcsosítás',
  4: 'Pihentetés',
};

/// The HYROX tab. Mirrors the Edzések experience (list → player → log) but for
/// the 12-week HYROX preparation plan. Empty until the user taps "Terv
/// létrehozása", which seeds all 36 sessions in one backend call.
class HyroxScreen extends StatefulWidget {
  final AuthService? auth;
  const HyroxScreen({super.key, this.auth});

  @override
  State<HyroxScreen> createState() => _HyroxScreenState();
}

class _HyroxScreenState extends State<HyroxScreen> {
  final _api = Api();

  bool _loading = true;
  bool _creating = false;
  String? _error;
  List<SavedTraining> _plan = [];
  String _division = 'men_open';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _api.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final all = await _api.getTrainings(discipline: 'hyrox');
      final hyrox = all.where((t) => t.isHyrox).toList()
        ..sort((a, b) {
          final w = (a.weekIndex ?? 0).compareTo(b.weekIndex ?? 0);
          return w != 0 ? w : (a.dayIndex ?? 0).compareTo(b.dayIndex ?? 0);
        });
      if (mounted) setState(() => _plan = hyrox);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Nem értem el a szervert. Fut a backend?');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _createPlan({bool replace = false}) async {
    if (_creating) return;
    setState(() => _creating = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final res =
          await _api.createHyroxPlan(division: _division, replace: replace);
      messenger.showSnackBar(
        SnackBar(
          content: Text('HYROX terv létrehozva · ${res.created} edzés '
              '(${res.divisionLabel})'),
        ),
      );
      await _load();
    } on HyroxPlanExistsException {
      if (mounted) _confirmReplace();
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Nem sikerült létrehozni a tervet.')),
      );
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  Future<void> _confirmReplace() async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceLow,
        title: const Text('Már van HYROX terved'),
        content: const Text(
            'Lecseréled egy újra? A jelenlegi terv és a benne lévő haladás törlődik.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Mégse'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Csere',
                style: TextStyle(color: AppColors.accentRed)),
          ),
        ],
      ),
    );
    if (yes == true) _createPlan(replace: true);
  }

  Future<void> _deletePlan() async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceLow,
        title: const Text('Terv törlése'),
        content: const Text('Biztosan törlöd a teljes HYROX tervet?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Mégse'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Törlés',
                style: TextStyle(color: AppColors.accentRed)),
          ),
        ],
      ),
    );
    if (yes != true) return;
    try {
      await _api.deleteHyroxPlan();
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Nem sikerült törölni.')),
        );
      }
    }
  }

  Future<void> _openDay(SavedTraining t) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => WorkoutScreen(workout: _toWorkout(t))),
    );
    if (mounted) _load();
  }

  Workout _toWorkout(SavedTraining t) => Workout(
        id: t.id,
        name: t.name,
        number: (t.weekIndex ?? 0) * 3 + (t.dayIndex ?? 0) + 1,
        durationMinutes: 0,
        exercises: t.exercises
            .map((e) => Exercise(
                  name: e.name,
                  variant: e.category ?? '',
                  exerciseId: e.exerciseId,
                  gifUrl: e.gifUrl,
                  targetMuscles: e.targetMuscles,
                  progressionStrategy: e.progressionStrategy,
                  metric: e.metric,
                  stationKey: e.stationKey,
                  note: e.note,
                  sets: e.sets
                      .map((s) => WorkoutSet(
                            kg: s.kg,
                            reps: s.reps,
                            done: s.done,
                            distanceM: s.distanceM,
                            seconds: s.seconds,
                            targetKg: s.targetKg,
                          ))
                      .toList(),
                ))
            .toList(),
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(strokeWidth: 2))
            : _plan.isEmpty
                ? _EmptyState(
                    division: _division,
                    creating: _creating,
                    error: _error,
                    onDivision: (d) => setState(() => _division = d),
                    onCreate: () => _createPlan(),
                  )
                : RefreshIndicator(
                    onRefresh: _load,
                    color: AppColors.onSurface,
                    backgroundColor: AppColors.surfaceLow,
                    child: _planList(),
                  ),
      ),
    );
  }

  Widget _planList() {
    final doneCount = _plan.where((t) => t.isDone).length;
    // Group by week, preserving order.
    final byWeek = <int, List<SavedTraining>>{};
    for (final t in _plan) {
      byWeek.putIfAbsent(t.weekIndex ?? 0, () => []).add(t);
    }
    final weeks = byWeek.keys.toList()..sort();

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(child: _header(doneCount)),
        for (final w in weeks)
          SliverToBoxAdapter(child: _weekBlock(w, byWeek[w]!)),
        const SliverToBoxAdapter(child: SizedBox(height: 32)),
      ],
    );
  }

  Widget _header(int doneCount) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('HYROX',
                    style: TextStyle(
                        fontSize: 34,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -1,
                        color: AppColors.onSurface)),
                const SizedBox(height: 2),
                Text('12 hetes felkészülés · $doneCount / ${_plan.length} nap kész',
                    style: const TextStyle(
                        fontSize: 14, color: AppColors.muted)),
              ],
            ),
          ),
          IconButton(
            onPressed: _deletePlan,
            icon: const Icon(Icons.delete_outline, color: AppColors.muted),
            tooltip: 'Terv törlése',
          ),
        ],
      ),
    );
  }

  Widget _weekBlock(int week, List<SavedTraining> days) {
    final phase = days.first.phase ?? 1;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
          child: Row(
            children: [
              Text('${week + 1}. hét',
                  style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface)),
              const SizedBox(width: 10),
              _phaseChip(phase),
            ],
          ),
        ),
        ...days.map(_dayCard),
      ],
    );
  }

  Widget _phaseChip(int phase) {
    final color =
        phase == 4 ? AppColors.accentGreen : AppColors.accentAmber;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(_phaseNames[phase] ?? '',
          style: TextStyle(
              fontSize: 11.5, fontWeight: FontWeight.w700, color: color)),
    );
  }

  Widget _dayCard(SavedTraining t) {
    final done = t.isDone;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
      child: GestureDetector(
        onTap: () => _openDay(t),
        behavior: HitTestBehavior.opaque,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.surfaceLow,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: done ? AppColors.accentGreen : AppColors.outline,
              width: done ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.surfaceMid,
                ),
                child: Text('${(t.dayIndex ?? 0) + 1}',
                    style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_focusOf(t),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppColors.onSurface)),
                    const SizedBox(height: 3),
                    Text('${t.exercises.length} gyakorlat · ${t.totalSets} szett',
                        style: const TextStyle(
                            fontSize: 12.5, color: AppColors.muted)),
                  ],
                ),
              ),
              Icon(
                done ? Icons.check_circle : Icons.chevron_right,
                color: done ? AppColors.accentGreen : AppColors.muted,
                size: done ? 22 : 24,
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// The session name is "Fázis · N. hét · Fókusz" — show just the focus part.
  String _focusOf(SavedTraining t) {
    final parts = t.name.split('·');
    final focus = parts.isNotEmpty ? parts.last.trim() : t.name;
    return titleCase(focus);
  }
}

class _EmptyState extends StatelessWidget {
  final String division;
  final bool creating;
  final String? error;
  final ValueChanged<String> onDivision;
  final VoidCallback onCreate;

  const _EmptyState({
    required this.division,
    required this.creating,
    required this.error,
    required this.onDivision,
    required this.onCreate,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 40, 24, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('HYROX',
              style: TextStyle(
                  fontSize: 40,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -1.5,
                  color: AppColors.onSurface)),
          const SizedBox(height: 8),
          const Text(
            '12 hetes felkészülési terv · heti 3 edzésnap · 4 fázis '
            '(Alapozás → Építés → Csúcsosítás → Pihentetés). A 8 hivatalos '
            'állomás verseny-súlyokkal, periodizált futással és kompromittált '
            'futással.',
            style: TextStyle(
                fontSize: 15, height: 1.45, color: AppColors.muted),
          ),
          const SizedBox(height: 28),
          const Text('DIVÍZIÓ',
              style: TextStyle(
                  fontSize: 11,
                  letterSpacing: 1.4,
                  fontWeight: FontWeight.w700,
                  color: AppColors.muted)),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final (value, label) in _divisions)
                _DivisionChip(
                  label: label,
                  selected: value == division,
                  onTap: () => onDivision(value),
                ),
            ],
          ),
          const SizedBox(height: 8),
          const Text('Az alapértelmezett súlyok a Férfi Open divízióé.',
              style: TextStyle(fontSize: 12.5, color: AppColors.muted)),
          if (error != null) ...[
            const SizedBox(height: 16),
            Text(error!,
                style: const TextStyle(
                    fontSize: 13, color: AppColors.accentRed)),
          ],
          const SizedBox(height: 28),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: creating ? null : onCreate,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.background,
                disabledBackgroundColor: AppColors.surfaceHigh,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              child: creating
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: AppColors.background),
                    )
                  : const Text('Terv létrehozása',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w700)),
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Egy kattintás létrehozza mind a 36 edzésnapot. Bármikor törölheted '
            'és újra létrehozhatod.',
            style: TextStyle(fontSize: 12.5, color: AppColors.muted),
          ),
        ],
      ),
    );
  }
}

class _DivisionChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _DivisionChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppColors.onSurface : AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? AppColors.onSurface : AppColors.outline,
          ),
        ),
        child: Text(label,
            style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: selected ? AppColors.background : AppColors.onSurface)),
      ),
    );
  }
}
