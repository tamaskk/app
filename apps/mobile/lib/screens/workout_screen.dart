import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import '../models/workout.dart';
import '../models/exercise_api_models.dart';
import '../models/api_models.dart';
import '../services/api.dart';
import '../services/workout_progress.dart';
import '../widgets/exercise_sheets.dart';
import '../widgets/plate_calculator_sheet.dart';
import '../widgets/exercise_placeholder.dart';
import '../utils/text.dart';
import 'workout_summary_screen.dart';

class WorkoutScreen extends StatefulWidget {
  /// The workout to run. Falls back to a sample when none is provided.
  final Workout? workout;

  /// When re-opening a previously-logged workout (e.g. from the dashboard),
  /// seed the elapsed clock with the time already accumulated so it continues
  /// instead of restarting at 0. Ignored if saved progress already exists.
  final Duration? resumeElapsed;

  const WorkoutScreen({super.key, this.workout, this.resumeElapsed});

  @override
  State<WorkoutScreen> createState() => _WorkoutScreenState();
}

class _WorkoutScreenState extends State<WorkoutScreen> {
  // Two timers now: the workout elapsed clock and the rest timer (counts down
  // between sets). One periodic tick repaints both. The elapsed clock is
  // derived from [_startedAt] (a stored timestamp) rather than an incrementing
  // counter, so it can't drift or reset on a rebuild.
  int _restRemaining = 0;
  bool _restRunning = false;
  int _restDuration = 90; // rest length, adjustable via long-press; persisted
  static const _restKey = 'rest_seconds';
  // Selectable rest lengths (seconds) for the long-press picker.
  static const _restChoices = [30, 45, 60, 90, 120, 180];

  int _currentExercise = 0;
  final PageController _pageController = PageController();
  Timer? _timer;
  Timer? _buzzTimer; // repeats the vibration while the rest-over alert is up
  bool _restAlertShowing = false;
  late final Workout workout = widget.workout ?? sampleWorkouts[1];

  final Api _api = Api();
  Timer? _saveDebounce;
  bool _dirty = false; // an edit is pending persistence
  // Elapsed clock = time banked from previous sittings + time since this one
  // opened. This survives leave/resume without restarting or over-counting the
  // wall-clock gap while the workout was closed.
  int _bankedElapsed = 0;
  DateTime _sittingStart = DateTime.now();
  bool _exiting = false;

  int get _elapsedTotal =>
      _bankedElapsed + DateTime.now().difference(_sittingStart).inSeconds;

  // Auto-progression hints, keyed by exerciseId. Optional overlay — absent for
  // exercises with no history or strategy "none".
  Map<String, ProgressionSuggestion> _suggestions = {};

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      bool justFinished = false;
      // Repaint every second so the (computed) elapsed clock ticks; also drive
      // the rest countdown.
      setState(() {
        if (_restRunning && _restRemaining > 0) {
          _restRemaining--;
          if (_restRemaining == 0) {
            _restRunning = false;
            justFinished = true;
          }
        }
      });
      if (justFinished) _onRestComplete();
    });
    // Seed the clock when re-opening a logged workout (no saved progress yet).
    _bankedElapsed = widget.resumeElapsed?.inSeconds ?? 0;
    _initProgress();
    _loadSuggestions();
    _loadRestPref();
  }

  /// Restore an in-progress workout (elapsed time + which sets were done) if the
  /// user previously backed out without finishing; otherwise record this open
  /// so the work can be resumed later.
  Future<void> _initProgress() async {
    final id = workout.id;
    if (id == null) return; // sample/unsaved: nothing to persist against
    final saved = await WorkoutProgressStore.load(id);
    if (saved != null && mounted) {
      setState(() {
        // Continue the banked clock from where it was left off.
        _bankedElapsed = saved.elapsedSeconds;
        _sittingStart = DateTime.now();
        // Re-apply the saved done flags, guarding against an edited workout
        // whose exercise/set counts no longer match.
        for (var e = 0;
            e < workout.exercises.length && e < saved.done.length;
            e++) {
          final sets = workout.exercises[e].sets;
          final flags = saved.done[e];
          for (var s = 0; s < sets.length && s < flags.length; s++) {
            sets[s].done = flags[s];
          }
        }
      });
    } else {
      // First open — seed the entry (carries any resumeElapsed banked above).
      await WorkoutProgressStore.save(id, _bankedElapsed, workout.exercises);
    }
  }

  /// Persist the current progress (elapsed + done flags) for this workout.
  void _saveProgress() {
    final id = workout.id;
    if (id == null) return;
    WorkoutProgressStore.save(id, _elapsedTotal, workout.exercises);
  }

  /// Restore the user's preferred rest length, if they've set one before.
  Future<void> _loadRestPref() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getInt(_restKey);
    if (saved != null && mounted) setState(() => _restDuration = saved);
  }

  /// Ask the backend for next-set suggestions for every exercise in the
  /// workout. Best-effort: failures leave the map empty and nothing shows.
  Future<void> _loadSuggestions() async {
    final payload = workout.exercises
        .where((e) => e.exerciseId.isNotEmpty)
        .map((e) => {
              'exerciseId': e.exerciseId,
              'strategy': e.progressionStrategy,
              'category': e.variant.isEmpty ? null : e.variant,
              'targetMuscles': e.targetMuscles,
              'name': e.name,
            })
        .toList();
    final result = await _api.getProgressionSuggestions(payload);
    if (mounted) setState(() => _suggestions = result);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _buzzTimer?.cancel();
    _pageController.dispose();
    _saveDebounce?.cancel();
    // Flush any pending edit before tearing down, then close the client.
    if (_dirty && workout.id != null) {
      _save().whenComplete(_api.dispose);
    } else {
      _api.dispose();
    }
    super.dispose();
  }

  /// Debounced persistence — called after any edit. No-op for unsaved/sample
  /// workouts (no backend id).
  void _scheduleSave() {
    if (workout.id == null) return;
    _dirty = true;
    _saveDebounce?.cancel();
    _saveDebounce = Timer(const Duration(milliseconds: 600), _save);
  }

  Future<void> _save() async {
    final id = workout.id;
    if (id == null) return;
    _saveDebounce?.cancel();
    _dirty = false;
    try {
      await _api.updateTraining(
        id: id,
        name: workout.name,
        exercises: workout.exercises
            .map((e) => {
                  'exerciseId': e.exerciseId,
                  'name': e.name,
                  'gifUrl': e.gifUrl,
                  'targetMuscles': e.targetMuscles,
                  'category': e.variant.isEmpty ? null : e.variant,
                  'progressionStrategy': e.progressionStrategy,
                  // Persist weights/reps only — not the session's done flags.
                  'sets': e.sets
                      .map((s) => {'kg': s.kg, 'reps': s.reps})
                      .toList(),
                })
            .toList(),
      );
    } catch (_) {
      _dirty = true; // keep it pending so a later flush retries
    }
  }

  /// Explicit "leave, continue later": always persist progress (even with no
  /// sets ticked yet) so the workout shows up as continuable, then leave.
  Future<void> _pauseAndExit() async {
    if (_exiting) return;
    _exiting = true;
    final nav = Navigator.of(context);
    await _save(); // flush training edits
    _saveProgress(); // unconditionally keep this workout resumable
    nav.pop();
  }

  /// Discard this in-progress workout: drop the saved progress so it won't show
  /// up as continuable, then leave without logging a session.
  Future<void> _discardAndExit() async {
    if (_exiting) return;
    _exiting = true;
    final nav = Navigator.of(context);
    if (workout.id != null) await WorkoutProgressStore.clear(workout.id!);
    nav.pop();
  }

  /// Leave the screen: flush training edits, and (on Finish) log a session.
  Future<void> _exit({required bool asSession}) async {
    if (_exiting) return;
    _exiting = true;
    final nav = Navigator.of(context);
    await _save();
    WorkoutSessionWithRank? created;
    if (asSession && workout.id != null) {
      // Back-date the start so the logged duration matches the elapsed clock.
      final finishedAt = DateTime.now();
      final startedAt =
          finishedAt.subtract(Duration(seconds: _elapsedTotal));
      try {
        created = await _api.createSession(
          trainingId: workout.id,
          name: workout.name,
          startedAt: startedAt,
          finishedAt: finishedAt,
          exercises: workout.exercises
              .map((e) => {
                    'exerciseId': e.exerciseId,
                    'name': e.name,
                    'gifUrl': e.gifUrl,
                    'targetMuscles': e.targetMuscles,
                    'sets': e.sets
                        .map((s) =>
                            {'kg': s.kg, 'reps': s.reps, 'done': s.done})
                        .toList(),
                  })
              .toList(),
        );
      } catch (_) {
        // Don't block leaving if the log fails.
      }
      // Workout finished — drop the saved progress so re-opening starts fresh.
      if (workout.id != null) await WorkoutProgressStore.clear(workout.id!);
    } else if (workout.id != null) {
      // Left without finishing: keep the progress only if at least one set was
      // ticked off, so the "continue" banner doesn't show untouched workouts.
      final anyDone =
          workout.exercises.any((e) => e.sets.any((s) => s.done));
      if (anyDone) {
        _saveProgress();
      } else {
        await WorkoutProgressStore.clear(workout.id!);
      }
    }
    // On Finish with a saved session, show the summary; otherwise just leave.
    if (created != null) {
      final session = created.session;
      final rankDelta = created.rankDelta;
      nav.pushReplacement(
        MaterialPageRoute(
          builder: (_) =>
              WorkoutSummaryScreen(session: session, rankDelta: rankDelta),
        ),
      );
    } else {
      nav.pop();
    }
  }

  // --- timer formatting / control -------------------------------------------

  String get _elapsedString {
    final raw = _elapsedTotal;
    final secs = raw < 0 ? 0 : raw;
    final h = (secs ~/ 3600).toString().padLeft(2, '0');
    final m = ((secs % 3600) ~/ 60).toString().padLeft(2, '0');
    final s = (secs % 60).toString().padLeft(2, '0');
    return '$h:$m:$s';
  }

  String _ms(int seconds) {
    final m = seconds ~/ 60;
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  String get _restString =>
      _ms(_restRunning ? _restRemaining : _restDuration);

  void _toggleRest() {
    setState(() {
      if (_restRunning) {
        _restRunning = false;
        _restRemaining = 0;
      } else {
        _restRemaining = _restDuration;
        _restRunning = true;
      }
    });
  }

  void _startRest() {
    setState(() {
      _restRemaining = _restDuration;
      _restRunning = true;
    });
  }

  /// Fired when the rest countdown reaches 0: buzz the phone repeatedly and
  /// throw up a full-screen alert that must be tapped away.
  void _onRestComplete() {
    if (!mounted || _restAlertShowing) return;
    _restAlertShowing = true;

    // Buzz immediately, then keep buzzing every ~700ms until dismissed.
    HapticFeedback.heavyImpact();
    _buzzTimer?.cancel();
    _buzzTimer = Timer.periodic(const Duration(milliseconds: 700), (_) {
      HapticFeedback.heavyImpact();
    });

    showGeneralDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black87,
      barrierLabel: 'Pihenő letelt',
      transitionDuration: const Duration(milliseconds: 220),
      pageBuilder: (_, __, ___) => _restOverDialog(),
      transitionBuilder: (_, anim, __, child) => FadeTransition(
        opacity: anim,
        child: ScaleTransition(
          scale: Tween(begin: 0.94, end: 1.0).animate(
              CurvedAnimation(parent: anim, curve: Curves.easeOutBack)),
          child: child,
        ),
      ),
    ).whenComplete(() {
      _buzzTimer?.cancel();
      _buzzTimer = null;
      _restAlertShowing = false;
    });
  }

  Widget _restOverDialog() {
    return Material(
      type: MaterialType.transparency,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.timer_outlined,
                  color: AppColors.accentAmber, size: 88),
              const SizedBox(height: 28),
              const Text('Pihenő letelt',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      color: AppColors.onSurface,
                      fontSize: 34,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5)),
              const SizedBox(height: 10),
              const Text('Készülj a következő szettre',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.muted, fontSize: 16)),
              const SizedBox(height: 40),
              GestureDetector(
                onTap: () => Navigator.of(context).pop(),
                behavior: HitTestBehavior.opaque,
                child: Container(
                  height: 56,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AppColors.accentAmber,
                    borderRadius: BorderRadius.circular(100),
                  ),
                  child: const Text('Folytatás',
                      style: TextStyle(
                          color: AppColors.background,
                          fontSize: 17,
                          fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Long-press the rest pill to choose a different rest length. Persisted so it
  /// sticks across workouts.
  void _showRestPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _sheet([
        const Padding(
          padding: EdgeInsets.fromLTRB(20, 0, 20, 4),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text('Pihenőidő',
                style: TextStyle(
                    color: AppColors.muted,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5)),
          ),
        ),
        for (final seconds in _restChoices)
          ListTile(
            title: Text(_ms(seconds),
                style: const TextStyle(
                    color: AppColors.onSurface,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    fontFeatures: [FontFeature.tabularFigures()])),
            trailing: _restDuration == seconds
                ? const Icon(Icons.check, color: AppColors.onSurface)
                : null,
            onTap: () async {
              Navigator.pop(ctx);
              setState(() {
                _restDuration = seconds;
                // If a rest is already counting down, retarget it too.
                if (_restRunning) _restRemaining = seconds;
              });
              final prefs = await SharedPreferences.getInstance();
              await prefs.setInt(_restKey, seconds);
            },
          ),
      ]),
    );
  }

  /// Open a YouTube search for this exercise's how-to in the browser/app.
  Future<void> _openYoutube(Exercise ex) async {
    final query = Uri.encodeComponent('${titleCase(ex.name)} how to');
    final uri = Uri.parse('https://www.youtube.com/results?search_query=$query');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  // --- exercise navigation ---------------------------------------------------

  /// Animate the PageView to [i]. Used by thumbnail taps; swipes move the page
  /// directly and report back through onPageChanged.
  void _goToExercise(int i) {
    if (i < 0 || i >= workout.exercises.length || i == _currentExercise) return;
    _pageController.animateToPage(
      i,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutCubic,
    );
  }

  int get totalSets => workout.exercises.fold(0, (a, e) => a + e.sets.length);
  int get doneSets =>
      workout.exercises.fold(0, (a, e) => a + e.sets.where((s) => s.done).length);

  /// Append a new set, copying the previous set's kg/reps as a sensible start.
  void _addSet(Exercise ex) {
    setState(() {
      final last = ex.sets.isNotEmpty ? ex.sets.last : null;
      ex.sets.add(WorkoutSet(kg: last?.kg ?? 0, reps: last?.reps ?? 0));
    });
    _scheduleSave();
    _saveProgress();
  }

  void _removeSet(Exercise ex, WorkoutSet set) {
    if (ex.sets.length <= 1) return;
    setState(() => ex.sets.remove(set));
    _scheduleSave();
    _saveProgress();
  }

  // --- exercise actions ------------------------------------------------------

  /// Menu opened from the top-bar hamburger: finish or leave.
  void _showWorkoutMenu() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _sheet([
        _menuItem(Icons.check_circle_outline, 'Edzés befejezése', () {
          Navigator.pop(ctx);
          _exit(asSession: true);
        }),
        _menuItem(Icons.pause_circle_outline, 'Kilépés – később folytatom', () {
          Navigator.pop(ctx);
          _pauseAndExit(); // always keeps progress for the "continue" card
        }),
        _menuItem(Icons.delete_outline, 'Edzés elvetése', () {
          Navigator.pop(ctx);
          _discardAndExit();
        }, muted: true),
      ]),
    );
  }

  /// The per-exercise menu: Info / Progression / Change / Delete.
  void _showExerciseMenu(int index, Exercise ex) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _sheet([
        _menuItem(Icons.info_outline, 'Info', () {
          Navigator.pop(ctx);
          _showInfo(ex);
        }),
        _menuItem(Icons.trending_up, 'Progresszió', () {
          Navigator.pop(ctx);
          _showProgressionPicker(index, ex);
        }),
        _menuItem(Icons.swap_horiz, 'Csere', () {
          Navigator.pop(ctx);
          _changeExercise(index, ex);
        }),
        _menuItem(Icons.delete_outline, 'Törlés', () {
          Navigator.pop(ctx);
          _deleteExercise(index);
        }, muted: true),
      ]),
    );
  }

  Widget _sheet(List<Widget> children) => Container(
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
              ...children,
              const SizedBox(height: 8),
            ],
          ),
        ),
      );

  Widget _menuItem(IconData icon, String label, VoidCallback onTap,
      {bool muted = false}) {
    final color = muted ? AppColors.muted : AppColors.onSurface;
    return ListTile(
      leading: Icon(icon, color: color),
      title: Text(label,
          style: TextStyle(
              color: color, fontSize: 16, fontWeight: FontWeight.w600)),
      onTap: onTap,
    );
  }

  void _showInfo(Exercise ex) {
    showExerciseInfoSheet(
      context,
      exerciseId: ex.exerciseId,
      fallback: ApiExercise(
        exerciseId: ex.exerciseId,
        name: ex.name,
        gifUrl: ex.gifUrl,
        targetMuscles: ex.targetMuscles,
      ),
    );
  }

  /// Per-exercise progression strategy picker. Persists immediately and
  /// re-fetches the hint so it reflects the new strategy.
  void _showProgressionPicker(int index, Exercise ex) {
    const options = <(String, String, String)>[
      ('linear', 'Lineáris', 'Minden alkalommal +súly'),
      ('double-progression', 'Dupla progresszió', 'Előbb ismétlés, majd súly'),
      ('rpe-based', 'RPE alapú', 'RPE 7–8 célzott terhelés'),
      ('none', 'Nincs', 'Ne javasoljon semmit'),
    ];
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _sheet([
        for (final (value, title, subtitle) in options)
          ListTile(
            title: Text(title,
                style: const TextStyle(
                    color: AppColors.onSurface,
                    fontSize: 16,
                    fontWeight: FontWeight.w600)),
            subtitle: Text(subtitle,
                style: const TextStyle(color: AppColors.muted, fontSize: 13)),
            trailing: ex.progressionStrategy == value
                ? const Icon(Icons.check, color: AppColors.onSurface)
                : null,
            onTap: () {
              Navigator.pop(ctx);
              if (ex.progressionStrategy == value) return;
              setState(() => ex.progressionStrategy = value);
              _scheduleSave();
              _loadSuggestions();
            },
          ),
      ]),
    );
  }

  Future<void> _changeExercise(int index, Exercise ex) async {
    final picked = await showChangeExerciseSheet(
      context,
      initialMuscle: ex.targetMuscles.isNotEmpty ? ex.targetMuscles.first : null,
    );
    if (picked == null || !mounted) return;
    setState(() {
      final old = workout.exercises[index];
      workout.exercises[index] = Exercise(
        name: picked.name,
        variant: '',
        exerciseId: picked.exerciseId,
        gifUrl: picked.gifUrl,
        targetMuscles: picked.targetMuscles,
        progressionStrategy: old.progressionStrategy, // keep the strategy
        sets: old.sets, // keep the logged sets
      );
    });
    _scheduleSave();
    _loadSuggestions(); // the new exercise has its own history
  }

  void _deleteExercise(int index) {
    setState(() {
      workout.exercises.removeAt(index);
      if (_currentExercise >= workout.exercises.length) {
        _currentExercise =
            workout.exercises.isEmpty ? 0 : workout.exercises.length - 1;
      }
    });
    // Keep the PageView aligned with the (possibly clamped) current index.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_pageController.hasClients && workout.exercises.isNotEmpty) {
        _pageController.jumpToPage(_currentExercise);
      }
    });
    _scheduleSave();
  }

  // --- build -----------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final exercises = workout.exercises;
    final hasExercises = exercises.isNotEmpty;
    final index = hasExercises
        ? _currentExercise.clamp(0, exercises.length - 1)
        : 0;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        _exit(asSession: false); // back/system exit: save edits, no session
      },
      child: Scaffold(
        body: SafeArea(
          child: Column(
            children: [
              _topBar(),
              if (hasExercises) _thumbnailStrip(index),
              Expanded(
                child: hasExercises
                    ? PageView.builder(
                        // Horizontal swipe slides between exercises natively.
                        controller: _pageController,
                        itemCount: exercises.length,
                        onPageChanged: (i) =>
                            setState(() => _currentExercise = i),
                        itemBuilder: (context, i) =>
                            _exerciseBody(i, exercises[i]),
                      )
                    : _emptyState(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- top bar ---------------------------------------------------------------

  Widget _topBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Row(
        children: [
          _squareButton(Icons.menu, _showWorkoutMenu),
          Expanded(
            child: Center(
              child: Text(
                _elapsedString,
                style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.5,
                    color: AppColors.onSurface,
                    fontFeatures: [FontFeature.tabularFigures()]),
              ),
            ),
          ),
          _restPill(),
        ],
      ),
    );
  }

  Widget _squareButton(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: AppColors.onSurface, size: 22),
      ),
    );
  }

  Widget _restPill() {
    final active = _restRunning;
    final color = active ? AppColors.accentAmber : AppColors.onSurface;
    return GestureDetector(
      onTap: _toggleRest,
      onLongPress: _showRestPicker,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(100),
          border: active
              ? Border.all(color: AppColors.accentAmber, width: 1)
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(active ? Icons.pause : Icons.timer_outlined,
                size: 16, color: color),
            const SizedBox(width: 6),
            Text(_restString,
                style: TextStyle(
                    color: color,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    fontFeatures: const [FontFeature.tabularFigures()])),
          ],
        ),
      ),
    );
  }

  // --- exercise thumbnail strip ---------------------------------------------

  Widget _thumbnailStrip(int activeIndex) {
    return SizedBox(
      height: 76,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: workout.exercises.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, i) {
          final ex = workout.exercises[i];
          final active = i == activeIndex;
          return GestureDetector(
            onTap: () => _goToExercise(i),
            child: AnimatedOpacity(
              duration: const Duration(milliseconds: 150),
              opacity: active ? 1 : 0.45,
              child: Container(
                width: 60,
                decoration: BoxDecoration(
                  color: AppColors.surfaceLow,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: active ? AppColors.primary : AppColors.outline,
                    width: active ? 2 : 1,
                  ),
                ),
                clipBehavior: Clip.antiAlias,
                child: _exerciseImage(ex.gifUrl,
                    iconSize: 18, showLabel: true, compact: true),
              ),
            ),
          );
        },
      ),
    );
  }

  // --- main exercise body ----------------------------------------------------

  Widget _exerciseBody(int index, Exercise ex) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Big exercise illustration.
          Container(
            width: double.infinity,
            height: 200,
            decoration: BoxDecoration(
              color: AppColors.surfaceLow,
              borderRadius: BorderRadius.circular(24),
            ),
            clipBehavior: Clip.antiAlias,
            child: _exerciseImage(ex.gifUrl, iconSize: 56, fit: BoxFit.contain),
          ),
          const SizedBox(height: 16),

          // Name + category + "How to".
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(titleCase(ex.name),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5,
                            color: AppColors.onSurface)),
                    const SizedBox(height: 2),
                    Text(
                      ex.variant.isNotEmpty
                          ? ex.variant
                          : (ex.targetMuscles.isNotEmpty
                              ? titleCase(ex.targetMuscles.join(', '))
                              : 'Gyakorlat'),
                      style: const TextStyle(
                          fontSize: 15, color: AppColors.muted),
                    ),
                  ],
                ),
              ),
              GestureDetector(
                onTap: () => _showInfo(ex),
                behavior: HitTestBehavior.opaque,
                child: const Padding(
                  padding: EdgeInsets.only(left: 12, top: 4),
                  child: Text('How to',
                      style: TextStyle(
                          color: AppColors.muted,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          decoration: TextDecoration.underline,
                          decorationColor: AppColors.muted)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Action buttons.
          Row(
            children: [
              _actionButton(Icons.info_outline, () => _showInfo(ex)),
              const SizedBox(width: 10),
              _actionButton(Icons.swap_horiz, () => _changeExercise(index, ex)),
              const SizedBox(width: 10),
              _actionButton(
                  Icons.trending_up, () => _showProgressionPicker(index, ex)),
              const SizedBox(width: 10),
              _actionButton(Icons.more_horiz, () => _showExerciseMenu(index, ex)),
            ],
          ),
          const SizedBox(height: 20),

          _suggestionHint(ex),

          // Sets table header.
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Row(
              children: const [
                SizedBox(
                    width: 28,
                    child: Text('#',
                        style: TextStyle(
                            color: AppColors.muted,
                            fontSize: 12,
                            fontWeight: FontWeight.w600))),
                Expanded(
                    child: Center(
                        child: Text('REPS',
                            style: TextStyle(
                                color: AppColors.muted,
                                fontSize: 11,
                                letterSpacing: 1.2)))),
                SizedBox(width: 12),
                Expanded(
                    child: Center(
                        child: Text('KG',
                            style: TextStyle(
                                color: AppColors.muted,
                                fontSize: 11,
                                letterSpacing: 1.2)))),
                SizedBox(width: 12),
                SizedBox(width: 26),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Sets.
          ...ex.sets.asMap().entries.map((e) => _SetRow(
                key: ValueKey(e.value),
                index: e.key,
                set: e.value,
                onChanged: _scheduleSave,
                onPlateCalc: () => showPlateCalculator(context, e.value.kg),
                onToggleDone: () {
                  setState(() => e.value.done = !e.value.done);
                  if (e.value.done) _startRest(); // auto-start rest on complete
                  _saveProgress(); // remember completed sets for "continue"
                },
                onRemove:
                    ex.sets.length > 1 ? () => _removeSet(ex, e.value) : null,
              )),
          const SizedBox(height: 14),

          // Remove / add set controls.
          Row(
            children: [
              Expanded(
                child: _wideButton(
                  Icons.remove,
                  ex.sets.length > 1
                      ? () => _removeSet(ex, ex.sets.last)
                      : null,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(child: _wideButton(Icons.add, () => _addSet(ex))),
            ],
          ),
          const SizedBox(height: 20),

          // Watch a how-to on YouTube (search by exercise name).
          GestureDetector(
            onTap: () => _openYoutube(ex),
            behavior: HitTestBehavior.opaque,
            child: Container(
              height: 50,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.surfaceLow,
                borderRadius: BorderRadius.circular(100),
                border: Border.all(color: AppColors.outline),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(Icons.play_circle_outline,
                      color: AppColors.onSurface, size: 20),
                  SizedBox(width: 8),
                  Text('Megnézés YouTube-on',
                      style: TextStyle(
                          color: AppColors.onSurface,
                          fontSize: 15,
                          fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _actionButton(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        width: 46,
        height: 46,
        decoration: BoxDecoration(
          color: AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Icon(icon, color: AppColors.onSurface, size: 20),
      ),
    );
  }

  Widget _wideButton(IconData icon, VoidCallback? onTap) {
    final enabled = onTap != null;
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        height: 48,
        decoration: BoxDecoration(
          color: AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(100),
        ),
        child: Icon(icon,
            color: enabled ? AppColors.onSurface : AppColors.surfaceHigh,
            size: 22),
      ),
    );
  }

  /// Exercise GIF/illustration with graceful fallback. Shows a "Hamarosan"
  /// label when the GIF is missing/404 — full size on the big preview, compact
  /// in the thumbnail strip.
  Widget _exerciseImage(String url,
      {double iconSize = 24,
      BoxFit fit = BoxFit.cover,
      bool? showLabel,
      bool compact = false}) {
    final fallback = Center(
      child: ExercisePlaceholder(
        iconSize: iconSize,
        showLabel: showLabel ?? (iconSize >= 40),
        compact: compact,
      ),
    );
    if (url.isEmpty) return fallback;
    return Image.network(
      url,
      fit: fit,
      loadingBuilder: (context, child, progress) =>
          progress == null ? child : const SizedBox.shrink(),
      errorBuilder: (_, __, ___) => fallback,
    );
  }

  Widget _emptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.fitness_center, color: AppColors.muted, size: 44),
            const SizedBox(height: 12),
            const Text('Nincs több gyakorlat',
                style: TextStyle(color: AppColors.muted, fontSize: 16)),
            const SizedBox(height: 20),
            TextButton(
              style: TextButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.background,
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(100)),
              ),
              onPressed: () => _exit(asSession: false),
              child: const Text('Kilépés',
                  style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }

  /// Faint grey, optional next-set hint above the sets table.
  Widget _suggestionHint(Exercise ex) {
    final s = ex.exerciseId.isEmpty ? null : _suggestions[ex.exerciseId];
    if (s == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 12),
      child: Text(
        'Javasolt: ${s.label}',
        style: const TextStyle(
          color: Color(0xFF3A3A3A),
          fontSize: 13,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

String _formatKg(double kg) =>
    kg == kg.roundToDouble() ? kg.toInt().toString() : kg.toString();

/// One set row: index · Reps pill · KG pill · status dot. The pills are
/// inline-editable (tap focuses, no dialog); the dot toggles "done".
class _SetRow extends StatefulWidget {
  final int index;
  final WorkoutSet set;
  final VoidCallback onToggleDone;
  final VoidCallback onChanged;
  final VoidCallback onPlateCalc;
  final VoidCallback? onRemove;

  const _SetRow({
    super.key,
    required this.index,
    required this.set,
    required this.onToggleDone,
    required this.onChanged,
    required this.onPlateCalc,
    this.onRemove,
  });

  @override
  State<_SetRow> createState() => _SetRowState();
}

class _SetRowState extends State<_SetRow> {
  late final TextEditingController _kg;
  late final TextEditingController _reps;

  @override
  void initState() {
    super.initState();
    _kg = TextEditingController(
        text: widget.set.kg == 0 ? '' : _formatKg(widget.set.kg));
    _reps = TextEditingController(
        text: widget.set.reps == 0 ? '' : '${widget.set.reps}');
  }

  @override
  void dispose() {
    _kg.dispose();
    _reps.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final done = widget.set.done;
    return GestureDetector(
      onLongPress: widget.onRemove,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(
          children: [
            SizedBox(
              width: 28,
              child: Text('${widget.index + 1}',
                  style: const TextStyle(
                      color: AppColors.muted,
                      fontSize: 15,
                      fontWeight: FontWeight.w600)),
            ),
            Expanded(
              child: _pill(
                controller: _reps,
                hint: '0',
                decimal: false,
                onChanged: (v) {
                  setState(() => widget.set.reps = int.tryParse(v) ?? 0);
                  widget.onChanged();
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _pill(
                controller: _kg,
                hint: 'BW',
                decimal: true,
                // Long-press the KG pill → plate calculator overlay.
                onLongPress: widget.onPlateCalc,
                onChanged: (v) {
                  setState(() => widget.set.kg =
                      double.tryParse(v.replaceAll(',', '.')) ?? 0);
                  widget.onChanged();
                },
              ),
            ),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: widget.onToggleDone,
              behavior: HitTestBehavior.opaque,
              child: Container(
                width: 26,
                height: 26,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: done ? AppColors.accentAmber : Colors.transparent,
                  border: Border.all(
                    color: done ? AppColors.accentAmber : AppColors.surfaceHigh,
                    width: 2,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _pill({
    required TextEditingController controller,
    required String hint,
    required bool decimal,
    required ValueChanged<String> onChanged,
    VoidCallback? onLongPress,
  }) {
    final field = Container(
      height: 46,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.surfaceMid,
        borderRadius: BorderRadius.circular(14),
      ),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        textAlign: TextAlign.center,
        keyboardType: TextInputType.numberWithOptions(decimal: decimal),
        textInputAction: TextInputAction.done,
        // Disable the field's own long-press selection so the parent wins.
        enableInteractiveSelection: onLongPress == null,
        style: const TextStyle(
            fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.onSurface),
        cursorColor: AppColors.onSurface,
        decoration: InputDecoration(
          isDense: true,
          contentPadding: EdgeInsets.zero,
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          hintText: hint,
          hintStyle: const TextStyle(
              color: AppColors.muted, fontSize: 17, fontWeight: FontWeight.w700),
        ),
      ),
    );
    if (onLongPress == null) return field;
    return GestureDetector(
      onLongPress: onLongPress,
      behavior: HitTestBehavior.opaque,
      child: field,
    );
  }
}
