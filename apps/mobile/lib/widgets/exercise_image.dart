import 'dart:async';
import 'package:flutter/material.dart';
import '../utils/exercise_frames.dart';
import 'exercise_placeholder.dart';

/// Exercise illustration that fakes a GIF: free-exercise-db ships two static
/// JPGs per exercise (start + end of the movement), and this widget flips
/// between them every [interval] (0.5s) with a quick cross-fade.
///
/// Feed it either an explicit [frames] list (from `ApiExercise.imageFrames`)
/// or a single [url] (a persisted `gifUrl`), from which the sibling frame is
/// derived. Falls back to a static image (one frame) or an
/// [ExercisePlaceholder] (no frames / load failure).
class ExerciseImage extends StatefulWidget {
  final List<String>? frames;
  final String? url;
  final BoxFit fit;
  final double iconSize;
  final bool showLabel;
  final bool compact;
  final Duration interval;

  const ExerciseImage({
    super.key,
    this.frames,
    this.url,
    this.fit = BoxFit.cover,
    this.iconSize = 24,
    this.showLabel = false,
    this.compact = false,
    this.interval = const Duration(milliseconds: 500),
  });

  @override
  State<ExerciseImage> createState() => _ExerciseImageState();
}

class _ExerciseImageState extends State<ExerciseImage> {
  List<String> _resolved = const [];
  List<String> _loaded = const []; // frames that precached successfully
  bool _precached = false;
  Timer? _timer;
  int _index = 0;
  // Bumped on every (re)start so a stale in-flight precache can't clobber the
  // current frame set or start a duplicate timer.
  int _gen = 0;

  @override
  void initState() {
    super.initState();
    _resolved = _computeFrames();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Initial mount only — an in-place prop change is handled by didUpdateWidget.
    if (_precached || _resolved.isEmpty) return;
    _precached = true;
    _precacheAll(_gen);
  }

  @override
  void didUpdateWidget(ExerciseImage old) {
    super.didUpdateWidget(old);
    // Compare by VALUE: imageFrames / framesFromUrl return a fresh list each
    // build, so reference comparison would restart (and re-precache) on every
    // rebuild. Only actually-changed frames restart the animation.
    final next = _computeFrames();
    if (!_sameList(_resolved, next)) {
      _resolved = next;
      _restart();
    }
  }

  /// Resolve the widget's inputs into a deduped, non-empty frame URL list.
  List<String> _computeFrames() {
    final explicit =
        widget.frames?.where((f) => f.trim().isNotEmpty).toList() ?? const [];
    final raw = explicit.isNotEmpty ? explicit : framesFromUrl(widget.url ?? '');
    return raw.toSet().toList(); // dedupe, preserve order
  }

  /// Tear down the current animation and precache/animate the new frames.
  void _restart() {
    _timer?.cancel();
    _timer = null;
    _index = 0;
    _loaded = const [];
    _gen++;
    if (_resolved.isEmpty) {
      _precached = false;
      return;
    }
    _precached = true;
    _precacheAll(_gen);
  }

  Future<void> _precacheAll(int gen) async {
    final frames = _resolved;
    final ok = <String>[];
    for (final f in frames) {
      try {
        await precacheImage(NetworkImage(f), context);
        ok.add(f);
      } catch (_) {
        // Skip frames that fail to load (e.g. a derived sibling that 404s).
      }
    }
    // Bail if disposed or superseded by a newer frame set.
    if (!mounted || gen != _gen) return;
    setState(() => _loaded = ok);
    if (ok.length >= 2) {
      _timer = Timer.periodic(widget.interval, (_) {
        if (!mounted) return;
        setState(() => _index = (_index + 1) % _loaded.length);
      });
    }
  }

  bool _sameList(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Widget _placeholder() => Center(
        child: ExercisePlaceholder(
          iconSize: widget.iconSize,
          showLabel: widget.showLabel,
          compact: widget.compact,
        ),
      );

  @override
  Widget build(BuildContext context) {
    // Before precache resolves, show the first resolved frame statically so
    // the tile isn't blank; after, animate over the frames that loaded.
    final frames = _loaded.isNotEmpty ? _loaded : _resolved;
    if (frames.isEmpty) return _placeholder();
    final current = frames[_index % frames.length];
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 250),
      child: Image.network(
        current,
        key: ValueKey(current),
        fit: widget.fit,
        gaplessPlayback: true,
        loadingBuilder: (context, child, progress) =>
            progress == null ? child : _placeholder(),
        errorBuilder: (_, __, ___) => _placeholder(),
      ),
    );
  }
}
