import 'dart:async';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// A guided, read-only-ish demo of a workout. The user can mark sets done and
/// see the rest timer + completion flow — exactly enough to feel the app
/// without an account. Data is never persisted.
///
/// Triggered from the onboarding Volume Reveal screen as a secondary CTA so
/// the user can "try before they buy" before they commit to an email.
class DemoWorkoutScreen extends StatefulWidget {
  final VoidCallback onSaveProgress;
  final VoidCallback? onBack;

  const DemoWorkoutScreen({
    super.key,
    required this.onSaveProgress,
    this.onBack,
  });

  @override
  State<DemoWorkoutScreen> createState() => _DemoWorkoutScreenState();
}

class _DemoSet {
  final double kg;
  final int reps;
  bool done;
  _DemoSet(this.kg, this.reps) : done = false;
}

class _DemoWorkoutScreenState extends State<DemoWorkoutScreen> {
  // 4 sets of 80 kg × 8 — the canonical "looks like a real workout" sample.
  final List<_DemoSet> _sets = [
    _DemoSet(80, 8),
    _DemoSet(80, 8),
    _DemoSet(80, 8),
    _DemoSet(80, 8),
  ];

  Timer? _restTimer;
  int _restSeconds = 0;
  bool _resting = false;

  @override
  void dispose() {
    _restTimer?.cancel();
    super.dispose();
  }

  void _completeSet(int index) {
    if (_sets[index].done) return;
    setState(() {
      _sets[index].done = true;
      _resting = true;
      _restSeconds = 90; // smart timer default for a compound
    });
    _restTimer?.cancel();
    _restTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() {
        if (_restSeconds > 0) {
          _restSeconds--;
        } else {
          _resting = false;
          t.cancel();
        }
      });
    });
  }

  void _skipRest() {
    _restTimer?.cancel();
    setState(() {
      _resting = false;
      _restSeconds = 0;
    });
  }

  void _adjustRest(int delta) {
    setState(() {
      _restSeconds = (_restSeconds + delta).clamp(0, 600);
    });
  }

  int get _completedSets => _sets.where((s) => s.done).length;
  bool get _allDone => _completedSets == _sets.length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            _topBar(),
            Expanded(
              child: _allDone
                  ? _completionView()
                  : SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'BEMUTATÓ',
                            style: TextStyle(
                              fontSize: 11,
                              letterSpacing: 2,
                              color: AppColors.muted,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Bench Press',
                            style: TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -1,
                              color: AppColors.onSurface,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Mell · Triceps · Elülső deltoid',
                            style:
                                TextStyle(fontSize: 13, color: AppColors.muted),
                          ),
                          const SizedBox(height: 24),
                          ..._sets.asMap().entries.map(
                                (e) => _setRow(e.key, e.value),
                              ),
                          const SizedBox(height: 8),
                          Text(
                            'Bemutató szett — semmi nem mentődik, csak próbáld.',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.muted.withValues(alpha: 0.8),
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ],
                      ),
                    ),
            ),
            if (_resting) _restPanel(),
          ],
        ),
      ),
    );
  }

  Widget _topBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
      child: Row(
        children: [
          GestureDetector(
            onTap: widget.onBack ??
                () {
                  if (Navigator.of(context).canPop()) {
                    Navigator.of(context).pop();
                  }
                },
            behavior: HitTestBehavior.opaque,
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.surfaceLow,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.chevron_left,
                  color: AppColors.onSurface),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(100),
              child: LinearProgressIndicator(
                value: _completedSets / _sets.length,
                minHeight: 6,
                backgroundColor: AppColors.surfaceHigh,
                valueColor:
                    const AlwaysStoppedAnimation(AppColors.primary),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            '$_completedSets / ${_sets.length}',
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.muted,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.1,
            ),
          ),
        ],
      ),
    );
  }

  Widget _setRow(int index, _DemoSet set) {
    return GestureDetector(
      onTap: () => _completeSet(index),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 18),
        decoration: BoxDecoration(
          color: set.done ? AppColors.primary : AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 32,
              child: Text(
                '${index + 1}',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: set.done ? AppColors.background : AppColors.muted,
                ),
              ),
            ),
            _statBlock(set.kg.toStringAsFixed(0), 'kg', set.done),
            const SizedBox(width: 24),
            _statBlock('${set.reps}', 'reps', set.done),
            const Spacer(),
            Container(
              width: 32,
              height: 32,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: set.done ? AppColors.background : Colors.transparent,
                border: Border.all(
                  color:
                      set.done ? AppColors.background : AppColors.surfaceHigh,
                  width: 1.5,
                ),
              ),
              child: set.done
                  ? const Icon(Icons.check,
                      size: 18, color: AppColors.primary)
                  : null,
            ),
          ],
        ),
      ),
    );
  }

  Widget _statBlock(String value, String unit, bool inverted) {
    final fg = inverted ? AppColors.background : AppColors.onSurface;
    final sub =
        inverted ? const Color(0xFF4A4A4A) : AppColors.muted;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        Text(value,
            style: TextStyle(
                fontSize: 22, fontWeight: FontWeight.w800, color: fg)),
        const SizedBox(width: 4),
        Text(unit, style: TextStyle(fontSize: 12, color: sub)),
      ],
    );
  }

  Widget _restPanel() {
    final mm = (_restSeconds ~/ 60).toString().padLeft(1, '0');
    final ss = (_restSeconds % 60).toString().padLeft(2, '0');
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 16),
      decoration: const BoxDecoration(
        color: AppColors.surfaceLow,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('PIHENŐ',
                  style: TextStyle(
                      fontSize: 11,
                      letterSpacing: 2,
                      color: AppColors.muted,
                      fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text('$mm:$ss',
                  style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface,
                      letterSpacing: -1)),
            ],
          ),
          const Spacer(),
          _miniButton('−10s', () => _adjustRest(-10)),
          const SizedBox(width: 8),
          _miniButton('+10s', () => _adjustRest(10)),
          const SizedBox(width: 8),
          _miniButton('SKIP', _skipRest, filled: true),
        ],
      ),
    );
  }

  Widget _miniButton(String label, VoidCallback onTap,
      {bool filled = false}) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: filled ? AppColors.primary : Colors.transparent,
          border: filled ? null : Border.all(color: AppColors.outline),
          borderRadius: BorderRadius.circular(100),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
            color: filled ? AppColors.background : AppColors.onSurface,
          ),
        ),
      ),
    );
  }

  Widget _completionView() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
      child: Column(
        children: [
          const SizedBox(height: 32),
          Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.onSurface, width: 2),
            ),
            child: const Icon(Icons.check,
                size: 56, color: AppColors.onSurface),
          ),
          const SizedBox(height: 28),
          const Text(
            'Készen vagy.',
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w800,
              letterSpacing: -1,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Így néz ki egy szett. A többi edzésed, PR-jeid és heti volumented mostantól számon tartjuk — ha mented a fiókodba.',
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: 15, color: AppColors.muted, height: 1.5),
          ),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            child: TextButton(
              style: TextButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.background,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(100)),
              ),
              onPressed: widget.onSaveProgress,
              child: const Text('Mentsd a haladásod',
                  style: TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w700)),
            ),
          ),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: widget.onBack ??
                () {
                  if (Navigator.of(context).canPop()) {
                    Navigator.of(context).pop();
                  }
                },
            behavior: HitTestBehavior.opaque,
            child: const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text(
                'Vissza a tervhez',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.muted,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
