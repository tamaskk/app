import 'dart:math';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/api.dart';
import '../models/api_models.dart';
import '../utils/recent_pr.dart';
import '../utils/text.dart';
import '../i18n/app_strings.dart';

String _fmtTime(DateTime d) =>
    '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';

/// Uppercase brutalist date used in session subtitle: `JUN 5 · 19:38`.
/// Month abbreviation is localized via the shared `month.N` keys.
String _fmtDateTime(DateTime d) =>
    '${t('month.${d.month}')} ${d.day} · ${_fmtTime(d)}';

String _fmtDuration(Duration dur) {
  final hu = AppStrings.instance.isHu;
  final m = dur.inMinutes;
  if (m < 1) return hu ? '${dur.inSeconds} mp' : '${dur.inSeconds}s';
  if (m < 60) return hu ? '$m perc' : '$m min';
  final h = m ~/ 60;
  final rem = m % 60;
  if (rem == 0) return hu ? '$h óra' : '${h}h';
  return hu ? '$hó ${rem}p' : '${h}h ${rem}m';
}

/// Trim a double for display: 139 not 139.0, 7.5 stays 7.5.
String _num(double v) =>
    v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(1);

/// Compact volume for the brutalist UI: 12.4 t over 1 ton, kg below.
/// Decimal separator follows the language (comma for HU, dot for EN).
String _fmtVolume(double kg) {
  if (kg >= 1000) {
    final s = (kg / 1000).toStringAsFixed(1);
    return '${AppStrings.instance.isHu ? s.replaceAll('.', ',') : s} t';
  }
  return '${kg.round()} kg';
}

/// Total volume across the COMPLETED sets in a session. Skipped (unchecked)
/// sets still carry their pre-filled kg×reps, so counting them inflated the
/// reported volume for any workout finished before every set was ticked.
double _sessionVolume(WorkoutSession s) => s.exercises.fold<double>(
    0,
    (a, e) =>
        a +
        e.sets
            .where((x) => x.done)
            .fold<double>(0, (b, x) => b + x.kg * x.reps));

/// Compact wall-clock-style minutes label for stat hero (8h 12m / 47p).
String _fmtMinutesH(int minutes) {
  final hu = AppStrings.instance.isHu;
  if (minutes < 60) return hu ? '${minutes}p' : '${minutes}m';
  final h = minutes ~/ 60;
  final rem = minutes % 60;
  if (rem == 0) return '${h}h';
  return hu ? '${h}h ${rem}p' : '${h}h ${rem}m';
}

/// History filter windows. `null` means "all time".
enum _RangeFilter { mind, het, honap, kilencven, ev }

extension _RangeFilterX on _RangeFilter {
  String get label => switch (this) {
        _RangeFilter.mind => t('progress.range_all'),
        _RangeFilter.het => t('progress.range_week'),
        _RangeFilter.honap => t('progress.range_month'),
        _RangeFilter.kilencven => t('progress.range_90'),
        _RangeFilter.ev => t('progress.range_year'),
      };

  Duration? get window => switch (this) {
        _RangeFilter.mind => null,
        _RangeFilter.het => const Duration(days: 7),
        _RangeFilter.honap => const Duration(days: 30),
        _RangeFilter.kilencven => const Duration(days: 90),
        _RangeFilter.ev => const Duration(days: 365),
      };
}

/// Relative date bucket used for grouping history rows.
String _dateBucket(DateTime d, DateTime now) {
  final today = DateTime(now.year, now.month, now.day);
  final that = DateTime(d.year, d.month, d.day);
  final diffDays = today.difference(that).inDays;
  if (diffDays <= 0) return t('progress.bucket_today');
  if (diffDays == 1) return t('progress.bucket_yesterday');
  // Same ISO week as today (Monday-first) → "THIS WEEK".
  final mondayThisWeek = today.subtract(Duration(days: today.weekday - 1));
  if (!that.isBefore(mondayThisWeek)) return t('progress.bucket_this_week');
  if (d.year == now.year && d.month == now.month) {
    return t('progress.bucket_this_month');
  }
  return t('progress.bucket_earlier');
}

// --- per-exercise history aggregation ---------------------------------------

/// Aggregate stats for the active range filter — feeds the hero panel.
class _StatBucket {
  final int count;
  final double volume;
  final int minutes;
  final int prs;
  const _StatBucket({
    required this.count,
    required this.volume,
    required this.minutes,
    required this.prs,
  });

  factory _StatBucket.fromSessions(
      List<WorkoutSession> sessions, Set<String> prSessionIds) {
    var volume = 0.0;
    var minutes = 0;
    var prs = 0;
    for (final s in sessions) {
      volume += _sessionVolume(s);
      minutes += s.duration?.inMinutes ?? 0;
      if (s.id.isNotEmpty && prSessionIds.contains(s.id)) prs++;
    }
    return _StatBucket(
      count: sessions.length,
      volume: volume,
      minutes: minutes,
      prs: prs,
    );
  }
}

/// Outlined `PR` chip rendered next to session names that contained a PR.
class _PrChip extends StatelessWidget {
  const _PrChip();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.onSurface, width: 1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: const Text(
        'PR',
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.4,
          color: AppColors.onSurface,
          height: 1,
        ),
      ),
    );
  }
}

class SessionPoint {
  final DateTime date;
  final List<SavedSet> sets;
  SessionPoint(this.date, this.sets);
}

class ExerciseHistory {
  final String key;
  final String name;
  final String gifUrl;
  final List<SessionPoint> points; // ascending by date
  ExerciseHistory(this.key, this.name, this.gifUrl, this.points);

  /// Build a history object for a single exercise from a list of sessions.
  /// Matches on exerciseId when present, else case-insensitive name. Returns
  /// null if no matching points were found.
  static ExerciseHistory? forExercise(
      List<WorkoutSession> sessions, String exerciseId, String exerciseName) {
    final points = <SessionPoint>[];
    String? gif;
    final wantedKey =
        exerciseId.isNotEmpty ? exerciseId : exerciseName.toLowerCase();
    for (final s in sessions) {
      final date = s.finishedAt ?? s.startedAt;
      if (date == null) continue;
      for (final ex in s.exercises) {
        final exKey =
            ex.exerciseId.isNotEmpty ? ex.exerciseId : ex.name.toLowerCase();
        if (exKey != wantedKey) continue;
        gif ??= ex.gifUrl;
        points.add(SessionPoint(date, ex.sets));
      }
    }
    if (points.isEmpty) return null;
    points.sort((a, b) => a.date.compareTo(b.date));
    return ExerciseHistory(wantedKey, exerciseName, gif ?? '', points);
  }
}

const _metrics = ['1RM', 'Max Weight', 'Volume', 'Total Reps'];

double _metricValue(String metric, List<SavedSet> sets) {
  // Only completed sets count — an unchecked planned set carries pre-filled
  // (or auto-progression) kg×reps that was never actually lifted, which would
  // otherwise spike Max Weight / 1RM to a weight the user never hit and inflate
  // Volume / Total Reps. Matches the PR badge, which already filters on done.
  final done = sets.where((s) => s.done);
  switch (metric) {
    case 'Max Weight':
      return done.fold(0.0, (a, s) => max(a, s.kg));
    case 'Volume':
      return done.fold(0.0, (a, s) => a + s.kg * s.reps);
    case 'Total Reps':
      return done.fold(0.0, (a, s) => a + s.reps);
    case '1RM':
    default:
      // Epley estimate; best set wins.
      return done.fold(0.0, (a, s) => max(a, s.kg * (1 + s.reps / 30.0)));
  }
}

String _metricUnit(String metric) => metric == 'Total Reps' ? '' : 'kg';

/// Localized display label for a metric. The internal metric strings stay in
/// English so the calculation switches keep working.
String _metricLabel(String metric) => switch (metric) {
      'Max Weight' => t('progress.metric_max_weight'),
      'Volume' => t('progress.metric_volume'),
      'Total Reps' => t('progress.metric_total_reps'),
      _ => t('progress.metric_1rm'),
    };

class ProgressScreen extends StatefulWidget {
  const ProgressScreen({super.key});

  @override
  State<ProgressScreen> createState() => _ProgressScreenState();
}

class _ProgressScreenState extends State<ProgressScreen> {
  final _api = Api();
  bool _loading = true;
  String? _error;
  List<WorkoutSession> _sessions = [];
  // Sessions sorted newest-first — what the history list renders.
  List<WorkoutSession> _historySorted = [];
  // Session ids that contained at least one PR. Computed once per load so the
  // badge logic is O(1) per row.
  Set<String> _prSessionIds = {};
  List<ExerciseHistory> _groups = [];
  int _tab = 0; // 0 = history, 1 = exercises
  _RangeFilter _range = _RangeFilter.honap;

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
      final sessions = await _api.getSessions();
      if (mounted) {
        // History list is newest-first; the per-exercise grouping still walks
        // oldest→newest internally for running max calculations.
        final sortedDesc = [...sessions]..sort((a, b) {
            final da = a.finishedAt ?? a.startedAt;
            final db = b.finishedAt ?? b.startedAt;
            if (da == null && db == null) return 0;
            if (da == null) return 1;
            if (db == null) return -1;
            return db.compareTo(da);
          });
        setState(() {
          _sessions = sessions;
          _historySorted = sortedDesc;
          _prSessionIds = sessionsWithPr(sessions);
          _groups = _buildGroups(sessions);
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = t('auth.server_unreachable'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<ExerciseHistory> _buildGroups(List<WorkoutSession> sessions) {
    final map = <String, ExerciseHistory>{};
    final dated = sessions
        .where((s) => (s.finishedAt ?? s.startedAt) != null)
        .toList()
      ..sort((a, b) => (a.finishedAt ?? a.startedAt!)
          .compareTo(b.finishedAt ?? b.startedAt!));
    for (final s in dated) {
      final date = s.finishedAt ?? s.startedAt!;
      for (final ex in s.exercises) {
        final key =
            ex.exerciseId.isNotEmpty ? ex.exerciseId : ex.name.toLowerCase();
        final h = map.putIfAbsent(
            key, () => ExerciseHistory(key, ex.name, ex.gifUrl, []));
        h.points.add(SessionPoint(date, ex.sets));
      }
    }
    return map.values.toList()..sort((a, b) => a.name.compareTo(b.name));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // Brand header, consistent with every other tab. The big "FEJLŐDÉS"
      // section title still lives in the body below.
      appBar: AppBar(title: const Text('HEFTOR')),
      // Stretch so the body-level title sits flush left like every other
      // screen — without this, Column's default `center` cross-alignment
      // wraps the intrinsic-width Padding and visually centres the title.
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _titleHeader(),
          _tabBar(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              child: _tab == 0 ? _historyList() : _exercisesList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _titleHeader() {
    // All-time aggregate used as a brutalist subtitle under the title.
    final totalVolume =
        _sessions.fold<double>(0, (a, s) => a + _sessionVolume(s));
    final subtitle = _sessions.isEmpty
        ? null
        : tFmt('progress.subtitle', {
            'n': _sessions.length,
            'vol': _fmtVolume(totalVolume).toUpperCase(),
          });
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t('progress.title').toUpperCase(),
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w800,
              letterSpacing: -1,
              color: AppColors.onSurface,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: const TextStyle(
                fontSize: 12,
                letterSpacing: 1.2,
                color: AppColors.muted,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _tabBar() {
    Widget tab(int i, String label) {
      final active = _tab == i;
      return GestureDetector(
        onTap: () => setState(() => _tab = i),
        behavior: HitTestBehavior.opaque,
        child: Padding(
          // Wider gap between tabs reads more like distinct sections than
          // crowded chips.
          padding: const EdgeInsets.only(right: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(label,
                  style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: active ? AppColors.onSurface : AppColors.muted)),
              const SizedBox(height: 6),
              Container(
                  width: 5,
                  height: 5,
                  decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color:
                          active ? AppColors.onSurface : Colors.transparent)),
            ],
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
      child: Row(children: [
        tab(0, t('progress.tab_history')),
        tab(1, t('progress.tab_exercises')),
      ]),
    );
  }

  /// Sessions filtered by the active time range, newest-first.
  List<WorkoutSession> _filteredSessions() {
    final window = _range.window;
    if (window == null) return _historySorted;
    final cutoff = DateTime.now().subtract(window);
    return _historySorted.where((s) {
      final d = s.finishedAt ?? s.startedAt;
      return d != null && d.isAfter(cutoff);
    }).toList();
  }

  // --- HISTORY tab ----------------------------------------------------------

  Widget _historyList() {
    if (_loading && _sessions.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null && _sessions.isEmpty) {
      return _message(Icons.cloud_off, _error!, t('common.retry'), _load);
    }
    if (_sessions.isEmpty) {
      return _message(
        Icons.history,
        t('progress.empty_history_title'),
        null,
        null,
        subtitle: t('progress.empty_history_subtitle'),
      );
    }
    final filtered = _filteredSessions();
    final stats = _StatBucket.fromSessions(filtered, _prSessionIds);
    final grouped = _groupSessionsByBucket(filtered);
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      // Range chips + stat hero + date-bucketed list (header + N session rows).
      itemCount: 2 + grouped.length + filtered.length,
      itemBuilder: (context, i) {
        if (i == 0) return _rangeFilterStrip();
        if (i == 1) return _statHero(stats);
        // After the two hero rows, walk through the buckets in order.
        var idx = i - 2;
        for (final entry in grouped.entries) {
          if (idx == 0) return _bucketHeader(entry.key);
          idx -= 1;
          if (idx < entry.value.length) {
            return _sessionRow(entry.value[idx], idx == 0);
          }
          idx -= entry.value.length;
        }
        return const SizedBox.shrink();
      },
    );
  }

  Widget _rangeFilterStrip() {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.zero,
        itemCount: _RangeFilter.values.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final r = _RangeFilter.values[i];
          final active = _range == r;
          // Center each pill within the 44 px strip. ListView lays children
          // out at the cross-axis start, which pinned the chips to the top
          // of the band and made the text look "not in the middle".
          return Center(
            child: GestureDetector(
              onTap: () => setState(() => _range = r),
              behavior: HitTestBehavior.opaque,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 140),
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: active ? AppColors.primary : AppColors.surfaceLow,
                  borderRadius: BorderRadius.circular(100),
                ),
                child: Text(
                  r.label,
                  textAlign: TextAlign.center,
                  // Drop the trailing letter-space so the visible glyphs
                  // sit dead-centre in the pill — Flutter doesn't strip
                  // letterSpacing on the last character by default.
                  style: TextStyle(
                    fontSize: 12,
                    letterSpacing: 1.2,
                    height: 1,
                    fontWeight: FontWeight.w800,
                    color: active
                        ? AppColors.background
                        : AppColors.onSurface,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _statHero(_StatBucket s) {
    return Padding(
      padding: const EdgeInsets.only(top: 16, bottom: 8),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            _heroStat('${s.count}', t('progress.stat_workouts')),
            _heroStat(_fmtVolume(s.volume), t('progress.stat_lifted'),
                compact: true),
            _heroStat(_fmtMinutesH(s.minutes), t('progress.stat_active_time')),
            _heroStat('${s.prs}', 'PR'),
          ],
        ),
      ),
    );
  }

  Widget _heroStat(String value, String label, {bool compact = false}) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: compact ? 22 : 26,
              fontWeight: FontWeight.w800,
              letterSpacing: -1,
              color: AppColors.onSurface,
              height: 1,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              letterSpacing: 1.4,
              fontWeight: FontWeight.w700,
              color: AppColors.muted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _bucketHeader(String label) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 20, 0, 4),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 11,
          letterSpacing: 1.6,
          fontWeight: FontWeight.w800,
          color: AppColors.muted,
        ),
      ),
    );
  }

  Widget _sessionRow(WorkoutSession s, bool first) {
    final isPr = s.id.isNotEmpty && _prSessionIds.contains(s.id);
    return GestureDetector(
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => SessionDetailScreen(session: s),
        ),
      ),
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          border: first
              ? null
              : const Border(top: BorderSide(color: AppColors.outline)),
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
                        child: Text(
                          titleCase(s.name.isEmpty
                              ? t('dashboard.workout_default')
                              : s.name),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5,
                            color: AppColors.onSurface,
                          ),
                        ),
                      ),
                      if (isPr) ...[
                        const SizedBox(width: 8),
                        const _PrChip(),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _subtitle(s),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      letterSpacing: 0.5,
                      color: AppColors.muted,
                    ),
                  ),
                ],
              ),
            ),
            Text(
              '${s.doneSets}/${s.totalSets}',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.onSurface,
              ),
            ),
            // Wider tap area on the chevron — the whole row is tappable but
            // the chevron is the visual affordance.
            const Padding(
              padding: EdgeInsets.only(left: 4, right: 0),
              child: Icon(Icons.chevron_right,
                  color: AppColors.muted, size: 22),
            ),
          ],
        ),
      ),
    );
  }

  String _subtitle(WorkoutSession s) {
    final parts = <String>[];
    if (s.finishedAt != null) parts.add(_fmtDateTime(s.finishedAt!));
    final d = s.duration;
    if (d != null) parts.add(_fmtDuration(d));
    parts.add(tFmt('progress.n_exercises', {'n': s.exercises.length}));
    final vol = _sessionVolume(s);
    if (vol > 0) parts.add(_fmtVolume(vol).toUpperCase());
    return parts.join(' · ').toUpperCase();
  }

  /// Walk the filtered list and group by relative-date bucket. Preserves
  /// chronological order (newest-first) within and across buckets.
  Map<String, List<WorkoutSession>> _groupSessionsByBucket(
      List<WorkoutSession> sessions) {
    final now = DateTime.now();
    final out = <String, List<WorkoutSession>>{};
    for (final s in sessions) {
      final d = s.finishedAt ?? s.startedAt;
      if (d == null) continue;
      final bucket = _dateBucket(d, now);
      out.putIfAbsent(bucket, () => []).add(s);
    }
    return out;
  }

  // --- EXERCISES tab --------------------------------------------------------

  Widget _exercisesList() {
    if (_loading && _groups.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null && _groups.isEmpty) {
      return _message(Icons.cloud_off, _error!, t('common.retry'), _load);
    }
    if (_groups.isEmpty) {
      return _message(
          Icons.show_chart, t('progress.empty_exercises_title'), null, null,
          subtitle: t('progress.empty_exercises_subtitle'));
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      itemCount: _groups.length,
      itemBuilder: (context, i) {
        final g = _groups[i];
        final latest = g.points.isNotEmpty
            ? _metricValue('Max Weight', g.points.last.sets)
            : 0.0;
        return GestureDetector(
          onTap: () => Navigator.of(context).push(MaterialPageRoute(
              builder: (_) => ExerciseProgressScreen(history: g))),
          behavior: HitTestBehavior.opaque,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(
              border: i == 0
                  ? null
                  : const Border(top: BorderSide(color: AppColors.outline)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(titleCase(g.name),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppColors.onSurface)),
                      const SizedBox(height: 4),
                      Text(
                          tFmt('progress.n_sessions',
                              {'n': g.points.length}),
                          style: const TextStyle(
                              fontSize: 13, color: AppColors.muted)),
                    ],
                  ),
                ),
                if (latest > 0) ...[
                  Text('${_num(latest)} kg',
                      style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.onSurface)),
                  const SizedBox(width: 4),
                ],
                const Icon(Icons.chevron_right,
                    color: AppColors.muted, size: 20),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _message(IconData icon, String title, String? action,
      VoidCallback? onAction,
      {String? subtitle}) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      children: [
        const SizedBox(height: 120),
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
        if (action != null && onAction != null) ...[
          const SizedBox(height: 24),
          Center(
            child: TextButton(
              style: TextButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.background,
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(100)),
              ),
              onPressed: onAction,
              child: Text(action,
                  style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ],
    );
  }
}

// --- per-exercise progression chart screen ----------------------------------

class ExerciseProgressScreen extends StatefulWidget {
  final ExerciseHistory history;
  const ExerciseProgressScreen({super.key, required this.history});

  @override
  State<ExerciseProgressScreen> createState() =>
      _ExerciseProgressScreenState();
}

class _ExerciseProgressScreenState extends State<ExerciseProgressScreen> {
  String _metric = '1RM';
  String _range = 'All';

  static const _ranges = {
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
    'All': 0,
  };

  List<SessionPoint> get _filtered {
    final days = _ranges[_range] ?? 0;
    if (days == 0) return widget.history.points;
    final cutoff = DateTime.now().subtract(Duration(days: days));
    final f =
        widget.history.points.where((p) => p.date.isAfter(cutoff)).toList();
    return f.isEmpty ? widget.history.points : f;
  }

  @override
  Widget build(BuildContext context) {
    final points = _filtered;
    final values = points.map((p) => _metricValue(_metric, p.sets)).toList();
    final unit = _metricUnit(_metric);
    final current = values.isNotEmpty ? values.last : 0.0;
    final pct = (values.length >= 2 && values.first > 0)
        ? (values.last - values.first) / values.first * 100
        : null;

    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(color: AppColors.onSurface),
        title: Text(titleCase(widget.history.name)),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          // Current value + trend.
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(_num(current),
                  style: const TextStyle(
                      fontSize: 44,
                      fontWeight: FontWeight.w800,
                      height: 1,
                      color: AppColors.onSurface)),
              if (unit.isNotEmpty) ...[
                const SizedBox(width: 6),
                const Padding(
                  padding: EdgeInsets.only(bottom: 6),
                  child: Text('kg',
                      style: TextStyle(fontSize: 18, color: AppColors.muted)),
                ),
              ],
              const Spacer(),
              if (pct != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      Icon(pct >= 0 ? Icons.arrow_upward : Icons.arrow_downward,
                          size: 16, color: AppColors.onSurface),
                      const SizedBox(width: 2),
                      Text('${pct.abs().toStringAsFixed(1)} %',
                          style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.onSurface)),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),

          // Metric tabs.
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _metrics.map((m) {
                final active = m == _metric;
                return GestureDetector(
                  onTap: () => setState(() => _metric = m),
                  behavior: HitTestBehavior.opaque,
                  child: Padding(
                    padding: const EdgeInsets.only(right: 22),
                    child: Column(
                      children: [
                        Text(_metricLabel(m),
                            style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: active
                                    ? AppColors.onSurface
                                    : AppColors.muted)),
                        const SizedBox(height: 4),
                        if (active)
                          Container(
                              height: 2, width: 36, color: AppColors.onSurface),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 24),

          // Chart.
          SizedBox(
            height: 180,
            child: values.length < 2
                ? Center(
                    child: Text(t('progress.chart_need_two'),
                        style: const TextStyle(color: AppColors.muted)))
                : CustomPaint(
                    size: const Size(double.infinity, 180),
                    painter: _LinePainter(values),
                  ),
          ),
          const SizedBox(height: 16),

          // Time range.
          Row(
            children: _ranges.keys.map((r) {
              final active = r == _range;
              return GestureDetector(
                onTap: () => setState(() => _range = r),
                behavior: HitTestBehavior.opaque,
                child: Container(
                  margin: const EdgeInsets.only(right: 8),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: active ? AppColors.primary : Colors.transparent,
                    borderRadius: BorderRadius.circular(100),
                    border: active ? null : Border.all(color: AppColors.outline),
                  ),
                  child: Text(r,
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: active
                              ? AppColors.background
                              : AppColors.muted)),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class _LinePainter extends CustomPainter {
  final List<double> values;
  _LinePainter(this.values);

  @override
  void paint(Canvas canvas, Size size) {
    if (values.length < 2) return;
    var lo = values.reduce(min);
    var hi = values.reduce(max);
    if (hi == lo) {
      hi += 1;
      lo -= 1;
    } else {
      final pad = (hi - lo) * 0.15;
      hi += pad;
      lo -= pad;
    }
    const rightPad = 44.0, topPad = 10.0, bottomPad = 10.0;
    final chartW = size.width - rightPad;
    final chartH = size.height - topPad - bottomPad;
    double xAt(int i) => (i / (values.length - 1)) * chartW;
    double yAt(double v) => topPad + (1 - (v - lo) / (hi - lo)) * chartH;

    final grid = Paint()
      ..color = AppColors.outline
      ..strokeWidth = 1;
    for (int g = 0; g < 4; g++) {
      final t = g / 3;
      final yy = topPad + t * chartH;
      canvas.drawLine(Offset(0, yy), Offset(chartW, yy), grid);
      final val = hi - t * (hi - lo);
      final tp = TextPainter(
        text: TextSpan(
            text: _num(val),
            style: const TextStyle(color: AppColors.muted, fontSize: 11)),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset(chartW + 8, yy - tp.height / 2));
    }

    final line = Paint()
      ..color = AppColors.onSurface
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final path = Path();
    for (int i = 0; i < values.length; i++) {
      final p = Offset(xAt(i), yAt(values[i]));
      i == 0 ? path.moveTo(p.dx, p.dy) : path.lineTo(p.dx, p.dy);
    }
    canvas.drawPath(path, line);

    final dot = Paint()..color = AppColors.onSurface;
    for (int i = 0; i < values.length; i++) {
      canvas.drawCircle(Offset(xAt(i), yAt(values[i])), 3, dot);
    }
  }

  @override
  bool shouldRepaint(_LinePainter old) => old.values != values;
}

/// Full breakdown of one past workout: times + every set with its check state.
/// Public so external screens (the calendar day-sheet) can navigate here.
class SessionDetailScreen extends StatelessWidget {
  final WorkoutSession session;
  const SessionDetailScreen({super.key, required this.session});

  @override
  Widget build(BuildContext context) {
    final started = session.startedAt;
    final finished = session.finishedAt;
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(color: AppColors.onSurface),
        title: Text(titleCase(session.name.isEmpty
            ? t('dashboard.workout_default')
            : session.name)),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          Row(
            children: [
              _stat(
                  t('progress.detail_done'),
                  tFmt('progress.detail_sets_value', {
                    'done': session.doneSets,
                    'total': session.totalSets,
                  })),
              if (session.duration != null)
                _stat(t('progress.detail_time'),
                    _fmtDuration(session.duration!)),
            ],
          ),
          const SizedBox(height: 8),
          if (started != null)
            Text(tFmt('progress.detail_started', {'time': _fmtDateTime(started)}),
                style: const TextStyle(color: AppColors.muted, fontSize: 13)),
          if (finished != null)
            Text(
                tFmt('progress.detail_finished',
                    {'time': _fmtDateTime(finished)}),
                style: const TextStyle(color: AppColors.muted, fontSize: 13)),
          const SizedBox(height: 16),
          ...session.exercises.map(_exerciseBlock),
        ],
      ),
    );
  }

  Widget _stat(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(right: 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value,
              style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: AppColors.onSurface)),
          Text(label,
              style: const TextStyle(color: AppColors.muted, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _exerciseBlock(SavedExercise ex) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: AppColors.outline)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(titleCase(ex.name),
              style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface)),
          const SizedBox(height: 8),
          ...ex.sets.asMap().entries.map((e) {
            final s = e.value;
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  SizedBox(
                    width: 24,
                    child: Text('${e.key + 1}',
                        style: const TextStyle(
                            color: AppColors.muted,
                            fontWeight: FontWeight.w700)),
                  ),
                  Expanded(
                    child: Text(s.kg > 0 ? '${_num(s.kg)} kg' : 'BW',
                        style: const TextStyle(
                            color: AppColors.onSurface,
                            fontSize: 15,
                            fontWeight: FontWeight.w600)),
                  ),
                  Expanded(
                    child: Text('${s.reps} ${t('common.reps')}',
                        style: const TextStyle(
                            color: AppColors.onSurface,
                            fontSize: 15,
                            fontWeight: FontWeight.w600)),
                  ),
                  Icon(
                    s.done ? Icons.check_circle : Icons.radio_button_unchecked,
                    color: s.done ? AppColors.onSurface : AppColors.outline,
                    size: 20,
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}
