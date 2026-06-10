import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../models/api_models.dart';
import '../services/api.dart';
import '../utils/text.dart';

const _sheetDecoration = BoxDecoration(
  color: AppColors.background,
  borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
  border: Border.fromBorderSide(BorderSide(color: AppColors.outline)),
);

Widget _handle() => Container(
      margin: const EdgeInsets.symmetric(vertical: 12),
      width: 40,
      height: 4,
      decoration: BoxDecoration(
        color: AppColors.surfaceHigh,
        borderRadius: BorderRadius.circular(100),
      ),
    );

/// Long-press menu for a training: Edit / Delete. [onChanged] is called after a
/// successful edit or delete so the caller can refresh.
Future<void> showTrainingActions(
  BuildContext context,
  SavedTraining training, {
  required Future<void> Function() onChanged,
}) {
  return showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (ctx) => Container(
      decoration: _sheetDecoration,
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _handle(),
            ListTile(
              leading: const Icon(Icons.edit_outlined,
                  color: AppColors.onSurface),
              title: const Text('Szerkesztés',
                  style: TextStyle(
                      color: AppColors.onSurface,
                      fontSize: 16,
                      fontWeight: FontWeight.w600)),
              onTap: () {
                Navigator.pop(ctx);
                _showEditSheet(context, training, onChanged);
              },
            ),
            ListTile(
              leading:
                  const Icon(Icons.delete_outline, color: AppColors.accentRed),
              title: const Text('Törlés',
                  style: TextStyle(
                      color: AppColors.accentRed,
                      fontSize: 16,
                      fontWeight: FontWeight.w600)),
              onTap: () {
                Navigator.pop(ctx);
                _showDeleteSheet(context, training, onChanged);
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    ),
  );
}

// --- DELETE drawer ----------------------------------------------------------

void _showDeleteSheet(
  BuildContext context,
  SavedTraining training,
  Future<void> Function() onChanged,
) {
  showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (_) =>
        _DeleteTrainingSheet(training: training, onChanged: onChanged),
  );
}

class _DeleteTrainingSheet extends StatefulWidget {
  final SavedTraining training;
  final Future<void> Function() onChanged;
  const _DeleteTrainingSheet({required this.training, required this.onChanged});

  @override
  State<_DeleteTrainingSheet> createState() => _DeleteTrainingSheetState();
}

class _DeleteTrainingSheetState extends State<_DeleteTrainingSheet> {
  final _api = Api();
  bool _deleting = false;

  @override
  void dispose() {
    _api.dispose();
    super.dispose();
  }

  Future<void> _delete() async {
    setState(() => _deleting = true);
    final nav = Navigator.of(context);
    try {
      await _api.deleteTraining(widget.training.id);
      await widget.onChanged();
      nav.pop();
    } catch (_) {
      if (mounted) {
        setState(() => _deleting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Nem sikerült törölni.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: _sheetDecoration,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _handle(),
              const SizedBox(height: 8),
              Text('"${titleCase(widget.training.name)}" törlése',
                  style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface,
                      letterSpacing: -0.5)),
              const SizedBox(height: 8),
              const Text('Ez a művelet nem visszavonható.',
                  style: TextStyle(color: AppColors.muted, fontSize: 14)),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  style: TextButton.styleFrom(
                    backgroundColor: AppColors.accentRed,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                  ),
                  onPressed: _deleting ? null : _delete,
                  child: _deleting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text('Törlés',
                          style: TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 15)),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.muted,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed:
                      _deleting ? null : () => Navigator.of(context).pop(),
                  child: const Text('Mégse',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// --- EDIT drawer ------------------------------------------------------------

void _showEditSheet(
  BuildContext context,
  SavedTraining training,
  Future<void> Function() onChanged,
) {
  showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (_) =>
        _EditTrainingSheet(training: training, onChanged: onChanged),
  );
}

class _EditTrainingSheet extends StatefulWidget {
  final SavedTraining training;
  final Future<void> Function() onChanged;
  const _EditTrainingSheet({required this.training, required this.onChanged});

  @override
  State<_EditTrainingSheet> createState() => _EditTrainingSheetState();
}

class _EditTrainingSheetState extends State<_EditTrainingSheet> {
  final _api = Api();
  late final TextEditingController _name =
      TextEditingController(text: widget.training.name);
  late final List<SavedExercise> _exercises =
      List.of(widget.training.exercises);
  bool _saving = false;

  @override
  void dispose() {
    _api.dispose();
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final name = _name.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Adj nevet az edzésnek.')),
      );
      return;
    }
    setState(() => _saving = true);
    final nav = Navigator.of(context);
    try {
      await _api.updateTraining(
        id: widget.training.id,
        name: name,
        exercises: _exercises
            .map((e) => {
                  'exerciseId': e.exerciseId,
                  'name': e.name,
                  'gifUrl': e.gifUrl,
                  'targetMuscles': e.targetMuscles,
                  'category': e.category,
                  'progressionStrategy': e.progressionStrategy,
                  'sets': e.sets
                      .map((s) => {'kg': s.kg, 'reps': s.reps})
                      .toList(),
                })
            .toList(),
      );
      await widget.onChanged();
      nav.pop();
    } catch (_) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Nem sikerült menteni.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        decoration: _sheetDecoration,
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _handle(),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                child: Row(
                  children: [
                    const Expanded(
                      child: Text('Szerkesztés',
                          style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: AppColors.onSurface,
                              letterSpacing: -0.5)),
                    ),
                    TextButton(
                      style: TextButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: AppColors.background,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 18, vertical: 8),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(100)),
                      ),
                      onPressed: _saving ? null : _save,
                      child: _saving
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.background))
                          : const Text('Mentés',
                              style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: TextField(
                  controller: _name,
                  style: const TextStyle(
                      color: AppColors.onSurface,
                      fontSize: 16,
                      fontWeight: FontWeight.w600),
                  cursorColor: AppColors.onSurface,
                  decoration: InputDecoration(
                    labelText: 'Név',
                    labelStyle: const TextStyle(color: AppColors.muted),
                    floatingLabelStyle:
                        const TextStyle(color: AppColors.onSurface),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.outline),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.onSurface),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Flexible(
                child: _exercises.isEmpty
                    ? const Padding(
                        padding: EdgeInsets.all(24),
                        child: Text('Nincs gyakorlat',
                            style: TextStyle(color: AppColors.muted)),
                      )
                    : ListView.builder(
                        shrinkWrap: true,
                        padding:
                            const EdgeInsets.fromLTRB(20, 4, 20, 20),
                        itemCount: _exercises.length,
                        itemBuilder: (context, i) {
                          final ex = _exercises[i];
                          return Container(
                            padding:
                                const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              border: i == 0
                                  ? null
                                  : const Border(
                                      top: BorderSide(
                                          color: AppColors.outline)),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(titleCase(ex.name),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.onSurface)),
                                ),
                                GestureDetector(
                                  onTap: () =>
                                      setState(() => _exercises.removeAt(i)),
                                  behavior: HitTestBehavior.opaque,
                                  child: const Padding(
                                    padding: EdgeInsets.all(4),
                                    child: Icon(Icons.remove_circle_outline,
                                        color: AppColors.muted, size: 22),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
