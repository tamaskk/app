import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../models/exercise_api_models.dart';
import '../services/exercise_api.dart';
import '../utils/text.dart';
import '../i18n/app_strings.dart';
import 'exercise_placeholder.dart';

const _sheetDecoration = BoxDecoration(
  color: AppColors.background,
  borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
  // Uniform border — a borderRadius can't be combined with a non-uniform one.
  border: Border.fromBorderSide(BorderSide(color: AppColors.outline)),
);

Widget _grabHandle() => Container(
      margin: const EdgeInsets.only(top: 12, bottom: 4),
      width: 40,
      height: 4,
      decoration: BoxDecoration(
        color: AppColors.surfaceHigh,
        borderRadius: BorderRadius.circular(100),
      ),
    );

// ---------------------------------------------------------------------------
// INFO — read-only details of an exercise (fetched by id).
// ---------------------------------------------------------------------------

Future<void> showExerciseInfoSheet(
  BuildContext context, {
  required String exerciseId,
  ApiExercise? fallback,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) =>
        _ExerciseInfoSheet(exerciseId: exerciseId, fallback: fallback),
  );
}

class _ExerciseInfoSheet extends StatefulWidget {
  final String exerciseId;
  final ApiExercise? fallback;
  const _ExerciseInfoSheet({required this.exerciseId, this.fallback});

  @override
  State<_ExerciseInfoSheet> createState() => _ExerciseInfoSheetState();
}

class _ExerciseInfoSheetState extends State<_ExerciseInfoSheet> {
  final _api = ExerciseApi();
  ApiExercise? _ex;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _ex = widget.fallback;
    _load();
  }

  Future<void> _load() async {
    try {
      if (widget.exerciseId.isNotEmpty) {
        final ex = await _api.getExercise(widget.exerciseId);
        if (mounted) setState(() => _ex = ex);
      }
    } catch (_) {
      // Keep the fallback if the fetch fails.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _api.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.78,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, controller) => Container(
        decoration: _sheetDecoration,
        child: Column(
          children: [
            _grabHandle(),
            Expanded(child: _body(controller)),
          ],
        ),
      ),
    );
  }

  Widget _body(ScrollController controller) {
    final ex = _ex;
    if (ex == null) {
      return Center(
        child: _loading
            ? const CircularProgressIndicator()
            : Text(t('exercise.no_data'),
                style: const TextStyle(color: AppColors.muted)),
      );
    }
    return ListView(
      controller: controller,
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
      children: [
        _gif(ex.gifUrl),
        const SizedBox(height: 20),
        Text(titleCase(ex.name),
            style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                letterSpacing: -1,
                color: AppColors.onSurface)),
        _chips(t('detail.target_muscles'), ex.targetMuscles),
        _chips(t('detail.secondary_muscles'), ex.secondaryMuscles),
        _chips(t('detail.body_parts'), ex.bodyParts),
        _chips(t('detail.equipment'), ex.equipments),
        _instructions(ex.instructions),
      ],
    );
  }

  Widget _gif(String url) => ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: AspectRatio(
          aspectRatio: 1,
          child: Container(
            color: Colors.white,
            alignment: Alignment.center,
            child: url.isEmpty
                ? const ExercisePlaceholder(iconSize: 48, showLabel: true)
                : Image.network(url,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => const ExercisePlaceholder(
                        iconSize: 48, showLabel: true)),
          ),
        ),
      );

  Widget _label(String t) => Text(t.toUpperCase(),
      style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.5,
          color: AppColors.muted));

  Widget _chips(String title, List<String> values) {
    if (values.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        _label(title),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: values
              .map((v) => Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(100),
                      border: Border.all(color: AppColors.outline),
                    ),
                    child: Text(titleCase(v),
                        style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.onSurface)),
                  ))
              .toList(),
        ),
      ],
    );
  }

  Widget _instructions(List<String> steps) {
    if (steps.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 24),
        _label(t('detail.execution')),
        const SizedBox(height: 8),
        ...steps.asMap().entries.map((e) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 24,
                    child: Text('${e.key + 1}',
                        style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: AppColors.muted)),
                  ),
                  Expanded(
                    child: Text(
                      e.value.replaceFirst(RegExp(r'^Step:\d+\s*'), ''),
                      style: const TextStyle(
                          fontSize: 14,
                          height: 1.4,
                          color: AppColors.onSurface),
                    ),
                  ),
                ],
              ),
            )),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// CHANGE — pick a replacement exercise, muscle filter preselected.
// Returns the chosen ApiExercise, or null if dismissed.
// ---------------------------------------------------------------------------

Future<ApiExercise?> showChangeExerciseSheet(
  BuildContext context, {
  String? initialMuscle,
}) {
  return showModalBottomSheet<ApiExercise>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _ChangeExerciseSheet(initialMuscle: initialMuscle),
  );
}

class _ChangeExerciseSheet extends StatefulWidget {
  final String? initialMuscle;
  const _ChangeExerciseSheet({this.initialMuscle});

  @override
  State<_ChangeExerciseSheet> createState() => _ChangeExerciseSheetState();
}

class _ChangeExerciseSheetState extends State<_ChangeExerciseSheet> {
  final _api = ExerciseApi();
  List<String> _muscles = [];
  String? _muscleFilter;
  List<ApiExercise> _results = [];
  bool _loading = true;
  int _reqId = 0;

  @override
  void initState() {
    super.initState();
    _muscleFilter = widget.initialMuscle;
    _loadMuscles();
    _load();
  }

  @override
  void dispose() {
    _api.dispose();
    super.dispose();
  }

  Future<void> _loadMuscles() async {
    try {
      final m = await _api.muscles();
      if (mounted) setState(() => _muscles = m);
    } catch (_) {}
  }

  Future<void> _load() async {
    final reqId = ++_reqId;
    setState(() => _loading = true);
    try {
      final page = await _api.listExercises(
        targetMuscles: _muscleFilter == null ? null : [_muscleFilter!],
        limit: 25, // /exercises caps limit at 25 (30 -> 400)
      );
      if (mounted && reqId == _reqId) {
        setState(() {
          _results = page.items;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted && reqId == _reqId) setState(() => _loading = false);
    }
  }

  void _selectMuscle(String? m) {
    setState(() => _muscleFilter = m);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, controller) => Container(
        decoration: _sheetDecoration,
        child: Column(
          children: [
            _grabHandle(),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(t('exercise.change_exercise'),
                    style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                        color: AppColors.onSurface)),
              ),
            ),
            if (_muscles.isNotEmpty) _muscleChips(),
            Expanded(child: _list(controller)),
          ],
        ),
      ),
    );
  }

  Widget _muscleChips() {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _muscles.length + 1,
        separatorBuilder: (_, __) => const SizedBox(width: 4),
        itemBuilder: (context, i) {
          if (i == 0) {
            return _chip(t('create.all_filter'), _muscleFilter == null,
                () => _selectMuscle(null));
          }
          final m = _muscles[i - 1];
          return _chip(m, _muscleFilter == m,
              () => _selectMuscle(_muscleFilter == m ? null : m));
        },
      ),
    );
  }

  Widget _chip(String label, bool active, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(titleCase(label),
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: active ? FontWeight.w700 : FontWeight.w600,
                    color: active ? AppColors.onSurface : AppColors.muted)),
            const SizedBox(height: 6),
            Container(
              width: 4,
              height: 4,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: active ? AppColors.onSurface : Colors.transparent,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _list(ScrollController controller) {
    if (_loading && _results.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_results.isEmpty) {
      return Center(
          child: Text(t('common.no_results'),
              style: const TextStyle(color: AppColors.muted)));
    }
    return ListView.builder(
      controller: controller,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      itemCount: _results.length,
      itemBuilder: (context, i) {
        final ex = _results[i];
        return GestureDetector(
          onTap: () => Navigator.of(context).pop(ex),
          behavior: HitTestBehavior.opaque,
          child: Container(
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
                    child: ex.gifUrl.isEmpty
                        ? const ExercisePlaceholder(
                            iconSize: 18, showLabel: true, compact: true)
                        : Image.network(ex.gifUrl,
                            fit: BoxFit.cover,
                            loadingBuilder: (c, child, p) =>
                                p == null ? child : const SizedBox.shrink(),
                            errorBuilder: (_, __, ___) =>
                                const ExercisePlaceholder(
                                    iconSize: 18,
                                    showLabel: true,
                                    compact: true)),
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
                const Icon(Icons.swap_horiz, color: AppColors.muted, size: 20),
              ],
            ),
          ),
        );
      },
    );
  }
}
