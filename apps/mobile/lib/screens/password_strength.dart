import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Lightweight heuristic password strength score 0..4 — no third-party deps.
/// Intentionally simpler than zxcvbn; covers the obvious wins: length and
/// character-class variety, plus a penalty for short passwords.
int scorePassword(String pw) {
  if (pw.isEmpty) return 0;

  var classes = 0;
  if (pw.contains(RegExp(r'[a-z]'))) classes++;
  if (pw.contains(RegExp(r'[A-Z]'))) classes++;
  if (pw.contains(RegExp(r'[0-9]'))) classes++;
  if (pw.contains(RegExp(r'[^A-Za-z0-9]'))) classes++;

  var score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (classes >= 2) score++;
  if (classes >= 3 && pw.length >= 10) score++;

  // Block obvious weak passwords from ever scoring above 1.
  const weak = {
    'password',
    '12345678',
    'qwerty12',
    'letmein',
    'welcome1',
    'admin123',
    'football',
  };
  if (weak.contains(pw.toLowerCase())) return score.clamp(0, 1);

  return score.clamp(0, 4);
}

String passwordStrengthLabel(int score) {
  switch (score) {
    case 0:
      return 'Túl rövid';
    case 1:
      return 'Gyenge';
    case 2:
      return 'Közepes';
    case 3:
      return 'Erős';
    case 4:
      return 'Kiváló';
    default:
      return '';
  }
}

/// 4-segment strength bar that fills as the password gets stronger.
/// Pure monochrome — no green/red, the count of filled segments is the signal.
class PasswordStrengthMeter extends StatelessWidget {
  final String password;
  const PasswordStrengthMeter({super.key, required this.password});

  @override
  Widget build(BuildContext context) {
    final score = scorePassword(password);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: List.generate(4, (i) {
            final filled = i < score;
            return Expanded(
              child: Container(
                margin: EdgeInsets.only(right: i == 3 ? 0 : 6),
                height: 4,
                decoration: BoxDecoration(
                  color: filled ? AppColors.onSurface : AppColors.surfaceHigh,
                  borderRadius: BorderRadius.circular(100),
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 8),
        Text(
          password.isEmpty ? '' : passwordStrengthLabel(score),
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
            color: AppColors.muted,
          ),
        ),
      ],
    );
  }
}
