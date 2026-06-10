import 'package:flutter/material.dart';
import '../i18n/app_strings.dart';
import '../theme/app_theme.dart';

/// First screen a brand-new user sees. Two CTAs:
///   • [onRegister] — primary, full-width pill ("Kezdjük")
///   • [onSignIn] — secondary text link for returning users
///
/// Was previously step 0 of the onboarding flow; now lives on its own so the
/// onboarding screens can run *after* the account is created.
class WelcomeScreen extends StatelessWidget {
  final VoidCallback onRegister;
  final VoidCallback onSignIn;

  const WelcomeScreen({
    super.key,
    required this.onRegister,
    required this.onSignIn,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'HEFTOR',
                    style: TextStyle(
                      fontSize: 48,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 2,
                      color: AppColors.onSurface,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    t('welcome.headline'),
                    style: const TextStyle(
                      fontSize: 22,
                      height: 1.2,
                      color: AppColors.onSurface,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    t('welcome.body'),
                    style: const TextStyle(
                        fontSize: 15, height: 1.5, color: AppColors.muted),
                  ),
                ],
              ),
            ),
            const Spacer(),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: TextButton(
                      style: TextButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: AppColors.background,
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(100)),
                      ),
                      onPressed: onRegister,
                      child: Text(
                        t('welcome.cta'),
                        style: const TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 16),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  GestureDetector(
                    onTap: onSignIn,
                    behavior: HitTestBehavior.opaque,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: RichText(
                        text: TextSpan(
                          style: const TextStyle(
                              fontSize: 14, color: AppColors.muted),
                          children: [
                            TextSpan(text: t('welcome.have_account')),
                            TextSpan(
                              text: t('welcome.sign_in_link'),
                              style: const TextStyle(
                                  color: AppColors.onSurface,
                                  fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
