import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../i18n/app_strings.dart';
import '../theme/app_theme.dart';
import '../services/api.dart';
import '../services/auth_service.dart';
import '../services/workout_progress.dart';
import '../models/api_models.dart';
import '../models/workout.dart';
import '../utils/recent_pr.dart';
import '../utils/text.dart';
import '../widgets/generated_stories.dart';
import '../widgets/training_actions.dart';
import '../widgets/workout_stories.dart';
import '../data/predefined_workouts.dart';
import 'create_training_screen.dart';
import 'predefined_workout_screen.dart';
import 'training_generator_screen.dart';
import 'workout_screen.dart';

// SharedPreferences keys for the per-user section hide toggles.
const _kHideRecommended = 'hide_recommended_trainings';
const _kHideGenerated = 'hide_generated_trainings';

class TrainingsListScreen extends StatefulWidget {
  final AuthService? auth;
  const TrainingsListScreen({super.key, this.auth});

  @override
  State<TrainingsListScreen> createState() => _TrainingsListScreenState();
}

class _TrainingsListScreenState extends State<TrainingsListScreen> {
  final _api = Api();

  bool _loading = true;
  String? _error;
  List<SavedTraining> _trainings = [];
  List<WorkoutSession> _sessions = [];
  // In-progress workouts the user backed out of, keyed by training id.
  Map<String, WorkoutProgress> _inProgress = {};
  bool _hideRecommended = false;
  bool _hideGenerated = false;

  @override
  void initState() {
    super.initState();
    _loadHideFlags();
    _load();
  }

  @override
  void dispose() {
    _api.dispose();
    super.dispose();
  }

  Future<void> _loadHideFlags() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (!mounted) return;
      setState(() {
        _hideRecommended = prefs.getBool(_kHideRecommended) ?? false;
        _hideGenerated = prefs.getBool(_kHideGenerated) ?? false;
      });
    } catch (_) {}
  }

  Future<void> _setHide(String key, bool value, {required bool isRec}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(key, value);
    } catch (_) {}
    if (!mounted) return;
    setState(() {
      if (isRec) {
        _hideRecommended = value;
      } else {
        _hideGenerated = value;
      }
    });
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final trainings = await _api.getTrainings();
      List<WorkoutSession> sessions = const [];
      try {
        sessions = await _api.getSessions();
      } catch (_) {}
      // In-progress workouts to surface as "continue" cards.
      Map<String, WorkoutProgress> inProgress = const {};
      try {
        inProgress = await WorkoutProgressStore.all();
      } catch (_) {}
      if (mounted) {
        setState(() {
          _trainings = trainings;
          _sessions = sessions;
          _inProgress = inProgress;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Could not reach the server. Is it running?');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openCreate() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => CreateTrainingScreen(auth: widget.auth),
      ),
    );
    if (created == true) _load();
  }

  Future<void> _openGenerator() async {
    final auth = widget.auth;
    if (auth == null) return;
    final ok = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => TrainingGeneratorScreen(auth: auth),
      ),
    );
    if (ok == true) _load();
  }

  Future<void> _openPredefined(PredefinedWorkout w) async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
          builder: (_) => PredefinedWorkoutScreen(workout: w, auth: widget.auth)),
    );
    if (saved == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t('trainings.added'))),
      );
      _load();
    }
  }

  Future<void> _openTraining(SavedTraining t, int index) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => WorkoutScreen(workout: _toWorkout(t, index)),
      ),
    );
    if (mounted) _load();
  }

  Workout _toWorkout(SavedTraining t, int index) => Workout(
        id: t.id,
        name: t.name,
        number: index + 1,
        durationMinutes: 0,
        exercises: t.exercises
            .map((e) => Exercise(
                  name: e.name,
                  variant: e.category ?? '',
                  exerciseId: e.exerciseId,
                  gifUrl: e.gifUrl,
                  targetMuscles: e.targetMuscles,
                  progressionStrategy: e.progressionStrategy,
                  sets: e.sets
                      .map((s) =>
                          WorkoutSet(kg: s.kg, reps: s.reps, done: s.done))
                      .toList(),
                ))
            .toList(),
      );

  // --- derived buckets ------------------------------------------------------

  /// Saved trainings that have a continuable in-progress workout, newest first.
  List<SavedTraining> get _resumableTrainings {
    final out = _trainings
        .where((t) => (_inProgress[t.id]?.hasProgress ?? false))
        .toList();
    out.sort((a, b) => _inProgress[b.id]!
        .updatedAt
        .compareTo(_inProgress[a.id]!.updatedAt));
    return out;
  }

  Future<void> _discardProgress(SavedTraining t) async {
    await WorkoutProgressStore.clear(t.id);
    if (!mounted) return;
    setState(() => _inProgress = {..._inProgress}..remove(t.id));
  }

  List<SavedTraining> get _generatedTrainings =>
      _trainings.where((t) => t.isGenerated).toList();

  List<SavedTraining> get _manualTrainings =>
      _trainings.where((t) => !t.isGenerated).toList();

  DateTime? _lastPerformedFor(SavedTraining t) {
    DateTime? best;
    for (final s in _sessions) {
      if (s.name.trim().toLowerCase() != t.name.trim().toLowerCase()) continue;
      final when = s.finishedAt ?? s.startedAt;
      if (when == null) continue;
      if (best == null || when.isAfter(best)) best = when;
    }
    return best;
  }

  double _plannedVolume(SavedTraining t) {
    var total = 0.0;
    for (final e in t.exercises) {
      for (final s in e.sets) {
        total += s.kg * s.reps;
      }
    }
    return total;
  }

  String _fmtVolume(double kg) {
    if (kg >= 1000) {
      return '${(kg / 1000).toStringAsFixed(1).replaceAll('.', ',')} t';
    }
    return '${kg.round()} kg';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('HEFTOR'),
        // Top-left generate button — always reachable, no matter how far the
        // user has scrolled. Only rendered when the auth service is available
        // (the generator endpoint requires a signed-in session).
        leading: widget.auth == null
            ? null
            : Padding(
                padding: const EdgeInsets.only(left: 12),
                child: IconButton(
                  icon: const Icon(Icons.auto_awesome,
                      color: AppColors.onSurface),
                  tooltip: t('trainings.generate_new_plan'),
                  onPressed: _openGenerator,
                ),
              ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: IconButton(
              icon: const Icon(Icons.add, color: AppColors.onSurface),
              tooltip: t('workouts.new'),
              onPressed: _openCreate,
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _content(),
      ),
    );
  }

  /// Whole page is one scroll surface — trainings, carousels, restore chips,
  /// loading and empty states all live inside the same CustomScrollView.
  Widget _content() {
    final hasGenerated = _generatedTrainings.isNotEmpty;
    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(0, 0, 0, 8),
          sliver: SliverToBoxAdapter(child: _titleHeader()),
        ),
        // Resume an unfinished workout — sits up top so it's the first thing
        // the user sees when they have one in progress.
        if (_resumableTrainings.isNotEmpty)
          SliverToBoxAdapter(child: _continueSection()),
        // Recommended row — hide toggle in the section header.
        if (!_hideRecommended) ...[
          SliverToBoxAdapter(
            child: _SectionHeader(
              label: t('workouts.recommended'),
              onClose: () =>
                  _setHide(_kHideRecommended, true, isRec: true),
            ),
          ),
          SliverToBoxAdapter(child: WorkoutStories(onTap: _openPredefined)),
          const SliverToBoxAdapter(child: SizedBox(height: 18)),
        ],
        // Generated section — big CTA when nothing yet, story row when there is.
        if (widget.auth != null && !_hideGenerated) ...[
          SliverToBoxAdapter(
            child: _SectionHeader(
              label: hasGenerated
                  ? t('workouts.generated_for_you')
                  : t('trainings.your_first_plan'),
              // The "+" lives at the LEFT of the header once the user has a
              // plan — the big invitation card is no longer needed.
              leading: hasGenerated
                  ? _PlusButton(onTap: _openGenerator)
                  : null,
              onClose: () =>
                  _setHide(_kHideGenerated, true, isRec: false),
            ),
          ),
          if (hasGenerated) ...[
            SliverToBoxAdapter(
              child: GeneratedStories(
                trainings: _generatedTrainings,
                onTap: _openTraining,
                onLongPress: (t) =>
                    showTrainingActions(context, t, onChanged: _load),
              ),
            ),
          ] else ...[
            SliverToBoxAdapter(child: _firstPlanCta()),
          ],
          const SliverToBoxAdapter(child: SizedBox(height: 18)),
        ],
        // Hidden-section restore chips — keep them inline so the user can
        // bring sections back without diving into settings.
        if (_hideRecommended || _hideGenerated) ...[
          SliverToBoxAdapter(child: _restoreChips()),
          const SliverToBoxAdapter(child: SizedBox(height: 8)),
        ],
        // Saved trainings (manual). Empty / loading / error states live in
        // the same sliver so the whole page scrolls predictably.
        ..._savedTrainingsSlivers(),
        const SliverToBoxAdapter(child: SizedBox(height: 32)),
      ],
    );
  }

  /// "Continue workout" cards for any unfinished, partially-completed workouts.
  Widget _continueSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(20, 4, 20, 12),
          child: Text(
            'FOLYTATHATÓ EDZÉS',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.5,
              color: AppColors.accentAmber,
            ),
          ),
        ),
        for (final t in _resumableTrainings) _continueCard(t),
        const SizedBox(height: 18),
      ],
    );
  }

  Widget _continueCard(SavedTraining t) {
    final progress = _inProgress[t.id];
    final done = progress?.doneCount ?? 0;
    final total = t.totalSets;
    final name = titleCase(t.name.isEmpty
        ? AppStrings.instance.t('dashboard.workout_default')
        : t.name);
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
      child: GestureDetector(
        onTap: () => _openTraining(t, _trainings.indexOf(t)),
        behavior: HitTestBehavior.opaque,
        child: Container(
          padding: const EdgeInsets.fromLTRB(18, 16, 14, 16),
          decoration: BoxDecoration(
            color: AppColors.surfaceLow,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.accentAmber, width: 1),
          ),
          child: Row(
            children: [
              const Icon(Icons.play_circle_fill,
                  color: AppColors.accentAmber, size: 40),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                        color: AppColors.onSurface,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Félbehagyva · $done/$total szett kész',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.muted,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              GestureDetector(
                onTap: () => _discardProgress(t),
                behavior: HitTestBehavior.opaque,
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceMid,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.close,
                      size: 16, color: AppColors.muted),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _titleHeader() {
    final manual = _manualTrainings.length;
    final gen = _generatedTrainings.length;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t('workouts.title'),
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w800,
              letterSpacing: -1,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _trainings.isEmpty
                ? tFmt('trainings.counts_recommended_only',
                    {'n': predefinedWorkouts.length})
                : tFmt('trainings.counts_full', {
                    'manual': manual,
                    'gen': gen,
                    'rec': predefinedWorkouts.length,
                  }),
            style: const TextStyle(
              fontSize: 12,
              letterSpacing: 1.2,
              color: AppColors.muted,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _firstPlanCta() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: GestureDetector(
        onTap: _openGenerator,
        behavior: HitTestBehavior.opaque,
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 18, 18, 18),
          decoration: BoxDecoration(
            color: AppColors.onSurface,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      t('workouts.generated_for_you'),
                      style: const TextStyle(
                        fontSize: 10,
                        letterSpacing: 1.6,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF4A4A4A),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      t('trainings.make_a_plan_title'),
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                        height: 1.1,
                        color: AppColors.background,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      t('trainings.make_a_plan_body'),
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF4A4A4A),
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                width: 44,
                height: 44,
                decoration: const BoxDecoration(
                  color: AppColors.background,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.arrow_forward,
                  color: AppColors.onSurface,
                  size: 22,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _restoreChips() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 4),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          if (_hideRecommended)
            _RestoreChip(
              label: t('trainings.tab_recommended'),
              onTap: () =>
                  _setHide(_kHideRecommended, false, isRec: true),
            ),
          if (_hideGenerated)
            _RestoreChip(
              label: t('trainings.tab_generated'),
              onTap: () =>
                  _setHide(_kHideGenerated, false, isRec: false),
            ),
        ],
      ),
    );
  }

  List<Widget> _savedTrainingsSlivers() {
    if (_loading && _trainings.isEmpty) {
      return [
        const SliverFillRemaining(
          hasScrollBody: false,
          child: Center(child: CircularProgressIndicator()),
        ),
      ];
    }
    if (_error != null && _trainings.isEmpty) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: _messageState(
            icon: Icons.cloud_off,
            title: _error!,
            actionLabel: t('common.retry'),
            onAction: _load,
          ),
        ),
      ];
    }
    final manual = _manualTrainings;
    if (manual.isEmpty) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: _messageState(
            icon: Icons.fitness_center_outlined,
            title: t('trainings.empty_my_title'),
            subtitle: t('trainings.empty_my_subtitle'),
            actionLabel: t('workouts.new'),
            onAction: _openCreate,
          ),
        ),
      ];
    }
    return [
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 6),
          child: Text(
            t('trainings.my_section'),
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.5,
              color: AppColors.onSurface,
            ),
          ),
        ),
      ),
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
        sliver: SliverList.builder(
          itemCount: manual.length,
          itemBuilder: (context, i) {
            final t = manual[i];
            final lastPerformed = _lastPerformedFor(t);
            final volume = _plannedVolume(t);
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: GestureDetector(
                onTap: () => _openTraining(t, i),
                onLongPress: () =>
                    showTrainingActions(context, t, onChanged: _load),
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLow,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              titleCase(t.name.isEmpty
                                  ? AppStrings.instance.t('dashboard.workout_default')
                                  : t.name),
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.5,
                                color: AppColors.onSurface,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${t.exercises.length} gyakorlat · ${t.totalSets} set',
                              style: const TextStyle(
                                  fontSize: 14, color: AppColors.muted),
                            ),
                            const SizedBox(height: 6),
                            _MetaRow(
                              lastPerformed: lastPerformed,
                              volume: volume,
                              volumeLabel: _fmtVolume(volume),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Icon(
                            Icons.more_horiz,
                            size: 18,
                            color: AppColors.muted,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            (i + 1).toString().padLeft(2, '0'),
                            style: const TextStyle(
                              fontSize: 40,
                              fontWeight: FontWeight.w800,
                              color: AppColors.surfaceHigh,
                              height: 1,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    ];
  }

  Widget _messageState({
    required IconData icon,
    required String title,
    String? subtitle,
    required String actionLabel,
    required VoidCallback onAction,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: AppColors.muted, size: 48),
          const SizedBox(height: 16),
          Text(title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface)),
          if (subtitle != null) ...[
            const SizedBox(height: 8),
            Text(subtitle,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.muted)),
          ],
          const SizedBox(height: 24),
          TextButton(
            style: TextButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.background,
              padding:
                  const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(100)),
            ),
            onPressed: onAction,
            child: Text(actionLabel,
                style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}

/// Section header with optional leading button and a close (×) icon. Used
/// by both AJÁNLOTT EDZÉSEK and NEKED GENERÁLT.
class _SectionHeader extends StatelessWidget {
  final String label;
  final Widget? leading;
  final VoidCallback onClose;
  const _SectionHeader({
    required this.label,
    this.leading,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
      child: Row(
        children: [
          if (leading != null) ...[
            leading!,
            const SizedBox(width: 10),
          ],
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.5,
                color: AppColors.onSurface,
              ),
            ),
          ),
          GestureDetector(
            onTap: onClose,
            behavior: HitTestBehavior.opaque,
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppColors.surfaceLow,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.close,
                  size: 16, color: AppColors.muted),
            ),
          ),
        ],
      ),
    );
  }
}

class _PlusButton extends StatelessWidget {
  final VoidCallback onTap;
  const _PlusButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: AppColors.onSurface,
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Icon(Icons.add,
            size: 18, color: AppColors.background),
      ),
    );
  }
}

class _RestoreChip extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _RestoreChip({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.surfaceHigh, width: 1),
          borderRadius: BorderRadius.circular(100),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.add,
                size: 14, color: AppColors.muted),
            const SizedBox(width: 6),
            Text(
              'MUTASD · $label',
              style: const TextStyle(
                fontSize: 11,
                letterSpacing: 1.2,
                fontWeight: FontWeight.w800,
                color: AppColors.muted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  final DateTime? lastPerformed;
  final double volume;
  final String volumeLabel;
  const _MetaRow({
    required this.lastPerformed,
    required this.volume,
    required this.volumeLabel,
  });

  @override
  Widget build(BuildContext context) {
    final parts = <String>[];
    if (lastPerformed != null) {
      parts.add(tFmt('trainings.last_done',
          {'when': relativeDayLabel(lastPerformed!)}));
    } else {
      parts.add(t('trainings.new_badge'));
    }
    if (volume > 0) parts.add(volumeLabel.toUpperCase());
    return Text(
      parts.join(' · '),
      style: const TextStyle(
        fontSize: 11,
        letterSpacing: 1.2,
        fontWeight: FontWeight.w700,
        color: AppColors.muted,
      ),
    );
  }
}
