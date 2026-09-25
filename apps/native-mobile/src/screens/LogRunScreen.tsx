// Ported 1:1 from apps/mobile/lib/screens/log_run_screen.dart.
//
// Log a cardio run — distance + time — as a workout session. Stored with a
// `metric: "distance"` exercise carrying distanceM + seconds (the same set
// fields HYROX uses), so it shows up in history / calendar / progress like any
// other session, plus its distance and pace.
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialIcons } from "@expo/vector-icons";
import { Screen } from "../components/ui";
import { AppColors, AppText } from "../theme";
import { useLang } from "../hooks/useLang";
import { Api, ApiException } from "../lib/api";
import type { RootNav } from "../navigation/types";

const MAX = 1 << 30;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function LogRunScreen({
  navigation,
  onSaved,
}: {
  navigation: RootNav;
  onSaved?: () => void;
}) {
  const { t } = useLang();
  const api = useMemo(() => new Api(), []);

  const [km, setKm] = useState("");
  const [min, setMin] = useState("");
  const [sec, setSec] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const distanceM = clamp(
    Math.round((parseFloat(km.replace(/,/g, ".")) || 0) * 1000),
    0,
    MAX,
  );
  const totalSec = clamp(
    (parseInt(min, 10) || 0) * 60 + (parseInt(sec, 10) || 0),
    0,
    MAX,
  );

  let pace: string | null = null;
  if (distanceM > 0 && totalSec > 0) {
    const secPerKm = totalSec / (distanceM / 1000);
    const m = Math.trunc(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    pace = `${m}:${String(s).padStart(2, "0")} /km`;
  }

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  async function save() {
    if (saving) return;
    if (distanceM <= 0 && totalSec <= 0) {
      Alert.alert(t("run.need"));
      return;
    }
    setSaving(true);
    // finishedAt: today → now; a past date → noon that day. startedAt spans the run.
    const finishedAt = isToday
      ? new Date()
      : new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
    const startedAt = new Date(finishedAt.getTime() - totalSec * 1000);
    const name = t("run.name");
    try {
      await api.createSession({
        name,
        startedAt,
        finishedAt,
        exercises: [
          {
            exerciseId: "cardio_run",
            name,
            gifUrl: "",
            targetMuscles: ["cardiovascular system"],
            metric: "distance",
            sets: [
              {
                kg: 0,
                reps: 0,
                done: true,
                distanceM,
                seconds: totalSec,
              },
            ],
          },
        ],
      });
      onSaved?.();
      navigation.goBack();
    } catch (e) {
      const msg = e instanceof ApiException ? e.message : t("run.failed");
      Alert.alert(msg);
      setSaving(false);
    }
  }

  function label(s: string) {
    return (
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 1.2,
          color: AppColors.muted,
        }}
      >
        {s}
      </Text>
    );
  }

  function bigField(opts: {
    value: string;
    onChangeText: (v: string) => void;
    hint: string;
    suffix: string;
    decimal?: boolean;
    max?: number;
  }) {
    const { value, onChangeText, hint, suffix, decimal = false, max } = opts;
    return (
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 6,
          backgroundColor: AppColors.surfaceLow,
          borderRadius: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          <TextInput
            value={value}
            keyboardType={decimal ? "decimal-pad" : "number-pad"}
            onChangeText={(v) => {
              // Mirror Flutter's inputFormatters: decimal allows [0-9.,];
              // otherwise digits only.
              let next = decimal ? v.replace(/[^0-9.,]/g, "") : v.replace(/[^0-9]/g, "");
              if (max != null && (parseInt(next, 10) || 0) > max) {
                next = String(max);
              }
              onChangeText(next);
            }}
            placeholder={hint}
            placeholderTextColor={AppColors.surfaceHigh}
            cursorColor={AppColors.onSurface}
            style={{
              flex: 1,
              paddingVertical: 0,
              fontSize: 32,
              fontWeight: "800",
              color: AppColors.onSurface,
            }}
          />
          <Text
            style={{
              marginBottom: 8,
              marginLeft: 6,
              fontSize: 17,
              fontWeight: "600",
              color: AppColors.muted,
            }}
          >
            {suffix}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Screen>
      {/* AppBar. */}
      <View
        style={{
          height: 56,
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: 4,
          paddingRight: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={{
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="arrow-back" size={24} color={AppColors.onSurface} />
        </TouchableOpacity>
        <Text style={[AppText.titleLarge, { marginLeft: 4 }]}>{t("run.title")}</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={save}
          disabled={saving}
          activeOpacity={0.85}
          style={{
            backgroundColor: AppColors.primary,
            borderRadius: 100,
            paddingHorizontal: 20,
            paddingVertical: 8,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={AppColors.background} />
          ) : (
            <Text style={{ color: AppColors.background, fontWeight: "700" }}>
              {t("common.save")}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 32,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 48,
              height: 48,
              backgroundColor: AppColors.surfaceLow,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="directions-run" color={AppColors.onSurface} size={24} />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 26,
                fontWeight: "800",
                letterSpacing: -1,
                color: AppColors.onSurface,
              }}
            >
              {t("run.title")}
            </Text>
            <Text style={{ fontSize: 14, color: AppColors.muted }}>
              {t("run.subtitle")}
            </Text>
          </View>
        </View>
        <View style={{ height: 28 }} />

        {/* distance */}
        {label(t("run.distance"))}
        <View style={{ height: 8 }} />
        {bigField({ value: km, onChangeText: setKm, hint: "5.0", suffix: "km", decimal: true })}

        <View style={{ height: 20 }} />

        {/* time */}
        {label(t("run.time"))}
        <View style={{ height: 8 }} />
        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1 }}>
            {bigField({ value: min, onChangeText: setMin, hint: "30", suffix: t("run.min") })}
          </View>
          <View style={{ width: 8 }} />
          <View style={{ flex: 1 }}>
            {bigField({ value: sec, onChangeText: setSec, hint: "00", suffix: t("run.sec"), max: 59 })}
          </View>
        </View>

        <View style={{ height: 20 }} />

        {/* date */}
        {label(t("run.date"))}
        <View style={{ height: 8 }} />
        <TouchableOpacity activeOpacity={0.7} onPress={() => setShowPicker(true)}>
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: AppColors.surfaceLow,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: AppColors.onSurface,
              }}
            >
              {`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
                date.getDate(),
              ).padStart(2, "0")}`}
            </Text>
            <View style={{ flex: 1 }} />
            <MaterialIcons name="calendar-today" color={AppColors.muted} size={18} />
          </View>
        </TouchableOpacity>

        {pace != null ? (
          <>
            <View style={{ height: 24 }} />
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: AppColors.outline,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 1.2,
                  color: AppColors.muted,
                }}
              >
                {t("run.pace")}
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: AppColors.onSurface,
                }}
              >
                {pace}
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      {showPicker ? (
        <DateTimePicker
          value={date}
          mode="date"
          minimumDate={new Date(now.getFullYear() - 2, 0, 1)}
          maximumDate={now}
          onChange={(event, selected) => {
            setShowPicker(false);
            if (event.type !== "dismissed" && selected) setDate(selected);
          }}
        />
      ) : null}
    </Screen>
  );
}
