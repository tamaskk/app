// Ported 1:1 from apps/mobile/lib/screens/hyrox_screen.dart.
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Screen } from "../components/ui";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";
import { Api, ApiException, HyroxPlanExistsException } from "../lib/api";
import { SavedTraining } from "../models/apiModels";
import { titleCase } from "../utils/text";
import type { RootNav } from "../navigation/types";

/// Official HYROX divisions, label-matched to the backend (lib/hyroxPlan.ts).
const divisions: [string, string][] = [
  ["men_open", "hyrox.division_men_open"],
  ["women_open", "hyrox.division_women_open"],
  ["men_pro", "hyrox.division_men_pro"],
  ["women_pro", "hyrox.division_women_pro"],
];

const phaseNames: Record<number, string> = {
  1: "hyrox.phase_1",
  2: "hyrox.phase_2",
  3: "hyrox.phase_3",
  4: "hyrox.phase_4",
};

const api = new Api();

/// The HYROX tab. Mirrors the Edzések experience (list → player → log) but for
/// the 12-week HYROX preparation plan. Empty until the user taps "Terv
/// létrehozása", which seeds all 36 sessions in one backend call.
export function HyroxScreen({ navigation }: { navigation: RootNav }) {
  const { t } = useLang();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<SavedTraining[]>([]);
  const [division, setDivision] = useState("men_open");

  const creatingRef = useRef(false);
  const firstFocusRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await api.getTrainings("hyrox");
      const hyrox = all.filter((tr) => tr.isHyrox);
      hyrox.sort((a, b) => {
        const w = (a.weekIndex ?? 0) - (b.weekIndex ?? 0);
        return w !== 0 ? w : (a.dayIndex ?? 0) - (b.dayIndex ?? 0);
      });
      setPlan(hyrox);
    } catch (e) {
      if (e instanceof ApiException) {
        setError(e.message);
      } else {
        setError(t("hyrox.server_unreachable"));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload after returning from the workout player (mirrors the awaited push).
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      void load();
    });
    return unsub;
  }, [navigation, load]);

  const createPlan = useCallback(
    async (replace = false) => {
      if (creatingRef.current) return;
      creatingRef.current = true;
      setCreating(true);
      try {
        const res = await api.createHyroxPlan({ division, replace });
        Alert.alert(
          "",
          t("hyrox.plan_created", {
            count: res.created,
            label: res.divisionLabel,
          }),
        );
        await load();
      } catch (e) {
        if (e instanceof HyroxPlanExistsException) {
          confirmReplace();
        } else if (e instanceof ApiException) {
          Alert.alert("", e.message);
        } else {
          Alert.alert("", t("hyrox.create_failed"));
        }
      } finally {
        creatingRef.current = false;
        setCreating(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [division, t, load],
  );

  const confirmReplace = useCallback(() => {
    Alert.alert(t("hyrox.plan_exists_title"), t("hyrox.plan_exists_body"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("hyrox.replace"),
        style: "destructive",
        onPress: () => {
          void createPlan(true);
        },
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, createPlan]);

  const deletePlan = useCallback(() => {
    Alert.alert(t("hyrox.delete_plan_title"), t("hyrox.delete_plan_body"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteHyroxPlan();
            await load();
          } catch (_) {
            Alert.alert("", t("hyrox.delete_failed"));
          }
        },
      },
    ]);
  }, [t, load]);

  const openDay = useCallback(
    (tr: SavedTraining) => {
      navigation.navigate("Workout", { trainingId: tr.id, name: tr.name });
    },
    [navigation],
  );

  return (
    <Screen>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AppColors.onSurface} />
        </View>
      ) : plan.length === 0 ? (
        <EmptyState
          division={division}
          creating={creating}
          error={error}
          onDivision={setDivision}
          onCreate={() => createPlan()}
          t={t}
        />
      ) : (
        <PlanList
          plan={plan}
          onRefresh={load}
          onDelete={deletePlan}
          onOpenDay={openDay}
          t={t}
        />
      )}
    </Screen>
  );
}

/** The session name is "Fázis · N. hét · Fókusz" — show just the focus part. */
function focusOf(tr: SavedTraining): string {
  const parts = tr.name.split("·");
  const focus = parts.length > 0 ? parts[parts.length - 1].trim() : tr.name;
  return titleCase(focus);
}

function PlanList({
  plan,
  onRefresh,
  onDelete,
  onOpenDay,
  t,
}: {
  plan: SavedTraining[];
  onRefresh: () => Promise<void>;
  onDelete: () => void;
  onOpenDay: (tr: SavedTraining) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const doneCount = plan.filter((tr) => tr.isDone).length;

  // Group by week, preserving order.
  const byWeek = new Map<number, SavedTraining[]>();
  for (const tr of plan) {
    const key = tr.weekIndex ?? 0;
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)!.push(tr);
  }
  const weeks = Array.from(byWeek.keys()).sort((a, b) => a - b);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={AppColors.onSurface}
          colors={[AppColors.onSurface]}
          progressBackgroundColor={AppColors.surfaceLow}
        />
      }
    >
      <Header doneCount={doneCount} total={plan.length} onDelete={onDelete} t={t} />
      {weeks.map((w) => (
        <WeekBlock
          key={w}
          week={w}
          days={byWeek.get(w)!}
          onOpenDay={onOpenDay}
          t={t}
        />
      ))}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function Header({
  doneCount,
  total,
  onDelete,
  t,
}: {
  doneCount: number;
  total: number;
  onDelete: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.hyroxTitle}>HYROX</Text>
        <View style={{ height: 2 }} />
        <Text style={{ fontSize: 14, color: AppColors.muted }}>
          {t("hyrox.weeks_progress", { done: doneCount, total })}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.iconBtn}
      >
        <MaterialIcons name="delete-outline" size={24} color={AppColors.muted} />
      </TouchableOpacity>
    </View>
  );
}

function WeekBlock({
  week,
  days,
  onOpenDay,
  t,
}: {
  week: number;
  days: SavedTraining[];
  onOpenDay: (tr: SavedTraining) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const phase = days[0].phase ?? 1;
  return (
    <View style={{ alignItems: "flex-start" }}>
      <View style={styles.weekTitleRow}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: AppColors.onSurface,
          }}
        >
          {t("hyrox.week_n", { week: week + 1 })}
        </Text>
        <View style={{ width: 10 }} />
        <PhaseChip phase={phase} t={t} />
      </View>
      {days.map((tr) => (
        <DayCard key={tr.id} tr={tr} onOpenDay={onOpenDay} t={t} />
      ))}
    </View>
  );
}

function PhaseChip({
  phase,
  t,
}: {
  phase: number;
  t: (key: string) => string;
}) {
  const color = phase === 4 ? AppColors.accentGreen : AppColors.accentAmber;
  const phaseKey = phaseNames[phase];
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 3,
        backgroundColor: withAlpha(color, 0.14),
        borderRadius: 8,
      }}
    >
      <Text style={{ fontSize: 11.5, fontWeight: "700", color }}>
        {phaseKey == null ? "" : t(phaseKey)}
      </Text>
    </View>
  );
}

function DayCard({
  tr,
  onOpenDay,
  t,
}: {
  tr: SavedTraining;
  onOpenDay: (tr: SavedTraining) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const done = tr.isDone;
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 10, alignSelf: "stretch" }}>
      <TouchableOpacity activeOpacity={0.8} onPress={() => onOpenDay(tr)}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: AppColors.surfaceLow,
            borderRadius: 16,
            borderWidth: done ? 1.5 : 1,
            borderColor: done ? AppColors.accentGreen : AppColors.outline,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View style={styles.dayBadge}>
            <Text style={{ fontWeight: "800", color: AppColors.onSurface }}>
              {`${(tr.dayIndex ?? 0) + 1}`}
            </Text>
          </View>
          <View style={{ width: 14 }} />
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: AppColors.onSurface,
              }}
            >
              {focusOf(tr)}
            </Text>
            <View style={{ height: 3 }} />
            <Text style={{ fontSize: 12.5, color: AppColors.muted }}>
              {t("hyrox.exercises_sets", {
                exercises: tr.exercises.length,
                sets: tr.totalSets,
              })}
            </Text>
          </View>
          <MaterialIcons
            name={done ? "check-circle" : "chevron-right"}
            size={done ? 22 : 24}
            color={done ? AppColors.accentGreen : AppColors.muted}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({
  division,
  creating,
  error,
  onDivision,
  onCreate,
  t,
}: {
  division: string;
  creating: boolean;
  error: string | null;
  onDivision: (d: string) => void;
  onCreate: () => void;
  t: (key: string) => string;
}) {
  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 40,
        alignItems: "flex-start",
      }}
    >
      <Text
        style={{
          fontSize: 40,
          fontWeight: "800",
          letterSpacing: -1.5,
          color: AppColors.onSurface,
        }}
      >
        HYROX
      </Text>
      <View style={{ height: 8 }} />
      <Text style={{ fontSize: 15, lineHeight: 15 * 1.45, color: AppColors.muted }}>
        {t("hyrox.intro_description")}
      </Text>
      <View style={{ height: 28 }} />
      <Text
        style={{
          fontSize: 11,
          letterSpacing: 1.4,
          fontWeight: "700",
          color: AppColors.muted,
        }}
      >
        {t("hyrox.division_label")}
      </Text>
      <View style={{ height: 10 }} />
      <View style={styles.wrap}>
        {divisions.map(([value, labelKey]) => (
          <DivisionChip
            key={value}
            label={t(labelKey)}
            selected={value === division}
            onTap={() => onDivision(value)}
          />
        ))}
      </View>
      <View style={{ height: 8 }} />
      <Text style={{ fontSize: 12.5, color: AppColors.muted }}>
        {t("hyrox.default_weights_note")}
      </Text>
      {error != null && (
        <>
          <View style={{ height: 16 }} />
          <Text style={{ fontSize: 13, color: AppColors.accentRed }}>{error}</Text>
        </>
      )}
      <View style={{ height: 28 }} />
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={creating}
        onPress={onCreate}
        style={{
          width: "100%",
          paddingVertical: 16,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          backgroundColor: creating ? AppColors.surfaceHigh : AppColors.primary,
        }}
      >
        {creating ? (
          <ActivityIndicator size="small" color={AppColors.background} />
        ) : (
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: AppColors.background,
            }}
          >
            {t("hyrox.create_plan")}
          </Text>
        )}
      </TouchableOpacity>
      <View style={{ height: 12 }} />
      <Text style={{ fontSize: 12.5, color: AppColors.muted }}>
        {t("hyrox.create_footnote")}
      </Text>
    </ScrollView>
  );
}

function DivisionChip({
  label,
  selected,
  onTap,
}: {
  label: string;
  selected: boolean;
  onTap: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onTap}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: selected ? AppColors.onSurface : AppColors.surfaceLow,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: selected ? AppColors.onSurface : AppColors.outline,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: selected ? AppColors.background : AppColors.onSurface,
          }}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/** Apply an alpha channel to a #RRGGBB hex color (Flutter's withValues). */
function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  hyroxTitle: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
    color: AppColors.onSurface,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  weekTitleRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  dayBadge: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: AppColors.surfaceMid,
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
