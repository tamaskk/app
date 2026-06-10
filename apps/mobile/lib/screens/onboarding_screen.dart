import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../models/onboarding_data.dart';
import '../utils/optimal_volume.dart';
import '../widgets/week_preview.dart';
import 'demo_workout_screen.dart';

/// Post-registration onboarding: 6 question steps that build a personalised
/// plan for an already-authenticated user. The welcome step that used to
/// live here moved to [WelcomeScreen] so it can sit before registration.
class OnboardingScreen extends StatefulWidget {
  final void Function(OnboardingData) onComplete;

  const OnboardingScreen({super.key, required this.onComplete});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _data = OnboardingData();
  int _step = 0;

  // Question steps only — the welcome step lives outside this screen now.
  // Reordering here changes the order on screen.
  late final List<Widget Function()> _steps = [
    _goalStep,
    _experienceStep,
    _bodyBasicsStep,
    _scheduleStep,
    _splitStep,
    _volumeRevealStep,
  ];

  void _next() {
    if (_step >= _steps.length - 1) {
      if (_data.optimalVolume == 0) {
        _data.optimalVolume = optimalWeeklyVolume(_data);
      }
      widget.onComplete(_data);
      return;
    }
    setState(() => _step++);
  }

  void _back() {
    if (_step == 0) return;
    setState(() => _step--);
  }

  // Used after a single-select tap to give a moment of confirmation feedback
  // before sliding forward.
  void _autoAdvance() {
    Future.delayed(const Duration(milliseconds: 320), () {
      if (mounted) _next();
    });
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _step == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _back();
      },
      child: Scaffold(
        body: SafeArea(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 220),
            switchInCurve: Curves.easeOut,
            transitionBuilder: (child, animation) {
              return FadeTransition(
                opacity: animation,
                child: SlideTransition(
                  position: Tween<Offset>(
                    begin: const Offset(0.04, 0),
                    end: Offset.zero,
                  ).animate(animation),
                  child: child,
                ),
              );
            },
            child: KeyedSubtree(
              key: ValueKey(_step),
              child: _steps[_step](),
            ),
          ),
        ),
      ),
    );
  }

  // --- shell ----------------------------------------------------------------

  Widget _scaffold({
    required String title,
    String? subtitle,
    required Widget body,
    required bool canContinue,
    String continueLabel = 'Tovább',
    bool centerBody = false,
    bool showContinueButton = true,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
          child: _progressBar((_step) / (_steps.length - 1)),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: const TextStyle(
                      fontSize: 34,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -1,
                      color: AppColors.onSurface)),
              if (subtitle != null) ...[
                const SizedBox(height: 10),
                Text(subtitle,
                    style: const TextStyle(
                        fontSize: 18, height: 1.3, color: AppColors.muted)),
              ],
            ],
          ),
        ),
        Expanded(
          child: centerBody
              ? Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Center(child: body),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
                  child: body,
                ),
        ),
        if (showContinueButton)
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
            child: SizedBox(
              width: double.infinity,
              child: TextButton(
                style: TextButton.styleFrom(
                  backgroundColor:
                      canContinue ? AppColors.primary : AppColors.surfaceHigh,
                  foregroundColor:
                      canContinue ? AppColors.background : AppColors.muted,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(100)),
                ),
                onPressed: canContinue ? _next : null,
                child: Text(continueLabel,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 16)),
              ),
            ),
          ),
      ],
    );
  }

  Widget _progressBar(double p) {
    return Row(
      children: [
        GestureDetector(
          onTap: _back,
          behavior: HitTestBehavior.opaque,
          child: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.surfaceLow,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.chevron_left,
                color:
                    _step == 0 ? AppColors.surfaceHigh : AppColors.onSurface),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(100),
            child: LinearProgressIndicator(
              value: p.clamp(0.0, 1.0),
              minHeight: 6,
              backgroundColor: AppColors.surfaceHigh,
              valueColor: const AlwaysStoppedAnimation(AppColors.primary),
            ),
          ),
        ),
        const SizedBox(width: 8),
      ],
    );
  }

  Widget _optionCard({
    required String title,
    String? subtitle,
    String? badge,
    required bool selected,
    required VoidCallback onTap,
  }) {
    final fg = selected ? AppColors.background : AppColors.onSurface;
    final sub = selected ? const Color(0xFF4A4A4A) : AppColors.muted;
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(title,
                      style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: fg)),
                ),
                if (badge != null) _monochromeBadge(badge, selected: selected),
              ],
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 6),
              Text(subtitle, style: TextStyle(fontSize: 15, color: sub)),
            ],
          ],
        ),
      ),
    );
  }

  // Monochrome badge — replaces the prior green accent to stay on-brand.
  Widget _monochromeBadge(String text, {required bool selected}) {
    final color = selected ? AppColors.background : AppColors.onSurface;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        border: Border.all(color: color, width: 1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.4,
        ),
      ),
    );
  }

  // --- steps ----------------------------------------------------------------

  Widget _goalStep() => _scaffold(
        title: 'Mi a célod?',
        subtitle: 'Erre szabjuk a programot.',
        canContinue: _data.goal != null,
        showContinueButton: false,
        body: Column(children: [
          _optionCard(
              title: 'Fogyás',
              subtitle: 'Tartsd meg az izmot deficit alatt',
              selected: _data.goal == 'lose_fat',
              onTap: () {
                setState(() => _data.goal = 'lose_fat');
                _autoAdvance();
              }),
          _optionCard(
              title: 'Izomépítés',
              subtitle: 'Maximális hipertrófia',
              selected: _data.goal == 'build_muscle',
              onTap: () {
                setState(() => _data.goal = 'build_muscle');
                _autoAdvance();
              }),
          _optionCard(
              title: 'Erő és teljesítmény',
              subtitle: 'Növeld az 1RM-et a fő gyakorlatokon',
              selected: _data.goal == 'strength',
              onTap: () {
                setState(() => _data.goal = 'strength');
                _autoAdvance();
              }),
          _optionCard(
              title: 'Fenntartás',
              subtitle: 'Tartsd az izmot, javítsd az összképet',
              selected: _data.goal == 'maintain',
              onTap: () {
                setState(() => _data.goal = 'maintain');
                _autoAdvance();
              }),
        ]),
      );

  Widget _experienceStep() => _scaffold(
        title: 'Mennyi a tapasztalatod?',
        subtitle: 'Mióta edzel rendszeresen?',
        canContinue: _data.experience != null,
        showContinueButton: false,
        body: Column(children: [
          _optionCard(
              title: 'Kezdő',
              subtitle: 'Kevesebb mint 1 év',
              selected: _data.experience == 'beginner',
              onTap: () {
                setState(() => _data.experience = 'beginner');
                _autoAdvance();
              }),
          _optionCard(
              title: 'Haladó',
              subtitle: '1–3 év',
              selected: _data.experience == 'intermediate',
              onTap: () {
                setState(() => _data.experience = 'intermediate');
                _autoAdvance();
              }),
          _optionCard(
              title: 'Tapasztalt',
              subtitle: '3+ év',
              selected: _data.experience == 'advanced',
              onTap: () {
                setState(() => _data.experience = 'advanced');
                _autoAdvance();
              }),
          _optionCard(
              title: 'Elit',
              subtitle: '5+ év, edzői tudás',
              selected: _data.experience == 'elite',
              onTap: () {
                setState(() => _data.experience = 'elite');
                _autoAdvance();
              }),
        ]),
      );

  // Combined demographics: gender + age + weight + cardio on one screen.
  Widget _bodyBasicsStep() {
    final canContinue = _data.gender != null && _data.cardio != null;
    final display = _data.useLbs
        ? (_data.weightKg * 2.20462).round()
        : _data.weightKg.round();
    return _scaffold(
      title: 'Pár adat rólad',
      subtitle: 'Ezekre szabjuk a heti volument.',
      canContinue: canContinue,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionLabel('Nem'),
          const SizedBox(height: 10),
          _chipRow([
            _ChipOption('Férfi', _data.gender == 'male',
                () => setState(() => _data.gender = 'male')),
            _ChipOption('Nő', _data.gender == 'female',
                () => setState(() => _data.gender = 'female')),
            _ChipOption('Egyéb', _data.gender == 'other',
                () => setState(() => _data.gender = 'other')),
          ]),
          const SizedBox(height: 28),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              _sectionLabel('Életkor'),
              const Spacer(),
              Text('${_data.age}',
                  style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface)),
              const SizedBox(width: 4),
              const Text('év',
                  style: TextStyle(fontSize: 14, color: AppColors.muted)),
            ],
          ),
          _whiteSlider(
            value: _data.age.toDouble(),
            min: 16,
            max: 80,
            onChanged: (v) => setState(() => _data.age = v.round()),
          ),
          const SizedBox(height: 24),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              _sectionLabel('Testsúly'),
              const Spacer(),
              Text('$display',
                  style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface)),
              const SizedBox(width: 4),
              GestureDetector(
                onTap: () => setState(() => _data.useLbs = !_data.useLbs),
                child: Text(
                  _data.useLbs ? 'lbs' : 'kg',
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.onSurface,
                    fontWeight: FontWeight.w700,
                    decoration: TextDecoration.underline,
                    decorationColor: AppColors.muted,
                  ),
                ),
              ),
            ],
          ),
          _whiteSlider(
            value: _data.weightKg.clamp(35, 220),
            min: 35,
            max: 220,
            onChanged: (v) => setState(() => _data.weightKg = v),
          ),
          const SizedBox(height: 28),
          _sectionLabel('Cardio mennyiség'),
          const SizedBox(height: 10),
          _chipRow([
            _ChipOption('Semmi', _data.cardio == 'none',
                () => setState(() => _data.cardio = 'none')),
            _ChipOption('Kevés', _data.cardio == 'light',
                () => setState(() => _data.cardio = 'light')),
            _ChipOption('Közepes', _data.cardio == 'moderate',
                () => setState(() => _data.cardio = 'moderate')),
            _ChipOption('Sok', _data.cardio == 'high',
                () => setState(() => _data.cardio = 'high')),
          ]),
          const SizedBox(height: 12),
        ],
      ),
    );
  }

  Widget _scheduleStep() {
    final optimal = recommendedDaysPerWeek(_data.experience);
    return _scaffold(
      title: 'Heti ritmusod',
      subtitle: 'Hány nap edzés, mennyi időre?',
      canContinue: true,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionLabel('Edzésnap / hét'),
          const SizedBox(height: 16),
          Center(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _roundButton(Icons.remove, () {
                  if (_data.daysPerWeek > 1) {
                    setState(() => _data.daysPerWeek--);
                  }
                }),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 28),
                  child: Text('${_data.daysPerWeek}',
                      style: const TextStyle(
                          fontSize: 72,
                          fontWeight: FontWeight.w800,
                          height: 1,
                          color: AppColors.onSurface)),
                ),
                _roundButton(Icons.add, () {
                  if (_data.daysPerWeek < 6) {
                    setState(() => _data.daysPerWeek++);
                  }
                }),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: Text(
              _data.daysPerWeek == optimal
                  ? 'OPTIMÁLIS A SZINTEDHEZ'
                  : (_data.daysPerWeek > 5
                      ? 'A regenerálás határán'
                      : 'Megfelelő'),
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.6,
                color: AppColors.onSurface,
              ),
            ),
          ),
          const SizedBox(height: 28),
          _sectionLabel('Egy edzés hossza'),
          const SizedBox(height: 10),
          _chipRow([
            _ChipOption('30 min', _data.sessionDuration == 30,
                () => setState(() => _data.sessionDuration = 30)),
            _ChipOption('45 min', _data.sessionDuration == 45,
                () => setState(() => _data.sessionDuration = 45)),
            _ChipOption('60 min', _data.sessionDuration == 60,
                () => setState(() => _data.sessionDuration = 60)),
            _ChipOption('75 min', _data.sessionDuration == 75,
                () => setState(() => _data.sessionDuration = 75)),
            _ChipOption('90+ min', _data.sessionDuration == 90,
                () => setState(() => _data.sessionDuration = 90)),
          ]),
        ],
      ),
    );
  }

  Widget _splitStep() {
    final recommended = _recommendedSplit();
    return _scaffold(
      title: 'Edzésfelosztás',
      subtitle: 'Hogyan szervezzük a heteket?',
      canContinue: _data.split != null,
      body: Column(children: [
        _optionCard(
            title: 'Full Body',
            subtitle: 'Minden izom minden nap, magas frekvencia',
            badge: recommended == 'full_body' ? 'AJÁNLOTT' : null,
            selected: _data.split == 'full_body',
            onTap: () => setState(() => _data.split = 'full_body')),
        _optionCard(
            title: 'Upper / Lower',
            subtitle: 'Felső- és alsótest külön napokon',
            badge: recommended == 'upper_lower' ? 'AJÁNLOTT' : null,
            selected: _data.split == 'upper_lower',
            onTap: () => setState(() => _data.split = 'upper_lower')),
        _optionCard(
            title: 'Push / Pull / Legs',
            subtitle: 'Tolás, húzás, láb külön napokon',
            badge: recommended == 'push_pull_legs' ? 'AJÁNLOTT' : null,
            selected: _data.split == 'push_pull_legs',
            onTap: () => setState(() => _data.split = 'push_pull_legs')),
        _optionCard(
            title: 'Bro split',
            subtitle: 'Egy izomcsoport / nap, 5–6 napos hét',
            badge: recommended == 'bro' ? 'AJÁNLOTT' : null,
            selected: _data.split == 'bro',
            onTap: () => setState(() => _data.split = 'bro')),
      ]),
    );
  }

  String _recommendedSplit() {
    final d = _data.daysPerWeek;
    if (d <= 2) return 'full_body';
    if (d == 3) return 'full_body';
    if (d == 4) return 'upper_lower';
    if (d == 5) return 'push_pull_legs';
    return 'bro';
  }

  Widget _volumeRevealStep() {
    if (_data.optimalVolume == 0) {
      _data.optimalVolume = optimalWeeklyVolume(_data);
    }
    return _scaffold(
      title: 'A heti optimumod',
      subtitle: 'Ennyi munka-szett izomcsoportonként ad ideális eredményt.',
      canContinue: true,
      continueLabel: 'Mentsd a tervemet',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const SizedBox(height: 8),
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: _data.optimalVolume.toDouble()),
            duration: const Duration(milliseconds: 700),
            curve: Curves.easeOutCubic,
            builder: (_, v, __) {
              return Text('${v.round()}',
                  style: const TextStyle(
                      fontSize: 110,
                      fontWeight: FontWeight.w800,
                      height: 1,
                      letterSpacing: -4,
                      color: AppColors.onSurface));
            },
          ),
          const SizedBox(height: 4),
          const Text('szett / izom / hét',
              style: TextStyle(fontSize: 15, color: AppColors.muted)),
          const SizedBox(height: 8),
          const Text('RP MEV / MAV alapján',
              style: TextStyle(
                  fontSize: 11,
                  letterSpacing: 1.4,
                  color: AppColors.muted,
                  fontWeight: FontWeight.w700)),
          const SizedBox(height: 28),
          WeekPreview(
            split: _data.split,
            daysPerWeek: _data.daysPerWeek,
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _roundButton(Icons.remove, () {
                if (_data.optimalVolume > 6) {
                  setState(() => _data.optimalVolume--);
                }
              }, small: true),
              const SizedBox(width: 16),
              const Text('Hangold',
                  style: TextStyle(
                      fontSize: 13,
                      color: AppColors.muted,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2)),
              const SizedBox(width: 16),
              _roundButton(Icons.add, () {
                if (_data.optimalVolume < 30) {
                  setState(() => _data.optimalVolume++);
                }
              }, small: true),
            ],
          ),
          const SizedBox(height: 20),
          // Secondary CTA — defer registration by letting the user try a
          // sample workout first. On save, we complete onboarding normally.
          GestureDetector(
            onTap: _openDemoWorkout,
            behavior: HitTestBehavior.opaque,
            child: const Padding(
              padding: EdgeInsets.symmetric(vertical: 10),
              child: Text(
                'Próbálj egy szettet előbb →',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.onSurface,
                  fontWeight: FontWeight.w700,
                  decoration: TextDecoration.underline,
                  decorationColor: AppColors.muted,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _openDemoWorkout() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => DemoWorkoutScreen(
          onBack: () => Navigator.of(context).pop(),
          // After the demo, treat "Save progress" as completing onboarding —
          // pops the demo and fires the same onComplete that the primary CTA
          // would have fired.
          onSaveProgress: () {
            Navigator.of(context).pop();
            _next();
          },
        ),
      ),
    );
  }

  // --- small building blocks ------------------------------------------------

  Widget _sectionLabel(String text) {
    return Text(
      text.toUpperCase(),
      style: const TextStyle(
        fontSize: 12,
        letterSpacing: 1.6,
        fontWeight: FontWeight.w800,
        color: AppColors.muted,
      ),
    );
  }

  Widget _chipRow(List<_ChipOption> options) {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: options.map((o) {
        return GestureDetector(
          onTap: o.onTap,
          behavior: HitTestBehavior.opaque,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 140),
            padding:
                const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            decoration: BoxDecoration(
              color: o.selected ? AppColors.primary : AppColors.surfaceLow,
              borderRadius: BorderRadius.circular(100),
            ),
            child: Text(
              o.label,
              style: TextStyle(
                color:
                    o.selected ? AppColors.background : AppColors.onSurface,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _whiteSlider({
    required double value,
    required double min,
    required double max,
    required ValueChanged<double> onChanged,
  }) {
    return SliderTheme(
      data: SliderThemeData(
        activeTrackColor: AppColors.primary,
        inactiveTrackColor: AppColors.surfaceHigh,
        thumbColor: AppColors.primary,
        overlayColor: AppColors.primary.withValues(alpha: 0.15),
        trackHeight: 4,
      ),
      child: Slider(
        value: value.clamp(min, max),
        min: min,
        max: max,
        onChanged: onChanged,
      ),
    );
  }

  Widget _roundButton(IconData icon, VoidCallback onTap, {bool small = false}) {
    final size = small ? 44.0 : 56.0;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: const BoxDecoration(
            color: AppColors.surfaceLow, shape: BoxShape.circle),
        child: Icon(icon, color: AppColors.onSurface),
      ),
    );
  }
}

class _ChipOption {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  _ChipOption(this.label, this.selected, this.onTap);
}
