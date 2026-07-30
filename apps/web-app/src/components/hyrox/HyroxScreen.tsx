"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import * as api from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Skeleton";
import { titleCase } from "@/lib/format";
import { totalSets as trainingTotalSets, type SavedTraining } from "@/lib/types";

const DIVISIONS = [
  { value: "men_open", key: "hyrox.division_men_open" },
  { value: "women_open", key: "hyrox.division_women_open" },
  { value: "men_pro", key: "hyrox.division_men_pro" },
  { value: "women_pro", key: "hyrox.division_women_pro" },
];
const PHASE_KEYS = ["hyrox.phase_1", "hyrox.phase_2", "hyrox.phase_3", "hyrox.phase_4"];

// hyrox_screen.dart — create state (division picker + create button) or the
// 12-week plan grouped by week, each day a tappable card → workout.
export function HyroxScreen() {
  const router = useRouter();
  const { t, tFmt } = useI18n();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<SavedTraining[]>([]);
  const [division, setDivision] = useState("men_open");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "replace" | "delete">(null);

  async function load() {
    setLoading(true);
    try {
      const list = await api.getTrainings("hyrox");
      list.sort(
        (a, b) => (a.weekIndex ?? 0) - (b.weekIndex ?? 0) || (a.dayIndex ?? 0) - (b.dayIndex ?? 0),
      );
      setPlan(list);
      setError(null);
    } catch (e) {
      setError(e instanceof api.ApiError ? e.message : t("hyrox.server_unreachable"));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weeks = useMemo(() => {
    const map = new Map<number, SavedTraining[]>();
    for (const tr of plan) {
      const w = tr.weekIndex ?? 0;
      if (!map.has(w)) map.set(w, []);
      map.get(w)!.push(tr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [plan]);

  const doneCount = plan.filter((tr) => tr.doneAt != null).length;

  async function create(replace: boolean) {
    if (creating) return;
    setCreating(true);
    setConfirm(null);
    try {
      await api.createHyroxPlan({ division, replace });
      await load();
    } catch (e) {
      if (e instanceof api.HyroxPlanExistsError) {
        setConfirm("replace");
      } else if (e instanceof api.ApiError) {
        alert(e.message);
      } else {
        alert(t("hyrox.create_failed"));
      }
    } finally {
      setCreating(false);
    }
  }

  async function del() {
    setConfirm(null);
    try {
      await api.deleteHyroxPlan();
      await load();
    } catch {
      alert(t("hyrox.delete_failed"));
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Spinner size={26} className="text-muted" />
      </div>
    );
  }

  // ---- Empty / create ----
  if (plan.length === 0) {
    return (
      <div className="px-6 pb-10 pt-6 lg:px-0">
        <h1 className="text-[40px] font-extrabold tracking-[-0.04em] text-on-surface">HYROX</h1>
        <p className="mt-2 whitespace-pre-line text-[15px] leading-[1.45] text-muted">
          {t("hyrox.intro_description")}
        </p>
        <p className="mt-7 text-[11px] font-bold tracking-[0.12em] text-muted">
          {t("hyrox.division_label")}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {DIVISIONS.map((d) => {
            const sel = division === d.value;
            return (
              <button
                key={d.value}
                onClick={() => setDivision(d.value)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                  sel ? "border-on-surface bg-on-surface text-background" : "border-outline bg-surface-low text-on-surface"
                }`}
              >
                {t(d.key)}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[12.5px] text-muted">{t("hyrox.default_weights_note")}</p>
        {error && <p className="mt-4 text-[13px] text-accent-red">{error}</p>}
        <button
          onClick={() => create(false)}
          disabled={creating}
          className={`mt-7 flex h-[54px] w-full items-center justify-center rounded-[14px] text-base font-bold ${
            creating ? "bg-surface-high text-background" : "bg-primary text-background"
          } lg:max-w-sm`}
        >
          {creating ? <Spinner size={20} className="text-background" /> : t("hyrox.create_plan")}
        </button>
        <p className="mt-3 text-[12.5px] text-muted">{t("hyrox.create_footnote")}</p>

        {confirm === "replace" && (
          <ConfirmDialog
            title={t("hyrox.plan_exists_title")}
            body={t("hyrox.plan_exists_body")}
            confirmLabel={t("hyrox.replace")}
            onConfirm={() => create(true)}
            onCancel={() => setConfirm(null)}
          />
        )}
      </div>
    );
  }

  // ---- Plan view ----
  return (
    <div className="pb-8 lg:px-0">
      <header className="flex items-start justify-between px-5 pb-2 pt-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-0.03em] text-on-surface">HYROX</h1>
          <p className="mt-0.5 text-sm text-muted">
            {tFmt("hyrox.weeks_progress", { done: doneCount, total: plan.length })}
          </p>
        </div>
        <button onClick={() => setConfirm("delete")} className="p-2 text-muted" title={t("hyrox.delete_plan_title")}>
          <Icon name="delete" size={22} />
        </button>
      </header>

      <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
        {weeks.map(([w, days]) => {
          const phase = days[0]?.phase ?? 1;
          const isTaper = phase === 4;
          const phaseColor = isTaper ? "#34C759" : "#F5A623";
          const phaseBg = isTaper ? "rgba(52,199,89,0.14)" : "rgba(245,166,35,0.14)";
          return (
            <section key={w}>
              <div className="flex items-center gap-2.5 px-5 pb-2 pt-4">
                <span className="text-base font-bold text-on-surface">
                  {tFmt("hyrox.week_n", { week: w + 1 })}
                </span>
                <span
                  className="rounded-lg px-2.5 py-[3px] text-[11.5px] font-bold"
                  style={{ color: phaseColor, background: phaseBg }}
                >
                  {t(PHASE_KEYS[Math.min(Math.max(phase, 1), 4) - 1])}
                </span>
              </div>
              {days.map((tr) => {
                const done = tr.doneAt != null;
                const focus = focusOf(tr.name);
                return (
                  <div key={tr.id} className="px-5 pb-2.5">
                    <button
                      onClick={() => router.push(`/workout/${tr.id}`)}
                      className={`flex w-full items-center gap-3.5 rounded-2xl border bg-surface-low px-4 py-3.5 text-left ${
                        done ? "border-accent-green" : "border-outline"
                      }`}
                      style={done ? { borderWidth: 1.5 } : undefined}
                    >
                      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-surface-mid text-sm font-extrabold text-on-surface">
                        {(tr.dayIndex ?? 0) + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-bold text-on-surface">{focus}</div>
                        <div className="mt-[3px] text-[12.5px] text-muted">
                          {tFmt("hyrox.exercises_sets", {
                            exercises: tr.exercises.length,
                            sets: trainingTotalSets(tr),
                          })}
                        </div>
                      </div>
                      {done ? (
                        <Icon name="check_circle" size={22} className="text-accent-green" />
                      ) : (
                        <Icon name="chevron_right" size={24} className="text-muted" />
                      )}
                    </button>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>

      {confirm === "delete" && (
        <ConfirmDialog
          title={t("hyrox.delete_plan_title")}
          body={t("hyrox.delete_plan_body")}
          confirmLabel={t("common.delete")}
          onConfirm={del}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function focusOf(name: string): string {
  const parts = name.split("·");
  return titleCase((parts[parts.length - 1] ?? name).trim());
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-8" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative w-full max-w-sm rounded-3xl bg-surface-low p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-on-surface">{title}</h3>
        <p className="mt-2 text-sm text-muted">{body}</p>
        <div className="mt-5 flex justify-end gap-4">
          <button onClick={onCancel} className="py-2 text-sm font-semibold text-muted">
            {t("common.cancel")}
          </button>
          <button onClick={onConfirm} className="py-2 text-sm font-bold text-accent-red">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
