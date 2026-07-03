// Single source of truth for HEFTOR Pro pricing + entitlement checks.
//
// The mobile app, paywall page, admin panel and the backend all import from
// here so a price change is a one-line edit.

/** Pricing in Hungarian forint, end-user price (App Store cut not deducted). */
export const PRICING = {
  monthly: {
    amountHuf: 2490,
    productId: 'heftor_pro_monthly',
  },
  yearly: {
    amountHuf: 17990,
    productId: 'heftor_pro_yearly',
  },
} as const;

/** Free trial length. Single trial per account, ever. */
export const TRIAL_DAYS = 3;

/** Free-tier ceilings. */
export const FREE_TIER = {
  maxSavedWorkouts: 2,
  // The rest of the free experience is feature-gated, not count-gated:
  //   • engine progression suggestions: hidden
  //   • progress history: last 30 days only
  //   • generated workout stories: hidden
} as const;

export type SubscriptionPlan = 'monthly' | 'yearly';
export type SubscriptionStatus =
  | 'free'
  | 'trialing'
  | 'active'
  | 'cancelled'
  | 'expired';
export type SubscriptionProvider = 'apple' | 'google' | 'stripe' | 'manual';

export interface SubscriptionState {
  status: SubscriptionStatus;
  plan: SubscriptionPlan | null;
  provider: SubscriptionProvider | null;
  productId: string | null;
  trialUsedAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  lastValidatedAt: Date | null;
}

/**
 * Returns true when the user currently has access to Pro features. A
 * `cancelled` subscription still grants access until `currentPeriodEnd`
 * passes — the user paid for that window.
 */
export function hasProAccess(sub: Partial<SubscriptionState> | null | undefined): boolean {
  if (!sub) return false;
  const now = Date.now();
  if (sub.status === 'trialing') {
    return sub.trialEndsAt != null && new Date(sub.trialEndsAt).getTime() > now;
  }
  if (sub.status === 'active' || sub.status === 'cancelled') {
    return (
      sub.currentPeriodEnd != null &&
      new Date(sub.currentPeriodEnd).getTime() > now
    );
  }
  return false;
}

/** Client-safe shape — strip the raw receipt before sending to the app. */
export function publicSubscription(
  sub: Partial<SubscriptionState> | null | undefined,
): Omit<SubscriptionState, 'rawReceipt'> & { isPro: boolean } {
  const safe: SubscriptionState = {
    status: (sub?.status as SubscriptionStatus) ?? 'free',
    plan: sub?.plan ?? null,
    provider: sub?.provider ?? null,
    productId: sub?.productId ?? null,
    trialUsedAt: sub?.trialUsedAt ?? null,
    trialEndsAt: sub?.trialEndsAt ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    lastValidatedAt: sub?.lastValidatedAt ?? null,
  };
  return { ...safe, isPro: hasProAccess(safe) };
}
