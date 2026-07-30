"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useAppData } from "@/lib/useAppData";
import * as api from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Sheet, SheetItem } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Skeleton";
import { clearProgress, doneCount } from "@/lib/workoutProgress";
import {
  isGenerated,
  totalSets as trainingTotalSets,
  type SavedTraining,
} from "@/lib/types";
import { relativeDayLabel, titleCase, volumeUnit, fmtVolume } from "@/lib/format";

export function TrainingsScreen() {
  const router = useRouter();
  const { t, tFmt } = useI18n();
  const data = useAppData();
  const [actionsFor, setActionsFor] = useState<SavedTraining | null>(null);
  const [deleteFor, setDeleteFor] = useState<SavedTraining | null>(null);
  const [editFor, setEditFor] = useState<SavedTraining | null>(null);

  const manual = useMemo(() => data.trainings.filter((tr) => !isGenerated(tr)), [data.trainings]);
  const generated = useMemo(() => data.trainings.filter(isGenerated), [data.trainings]);

  // Resumable = trainings with stored local progress, newest first.
  const resumable = useMemo(() => {
    // Include resumableExtra so an in-progress HYROX workout (not in the
    // strength `trainings` list) still resolves to a continue card.
    const byId = new Map([...data.trainings, ...data.resumableExtra].map((tr) => [tr.id, tr]));
    return Object.entries(data.inProgress)
      .filter(([id]) => byId.has(id))
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
      .map(([id, p]) => ({ training: byId.get(id)!, progress: p }));
  }, [data.trainings, data.resumableExtra, data.inProgress]);

  const open = (id: string) => router.push(`/workout/${id}`);
  const create = () => router.push("/create");
  const generate = () => alert("Plan generation lives in the mobile app. On the web you can create workouts manually and run any plan.");

  const counts =
    data.trainings.length === 0
      ? tFmt("trainings.counts_recommended_only", { n: 0 })
      : tFmt("trainings.counts_full", { manual: manual.length, gen: generated.length, rec: 0 });

  return (
    <div className="px-5 pt-2 lg:px-0">
      {/* App bar */}
      <header className="flex h-14 items-center justify-between">
        <button onClick={generate} className="p-2 text-on-surface" title={t("trainings.generate_new_plan")}>
          <Icon name="sparkles" size={22} />
        </button>
        <span className="text-base font-bold tracking-[0.03em] text-on-surface">HEFTOR</span>
        <button onClick={create} className="p-2 text-on-surface" title={t("workouts.new")}>
          <Icon name="add" size={24} />
        </button>
      </header>

      {/* Title */}
      <div className="pb-3">
        <h1 className="text-[32px] font-extrabold tracking-[-0.03em] text-on-surface">
          {t("workouts.title")}
        </h1>
        <div className="mt-1 text-[12px] font-bold tracking-[0.1em] text-muted">{counts}</div>
      </div>

      {data.loading && (
        <div className="flex min-h-[50vh] items-center justify-center">
          <Spinner size={28} className="text-muted" />
        </div>
      )}

      {!data.loading && data.error && manual.length === 0 && generated.length === 0 && (
        <MessageState
          icon="cloud_off"
          title={data.error}
          cta={t("common.retry")}
          onCta={data.reload}
        />
      )}

      {!data.loading && !data.error && (
        <>
          {/* Continue section */}
          {resumable.length > 0 && (
            <section className="mb-4">
              <SectionHeader label={t("trainingslist.section_continue")} amber />
              <div className="flex flex-col gap-2.5">
                {resumable.map(({ training, progress }) => (
                  <button
                    key={training.id}
                    onClick={() => open(training.id)}
                    className="flex items-center gap-3.5 rounded-[20px] border border-accent-amber bg-surface-low py-4 pl-[18px] pr-3.5 text-left"
                  >
                    <Icon name="play_circle" size={40} className="text-accent-amber" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[19px] font-extrabold tracking-[-0.02em] text-on-surface">
                        {titleCase(training.name || t("dashboard.workout_default"))}
                      </div>
                      <div className="mt-[3px] text-[13px] font-semibold text-muted">
                        {tFmt("trainingslist.paused", {
                          done: doneCount(progress),
                          total: trainingTotalSets(training),
                        })}
                      </div>
                    </div>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        clearProgress(training.id);
                        data.reload();
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-mid text-muted"
                    >
                      <Icon name="close" size={16} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Generated section */}
          {generated.length > 0 && (
            <section className="mb-4">
              <SectionHeader label={t("workouts.generated_for_you")} />
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                {generated
                  .slice()
                  .sort((a, b) => {
                    const ad = a.doneAt ? 1 : 0;
                    const bd = b.doneAt ? 1 : 0;
                    if (ad !== bd) return ad - bd;
                    return (a.weekIndex ?? 0) - (b.weekIndex ?? 0) || (a.dayIndex ?? 0) - (b.dayIndex ?? 0);
                  })
                  .map((tr) => (
                    <GeneratedCard key={tr.id} training={tr} onClick={() => open(tr.id)} onLong={() => setActionsFor(tr)} />
                  ))}
              </div>
            </section>
          )}

          {/* My workouts */}
          {manual.length > 0 ? (
            <section>
              <SectionHeader label={t("trainings.my_section")} />
              <div className="flex flex-col gap-3">
                {manual.map((tr, i) => (
                  <ManualCard
                    key={tr.id}
                    index={i}
                    training={tr}
                    subtitle={`${tr.exercises.length} · ${trainingTotalSets(tr)} set`}
                    meta={metaFor(tr, t, tFmt)}
                    onClick={() => open(tr.id)}
                    onMenu={() => setActionsFor(tr)}
                  />
                ))}
              </div>
            </section>
          ) : generated.length === 0 && resumable.length === 0 ? (
            <MessageState
              icon="dumbbell"
              title={t("trainings.empty_my_title")}
              subtitle={t("trainings.empty_my_subtitle")}
              cta={t("workouts.new")}
              onCta={create}
            />
          ) : null}
        </>
      )}

      <div className="h-8" />

      {/* Sheets */}
      <Sheet open={actionsFor != null} onClose={() => setActionsFor(null)}>
        <SheetItem
          icon={<Icon name="edit" size={22} />}
          label={t("common.edit")}
          onClick={() => {
            setEditFor(actionsFor);
            setActionsFor(null);
          }}
        />
        <SheetItem
          icon={<Icon name="delete" size={22} />}
          label={t("common.delete")}
          danger
          onClick={() => {
            setDeleteFor(actionsFor);
            setActionsFor(null);
          }}
        />
      </Sheet>

      {deleteFor && (
        <DeleteSheet training={deleteFor} onClose={() => setDeleteFor(null)} onDeleted={data.reload} />
      )}
      {editFor && (
        <EditSheet training={editFor} onClose={() => setEditFor(null)} onSaved={data.reload} />
      )}
    </div>
  );
}

function metaFor(
  tr: SavedTraining,
  t: (k: string) => string,
  tFmt: (k: string, v: Record<string, string | number>) => string,
): string {
  const parts: string[] = [];
  parts.push(
    tr.doneAt
      ? tFmt("trainings.last_done", { when: relativeDayLabel(new Date(tr.doneAt)) })
      : t("trainings.new_badge"),
  );
  const vol = tr.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + s.kg * s.reps, 0), 0);
  if (vol > 0) parts.push(`${fmtVolume(vol)} ${volumeUnit(vol)}`.toUpperCase());
  return parts.join(" · ");
}

function SectionHeader({ label, amber }: { label: string; amber?: boolean }) {
  return (
    <div className={`pb-3 pt-1 text-[13px] font-extrabold tracking-[0.12em] ${amber ? "text-accent-amber" : "text-on-surface"}`}>
      {label}
    </div>
  );
}

function GeneratedCard({ training, onClick, onLong }: { training: SavedTraining; onClick: () => void; onLong: () => void }) {
  const [body, day] = training.name.split("·").map((s) => s.trim());
  return (
    <button
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onLong();
      }}
      className={`relative flex h-[108px] flex-col justify-between rounded-2xl border border-surface-high bg-surface-low p-2.5 text-left ${
        training.doneAt ? "opacity-55" : ""
      }`}
    >
      <span className="text-[11px] font-extrabold uppercase leading-[1.15] tracking-[0.05em] text-on-surface line-clamp-3">
        {titleCase(body || training.name)}
      </span>
      <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted">
        {(day || "—").toUpperCase()}
      </span>
      {training.doneAt && (
        <span className="absolute right-2.5 top-2.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-on-surface">
          <Icon name="check" size={12} className="text-background" />
        </span>
      )}
    </button>
  );
}

function ManualCard({
  index,
  training,
  subtitle,
  meta,
  onClick,
  onMenu,
}: {
  index: number;
  training: SavedTraining;
  subtitle: string;
  meta: string;
  onClick: () => void;
  onMenu: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu();
      }}
      className="flex cursor-pointer items-start justify-between rounded-[24px] bg-surface-low p-5"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[22px] font-extrabold tracking-[-0.02em] text-on-surface">
          {titleCase(training.name || t("dashboard.workout_default"))}
        </div>
        <div className="mt-1 text-sm text-muted">{subtitle}</div>
        {meta && <div className="mt-1.5 text-[11px] font-bold tracking-[0.1em] text-muted">{meta || t("trainings.new_badge")}</div>}
      </div>
      <div className="flex flex-col items-end pl-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMenu();
          }}
          className="text-muted"
        >
          <Icon name="more_horiz" size={18} />
        </button>
        <span className="text-[40px] font-extrabold leading-none text-surface-high">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

function MessageState({
  icon,
  title,
  subtitle,
  cta,
  onCta,
}: {
  icon: "cloud_off" | "dumbbell";
  title: string;
  subtitle?: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-8 text-center">
      <Icon name={icon} size={48} className="text-muted" />
      <h2 className="mt-4 text-lg font-bold text-on-surface">{title}</h2>
      {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      <button onClick={onCta} className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-bold text-background">
        {cta}
      </button>
    </div>
  );
}

// --- Delete / Edit sheets ---

function DeleteSheet({ training, onClose, onDeleted }: { training: SavedTraining; onClose: () => void; onDeleted: () => void }) {
  const { t, tFmt } = useI18n();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Sheet open onClose={onClose}>
      <div className="px-6 pb-2 pt-1">
        <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-on-surface">
          {tFmt("training.delete_title", { name: titleCase(training.name) })}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("training.delete_irreversible")}</p>
        {err && <p className="mt-2 text-sm text-accent-red">{err}</p>}
        <button
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              await api.deleteTraining(training.id);
              onDeleted();
              onClose();
            } catch {
              setErr(t("training.delete_failed"));
              setBusy(false);
            }
          }}
          className="mt-6 flex h-[52px] w-full items-center justify-center rounded-2xl bg-accent-red text-[15px] font-bold text-white"
        >
          {busy ? <Spinner size={18} className="text-white" /> : t("common.delete")}
        </button>
        <button onClick={onClose} className="mt-1 w-full py-4 text-[15px] font-semibold text-muted">
          {t("common.cancel")}
        </button>
      </div>
    </Sheet>
  );
}

function EditSheet({ training, onClose, onSaved }: { training: SavedTraining; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(training.name);
  const [exercises, setExercises] = useState(training.exercises);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) {
      setErr(t("training.name_required"));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await api.updateTraining(training.id, {
        name: name.trim(),
        exercises: exercises.map((e) => ({
          exerciseId: e.exerciseId,
          name: e.name,
          category: e.category,
          gifUrl: e.gifUrl,
          targetMuscles: e.targetMuscles,
          progressionStrategy: e.progressionStrategy,
          sets: e.sets,
        })),
      });
      onSaved();
      onClose();
    } catch {
      setErr(t("training.save_failed"));
      setBusy(false);
    }
  }

  return (
    <Sheet open onClose={onClose}>
      <div className="px-5 pb-4 pt-1">
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-on-surface">{t("common.edit")}</h2>
          <button
            onClick={save}
            className="flex items-center rounded-full bg-primary px-[18px] py-2 text-sm font-bold text-background"
          >
            {busy ? <Spinner size={16} className="text-background" /> : t("common.save")}
          </button>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("training.name_label")}
          className="h-14 w-full rounded-[14px] border border-outline bg-transparent px-4 text-base font-semibold text-on-surface outline-none focus:border-on-surface"
        />
        {err && <p className="mt-2 text-sm text-accent-red">{err}</p>}
        <div className="mt-2">
          {exercises.length === 0 ? (
            <p className="py-6 text-muted">{t("training.no_exercises")}</p>
          ) : (
            exercises.map((ex, i) => (
              <div key={ex.exerciseId + i} className={`flex items-center gap-2 py-3 ${i > 0 ? "border-t border-outline" : ""}`}>
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-on-surface">
                  {titleCase(ex.name)}
                </span>
                <button onClick={() => setExercises((xs) => xs.filter((_, j) => j !== i))} className="text-muted">
                  <Icon name="remove_circle" size={22} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Sheet>
  );
}
