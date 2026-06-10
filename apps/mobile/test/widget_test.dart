// Smoke test for the app root. The default Flutter counter scaffold was never
// applicable to this app; this just confirms the root widget constructs.
// (Pumping it fully would await the auth/session restore network timeout and
// leave a pending Timer at teardown, so we keep this dependency-free.)

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:heftor/main.dart';

void main() {
  test('HeftorApp constructs', () {
    expect(const HeftorApp(), isA<Widget>());
  });
}
