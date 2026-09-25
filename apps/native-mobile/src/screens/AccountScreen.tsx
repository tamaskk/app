// Ported 1:1 from apps/mobile/lib/screens/account_screen.dart.
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Keyboard,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Screen, AuthField, AuthButton } from "../components/ui";
import { BackChip } from "../components/BackChip";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";
import { useAuth } from "../context/AuthContext";
import { AuthException } from "../lib/authService";
import { Subscription } from "../models/auth";
import { RankDef, rankForTier, nextRankAfter } from "../models/rank";
import { plateSettings } from "../lib/plateSettings";
import { fmtPlate } from "../utils/plates";
import type { RootNav } from "../navigation/types";

/** Parse a decimal that may use ',' as the decimal separator. */
function parseNum(text: string): number | undefined {
  const n = parseFloat(text.replace(/,/g, "."));
  return Number.isFinite(n) ? n : undefined;
}

function formatXp(xp: number): string {
  if (xp >= 1000) {
    const v = xp / 1000;
    return `${(v >= 10 ? v.toFixed(0) : v.toFixed(1)).replace(".", ",")}K`;
  }
  return String(xp);
}

function localPercent(xp: number, current: RankDef, next: RankDef | null): number {
  if (next == null) return 1;
  const span = next.threshold - current.threshold;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (xp - current.threshold) / span));
}

/** `YYYY-MM-DD` so the formatter matches the admin app. */
function fmtDate(d: Date): string {
  const two = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

export function AccountScreen({
  navigation,
  onLogout,
}: {
  navigation: RootNav;
  onLogout?: () => void;
}) {
  const { t, isHu, setLang } = useLang();
  const { auth, user, setUser, logout } = useAuth();

  const [name, setName] = useState(auth.user?.name ?? "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");

  // Plate-calculator settings (device-local).
  const [barWeight, setBarWeight] = useState(() => fmtPlate(plateSettings.barWeight));
  const [addPlate, setAddPlate] = useState("");
  const [plates, setPlates] = useState<number[]>(() => [...plateSettings.availablePlates]);

  const [savingName, setSavingName] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Rank summary — loaded lazily so the screen renders instantly with the
  // cached AuthUser xp/rank and updates when the live data arrives.
  const [rankData, setRankData] = useState<any>(null);
  const [rankLoading, setRankLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    auth
      .getRankSummary()
      .then((data) => {
        if (mounted) {
          setRankData(data);
          setRankLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setRankLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [auth]);

  // Refresh local state whenever we return (e.g. from the paywall) — mirrors
  // the `setState(() {})` the Dart screen runs after popping the paywall.
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      if (auth.user) setUser(auth.user);
    });
    return unsub;
  }, [navigation, auth, setUser]);

  const snack = (msg: string) => Alert.alert(msg);

  const doLogout = () => {
    if (onLogout) onLogout();
    else void logout();
  };

  // --- Plate settings ----------------------------------------------------

  const savePlates = async () => {
    Keyboard.dismiss();
    const bar = parseNum(barWeight);
    await plateSettings.update({ barWeight: bar, availablePlates: plates });
    setPlates([...plateSettings.availablePlates]);
    setBarWeight(fmtPlate(plateSettings.barWeight));
    snack(t("account.settings_saved"));
  };

  const addPlateValue = () => {
    const v = parseNum(addPlate);
    if (v == null || v <= 0) return;
    setPlates((prev) => {
      const next = prev.includes(v) ? [...prev] : [...prev, v];
      next.sort((a, b) => b - a);
      return next;
    });
    setAddPlate("");
  };

  const resetPlates = async () => {
    await plateSettings.resetToDefaults();
    setPlates([...plateSettings.availablePlates]);
    setBarWeight(fmtPlate(plateSettings.barWeight));
    snack(t("common.reset"));
  };

  // --- Profile / password ------------------------------------------------

  const saveName = async () => {
    Keyboard.dismiss();
    setSavingName(true);
    try {
      await auth.updateProfile(name.trim());
      if (auth.user) setUser(auth.user);
      snack(t("account.profile_saved"));
    } catch (e) {
      if (e instanceof AuthException) snack(e.message);
      else snack(t("account.couldnt_save"));
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async () => {
    Keyboard.dismiss();
    if (newPw.length < 6) {
      snack(t("auth.password_too_short"));
      return;
    }
    setSavingPw(true);
    try {
      await auth.changePassword(currentPw, newPw);
      setCurrentPw("");
      setNewPw("");
      snack(t("account.password_changed"));
    } catch (e) {
      if (e instanceof AuthException) snack(e.message);
      else snack(t("account.couldnt_change"));
    } finally {
      setSavingPw(false);
    }
  };

  const deleteAccount = () => {
    Alert.alert(t("account.delete_confirm_title"), t("account.delete_confirm_body"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => void performDelete(),
      },
    ]);
  };

  const performDelete = async () => {
    setDeleting(true);
    try {
      await auth.deleteAccount();
      doLogout();
    } catch (e) {
      if (e instanceof AuthException) snack(e.message);
      else snack(t("account.delete_failed"));
      setDeleting(false);
    }
  };

  // --- Subscription ------------------------------------------------------

  const openPaywall = () => {
    navigation.navigate("Paywall");
  };

  const cancelSubscription = () => {
    Alert.alert(t("subscription.cancel_confirm_title"), t("subscription.cancel_confirm_body"), [
      { text: t("common.no"), style: "cancel" },
      {
        text: t("subscription.cancel"),
        style: "destructive",
        onPress: () => void performCancel(),
      },
    ]);
  };

  const performCancel = async () => {
    try {
      await auth.cancelSubscription();
      if (auth.user) setUser(auth.user);
    } catch (e) {
      if (e instanceof AuthException) snack(e.message);
      else snack(t("common.error"));
    }
  };

  // --- Derived -----------------------------------------------------------

  const displayName =
    user && user.name.trim().length > 0 ? user.name : user?.email ?? "";

  const sub = user?.subscription ?? Subscription.free();

  return (
    <Screen edges={["top", "left", "right"]}>
      {/* AppBar */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 4 }}>
        <BackChip onPress={() => navigation.goBack()} />
        <Text style={{ marginLeft: 4, marginBottom: 16, fontSize: 20, fontWeight: "700", color: AppColors.onSurface }}>
          {t("account.title")}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        {/* Avatar + email. */}
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 72,
              height: 72,
              backgroundColor: AppColors.surfaceLow,
              borderRadius: 36,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="person" size={36} color={AppColors.onSurface} />
          </View>
          <View style={{ height: 12 }} />
          <Text style={{ fontSize: 22, fontWeight: "800", color: AppColors.onSurface }}>{displayName}</Text>
          {user?.email != null && (
            <Text style={{ color: AppColors.muted, fontSize: 14 }}>{user.email}</Text>
          )}
        </View>
        <View style={{ height: 28 }} />

        <RankSection user={user} rankData={rankData} rankLoading={rankLoading} navigation={navigation} />
        <View style={{ height: 32 }} />

        {/* Profile */}
        <Label text={t("account.profile")} />
        <View style={{ height: 12 }} />
        <AuthField value={name} onChangeText={setName} label={t("auth.name")} autoCapitalize="words" />
        <View style={{ height: 12 }} />
        <AuthButton label={t("common.save")} loading={savingName} onPress={saveName} />
        <View style={{ height: 32 }} />

        {/* Subscription */}
        <SubscriptionSection
          sub={sub}
          onPaywall={openPaywall}
          onCancel={cancelSubscription}
        />
        <View style={{ height: 32 }} />

        {/* Language */}
        <Label text={t("account.language")} />
        <View style={{ height: 12 }} />
        <View style={{ padding: 4, backgroundColor: AppColors.surfaceLow, borderRadius: 100, flexDirection: "row" }}>
          <View style={{ flex: 1 }}>
            <LangPill label={t("account.language_en")} active={!isHu} onPress={() => void setLang("en")} />
          </View>
          <View style={{ flex: 1 }}>
            <LangPill label={t("account.language_hu")} active={isHu} onPress={() => void setLang("hu")} />
          </View>
        </View>
        <View style={{ height: 32 }} />

        {/* Change password */}
        <Label text={t("account.change_password")} />
        <View style={{ height: 12 }} />
        <AuthField value={currentPw} onChangeText={setCurrentPw} label={t("auth.current_password")} secure />
        <View style={{ height: 12 }} />
        <AuthField value={newPw} onChangeText={setNewPw} label={t("auth.new_password")} secure />
        <View style={{ height: 12 }} />
        <AuthButton label={t("account.change_password")} loading={savingPw} onPress={changePassword} />
        <View style={{ height: 32 }} />

        {/* Plate calculator */}
        <Label text={t("account.plate_calculator")} />
        <View style={{ height: 12 }} />
        <AuthField value={barWeight} onChangeText={setBarWeight} label={t("account.bar_weight")} keyboardType="decimal-pad" />
        <View style={{ height: 16 }} />
        <Text style={{ color: AppColors.muted, fontSize: 13 }}>{t("account.available_plates")}</Text>
        <View style={{ height: 10 }} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {plates.map((p) => (
            <TouchableOpacity
              key={p}
              activeOpacity={0.7}
              onPress={() => setPlates((prev) => prev.filter((x) => x !== p))}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: AppColors.outline,
                borderRadius: 100,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text style={{ color: AppColors.onSurface, fontSize: 14, fontWeight: "600" }}>{fmtPlate(p)}</Text>
              <View style={{ width: 6 }} />
              <MaterialIcons name="close" size={14} color={AppColors.muted} />
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 12 }} />
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <AuthField value={addPlate} onChangeText={setAddPlate} label={t("account.add_plate")} keyboardType="decimal-pad" />
          </View>
          <View style={{ width: 10 }} />
          <TouchableOpacity onPress={addPlateValue} activeOpacity={0.7} style={{ padding: 8 }}>
            <MaterialIcons name="add-circle-outline" size={24} color={AppColors.onSurface} />
          </TouchableOpacity>
        </View>
        <View style={{ height: 12 }} />
        <AuthButton label={t("common.save")} loading={false} onPress={savePlates} />
        <View style={{ height: 8 }} />
        <View style={{ alignItems: "flex-start" }}>
          <TouchableOpacity onPress={resetPlates} activeOpacity={0.7} style={{ paddingVertical: 8 }}>
            <Text style={{ color: AppColors.muted, fontSize: 14 }}>{t("common.reset")}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 32 }} />

        {/* Logout. */}
        <TouchableOpacity
          onPress={doLogout}
          activeOpacity={0.7}
          style={{
            width: "100%",
            paddingVertical: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: AppColors.outline,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: AppColors.onSurface, fontWeight: "700", fontSize: 15 }}>{t("account.logout")}</Text>
        </TouchableOpacity>
        <View style={{ height: 12 }} />

        {/* Delete account. */}
        <TouchableOpacity
          onPress={deleting ? undefined : deleteAccount}
          disabled={deleting}
          activeOpacity={0.7}
          style={{ width: "100%", paddingVertical: 16, alignItems: "center", justifyContent: "center" }}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={AppColors.accentRed} />
          ) : (
            <Text style={{ color: AppColors.accentRed, fontWeight: "700", fontSize: 15 }}>{t("account.delete_account")}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

// -----------------------------------------------------------------------
// Small pieces
// -----------------------------------------------------------------------

function Label({ text }: { text: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5, color: AppColors.muted }}>
      {text.toUpperCase()}
    </Text>
  );
}

function LangPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        paddingVertical: 12,
        backgroundColor: active ? AppColors.primary : "transparent",
        borderRadius: 100,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: active ? AppColors.background : AppColors.onSurface,
          fontSize: 14,
          fontWeight: active ? "800" : "600",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// -----------------------------------------------------------------------
// Subscription section
// -----------------------------------------------------------------------

function StatusBadge({ sub, t }: { sub: Subscription; t: (k: string, p?: Record<string, string | number>) => string }) {
  let label: string;
  let bg: string;
  let fg: string;
  switch (sub.status) {
    case "trialing":
      label = t("subscription.status_trialing", { days: sub.trialDaysLeft ?? 0 });
      bg = AppColors.onSurface;
      fg = AppColors.background;
      break;
    case "active":
      label = sub.plan === "yearly" ? t("subscription.status_active_yearly") : t("subscription.status_active_monthly");
      bg = AppColors.onSurface;
      fg = AppColors.background;
      break;
    case "cancelled":
      label = t("subscription.status_cancelled", {
        date: sub.currentPeriodEnd == null ? "" : fmtDate(sub.currentPeriodEnd),
      });
      bg = AppColors.surfaceHigh;
      fg = AppColors.onSurface;
      break;
    case "expired":
      label = t("subscription.status_expired");
      bg = AppColors.surfaceHigh;
      fg = AppColors.muted;
      break;
    default:
      label = t("subscription.status_free");
      bg = AppColors.surfaceHigh;
      fg = AppColors.onSurface;
  }
  return (
    <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: bg, borderRadius: 100 }}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }}>{label}</Text>
    </View>
  );
}

function SubscriptionSection({
  sub,
  onPaywall,
  onCancel,
}: {
  sub: Subscription;
  onPaywall: () => void;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const showCancel = sub.isPro && (sub.status === "trialing" || sub.status === "active");
  return (
    <View>
      <Label text={t("subscription.section")} />
      <View style={{ height: 12 }} />
      <View style={{ paddingHorizontal: 16, paddingVertical: 16, backgroundColor: AppColors.surfaceLow, borderRadius: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <StatusBadge sub={sub} t={t} />
          <View style={{ flex: 1 }} />
          {sub.currentPeriodEnd != null && sub.isPro && (
            <Text style={{ fontSize: 12, color: AppColors.muted }}>{fmtDate(sub.currentPeriodEnd)}</Text>
          )}
        </View>
        <View style={{ height: 14 }} />
        <TouchableOpacity
          onPress={onPaywall}
          activeOpacity={0.85}
          style={{
            width: "100%",
            paddingVertical: 14,
            backgroundColor: AppColors.primary,
            borderRadius: 100,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: AppColors.background, fontWeight: "800", fontSize: 14 }}>
            {sub.isPro ? t("subscription.cta_manage") : t("subscription.cta_upgrade")}
          </Text>
        </TouchableOpacity>
        {showCancel && (
          <>
            <View style={{ height: 8 }} />
            <View style={{ alignItems: "center" }}>
              <TouchableOpacity onPress={onCancel} activeOpacity={0.7} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: AppColors.muted, fontSize: 12, fontWeight: "600" }}>{t("subscription.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------
// Rank section
// -----------------------------------------------------------------------

function RankSection({
  user,
  rankData,
  rankLoading,
  navigation,
}: {
  user: ReturnType<typeof useAuth>["user"];
  rankData: any;
  rankLoading: boolean;
  navigation: RootNav;
}) {
  const { t } = useLang();

  const liveRankJson = rankData?.rank as Record<string, unknown> | undefined;
  const liveNextJson = rankData?.nextRank as Record<string, unknown> | undefined;
  const cachedXp = user?.xp ?? 0;
  const cachedRank = rankForTier(user?.rank ?? 1);
  const cachedNext = nextRankAfter(cachedRank.tier);

  const rank = liveRankJson != null ? RankDef.fromJson(liveRankJson) : cachedRank;
  const next = liveNextJson != null ? RankDef.fromJson(liveNextJson) : cachedNext;
  const xp = rankData?.xp != null ? Math.trunc(Number(rankData.xp)) : cachedXp;
  const percent = rankData?.percentToNext != null ? Number(rankData.percentToNext) : localPercent(xp, rank, next);
  const weeklyXp = rankData?.weeklyXp != null ? Math.trunc(Number(rankData.weeklyXp)) : null;
  const weeklyBySource: Record<string, unknown> =
    rankData?.weeklyBySource != null ? (rankData.weeklyBySource as Record<string, unknown>) : {};

  return (
    <View>
      <Label text={t("account.rank")} />
      <View style={{ height: 12 }} />
      <RankCard rank={rank} xp={xp} nextRank={next} percentToNext={percent} />
      <View style={{ height: 12 }} />
      <TouchableOpacity
        onPress={() => navigation.navigate("Leaderboard")}
        activeOpacity={0.8}
        style={{ paddingHorizontal: 16, paddingVertical: 14, backgroundColor: AppColors.surfaceLow, borderRadius: 16, flexDirection: "row", alignItems: "center" }}
      >
        <Text style={{ flex: 1, fontSize: 12, letterSpacing: 1.6, fontWeight: "800", color: AppColors.onSurface }}>
          {t("account.world_leaderboard")}
        </Text>
        <MaterialIcons name="chevron-right" size={20} color={AppColors.muted} />
      </TouchableOpacity>
      {weeklyXp != null && weeklyXp > 0 && (
        <>
          <View style={{ height: 20 }} />
          <Label text={t("account.this_week_xp", { xp: weeklyXp })} />
          <View style={{ height: 12 }} />
          <WeeklyBreakdown bySource={weeklyBySource} />
        </>
      )}
      {rankLoading && rankData == null && (
        <>
          <View style={{ height: 12 }} />
          <View style={{ alignItems: "center" }}>
            <ActivityIndicator size="small" color={AppColors.muted} />
          </View>
        </>
      )}
    </View>
  );
}

function RankCard({
  rank,
  xp,
  nextRank,
  percentToNext,
}: {
  rank: RankDef;
  xp: number;
  nextRank: RankDef | null;
  percentToNext: number;
}) {
  const { t } = useLang();
  const solid = rank.tier >= 6;
  const pct = Math.max(0, Math.min(1, percentToNext));
  return (
    <View
      style={{
        width: "100%",
        paddingTop: 28,
        paddingBottom: 24,
        paddingHorizontal: 24,
        backgroundColor: AppColors.surfaceLow,
        borderRadius: 24,
        alignItems: "center",
      }}
    >
      <Numeral text={rank.numeral} solid={solid} />
      <View style={{ height: 14 }} />
      <View style={{ width: 64, height: 2, backgroundColor: AppColors.surfaceHigh }} />
      <View style={{ height: 14 }} />
      <Text style={{ fontSize: 18, fontWeight: "800", letterSpacing: 3, color: AppColors.onSurface }}>{rank.name}</Text>
      <View style={{ height: 22 }} />
      <Text style={{ fontSize: 36, fontWeight: "800", letterSpacing: -1, color: AppColors.onSurface, lineHeight: 36 }}>
        {formatXp(xp)}
      </Text>
      <View style={{ height: 4 }} />
      <Text style={{ fontSize: 11, letterSpacing: 1.6, fontWeight: "800", color: AppColors.muted }}>XP</Text>
      <View style={{ height: 18 }} />
      {nextRank != null ? (
        <View style={{ width: "100%" }}>
          <View style={{ height: 8, borderRadius: 100, backgroundColor: AppColors.surfaceHigh, overflow: "hidden" }}>
            <View style={{ height: 8, width: `${pct * 100}%`, backgroundColor: AppColors.onSurface }} />
          </View>
          <View style={{ height: 10 }} />
          <Text style={{ fontSize: 11, letterSpacing: 1.4, fontWeight: "800", color: AppColors.muted, textAlign: "center" }}>
            {`${formatXp(xp - rank.threshold)} / ${formatXp(nextRank.threshold - rank.threshold)} → ${nextRank.numeral} ${nextRank.name}`}
          </Text>
        </View>
      ) : (
        <Text style={{ fontSize: 11, letterSpacing: 1.6, fontWeight: "800", color: AppColors.onSurface }}>
          {t("rank.cap_reached")}
        </Text>
      )}
    </View>
  );
}

/** The signature rank numeral — solid fill for tiers ≥ 6, outlined below. */
function Numeral({ text, solid }: { text: string; solid: boolean }) {
  const base = { fontSize: 96, fontWeight: "800" as const, letterSpacing: -2, lineHeight: 96 };
  if (solid) {
    return <Text style={[base, { color: AppColors.onSurface }]}>{text}</Text>;
  }
  const s = 2;
  const offsets: [number, number][] = [
    [-s, -s],
    [s, -s],
    [-s, s],
    [s, s],
    [-s, 0],
    [s, 0],
    [0, -s],
    [0, s],
  ];
  return (
    <View>
      {offsets.map(([x, y], i) => (
        <Text key={i} style={[base, { position: "absolute", left: x, top: y, color: AppColors.onSurface }]}>
          {text}
        </Text>
      ))}
      <Text style={[base, { color: AppColors.surfaceLow }]}>{text}</Text>
    </View>
  );
}

function WeeklyBreakdown({ bySource }: { bySource: Record<string, unknown> }) {
  const { t } = useLang();
  const labels: Record<string, string> = {
    sets: t("rank.sets"),
    session: t("rank.session"),
    pr: t("rank.pr"),
    weekly_goal: t("rank.weekly_goal"),
    streak: t("rank.streak"),
  };
  const entries = Object.entries(bySource).sort((a, b) => Math.trunc(Number(b[1])) - Math.trunc(Number(a[1])));
  return (
    <View style={{ paddingVertical: 4, paddingHorizontal: 18, backgroundColor: AppColors.surfaceLow, borderRadius: 16 }}>
      {entries.map(([key, val], i) => (
        <View
          key={key}
          style={{
            paddingVertical: 12,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: AppColors.outline,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ flex: 1, fontSize: 13, color: AppColors.onSurface, fontWeight: "600" }}>
              {labels[key] ?? key.toUpperCase()}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: "800", color: AppColors.onSurface, letterSpacing: -0.3 }}>
              {`+${Math.trunc(Number(val))}`}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
