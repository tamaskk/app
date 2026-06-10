import 'package:flutter/material.dart';
import '../i18n/app_strings.dart';
import '../models/auth.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';

/// HEFTOR Pro paywall.
///
/// Shows the monthly / yearly toggle, the feature list and a single
/// primary CTA. New users get a "Start 3-day free trial" CTA; users who
/// have already burned their trial get a "Subscribe" CTA that purchases
/// immediately. On success [onPurchased] fires with the fresh
/// [Subscription] so the caller can refresh whatever it gated.
///
/// Receipt validation: this MVP calls the backend `/purchase` endpoint
/// with `provider: 'manual'` and no receipt blob. When `in_app_purchase`
/// gets wired the `_purchase` method below is the only function that
/// changes — the rest of the screen stays as-is.
class PaywallScreen extends StatefulWidget {
  final AuthService auth;
  final ValueChanged<Subscription>? onPurchased;

  const PaywallScreen({
    super.key,
    required this.auth,
    this.onPurchased,
  });

  @override
  State<PaywallScreen> createState() => _PaywallScreenState();
}

class _PaywallScreenState extends State<PaywallScreen> {
  String _plan = 'yearly'; // default-highlight the annual plan
  bool _busy = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final sub = widget.auth.user?.subscription ?? const Subscription.free();
    final canTrial = !sub.hasUsedTrial && !sub.isPro;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Close button (top-left).
              Align(
                alignment: Alignment.centerLeft,
                child: GestureDetector(
                  onTap: () => Navigator.of(context).maybePop(),
                  behavior: HitTestBehavior.opaque,
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 12),
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceLow,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.close,
                        color: AppColors.onSurface, size: 20),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                t('paywall.title'),
                style: const TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -1.5,
                  color: AppColors.onSurface,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                t('paywall.subtitle'),
                style: const TextStyle(
                  fontSize: 15,
                  color: AppColors.muted,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 28),

              // Feature list.
              _features(),
              const SizedBox(height: 28),

              // Plan picker.
              _planCard(
                planId: 'yearly',
                title: t('paywall.plan_yearly'),
                priceMain: t('paywall.price_yearly_total'),
                priceSub: t('paywall.price_yearly_effective'),
                badge: t('paywall.save_badge'),
              ),
              const SizedBox(height: 10),
              _planCard(
                planId: 'monthly',
                title: t('paywall.plan_monthly'),
                priceMain: t('paywall.price_monthly'),
                priceSub: null,
                badge: null,
              ),

              const SizedBox(height: 24),
              if (_error != null) ...[
                Text(
                  _error!,
                  style: const TextStyle(
                      color: AppColors.accentRed, fontSize: 13),
                ),
                const SizedBox(height: 12),
              ],
              if (!canTrial && sub.hasUsedTrial) ...[
                Text(
                  t('paywall.trial_used'),
                  style: const TextStyle(color: AppColors.muted, fontSize: 12),
                ),
                const SizedBox(height: 10),
              ],

              // Primary CTA — trial if available, otherwise direct subscribe.
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  style: TextButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.background,
                    disabledBackgroundColor: AppColors.surfaceHigh,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(100)),
                  ),
                  onPressed: _busy ? null : _onPrimaryCta,
                  child: _busy
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: AppColors.background),
                        )
                      : Text(
                          canTrial
                              ? t('paywall.trial_cta')
                              : t('paywall.subscribe_cta'),
                          style: const TextStyle(
                              fontWeight: FontWeight.w800, fontSize: 15),
                        ),
                ),
              ),
              const SizedBox(height: 12),
              Center(
                child: TextButton(
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.muted,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 8),
                  ),
                  onPressed: _busy ? null : _onRestore,
                  child: Text(
                    t('paywall.restore'),
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                t('paywall.fineprint'),
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.muted,
                    height: 1.4),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _features() {
    final items = [
      t('paywall.feature_unlimited_workouts'),
      t('paywall.feature_engine'),
      t('paywall.feature_history'),
      t('paywall.feature_plan'),
      t('paywall.feature_pr_detect'),
      t('paywall.feature_stories'),
      t('paywall.feature_priority'),
    ];
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceLow,
        borderRadius: BorderRadius.circular(20),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++)
            Padding(
              padding: EdgeInsets.only(top: i == 0 ? 0 : 10),
              child: Row(
                children: [
                  const Icon(Icons.check,
                      color: AppColors.onSurface, size: 18),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      items[i],
                      style: const TextStyle(
                          fontSize: 14,
                          color: AppColors.onSurface,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _planCard({
    required String planId,
    required String title,
    required String priceMain,
    required String? priceSub,
    required String? badge,
  }) {
    final selected = _plan == planId;
    return GestureDetector(
      onTap: () => setState(() => _plan = planId),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? AppColors.onSurface : AppColors.outline,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            // Radio.
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: selected ? AppColors.onSurface : AppColors.muted,
                  width: 2,
                ),
              ),
              alignment: Alignment.center,
              child: selected
                  ? Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.onSurface,
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppColors.onSurface),
                      ),
                      if (badge != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.onSurface,
                            borderRadius: BorderRadius.circular(100),
                          ),
                          child: Text(
                            badge,
                            style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.5,
                                color: AppColors.background),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    priceMain,
                    style: const TextStyle(
                        fontSize: 14, color: AppColors.onSurface),
                  ),
                  if (priceSub != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      priceSub,
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.muted),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _onPrimaryCta() async {
    final sub = widget.auth.user?.subscription ?? const Subscription.free();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      Subscription next;
      if (!sub.hasUsedTrial && !sub.isPro) {
        // Free 3-day trial — first.
        next = await widget.auth.startTrial();
      } else {
        // Direct purchase. Real IAP comes in here later; for now the
        // backend grants the entitlement on faith so the flow is testable
        // end-to-end without App Store / Play Console setup.
        next = await widget.auth.purchase(
          plan: _plan,
          provider: 'manual',
        );
      }
      if (!mounted) return;
      widget.onPurchased?.call(next);
      Navigator.of(context).maybePop();
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = t('paywall.purchase_failed'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _onRestore() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      // Real restore goes through StoreKit / Play Billing once wired. For
      // now we just re-fetch the canonical state from the server.
      final next = await widget.auth.getSubscription();
      if (!mounted) return;
      widget.onPurchased?.call(next);
      if (next.isPro && mounted) Navigator.of(context).maybePop();
    } catch (_) {
      if (mounted) setState(() => _error = t('paywall.purchase_failed'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}
