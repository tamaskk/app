// Ported 1:1 from apps/mobile/lib/screens/paywall_screen.dart.
//
// HEFTOR Pro paywall. Shows the monthly / yearly toggle, the feature list and a
// single primary CTA. New users get a "Start 3-day free trial" CTA; users who
// have already burned their trial get a "Subscribe" CTA that purchases
// immediately. On success onPurchased fires with the fresh Subscription so the
// caller can refresh whatever it gated.
//
// Receipt validation: this MVP calls the backend `/purchase` endpoint with
// `provider: 'manual'` and no receipt blob. When in-app-purchase gets wired the
// `onPrimaryCta` method below is the only function that changes.
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Screen } from "../components/ui";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";
import { useAuth } from "../context/AuthContext";
import { AuthException } from "../lib/authService";
import { Subscription } from "../models/auth";
import type { RootNav } from "../navigation/types";

export function PaywallScreen({
  navigation,
  onPurchased,
}: {
  navigation: RootNav;
  onPurchased?: (sub: Subscription) => void;
}) {
  const { t } = useLang();
  const { auth, user } = useAuth();

  const [plan, setPlan] = useState<string>("yearly"); // default-highlight the annual plan
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sub = user?.subscription ?? Subscription.free();
  const canTrial = !sub.hasUsedTrial && !sub.isPro;

  async function onPrimaryCta() {
    const cur = auth.user?.subscription ?? Subscription.free();
    setBusy(true);
    setError(null);
    try {
      let next: Subscription;
      if (!cur.hasUsedTrial && !cur.isPro) {
        // Free 3-day trial — first.
        next = await auth.startTrial();
      } else {
        // Direct purchase. Real IAP comes in here later; for now the backend
        // grants the entitlement on faith so the flow is testable end-to-end
        // without App Store / Play Console setup.
        next = await auth.purchase({ plan, provider: "manual" });
      }
      onPurchased?.(next);
      navigation.goBack();
    } catch (e) {
      if (e instanceof AuthException) {
        setError(e.message);
      } else {
        setError(t("paywall.purchase_failed"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function onRestore() {
    setBusy(true);
    setError(null);
    try {
      // Real restore goes through StoreKit / Play Billing once wired. For now we
      // just re-fetch the canonical state from the server.
      const next = await auth.getSubscription();
      onPurchased?.(next);
      if (next.isPro) navigation.goBack();
    } catch {
      setError(t("paywall.purchase_failed"));
    } finally {
      setBusy(false);
    }
  }

  const features = [
    t("paywall.feature_unlimited_workouts"),
    t("paywall.feature_engine"),
    t("paywall.feature_history"),
    t("paywall.feature_plan"),
    t("paywall.feature_pr_detect"),
    t("paywall.feature_stories"),
    t("paywall.feature_priority"),
  ];

  function planCard(opts: {
    planId: string;
    title: string;
    priceMain: string;
    priceSub: string | null;
    badge: string | null;
  }) {
    const selected = plan === opts.planId;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setPlan(opts.planId)}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderRadius: 20,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? AppColors.onSurface : AppColors.outline,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* Radio. */}
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: selected ? AppColors.onSurface : AppColors.muted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {selected ? (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: AppColors.onSurface,
                }}
              />
            ) : null}
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "800",
                  color: AppColors.onSurface,
                }}
              >
                {opts.title}
              </Text>
              {opts.badge != null ? (
                <>
                  <View style={{ width: 8 }} />
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      backgroundColor: AppColors.onSurface,
                      borderRadius: 100,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "800",
                        letterSpacing: 1.5,
                        color: AppColors.background,
                      }}
                    >
                      {opts.badge}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
            <View style={{ height: 4 }} />
            <Text style={{ fontSize: 14, color: AppColors.onSurface }}>
              {opts.priceMain}
            </Text>
            {opts.priceSub != null ? (
              <>
                <View style={{ height: 2 }} />
                <Text style={{ fontSize: 12, color: AppColors.muted }}>
                  {opts.priceSub}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 24,
        }}
      >
        {/* Close button (top-left). */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={{
            alignSelf: "flex-start",
            marginVertical: 12,
            width: 36,
            height: 36,
            backgroundColor: AppColors.surfaceLow,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="close" color={AppColors.onSurface} size={20} />
        </TouchableOpacity>

        <View style={{ height: 8 }} />
        <Text
          style={{
            fontSize: 36,
            fontWeight: "800",
            letterSpacing: -1.5,
            color: AppColors.onSurface,
          }}
        >
          {t("paywall.title")}
        </Text>
        <View style={{ height: 8 }} />
        <Text
          style={{
            fontSize: 15,
            color: AppColors.muted,
            lineHeight: 15 * 1.5,
          }}
        >
          {t("paywall.subtitle")}
        </Text>
        <View style={{ height: 28 }} />

        {/* Feature list. */}
        <View
          style={{
            backgroundColor: AppColors.surfaceLow,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          {features.map((item, i) => (
            <View
              key={i}
              style={{
                marginTop: i === 0 ? 0 : 10,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <MaterialIcons name="check" color={AppColors.onSurface} size={18} />
              <View style={{ width: 12 }} />
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: AppColors.onSurface,
                  fontWeight: "600",
                }}
              >
                {item}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ height: 28 }} />

        {/* Plan picker. */}
        {planCard({
          planId: "yearly",
          title: t("paywall.plan_yearly"),
          priceMain: t("paywall.price_yearly_total"),
          priceSub: t("paywall.price_yearly_effective"),
          badge: t("paywall.save_badge"),
        })}
        <View style={{ height: 10 }} />
        {planCard({
          planId: "monthly",
          title: t("paywall.plan_monthly"),
          priceMain: t("paywall.price_monthly"),
          priceSub: null,
          badge: null,
        })}

        <View style={{ height: 24 }} />
        {error != null ? (
          <>
            <Text style={{ color: AppColors.accentRed, fontSize: 13 }}>{error}</Text>
            <View style={{ height: 12 }} />
          </>
        ) : null}
        {!canTrial && sub.hasUsedTrial ? (
          <>
            <Text style={{ color: AppColors.muted, fontSize: 12 }}>
              {t("paywall.trial_used")}
            </Text>
            <View style={{ height: 10 }} />
          </>
        ) : null}

        {/* Primary CTA — trial if available, otherwise direct subscribe. */}
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={busy}
          onPress={onPrimaryCta}
          style={{
            width: "100%",
            paddingVertical: 18,
            borderRadius: 100,
            backgroundColor: busy ? AppColors.surfaceHigh : AppColors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {busy ? (
            <ActivityIndicator size="small" color={AppColors.background} />
          ) : (
            <Text
              style={{
                fontWeight: "800",
                fontSize: 15,
                color: AppColors.background,
              }}
            >
              {canTrial ? t("paywall.trial_cta") : t("paywall.subscribe_cta")}
            </Text>
          )}
        </TouchableOpacity>
        <View style={{ height: 12 }} />
        <View style={{ alignItems: "center" }}>
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={busy}
            onPress={onRestore}
            style={{ paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: AppColors.muted,
              }}
            >
              {t("paywall.restore")}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 16 }} />
        <Text
          style={{
            fontSize: 11,
            color: AppColors.muted,
            lineHeight: 11 * 1.4,
            textAlign: "center",
          }}
        >
          {t("paywall.fineprint")}
        </Text>
      </ScrollView>
    </Screen>
  );
}
