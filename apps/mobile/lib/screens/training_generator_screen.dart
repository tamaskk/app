import 'package:flutter/material.dart';
import '../i18n/app_strings.dart';
import '../models/auth.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';

/// Configures and triggers a server-side training-plan generation. The user
/// picks: number of weeks (1..20), sessions per week (1..6), optional focus
/// muscles. Submitting the form persists weeks×sessions Training docs.
class TrainingGeneratorScreen extends StatefulWidget {
  final AuthService auth;
  const TrainingGeneratorScreen({super.key, required this.auth});

  @override
  State<TrainingGeneratorScreen> createState() =>
      _TrainingGeneratorScreenState();
}

// `key` is the backend muscle vocabulary (sent verbatim in the POST body);
// `labelKey` is an i18n key resolved to the display label at build time.
const _muscleOptions = <_MuscleOption>[
  _MuscleOption('chest', 'generator.muscle_chest'),
  _MuscleOption('back', 'generator.muscle_back'),
  _MuscleOption('shoulders', 'generator.muscle_shoulders'),
  _MuscleOption('biceps', 'generator.muscle_biceps'),
  _MuscleOption('triceps', 'generator.muscle_triceps'),
  _MuscleOption('quads', 'generator.muscle_quads'),
  _MuscleOption('hamstrings', 'generator.muscle_hamstrings'),
  _MuscleOption('glutes', 'generator.muscle_glutes'),
  _MuscleOption('calves', 'generator.muscle_calves'),
  _MuscleOption('abs', 'generator.muscle_abs'),
];

class _MuscleOption {
  final String key;
  final String labelKey;
  const _MuscleOption(this.key, this.labelKey);
}

class _TrainingGeneratorScreenState extends State<TrainingGeneratorScreen> {
  late int _weeks;
  late int _sessionsPerWeek;
  final _selectedMuscles = <String>{};
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Pre-fill from the user's onboarding so the first thing they see
    // matches what they already told us.
    final AuthOnboarding? on = widget.auth.user?.onboarding;
    _weeks = 5;
    _sessionsPerWeek = (on?.daysPerWeek ?? 4).clamp(1, 6);
  }

  Future<void> _submit() async {
    if (_loading) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await widget.auth.generateTrainingPlan(
        weeks: _weeks,
        sessionsPerWeek: _sessionsPerWeek,
        focusMuscles: _selectedMuscles.toList(),
      );
      if (!mounted) return;
      final created = (res['created'] as num?)?.toInt() ?? 0;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(tFmt('generator.generated_snack', {'count': created}))),
      );
      Navigator.of(context).pop(true);
    } on AuthException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = t('generator.network_error'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  int get _totalSessions => _weeks * _sessionsPerWeek;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(color: AppColors.onSurface),
        title: const SizedBox.shrink(),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _header(),
              const SizedBox(height: 24),
              _weeksSection(),
              const SizedBox(height: 28),
              _sessionsSection(),
              const SizedBox(height: 28),
              _focusSection(),
              const SizedBox(height: 28),
              _previewBox(),
              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(
                  _error!,
                  style: const TextStyle(
                      color: AppColors.onSurface, fontSize: 13),
                ),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  style: TextButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.background,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(100),
                    ),
                  ),
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.background,
                          ),
                        )
                      : Text(
                          tFmt('generator.cta', {'count': _totalSessions}),
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.6,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _header() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          t('generator.eyebrow'),
          style: const TextStyle(
            fontSize: 11,
            letterSpacing: 1.6,
            color: AppColors.muted,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          t('generator.title'),
          style: const TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w800,
            letterSpacing: -1,
            color: AppColors.onSurface,
            height: 1.1,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          t('generator.subtitle'),
          style: const TextStyle(
            fontSize: 14,
            color: AppColors.muted,
            height: 1.5,
          ),
        ),
      ],
    );
  }

  Widget _weeksSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionLabel(t('generator.weeks_label')),
        const SizedBox(height: 6),
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              '$_weeks',
              style: const TextStyle(
                fontSize: 64,
                fontWeight: FontWeight.w800,
                color: AppColors.onSurface,
                letterSpacing: -2,
                height: 1,
              ),
            ),
            const SizedBox(width: 6),
            Text(
              t('generator.weeks_unit'),
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.4,
                color: AppColors.muted,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SliderTheme(
          data: SliderThemeData(
            activeTrackColor: AppColors.onSurface,
            inactiveTrackColor: AppColors.surfaceHigh,
            thumbColor: AppColors.onSurface,
            overlayColor: AppColors.onSurface.withValues(alpha: 0.15),
            trackHeight: 4,
          ),
          child: Slider(
            min: 1,
            max: 20,
            divisions: 19,
            value: _weeks.toDouble(),
            onChanged: (v) => setState(() => _weeks = v.round()),
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: const [
            Text(
              '1',
              style: TextStyle(fontSize: 11, color: AppColors.muted),
            ),
            Text(
              '20',
              style: TextStyle(fontSize: 11, color: AppColors.muted),
            ),
          ],
        ),
      ],
    );
  }

  Widget _sessionsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionLabel(t('generator.sessions_label')),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          children: [
            for (var i = 1; i <= 6; i++)
              _ChipBtn(
                label: '$i',
                selected: _sessionsPerWeek == i,
                onTap: () => setState(() => _sessionsPerWeek = i),
              ),
          ],
        ),
      ],
    );
  }

  Widget _focusSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionLabel(t('generator.muscles_label')),
        const SizedBox(height: 4),
        Text(
          t('generator.muscles_hint'),
          style: const TextStyle(fontSize: 12, color: AppColors.muted),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final m in _muscleOptions)
              _ChipBtn(
                label: t(m.labelKey),
                selected: _selectedMuscles.contains(m.key),
                onTap: () => setState(() {
                  if (_selectedMuscles.contains(m.key)) {
                    _selectedMuscles.remove(m.key);
                  } else {
                    _selectedMuscles.add(m.key);
                  }
                }),
              ),
          ],
        ),
        if (_selectedMuscles.isNotEmpty) ...[
          const SizedBox(height: 8),
          GestureDetector(
            onTap: () => setState(_selectedMuscles.clear),
            behavior: HitTestBehavior.opaque,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Text(
                t('generator.clear_selection'),
                style: const TextStyle(
                  fontSize: 11,
                  letterSpacing: 1.4,
                  color: AppColors.muted,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _previewBox() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surfaceLow,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t('generator.preview'),
            style: const TextStyle(
              fontSize: 10,
              letterSpacing: 1.6,
              color: AppColors.muted,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '$_totalSessions',
                style: const TextStyle(
                  fontSize: 48,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -2,
                  color: AppColors.onSurface,
                  height: 1,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                t('generator.plan_unit'),
                style: const TextStyle(
                  fontSize: 14,
                  letterSpacing: 1.6,
                  color: AppColors.muted,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            '${tFmt('generator.preview_line', {'weeks': _weeks, 'sessions': _sessionsPerWeek})} '
            '${_selectedMuscles.isEmpty ? t('generator.preview_all_muscles') : tFmt('generator.preview_focus', {'count': _selectedMuscles.length})}',
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.muted,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionLabel(String text) => Text(
        text.toUpperCase(),
        style: const TextStyle(
          fontSize: 12,
          letterSpacing: 1.6,
          fontWeight: FontWeight.w800,
          color: AppColors.muted,
        ),
      );
}

class _ChipBtn extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _ChipBtn({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 140),
        padding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(100),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
            color: selected ? AppColors.background : AppColors.onSurface,
          ),
        ),
      ),
    );
  }
}
