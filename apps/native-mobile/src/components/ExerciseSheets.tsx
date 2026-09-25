// Ported 1:1 from apps/mobile/lib/widgets/exercise_sheets.dart.
//
// Two exercise-catalogue bottom sheets:
//   • ExerciseInfoSheet   — read-only details of an exercise (fetched by id).
//   • ChangeExerciseSheet — pick a replacement exercise, muscle filter
//     preselected. Calls onSelect with the chosen ApiExercise.
import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";
import { ExerciseApi, ApiExercise } from "../lib/exerciseApi";
import { ExerciseImage } from "./ExerciseImage";
import { titleCase } from "../utils/text";
import { exLabel, exLabels } from "../utils/exerciseLabels";

function GrabHandle() {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={styles.handle} />
    </View>
  );
}

function SheetRoot({
  visible,
  onClose,
  height,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.card, { height }]}>{children}</View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// INFO — read-only details of an exercise (fetched by id).
// ---------------------------------------------------------------------------

export function ExerciseInfoSheet({
  visible,
  onClose,
  exerciseId,
  fallback,
}: {
  visible: boolean;
  onClose: () => void;
  exerciseId: string;
  fallback?: ApiExercise | null;
}) {
  const { t } = useLang();
  const api = React.useRef(new ExerciseApi()).current;
  const [ex, setEx] = React.useState<ApiExercise | null>(fallback ?? null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => () => api.dispose(), [api]);

  React.useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setEx(fallback ?? null);
    setLoading(true);
    (async () => {
      try {
        if (exerciseId.length > 0) {
          const fetched = await api.getExercise(exerciseId);
          if (!cancelled) setEx(fetched);
        }
      } catch {
        // Keep the fallback if the fetch fails.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, exerciseId]);

  const height = Dimensions.get("window").height * 0.78;

  const label = (txt: string) => <Text style={styles.eyebrow}>{txt.toUpperCase()}</Text>;

  const chips = (title: string, values: string[]) => {
    if (values.length === 0) return null;
    return (
      <View style={{ alignItems: "flex-start" }}>
        <View style={{ height: 16 }} />
        {label(title)}
        <View style={{ height: 8 }} />
        <View style={styles.wrap}>
          {values.map((v, i) => (
            <View key={i} style={styles.chip}>
              <Text style={styles.chipText}>{titleCase(v)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const instructions = (steps: string[]) => {
    if (steps.length === 0) return null;
    return (
      <View style={{ alignItems: "flex-start" }}>
        <View style={{ height: 24 }} />
        {label(t("detail.execution"))}
        <View style={{ height: 8 }} />
        {steps.map((s, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={{ width: 24 }}>
              <Text style={styles.stepNum}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{s.replace(/^Step:\d+\s*/, "")}</Text>
          </View>
        ))}
      </View>
    );
  };

  let body: React.ReactNode;
  if (ex == null) {
    body = (
      <View style={styles.center}>
        {loading ? (
          <ActivityIndicator color={AppColors.onSurface} />
        ) : (
          <Text style={{ color: AppColors.muted }}>{t("exercise.no_data")}</Text>
        )}
      </View>
    );
  } else {
    body = (
      <ScrollView contentContainerStyle={{ paddingLeft: 20, paddingTop: 12, paddingRight: 20, paddingBottom: 32 }}>
        <View style={styles.gif}>
          <ExerciseImage frames={ex.imageFrames} fit="contain" iconSize={48} showLabel />
        </View>
        <View style={{ height: 20 }} />
        <Text style={styles.detailTitle}>{titleCase(ex.name)}</Text>
        {chips(t("detail.target_muscles"), exLabels(ex.targetMuscles))}
        {chips(t("detail.secondary_muscles"), exLabels(ex.secondaryMuscles))}
        {chips(t("detail.body_parts"), exLabels(ex.bodyParts))}
        {chips(t("detail.equipment"), exLabels(ex.equipments))}
        {instructions(ex.instructions)}
      </ScrollView>
    );
  }

  return (
    <SheetRoot visible={visible} onClose={onClose} height={height}>
      <GrabHandle />
      <View style={{ flex: 1 }}>{body}</View>
    </SheetRoot>
  );
}

// ---------------------------------------------------------------------------
// CHANGE — pick a replacement exercise, muscle filter preselected.
// Calls onSelect with the chosen ApiExercise (mirrors the Dart Navigator.pop).
// ---------------------------------------------------------------------------

export function ChangeExerciseSheet({
  visible,
  onClose,
  initialMuscle,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  initialMuscle?: string | null;
  onSelect: (exercise: ApiExercise) => void;
}) {
  const { t } = useLang();
  const api = React.useRef(new ExerciseApi()).current;
  const reqId = React.useRef(0);
  const mounted = React.useRef(true);
  const [muscles, setMuscles] = React.useState<string[]>([]);
  const [muscleFilter, setMuscleFilter] = React.useState<string | null>(initialMuscle ?? null);
  const [results, setResults] = React.useState<ApiExercise[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      api.dispose();
    };
  }, [api]);

  const loadMuscles = React.useCallback(async () => {
    try {
      const m = await api.muscles();
      if (mounted.current) setMuscles(m);
    } catch {
      // ignore
    }
  }, [api]);

  const runLoad = React.useCallback(
    async (filter: string | null) => {
      const id = ++reqId.current;
      setLoading(true);
      try {
        const page = await api.listExercises({
          targetMuscles: filter == null ? undefined : [filter],
          limit: 25, // /exercises caps limit at 25 (30 -> 400)
        });
        if (mounted.current && id === reqId.current) {
          setResults(page.items);
          setLoading(false);
        }
      } catch {
        if (mounted.current && id === reqId.current) setLoading(false);
      }
    },
    [api],
  );

  React.useEffect(() => {
    if (!visible) return;
    setMuscleFilter(initialMuscle ?? null);
    loadMuscles();
    runLoad(initialMuscle ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const selectMuscle = (m: string | null) => {
    setMuscleFilter(m);
    runLoad(m);
  };

  const height = Dimensions.get("window").height * 0.85;

  const chip = (label: string, active: boolean, onPress: () => void) => (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 14 }}>
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: active ? "700" : "600",
            color: active ? AppColors.onSurface : AppColors.muted,
          }}
        >
          {titleCase(label)}
        </Text>
        <View style={{ height: 6 }} />
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: active ? AppColors.onSurface : "transparent",
          }}
        />
      </View>
    </Pressable>
  );

  let list: React.ReactNode;
  if (loading && results.length === 0) {
    list = (
      <View style={styles.center}>
        <ActivityIndicator color={AppColors.onSurface} />
      </View>
    );
  } else if (results.length === 0) {
    list = (
      <View style={styles.center}>
        <Text style={{ color: AppColors.muted }}>{t("common.no_results")}</Text>
      </View>
    );
  } else {
    list = (
      <ScrollView contentContainerStyle={{ paddingLeft: 16, paddingTop: 4, paddingRight: 16, paddingBottom: 24 }}>
        {results.map((ex, i) => (
          <Pressable
            key={ex.exerciseId !== "" ? ex.exerciseId : i}
            onPress={() => {
              onSelect(ex);
              onClose();
            }}
            style={[styles.listRow, i === 0 ? null : styles.listRowBorder]}
          >
            <View style={styles.thumb}>
              <ExerciseImage frames={ex.imageFrames} iconSize={18} showLabel compact />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text numberOfLines={1} style={styles.listTitle}>
                {titleCase(ex.name)}
              </Text>
              {ex.targetMuscles.length > 0 && (
                <>
                  <View style={{ height: 2 }} />
                  <Text numberOfLines={1} style={{ fontSize: 12, color: AppColors.muted }}>
                    {titleCase(exLabels(ex.targetMuscles).join(", "))}
                  </Text>
                </>
              )}
            </View>
            <MaterialIcons name="swap-horiz" color={AppColors.muted} size={20} />
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  return (
    <SheetRoot visible={visible} onClose={onClose} height={height}>
      <GrabHandle />
      <View style={styles.changeHeader}>
        <Text style={styles.changeTitle}>{t("exercise.change_exercise")}</Text>
      </View>
      {muscles.length > 0 && (
        <View style={{ height: 44 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 4, alignItems: "center" }}
          >
            {chip(t("create.all_filter"), muscleFilter == null, () => selectMuscle(null))}
            {muscles.map((m) =>
              chip(exLabel(m), muscleFilter === m, () => selectMuscle(muscleFilter === m ? null : m)),
            )}
          </ScrollView>
        </View>
      )}
      <View style={{ flex: 1 }}>{list}</View>
    </SheetRoot>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  card: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: AppColors.outline,
  },
  handle: {
    marginTop: 12,
    marginBottom: 4,
    width: 40,
    height: 4,
    backgroundColor: AppColors.surfaceHigh,
    borderRadius: 100,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: AppColors.muted,
  },
  gif: {
    borderRadius: 20,
    overflow: "hidden",
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  detailTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
    color: AppColors.onSurface,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: AppColors.outline,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: AppColors.onSurface,
  },
  stepRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  stepNum: { fontSize: 14, fontWeight: "800", color: AppColors.muted },
  stepText: { flex: 1, fontSize: 14, lineHeight: 14 * 1.4, color: AppColors.onSurface },
  changeHeader: {
    paddingLeft: 20,
    paddingTop: 8,
    paddingRight: 20,
    paddingBottom: 8,
    alignItems: "flex-start",
  },
  changeTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: AppColors.onSurface,
  },
  listRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  listRowBorder: { borderTopWidth: 1, borderTopColor: AppColors.outline },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: AppColors.surfaceHigh,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: AppColors.onSurface,
  },
});
