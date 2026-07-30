import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';
import '../i18n/app_strings.dart';
import '../services/api.dart';

/// Log a cardio run — distance + time — as a workout session. Stored with a
/// `metric: "distance"` exercise carrying distanceM + seconds (the same set
/// fields HYROX uses), so it shows up in history / calendar / progress like any
/// other session, plus its distance and pace.
class LogRunScreen extends StatefulWidget {
  const LogRunScreen({super.key});

  @override
  State<LogRunScreen> createState() => _LogRunScreenState();
}

class _LogRunScreenState extends State<LogRunScreen> {
  final Api _api = Api();
  final _km = TextEditingController();
  final _min = TextEditingController();
  final _sec = TextEditingController();
  DateTime _date = DateTime.now();
  bool _saving = false;

  @override
  void dispose() {
    _km.dispose();
    _min.dispose();
    _sec.dispose();
    _api.dispose();
    super.dispose();
  }

  int get _distanceM =>
      ((double.tryParse(_km.text.replaceAll(',', '.')) ?? 0) * 1000).round().clamp(0, 1 << 30);
  int get _totalSec =>
      ((int.tryParse(_min.text) ?? 0) * 60 + (int.tryParse(_sec.text) ?? 0)).clamp(0, 1 << 30);

  String? get _pace {
    if (_distanceM <= 0 || _totalSec <= 0) return null;
    final secPerKm = _totalSec / (_distanceM / 1000);
    final m = secPerKm ~/ 60;
    final s = (secPerKm % 60).round();
    return '$m:${s.toString().padLeft(2, '0')} /km';
  }

  bool get _isToday {
    final n = DateTime.now();
    return _date.year == n.year && _date.month == n.month && _date.day == n.day;
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(now.year - 2),
      lastDate: now,
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _save() async {
    if (_saving) return;
    if (_distanceM <= 0 && _totalSec <= 0) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(t('run.need'))));
      return;
    }
    setState(() => _saving = true);
    // finishedAt: today → now; a past date → noon that day. startedAt spans the run.
    final finishedAt = _isToday
        ? DateTime.now()
        : DateTime(_date.year, _date.month, _date.day, 12);
    final startedAt = finishedAt.subtract(Duration(seconds: _totalSec));
    final name = t('run.name');
    try {
      await _api.createSession(
        name: name,
        startedAt: startedAt,
        finishedAt: finishedAt,
        exercises: [
          {
            'exerciseId': 'cardio_run',
            'name': name,
            'gifUrl': '',
            'targetMuscles': ['cardiovascular system'],
            'metric': 'distance',
            'sets': [
              {
                'kg': 0,
                'reps': 0,
                'done': true,
                'distanceM': _distanceM,
                'seconds': _totalSec,
              }
            ],
          }
        ],
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      final msg = e is ApiException ? e.message : t('run.failed');
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final pace = _pace;
    return Scaffold(
      appBar: AppBar(
        title: Text(t('run.title')),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton(
              onPressed: _saving ? null : _save,
              style: TextButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.background,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(100)),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              ),
              child: _saving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: AppColors.background),
                    )
                  : Text(t('common.save'),
                      style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.surfaceLow,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(Icons.directions_run,
                    color: AppColors.onSurface, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t('run.title'),
                        style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -1,
                            color: AppColors.onSurface)),
                    Text(t('run.subtitle'),
                        style: const TextStyle(
                            fontSize: 14, color: AppColors.muted)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 28),

          // distance
          _label(t('run.distance')),
          const SizedBox(height: 8),
          _bigField(_km, hint: '5.0', suffix: 'km', decimal: true),

          const SizedBox(height: 20),

          // time
          _label(t('run.time')),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _bigField(_min, hint: '30', suffix: t('run.min'))),
              const SizedBox(width: 8),
              Expanded(
                  child:
                      _bigField(_sec, hint: '00', suffix: t('run.sec'), max: 59)),
            ],
          ),

          const SizedBox(height: 20),

          // date
          _label(t('run.date')),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: _pickDate,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.surfaceLow,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Text(
                    '${_date.year}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}',
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.onSurface),
                  ),
                  const Spacer(),
                  const Icon(Icons.calendar_today_outlined,
                      color: AppColors.muted, size: 18),
                ],
              ),
            ),
          ),

          if (pace != null) ...[
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.outline),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(t('run.pace'),
                      style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.2,
                          color: AppColors.muted)),
                  Text(pace,
                      style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.onSurface)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _label(String s) => Text(s,
      style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
          color: AppColors.muted));

  Widget _bigField(TextEditingController c,
      {required String hint, required String suffix, bool decimal = false, int? max}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.surfaceLow,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: TextField(
              controller: c,
              keyboardType: TextInputType.numberWithOptions(decimal: decimal),
              inputFormatters: decimal
                  ? [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))]
                  : [FilteringTextInputFormatter.digitsOnly],
              onChanged: (v) {
                if (max != null && (int.tryParse(v) ?? 0) > max) {
                  c.text = max.toString();
                  c.selection = TextSelection.fromPosition(
                      TextPosition(offset: c.text.length));
                }
                setState(() {});
              },
              style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  color: AppColors.onSurface),
              cursorColor: AppColors.onSurface,
              decoration: InputDecoration(
                isDense: true,
                border: InputBorder.none,
                hintText: hint,
                hintStyle: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                    color: AppColors.surfaceHigh),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(bottom: 8, left: 6),
            child: Text(suffix,
                style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                    color: AppColors.muted)),
          ),
        ],
      ),
    );
  }
}
