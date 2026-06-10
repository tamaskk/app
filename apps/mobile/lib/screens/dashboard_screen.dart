import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../models/workout.dart';
import '../models/api_models.dart';
import '../services/api.dart';
import '../services/auth_service.dart';
import '../services/workout_progress.dart';
import '../utils/recent_pr.dart';
import '../utils/streak.dart';
import '../utils/text.dart';
import '../models/rank.dart';
import '../widgets/rank_card.dart';
import '../widgets/training_actions.dart';
import '../widgets/week_preview.dart';
import 'weekly_plan_edit_screen.dart';
import 'create_training_screen.dart';
import 'account_screen.dart';
import 'workout_screen.dart';
import '../i18n/app_strings.dart';

// Short labels keyed off i18n. The day-strip and the month chip both
// resolve at render time so the strings flip with the locale switch.
List<String> _weekDayLabels() => [
      t('plan.day_short_h'),
      t('plan.day_short_k'),
      t('plan.day_short_sze'),
      t('plan.day_short_cs'),
      t('plan.day_short_p'),
      t('plan.day_short_szo'),
      t('plan.day_short_v'),
    ];

String _monthLabel(int month1Based) => t('month.$month1Based');

// Fallback when a user predates the onboarding daysPerWeek capture.
const _weeklyGoalFallback = 3;

bool _isSameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;

DateTime _mondayOf(DateTime d) {
  final x = DateTime(d.year, d.month, d.day);
  return x.subtract(Duration(days: x.weekday - 1));
}

String _fmtCount(num n) => n >= 1000
    ? '${(n / 1000).toStringAsFixed(1).replaceAll('.', ',')}K'
    : '${n.round()}';

String _fmtVolume(double kg) => kg >= 1000
    ? (kg / 1000).toStringAsFixed(1).replaceAll('.', ',')
    : '${kg.round()}';

String _volumeUnit(double kg) => kg >= 1000 ? 't' : 'kg';

String _fmtTime(int minutes) =>
    minutes >= 60 ? '${minutes ~/ 60}h' : '${minutes}p';

class DashboardScreen extends StatefulWidget {
  final AuthService auth;
  final VoidCallback onLogout;

  const DashboardScreen({
    super.key,
    required this.auth,
    required this.onLogout,
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  static const _daysBefore = 14;
  static const _daysAfter = 14;

  late final List<DateTime> _days;
  late int _selectedIndex;
  final ScrollController _stripController = ScrollController();

  final Api _api = Api();

  // Live data.
  List<WorkoutSession> _sessions = [];
  List<SavedTraining> _trainings = [];
  int _streak = 0;
  Set<int> _workoutDays = {};
  List<StagnationItem> _stagnating = [];
  // In-progress (continuable) workouts, keyed by training id.
  Map<String, WorkoutProgress> _inProgress = {};

  // Most-recent list under the hero shows at most this many items.
  static const _recentLimit = 5;

  @override
  void initState() {
    super.initState();
    final today = DateTime.now();
    final start = DateTime(today.year, today.month, today.day)
        .subtract(const Duration(days: _daysBefore));
    _days = List.generate(
      _daysBefore + _daysAfter + 1,
      (i) => start.add(Duration(days: i)),
    );
    _selectedIndex = _daysBefore; // today
    WidgetsBinding.instance.addPostFrameCallback((_) => _centerSelected());
    _loadData();
  }

  Future<void> _loadData() async {
    List<WorkoutSession> sessions = const [];
    List<SavedTraining> trainings = const [];
    try {
      sessions = await _api.getSessions();
    } catch (_) {}
    try {
      trainings = await _api.getTrainings();
    } catch (_) {}
    final stagnating = await _api.getStagnation(); // best-effort, never throws
    Map<String, WorkoutProgress> inProgress = const {};
    try {
      inProgress = await WorkoutProgressStore.all();
    } catch (_) {}
    if (!mounted) return;
    final dates = sessions
        .map((s) => s.finishedAt ?? s.startedAt)
        .whereType<DateTime>()
        .toList();
    setState(() {
      _sessions = sessions;
      _trainings = trainings;
      _streak = weeklyStreak(dates);
      _workoutDays = dates.map(_dayKey).toSet();
      _stagnating = stagnating;
      _inProgress = inProgress;
    });
  }

  int _dayKey(DateTime d) =>
      DateTime(d.year, d.month, d.day).millisecondsSinceEpoch;

  @override
  void dispose() {
    _stripController.dispose();
    _api.dispose();
    super.dispose();
  }

  void _selectDay(int index) {
    if (index < 0 || index >= _days.length) return;
    setState(() => _selectedIndex = index);
    _centerSelected();
  }

  void _centerSelected() {
    if (!_stripController.hasClients) return;
    final viewport = _stripController.position.viewportDimension;
    final itemWidth = viewport / 7;
    final target = _selectedIndex * itemWidth - (viewport - itemWidth) / 2;
    final max = _stripController.position.maxScrollExtent;
    _stripController.animateTo(
      target.clamp(0.0, max),
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    );
  }

  // --- derived data ---------------------------------------------------------

  List<WorkoutSession> _sessionsOn(DateTime day) => _sessions.where((s) {
        final d = s.finishedAt ?? s.startedAt;
        return d != null && _isSameDay(d, day);
      }).toList();

  int get _weeklyDone {
    final monday = _mondayOf(DateTime.now());
    final next = monday.add(const Duration(days: 7));
    return _sessions.where((s) {
      final d = s.finishedAt ?? s.startedAt;
      return d != null && !d.isBefore(monday) && d.isBefore(next);
    }).length;
  }

  // Honour the user's onboarding choice — falls back to the legacy default
  // for accounts created before the onboarding refactor.
  int get _weeklyGoal =>
      widget.auth.user?.onboarding?.daysPerWeek ?? _weeklyGoalFallback;

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

  Future<void> _startTraining(SavedTraining t, int index) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => WorkoutScreen(workout: _toWorkout(t, index))),
    );
    if (mounted) _loadData(); // reflect any logged session
  }

  /// Re-open a logged workout and continue exactly where it stopped: rebuilds
  /// the workout from the session (kg/reps + which sets were ticked) and runs
  /// it under the matching training so edits/progress persist.
  Future<void> _resumeFromSession(WorkoutSession s) async {
    SavedTraining? match;
    for (final tr in _trainings) {
      if (tr.name.trim().toLowerCase() == s.name.trim().toLowerCase()) {
        match = tr;
        break;
      }
    }
    final workout = Workout(
      id: match?.id,
      name: s.name,
      number: 0,
      durationMinutes: 0,
      exercises: s.exercises
          .map((e) => Exercise(
                name: e.name,
                variant: e.category ?? '',
                exerciseId: e.exerciseId,
                gifUrl: e.gifUrl,
                targetMuscles: e.targetMuscles,
                progressionStrategy: e.progressionStrategy,
                sets: e.sets
                    .map((x) =>
                        WorkoutSet(kg: x.kg, reps: x.reps, done: x.done))
                    .toList(),
              ))
          .toList(),
    );
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => WorkoutScreen(
          workout: workout,
          // Continue the clock from the time already logged for this workout.
          resumeElapsed: s.duration,
        ),
      ),
    );
    if (mounted) _loadData();
  }

  // --- recent / continuable list --------------------------------------------

  /// Continuable workouts (started, partially done) matched to a saved
  /// training, newest first.
  List<({SavedTraining training, WorkoutProgress progress, int index})>
      _startedTrainings() {
    final out =
        <({SavedTraining training, WorkoutProgress progress, int index})>[];
    for (var i = 0; i < _trainings.length; i++) {
      final p = _inProgress[_trainings[i].id];
      if (p != null && p.hasProgress) {
        out.add((training: _trainings[i], progress: p, index: i));
      }
    }
    out.sort((a, b) => b.progress.updatedAt.compareTo(a.progress.updatedAt));
    return out;
  }

  /// Completed sessions, most recent first.
  List<WorkoutSession> _recentSessions() {
    final sorted = [..._sessions];
    sorted.sort((a, b) {
      final da = a.finishedAt ?? a.startedAt;
      final db = b.finishedAt ?? b.startedAt;
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return db.compareTo(da);
    });
    return sorted;
  }

  /// The list under the hero: continuable workouts pinned on top, then recent
  /// completed sessions, capped at [_recentLimit] total.
  List<Widget> _recentList() {
    final cards = <Widget>[];

    for (final s in _startedTrainings().take(_recentLimit)) {
      final tr = s.training;
      cards.add(_ListCard(
        title: titleCase(
            tr.name.isEmpty ? t('dashboard.workout_default') : tr.name),
        subtitle: 'Félbehagyva · ${s.progress.doneCount}/${tr.totalSets} set',
        bigNumber: tr.exercises.length,
        inProgress: true,
        onTap: () => _startTraining(tr, s.index),
        onLongPress: () =>
            showTrainingActions(context, tr, onChanged: _loadData),
      ));
    }

    final remaining = _recentLimit - cards.length;
    if (remaining > 0) {
      for (final s in _recentSessions().take(remaining)) {
        // "Finished" = every set was ticked off in the logged session.
        final finished = s.totalSets > 0 && s.doneSets >= s.totalSets;
        cards.add(_ListCard(
          title: titleCase(
              s.name.isEmpty ? t('dashboard.workout_default') : s.name),
          subtitle: '${s.doneSets}/${s.totalSets} set',
          bigNumber: s.exercises.length,
          finished: finished,
          onTap: () => _resumeFromSession(s),
        ));
      }
    }
    return cards;
  }

  // --- build ----------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final selectedDay = _days[_selectedIndex];
    final isToday = _isSameDay(selectedDay, DateTime.now());
    final dateLabel = isToday
        ? t('dashboard.today_short')
        : '${_monthLabel(selectedDay.month)} ${selectedDay.day}';

    return Scaffold(
      appBar: AppBar(
        title: const Text('HEFTOR'),
        actions: [
          Builder(
            builder: (context) => IconButton(
              icon: const Icon(Icons.add, color: AppColors.onSurface),
              tooltip: t('workouts.new'),
              onPressed: () async {
                final created = await Navigator.of(context).push<bool>(
                  MaterialPageRoute(
                    builder: (_) =>
                        CreateTrainingScreen(auth: widget.auth),
                  ),
                );
                if (created == true && context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(t('dashboard.workout_saved'))),
                  );
                  _loadData();
                }
              },
            ),
          ),
          IconButton(
            icon: const Icon(Icons.person_outline, color: AppColors.onSurface),
            tooltip: t('account.title'),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => AccountScreen(
                  auth: widget.auth,
                  onLoggedOut: widget.onLogout,
                ),
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _header(context),
              const SizedBox(height: 24),
              _weekStrip(),
              _recentPrBanner(),
              _stagnationBanner(),
              const SizedBox(height: 24),
              GestureDetector(
                onHorizontalDragEnd: (details) {
                  final v = details.primaryVelocity ?? 0;
                  if (v < -100) _selectDay(_selectedIndex + 1);
                  if (v > 100) _selectDay(_selectedIndex - 1);
                },
                behavior: HitTestBehavior.opaque,
                child: _dayContent(selectedDay, dateLabel, isToday),
              ),
              const SizedBox(height: 24),
              _planSection(context),
              const SizedBox(height: 24),
              _stats(context),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _header(BuildContext context) {
    final headline = _personalHeadline();
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(t('dashboard.hi'),
                  style: Theme.of(context)
                      .textTheme
                      .bodyLarge
                      ?.copyWith(color: AppColors.muted)),
              Text(widget.auth.user?.displayName ?? 'Alex',
                  style: Theme.of(context).textTheme.headlineLarge,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
              if (headline != null) ...[
                const SizedBox(height: 6),
                Text(
                  headline,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.muted,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.2,
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.surfaceLow,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const Text(
                'STREAK',
                style: TextStyle(
                  fontSize: 10,
                  letterSpacing: 1.6,
                  color: AppColors.muted,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '$_streak',
                style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: AppColors.onSurface,
                  height: 1,
                  letterSpacing: -1,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        // Rank chip → tap takes the user to the Account screen where the
        // RankCard + weekly breakdown lives.
        RankChip(
          rank: rankForTier(widget.auth.user?.rank ?? 1),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => AccountScreen(
                auth: widget.auth,
                onLoggedOut: widget.onLogout,
              ),
            ),
          ),
        ),
      ],
    );
  }

  /// One-line live stat under the name. Tries: monthly volume → mesocycle
  /// progress (TODO) → null if nothing is meaningful yet.
  String? _personalHeadline() {
    final monthVolume = _currentMonthVolume();
    if (monthVolume >= 100) {
      final isT = _volumeUnit(monthVolume) == 't';
      return tFmt(
        isT ? 'dashboard.month_total_t' : 'dashboard.month_total_kg',
        {'kg': _fmtVolume(monthVolume)},
      );
    }
    final onboarding = widget.auth.user?.onboarding;
    if (onboarding?.split != null && onboarding?.daysPerWeek != null) {
      return tFmt('dashboard.split_per_week', {
        'split': _splitName(onboarding!.split!),
        'days': onboarding.daysPerWeek,
      });
    }
    return null;
  }

  double _currentMonthVolume() {
    final now = DateTime.now();
    return _sessions.where((s) {
      final d = s.finishedAt ?? s.startedAt;
      return d != null && d.year == now.year && d.month == now.month;
    }).fold<double>(
        0,
        (a, s) =>
            a +
            s.exercises.fold<double>(
                0,
                (b, e) => b +
                    e.sets.fold<double>(0, (c, x) => c + x.kg * x.reps)));
  }

  String _splitName(String split) {
    switch (split) {
      case 'upper_lower':
        return 'Upper / Lower';
      case 'push_pull_legs':
        return 'Push / Pull / Legs';
      case 'bro':
        return 'Bro split';
      case 'full_body':
        return 'Full Body';
      default:
        return split;
    }
  }

  Widget _weekStrip() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final itemWidth = constraints.maxWidth / 7;
        return SizedBox(
          height: 72,
          child: ListView.builder(
            controller: _stripController,
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            itemCount: _days.length,
            itemBuilder: (context, i) {
              final day = _days[i];
              return _DayChip(
                width: itemWidth,
                label: _weekDayLabels()[day.weekday - 1],
                dayNumber: day.day,
                selected: i == _selectedIndex,
                isToday: _isSameDay(day, DateTime.now()),
                hasWorkout: _workoutDays.contains(_dayKey(day)),
                onTap: () => _selectDay(i),
              );
            },
          ),
        );
      },
    );
  }

  // Motivator surface — only renders when there was a PR in the last week.
  // Computed inline from sessions; cheap because session lists are small.
  Widget _recentPrBanner() {
    final pr = findRecentPr(_sessions);
    if (pr == null) return const SizedBox.shrink();
    final kgLabel = pr.kg == pr.kg.roundToDouble()
        ? pr.kg.toStringAsFixed(0)
        : pr.kg.toStringAsFixed(1).replaceAll('.', ',');
    final label =
        '${t('dashboard.new_pr')} · ${titleCase(pr.exerciseName).toUpperCase()} · $kgLabel × ${pr.reps} · ${relativeDayLabel(pr.when)}';
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.onSurface,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: AppColors.background,
            fontSize: 12,
            letterSpacing: 1.4,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }

  // Minimal grey banner — only rendered when something is stagnating.
  Widget _stagnationBanner() {
    if (_stagnating.isEmpty) return const SizedBox.shrink();
    final n = _stagnating.length;
    final label = tFmt('dashboard.stagnation_label', {'n': n});
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: GestureDetector(
        onTap: _showStagnationSheet,
        behavior: HitTestBehavior.opaque,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.surfaceLow,
            border: Border.all(color: AppColors.surfaceHigh),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    color: AppColors.onSurface,
                    fontSize: 12,
                    letterSpacing: 1.2,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const Icon(Icons.chevron_right,
                  size: 18, color: AppColors.onSurface),
            ],
          ),
        ),
      ),
    );
  }

  void _showStagnationSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(ctx).size.height * 0.7,
        ),
        decoration: const BoxDecoration(
          color: AppColors.background,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          border: Border.fromBorderSide(BorderSide(color: AppColors.outline)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.surfaceHigh,
                  borderRadius: BorderRadius.circular(100),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 4),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(t('dashboard.stagnation_badge'),
                      style: const TextStyle(
                          color: AppColors.muted,
                          fontSize: 12,
                          letterSpacing: 1.5,
                          fontWeight: FontWeight.w700)),
                ),
              ),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
                  itemCount: _stagnating.length,
                  itemBuilder: (context, i) {
                    final item = _stagnating[i];
                    return Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        border: i == 0
                            ? null
                            : const Border(
                                top: BorderSide(color: AppColors.outline)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(titleCase(item.name),
                              style: const TextStyle(
                                  color: AppColors.onSurface,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700)),
                          const SizedBox(height: 4),
                          Text(
                            tFmt('dashboard.weeks_stagnant',
                                    {'n': item.weeksStagnant}) +
                                (item.tips.isEmpty
                                    ? ''
                                    : ' · ${item.tips.join(' / ')}'),
                            style: const TextStyle(
                                color: AppColors.muted, fontSize: 13),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _dayContent(DateTime selectedDay, String dateLabel, bool isToday) {
    final daySessions = _sessionsOn(selectedDay);
    final weeklyLabel = tFmt('dashboard.weekly_done', {
      'done': _weeklyDone,
      'goal': _weeklyGoal,
    });
    final progress = (_weeklyDone / _weeklyGoal).clamp(0.0, 1.0);

    // Completed: what you actually did that day.
    if (daySessions.isNotEmpty) {
      final first = daySessions.first;
      final durLabel = first.duration != null
          ? ' • ${_fmtTime(first.duration!.inMinutes).toUpperCase()}'
          : '';
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _HeroCard(
            label: '$dateLabel$durLabel • ${t('dashboard.done_short')}',
            title: titleCase(first.name.isEmpty ? t('dashboard.workout_default') : first.name),
            bigNumber: first.exercises.length,
            progress: progress,
            progressLabel: weeklyLabel,
          ),
          const SizedBox(height: 8),
          ...daySessions.skip(1).map((s) => _ListCard(
                title: titleCase(s.name.isEmpty ? t('dashboard.workout_default') : s.name),
                subtitle: '${s.doneSets}/${s.totalSets} set',
                bigNumber: s.exercises.length,
              )),
        ],
      );
    }

    // Today/future with no session yet: your trainings, ready to start.
    final todayDate = DateTime.now();
    final isPast = DateTime(selectedDay.year, selectedDay.month, selectedDay.day)
        .isBefore(DateTime(todayDate.year, todayDate.month, todayDate.day));
    if (!isPast && _trainings.isNotEmpty) {
      final first = _trainings.first;
      // Below the hero: continuable workouts first, then recent done ones.
      final recent = _recentList();
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _HeroCard(
            label:
                '$dateLabel • ${first.exercises.length} ${t('dashboard.exercises_short_caps')}',
            title: titleCase(first.name.isEmpty ? t('dashboard.workout_default') : first.name),
            bigNumber: first.exercises.length,
            progress: progress,
            progressLabel: weeklyLabel,
            onTap: () => _startTraining(first, 0),
            onLongPress: () =>
                showTrainingActions(context, first, onChanged: _loadData),
          ),
          // Today-only explicit CTA: the hero card is already tappable but
          // a dedicated pill makes the primary action unmistakable. On past/
          // future days the pill is hidden — the hero is read-only context.
          if (isToday) ...[
            const SizedBox(height: 16),
            _StartPill(onTap: () => _startTraining(first, 0)),
          ],
          if (recent.isNotEmpty) ...[
            const SizedBox(height: 8),
            ...recent,
          ],
        ],
      );
    }

    // Nothing for this day.
    return _EmptyDayCard(
      title:
          isPast ? t('dashboard.rest_day') : t('dashboard.no_workout_today_short'),
      subtitle: isPast
          ? t('dashboard.no_workout_that_day')
          : t('dashboard.create_with_plus'),
    );
  }

  // Renders the user's weekly split preview when we know the split + days.
  // Hidden for legacy users who never went through the refactored onboarding.
  Widget _planSection(BuildContext context) {
    final user = widget.auth.user;
    final onboarding = user?.onboarding;
    final split = onboarding?.split;
    final days = onboarding?.daysPerWeek;
    final customPlan = user?.weeklyPlan;
    if (customPlan == null && (split == null || days == null)) {
      return const SizedBox.shrink();
    }
    // Today as Mon=0..Sun=6 to highlight the right cell.
    final todayIdx = DateTime.now().weekday - 1;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(t('dashboard.weekly_plan'),
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(letterSpacing: 1.5)),
            const SizedBox(width: 8),
            const Icon(Icons.tune,
                size: 14, color: AppColors.muted),
          ],
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: _openWeeklyPlanEditor,
          behavior: HitTestBehavior.opaque,
          child: WeekPreview(
            split: split,
            daysPerWeek: days ?? 0,
            todayIndex: todayIdx,
            customPlan: customPlan,
          ),
        ),
      ],
    );
  }

  Future<void> _openWeeklyPlanEditor() async {
    final defaultPlan = _defaultPlanFromOnboarding();
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => WeeklyPlanEditScreen(
          auth: widget.auth,
          defaultPlan: defaultPlan,
        ),
      ),
    );
    if (changed == true && mounted) setState(() {});
  }

  /// Derive a 7-day backend-key plan from the onboarding split, used as the
  /// pre-fill in the editor for users who don't have a custom plan yet.
  List<String> _defaultPlanFromOnboarding() {
    final onboarding = widget.auth.user?.onboarding;
    final split = onboarding?.split;
    final days = (onboarding?.daysPerWeek ?? 0).clamp(0, 7);
    // Choose the rotation cycle.
    List<String> cycle;
    switch (split) {
      case 'upper_lower':
        cycle = ['upper', 'lower'];
        break;
      case 'push_pull_legs':
        cycle = ['push', 'pull', 'legs'];
        break;
      case 'bro':
        cycle = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
        break;
      case 'full_body':
      default:
        cycle = ['fullbody'];
    }
    // Spread `days` training slots across the week and fill rest in between.
    final positions = <int>[];
    if (days > 0) {
      final step = 7 / days;
      for (var i = 0; i < days; i++) {
        positions.add((i * step).round().clamp(0, 6));
      }
    }
    final plan = List<String>.filled(7, 'rest');
    for (var i = 0; i < positions.length; i++) {
      plan[positions[i]] = cycle[i % cycle.length];
    }
    return plan;
  }

  Widget _stats(BuildContext context) {
    final totalSets = _sessions.fold(0, (a, s) => a + s.totalSets);
    final totalVolume = _sessions.fold(
        0.0,
        (a, s) =>
            a +
            s.exercises.fold(
                0.0, (b, e) => b + e.sets.fold(0.0, (c, x) => c + x.kg * x.reps)));
    final totalMinutes =
        _sessions.fold(0, (a, s) => a + (s.duration?.inMinutes ?? 0));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(t('dashboard.summary'),
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(letterSpacing: 1.5)),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: 1.6,
          children: [
            _StatCard(
                value: _fmtCount(totalSets),
                label: t('dashboard.stat_total_sets')),
            _StatCard(
                value: _fmtVolume(totalVolume),
                unit: _volumeUnit(totalVolume),
                label: t('dashboard.stat_lifted')),
            _StatCard(
                value: _fmtTime(totalMinutes),
                label: t('dashboard.stat_active_time')),
            _StatCard(
                value: '${_sessions.length}',
                label: t('dashboard.stat_sessions')),
          ],
        ),
      ],
    );
  }
}

class _DayChip extends StatelessWidget {
  final double width;
  final String label;
  final int dayNumber;
  final bool selected;
  final bool isToday;
  final bool hasWorkout;
  final VoidCallback onTap;

  const _DayChip({
    required this.width,
    required this.label,
    required this.dayNumber,
    required this.selected,
    required this.isToday,
    required this.hasWorkout,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final fg = selected ? AppColors.onSurface : AppColors.muted;
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: width,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(label,
                  style: TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w500, color: fg)),
              const SizedBox(height: 4),
              Text('$dayNumber',
                  style: TextStyle(
                      fontSize: 14,
                      fontWeight: selected ? FontWeight.w800 : FontWeight.w700,
                      color: fg)),
              const SizedBox(height: 6),
              // Selected: solid white underline. Workout day: shorter outlined
              // bar — visible at glance, distinct from the selection state.
              // Empty days hold the same space so the strip never jitters.
              if (selected)
                Container(width: 18, height: 3, color: AppColors.onSurface)
              else if (hasWorkout)
                Container(width: 14, height: 3, color: AppColors.muted)
              else
                const SizedBox(width: 14, height: 3),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyDayCard extends StatelessWidget {
  final String title;
  final String subtitle;
  const _EmptyDayCard({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 40),
      alignment: Alignment.centerLeft,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: AppColors.onSurface,
                  letterSpacing: -1)),
          const SizedBox(height: 4),
          Text(subtitle,
              style: const TextStyle(fontSize: 14, color: AppColors.muted)),
        ],
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  final String label;
  final String title;
  final int bigNumber;
  final double progress;
  final String progressLabel;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  const _HeroCard({
    required this.label,
    required this.title,
    required this.bigNumber,
    required this.progress,
    required this.progressLabel,
    this.onTap,
    this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      onLongPress: onLongPress,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(children: [
                  Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                          color: AppColors.onSurface, shape: BoxShape.circle)),
                  const SizedBox(width: 8),
                  Text(label,
                      style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.muted,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 1)),
                ]),
                Text(bigNumber.toString().padLeft(2, '0'),
                    style: const TextStyle(
                        fontSize: 56,
                        fontWeight: FontWeight.w800,
                        color: AppColors.surfaceHigh,
                        height: 1)),
              ],
            ),
            Text(title, style: Theme.of(context).textTheme.headlineLarge,
                maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: progress,
                      backgroundColor: AppColors.outline,
                      valueColor: const AlwaysStoppedAnimation<Color>(
                          AppColors.primary),
                      minHeight: 4,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Text(progressLabel,
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.muted)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ListCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final int bigNumber;
  // Continuable (started-but-unfinished) workouts get an amber play marker.
  final bool inProgress;
  // Completed sessions where every set was ticked off get a green "done" badge;
  // everything else is flagged "not finished".
  final bool finished;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  const _ListCard({
    required this.title,
    required this.subtitle,
    required this.bigNumber,
    this.inProgress = false,
    this.finished = false,
    this.onTap,
    this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    final statusColor =
        finished ? AppColors.accentGreen : AppColors.accentAmber;
    final statusIcon =
        finished ? Icons.check_circle : Icons.radio_button_unchecked;
    final statusLabel = finished ? 'Befejezve' : 'Nincs befejezve';

    return GestureDetector(
      onTap: onTap,
      onLongPress: onLongPress,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.outline)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            if (inProgress) ...[
              const Icon(Icons.play_circle_fill,
                  color: AppColors.accentAmber, size: 26),
              const SizedBox(width: 12),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppColors.onSurface)),
                  const SizedBox(height: 3),
                  // Set count + a coloured finished/unfinished status. The
                  // status label flexes so long rows can't overflow.
                  Row(
                    children: [
                      Text(subtitle,
                          style: const TextStyle(
                              fontSize: 13, color: AppColors.muted)),
                      const SizedBox(width: 8),
                      Icon(statusIcon, size: 13, color: statusColor),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(statusLabel,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: statusColor)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Text(bigNumber.toString().padLeft(2, '0'),
                style: const TextStyle(
                    fontSize: 40,
                    fontWeight: FontWeight.w800,
                    color: AppColors.surfaceHigh,
                    height: 1)),
          ],
        ),
      ),
    );
  }
}

class _StartPill extends StatelessWidget {
  final VoidCallback onTap;
  const _StartPill({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: TextButton(
        style: TextButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.background,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(100)),
        ),
        onPressed: onTap,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(t('dashboard.start_short'),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.5,
                )),
            const SizedBox(width: 8),
            const Icon(Icons.arrow_forward, size: 18),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String value;
  final String label;
  final String? unit;
  const _StatCard({required this.value, required this.label, this.unit});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(value,
                style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                    color: AppColors.onSurface,
                    height: 1,
                    letterSpacing: -1)),
            if (unit != null) ...[
              const SizedBox(width: 4),
              Text(unit!,
                  style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.muted)),
            ],
          ],
        ),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 12, color: AppColors.muted)),
      ],
    );
  }
}
