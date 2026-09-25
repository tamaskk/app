// Ported 1:1 from apps/mobile/lib/screens/create_training_screen.dart.
//
// Create / edit a training: fuzzy-search or browse the exercise catalogue,
// filter by body part, add your own custom exercise, toggle-select exercises,
// inspect an exercise's full detail sheet, then save (3 empty default sets per
// exercise, editable later). When an existing training is passed the screen
// enters edit mode: name + selection are pre-filled and Save PATCHes instead of
// POSTing, preserving each already-saved exercise's sets.
import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { Screen } from "../components/ui";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";
import { useAuth } from "../context/AuthContext";
import { Api, ApiException, FreeTierLimitException } from "../lib/api";
import { ExerciseApi, ApiExercise } from "../lib/exerciseApi";
import { SavedTraining } from "../models/apiModels";
import { exLabel, exLabels } from "../utils/exerciseLabels";
import type { RootNav } from "../navigation/types";

const PAGE_SIZE = 20;

/// Capitalises the first letter of every word: "side lying (male)" -> "Side
/// Lying (Male)". Leaves the rest of each word as-is.
function titleCase(s: string): string {
  return s.replace(/\w+/g, (m) => m[0].toUpperCase() + m.slice(1));
}

/// Light client-side shuffle so the browse feed feels varied ("random"),
/// without reordering items already on screen. Seeded by length to stay stable
/// across rebuilds of the same batch (mirrors Dart's `Random(items.length)`).
function shuffled(items: ApiExercise[]): ApiExercise[] {
  const copy = [...items];
  let seed = items.length | 0;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

// ---------------------------------------------------------------------------
// ExerciseImage — 2-frame fake-GIF preview with graceful fallbacks.
// (Ported from apps/mobile/lib/widgets/exercise_image.dart.)
// ---------------------------------------------------------------------------
function ExerciseImage({
  frames,
  contentFit = "cover",
  iconSize = 24,
  showLabel = false,
  compact = false,
}: {
  frames: string[];
  contentFit?: "cover" | "contain";
  iconSize?: number;
  showLabel?: boolean;
  compact?: boolean;
}) {
  const resolved = React.useMemo(() => {
    const explicit = frames.filter((f) => f.trim().length > 0);
    return Array.from(new Set(explicit)); // dedupe, preserve order
  }, [frames.join("|")]);
  const [index, setIndex] = React.useState(0);
  const [failed, setFailed] = React.useState<string[]>([]);

  React.useEffect(() => {
    setIndex(0);
    setFailed([]);
    if (resolved.length < 2) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % resolved.length),
      500,
    );
    return () => clearInterval(id);
  }, [resolved]);

  const usable = resolved.filter((f) => !failed.includes(f));
  if (usable.length === 0) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="fitness-center" size={iconSize} color={AppColors.muted} />
        {showLabel ? (
          <Text
            style={{
              color: AppColors.muted,
              fontSize: compact ? 8.5 : 13,
              fontWeight: "600",
              letterSpacing: compact ? 0 : 0.5,
              marginTop: compact ? 3 : 10,
              textAlign: "center",
            }}
          >
            Hamarosan
          </Text>
        ) : null}
      </View>
    );
  }
  const current = usable[index % usable.length];
  return (
    <Image
      source={{ uri: current }}
      style={StyleSheet.absoluteFill}
      contentFit={contentFit}
      onError={() => setFailed((prev) => (prev.includes(current) ? prev : [...prev, current]))}
    />
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export function CreateTrainingScreen({
  navigation,
  route,
  training,
}: {
  navigation: RootNav;
  route?: any;
  training?: SavedTraining;
}) {
  const { t } = useLang();
  const { auth } = useAuth();
  const apiRef = React.useRef(new Api());
  const exApiRef = React.useRef(new ExerciseApi());
  const api = apiRef.current;
  const exApi = exApiRef.current;

  // Existing training to edit (via prop or route param). Save PATCHes when set.
  const editing: SavedTraining | undefined =
    training ?? (route?.params?.training as SavedTraining | undefined);

  // Sets to preserve for exercises already saved on the training (keyed by id).
  const existingSetsRef = React.useRef<Record<string, { kg: number; reps: number }[]>>({});

  const [name, setName] = React.useState(editing?.name ?? "");
  const [search, setSearch] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Catalogue / paging state.
  const [results, setResults] = React.useState<ApiExercise[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);
  const nextCursorRef = React.useRef<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const requestIdRef = React.useRef(0);

  // Browse filter — by body part (Chest, Back, Shoulders …).
  const [bodyParts, setBodyParts] = React.useState<string[]>([]);
  const [bodyPartFilter, setBodyPartFilter] = React.useState<string | null>(null);
  const bodyPartFilterRef = React.useRef<string | null>(null);

  // Target-muscle options for the custom-exercise sheet.
  const [muscles, setMuscles] = React.useState<string[]>([]);

  // Picked exercises, keyed by catalogue id so toggling is cheap.
  const [selected, setSelected] = React.useState<Record<string, ApiExercise>>(() => {
    if (!editing) return {};
    const map: Record<string, ApiExercise> = {};
    for (const e of editing.exercises) {
      map[e.exerciseId] = new ApiExercise(e.exerciseId, e.name, e.gifUrl, [], e.targetMuscles);
      existingSetsRef.current[e.exerciseId] = e.sets.map((s) => ({ kg: s.kg, reps: s.reps }));
    }
    return map;
  });

  // User-created exercises (and, in edit mode, the pre-selected ones) pinned to
  // the top so they survive search / filter changes and stay toggleable.
  const [customExercises, setCustomExercises] = React.useState<ApiExercise[]>(() =>
    editing ? editing.exercises.map((e) => selectedFromSaved(e.exerciseId)) : [],
  );
  // Helper only used for the initial custom list (avoids referencing `selected`
  // before it's declared). Pulls from the same source as the selected map.
  function selectedFromSaved(id: string): ApiExercise {
    const e = editing!.exercises.find((x) => x.exerciseId === id)!;
    return new ApiExercise(e.exerciseId, e.name, e.gifUrl, [], e.targetMuscles);
  }

  const [detailExercise, setDetailExercise] = React.useState<ApiExercise | null>(null);
  const [customSheetOpen, setCustomSheetOpen] = React.useState(false);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const searching = search.trim().length >= 2;

  const friendlyError = React.useCallback(
    (e: ApiException): string => {
      if (e.statusCode === 500 || e.statusCode === 503) return t("create.db_unavailable");
      if (e.statusCode === 429) return t("create.too_many_requests");
      return e.message;
    },
    [t],
  );

  /// Resets the list and loads the first page (fuzzy search or filtered browse).
  const loadFirstPage = React.useCallback(async () => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setResults([]);
    nextCursorRef.current = null;
    setHasMore(false);
    try {
      const query = search.trim();
      if (query.length >= 2) {
        const res = await exApi.searchExercises(query, { limit: 30 });
        if (reqId !== requestIdRef.current) return;
        setResults(res);
        setHasMore(false);
      } else {
        const page = await exApi.listExercises({
          bodyParts: bodyPartFilterRef.current == null ? undefined : [bodyPartFilterRef.current],
          limit: PAGE_SIZE,
        });
        if (reqId !== requestIdRef.current) return;
        setResults(shuffled(page.items));
        nextCursorRef.current = page.nextCursor;
        setHasMore(page.hasNextPage && page.nextCursor != null);
      }
    } catch (e) {
      if (reqId !== requestIdRef.current) return;
      if (e instanceof ApiException) setError(friendlyError(e));
      else setError(t("create.server_unreachable"));
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [search, exApi, friendlyError, t]);

  /// Appends the next page in browse mode (search results aren't paginated).
  const loadMore = React.useCallback(async () => {
    if (searching || loadingMore || !hasMore || nextCursorRef.current == null) return;
    const reqId = requestIdRef.current; // same request lineage as the current list
    setLoadingMore(true);
    try {
      const page = await exApi.listExercises({
        bodyParts: bodyPartFilterRef.current == null ? undefined : [bodyPartFilterRef.current],
        limit: PAGE_SIZE,
        after: nextCursorRef.current,
      });
      if (reqId !== requestIdRef.current) return;
      setResults((prev) => [...prev, ...shuffled(page.items)]);
      nextCursorRef.current = page.nextCursor;
      setHasMore(page.hasNextPage && page.nextCursor != null);
    } catch {
      // Keep what we have; the user can scroll again to retry.
    } finally {
      if (reqId === requestIdRef.current) setLoadingMore(false);
    }
  }, [searching, loadingMore, hasMore, exApi]);

  // initState: load filters + first page once.
  React.useEffect(() => {
    exApi
      .bodyParts()
      .then((parts) => setBodyParts(parts))
      .catch(() => {});
    exApi
      .muscles()
      .then((ms) => setMuscles(ms))
      .catch(() => {});
    loadFirstPage();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      exApi.dispose();
      apiRef.current; // no dispose needed on the RN Api client
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearchChanged = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadFirstPage(), 350);
  };

  const selectBodyPart = (bodyPart: string | null) => {
    setBodyPartFilter(bodyPart);
    bodyPartFilterRef.current = bodyPart;
    loadFirstPage();
  };

  const toggle = (ex: ApiExercise) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (ex.exerciseId in next) delete next[ex.exerciseId];
      else next[ex.exerciseId] = ex;
      return next;
    });
  };

  const addCustomExercise = (opts: {
    name: string;
    targetMuscle?: string | null;
    equipment?: string | null;
    note?: string | null;
    gifUrl?: string | null;
  }) => {
    // Synthetic id — `custom_` prefix lets the backend / future migrations tell
    // user-generated rows apart from catalogue ids.
    const id = `custom_${Date.now()}_${Math.floor(Math.random() * 0xffffff)}`;
    const muscle = (opts.targetMuscle ?? "").trim();
    const equip = (opts.equipment ?? "").trim();
    const noteText = (opts.note ?? "").trim();
    const gif = (opts.gifUrl ?? "").trim();
    const ex = new ApiExercise(
      id,
      opts.name.trim(),
      gif,
      [],
      muscle.length === 0 ? [] : [muscle.toLowerCase()],
      [],
      equip.length === 0 ? [] : [equip.toLowerCase()],
      [],
      noteText.length === 0 ? [] : [noteText],
    );
    // Newest custom exercise on top.
    setCustomExercises((prev) => [ex, ...prev]);
    // Auto-select so the "Mentés (N)" counter updates instantly.
    setSelected((prev) => ({ ...prev, [ex.exerciseId]: ex }));
  };

  const snack = (msg: string) => {
    // eslint-disable-next-line no-alert
    Alert.alert(msg);
  };

  /// Modal explaining the free-tier ceiling + a single CTA into the paywall.
  const showFreeTierLimit = (limit: number) => {
    Alert.alert(t("free_limit.title"), t("free_limit.body", { n: limit }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("free_limit.cta"),
        onPress: () => navigation.navigate("Paywall"),
      },
    ]);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      snack(t("create.give_name"));
      return;
    }
    if (Object.keys(selected).length === 0) {
      snack(t("create.add_exercise"));
      return;
    }
    setSaving(true);
    try {
      const exercises = Object.values(selected).map((e) => ({
        exerciseId: e.exerciseId,
        name: e.name,
        gifUrl: e.gifUrl,
        targetMuscles: e.targetMuscles,
        // Preserve saved sets on edit; otherwise 3 empty sets, editable later.
        sets:
          existingSetsRef.current[e.exerciseId] ??
          Array.from({ length: 3 }, () => ({ kg: 0, reps: 0 })),
      }));
      if (editing) {
        await api.updateTraining(editing.id, exercises, trimmed);
      } else {
        await api.createTraining(trimmed, exercises);
      }
      navigation.goBack();
    } catch (e) {
      if (e instanceof FreeTierLimitException) {
        showFreeTierLimit(e.limit);
      } else if (e instanceof ApiException) {
        snack(friendlyError(e));
      } else {
        snack(t("create.save_failed"));
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = Object.keys(selected).length;

  // Custom exercises are pinned to the top of the displayed list so they
  // survive search / muscle-filter changes.
  const display = [...customExercises, ...results];
  const showLoader = hasMore && !searching;

  const detailSelected = detailExercise != null && detailExercise.exerciseId in selected;

  return (
    <Screen edges={["top", "left", "right"]}>
      {/* Header (AppBar equivalent). */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={AppColors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("create.title")}</Text>
        <TouchableOpacity
          disabled={saving}
          onPress={save}
          activeOpacity={0.85}
          style={styles.savePill}
        >
          {saving ? (
            <ActivityIndicator size="small" color={AppColors.background} />
          ) : (
            <Text style={styles.savePillText}>{t("create.save_count", { n: selectedCount })}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Name. */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t("create.name_hint")}
          placeholderTextColor={AppColors.muted}
          style={styles.nameInput}
          cursorColor={AppColors.onSurface}
        />
      </View>

      {/* Search. */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color={AppColors.muted} />
          <TextInput
            value={search}
            onChangeText={onSearchChanged}
            placeholder={t("create.search_exercises")}
            placeholderTextColor={AppColors.muted}
            returnKeyType="search"
            onSubmitEditing={() => loadFirstPage()}
            style={styles.searchInput}
            cursorColor={AppColors.onSurface}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Body-part filter — only while browsing (not fuzzy-searching). */}
      {bodyParts.length > 0 && !searching ? (
        <View style={{ height: 44 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, alignItems: "center" }}
          >
            <Chip
              label={t("create.all_filter")}
              active={bodyPartFilter == null}
              onPress={() => selectBodyPart(null)}
            />
            {bodyParts.map((p) => (
              <Chip
                key={p}
                label={exLabel(p)}
                active={bodyPartFilter === p}
                onPress={() => selectBodyPart(bodyPartFilter === p ? null : p)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* "+ Saját gyakorlat" affordance. */}
      <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
        <TouchableOpacity
          onPress={() => setCustomSheetOpen(true)}
          activeOpacity={0.7}
          style={styles.ownButton}
        >
          <View style={styles.ownIcon}>
            <MaterialIcons name="add" size={22} color={AppColors.onSurface} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.ownTitle}>{t("custom.title")}</Text>
            <Text style={styles.ownSubtitle}>{t("custom.subtitle_card")}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={AppColors.muted} />
        </TouchableOpacity>
      </View>

      {/* Results. */}
      <View style={{ flex: 1 }}>
        {loading && display.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={AppColors.onSurface} />
          </View>
        ) : error != null && display.length === 0 ? (
          <View style={[styles.center, { padding: 32 }]}>
            <MaterialIcons name="cloud-off" size={40} color={AppColors.muted} />
            <Text style={{ color: AppColors.muted, textAlign: "center", marginTop: 12 }}>
              {error}
            </Text>
            <TouchableOpacity onPress={() => loadFirstPage()} style={{ marginTop: 16 }}>
              <Text style={{ color: AppColors.onSurface, fontWeight: "700" }}>
                {t("common.retry")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : display.length === 0 ? (
          <View style={styles.center}>
            <Text style={{ color: AppColors.muted }}>{t("common.no_results")}</Text>
          </View>
        ) : (
          <FlatList
            data={display}
            keyExtractor={(item, i) => `${item.exerciseId}-${i}`}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 }}
            onEndReached={() => loadMore()}
            onEndReachedThreshold={0.4}
            renderItem={({ item, index }) => {
              const isSel = item.exerciseId in selected;
              return (
                <TouchableOpacity
                  onPress={() => setDetailExercise(item)}
                  activeOpacity={0.7}
                  style={[
                    styles.row,
                    index === 0
                      ? null
                      : { borderTopWidth: 1, borderTopColor: AppColors.outline },
                  ]}
                >
                  <View style={styles.thumb}>
                    <ExerciseImage frames={item.imageFrames} iconSize={18} showLabel compact />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text numberOfLines={1} style={styles.rowTitle}>
                      {titleCase(item.name)}
                    </Text>
                    {item.targetMuscles.length > 0 ? (
                      <Text numberOfLines={1} style={styles.rowSubtitle}>
                        {titleCase(exLabels(item.targetMuscles).join(", "))}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => toggle(item)}
                    hitSlop={8}
                    style={{ padding: 4, marginLeft: 8 }}
                  >
                    <MaterialIcons
                      name={isSel ? "check-circle" : "add-circle-outline"}
                      size={24}
                      color={isSel ? AppColors.onSurface : AppColors.muted}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              showLoader ? (
                <View style={{ paddingVertical: 20, alignItems: "center" }}>
                  <ActivityIndicator color={AppColors.onSurface} />
                </View>
              ) : null
            }
          />
        )}
      </View>

      {/* Exercise detail sheet. */}
      <Modal
        visible={detailExercise != null}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailExercise(null)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setDetailExercise(null)}
          />
          <View style={styles.sheet}>
            <View style={styles.grabHandle} />
            {detailExercise != null ? (
              <ExerciseDetailSheet
                t={t}
                exercise={detailExercise}
                selected={detailSelected}
                onToggle={() => toggle(detailExercise)}
              />
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Custom-exercise sheet. */}
      <Modal
        visible={customSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCustomSheetOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.sheetBackdrop}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setCustomSheetOpen(false)}
            />
            <View style={styles.sheet}>
              <View style={styles.grabHandle} />
              <CustomExerciseSheet
                t={t}
                muscles={muscles}
                onCreate={(opts) => {
                  addCustomExercise(opts);
                  setCustomSheetOpen(false);
                }}
                onCancel={() => setCustomSheetOpen(false)}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Body-part chip
// ---------------------------------------------------------------------------
function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ paddingHorizontal: 14 }}>
      <View style={{ alignItems: "center", justifyContent: "center", flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: active ? "700" : "600",
            color: active ? AppColors.onSurface : AppColors.muted,
          }}
        >
          {titleCase(label)}
        </Text>
        <View
          style={{
            marginTop: 6,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: active ? AppColors.onSurface : "transparent",
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Exercise detail sheet
// ---------------------------------------------------------------------------
function ExerciseDetailSheet({
  t,
  exercise,
  selected,
  onToggle,
}: {
  t: (key: string, params?: Record<string, string | number>) => string;
  exercise: ApiExercise;
  selected: boolean;
  onToggle: () => void;
}) {
  const sectionLabel = (text: string) => (
    <Text style={styles.sectionLabel}>{text.toUpperCase()}</Text>
  );

  const chipsSection = (title: string, values: string[]) => {
    if (values.length === 0) return null;
    return (
      <View style={{ alignItems: "flex-start" }}>
        <View style={{ height: 16 }} />
        {sectionLabel(title)}
        <View style={{ height: 8 }} />
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {values.map((v, i) => (
            <View key={`${v}-${i}`} style={styles.detailChip}>
              <Text style={styles.detailChipText}>{titleCase(v)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const instructions = exercise.instructions;

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 }}>
      <View style={styles.gifBox}>
        <ExerciseImage frames={exercise.imageFrames} contentFit="contain" iconSize={48} showLabel />
      </View>
      <View style={{ height: 20 }} />
      <Text style={styles.detailName}>{titleCase(exercise.name)}</Text>
      <View style={{ height: 4 }} />
      <Text style={{ fontSize: 12, color: AppColors.muted }}>{`ID: ${exercise.exerciseId}`}</Text>
      <View style={{ height: 16 }} />

      {/* Toggle button. */}
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.85}
        style={[
          styles.toggleBtn,
          selected
            ? { backgroundColor: "transparent", borderWidth: 1, borderColor: AppColors.outline }
            : { backgroundColor: AppColors.primary },
        ]}
      >
        <Text
          style={{
            fontWeight: "700",
            fontSize: 15,
            color: selected ? AppColors.onSurface : AppColors.background,
          }}
        >
          {selected ? t("detail.remove") : t("detail.add")}
        </Text>
      </TouchableOpacity>
      <View style={{ height: 8 }} />

      {chipsSection(t("detail.target_muscles"), exLabels(exercise.targetMuscles))}
      {chipsSection(t("detail.secondary_muscles"), exLabels(exercise.secondaryMuscles))}
      {chipsSection(t("detail.body_parts"), exLabels(exercise.bodyParts))}
      {chipsSection(t("detail.equipment"), exLabels(exercise.equipments))}

      {instructions.length > 0 ? (
        <View style={{ alignItems: "flex-start" }}>
          <View style={{ height: 24 }} />
          {sectionLabel(t("detail.execution"))}
          <View style={{ height: 8 }} />
          {instructions.map((step, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 12 }}>
              <View style={{ width: 24 }}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: AppColors.muted }}>
                  {i + 1}
                </Text>
              </View>
              <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: AppColors.onSurface }}>
                {step.replace(/^Step:\d+\s*/, "")}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Custom-exercise sheet
// ---------------------------------------------------------------------------
function CustomExerciseSheet({
  t,
  muscles,
  onCreate,
  onCancel,
}: {
  t: (key: string, params?: Record<string, string | number>) => string;
  muscles: string[];
  onCreate: (opts: {
    name: string;
    targetMuscle?: string | null;
    equipment?: string | null;
    note?: string | null;
    gifUrl?: string | null;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState("");
  const [equipment, setEquipment] = React.useState("");
  const [note, setNote] = React.useState("");
  const [gifUrl, setGifUrl] = React.useState("");
  const [muscle, setMuscle] = React.useState<string | null>(null);
  const [musclePickerOpen, setMusclePickerOpen] = React.useState(false);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [gifError, setGifError] = React.useState<string | null>(null);

  const validateUrl = (value: string): string | null => {
    const v = value.trim();
    if (v.length === 0) return null; // optional field
    let uri: URL | null = null;
    try {
      uri = new URL(v);
    } catch {
      uri = null;
    }
    if (uri == null) return t("custom.gif_invalid");
    if (uri.protocol !== "https:" && uri.protocol !== "http:") {
      return t("custom.gif_invalid_scheme");
    }
    return null;
  };

  const submit = () => {
    const s = name.trim();
    let nameErr: string | null = null;
    if (s.length === 0) nameErr = t("custom.name_required");
    else if (s.length > 80) nameErr = t("custom.name_too_long");
    const gifErr = validateUrl(gifUrl);
    setNameError(nameErr);
    setGifError(gifErr);
    if (nameErr != null || gifErr != null) return;
    onCreate({ name, targetMuscle: muscle, equipment, note, gifUrl });
  };

  const label = (text: string) => <Text style={styles.formLabel}>{text.toUpperCase()}</Text>;

  const gifTrimmed = gifUrl.trim();
  const gifValid = validateUrl(gifTrimmed) == null;

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.detailName}>{t("custom.title")}</Text>
      <View style={{ height: 4 }} />
      <Text style={{ fontSize: 13, color: AppColors.muted }}>{t("custom.intro")}</Text>
      <View style={{ height: 24 }} />

      {label(t("custom.name_label"))}
      <View style={{ height: 6 }} />
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t("custom.name_hint")}
        placeholderTextColor={AppColors.muted}
        autoFocus
        style={[styles.formInput, nameError != null ? styles.formInputError : null]}
        cursorColor={AppColors.onSurface}
      />
      {nameError != null ? <Text style={styles.errorText}>{nameError}</Text> : null}
      <View style={{ height: 20 }} />

      {label(t("custom.muscle_label"))}
      <View style={{ height: 6 }} />
      {muscles.length === 0 ? (
        // Offline / first launch: plain text input, normalised on save.
        <TextInput
          value={muscle ?? ""}
          onChangeText={(v) => setMuscle(v)}
          placeholder={t("custom.muscle_freeform_hint")}
          placeholderTextColor={AppColors.muted}
          style={styles.formInput}
          cursorColor={AppColors.onSurface}
        />
      ) : (
        <TouchableOpacity
          onPress={() => setMusclePickerOpen(true)}
          activeOpacity={0.7}
          style={styles.formInput}
        >
          <Text style={{ color: muscle == null ? AppColors.muted : AppColors.onSurface, fontSize: 15 }}>
            {muscle == null ? t("custom.muscle_pick") : titleCase(muscle)}
          </Text>
        </TouchableOpacity>
      )}
      <View style={{ height: 20 }} />

      {label(t("custom.equipment_label"))}
      <View style={{ height: 6 }} />
      <TextInput
        value={equipment}
        onChangeText={setEquipment}
        placeholder={t("custom.equipment_hint")}
        placeholderTextColor={AppColors.muted}
        style={styles.formInput}
        cursorColor={AppColors.onSurface}
      />
      <View style={{ height: 20 }} />

      {label(t("custom.note_label"))}
      <View style={{ height: 6 }} />
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder={t("custom.note_hint")}
        placeholderTextColor={AppColors.muted}
        multiline
        numberOfLines={3}
        style={[styles.formInput, { minHeight: 80, textAlignVertical: "top" }]}
        cursorColor={AppColors.onSurface}
      />
      <View style={{ height: 20 }} />

      {label(t("custom.gif_label"))}
      <View style={{ height: 6 }} />
      <TextInput
        value={gifUrl}
        onChangeText={setGifUrl}
        placeholder={t("custom.gif_hint")}
        placeholderTextColor={AppColors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.formInput, gifError != null ? styles.formInputError : null]}
        cursorColor={AppColors.onSurface}
      />
      {gifError != null ? <Text style={styles.errorText}>{gifError}</Text> : null}
      <View style={{ height: 10 }} />

      {/* Live GIF preview. */}
      {gifTrimmed.length > 0 ? (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={styles.gifPreviewBox}>
            {!gifValid ? (
              <MaterialIcons name="broken-image" size={22} color={AppColors.muted} />
            ) : (
              <Image
                source={{ uri: gifTrimmed }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
            )}
          </View>
          <Text style={{ flex: 1, marginLeft: 12, fontSize: 12, color: AppColors.muted }}>
            {gifValid ? t("custom.preview") : t("custom.preview_invalid")}
          </Text>
        </View>
      ) : null}
      <View style={{ height: 28 }} />

      <TouchableOpacity onPress={submit} activeOpacity={0.85} style={styles.submitBtn}>
        <Text style={{ fontWeight: "700", fontSize: 15, color: AppColors.background }}>
          {t("custom.add_to_workout")}
        </Text>
      </TouchableOpacity>
      <View style={{ height: 8 }} />
      <TouchableOpacity onPress={onCancel} style={{ alignItems: "center", paddingVertical: 12 }}>
        <Text style={{ color: AppColors.muted }}>{t("common.cancel")}</Text>
      </TouchableOpacity>

      {/* Muscle picker (nested modal). */}
      <Modal
        visible={musclePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMusclePickerOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setMusclePickerOpen(false)}
          />
          <View style={[styles.sheet, { maxHeight: "70%" }]}>
            <View style={styles.grabHandle} />
            <FlatList
              data={muscles}
              keyExtractor={(m) => m}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setMuscle(item);
                    setMusclePickerOpen(false);
                  }}
                  style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: AppColors.outline }}
                >
                  <Text style={{ color: AppColors.onSurface, fontSize: 15 }}>{titleCase(item)}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    flex: 1,
    marginLeft: 8,
    fontSize: 20,
    fontWeight: "700",
    color: AppColors.onSurface,
  },
  savePill: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 100,
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  savePillText: { color: AppColors.background, fontWeight: "700", fontSize: 15 },
  nameInput: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
    color: AppColors.onSurface,
    padding: 0,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppColors.outline,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 12,
    color: AppColors.onSurface,
    fontSize: 15,
  },
  ownButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppColors.outline,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  ownIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: AppColors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  ownTitle: { fontSize: 15, fontWeight: "700", color: AppColors.onSurface },
  ownSubtitle: { fontSize: 12, color: AppColors.muted, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: AppColors.surfaceHigh,
  },
  rowTitle: { fontSize: 15, fontWeight: "700", color: AppColors.onSurface },
  rowSubtitle: { fontSize: 12, color: AppColors.muted, marginTop: 2 },
  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    maxHeight: "92%",
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: AppColors.outline,
  },
  grabHandle: {
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
    width: 40,
    height: 4,
    borderRadius: 100,
    backgroundColor: AppColors.surfaceHigh,
  },
  gifBox: {
    aspectRatio: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  detailName: { fontSize: 28, fontWeight: "800", letterSpacing: -1, color: AppColors.onSurface },
  toggleBtn: { paddingVertical: 16, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: AppColors.muted,
  },
  detailChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: AppColors.outline,
    marginRight: 8,
    marginBottom: 8,
  },
  detailChipText: { fontSize: 13, fontWeight: "600", color: AppColors.onSurface },
  formLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, color: AppColors.muted },
  formInput: {
    borderWidth: 1,
    borderColor: AppColors.outline,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: AppColors.onSurface,
    fontSize: 15,
  },
  formInputError: { borderColor: AppColors.accentRed },
  errorText: { color: AppColors.accentRed, fontSize: 12, marginTop: 6 },
  gifPreviewBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: AppColors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtn: {
    backgroundColor: AppColors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
