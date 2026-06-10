import 'package:flutter/material.dart';
import '../i18n/app_strings.dart';
import '../models/auth.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import 'auth_widgets.dart';
import 'password_strength.dart';

/// Step 2 of the reset flow.
///
/// The user has the reset link from their email; this screen takes the
/// token (we accept either the full URL or the bare token), a new password
/// and a confirmation, and calls `auth.resetPassword(token, password)`. On
/// success the backend returns a fresh session so we log the user straight
/// into the app via [onAuthenticated] — no extra login step.
///
/// Designed to work without deep-link infrastructure: the email body tells
/// the user "tap the link OR paste it / the code here". The token-input
/// field accepts both forms because URL-pasting on mobile is awkward; we
/// extract `?token=` automatically when a URL is detected.
class ResetPasswordScreen extends StatefulWidget {
  final AuthService auth;
  final ValueChanged<AuthUser>? onAuthenticated;
  // Pre-fills the token field — set when a future deep-link / app-link
  // intent opens this screen with the token already known.
  final String? initialToken;

  const ResetPasswordScreen({
    super.key,
    required this.auth,
    this.onAuthenticated,
    this.initialToken,
  });

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  late final _token =
      TextEditingController(text: widget.initialToken ?? '');
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _token.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  /// Accept either a bare token (`abc123…`) or the full email URL
  /// (`https://heftor.app/reset-password?token=abc123…`) — we extract the
  /// `token` query param when the input parses as a URL with that key.
  String _extractToken(String input) {
    final raw = input.trim();
    if (raw.isEmpty) return raw;
    final uri = Uri.tryParse(raw);
    if (uri == null) return raw;
    final fromQuery = uri.queryParameters['token'];
    if (fromQuery != null && fromQuery.isNotEmpty) return fromQuery;
    return raw;
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    final token = _extractToken(_token.text);
    final password = _password.text;
    final confirm = _confirm.text;

    if (token.isEmpty) {
      setState(() => _error = t('auth.reset_token_required'));
      return;
    }
    if (password.length < 8) {
      setState(() => _error = t('auth.password_min_8'));
      return;
    }
    if (password != confirm) {
      setState(() => _error = t('auth.reset_passwords_dont_match'));
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final user = await widget.auth.resetPassword(
        token: token,
        newPassword: password,
      );
      if (!mounted) return;
      widget.onAuthenticated?.call(user);
      // If no auth callback was wired (rare), bounce back so the user
      // doesn't get stuck on a screen with nowhere to go.
      if (widget.onAuthenticated == null && Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
      }
    } on AuthException catch (e) {
      // 410 (Gone) is the canonical "token used / expired" — surface a
      // human-friendly message instead of the raw server text.
      final msg = (e.statusCode == 410 || e.statusCode == 404)
          ? t('auth.reset_invalid_or_expired')
          : e.message;
      if (mounted) setState(() => _error = msg);
    } catch (_) {
      if (mounted) setState(() => _error = t('auth.server_unreachable'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GestureDetector(
                onTap: () {
                  if (Navigator.of(context).canPop()) {
                    Navigator.of(context).pop();
                  }
                },
                behavior: HitTestBehavior.opaque,
                child: Container(
                  width: 40,
                  height: 40,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLow,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.chevron_left,
                      color: AppColors.onSurface),
                ),
              ),
              Text(
                t('auth.reset_step2_title'),
                style: Theme.of(context).textTheme.headlineLarge,
              ),
              const SizedBox(height: 8),
              Text(
                t('auth.reset_step2_subtitle'),
                style: const TextStyle(
                    fontSize: 15, color: AppColors.muted, height: 1.5),
              ),
              const SizedBox(height: 24),
              AuthField(
                controller: _token,
                label: t('auth.reset_token_label'),
                keyboardType: TextInputType.url,
              ),
              const SizedBox(height: 12),
              AuthField(
                controller: _password,
                label: t('auth.reset_new_password_label'),
                obscure: true,
              ),
              const SizedBox(height: 10),
              ValueListenableBuilder<TextEditingValue>(
                valueListenable: _password,
                builder: (_, value, __) =>
                    PasswordStrengthMeter(password: value.text),
              ),
              const SizedBox(height: 12),
              AuthField(
                controller: _confirm,
                label: t('auth.reset_confirm_password_label'),
                obscure: true,
                onSubmitted: (_) => _submit(),
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                AuthError(_error!),
              ],
              const SizedBox(height: 24),
              AuthButton(
                label: t('auth.reset_button'),
                loading: _loading,
                onPressed: _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
