import 'package:flutter/material.dart';
import '../i18n/app_strings.dart';
import '../theme/app_theme.dart';
import '../services/api.dart';
import '../services/auth_service.dart';
import '../models/api_models.dart';
import '../utils/insights.dart';
import '../utils/streak.dart';
import '../utils/text.dart';
import '../widgets/muscle_heatmap.dart';
import '../widgets/yearly_heatmap.dart';
import 'progress_screen.dart';

const _monthKeys = [
  'calendar.month_january',
  'calendar.month_february',
  'calendar.month_march',
  'calendar.month_april',
  'calendar.month_may',
  'calendar.month_june',
  'calendar.month_july',
  'calendar.month_august',
  'calendar.month_september',
  'calendar.month_october',
  'calendar.month_november',
  'calendar.month_december',
];

String _monthName(int month1Based) => t(_monthKeys[month1Based - 1]);

int _dayKey(DateTime d) =>
    DateTime(d.year, d.month, d.day).millisecondsSinceEpoch;

String _fmtVolume(double kg) => kg >= 1000
    ? (kg / 1000).toStringAsFixed(1).replaceAll('.', ',')
    : kg.round().toString();

String _volumeUnit(double kg) => kg >= 1000 ? 't' : 'kg';

/// `Naptár` — overview of sessions over time, anchored by a streak card,
/// a weekly progress bar and a month grid the user can browse.
class CalendarScreen extends StatefulWidget {
  final AuthService? auth;

  const CalendarScreen({super.key, this.auth});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  final _api = Api();
  bool _loading = true;
  List<WorkoutSession> _sessions = [];
  DateTime _monthRef = DateTime(DateTime.now().year, DateTime.now().month, 1);
  DateTime? _selectedDay;

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
    setState(() => _loading = true);
    try {
      final s = await _api.getSessions();
      if (!mounted) return;
      setState(() {
        _sessions = s;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Sessions logged on the given date (compared by year/month/day only).
  List<WorkoutSession> _sessionsOn(DateTime d) =>
      _sessions.where((s) {
        final w = s.finishedAt ?? s.startedAt;
        if (w == null) return false;
        return _dayKey(w) == _dayKey(d);
      }).toList();

  /// Dates with at least one completed session — input for the streak
  /// helpers.
  List<DateTime> get _workoutDates {
    final out = <DateTime>[];
    for (final s in _sessions) {
      final w = s.finishedAt ?? s.startedAt;
      if (w != null) out.add(DateTime(w.year, w.month, w.day));
    }
    return out;
  }

  int get _streak => weeklyStreak(_workoutDates);
  int get _bestStreak => allTimeBestStreak(_workoutDates);
  int get _weeklyDone => weeklyDoneCount(_workoutDates);

  /// Pull weekly goal from onboarding; fall back to a reasonable default.
  int get _weeklyGoal {
    final d = widget.auth?.user?.onboarding?.daysPerWeek;
    if (d != null && d > 0) return d;
    return 3;
  }

  /// Number of sessions in the current month that registered a new
  /// all-time-best e1RM on any exercise. Walks sessions chronologically
  /// and counts the ones whose date is in the current month.
  int get _prsThisMonth {
    final sorted = [..._sessions]..sort((a, b) {
        final da = a.finishedAt ?? a.startedAt;
        final db = b.finishedAt ?? b.startedAt;
        if (da == null && db == null) return 0;
        if (da == null) return -1;
        if (db == null) return 1;
        return da.compareTo(db);
      });
    final allTimeMax = <String, double>{};
    final now = DateTime.now();
    var prs = 0;
    for (final s in sorted) {
      final when = s.finishedAt ?? s.startedAt;
      if (when == null) continue;
      var sessionHadPr = false;
      for (final ex in s.exercises) {
        if (ex.exerciseId.isEmpty || ex.sets.isEmpty) continue;
        for (final set in ex.sets) {
          if (set.reps <= 0 || set.kg <= 0) continue;
          // Epley e1RM.
          final e1rm = set.kg * (1 + set.reps / 30.0);
          final prev = allTimeMax[ex.exerciseId] ?? 0;
          if (e1rm > prev + 0.5) {
            allTimeMax[ex.exerciseId] = e1rm;
            sessionHadPr = true;
          }
        }
      }
      if (sessionHadPr &&
          when.year == now.year &&
          when.month == now.month) {
        prs++;
      }
    }
    return prs;
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    return Scaffold(
      // Brand header, consistent with every other tab. The big "NAPTÁR"
      // section title still lives in the body below.
      appBar: AppBar(title: const Text('HEFTOR')),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                  children: [
                    Text(
                      t('calendar.title_caps'),
                      style: const TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -1,
                        color: AppColors.onSurface,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      tFmt('calendar.summary_caps', {
                        'sessions': _sessions.length,
                        'streak': _bestStreak,
                        'pr': _prsThisMonth,
                      }),
                      style: const TextStyle(
                        fontSize: 12,
                        letterSpacing: 1.2,
                        color: AppColors.muted,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 20),
                    _streakHero(),
                    const SizedBox(height: 12),
                    _weekProgress(),
                    const SizedBox(height: 20),
                    _monthCard(),
                    if (_selectedDay != null) ...[
                      const SizedBox(height: 16),
                      _dayDetailCard(_selectedDay!),
                    ],
                    const SizedBox(height: 24),
                    _monthSection(now),
                    const SizedBox(height: 24),
                    _muscleSection(),
                    const SizedBox(height: 24),
                    _insightsSection(),
                    const SizedBox(height: 24),
                    _yearlySection(now),
                  ],
                ),
              ),
      ),
    );
  }

  // ---------------------------------------------------------------------
  // Streak hero
  // ---------------------------------------------------------------------

  Widget _streakHero() {
    final status = streakStatus(_workoutDates);
    String? hint;
    switch (status) {
      case StreakStatus.safe:
        if (_streak >= _bestStreak && _streak > 0) {
          hint = t('calendar.alltime_record_caps');
        }
        break;
      case StreakStatus.atRisk:
        hint = t('calendar.streak_at_risk');
        break;
      case StreakStatus.pending:
        hint = t('calendar.week_still_open');
        break;
      case StreakStatus.broken:
        if (_streak == 0) hint = t('calendar.start_streak_again');
        break;
    }
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceLow,
        borderRadius: BorderRadius.circular(20),
      ),
      padding: const EdgeInsets.symmetric(vertical: 22, horizontal: 18),
      child: Column(
        children: [
          Text(
            '$_streak',
            style: const TextStyle(
              fontSize: 72,
              fontWeight: FontWeight.w800,
              letterSpacing: -3,
              color: AppColors.onSurface,
              height: 1,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            t('calendar.streak_hint_caps'),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 11,
              letterSpacing: 1.5,
              color: AppColors.muted,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (hint != null) ...[
            const SizedBox(height: 14),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.onSurface),
                borderRadius: BorderRadius.circular(100),
              ),
              child: Text(
                hint,
                style: const TextStyle(
                  fontSize: 11,
                  letterSpacing: 1.5,
                  fontWeight: FontWeight.w800,
                  color: AppColors.onSurface,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------
  // Week progress
  // ---------------------------------------------------------------------

  Widget _weekProgress() {
    final progress =
        _weeklyGoal == 0 ? 0.0 : (_weeklyDone / _weeklyGoal).clamp(0.0, 1.0);
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceLow,
        borderRadius: BorderRadius.circular(20),
      ),
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  t('calendar.this_week'),
                  style: const TextStyle(
                    fontSize: 11,
                    letterSpacing: 1.5,
                    fontWeight: FontWeight.w800,
                    color: AppColors.muted,
                  ),
                ),
              ),
              Text(
                '$_weeklyDone/$_weeklyGoal',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: AppColors.onSurface,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(100),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: AppColors.surfaceHigh,
              valueColor: const AlwaysStoppedAnimation(AppColors.onSurface),
            ),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------
  // Month card (grid)
  // ---------------------------------------------------------------------

  Widget _monthCard() {
    final ref = _monthRef;
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceLow,
        borderRadius: BorderRadius.circular(20),
      ),
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(right: 10),
                decoration: const BoxDecoration(
                  color: AppColors.onSurface,
                  shape: BoxShape.circle,
                ),
              ),
              Expanded(
                child: Text(
                  '${_monthName(ref.month)} ${ref.year}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.5,
                    color: AppColors.onSurface,
                  ),
                ),
              ),
              IconButton(
                onPressed: () => setState(() {
                  _monthRef =
                      DateTime(ref.year, ref.month - 1, 1);
                  _selectedDay = null;
                }),
                icon: const Icon(Icons.chevron_left,
                    color: AppColors.muted),
                visualDensity: VisualDensity.compact,
              ),
              IconButton(
                onPressed: () => setState(() {
                  _monthRef =
                      DateTime(ref.year, ref.month + 1, 1);
                  _selectedDay = null;
                }),
                icon: const Icon(Icons.chevron_right,
                    color: AppColors.muted),
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
          const SizedBox(height: 14),
          _monthGrid(ref),
        ],
      ),
    );
  }

  Widget _monthGrid(DateTime ref) {
    final firstWeekday = DateTime(ref.year, ref.month, 1).weekday; // 1..7
    final daysInMonth = DateTime(ref.year, ref.month + 1, 0).day;
    final cells = <Widget>[];
    final headers = [
      t('plan.day_short_h'),
      t('plan.day_short_k'),
      t('plan.day_short_sze'),
      t('plan.day_short_cs'),
      t('plan.day_short_p'),
      t('plan.day_short_szo'),
      t('plan.day_short_v'),
    ];
    return Column(
      children: [
        Row(
          children: [
            for (final h in headers)
              Expanded(
                child: Center(
                  child: Text(
                    h,
                    style: const TextStyle(
                      fontSize: 10,
                      letterSpacing: 1.4,
                      fontWeight: FontWeight.w700,
                      color: AppColors.muted,
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        ..._buildWeekRows(ref, firstWeekday, daysInMonth, cells),
      ],
    );
  }

  List<Widget> _buildWeekRows(
    DateTime ref,
    int firstWeekday,
    int daysInMonth,
    List<Widget> _,
  ) {
    final rows = <Widget>[];
    final today = DateTime.now();
    var dayNum = 1 - (firstWeekday - 1); // first cell's day-of-month
    while (dayNum <= daysInMonth) {
      final row = <Widget>[];
      for (var i = 0; i < 7; i++) {
        if (dayNum < 1 || dayNum > daysInMonth) {
          row.add(const Expanded(child: SizedBox(height: 40)));
        } else {
          final date = DateTime(ref.year, ref.month, dayNum);
          final has = _sessionsOn(date).isNotEmpty;
          final isToday = _dayKey(date) == _dayKey(today);
          final isSelected =
              _selectedDay != null && _dayKey(date) == _dayKey(_selectedDay!);
          row.add(
            Expanded(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => setState(() => _selectedDay = date),
                child: Container(
                  margin: const EdgeInsets.all(2),
                  height: 36,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: has ? AppColors.onSurface : Colors.transparent,
                    shape: BoxShape.circle,
                    border: isSelected
                        ? Border.all(color: AppColors.onSurface, width: 1.5)
                        : (isToday
                            ? Border.all(color: AppColors.muted, width: 1)
                            : null),
                  ),
                  child: Text(
                    '$dayNum',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color:
                          has ? AppColors.background : AppColors.onSurface,
                    ),
                  ),
                ),
              ),
            ),
          );
        }
        dayNum++;
      }
      rows.add(Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(children: row),
      ));
    }
    return rows;
  }

  // ---------------------------------------------------------------------
  // Day detail
  // ---------------------------------------------------------------------

  Widget _dayDetailCard(DateTime day) {
    final daySessions = _sessionsOn(day);
    final isPast = DateTime(day.year, day.month, day.day)
        .isBefore(DateTime.now());
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceLow,
        borderRadius: BorderRadius.circular(20),
      ),
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${_monthName(day.month)} ${day.day}',
            style: const TextStyle(
              fontSize: 11,
              letterSpacing: 1.5,
              fontWeight: FontWeight.w800,
              color: AppColors.muted,
            ),
          ),
          const SizedBox(height: 6),
          if (daySessions.isEmpty) ...[
            Text(
              isPast
                  ? t('calendar.rest_day_text')
                  : t('calendar.rest_day_text'),
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppColors.onSurface,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              t('calendar.no_workout_on_day'),
              style:
                  const TextStyle(fontSize: 13, color: AppColors.muted),
            ),
          ] else
            for (final s in daySessions) ...[
              Text(
                titleCase(s.name.isEmpty
                    ? t('dashboard.workout_default')
                    : s.name),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: AppColors.onSurface,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${s.exercises.length} ${t('dashboard.exercises_short_caps')} · ${s.doneSets}/${s.totalSets} set',
                style: const TextStyle(
                    fontSize: 12, color: AppColors.muted),
              ),
              const SizedBox(height: 8),
            ],
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------
  // Month sessions section
  // ---------------------------------------------------------------------

  Widget _monthSection(DateTime now) {
    final month = _sessions.where((s) {
      final w = s.finishedAt ?? s.startedAt;
      if (w == null) return false;
      return w.year == now.year && w.month == now.month;
    }).toList();
    final lastMonth = _sessions.where((s) {
      final w = s.finishedAt ?? s.startedAt;
      if (w == null) return false;
      final lm = DateTime(now.year, now.month - 1, 1);
      return w.year == lm.year && w.month == lm.month;
    }).length;
    final delta = month.length - lastMonth;

    String deltaLabel;
    if (delta > 0) {
      deltaLabel = tFmt('calendar.delta_up', {'n': delta});
    } else if (delta < 0) {
      deltaLabel = tFmt('calendar.delta_down', {'n': delta});
    } else {
      deltaLabel = t('calendar.delta_same');
    }

    if (month.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Center(
          child: Text(
            t('calendar.no_workout_this_month'),
            style: const TextStyle(color: AppColors.muted),
          ),
        ),
      );
    }
    final totalVolume = month.fold<double>(0, (acc, s) {
      for (final ex in s.exercises) {
        for (final set in ex.sets) {
          acc += set.kg * set.reps;
        }
      }
      return acc;
    });

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          t('calendar.this_month'),
          style: const TextStyle(
            fontSize: 11,
            letterSpacing: 1.5,
            fontWeight: FontWeight.w800,
            color: AppColors.muted,
          ),
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 18),
          decoration: BoxDecoration(
            color: AppColors.surfaceLow,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tFmt('calendar.sessions_count_caps',
                          {'n': month.length}),
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      deltaLabel,
                      style: const TextStyle(
                        fontSize: 11,
                        letterSpacing: 1.2,
                        fontWeight: FontWeight.w700,
                        color: AppColors.muted,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${_fmtVolume(totalVolume)} ${_volumeUnit(totalVolume)}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface,
                    ),
                  ),
                  Text(
                    t('dashboard.stat_lifted').toUpperCase(),
                    style: const TextStyle(
                      fontSize: 10,
                      letterSpacing: 1.4,
                      fontWeight: FontWeight.w700,
                      color: AppColors.muted,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ---------------------------------------------------------------------
  // Muscle / observations / yearly
  // ---------------------------------------------------------------------

  Widget _muscleSection() {
    final now = DateTime.now();
    final monthSessions = _sessions.where((s) {
      final w = s.finishedAt ?? s.startedAt;
      if (w == null) return false;
      return w.year == now.year && w.month == now.month;
    }).toList();
    if (monthSessions.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          t('calendar.muscles_this_month_caps'),
          style: const TextStyle(
            fontSize: 11,
            letterSpacing: 1.5,
            fontWeight: FontWeight.w800,
            color: AppColors.muted,
          ),
        ),
        const SizedBox(height: 10),
        MuscleVolumeChart(sessions: monthSessions),
      ],
    );
  }

  Widget _insightsSection() {
    final insights = computeInsights(_sessions);
    if (!insights.hasAny) return const SizedBox.shrink();
    final chips = <String>[
      if (insights.mostCommonDay != null) insights.mostCommonDay!,
      if (insights.typicalStartTime != null) insights.typicalStartTime!,
      if (insights.leastCommonDay != null) insights.leastCommonDay!,
      if (insights.typicalDuration != null) insights.typicalDuration!,
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          t('calendar.observations_caps'),
          style: const TextStyle(
            fontSize: 11,
            letterSpacing: 1.5,
            fontWeight: FontWeight.w800,
            color: AppColors.muted,
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final c in chips)
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.surfaceLow,
                  borderRadius: BorderRadius.circular(100),
                ),
                child: Text(
                  c,
                  style: const TextStyle(
                    fontSize: 11,
                    letterSpacing: 1.2,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }

  Widget _yearlySection(DateTime now) {
    final intensities = <DateTime, double>{};
    for (final s in _sessions) {
      final w = s.finishedAt ?? s.startedAt;
      if (w == null) continue;
      final key = DateTime(w.year, w.month, w.day);
      intensities[key] = (intensities[key] ?? 0) + s.exercises.length.toDouble();
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => const ProgressScreen(),
            ),
          ),
          behavior: HitTestBehavior.opaque,
          child: Row(
            children: [
              Expanded(
                child: Text(
                  t('progress.title').toUpperCase(),
                  style: const TextStyle(
                    fontSize: 11,
                    letterSpacing: 1.5,
                    fontWeight: FontWeight.w800,
                    color: AppColors.muted,
                  ),
                ),
              ),
              const Icon(Icons.chevron_right,
                  color: AppColors.muted, size: 18),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 14),
          decoration: BoxDecoration(
            color: AppColors.surfaceLow,
            borderRadius: BorderRadius.circular(20),
          ),
          child: YearlyHeatmap(
            year: now.year,
            dayIntensity: intensities,
          ),
        ),
      ],
    );
  }
}
