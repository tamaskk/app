import 'dart:math';
import 'package:flutter/material.dart';
import '../models/rank.dart';
import '../theme/app_theme.dart';
import '../services/api.dart';
import '../models/api_models.dart';
import '../utils/text.dart';
import '../utils/exercise_labels.dart';
import '../widgets/rank_up_overlay.dart';
import '../i18n/app_strings.dart';

/// Localized 3-letter month abbreviation for a 1-based month number.
String _monthAbbr(int month) => t('summary.month_$month');

String _fmtDate(DateTime d) => '${_monthAbbr(d.month)}. ${d.day}.';

String _fmtDur(Duration d) {
  final h = d.inHours;
  final m = d.inMinutes % 60;
  return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';
}

/// Best estimated 1RM across an exercise's sets (Epley). 0 for bodyweight.
double _best1rm(List<SavedSet> sets) =>
    sets.fold(0.0, (a, s) => max(a, s.kg * (1 + s.reps / 30.0)));

String _exKey(SavedExercise e) =>
    e.exerciseId.isNotEmpty ? e.exerciseId : e.name.toLowerCase();

/// Shown right after Finish: the session's stats and each exercise's change
/// vs. the previous time it was performed.
class WorkoutSummaryScreen extends StatefulWidget {
  final WorkoutSession session;
  // Optional XP delta returned by /api/sessions POST. When `unlocked` we push
  // the full-screen RankUpOverlay after the first frame so the user can't miss
  // the celebration.
  final RankDelta? rankDelta;
  const WorkoutSummaryScreen({
    super.key,
    required this.session,
    this.rankDelta,
  });

  @override
  State<WorkoutSummaryScreen> createState() => _WorkoutSummaryScreenState();
}

class _WorkoutSummaryScreenState extends State<WorkoutSummaryScreen> {
  final _api = Api();
  Map<String, double> _prev = {}; // exercise key -> previous 1RM

  @override
  void initState() {
    super.initState();
    _loadPrevious();
    _maybeShowRankUp();
  }

  void _maybeShowRankUp() {
    final delta = widget.rankDelta;
    if (delta == null || !delta.unlocked) return;
    // Defer to the next frame so the summary screen is mounted underneath
    // and the user sees it after dismissing the overlay.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      RankUpOverlay.show(
        context,
        previousRank: rankForTier(delta.previousRank),
        newRank: rankForTier(delta.newRank),
        xpAwarded: delta.xpAwarded,
      );
    });
  }

  @override
  void dispose() {
    _api.dispose();
    super.dispose();
  }

  Future<void> _loadPrevious() async {
    try {
      final all = await _api.getSessions();
      all.sort((a, b) {
        final ad = a.finishedAt ?? a.startedAt;
        final bd = b.finishedAt ?? b.startedAt;
        if (ad == null || bd == null) return 0;
        return bd.compareTo(ad); // newest first
      });
      final prev = <String, double>{};
      for (final ex in widget.session.exercises) {
        final key = _exKey(ex);
        for (final s in all) {
          if (s.id == widget.session.id) continue;
          final match =
              s.exercises.where((e) => _exKey(e) == key).cast<SavedExercise?>();
          final found = match.isEmpty ? null : match.first;
          if (found != null) {
            prev[key] = _best1rm(found.sets);
            break; // most recent prior occurrence
          }
        }
      }
      if (mounted) setState(() => _prev = prev);
    } catch (_) {
      // No comparison data; show the summary without deltas.
    }
  }

  int get _totalReps => widget.session.exercises
      .fold(0, (a, e) => a + e.sets.fold(0, (b, s) => b + s.reps));

  List<String> get _muscles {
    final set = <String>{};
    for (final e in widget.session.exercises) {
      set.addAll(e.targetMuscles);
    }
    return set.toList();
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.session;
    final date = s.finishedAt ?? s.startedAt;
    return Scaffold(
      appBar: AppBar(leading: const BackButton(color: AppColors.onSurface)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
        children: [
          // Muscle chips.
          if (_muscles.isNotEmpty)
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: _muscles
                  .map((m) => Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(100),
                          border: Border.all(color: AppColors.outline),
                        ),
                        child: Text(titleCase(m),
                            style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.onSurface)),
                      ))
                  .toList(),
            ),
          const SizedBox(height: 16),
          if (date != null)
            Center(
              child: Text(_fmtDate(date),
                  style: const TextStyle(color: AppColors.muted, fontSize: 16)),
            ),
          const SizedBox(height: 4),
          Center(
            child: Text(titleCase(s.name.isEmpty ? t('summary.workout') : s.name),
                style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -1,
                    color: AppColors.onSurface)),
          ),
          const SizedBox(height: 28),

          // Stats.
          Row(
            children: [
              Expanded(
                  child: _stat('Duration',
                      s.duration != null ? _fmtDur(s.duration!) : '–')),
              Expanded(child: _stat('Sets', '${s.totalSets}')),
              Expanded(child: _stat('Reps', '$_totalReps')),
            ],
          ),
          const SizedBox(height: 24),

          ...widget.session.exercises.map(_exerciseRow),
        ],
      ),
    );
  }

  Widget _stat(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: AppColors.muted, fontSize: 12)),
        const SizedBox(height: 4),
        Text(value,
            style: const TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w800,
                color: AppColors.onSurface)),
      ],
    );
  }

  Widget _exerciseRow(SavedExercise ex) {
    final current = _best1rm(ex.sets);
    final prev = _prev[_exKey(ex)];
    final pct = (prev != null && prev > 0 && current > 0)
        ? (current - prev) / prev * 100
        : null;
    final subtitleParts = <String>[];
    if (ex.targetMuscles.isNotEmpty) {
      subtitleParts.add(titleCase(exLabel(ex.targetMuscles.first)));
    }
    subtitleParts.add('${ex.sets.length} set');

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: AppColors.outline)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(titleCase(ex.name),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: AppColors.onSurface)),
                    ),
                    if (pct != null) ...[
                      const SizedBox(width: 8),
                      Icon(
                          pct >= 0
                              ? Icons.arrow_upward
                              : Icons.arrow_downward,
                          size: 13,
                          color: pct >= 0
                              ? AppColors.accentGreen
                              : AppColors.accentRed),
                      Text('${pct.abs().toStringAsFixed(2)} %',
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: pct >= 0
                                  ? AppColors.accentGreen
                                  : AppColors.accentRed)),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(subtitleParts.join(' · '),
                    style:
                        const TextStyle(color: AppColors.muted, fontSize: 13)),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: AppColors.muted, size: 20),
        ],
      ),
    );
  }
}
