import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../i18n/app_strings.dart';
import '../theme/app_theme.dart';
import '../models/auth.dart';
import '../services/auth_service.dart';
import 'register_screen.dart';
import 'forgot_password_screen.dart';
import 'auth_widgets.dart';
import 'oauth_buttons.dart';

class LoginScreen extends StatefulWidget {
  final AuthService auth;
  final ValueChanged<AuthUser> onAuthenticated;
  // When provided, "Regisztrálj" calls this instead of pushing a route
  // (used by the state-driven AuthGate). Falls back to a pushed RegisterScreen.
  final VoidCallback? onRegisterInstead;

  const LoginScreen({
    super.key,
    required this.auth,
    required this.onAuthenticated,
    this.onRegisterInstead,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final user = await widget.auth.login(
        email: _email.text.trim(),
        password: _password.text,
      );
      widget.onAuthenticated(user);
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = t('auth.server_unreachable'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _goToRegister() {
    if (widget.onRegisterInstead != null) {
      widget.onRegisterInstead!();
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => RegisterScreen(
          auth: widget.auth,
          onAuthenticated: (user) {
            widget.onAuthenticated(user);
            Navigator.of(context).pop();
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: MediaQuery.of(context).size.height -
                  MediaQuery.of(context).padding.vertical,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('HEFTOR',
                    style: TextStyle(
                        fontSize: 36,
                        letterSpacing: 2,
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface)),
                const SizedBox(height: 20),
                Text(t('auth.login_title'),
                    style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 8),
                Text(t('auth.login_subtitle'),
                    style: const TextStyle(
                        fontSize: 15, color: AppColors.muted)),
                const SizedBox(height: 28),
                OAuthButtons(
                  auth: widget.auth,
                  onAuthenticated: widget.onAuthenticated,
                ),
                const SizedBox(height: 20),
                AuthField(
                  controller: _email,
                  label: t('auth.email'),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 12),
                AuthField(
                  controller: _password,
                  label: t('auth.password'),
                  obscure: true,
                  onSubmitted: (_) => _submit(),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  AuthError(_error!),
                ],
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.muted,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 8),
                      minimumSize: const Size(0, 0),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    onPressed: _loading
                        ? null
                        : () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => ForgotPasswordScreen(
                                  auth: widget.auth,
                                  onAuthenticated: widget.onAuthenticated,
                                ),
                              ),
                            );
                          },
                    child: Text(t('auth.forgot_password'),
                        style: const TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w600)),
                  ),
                ),
                const SizedBox(height: 16),
                AuthButton(
                  label: t('auth.login_button'),
                  loading: _loading,
                  onPressed: _submit,
                ),
                if (kDebugMode) ...[
                  const SizedBox(height: 12),
                  // Dev convenience: prefill test credentials. Stripped from release builds.
                  SizedBox(
                    width: double.infinity,
                    child: TextButton(
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.muted,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: const BorderSide(color: AppColors.outline),
                        ),
                      ),
                      onPressed: _loading
                          ? null
                          : () {
                              _email.text = 'tamas@blcks.io';
                              _password.text = 'Hdf697123';
                              setState(() => _error = null);
                            },
                      child: const Text('TEST',
                          style: TextStyle(
                              fontWeight: FontWeight.w700, letterSpacing: 2)),
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                Center(
                  child: AuthLink(
                    leading: t('auth.no_account_leading'),
                    action: t('auth.no_account_action'),
                    onTap: _loading ? null : _goToRegister,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
