import '../models/api_models.dart';

/// One-liner observations the calendar surfaces under "MEGFIGYELÉSEK".
/// Each is a short uppercase string ready to render in a monochrome chip.
class SmartInsights {
  /// e.g. "PÉNTEKEN EDZESZ LEGTÖBBET (5 ALKALOM)"
  final String? mostCommonDay;

  /// e.g. "ÁTLAGOSAN 18:30-KOR KEZDESZ"
  final String? typicalStartTime;

  /// e.g. "HÉTFŐN A LEGRITKÁBB AZ EDZÉS"
  final String? leastCommonDay;

  /// e.g. "ÁTLAG SESSION: 47 PERC"
  final String? typicalDuration;

  const SmartInsights({
    this.mostCommonDay,
    this.typicalStartTime,
    this.leastCommonDay,
    this.typicalDuration,
  });

  bool get hasAny =>
      mostCommonDay != null ||
      typicalStartTime != null ||
      leastCommonDay != null ||
      typicalDuration != null;
}

const _dayNames = [
  'HÉTFŐN',
  'KEDDEN',
  'SZERDÁN',
  'CSÜTÖRTÖKÖN',
  'PÉNTEKEN',
  'SZOMBATON',
  'VASÁRNAP',
];

/// Compute the calendar insight chips from completed sessions. Requires
/// at least 4 sessions before any insight is surfaced — below that the data
/// is too noisy to make a confident claim.
SmartInsights computeInsights(List<WorkoutSession> sessions) {
  final dated = sessions
      .where((s) => (s.finishedAt ?? s.startedAt) != null)
      .toList();
  if (dated.length < 4) return const SmartInsights();

  final byWeekday = <int, int>{}; // 1..7
  final hourSamples = <int>[];
  final minuteSamples = <int>[];
  final durationSamples = <int>[];

  for (final s in dated) {
    final d = s.finishedAt ?? s.startedAt!;
    byWeekday[d.weekday] = (byWeekday[d.weekday] ?? 0) + 1;
    final started = s.startedAt;
    if (started != null) {
      hourSamples.add(started.hour);
      minuteSamples.add(started.minute);
    }
    final dur = s.duration?.inMinutes;
    if (dur != null && dur > 0) durationSamples.add(dur);
  }

  String? mostCommon;
  String? leastCommon;
  if (byWeekday.isNotEmpty) {
    final sorted = byWeekday.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final top = sorted.first;
    // Require the top day to account for at least 30% of sessions so we don't
    // overclaim on a 1-vs-1 plurality.
    if (top.value / dated.length >= 0.3) {
      mostCommon =
          '${_dayNames[top.key - 1]} EDZESZ LEGTÖBBET (${top.value} ALKALOM)';
    }
    final bottom = sorted.last;
    if (bottom.value <= 1 && sorted.length >= 4) {
      leastCommon = '${_dayNames[bottom.key - 1]} A LEGRITKÁBB';
    }
  }

  String? startTime;
  if (hourSamples.length >= 4) {
    final avgHour =
        (hourSamples.fold<int>(0, (a, b) => a + b) / hourSamples.length)
            .round();
    final avgMin =
        (minuteSamples.fold<int>(0, (a, b) => a + b) / minuteSamples.length)
            .round();
    final hh = avgHour.toString().padLeft(2, '0');
    final mm = avgMin.toString().padLeft(2, '0');
    startTime = 'ÁTLAGOSAN $hh:$mm-KOR KEZDESZ';
  }

  String? duration;
  if (durationSamples.length >= 4) {
    final avg =
        (durationSamples.fold<int>(0, (a, b) => a + b) / durationSamples.length)
            .round();
    duration = 'ÁTLAG SESSION: $avg PERC';
  }

  return SmartInsights(
    mostCommonDay: mostCommon,
    typicalStartTime: startTime,
    leastCommonDay: leastCommon,
    typicalDuration: duration,
  );
}

/// Single highlight row used in the JÚNIUS HIGHLIGHTS section.
class MonthHighlight {
  final String label;
  final String value;
  const MonthHighlight(this.label, this.value);
}

/// Compute the most-quotable wins of a month — biggest session by volume,
/// biggest by sets, count of PRs. Hidden when the data isn't there.
List<MonthHighlight> computeMonthHighlights(
  List<WorkoutSession> monthSessions,
  Set<String> prSessionIds, {
  required String Function(double kg) volumeFormatter,
}) {
  final highlights = <MonthHighlight>[];

  WorkoutSession? topVolume;
  var topVolumeKg = 0.0;
  WorkoutSession? topSets;
  var topSetCount = 0;
  var prCount = 0;

  for (final s in monthSessions) {
    final vol = s.exercises.fold<double>(
        0, (a, e) => a + e.sets.fold<double>(0, (b, x) => b + x.kg * x.reps));
    if (vol > topVolumeKg) {
      topVolumeKg = vol;
      topVolume = s;
    }
    if (s.totalSets > topSetCount) {
      topSetCount = s.totalSets;
      topSets = s;
    }
    if (s.id.isNotEmpty && prSessionIds.contains(s.id)) prCount++;
  }

  if (topVolume != null && topVolumeKg > 0) {
    highlights.add(MonthHighlight(
      'LEGNAGYOBB SESSION',
      '${_shortName(topVolume.name)} · ${volumeFormatter(topVolumeKg)}',
    ));
  }
  if (topSets != null && topSetCount > 0) {
    highlights.add(MonthHighlight(
      'LEGTÖBB SETT',
      '${_shortName(topSets.name)} · $topSetCount SET',
    ));
  }
  if (prCount > 0) {
    highlights.add(MonthHighlight('ÚJ PR-OK', '$prCount'));
  }
  return highlights;
}

String _shortName(String s) {
  if (s.trim().isEmpty) return 'EDZÉS';
  return s.trim().toUpperCase();
}
