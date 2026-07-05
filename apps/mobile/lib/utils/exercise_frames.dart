// Helpers for turning a stored exercise image URL into the set of animation
// frames the UI flips between (fake-GIF effect).
//
// free-exercise-db serves exactly two static JPGs per exercise, named
// `.../<Id>/0.jpg` and `.../<Id>/1.jpg`. Persisted trainings only keep the
// first frame's URL (`gifUrl`), so we reconstruct the second from the naming
// convention instead of migrating the schema. URLs that don't match the
// pattern (user-supplied GIFs, custom exercises) stay single-frame / static.

// Matches a trailing `/0.<ext>` — the free-exercise-db first-frame filename.
final RegExp _firstFrame = RegExp(r'/0(\.[A-Za-z0-9]+)(\?.*)?$');

/// Expand a single image URL into its animation frames.
///
/// * empty  → `[]`  (caller shows a placeholder)
/// * a `.../0.jpg`-style URL → `[.../0.jpg, .../1.jpg]`
/// * anything else → `[url]` (static)
List<String> framesFromUrl(String url) {
  final u = url.trim();
  if (u.isEmpty) return const [];
  final m = _firstFrame.firstMatch(u);
  if (m == null) return [u];
  final second = u.replaceRange(m.start, m.end, '/1${m.group(1)}${m.group(2) ?? ''}');
  return [u, second];
}
