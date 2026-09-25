// Ported 1:1 from apps/mobile/lib/widgets/training_actions.dart.
//
// Long-press menu for a training: Edit / Delete. [onChanged] is called after a
// successful edit or delete so the caller can refresh. Rendered as a controlled
// bottom sheet; the menu routes to the Edit / Delete drawers in place.
import React from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { AppColors } from "../theme";
import { useLang } from "../hooks/useLang";
import { Api } from "../lib/api";
import { SavedTraining, SavedExercise } from "../models/apiModels";
import { titleCase } from "../utils/text";

type Mode = "menu" | "delete" | "edit";

function Handle() {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={styles.handle} />
    </View>
  );
}

export function TrainingActions({
  visible,
  onClose,
  training,
  onChanged,
}: {
  visible: boolean;
  onClose: () => void;
  training: SavedTraining;
  onChanged: () => Promise<void>;
}) {
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = React.useState<Mode>("menu");

  React.useEffect(() => {
    if (visible) setMode("menu");
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {mode === "menu" && (
          <View style={styles.card}>
            <View style={{ paddingBottom: 8 + insets.bottom }}>
              <Handle />
              <Pressable style={styles.tile} onPress={() => setMode("edit")}>
                <Ionicons name="create-outline" size={24} color={AppColors.onSurface} />
                <Text style={[styles.tileTitle, { color: AppColors.onSurface }]}>{t("common.edit")}</Text>
              </Pressable>
              <Pressable style={styles.tile} onPress={() => setMode("delete")}>
                <Ionicons name="trash-outline" size={24} color={AppColors.accentRed} />
                <Text style={[styles.tileTitle, { color: AppColors.accentRed }]}>{t("common.delete")}</Text>
              </Pressable>
              <View style={{ height: 8 }} />
            </View>
          </View>
        )}
        {mode === "delete" && (
          <DeleteBody training={training} onChanged={onChanged} onClose={onClose} />
        )}
        {mode === "edit" && (
          <EditBody training={training} onChanged={onChanged} onClose={onClose} />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// --- DELETE drawer ----------------------------------------------------------

function DeleteBody({
  training,
  onChanged,
  onClose,
}: {
  training: SavedTraining;
  onChanged: () => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const api = React.useRef(new Api()).current;
  const [deleting, setDeleting] = React.useState(false);

  const del = async () => {
    setDeleting(true);
    try {
      await api.deleteTraining(training.id);
      await onChanged();
      onClose();
    } catch {
      setDeleting(false);
      Alert.alert(t("training.delete_failed"));
    }
  };

  return (
    <View style={styles.card}>
      <View style={{ paddingLeft: 24, paddingRight: 24, paddingBottom: 24 + insets.bottom }}>
        <Handle />
        <View style={{ height: 8 }} />
        <Text style={styles.deleteTitle}>{t("training.delete_title", { name: titleCase(training.name) })}</Text>
        <View style={{ height: 8 }} />
        <Text style={{ color: AppColors.muted, fontSize: 14 }}>{t("training.delete_irreversible")}</Text>
        <View style={{ height: 24 }} />
        <Pressable
          disabled={deleting}
          onPress={del}
          style={[styles.deleteBtn, { opacity: deleting ? 0.6 : 1 }]}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>{t("common.delete")}</Text>
          )}
        </Pressable>
        <View style={{ height: 8 }} />
        <Pressable disabled={deleting} onPress={onClose} style={styles.cancelBtn}>
          <Text style={{ color: AppColors.muted, fontWeight: "600", fontSize: 15 }}>{t("common.cancel")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// --- EDIT drawer ------------------------------------------------------------

function EditBody({
  training,
  onChanged,
  onClose,
}: {
  training: SavedTraining;
  onChanged: () => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const api = React.useRef(new Api()).current;
  const [name, setName] = React.useState(training.name);
  const [exercises, setExercises] = React.useState<SavedExercise[]>([...training.exercises]);
  const [saving, setSaving] = React.useState(false);
  const [focused, setFocused] = React.useState(false);

  const save = async () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      Alert.alert(t("training.name_required"));
      return;
    }
    setSaving(true);
    try {
      await api.updateTraining(
        training.id,
        exercises.map((e) => ({
          exerciseId: e.exerciseId,
          name: e.name,
          gifUrl: e.gifUrl,
          targetMuscles: e.targetMuscles,
          category: e.category,
          progressionStrategy: e.progressionStrategy,
          sets: e.sets.map((s) => ({ kg: s.kg, reps: s.reps })),
        })),
        trimmed,
      );
      await onChanged();
      onClose();
    } catch {
      setSaving(false);
      Alert.alert(t("training.save_failed"));
    }
  };

  const maxHeight = Dimensions.get("window").height * 0.85;

  return (
    <View style={[styles.card, { maxHeight }]}>
      <View style={{ paddingBottom: insets.bottom, flexShrink: 1 }}>
        <Handle />
        <View style={styles.editHeader}>
          <Text style={[styles.deleteTitle, { flex: 1 }]}>{t("common.edit")}</Text>
          <Pressable disabled={saving} onPress={save} style={styles.saveBtn}>
            {saving ? (
              <ActivityIndicator size="small" color={AppColors.background} />
            ) : (
              <Text style={{ color: AppColors.background, fontWeight: "700" }}>{t("common.save")}</Text>
            )}
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ position: "relative" }}>
            <Text style={[styles.floatLabel, { color: focused ? AppColors.onSurface : AppColors.muted }]}>
              {t("training.name_label")}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              cursorColor={AppColors.onSurface}
              style={[styles.nameInput, { borderColor: focused ? AppColors.onSurface : AppColors.outline }]}
            />
          </View>
        </View>
        <View style={{ height: 8 }} />
        {exercises.length === 0 ? (
          <View style={{ padding: 24 }}>
            <Text style={{ color: AppColors.muted }}>{t("training.no_exercises")}</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ paddingLeft: 20, paddingTop: 4, paddingRight: 20, paddingBottom: 20 }}
          >
            {exercises.map((ex, i) => (
              <View key={i} style={[styles.exRow, i === 0 ? null : styles.exRowBorder]}>
                <Text numberOfLines={1} style={styles.exName}>
                  {titleCase(ex.name)}
                </Text>
                <Pressable
                  onPress={() => setExercises((prev) => prev.filter((_, idx) => idx !== i))}
                  hitSlop={4}
                  style={{ padding: 4 }}
                >
                  <MaterialIcons name="remove-circle-outline" color={AppColors.muted} size={22} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
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
    marginVertical: 12,
    width: 40,
    height: 4,
    backgroundColor: AppColors.surfaceHigh,
    borderRadius: 100,
  },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  tileTitle: { marginLeft: 24, fontSize: 16, fontWeight: "600" },
  deleteTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: AppColors.onSurface,
    letterSpacing: -0.5,
  },
  deleteBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: AppColors.accentRed,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  editHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
    paddingTop: 4,
    paddingRight: 20,
    paddingBottom: 12,
  },
  saveBtn: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  floatLabel: {
    position: "absolute",
    top: -8,
    left: 12,
    paddingHorizontal: 4,
    fontSize: 12,
    backgroundColor: AppColors.background,
    zIndex: 1,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: AppColors.onSurface,
    fontSize: 16,
    fontWeight: "600",
  },
  exRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  exRowBorder: {
    borderTopWidth: 1,
    borderTopColor: AppColors.outline,
  },
  exName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.onSurface,
  },
});
