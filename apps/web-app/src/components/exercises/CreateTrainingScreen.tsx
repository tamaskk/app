"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import * as api from "@/lib/api";
import type { ExerciseDto } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Skeleton";
import { ExercisePicker } from "./ExercisePicker";

// create_training_screen.dart — name field + inline catalogue picker (toggle
// select) + Save. Each picked exercise is saved with 3 empty sets; kg/reps are
// filled later on the workout screen.
export function CreateTrainingScreen() {
  const router = useRouter();
  const { t, tFmt } = useI18n();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Map<string, ExerciseDto>>(new Map());
  const [saving, setSaving] = useState(false);

  const selectedIds = new Set(selected.keys());

  function toggle(ex: ExerciseDto) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(ex.exerciseId)) next.delete(ex.exerciseId);
      else next.set(ex.exerciseId, ex);
      return next;
    });
  }

  async function save() {
    if (saving) return;
    if (!name.trim()) {
      alert(t("create.give_name"));
      return;
    }
    if (selected.size === 0) {
      alert(t("create.add_exercise"));
      return;
    }
    setSaving(true);
    try {
      await api.createTraining({
        name: name.trim(),
        exercises: [...selected.values()].map((ex) => ({
          exerciseId: ex.exerciseId,
          name: ex.name,
          gifUrl: ex.gifUrl,
          targetMuscles: ex.targetMuscles ?? [],
          sets: [
            { kg: 0, reps: 0 },
            { kg: 0, reps: 0 },
            { kg: 0, reps: 0 },
          ],
        })),
      });
      router.push("/trainings");
    } catch (e) {
      if (e instanceof api.FreeTierLimitError) {
        alert(`Free tier limit reached (${e.limit} saved workouts). Upgrade in the mobile app.`);
      } else {
        alert(e instanceof Error ? e.message : t("create.save_failed"));
      }
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[560px] flex-col px-5">
      {/* header */}
      <header className="flex items-center gap-2 py-3">
        <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-low text-on-surface">
          <Icon name="chevron_left" size={22} />
        </button>
        <span className="flex-1 text-base font-bold text-on-surface">{t("create.title")}</span>
        <button
          onClick={save}
          disabled={saving}
          className="flex min-w-[96px] items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-bold text-background disabled:opacity-70"
        >
          {saving ? <Spinner size={16} className="text-background" /> : tFmt("create.save_count", { n: selected.size })}
        </button>
      </header>

      {/* name */}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("create.name_hint")}
        className="w-full bg-transparent py-2 text-[28px] font-extrabold tracking-[-0.03em] text-on-surface outline-none placeholder:text-surface-high"
      />

      <div className="h-2" />

      {/* picker (fills the rest, scrolls internally) */}
      <ExercisePicker mode="multi" selectedIds={selectedIds} onToggle={toggle} />
    </div>
  );
}
