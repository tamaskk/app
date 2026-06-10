/// Capitalises the first letter of every word: "upward facing dog (male)" ->
/// "Upward Facing Dog (Male)". Leaves the rest of each word as-is.
String titleCase(String s) => s.replaceAllMapped(
      RegExp(r'\w+'),
      (m) => '${m[0]![0].toUpperCase()}${m[0]!.substring(1)}',
    );
