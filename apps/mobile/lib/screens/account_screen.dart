import 'package:flutter/material.dart';
import '../i18n/app_strings.dart';
import '../models/auth.dart';
import '../models/rank.dart';
import '../theme/app_theme.dart';
import '../services/auth_service.dart';
import '../services/plate_settings.dart';
import '../utils/plates.dart';
import '../widgets/rank_card.dart';
import 'auth_widgets.dart';
import 'leaderboard_screen.dart';
import 'paywall_screen.dart';

class AccountScreen extends StatefulWidget {
  final AuthService auth;
  final VoidCallback onLoggedOut;

  const AccountScreen({
    super.key,
    required this.auth,
    required this.onLoggedOut,
  });

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  late final _name =
      TextEditingController(text: widget.auth.user?.name ?? '');
  final _currentPw = TextEditingController();
  final _newPw = TextEditingController();

  // Plate-calculator settings (device-local).
  final _barWeight = TextEditingController(
      text: fmtPlate(PlateSettings.instance.barWeight));
  final _addPlate = TextEditingController();
  late List<double> _plates = List.of(PlateSettings.instance.availablePlates);

  bool _savingName = false;
  bool _savingPw = false;
  bool _deleting = false;

  // Rank summary — loaded lazily so the screen renders instantly with the
  // cached AuthUser xp/rank and updates when the live data arrives.
  Map<String, dynamic>? _rank;
  bool _rankLoading = true;

  @override
  void initState() {
    super.initState();
    _loadRank();
  }

  Future<void> _loadRank() async {
    try {
      final data = await widget.auth.getRankSummary();
      if (mounted) {
        setState(() {
          _rank = data;
          _rankLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _rankLoading = false);
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _currentPw.dispose();
    _newPw.dispose();
    _barWeight.dispose();
    _addPlate.dispose();
    super.dispose();
  }

  Future<void> _savePlates() async {
    FocusScope.of(context).unfocus();
    final bar = double.tryParse(_barWeight.text.replaceAll(',', '.'));
    await PlateSettings.instance
        .update(barWeight: bar, availablePlates: _plates);
    if (!mounted) return;
    setState(() => _plates = List.of(PlateSettings.instance.availablePlates));
    _barWeight.text = fmtPlate(PlateSettings.instance.barWeight);
    _snack(t('account.settings_saved'));
  }

  void _addPlateValue() {
    final v = double.tryParse(_addPlate.text.replaceAll(',', '.'));
    if (v == null || v <= 0) return;
    setState(() {
      if (!_plates.contains(v)) _plates.add(v);
      _plates.sort((a, b) => b.compareTo(a));
    });
    _addPlate.clear();
  }

  Future<void> _resetPlates() async {
    await PlateSettings.instance.resetToDefaults();
    if (!mounted) return;
    setState(() => _plates = List.of(PlateSettings.instance.availablePlates));
    _barWeight.text = fmtPlate(PlateSettings.instance.barWeight);
    _snack(t('common.reset'));
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _saveName() async {
    FocusScope.of(context).unfocus();
    setState(() => _savingName = true);
    try {
      await widget.auth.updateProfile(name: _name.text.trim());
      _snack(t('account.profile_saved'));
    } on AuthException catch (e) {
      _snack(e.message);
    } catch (_) {
      _snack(t('account.couldnt_save'));
    } finally {
      if (mounted) setState(() => _savingName = false);
    }
  }

  Future<void> _changePassword() async {
    FocusScope.of(context).unfocus();
    if (_newPw.text.length < 6) {
      _snack(t('auth.password_too_short'));
      return;
    }
    setState(() => _savingPw = true);
    try {
      await widget.auth.changePassword(
        currentPassword: _currentPw.text,
        newPassword: _newPw.text,
      );
      _currentPw.clear();
      _newPw.clear();
      _snack(t('account.password_changed'));
    } on AuthException catch (e) {
      _snack(e.message);
    } catch (_) {
      _snack(t('account.couldnt_change'));
    } finally {
      if (mounted) setState(() => _savingPw = false);
    }
  }

  void _logout() {
    widget.onLoggedOut();
    Navigator.of(context).maybePop();
  }

  Future<void> _deleteAccount() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceLow,
        title: Text(t('account.delete_confirm_title'),
            style: const TextStyle(color: AppColors.onSurface)),
        content: Text(
          t('account.delete_confirm_body'),
          style: const TextStyle(color: AppColors.muted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(t('common.cancel'),
                style: const TextStyle(color: AppColors.muted)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(t('common.delete'),
                style: const TextStyle(
                    color: AppColors.accentRed, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => _deleting = true);
    try {
      await widget.auth.deleteAccount();
      if (!mounted) return;
      widget.onLoggedOut();
      Navigator.of(context).maybePop();
    } on AuthException catch (e) {
      _snack(e.message);
      if (mounted) setState(() => _deleting = false);
    } catch (_) {
      _snack(t('account.delete_failed'));
      if (mounted) setState(() => _deleting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.auth.user;
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(color: AppColors.onSurface),
        title: Text(t('account.title')),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        children: [
          // Avatar + email.
          Center(
            child: Column(
              children: [
                Container(
                  width: 72,
                  height: 72,
                  decoration: const BoxDecoration(
                    color: AppColors.surfaceLow,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.person,
                      color: AppColors.onSurface, size: 36),
                ),
                const SizedBox(height: 12),
                Text(
                  (user?.name.trim().isNotEmpty ?? false)
                      ? user!.name
                      : (user?.email ?? ''),
                  style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface),
                ),
                if (user?.email != null)
                  Text(user!.email,
                      style:
                          const TextStyle(color: AppColors.muted, fontSize: 14)),
              ],
            ),
          ),
          const SizedBox(height: 28),
          _rankSection(),
          const SizedBox(height: 32),

          _label(t('account.profile')),
          const SizedBox(height: 12),
          AuthField(controller: _name, label: t('auth.name')),
          const SizedBox(height: 12),
          AuthButton(
              label: t('common.save'),
              loading: _savingName,
              onPressed: _saveName),
          const SizedBox(height: 32),

          _subscriptionSection(),
          const SizedBox(height: 32),

          _languageSection(),
          const SizedBox(height: 32),

          _label(t('account.change_password')),
          const SizedBox(height: 12),
          AuthField(
              controller: _currentPw,
              label: t('auth.current_password'),
              obscure: true),
          const SizedBox(height: 12),
          AuthField(
              controller: _newPw,
              label: t('auth.new_password'),
              obscure: true),
          const SizedBox(height: 12),
          AuthButton(
              label: t('account.change_password'),
              loading: _savingPw,
              onPressed: _changePassword),
          const SizedBox(height: 32),

          _label(t('account.plate_calculator')),
          const SizedBox(height: 12),
          AuthField(
              controller: _barWeight,
              label: t('account.bar_weight'),
              keyboardType: const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: 16),
          Text(t('account.available_plates'),
              style: const TextStyle(color: AppColors.muted, fontSize: 13)),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final p in _plates)
                GestureDetector(
                  onTap: () => setState(() => _plates.remove(p)),
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      border: Border.fromBorderSide(
                          const BorderSide(color: AppColors.outline)),
                      borderRadius: BorderRadius.circular(100),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(fmtPlate(p),
                            style: const TextStyle(
                                color: AppColors.onSurface,
                                fontSize: 14,
                                fontWeight: FontWeight.w600)),
                        const SizedBox(width: 6),
                        const Icon(Icons.close,
                            size: 14, color: AppColors.muted),
                      ],
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: AuthField(
                    controller: _addPlate,
                    label: t('account.add_plate'),
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true)),
              ),
              const SizedBox(width: 10),
              IconButton(
                onPressed: _addPlateValue,
                icon: const Icon(Icons.add_circle_outline,
                    color: AppColors.onSurface),
                tooltip: t('common.add'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          AuthButton(
              label: t('common.save'), loading: false, onPressed: _savePlates),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              style: TextButton.styleFrom(foregroundColor: AppColors.muted),
              onPressed: _resetPlates,
              child: Text(t('common.reset')),
            ),
          ),
          const SizedBox(height: 32),

          // Logout.
          SizedBox(
            width: double.infinity,
            child: TextButton(
              style: TextButton.styleFrom(
                foregroundColor: AppColors.onSurface,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: AppColors.outline),
                ),
              ),
              onPressed: _logout,
              child: Text(t('account.logout'),
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 15)),
            ),
          ),
          const SizedBox(height: 12),

          // Delete account.
          SizedBox(
            width: double.infinity,
            child: TextButton(
              style: TextButton.styleFrom(
                foregroundColor: AppColors.accentRed,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              onPressed: _deleting ? null : _deleteAccount,
              child: _deleting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: AppColors.accentRed),
                    )
                  : Text(t('account.delete_account'),
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 15)),
            ),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------
  // Subscription section
  // ---------------------------------------------------------------------

  /// Subscription status card + a single CTA. Three shapes:
  ///   • Free / Expired: "Upgrade to Pro" → PaywallScreen
  ///   • Trialing / Active: "Manage subscription" → PaywallScreen (so the
  ///     user can change plans) + "Cancel subscription" link
  ///   • Cancelled: read-only ("Cancelled · until {date}"), no CTA
  Widget _subscriptionSection() {
    final sub =
        widget.auth.user?.subscription ?? const Subscription.free();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _label(t('subscription.section')),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          decoration: BoxDecoration(
            color: AppColors.surfaceLow,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  _statusBadge(sub),
                  const Spacer(),
                  if (sub.currentPeriodEnd != null && sub.isPro)
                    Text(
                      _fmtDate(sub.currentPeriodEnd!),
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.muted),
                    ),
                ],
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  style: TextButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.background,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(100)),
                  ),
                  onPressed: _openPaywall,
                  child: Text(
                    sub.isPro
                        ? t('subscription.cta_manage')
                        : t('subscription.cta_upgrade'),
                    style: const TextStyle(
                        fontWeight: FontWeight.w800, fontSize: 14),
                  ),
                ),
              ),
              if (sub.isPro &&
                  (sub.status == 'trialing' || sub.status == 'active')) ...[
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.center,
                  child: TextButton(
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.muted,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                    ),
                    onPressed: _cancelSubscription,
                    child: Text(
                      t('subscription.cancel'),
                      style: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _statusBadge(Subscription sub) {
    String label;
    Color bg;
    Color fg;
    switch (sub.status) {
      case 'trialing':
        label = tFmt('subscription.status_trialing',
            {'days': sub.trialDaysLeft ?? 0});
        bg = AppColors.onSurface;
        fg = AppColors.background;
        break;
      case 'active':
        label = sub.plan == 'yearly'
            ? t('subscription.status_active_yearly')
            : t('subscription.status_active_monthly');
        bg = AppColors.onSurface;
        fg = AppColors.background;
        break;
      case 'cancelled':
        label = tFmt('subscription.status_cancelled', {
          'date': sub.currentPeriodEnd == null
              ? ''
              : _fmtDate(sub.currentPeriodEnd!),
        });
        bg = AppColors.surfaceHigh;
        fg = AppColors.onSurface;
        break;
      case 'expired':
        label = t('subscription.status_expired');
        bg = AppColors.surfaceHigh;
        fg = AppColors.muted;
        break;
      default:
        label = t('subscription.status_free');
        bg = AppColors.surfaceHigh;
        fg = AppColors.onSurface;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(100),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: fg,
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Future<void> _openPaywall() async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => PaywallScreen(
          auth: widget.auth,
          onPurchased: (_) {
            if (mounted) setState(() {});
          },
        ),
      ),
    );
    // Whether or not the user purchased, refresh the local state.
    if (mounted) setState(() {});
  }

  Future<void> _cancelSubscription() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceLow,
        title: Text(t('subscription.cancel_confirm_title'),
            style: const TextStyle(color: AppColors.onSurface)),
        content: Text(t('subscription.cancel_confirm_body'),
            style: const TextStyle(color: AppColors.muted)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(t('common.no'),
                style: const TextStyle(color: AppColors.muted)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              t('subscription.cancel'),
              style: const TextStyle(
                  color: AppColors.accentRed, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await widget.auth.cancelSubscription();
      if (mounted) setState(() {});
    } on AuthException catch (e) {
      _snack(e.message);
    } catch (_) {
      _snack(t('common.error'));
    }
  }

  /// `YYYY-MM-DD` so the formatter matches the admin app (and stays
  /// locale-stable until we add proper date i18n).
  String _fmtDate(DateTime d) {
    String two(int n) => n < 10 ? '0$n' : '$n';
    return '${d.year}-${two(d.month)}-${two(d.day)}';
  }

  /// Language switcher — EN / HU pill toggle. Updates the singleton; the
  /// root MaterialApp listens to it and rebuilds the whole tree, so the
  /// switch lands instantly across every visible screen.
  Widget _languageSection() {
    final isHu = AppStrings.instance.isHu;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _label(t('account.language')),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: AppColors.surfaceLow,
            borderRadius: BorderRadius.circular(100),
          ),
          child: Row(
            children: [
              Expanded(
                child: _langPill(
                  label: t('account.language_en'),
                  active: !isHu,
                  onTap: () => AppStrings.instance.setLang('en'),
                ),
              ),
              Expanded(
                child: _langPill(
                  label: t('account.language_hu'),
                  active: isHu,
                  onTap: () => AppStrings.instance.setLang('hu'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _langPill({
    required String label,
    required bool active,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: active ? AppColors.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(100),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            color: active ? AppColors.background : AppColors.onSurface,
            fontSize: 14,
            fontWeight: active ? FontWeight.w800 : FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Text(
        text.toUpperCase(),
        style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.5,
            color: AppColors.muted),
      );

  /// Rank hero + weekly XP breakdown. While the /me/rank request is in
  /// flight we still render the card from the locally cached xp/rank — it's
  /// always at most a few seconds stale and the screen never blanks.
  Widget _rankSection() {
    final user = widget.auth.user;
    // Prefer live data when it has arrived; otherwise fall back to cached.
    final liveRankJson = _rank?['rank'] as Map<String, dynamic>?;
    final liveNextJson = _rank?['nextRank'] as Map<String, dynamic>?;
    final cachedXp = user?.xp ?? 0;
    final cachedRank = rankForTier(user?.rank ?? 1);
    final cachedNext = nextRankAfter(cachedRank.tier);

    final rank = liveRankJson != null
        ? RankDef.fromJson(liveRankJson)
        : cachedRank;
    final next = liveNextJson != null
        ? RankDef.fromJson(liveNextJson)
        : cachedNext;
    final xp = (_rank?['xp'] as num?)?.toInt() ?? cachedXp;
    final percent = (_rank?['percentToNext'] as num?)?.toDouble() ??
        _localPercent(xp, rank, next);
    final weeklyXp = (_rank?['weeklyXp'] as num?)?.toInt();
    final weeklyBySource =
        (_rank?['weeklyBySource'] as Map?)?.cast<String, dynamic>() ?? const {};

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _label(t('account.rank')),
        const SizedBox(height: 12),
        RankCard(
          rank: rank,
          xp: xp,
          nextRank: next,
          percentToNext: percent,
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => LeaderboardScreen(auth: widget.auth),
            ),
          ),
          behavior: HitTestBehavior.opaque,
          child: Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: AppColors.surfaceLow,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    t('account.world_leaderboard'),
                    style: const TextStyle(
                      fontSize: 12,
                      letterSpacing: 1.6,
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface,
                    ),
                  ),
                ),
                const Icon(Icons.chevron_right,
                    color: AppColors.muted, size: 20),
              ],
            ),
          ),
        ),
        if (weeklyXp != null && weeklyXp > 0) ...[
          const SizedBox(height: 20),
          _label(tFmt('account.this_week_xp', {'xp': weeklyXp})),
          const SizedBox(height: 12),
          _weeklyBreakdown(weeklyBySource),
        ],
        if (_rankLoading && _rank == null) ...[
          const SizedBox(height: 12),
          const Center(
            child: SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                  strokeWidth: 2, color: AppColors.muted),
            ),
          ),
        ],
      ],
    );
  }

  double _localPercent(int xp, RankDef current, RankDef? next) {
    if (next == null) return 1;
    final span = next.threshold - current.threshold;
    if (span <= 0) return 0;
    return ((xp - current.threshold) / span).clamp(0.0, 1.0);
  }

  Widget _weeklyBreakdown(Map<String, dynamic> bySource) {
    final labels = {
      'sets': t('rank.sets'),
      'session': t('rank.session'),
      'pr': t('rank.pr'),
      'weekly_goal': t('rank.weekly_goal'),
      'streak': t('rank.streak'),
    };
    final entries = bySource.entries.toList()
      ..sort((a, b) =>
          ((b.value as num).toInt()).compareTo((a.value as num).toInt()));
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 18),
      decoration: BoxDecoration(
        color: AppColors.surfaceLow,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          for (var i = 0; i < entries.length; i++)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                border: i == 0
                    ? null
                    : const Border(top: BorderSide(color: AppColors.outline)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      labels[entries[i].key] ?? entries[i].key.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.onSurface,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  Text(
                    '+${(entries[i].value as num).toInt()}',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface,
                      letterSpacing: -0.3,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
