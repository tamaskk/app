import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import '../i18n/app_strings.dart';
import '../theme/app_theme.dart';
import '../models/auth.dart';
import '../models/onboarding_data.dart';
import '../services/auth_service.dart';
import 'auth_widgets.dart';
import 'oauth_buttons.dart';
import 'password_strength.dart';

class RegisterScreen extends StatefulWidget {
  final AuthService auth;
  final ValueChanged<AuthUser> onAuthenticated;
  // Onboarding answers to save with the new account (first-launch flow).
  final OnboardingData? onboarding;
  // State-driven navigation callbacks (AuthGate). Fall back to Navigator.pop.
  final VoidCallback? onBack;
  final VoidCallback? onLoginInstead;

  const RegisterScreen({
    super.key,
    required this.auth,
    required this.onAuthenticated,
    this.onboarding,
    this.onBack,
    this.onLoginInstead,
  });

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;

  static final _emailRegex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    final email = _email.text.trim();
    final password = _password.text;
    if (!_emailRegex.hasMatch(email)) {
      setState(() => _error = t('auth.invalid_email'));
      return;
    }
    if (password.length < 8) {
      setState(() => _error = t('auth.password_min_8'));
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final user = await widget.auth.register(
        email: email,
        password: password,
        name: _name.text.trim(),
        onboarding: widget.onboarding?.toJson(),
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

  void _onBack() {
    if (widget.onBack != null) {
      widget.onBack!();
    } else if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasOnboarding = widget.onboarding != null;
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Inline back affordance — keeps the immersive feel of onboarding.
              GestureDetector(
                onTap: _onBack,
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
                hasOnboarding
                    ? t('auth.register_title_with_plan')
                    : t('auth.register_title_default'),
                style: Theme.of(context).textTheme.headlineLarge,
              ),
              const SizedBox(height: 8),
              Text(
                hasOnboarding
                    ? t('auth.register_subtitle_with_plan')
                    : t('auth.register_subtitle_default'),
                style: const TextStyle(fontSize: 15, color: AppColors.muted),
              ),
              const SizedBox(height: 28),
              OAuthButtons(
                auth: widget.auth,
                onAuthenticated: widget.onAuthenticated,
                onboarding: widget.onboarding,
              ),
              const SizedBox(height: 20),
              AuthField(controller: _name, label: t('auth.name_optional')),
              const SizedBox(height: 12),
              AuthField(
                controller: _email,
                label: t('auth.email'),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 12),
              AuthField(
                controller: _password,
                label: t('auth.password_min_8_label'),
                obscure: true,
                onSubmitted: (_) => _submit(),
              ),
              const SizedBox(height: 10),
              ValueListenableBuilder<TextEditingValue>(
                valueListenable: _password,
                builder: (_, value, __) =>
                    PasswordStrengthMeter(password: value.text),
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                AuthError(_error!),
              ],
              const SizedBox(height: 20),
              _LegalNote(),
              const SizedBox(height: 12),
              AuthButton(
                label: t('auth.create_account_button'),
                loading: _loading,
                onPressed: _submit,
              ),
              const SizedBox(height: 16),
              Center(
                child: AuthLink(
                  leading: t('auth.have_account_leading'),
                  action: t('auth.have_account_action'),
                  onTap: _loading
                      ? null
                      : (widget.onLoginInstead ??
                          () => Navigator.of(context).pop()),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Compliance footer shown above the create-account CTA.
class _LegalNote extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    void show(String which) {
      // Best-effort placeholder until the in-app legal viewer ships.
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('$which — coming soon'),
          duration: const Duration(seconds: 2),
        ),
      );
    }

    return RichText(
      text: TextSpan(
        style: const TextStyle(
            fontSize: 12, color: AppColors.muted, height: 1.4),
        children: [
          TextSpan(text: t('auth.terms_lead')),
          TextSpan(
            text: t('auth.terms_link'),
            style: const TextStyle(
                color: AppColors.onSurface, fontWeight: FontWeight.w700),
            recognizer: _LinkTap(() => show(t('auth.terms_link'))),
          ),
          TextSpan(text: t('auth.terms_and')),
          TextSpan(
            text: t('auth.privacy_link'),
            style: const TextStyle(
                color: AppColors.onSurface, fontWeight: FontWeight.w700),
            recognizer: _LinkTap(() => show(t('auth.privacy_link'))),
          ),
          const TextSpan(text: '.'),
        ],
      ),
    );
  }
}

class _LinkTap extends TapGestureRecognizer {
  _LinkTap(VoidCallback onTap) {
    this.onTap = onTap;
  }
}
