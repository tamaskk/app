import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import '../models/auth.dart';
import '../models/onboarding_data.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';

/// Stacked Apple + Google buttons with a divider beneath. Reusable on both
/// login and register screens. Caller hands us an [AuthService] and a
/// callback fired on a successful sign-in.
///
/// SETUP: see apps/mobile/OAUTH_SETUP.md for credential + entitlement steps.
class OAuthButtons extends StatefulWidget {
  final AuthService auth;
  final ValueChanged<AuthUser> onAuthenticated;
  // Optional onboarding payload to attach when the user is created on the fly.
  final OnboardingData? onboarding;

  const OAuthButtons({
    super.key,
    required this.auth,
    required this.onAuthenticated,
    this.onboarding,
  });

  @override
  State<OAuthButtons> createState() => _OAuthButtonsState();
}

class _OAuthButtonsState extends State<OAuthButtons> {
  bool _busy = false;

  Future<void> _signInWithApple() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: const [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );
      final idToken = credential.identityToken;
      if (idToken == null) {
        throw AuthException(401, 'Az Apple bejelentkezés nem adott vissza tokent.');
      }
      // Apple only returns name on the first sign-in — pass it through.
      final name = [credential.givenName, credential.familyName]
          .whereType<String>()
          .where((s) => s.isNotEmpty)
          .join(' ')
          .trim();
      final user = await widget.auth.signInWithOAuth(
        provider: 'apple',
        idToken: idToken,
        name: name,
        onboarding: widget.onboarding?.toJson(),
      );
      widget.onAuthenticated(user);
    } on AuthException catch (e) {
      _showError(e.message);
    } on SignInWithAppleAuthorizationException {
      // User cancelled — no toast.
    } catch (_) {
      _showError('Nem sikerült belépni az Apple ID-val.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _signInWithGoogle() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final google = GoogleSignIn();
      final account = await google.signIn();
      if (account == null) return; // user cancelled
      final auth = await account.authentication;
      final idToken = auth.idToken;
      if (idToken == null) {
        throw AuthException(
            401, 'A Google bejelentkezés nem adott vissza tokent.');
      }
      final user = await widget.auth.signInWithOAuth(
        provider: 'google',
        idToken: idToken,
        name: account.displayName ?? '',
        onboarding: widget.onboarding?.toJson(),
      );
      widget.onAuthenticated(user);
    } on AuthException catch (e) {
      _showError(e.message);
    } catch (_) {
      _showError('Nem sikerült belépni a Google fiókkal.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), duration: const Duration(seconds: 3)),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Apple Sign In is required on iOS if you offer any third-party login;
    // on Android we hide the button rather than fall back to a web view.
    final showApple = Platform.isIOS || Platform.isMacOS;
    return Opacity(
      opacity: _busy ? 0.5 : 1,
      child: IgnorePointer(
        ignoring: _busy,
        child: Column(
          children: [
            if (showApple) ...[
              _OAuthButton(
                label: 'Folytatás Apple-lel',
                onPressed: _signInWithApple,
                background: AppColors.onSurface,
                foreground: AppColors.background,
                icon: Icons.apple,
              ),
              const SizedBox(height: 10),
            ],
            _OAuthButton(
              label: 'Folytatás Google-lel',
              onPressed: _signInWithGoogle,
              background: AppColors.surfaceLow,
              foreground: AppColors.onSurface,
              icon: Icons.g_mobiledata,
              iconSize: 28,
              border: AppColors.outline,
            ),
            const SizedBox(height: 20),
            Row(
              children: const [
                Expanded(child: Divider(color: AppColors.outline, height: 1)),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  child: Text('vagy',
                      style: TextStyle(
                          fontSize: 12,
                          color: AppColors.muted,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.2)),
                ),
                Expanded(child: Divider(color: AppColors.outline, height: 1)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _OAuthButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  final Color background;
  final Color foreground;
  final IconData icon;
  final double iconSize;
  final Color? border;

  const _OAuthButton({
    required this.label,
    required this.onPressed,
    required this.background,
    required this.foreground,
    required this.icon,
    this.iconSize = 20,
    this.border,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: TextButton(
        style: TextButton.styleFrom(
          backgroundColor: background,
          foregroundColor: foreground,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side:
                border != null ? BorderSide(color: border!) : BorderSide.none,
          ),
        ),
        onPressed: onPressed,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: iconSize, color: foreground),
            const SizedBox(width: 10),
            Text(label,
                style:
                    const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}
