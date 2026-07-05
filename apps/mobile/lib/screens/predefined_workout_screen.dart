import 'dart:math';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/api.dart';
import '../services/auth_service.dart';
import '../services/exercise_api.dart';
import '../models/exercise_api_models.dart';
import '../data/predefined_workouts.dart';
import '../i18n/app_strings.dart';
import '../utils/text.dart';
import '../widgets/exercise_image.dart';
import 'paywall_screen.dart';

// Grayscale matrix so cover photos fit the monochrome design.
const _grayscale = ColorFilter.matrix(<double>[
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0, 0, 0, 1, 0,
]);

/// Shows a predefined "story" workout: a cover, the two muscle groups, and a
/// set of exercises generated live from the catalogue. The user can save it to
/// their own trainings (with sensible default sets).
class PredefinedWorkoutScreen extends StatefulWidget {
  final PredefinedWorkout workout;
  // Needed to surface the free-tier paywall (402) when the user is at the cap.
  final AuthService? auth;
  const PredefinedWorkoutScreen({super.key, required this.workout, this.auth});

  @override
  State<PredefinedWorkoutScreen> createState() =>
      _PredefinedWorkoutScreenState();
}

class _PredefinedWorkoutScreenState extends State<PredefinedWorkoutScreen> {
  final _exApi = ExerciseApi();
  final _api = Api();

  bool _loading = true;
  bool _saving = false;
  String? _error;
  List<ApiExercise> _exercises = [];

  // How many exercises to pull per muscle group.
  static const _perGroup = 4;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _exApi.dispose();
    _api.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final seen = <String>{};
      final combined = <ApiExercise>[];
      for (final group in widget.workout.groups) {
        final page = await _exApi.listExercises(
          targetMuscles: [group.query],
          limit: 16,
        );
        final picks = ([...page.items]..shuffle(Random(page.items.length)))
            .where((e) => seen.add(e.exerciseId))
            .take(_perGroup);
        combined.addAll(picks);
      }
      if (!mounted) return;
      setState(() => _exercises = combined);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = t('pw.db_unreachable'));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (_exercises.isEmpty) return;
    setState(() => _saving = true);
    try {
      await _api.createTraining(
        name: widget.workout.title,
        exercises: _exercises
            .map((e) => {
                  'exerciseId': e.exerciseId,
                  'name': e.name,
                  'gifUrl': e.gifUrl,
                  'targetMuscles': e.targetMuscles,
                  'sets': List.generate(3, (_) => {'kg': 0, 'reps': 0}),
                })
            .toList(),
      );
      if (mounted) Navigator.of(context).pop(true);
    } on FreeTierLimitException catch (e) {
      // Free user already at the cap — explain it and offer the paywall
      // instead of the misleading "is the server running?" message.
      if (mounted) await _showFreeTierLimit(e.limit);
    } on ApiException catch (e) {
      _snack(e.message);
    } catch (_) {
      _snack(t('pw.save_failed'));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  /// Modal explaining the free-tier ceiling + a single CTA into the paywall.
  Future<void> _showFreeTierLimit(int limit) async {
    final auth = widget.auth;
    final upgrade = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceLow,
        title: Text(t('free_limit.title'),
            style: const TextStyle(color: AppColors.onSurface)),
        content: Text(
          tFmt('free_limit.body', {'n': limit}),
          style: const TextStyle(color: AppColors.muted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(t('common.cancel'),
                style: const TextStyle(color: AppColors.muted)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              t('free_limit.cta'),
              style: const TextStyle(
                  color: AppColors.onSurface, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
    if (upgrade != true || !mounted || auth == null) return;
    await Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => PaywallScreen(auth: auth),
      ),
    );
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    final w = widget.workout;
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(color: AppColors.onSurface),
        title: Text(t('pw.appbar_title')),
      ),
      body: Column(
        children: [
          Expanded(child: _body(w)),
          if (!_loading && _error == null && _exercises.isNotEmpty)
            _saveBar(),
        ],
      ),
    );
  }

  Widget _body(PredefinedWorkout w) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off, color: AppColors.muted, size: 40),
              const SizedBox(height: 12),
              Text(_error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.muted)),
              const SizedBox(height: 16),
              TextButton(onPressed: _load, child: Text(t('common.retry'))),
            ],
          ),
        ),
      );
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      children: [
        _cover(w),
        const SizedBox(height: 20),
        Text(w.title,
            style: const TextStyle(
                fontSize: 30,
                fontWeight: FontWeight.w800,
                letterSpacing: -1,
                color: AppColors.onSurface)),
        const SizedBox(height: 4),
        Text(
            tFmt('pw.subtitle_count',
                {'subtitle': w.subtitle, 'count': _exercises.length}),
            style: const TextStyle(color: AppColors.muted, fontSize: 14)),
        const SizedBox(height: 20),
        ..._exercises.asMap().entries.map((e) => _exerciseRow(e.key, e.value)),
      ],
    );
  }

  Widget _cover(PredefinedWorkout w) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: ColorFiltered(
          colorFilter: _grayscale,
          child: Image.network(
            w.imageUrl,
            fit: BoxFit.cover,
            loadingBuilder: (context, child, progress) => progress == null
                ? child
                : Container(color: AppColors.surfaceLow),
            errorBuilder: (_, __, ___) => Container(
              color: AppColors.surfaceLow,
              alignment: Alignment.center,
              child: const Icon(Icons.fitness_center,
                  color: AppColors.muted, size: 40),
            ),
          ),
        ),
      ),
    );
  }

  Widget _exerciseRow(int i, ApiExercise ex) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        border: i == 0
            ? null
            : const Border(top: BorderSide(color: AppColors.outline)),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Container(
              width: 52,
              height: 52,
              color: AppColors.surfaceHigh,
              child: ExerciseImage(
                frames: ex.imageFrames,
                iconSize: 18,
                compact: true,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(titleCase(ex.name),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurface)),
                if (ex.muscleSummary.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(titleCase(ex.muscleSummary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.muted)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _saveBar() {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
        child: SizedBox(
          width: double.infinity,
          child: TextButton(
            style: TextButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.background,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16)),
            ),
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: AppColors.background),
                  )
                : Text(t('pw.add_to_my_workouts'),
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 15)),
          ),
        ),
      ),
    );
  }
}
