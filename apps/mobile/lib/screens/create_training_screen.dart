import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../i18n/app_strings.dart';
import '../services/api.dart';
import '../services/auth_service.dart';
import '../services/exercise_api.dart';
import '../theme/app_theme.dart';
import '../models/exercise_api_models.dart';
import '../widgets/exercise_placeholder.dart';
import 'paywall_screen.dart';

class CreateTrainingScreen extends StatefulWidget {
  /// Auth service is optional so older call sites keep compiling, but it's
  /// required to handle the free-tier paywall (402 → upgrade prompt). When
  /// absent the save call falls back to a generic snackbar.
  final AuthService? auth;

  const CreateTrainingScreen({super.key, this.auth});

  @override
  State<CreateTrainingScreen> createState() => _CreateTrainingScreenState();
}

class _CreateTrainingScreenState extends State<CreateTrainingScreen> {
  final _api = Api(); // saves the training (apps/web backend)
  final _exApi = ExerciseApi(); // exercise catalogue (gym-exercise-api)
  final _nameController = TextEditingController();
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();

  Timer? _debounce;
  bool _saving = false;

  // Catalogue / paging state.
  List<ApiExercise> _results = [];
  bool _loading = false; // first page in flight
  bool _loadingMore = false; // next page in flight
  bool _hasMore = false; // another page exists (browse mode only)
  String? _nextCursor; // keyset cursor for the next page
  String? _error;
  int _requestId = 0; // guards against out-of-order responses

  // Muscle-group filter.
  List<String> _muscles = [];
  String? _muscleFilter;

  // Picked exercises, keyed by catalogue id so toggling is cheap.
  final Map<String, ApiExercise> _selected = {};

  // User-created exercises that aren't in the public catalogue. They live
  // in this list so they survive search / muscle filter changes, get
  // prepended to the visible results, and are toggleable just like
  // catalogue items via [_selected]. Synthetic ids are prefixed
  // `custom_` so the backend can flag them as user-generated later.
  final List<ApiExercise> _customExercises = [];

  static const _pageSize = 20;

  /// Text search (fuzzy) replaces browse mode and isn't paginated.
  bool get _searching => _searchController.text.trim().length >= 2;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadMuscles();
    _loadFirstPage();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _scrollController.dispose();
    _nameController.dispose();
    _searchController.dispose();
    _api.dispose();
    _exApi.dispose();
    super.dispose();
  }

  Future<void> _loadMuscles() async {
    try {
      final muscles = await _exApi.muscles();
      if (mounted) setState(() => _muscles = muscles);
    } catch (_) {
      // Filters are optional; browsing still works without them.
    }
  }

  void _onSearchChanged(String _) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), _loadFirstPage);
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final pos = _scrollController.position;
    if (pos.pixels >= pos.maxScrollExtent - 400) _loadMore();
  }

  /// Resets the list and loads the first page (fuzzy search or filtered browse).
  Future<void> _loadFirstPage() async {
    final reqId = ++_requestId;
    setState(() {
      _loading = true;
      _error = null;
      _results = [];
      _nextCursor = null;
      _hasMore = false;
    });
    try {
      final query = _searchController.text.trim();
      if (query.length >= 2) {
        final results = await _exApi.searchExercises(query, limit: 30);
        if (!mounted || reqId != _requestId) return;
        setState(() {
          _results = results;
          _hasMore = false;
        });
      } else {
        final page = await _exApi.listExercises(
          targetMuscles: _muscleFilter == null ? null : [_muscleFilter!],
          limit: _pageSize,
        );
        if (!mounted || reqId != _requestId) return;
        setState(() {
          _results = _shuffled(page.items);
          _nextCursor = page.nextCursor;
          _hasMore = page.hasNextPage && page.nextCursor != null;
        });
      }
    } on ApiException catch (e) {
      if (mounted && reqId == _requestId) {
        setState(() => _error = _friendlyError(e));
      }
    } catch (_) {
      if (mounted && reqId == _requestId) {
        setState(() => _error = t('create.server_unreachable'));
      }
    } finally {
      if (mounted && reqId == _requestId) setState(() => _loading = false);
    }
  }

  /// Appends the next page in browse mode (search results aren't paginated).
  Future<void> _loadMore() async {
    if (_searching || _loadingMore || !_hasMore || _nextCursor == null) return;
    final reqId = _requestId; // same request lineage as the current list
    setState(() => _loadingMore = true);
    try {
      final page = await _exApi.listExercises(
        targetMuscles: _muscleFilter == null ? null : [_muscleFilter!],
        limit: _pageSize,
        after: _nextCursor,
      );
      if (!mounted || reqId != _requestId) return;
      setState(() {
        _results = [..._results, ..._shuffled(page.items)];
        _nextCursor = page.nextCursor;
        _hasMore = page.hasNextPage && page.nextCursor != null;
      });
    } catch (_) {
      // Keep what we have; the user can scroll again to retry.
    } finally {
      if (mounted && reqId == _requestId) setState(() => _loadingMore = false);
    }
  }

  /// Light client-side shuffle so the browse feed feels varied ("random"),
  /// without reordering items already on screen. Seeded by length to stay
  /// stable across rebuilds of the same batch.
  List<ApiExercise> _shuffled(List<ApiExercise> items) {
    final copy = [...items]..shuffle(Random(items.length));
    return copy;
  }

  String _friendlyError(ApiException e) {
    if (e.statusCode == 500 || e.statusCode == 503) {
      return t('create.db_unavailable');
    }
    if (e.statusCode == 429) return t('create.too_many_requests');
    return e.message;
  }

  void _selectMuscle(String? muscle) {
    setState(() => _muscleFilter = muscle);
    _loadFirstPage();
  }

  void _toggle(ApiExercise ex) {
    setState(() {
      if (_selected.containsKey(ex.exerciseId)) {
        _selected.remove(ex.exerciseId);
      } else {
        _selected[ex.exerciseId] = ex;
      }
    });
  }

  /// Sheet for filling in a brand-new exercise that doesn't exist in the
  /// public catalogue. Auto-selects on save so the user sees their workout
  /// count go up immediately and the new tile appear at the top of the list.
  void _showCustomExerciseSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CustomExerciseSheet(
        muscles: _muscles,
        onCreate: _addCustomExercise,
      ),
    );
  }

  void _addCustomExercise({
    required String name,
    String? targetMuscle,
    String? equipment,
    String? note,
    String? gifUrl,
  }) {
    // Synthetic id — `custom_` prefix lets the backend / future migrations
    // tell user-generated rows apart from catalogue ids.
    final id = 'custom_${DateTime.now().millisecondsSinceEpoch}_'
        '${Random().nextInt(0xFFFFFF)}';
    final muscle = (targetMuscle ?? '').trim();
    final equip = (equipment ?? '').trim();
    final noteText = (note ?? '').trim();
    final gif = (gifUrl ?? '').trim();
    final ex = ApiExercise(
      exerciseId: id,
      name: name.trim(),
      gifUrl: gif,
      targetMuscles: muscle.isEmpty ? const [] : [muscle.toLowerCase()],
      equipments: equip.isEmpty ? const [] : [equip.toLowerCase()],
      instructions: noteText.isEmpty ? const [] : [noteText],
    );
    setState(() {
      // Newest custom exercise on top.
      _customExercises.insert(0, ex);
      // Auto-select so the "Mentés (N)" counter updates instantly.
      _selected[ex.exerciseId] = ex;
    });
  }

  /// Bottom-sheet "drawer" with every field of the exercise object.
  void _showDetails(ApiExercise ex) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ExerciseDetailSheet(
        exercise: ex,
        isSelected: () => _selected.containsKey(ex.exerciseId),
        onToggle: () => _toggle(ex),
      ),
    );
  }

  Future<void> _save() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      _snack(t('create.give_name'));
      return;
    }
    if (_selected.isEmpty) {
      _snack(t('create.add_exercise'));
      return;
    }
    setState(() => _saving = true);
    try {
      await _api.createTraining(
        name: name,
        exercises: _selected.values
            .map((e) => {
                  'exerciseId': e.exerciseId,
                  'name': e.name,
                  'gifUrl': e.gifUrl,
                  'targetMuscles': e.targetMuscles,
                  // Sensible default: 3 empty sets, editable later.
                  'sets': List.generate(3, (_) => {'kg': 0, 'reps': 0}),
                })
            .toList(),
      );
      if (mounted) Navigator.of(context).pop(true);
    } on FreeTierLimitException catch (e) {
      // Free user already at the cap — bounce them to the paywall instead
      // of just snackbar-ing the rejection.
      if (mounted) await _showFreeTierLimit(e.limit);
    } on ApiException catch (e) {
      _snack(_friendlyError(e));
    } catch (_) {
      _snack(t('create.save_failed'));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  /// Modal explaining the free-tier ceiling + a single CTA into the
  /// paywall. We don't auto-push the paywall — the user just hit a wall,
  /// give them the explanation and a button so the surprise isn't jarring.
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
    return Scaffold(
      appBar: AppBar(
        title: Text(t('create.title')),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton(
              style: TextButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.background,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(100)),
              ),
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: AppColors.background),
                    )
                  : Text(tFmt('create.save_count', {'n': _selected.length}),
                      style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: TextField(
              controller: _nameController,
              style: const TextStyle(
                  fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -1),
              decoration: InputDecoration(
                hintText: t('create.name_hint'),
                border: InputBorder.none,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => _loadFirstPage(),
              decoration: InputDecoration(
                hintText: t('create.search_exercises'),
                prefixIcon: const Icon(Icons.search, color: AppColors.muted),
                filled: false,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppColors.outline),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppColors.outline),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppColors.onSurface),
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
              ),
            ),
          ),
          // Muscle-group filter — only while browsing (not fuzzy-searching).
          if (_muscles.isNotEmpty && !_searching) _muscleChips(),
          _ownExerciseButton(),
          Expanded(child: _resultsBody()),
        ],
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
            return _chip(
                t('create.all_filter'), _muscleFilter == null, () => _selectMuscle(null));
          }
          final m = _muscles[i - 1];
          return _chip(
            m,
            _muscleFilter == m,
            () => _selectMuscle(_muscleFilter == m ? null : m),
          );
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
            Text(
              _titleCase(label),
              style: TextStyle(
                fontSize: 14,
                fontWeight: active ? FontWeight.w700 : FontWeight.w600,
                color: active ? AppColors.onSurface : AppColors.muted,
              ),
            ),
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

  /// "+ Saját gyakorlat" affordance, always visible above the list so the
  /// user can add their own exercise even when the catalogue search comes
  /// back empty or fails. Kept outside the scrollable list so it doesn't
  /// scroll away with the catalogue.
  Widget _ownExerciseButton() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
      child: InkWell(
        onTap: _showCustomExerciseSheet,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.outline),
          ),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.surfaceHigh,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.add,
                    color: AppColors.onSurface, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      t('custom.title'),
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurface,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      t('custom.subtitle_card'),
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.muted),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.muted),
            ],
          ),
        ),
      ),
    );
  }

  Widget _resultsBody() {
    // Custom exercises are pinned to the top of the displayed list so
    // they survive search / muscle-filter changes.
    final display = [..._customExercises, ..._results];

    if (_loading && display.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null && display.isEmpty) {
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
              TextButton(
                  onPressed: _loadFirstPage, child: Text(t('common.retry'))),
            ],
          ),
        ),
      );
    }
    if (display.isEmpty) {
      return Center(
        child: Text(t('common.no_results'),
            style: const TextStyle(color: AppColors.muted)),
      );
    }
    // One extra row at the end for the infinite-scroll loader (browse mode).
    final showLoader = _hasMore && !_searching;
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      itemCount: display.length + (showLoader ? 1 : 0),
      itemBuilder: (context, i) {
        if (i >= display.length) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 20),
            child: Center(
              child: SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          );
        }
        final ex = display[i];
        final selected = _selected.containsKey(ex.exerciseId);
        return GestureDetector(
          onTap: () => _showDetails(ex),
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
                _thumb(ex.gifUrl),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _titleCase(ex.name),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.onSurface,
                        ),
                      ),
                      if (ex.muscleSummary.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          _titleCase(ex.muscleSummary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.muted,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // Separate tap target: row opens details, this toggles select.
                GestureDetector(
                  onTap: () => _toggle(ex),
                  behavior: HitTestBehavior.opaque,
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: Icon(
                      selected ? Icons.check_circle : Icons.add_circle_outline,
                      color: selected ? AppColors.onSurface : AppColors.muted,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  /// Animated GIF preview for the exercise, with graceful fallbacks.
  Widget _thumb(String url) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 52,
        height: 52,
        color: AppColors.surfaceHigh,
        child: url.isEmpty
            ? const ExercisePlaceholder(
                iconSize: 18, showLabel: true, compact: true)
            : Image.network(
                url,
                fit: BoxFit.cover,
                loadingBuilder: (context, child, progress) =>
                    progress == null ? child : const SizedBox.shrink(),
                errorBuilder: (_, __, ___) => const ExercisePlaceholder(
                    iconSize: 18, showLabel: true, compact: true),
              ),
      ),
    );
  }

}

/// Capitalises the first letter of every word: "side lying (male)" -> "Side
/// Lying (Male)". Leaves the rest of each word as-is.
String _titleCase(String s) => s.replaceAllMapped(
      RegExp(r'\w+'),
      (m) => '${m[0]![0].toUpperCase()}${m[0]!.substring(1)}',
    );

/// Draggable bottom-sheet showing the full exercise object: GIF, name, id,
/// muscles, body parts, equipment and the step-by-step instructions.
class _ExerciseDetailSheet extends StatefulWidget {
  final ApiExercise exercise;
  final bool Function() isSelected;
  final VoidCallback onToggle;

  const _ExerciseDetailSheet({
    required this.exercise,
    required this.isSelected,
    required this.onToggle,
  });

  @override
  State<_ExerciseDetailSheet> createState() => _ExerciseDetailSheetState();
}

class _ExerciseDetailSheetState extends State<_ExerciseDetailSheet> {
  @override
  Widget build(BuildContext context) {
    final ex = widget.exercise;
    final selected = widget.isSelected();

    return DraggableScrollableSheet(
      initialChildSize: 0.78,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, controller) {
        return Container(
          decoration: const BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            border: Border.fromBorderSide(BorderSide(color: AppColors.outline)),
          ),
          child: Column(
            children: [
              // Grab handle.
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 4),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.surfaceHigh,
                  borderRadius: BorderRadius.circular(100),
                ),
              ),
              Expanded(
                child: ListView(
                  controller: controller,
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
                  children: [
                    _gif(ex.gifUrl),
                    const SizedBox(height: 20),
                    Text(
                      _titleCase(ex.name),
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -1,
                        color: AppColors.onSurface,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text('ID: ${ex.exerciseId}',
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.muted)),
                    const SizedBox(height: 16),
                    _toggleButton(selected),
                    const SizedBox(height: 8),
                    _chipsSection(t('detail.target_muscles'), ex.targetMuscles),
                    _chipsSection(
                        t('detail.secondary_muscles'), ex.secondaryMuscles),
                    _chipsSection(t('detail.body_parts'), ex.bodyParts),
                    _chipsSection(t('detail.equipment'), ex.equipments),
                    _instructions(ex.instructions),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _gif(String url) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: AspectRatio(
        aspectRatio: 1,
        child: Container(
          color: Colors.white,
          alignment: Alignment.center,
          child: url.isEmpty
              ? const ExercisePlaceholder(iconSize: 48, showLabel: true)
              : Image.network(
                  url,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) =>
                      const ExercisePlaceholder(iconSize: 48, showLabel: true),
                ),
        ),
      ),
    );
  }

  Widget _toggleButton(bool selected) {
    return SizedBox(
      width: double.infinity,
      child: TextButton(
        style: TextButton.styleFrom(
          backgroundColor:
              selected ? Colors.transparent : AppColors.primary,
          foregroundColor:
              selected ? AppColors.onSurface : AppColors.background,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: selected
                ? const BorderSide(color: AppColors.outline)
                : BorderSide.none,
          ),
        ),
        onPressed: () {
          widget.onToggle();
          setState(() {});
        },
        child: Text(
          selected ? t('detail.remove') : t('detail.add'),
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
        ),
      ),
    );
  }

  Widget _chipsSection(String title, List<String> values) {
    if (values.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        _sectionLabel(title),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: values
              .map((v) => Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(100),
                      border: Border.all(color: AppColors.outline),
                    ),
                    child: Text(_titleCase(v),
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
        _sectionLabel(t('detail.execution')),
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
                      // ExerciseDB prefixes steps with "Step:N "; strip it.
                      e.value.replaceFirst(RegExp(r'^Step:\d+\s*'), ''),
                      style: const TextStyle(
                          fontSize: 14, height: 1.4, color: AppColors.onSurface),
                    ),
                  ),
                ],
              ),
            )),
      ],
    );
  }

  Widget _sectionLabel(String text) => Text(
        text.toUpperCase(),
        style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.5,
            color: AppColors.muted),
      );
}

// ---------------------------------------------------------------------------
// Custom-exercise bottom sheet
// ---------------------------------------------------------------------------

/// Form for capturing a brand-new exercise that's not in the catalogue.
/// Keeps the field set deliberately tight — name + muscle + optional
/// equipment + optional note — so the user can fly through the dialog and
/// the engine still has the muscle tag needed for volume / rank scoring.
class _CustomExerciseSheet extends StatefulWidget {
  final List<String> muscles;
  final void Function({
    required String name,
    String? targetMuscle,
    String? equipment,
    String? note,
    String? gifUrl,
  }) onCreate;

  const _CustomExerciseSheet({
    required this.muscles,
    required this.onCreate,
  });

  @override
  State<_CustomExerciseSheet> createState() => _CustomExerciseSheetState();
}

class _CustomExerciseSheetState extends State<_CustomExerciseSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _equipmentController = TextEditingController();
  final _noteController = TextEditingController();
  final _gifUrlController = TextEditingController();
  String? _muscle;

  @override
  void initState() {
    super.initState();
    // Refresh preview thumb whenever the URL changes — `setState` keeps the
    // build cheap because only the small thumbnail re-mounts.
    _gifUrlController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _nameController.dispose();
    _equipmentController.dispose();
    _noteController.dispose();
    _gifUrlController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    widget.onCreate(
      name: _nameController.text,
      targetMuscle: _muscle,
      equipment: _equipmentController.text,
      note: _noteController.text,
      gifUrl: _gifUrlController.text,
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    // Bottom sheet that resizes with the keyboard — long muscle list +
    // multi-line note can push the form down, so we let the user scroll.
    final viewInsets = MediaQuery.of(context).viewInsets;
    return Padding(
      padding: EdgeInsets.only(bottom: viewInsets.bottom),
      child: DraggableScrollableSheet(
        initialChildSize: 0.78,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, controller) {
          return Container(
            decoration: const BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              border: Border.fromBorderSide(
                  BorderSide(color: AppColors.outline)),
            ),
            child: Column(
              children: [
                Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 4),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceHigh,
                    borderRadius: BorderRadius.circular(100),
                  ),
                ),
                Expanded(
                  child: Form(
                    key: _formKey,
                    child: ListView(
                      controller: controller,
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
                      children: [
                        Text(
                          t('custom.title'),
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -1,
                            color: AppColors.onSurface,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          t('custom.intro'),
                          style: const TextStyle(
                              fontSize: 13, color: AppColors.muted),
                        ),
                        const SizedBox(height: 24),
                        _label(t('custom.name_label')),
                        const SizedBox(height: 6),
                        _textField(
                          controller: _nameController,
                          hint: t('custom.name_hint'),
                          autofocus: true,
                          validator: (v) {
                            final s = (v ?? '').trim();
                            if (s.isEmpty) return t('custom.name_required');
                            if (s.length > 80) return t('custom.name_too_long');
                            return null;
                          },
                        ),
                        const SizedBox(height: 20),
                        _label(t('custom.muscle_label')),
                        const SizedBox(height: 6),
                        _muscleDropdown(),
                        const SizedBox(height: 20),
                        _label(t('custom.equipment_label')),
                        const SizedBox(height: 6),
                        _textField(
                          controller: _equipmentController,
                          hint: t('custom.equipment_hint'),
                        ),
                        const SizedBox(height: 20),
                        _label(t('custom.note_label')),
                        const SizedBox(height: 6),
                        _textField(
                          controller: _noteController,
                          hint: t('custom.note_hint'),
                          maxLines: 3,
                        ),
                        const SizedBox(height: 20),
                        _label(t('custom.gif_label')),
                        const SizedBox(height: 6),
                        _textField(
                          controller: _gifUrlController,
                          hint: t('custom.gif_hint'),
                          validator: _validateUrl,
                        ),
                        const SizedBox(height: 10),
                        _gifPreview(),
                        const SizedBox(height: 28),
                        SizedBox(
                          width: double.infinity,
                          child: TextButton(
                            style: TextButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: AppColors.background,
                              padding:
                                  const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            onPressed: _submit,
                            child: Text(
                              t('custom.add_to_workout'),
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700, fontSize: 15),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Center(
                          child: TextButton(
                            onPressed: () => Navigator.of(context).pop(),
                            child: Text(t('common.cancel'),
                                style: const TextStyle(color: AppColors.muted)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _label(String text) => Text(
        text.toUpperCase(),
        style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.5,
            color: AppColors.muted),
      );

  Widget _textField({
    required TextEditingController controller,
    required String hint,
    bool autofocus = false,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      autofocus: autofocus,
      maxLines: maxLines,
      validator: validator,
      style: const TextStyle(color: AppColors.onSurface, fontSize: 15),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: AppColors.muted, fontSize: 14),
        filled: false,
        contentPadding:
            const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.outline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.outline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.onSurface),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.accentRed),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.accentRed),
        ),
      ),
    );
  }

  String? _validateUrl(String? value) {
    final v = (value ?? '').trim();
    if (v.isEmpty) return null; // optional field
    final uri = Uri.tryParse(v);
    if (uri == null || !uri.isAbsolute || !uri.hasScheme) {
      return t('custom.gif_invalid');
    }
    if (uri.scheme != 'https' && uri.scheme != 'http') {
      return t('custom.gif_invalid_scheme');
    }
    return null;
  }

  /// Live thumbnail of the entered URL — gives the user a confidence check
  /// before saving. Errors fall back to a muted icon (matching the catalogue
  /// thumbs) instead of throwing a red exception card.
  Widget _gifPreview() {
    final url = _gifUrlController.text.trim();
    if (url.isEmpty) return const SizedBox.shrink();
    final valid = _validateUrl(url) == null;
    return Row(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Container(
            width: 64,
            height: 64,
            color: AppColors.surfaceHigh,
            alignment: Alignment.center,
            child: !valid
                ? const Icon(Icons.broken_image,
                    color: AppColors.muted, size: 22)
                : Image.network(
                    url,
                    fit: BoxFit.cover,
                    loadingBuilder: (context, child, progress) =>
                        progress == null
                            ? child
                            : const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppColors.muted),
                              ),
                    errorBuilder: (_, __, ___) => const Icon(
                        Icons.broken_image,
                        color: AppColors.muted,
                        size: 22),
                  ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            valid ? t('custom.preview') : t('custom.preview_invalid'),
            style: const TextStyle(fontSize: 12, color: AppColors.muted),
          ),
        ),
      ],
    );
  }

  Widget _muscleDropdown() {
    // If the catalogue's muscle list hasn't loaded (offline / first launch),
    // fall back to a plain text input so the user can still describe the
    // target — typed muscle gets normalised to lowercase on save.
    if (widget.muscles.isEmpty) {
      return _textField(
        controller: TextEditingController(text: _muscle ?? ''),
        hint: t('custom.muscle_freeform_hint'),
        validator: null,
      );
    }
    return DropdownButtonFormField<String>(
      initialValue: _muscle,
      isExpanded: true,
      hint: Text(t('custom.muscle_pick'),
          style: const TextStyle(color: AppColors.muted, fontSize: 14)),
      style: const TextStyle(color: AppColors.onSurface, fontSize: 15),
      dropdownColor: AppColors.surfaceLow,
      decoration: InputDecoration(
        filled: false,
        contentPadding:
            const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.outline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.outline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.onSurface),
        ),
      ),
      items: widget.muscles
          .map((m) => DropdownMenuItem(
                value: m,
                child: Text(_titleCase(m)),
              ))
          .toList(),
      onChanged: (v) => setState(() => _muscle = v),
    );
  }
}
