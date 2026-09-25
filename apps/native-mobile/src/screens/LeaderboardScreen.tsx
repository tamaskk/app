// Ported 1:1 from apps/mobile/lib/screens/leaderboard_screen.dart.
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../components/ui";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";
import { useAuth } from "../context/AuthContext";
import { RankDef } from "../models/rank";
import type { RootNav } from "../navigation/types";

type LeaderboardScope = "global" | "country" | "rank" | "weekly";

const scopes: LeaderboardScope[] = ["global", "country", "rank", "weekly"];

function scopeApiKey(s: LeaderboardScope): string {
  return s; // global | country | rank | weekly
}

function scopeLabel(s: LeaderboardScope, t: (k: string) => string): string {
  switch (s) {
    case "global":
      return t("leaderboard.scope_global");
    case "country":
      return t("leaderboard.scope_country");
    case "rank":
      return t("leaderboard.scope_rank");
    case "weekly":
      return t("leaderboard.scope_weekly");
  }
}

interface LbEntry {
  userId: string;
  username: string;
  xp: number;
  rank: RankDef;
  position: number;
  isMe: boolean;
}

function lbEntryFromJson(json: any, t: (k: string) => string): LbEntry {
  return {
    userId: json.userId as string,
    username: (json.username as string) ?? t("leaderboard.athlete_fallback"),
    xp: json.xp != null ? Math.trunc(json.xp as number) : 0,
    rank: RankDef.fromJson((json.rank ?? {}) as any),
    position: json.position != null ? Math.trunc(json.position as number) : 0,
    isMe: (json.isMe as boolean) ?? false,
  };
}

function formatXp(xp: number): string {
  if (xp >= 1000) {
    const v = xp / 1000;
    return `${v.toFixed(v >= 10 ? 0 : 1).replace(".", ",")}K`;
  }
  return String(xp);
}

/** Linear interpolation between two hex colors (Flutter's Color.lerp). */
function lerpColor(a: string, b: string, tt: number): string {
  const pa = [
    parseInt(a.slice(1, 3), 16),
    parseInt(a.slice(3, 5), 16),
    parseInt(a.slice(5, 7), 16),
  ];
  const pb = [
    parseInt(b.slice(1, 3), 16),
    parseInt(b.slice(3, 5), 16),
    parseInt(b.slice(5, 7), 16),
  ];
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * tt));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export function LeaderboardScreen({ navigation }: { navigation: RootNav }) {
  const { t } = useLang();
  const { auth } = useAuth();

  const [scope, setScope] = useState<LeaderboardScope>("global");
  const [entries, setEntries] = useState<LbEntry[]>([]);
  const [own, setOwn] = useState<LbEntry | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingFirst, setLoadingFirst] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadingMoreRef = useRef(false);

  const loadInitial = useCallback(
    async (s: LeaderboardScope) => {
      try {
        const data = await auth.getLeaderboard(scopeApiKey(s), 0);
        const results = ((data.results as any[]) ?? []).map((e) =>
          lbEntryFromJson(e, t),
        );
        const ownData =
          data.ownPosition && typeof data.ownPosition === "object"
            ? lbEntryFromJson(data.ownPosition, t)
            : null;
        setEntries(results);
        setOwn(ownData);
        setHasMore((data.hasMore as boolean) ?? false);
        setPage(0);
        setLoadingFirst(false);
      } catch (_) {
        setError(t("leaderboard.load_failed"));
        setLoadingFirst(false);
      }
    },
    [auth, t],
  );

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await auth.getLeaderboard(scopeApiKey(scope), next);
      const more = ((data.results as any[]) ?? []).map((e) =>
        lbEntryFromJson(e, t),
      );
      setEntries((prev) => [...prev, ...more]);
      setHasMore((data.hasMore as boolean) ?? false);
      setPage(next);
      setLoadingMore(false);
    } catch (_) {
      setLoadingMore(false);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [auth, t, scope, page, hasMore]);

  useEffect(() => {
    void loadInitial("global");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchScope = (s: LeaderboardScope) => {
    if (s === scope) return;
    setScope(s);
    setEntries([]);
    setOwn(null);
    setPage(0);
    setHasMore(true);
    setLoadingFirst(true);
    setError(null);
    void loadInitial(s);
  };

  const ownInLoaded =
    own != null && entries.some((e) => e.userId === own.userId);

  const rest = entries.length > 3 ? entries.slice(3) : [];

  return (
    <Screen>
      {/* AppBar — back button. */}
      <View style={styles.appBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={AppColors.onSurface} />
        </TouchableOpacity>
      </View>

      <View style={styles.titleWrap}>
        <Text style={styles.title}>{t("leaderboard.title")}</Text>
      </View>

      {/* Scope strip. */}
      <View style={{ height: 44 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, alignItems: "center" }}
        >
          {scopes.map((s, i) => {
            const active = s === scope;
            return (
              <TouchableOpacity
                key={s}
                activeOpacity={0.8}
                onPress={() => switchScope(s)}
                style={[
                  styles.chip,
                  { marginLeft: i === 0 ? 0 : 8 },
                  {
                    backgroundColor: active
                      ? AppColors.primary
                      : AppColors.surfaceLow,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? AppColors.background : AppColors.onSurface },
                  ]}
                >
                  {scopeLabel(s, t)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ height: 12 }} />

      <View style={{ flex: 1 }}>
        <Body
          loadingFirst={loadingFirst}
          error={error}
          entries={entries}
          rest={rest}
          scope={scope}
          loadingMore={loadingMore}
          onEndReached={loadMore}
          t={t}
        />
      </View>

      {/* Sticky "TE" footer when own row isn't in the loaded slice. */}
      {!loadingFirst && error == null && own != null && !ownInLoaded && (
        <StickyOwnRow entry={own} t={t} />
      )}
    </Screen>
  );
}

function Body({
  loadingFirst,
  error,
  entries,
  rest,
  scope,
  loadingMore,
  onEndReached,
  t,
}: {
  loadingFirst: boolean;
  error: string | null;
  entries: LbEntry[];
  rest: LbEntry[];
  scope: LeaderboardScope;
  loadingMore: boolean;
  onEndReached: () => void;
  t: (k: string) => string;
}) {
  if (loadingFirst) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={AppColors.onSurface} />
      </View>
    );
  }
  if (error != null) {
    return (
      <View style={[styles.center, { paddingHorizontal: 32 }]}>
        <Text style={{ color: AppColors.muted, textAlign: "center" }}>
          {error}
        </Text>
      </View>
    );
  }
  if (entries.length === 0) {
    return (
      <View style={[styles.center, { paddingHorizontal: 40 }]}>
        <Text
          style={{ color: AppColors.muted, fontSize: 14, textAlign: "center" }}
        >
          {scope === "country"
            ? t("leaderboard.empty_country")
            : t("leaderboard.empty_general")}
        </Text>
      </View>
    );
  }
  return (
    <FlatList
      data={rest}
      keyExtractor={(item, i) => `${item.userId}-${i}`}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 0, paddingBottom: 24 }}
      ListHeaderComponent={<PodiumSection entries={entries} />}
      renderItem={({ item }) => <LbRow entry={item} t={t} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        loadingMore ? (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator size="small" color={AppColors.muted} />
          </View>
        ) : null
      }
    />
  );
}

function PodiumSection({ entries }: { entries: LbEntry[] }) {
  const top1 = entries.length > 0 ? entries[0] : null;
  const top2 = entries.length > 1 ? entries[1] : null;
  const top3 = entries.length > 2 ? entries[2] : null;
  if (top1 == null) return null;
  return (
    <View style={{ paddingBottom: 18 }}>
      {/* Names + numerals row. */}
      <View style={styles.podiumRow}>
        <View style={{ flex: 1 }}>
          <PodiumHead entry={top2} height={92} place={2} />
        </View>
        <View style={{ width: 8 }} />
        <View style={{ flex: 1 }}>
          <PodiumHead entry={top1} height={124} place={1} />
        </View>
        <View style={{ width: 8 }} />
        <View style={{ flex: 1 }}>
          <PodiumHead entry={top3} height={72} place={3} />
        </View>
      </View>
      <View style={{ height: 16 }} />
      {/* Visible podium bars below. */}
      <View style={styles.podiumRow}>
        <View style={{ flex: 1 }}>
          <PodiumBar height={56} fill={0.4} label="2" />
        </View>
        <View style={{ width: 8 }} />
        <View style={{ flex: 1 }}>
          <PodiumBar height={84} fill={1} label="1" />
        </View>
        <View style={{ width: 8 }} />
        <View style={{ flex: 1 }}>
          <PodiumBar height={40} fill={0.2} label="3" />
        </View>
      </View>
      <View style={{ height: 24 }} />
      <View style={{ height: 1, backgroundColor: AppColors.outline }} />
    </View>
  );
}

/** Top of the podium — username + Roman numeral + XP. */
function PodiumHead({
  entry,
  height,
  place,
}: {
  entry: LbEntry | null;
  height: number;
  place: number;
}) {
  if (entry == null) {
    return (
      <View style={{ height, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 28, color: AppColors.muted }}>—</Text>
      </View>
    );
  }
  return (
    <View style={{ height, justifyContent: "flex-end", alignItems: "center" }}>
      <Text
        style={{
          fontSize: place === 1 ? 44 : 32,
          fontWeight: "800",
          lineHeight: place === 1 ? 44 : 32,
          letterSpacing: -1,
          color: AppColors.onSurface,
        }}
      >
        {entry.rank.numeral}
      </Text>
      <View style={{ height: 6 }} />
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          fontSize: place === 1 ? 13 : 11,
          fontWeight: "800",
          letterSpacing: 0.6,
          color: entry.isMe ? AppColors.onSurface : AppColors.muted,
        }}
      >
        {entry.username}
      </Text>
      <View style={{ height: 2 }} />
      <Text
        style={{
          fontSize: 10,
          letterSpacing: 1.2,
          fontWeight: "700",
          color: AppColors.muted,
        }}
      >
        {`${formatXp(entry.xp)} XP`}
      </Text>
    </View>
  );
}

/** The actual podium box — 3 monochrome blocks of differing heights. */
function PodiumBar({
  height,
  fill,
  label,
}: {
  height: number;
  fill: number;
  label: string;
}) {
  return (
    <View
      style={{
        height,
        alignItems: "center",
        backgroundColor: lerpColor(
          AppColors.surfaceLow,
          AppColors.onSurface,
          fill * 0.85,
        ),
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
      }}
    >
      <Text
        style={{
          marginTop: 8,
          fontSize: 18,
          fontWeight: "800",
          letterSpacing: -0.5,
          color: fill > 0.5 ? AppColors.background : AppColors.onSurface,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function LbRow({ entry, t }: { entry: LbEntry; t: (k: string) => string }) {
  const isMe = entry.isMe;
  return (
    <View
      style={[
        {
          marginBottom: 6,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
        },
        isMe
          ? { backgroundColor: AppColors.onSurface, borderRadius: 12 }
          : { borderBottomWidth: 1, borderBottomColor: AppColors.outline },
      ]}
    >
      <View style={{ width: 36 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "800",
            color: isMe ? AppColors.background : AppColors.muted,
          }}
        >
          {`${entry.position}`}
        </Text>
      </View>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            flexShrink: 1,
            fontSize: 15,
            fontWeight: "700",
            color: isMe ? AppColors.background : AppColors.onSurface,
          }}
        >
          {entry.username}
        </Text>
        {isMe && (
          <>
            <View style={{ width: 6 }} />
            <Text
              style={{
                fontSize: 10,
                letterSpacing: 1.4,
                fontWeight: "800",
                color: "rgba(0, 0, 0, 0.7)",
              }}
            >
              {t("leaderboard.you_tag")}
            </Text>
          </>
        )}
      </View>
      <View style={{ width: 8 }} />
      <Text
        style={{
          fontSize: 14,
          fontWeight: "800",
          letterSpacing: 1,
          color: isMe ? AppColors.background : AppColors.muted,
        }}
      >
        {entry.rank.numeral}
      </Text>
      <View style={{ width: 14 }} />
      <Text
        style={{
          fontSize: 15,
          fontWeight: "800",
          letterSpacing: -0.3,
          color: isMe ? AppColors.background : AppColors.onSurface,
        }}
      >
        {formatXp(entry.xp)}
      </Text>
    </View>
  );
}

function StickyOwnRow({
  entry,
  t,
}: {
  entry: LbEntry;
  t: (k: string) => string;
}) {
  return (
    <View
      style={{
        backgroundColor: AppColors.background,
        borderTopWidth: 1,
        borderTopColor: AppColors.surfaceHigh,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
      }}
    >
      <Text
        style={{
          marginBottom: 6,
          fontSize: 10,
          letterSpacing: 1.6,
          fontWeight: "800",
          color: AppColors.muted,
        }}
      >
        {t("leaderboard.you_on_list")}
      </Text>
      <LbRow entry={entry} t={t} />
    </View>
  );
}

const styles = StyleSheet.create({
  appBar: {
    height: 56,
    justifyContent: "center",
  },
  backBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 8,
    alignItems: "flex-start",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
    color: AppColors.onSurface,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 12,
    letterSpacing: 1.4,
    fontWeight: "800",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  podiumRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "flex-end",
  },
});
