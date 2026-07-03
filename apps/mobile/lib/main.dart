import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'theme/app_theme.dart';
import 'i18n/app_strings.dart';
import 'models/auth.dart';
import 'services/auth_service.dart';
import 'services/notification_service.dart';
import 'services/plate_settings.dart';
import 'screens/dashboard_screen.dart';
import 'screens/trainings_list_screen.dart';
import 'screens/hyrox_screen.dart';
import 'screens/progress_screen.dart';
import 'screens/calendar_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/welcome_screen.dart';
import 'screens/paywall_screen.dart';
import 'services/home_widget_sync.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));
  // Load plate-calculator settings before first frame (best-effort).
  PlateSettings.instance.load();
  // Restore the persisted UI language BEFORE the first frame so the splash
  // shows in the user's chosen locale. Falls back to English on failure.
  await AppStrings.instance.load();
  // Warm up the notifications plugin in the background so the first user
  // interaction with the reminders UI doesn't pay the timezone-init cost.
  NotificationService.instance.initialise();
  // Point home_widget at the shared App Group so streak writes reach the
  // iOS home-screen widget (best-effort).
  HomeWidgetSync.init();
  runApp(const HeftorApp());
}

class HeftorApp extends StatelessWidget {
  const HeftorApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Rebuild every screen below MaterialApp when the language toggles —
    // simplest path to a one-frame switch without threading a Provider /
    // InheritedWidget through every leaf.
    return AnimatedBuilder(
      animation: AppStrings.instance,
      builder: (_, __) => MaterialApp(
        title: 'HEFTOR',
        theme: AppTheme.dark,
        debugShowCheckedModeBanner: false,
        // Tap anywhere outside a focused text field to dismiss the keyboard.
        // Wraps every screen once here; `translucent` lets taps still reach
        // the widgets underneath, and we only unfocus if something is focused.
        builder: (context, child) => GestureDetector(
          behavior: HitTestBehavior.translucent,
          onTap: () {
            final focus = FocusManager.instance.primaryFocus;
            if (focus != null && focus.hasFocus) focus.unfocus();
          },
          child: child,
        ),
        home: const AuthGate(),
      ),
    );
  }
}

/// Decides what the user sees on launch: a brief splash while the stored
/// session is restored, then either the login flow or the main app.
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

/// Pre-auth view a signed-out user is currently looking at.
enum _UnauthView { welcome, register, login }

class _AuthGateState extends State<AuthGate> {
  final AuthService _auth = AuthService();

  bool _loading = true;
  AuthUser? _user;
  _UnauthView _view = _UnauthView.welcome;

  // Once-per-session flag: when the user has just finished onboarding (or
  // signs in on a fresh install) we surface the paywall on top of
  // MainShell so they see the trial CTA before the app's chrome. The flag
  // resets on logout so the next account also gets the offer once.
  bool _paywallOfferQueued = false;
  bool _paywallOfferShown = false;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    final user = await _auth.restoreSession();
    if (!mounted) return;
    setState(() {
      _user = user;
      _view = _UnauthView.welcome;
      _loading = false;
    });
  }

  Future<void> _logout() async {
    await _auth.logout();
    if (mounted) {
      setState(() {
        _user = null;
        _view = _UnauthView.login;
        // Next account on this device gets the post-onboarding paywall too.
        _paywallOfferQueued = false;
        _paywallOfferShown = false;
      });
    }
  }

  /// Push the paywall as a full-screen modal once the MainShell has
  /// rendered. Runs after the first frame so the route stack is in a
  /// stable state. Idempotent — the `_paywallOfferShown` flag prevents
  /// repeats inside the same session.
  void _queuePostOnboardingPaywall() {
    if (_paywallOfferShown) return;
    _paywallOfferShown = true;
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      final sub = _user?.subscription;
      // Don't offer the paywall to users who are already Pro or have
      // already burned their trial — they came here for the app, not the
      // sales pitch.
      if (sub == null || sub.isPro || sub.hasUsedTrial) return;
      await Navigator.of(context).push(
        MaterialPageRoute(
          fullscreenDialog: true,
          builder: (_) => PaywallScreen(
            auth: _auth,
            onPurchased: (next) {
              if (!mounted) return;
              setState(() {
                _user = _user?.copyWith(subscription: next);
              });
            },
          ),
        ),
      );
    });
  }

  /// Authenticated but missing onboarding answers → fill them in now.
  bool get _needsOnboarding => _user != null && _user!.onboarding == null;

  @override
  Widget build(BuildContext context) {
    if (_loading) return const _Splash();

    // Post-auth gate: if the user signed in but has no onboarding data yet,
    // collect it before letting them into the main app.
    if (_user != null) {
      if (_needsOnboarding) {
        return OnboardingScreen(
          onComplete: (data) async {
            final messenger = ScaffoldMessenger.of(context);
            try {
              final updated = await _auth.saveOnboarding(data.toJson());
              if (!mounted) return;
              setState(() {
                _user = updated;
                // Brand-new account that just answered onboarding — queue
                // the paywall offer so MainShell's first frame brings it
                // up automatically.
                _paywallOfferQueued = true;
              });
            } catch (_) {
              if (!mounted) return;
              messenger.showSnackBar(
                SnackBar(
                  content: Text(t('onboarding.save_failed')),
                ),
              );
            }
          },
        );
      }
      if (_paywallOfferQueued) _queuePostOnboardingPaywall();
      return MainShell(auth: _auth, onLogout: _logout);
    }

    switch (_view) {
      case _UnauthView.welcome:
        return WelcomeScreen(
          onRegister: () => setState(() => _view = _UnauthView.register),
          onSignIn: () => setState(() => _view = _UnauthView.login),
        );
      case _UnauthView.register:
        return RegisterScreen(
          auth: _auth,
          // Onboarding now happens AFTER registration — no payload here.
          onboarding: null,
          onAuthenticated: (user) => setState(() => _user = user),
          onBack: () => setState(() => _view = _UnauthView.welcome),
          onLoginInstead: () => setState(() => _view = _UnauthView.login),
        );
      case _UnauthView.login:
        return LoginScreen(
          auth: _auth,
          onAuthenticated: (user) => setState(() => _user = user),
          onRegisterInstead: () => setState(() => _view = _UnauthView.register),
        );
    }
  }
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('HEFTOR',
                style: TextStyle(
                    fontSize: 14,
                    letterSpacing: 5,
                    fontWeight: FontWeight.w800,
                    color: AppColors.onSurface)),
            SizedBox(height: 20),
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ],
        ),
      ),
    );
  }
}

class MainShell extends StatefulWidget {
  final AuthService auth;
  final VoidCallback onLogout;

  const MainShell({
    super.key,
    required this.auth,
    required this.onLogout,
  });

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> with SingleTickerProviderStateMixin {
  int _index = 0;

  late final AnimationController _fade = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 250),
    value: 1,
  );

  void _select(int i) {
    if (i == _index) return;
    setState(() => _index = i);
    _fade.forward(from: 0);
  }

  @override
  void dispose() {
    _fade.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      DashboardScreen(auth: widget.auth, onLogout: widget.onLogout),
      TrainingsListScreen(auth: widget.auth),
      HyroxScreen(auth: widget.auth),
      const ProgressScreen(),
      CalendarScreen(auth: widget.auth),
    ];
    return Scaffold(
      body: FadeTransition(
        opacity: CurvedAnimation(parent: _fade, curve: Curves.easeOut),
        child: screens[_index],
      ),
      bottomNavigationBar: _BottomNav(index: _index, onSelect: _select),
    );
  }
}

class _BottomNav extends StatelessWidget {
  final int index;
  final ValueChanged<int> onSelect;

  const _BottomNav({required this.index, required this.onSelect});

  static const _items = [
    (Icons.home_outlined, Icons.home),
    (Icons.fitness_center_outlined, Icons.fitness_center),
    (Icons.sports_score_outlined, Icons.sports_score),
    (Icons.trending_up_outlined, Icons.trending_up),
    (Icons.calendar_today_outlined, Icons.calendar_today),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.background,
      padding: EdgeInsets.only(
        top: 8,
        bottom: 8 + MediaQuery.of(context).padding.bottom,
      ),
      child: Row(
        children: List.generate(_items.length, (i) {
          final selected = i == index;
          return Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => onSelect(i),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    selected ? _items[i].$2 : _items[i].$1,
                    color: selected ? AppColors.onSurface : AppColors.muted,
                    size: 24,
                  ),
                  const SizedBox(height: 6),
                  Container(
                    width: 4,
                    height: 4,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: selected ? AppColors.onSurface : Colors.transparent,
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }
}
