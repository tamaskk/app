// Ported 1:1 from apps/mobile/lib/screens/weekly_plan_edit_screen.dart.
//
// Edits the user's 7-day workout schedule (REST / WORKOUT per day) plus a
// daily reminder toggle + time. Reminder days are auto-derived from the plan
// (workout days = non-rest tokens) on save. The Flutter modal bottom sheet and
// native time picker are reproduced with RN Modals; the native
// NotificationService scheduling has no RN equivalent yet and is omitted.
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Switch,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Screen } from "../components/ui";
import { BackChip } from "../components/BackChip";
import { AppColors } from "../theme";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../hooks/useLang";
import { AuthException } from "../lib/authService";
import { ReminderPrefs } from "../models/auth";
import type { RootNav } from "../navigation/types";

// ---------------------------------------------------------------------------
// Tokens & helpers
// ---------------------------------------------------------------------------
//
// A day's value is one of:
//   • a single exclusive token: `rest`, `workout`, `push`, `pull`, `upper`,
//     `lower`, `fullbody`
//   • one or more muscle-group tokens joined by `+`: e.g. `chest+back+arms`
//
// Single-token modes can't combine with anything; muscle groups can stack.
// The backend validator (`/api/me/weekly-plan/route.ts`) mirrors this.

const _exclusiveTokens = new Set<string>([
  "rest",
  "workout",
  "push",
  "pull",
  "upper",
  "lower",
  "fullbody",
]);

// Legacy parser uses this map to recognise old muscle-group tokens
// (e.g. 'chest+arms') and treat them as non-rest days. The new picker only
// writes 'rest' or 'workout' so future days never carry these.
const _muscleLabelKeys: Record<string, string> = {
  chest: "plan.muscle_chest",
  back: "plan.muscle_back",
  shoulders: "plan.muscle_shoulders",
  arms: "plan.muscle_arms",
  core: "plan.muscle_core",
  legs: "plan.muscle_legs",
};

const _dayLongKeys = [
  "plan.day_h",
  "plan.day_k",
  "plan.day_sze",
  "plan.day_cs",
  "plan.day_p",
  "plan.day_szo",
  "plan.day_v",
];

/** Parses a stored day value into its mode + muscle-group multi-pick set. */
class DayPlan {
  private constructor(
    // One of _exclusiveTokens, or null when only muscle groups are selected.
    public readonly mode: string | null,
    // Muscle-group tokens selected for this day. Empty when mode is set.
    public readonly muscles: Set<string>,
  ) {}

  static fromToken(raw: string | null | undefined): DayPlan {
    if (raw == null || raw.length === 0) return new DayPlan("rest", new Set());
    const parts = raw
      .split("+")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const muscles = new Set<string>();
    let exclusive: string | null = null;
    for (const p of parts) {
      if (_exclusiveTokens.has(p)) {
        exclusive = p;
      } else if (p in _muscleLabelKeys) {
        muscles.add(p);
      }
    }
    // Legacy: a stand-alone muscle token like `chest` parses straight into the
    // muscles set; the user can multi-select on top of it.
    if (exclusive == null && muscles.size === 0) {
      return new DayPlan("rest", new Set());
    }
    return new DayPlan(exclusive, muscles);
  }

  static of(mode: string | null, muscles: Set<string>): DayPlan {
    return new DayPlan(mode, muscles);
  }

  get isRest(): boolean {
    return this.mode === "rest";
  }
  get hasMuscles(): boolean {
    return this.muscles.size > 0;
  }

  /** Serialise back to the storage token. */
  get token(): string {
    if (this.mode != null) return this.mode;
    if (this.muscles.size === 0) return "rest";
    const sorted = Array.from(this.muscles).sort();
    return sorted.join("+");
  }
}

function _parseTime(hhmm: string): { hour: number; minute: number } {
  const parts = hhmm.split(":");
  if (parts.length !== 2) return { hour: 18, minute: 0 };
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  return {
    hour: Number.isNaN(hour) ? 18 : hour,
    minute: Number.isNaN(minute) ? 0 : minute,
  };
}

function _fmtTime(t: { hour: number; minute: number }): string {
  return `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function WeeklyPlanEditScreen({
  navigation,
  defaultPlan = [],
}: {
  navigation: RootNav;
  // Default plan to pre-fill when the user has no custom plan yet.
  defaultPlan?: string[];
}) {
  const { auth, user } = useAuth();
  const { t } = useLang();

  const [plan, setPlan] = useState<string[]>(() => {
    const existing = user?.weeklyPlan;
    let p =
      existing != null && existing.length === 7
        ? [...existing]
        : [...defaultPlan];
    while (p.length < 7) p.push("rest");
    if (p.length > 7) p = p.slice(0, 7);
    return p;
  });

  const r = user?.reminders;
  const [reminderOn, setReminderOn] = useState<boolean>(r?.enabled ?? false);
  const [reminderTime, setReminderTime] = useState<{ hour: number; minute: number }>(
    _parseTime(r?.time ?? "18:00"),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dayPickerIndex, setDayPickerIndex] = useState<number | null>(null);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  function openDayPicker(dayIndex: number) {
    setDayPickerIndex(dayIndex);
  }

  function onDayPicked(dayIndex: number, picked: DayPlan) {
    setPlan((prev) => {
      const next = [...prev];
      next[dayIndex] = picked.token;
      return next;
    });
    setDayPickerIndex(null);
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await auth.saveWeeklyPlan(plan);
      // Reminders auto-fire on the user's workout days — derived from the plan
      // so there's no separate day picker. Stored as ISO weekday indices
      // (1..7, Mon..Sun) matching the backend schema.
      const derivedDays: number[] = [];
      for (let i = 0; i < 7; i++) {
        if (plan[i] !== "rest") derivedDays.push(i + 1);
      }
      const prefs = new ReminderPrefs(reminderOn, _fmtTime(reminderTime), derivedDays);
      await auth.saveReminders(prefs);
      // NOTE: native NotificationService (permission request + reschedule) has
      // no RN equivalent ported yet, so on-device scheduling is skipped here.
      Alert.alert("", t("plan.saved"));
      navigation.goBack();
    } catch (e) {
      if (e instanceof AuthException) {
        setError(e.message);
      } else {
        setError(t("plan.save_failed"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        <BackChip onPress={() => navigation.goBack()} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}>
        <Text
          style={{
            fontSize: 11,
            letterSpacing: 1.6,
            color: AppColors.muted,
            fontWeight: "800",
          }}
        >
          {t("plan.title")}
        </Text>
        <View style={{ height: 6 }} />
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            letterSpacing: -1,
            color: AppColors.onSurface,
            lineHeight: 28 * 1.1,
          }}
        >
          {t("plan.tagline")}
        </Text>
        <View style={{ height: 24 }} />

        {Array.from({ length: 7 }, (_u, i) => (
          <View key={i}>
            <DayRow
              dayLabel={t(_dayLongKeys[i])}
              token={plan[i]}
              restLabel={t("plan.label_rest")}
              workLabel={t("plan.label_workout")}
              onPress={() => openDayPicker(i)}
            />
            {i < 6 && (
              <View style={{ height: 1, backgroundColor: AppColors.outline }} />
            )}
          </View>
        ))}

        <View style={{ height: 32 }} />
        <Text
          style={{
            fontSize: 11,
            letterSpacing: 1.6,
            color: AppColors.muted,
            fontWeight: "800",
          }}
        >
          {t("plan.reminder_section")}
        </Text>
        <View style={{ height: 6 }} />
        <Text style={{ fontSize: 13, color: AppColors.muted, lineHeight: 13 * 1.4 }}>
          {t("plan.reminder_subtitle")}
        </Text>
        <View style={{ height: 12 }} />

        <View
          style={{
            backgroundColor: AppColors.surfaceLow,
            borderRadius: 20,
            paddingHorizontal: 18,
            paddingVertical: 6,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                fontWeight: "700",
                color: AppColors.onSurface,
                fontSize: 15,
                flex: 1,
              }}
            >
              {t("plan.reminder_enabled")}
            </Text>
            <Switch
              value={reminderOn}
              onValueChange={(v) => setReminderOn(v)}
              trackColor={{ false: AppColors.surfaceHigh, true: AppColors.onSurface }}
              thumbColor={reminderOn ? AppColors.background : AppColors.onSurface}
              ios_backgroundColor={AppColors.surfaceHigh}
            />
          </View>
          <View style={{ height: 1, backgroundColor: AppColors.outline }} />
          <View
            style={{
              opacity: reminderOn ? 1 : 0.5,
              paddingVertical: 14,
            }}
            pointerEvents={reminderOn ? "auto" : "none"}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: "700",
                  color: AppColors.onSurface,
                }}
              >
                {t("plan.reminder_time")}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setTimePickerOpen(true)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  backgroundColor: AppColors.surfaceHigh,
                  borderRadius: 100,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "800",
                    color: AppColors.onSurface,
                    letterSpacing: -0.5,
                  }}
                >
                  {_fmtTime(reminderTime)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {error != null && (
          <>
            <View style={{ height: 16 }} />
            <Text style={{ color: AppColors.onSurface, fontSize: 13 }}>{error}</Text>
          </>
        )}

        <View style={{ height: 28 }} />
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={saving}
          onPress={save}
          style={{
            width: "100%",
            backgroundColor: AppColors.primary,
            paddingVertical: 18,
            borderRadius: 100,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={AppColors.background} />
          ) : (
            <Text
              style={{
                fontSize: 14,
                fontWeight: "800",
                letterSpacing: 2,
                color: AppColors.background,
              }}
            >
              {t("plan.save")}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {dayPickerIndex != null && (
        <DayPickerSheet
          dayIndex={dayPickerIndex}
          initial={DayPlan.fromToken(plan[dayPickerIndex])}
          onClose={() => setDayPickerIndex(null)}
          onConfirm={(picked) => onDayPicked(dayPickerIndex, picked)}
        />
      )}

      <TimePickerSheet
        open={timePickerOpen}
        value={reminderTime}
        onClose={() => setTimePickerOpen(false)}
        onConfirm={(v) => {
          setReminderTime(v);
          setTimePickerOpen(false);
        }}
      />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Day picker bottom sheet
// ---------------------------------------------------------------------------

function DayPickerSheet({
  dayIndex,
  initial,
  onClose,
  onConfirm,
}: {
  dayIndex: number;
  initial: DayPlan;
  onClose: () => void;
  onConfirm: (picked: DayPlan) => void;
}) {
  const { t } = useLang();
  // The simplified picker only has two states — REST or WORKOUT.
  const [isRest, setIsRest] = useState<boolean>(initial.isRest);

  function confirm() {
    onConfirm(DayPlan.of(isRest ? "rest" : "workout", new Set()));
  }

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={{
            backgroundColor: AppColors.background,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 20,
          }}
        >
          <View style={{ alignItems: "flex-start" }}>
            <View
              style={{
                alignSelf: "center",
                marginVertical: 8,
                height: 4,
                width: 40,
                backgroundColor: AppColors.surfaceHigh,
                borderRadius: 100,
              }}
            />
            <View style={{ height: 8 }} />
            <Text
              style={{
                fontSize: 11,
                letterSpacing: 1.6,
                color: AppColors.muted,
                fontWeight: "800",
              }}
            >
              {t(_dayLongKeys[dayIndex])}
            </Text>
            <View style={{ height: 24 }} />
            <View style={{ flexDirection: "row", alignSelf: "stretch" }}>
              <View style={{ flex: 1 }}>
                <BigChoice
                  label={t("plan.label_rest")}
                  selected={isRest}
                  onPress={() => setIsRest(true)}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <BigChoice
                  label={t("plan.label_workout")}
                  selected={!isRest}
                  onPress={() => setIsRest(false)}
                />
              </View>
            </View>
            <View style={{ height: 24 }} />
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={confirm}
              style={{
                width: "100%",
                backgroundColor: AppColors.primary,
                paddingVertical: 16,
                borderRadius: 100,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontWeight: "800",
                  fontSize: 14,
                  letterSpacing: 1.5,
                  color: AppColors.background,
                }}
              >
                {t("common.done")}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

/** Full-width tap target with a single label — paired side-by-side they give
 *  the user a clear REST / WORKOUT binary. */
function BigChoice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        paddingVertical: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: selected ? AppColors.primary : AppColors.surfaceLow,
        borderRadius: 20,
        borderWidth: selected ? 0 : 1,
        borderColor: selected ? "transparent" : AppColors.outline,
      }}
    >
      <Text
        style={{
          fontSize: 15,
          letterSpacing: 1.5,
          fontWeight: "800",
          color: selected ? AppColors.background : AppColors.onSurface,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Time picker (replaces the native showTimePicker)
// ---------------------------------------------------------------------------

function TimePickerSheet({
  open,
  value,
  onClose,
  onConfirm,
}: {
  open: boolean;
  value: { hour: number; minute: number };
  onClose: () => void;
  onConfirm: (v: { hour: number; minute: number }) => void;
}) {
  const { t } = useLang();
  const [hour, setHour] = useState(value.hour);
  const [minute, setMinute] = useState(value.minute);

  // Re-sync when reopened with a (potentially) new value.
  React.useEffect(() => {
    if (open) {
      setHour(value.hour);
      setMinute(value.minute);
    }
  }, [open, value.hour, value.minute]);

  return (
    <Modal transparent animationType="slide" visible={open} onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={{
            backgroundColor: AppColors.background,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 20,
          }}
        >
          <View
            style={{
              alignSelf: "center",
              marginBottom: 16,
              height: 4,
              width: 40,
              backgroundColor: AppColors.surfaceHigh,
              borderRadius: 100,
            }}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <TimeSpinner
              value={hour}
              onChange={(v) => setHour((v + 24) % 24)}
            />
            <Text
              style={{
                fontSize: 40,
                fontWeight: "800",
                color: AppColors.onSurface,
                marginHorizontal: 8,
              }}
            >
              :
            </Text>
            <TimeSpinner
              value={minute}
              onChange={(v) => setMinute((v + 60) % 60)}
            />
          </View>
          <View style={{ height: 24 }} />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onConfirm({ hour, minute })}
            style={{
              width: "100%",
              backgroundColor: AppColors.primary,
              paddingVertical: 16,
              borderRadius: 100,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontWeight: "800",
                fontSize: 14,
                letterSpacing: 1.5,
                color: AppColors.background,
              }}
            >
              {t("common.done")}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function TimeSpinner({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <View style={{ alignItems: "center" }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onChange(value + 1)}
        style={{ padding: 8 }}
      >
        <MaterialIcons name="keyboard-arrow-up" size={28} color={AppColors.onSurface} />
      </TouchableOpacity>
      <Text
        style={{
          fontSize: 40,
          fontWeight: "800",
          color: AppColors.onSurface,
          width: 64,
          textAlign: "center",
        }}
      >
        {String(value).padStart(2, "0")}
      </Text>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onChange(value - 1)}
        style={{ padding: 8 }}
      >
        <MaterialIcons name="keyboard-arrow-down" size={28} color={AppColors.onSurface} />
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Row + chip widgets
// ---------------------------------------------------------------------------

function DayRow({
  dayLabel,
  token,
  restLabel,
  workLabel,
  onPress,
}: {
  dayLabel: string;
  token: string;
  restLabel: string;
  workLabel: string;
  onPress: () => void;
}) {
  const isRest = token === "rest";
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={{ paddingVertical: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text
          style={{
            flex: 1,
            fontSize: 13,
            letterSpacing: 1.4,
            color: AppColors.onSurface,
            fontWeight: "800",
          }}
        >
          {dayLabel}
        </Text>
        <ValueBadges isRest={isRest} restLabel={restLabel} workLabel={workLabel} />
        <View style={{ width: 8 }} />
        <MaterialIcons name="chevron-right" size={18} color={AppColors.muted} />
      </View>
    </TouchableOpacity>
  );
}

/** Single pill that reads either REST (outline) or WORKOUT (filled). */
function ValueBadges({
  isRest,
  restLabel,
  workLabel,
}: {
  isRest: boolean;
  restLabel: string;
  workLabel: string;
}) {
  const label = isRest ? restLabel : workLabel;
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        backgroundColor: isRest ? "transparent" : AppColors.onSurface,
        borderWidth: isRest ? 1 : 0,
        borderColor: isRest ? AppColors.surfaceHigh : "transparent",
        borderRadius: 100,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          letterSpacing: 1.2,
          fontWeight: "800",
          color: isRest ? AppColors.muted : AppColors.background,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
