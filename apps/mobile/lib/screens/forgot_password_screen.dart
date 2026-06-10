import 'package:flutter/material.dart';
import '../i18n/app_strings.dart';
import '../models/auth.dart';
import '../theme/app_theme.dart';
import '../services/auth_service.dart';
import 'auth_widgets.dart';
import 'reset_password_screen.dart';

/// Step 1 of the reset flow: collect an email, the backend mails a token.
/// The success state is intentionally generic — we never reveal whether the
/// email is registered (anti-enumeration).
class ForgotPasswordScreen extends StatefulWidget {
  final AuthService auth;
  final VoidCallback? onBack;
  // Threaded through to [ResetPasswordScreen] so a successful reset logs
  // the user straight into the app. Optional — if absent the reset screen
  // just pops back here on success.
  final ValueChanged<AuthUser>? onAuthenticated;

  const ForgotPasswordScreen({
    super.key,
    required this.auth,
    this.onBack,
    this.onAuthenticated,
  });

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _email = TextEditingController();
  bool _loading = false;
  bool _sent = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    final email = _email.text.trim();
    if (!email.contains('@') || !email.contains('.')) {
      setState(() => _error = t('auth.invalid_email'));
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await widget.auth.requestPasswordReset(email: email);
      if (mounted) setState(() => _sent = true);
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = t('auth.server_unreachable'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _back() {
    if (widget.onBack != null) {
      widget.onBack!();
    } else if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  /// Push step 2 (token + new password). Threads onAuthenticated through so
  /// a successful reset bounces the user straight into the app.
  void _goToReset() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ResetPasswordScreen(
          auth: widget.auth,
          onAuthenticated: widget.onAuthenticated,
        ),
      ),
    );
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
                onTap: _back,
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
              if (!_sent) ...[
                Text(t('auth.reset_title'),
                    style: Theme.of(context).textTheme.headlineLarge),
                const SizedBox(height: 8),
                Text(
                  t('auth.reset_subtitle'),
                  style: const TextStyle(
                      fontSize: 15, color: AppColors.muted),
                ),
                const SizedBox(height: 32),
                AuthField(
                  controller: _email,
                  label: t('auth.email'),
                  keyboardType: TextInputType.emailAddress,
                  onSubmitted: (_) => _submit(),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  AuthError(_error!),
                ],
                const SizedBox(height: 24),
                AuthButton(
                  label: t('auth.send_reset_link'),
                  loading: _loading,
                  onPressed: _submit,
                ),
                const SizedBox(height: 12),
                Center(
                  child: TextButton(
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.muted,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 10),
                    ),
                    onPressed: _loading ? null : _goToReset,
                    child: Text(
                      t('auth.reset_have_code'),
                      style: const TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ] else ...[
                Text(t('auth.reset_sent_title'),
                    style: Theme.of(context).textTheme.headlineLarge),
                const SizedBox(height: 12),
                Text(
                  tFmt('auth.reset_sent_body', {'email': _email.text.trim()}),
                  style: const TextStyle(
                      fontSize: 15, color: AppColors.muted, height: 1.5),
                ),
                const SizedBox(height: 32),
                AuthButton(
                  label: t('auth.reset_have_code'),
                  loading: false,
                  onPressed: _goToReset,
                ),
                const SizedBox(height: 12),
                Center(
                  child: TextButton(
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.muted,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 10),
                    ),
                    onPressed: _back,
                    child: Text(
                      t('common.back'),
                      style: const TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
