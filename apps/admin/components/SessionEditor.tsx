"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SetShape {
  kg: number;
  reps: number;
  done: boolean;
}
interface ExerciseShape {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  sets: SetShape[];
}
export interface SessionShape {
  id: string;
  name: string;
  owner: string;
  startedAt: string | null; // ISO
  finishedAt: string | null; // ISO
  xpAwarded: number;
  exercises: ExerciseShape[];
}

// ISO → the value a <input type="datetime-local"> expects (local wall time).
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}
function localInputToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function SessionEditor({ initial }: { initial: SessionShape }) {
  const router = useRouter();
  const [s, setS] = useState<SessionShape>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function patch(part: Partial<SessionShape>) {
    setS((cur) => ({ ...cur, ...part }));
    setSaved(false);
  }

  function updateSet(exIdx: number, setIdx: number, part: Partial<SetShape>) {
    setS((cur) => {
      const exercises = cur.exercises.map((e, i) => {
        if (i !== exIdx) return e;
        const sets = e.sets.map((st, j) =>
          j === setIdx ? { ...st, ...part } : st,
        );
        return { ...e, sets };
      });
      return { ...cur, exercises };
    });
    setSaved(false);
  }

  function removeSet(exIdx: number, setIdx: number) {
    setS((cur) => {
      const exercises = cur.exercises.map((e, i) =>
        i === exIdx ? { ...e, sets: e.sets.filter((_, j) => j !== setIdx) } : e,
      );
      return { ...cur, exercises };
    });
    setSaved(false);
  }

  function addSet(exIdx: number) {
    setS((cur) => {
      const exercises = cur.exercises.map((e, i) =>
        i === exIdx
          ? { ...e, sets: [...e.sets, { kg: 0, reps: 0, done: false }] }
          : e,
      );
      return { ...cur, exercises };
    });
    setSaved(false);
  }

  function removeExercise(exIdx: number) {
    setS((cur) => ({
      ...cur,
      exercises: cur.exercises.filter((_, i) => i !== exIdx),
    }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: s.name,
          startedAt: s.startedAt,
          finishedAt: s.finishedAt,
          xpAwarded: s.xpAwarded,
          exercises: s.exercises,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.detail ?? `Save failed (${res.status})`);
      }
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const input =
    "rounded-md border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-white/90 outline-none focus:border-white/35";

  return (
    <div className="max-w-4xl">
      <header className="mb-6">
        <button
          type="button"
          onClick={() => router.push("/sessions")}
          className="mb-4 cursor-pointer text-[12px] font-bold text-white/45 hover:text-white/80"
        >
          ← Sessions
        </button>
        <p className="text-[10px] font-extrabold tracking-widest text-white/45">
          EDIT SESSION
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
          {s.name || "(Untitled)"}
        </h1>
        <p className="mt-1 text-[13px] text-white/50">Owner: {s.owner}</p>
      </header>

      {/* Session-level fields */}
      <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-white/[0.08] p-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[12px] text-white/55">
          Name
          <input
            className={input}
            value={s.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-white/55">
          XP awarded
          <input
            type="number"
            className={input}
            value={s.xpAwarded}
            onChange={(e) => patch({ xpAwarded: Number(e.target.value) })}
          />
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-white/55">
          Started at
          <input
            type="datetime-local"
            className={input}
            value={isoToLocalInput(s.startedAt)}
            onChange={(e) =>
              patch({ startedAt: localInputToIso(e.target.value) })
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-white/55">
          Finished at
          <input
            type="datetime-local"
            className={input}
            value={isoToLocalInput(s.finishedAt)}
            onChange={(e) =>
              patch({ finishedAt: localInputToIso(e.target.value) })
            }
          />
        </label>
      </div>

      {/* Exercises + sets */}
      <div className="space-y-4">
        {s.exercises.map((ex, exIdx) => {
          const doneCount = ex.sets.filter((x) => x.done).length;
          return (
            <div
              key={exIdx}
              className="rounded-2xl border border-white/[0.08] p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[15px] font-bold text-white/90">
                    {ex.name || "(Unnamed exercise)"}
                  </p>
                  <p className="text-[11px] text-white/40">
                    {doneCount}/{ex.sets.length} sets done
                    {ex.targetMuscles.length
                      ? ` · ${ex.targetMuscles.join(", ")}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeExercise(exIdx)}
                  className="cursor-pointer rounded-md border border-white/15 px-2.5 py-1 text-[11px] font-bold text-white/60 hover:bg-white/[0.05] hover:text-white"
                >
                  Remove
                </button>
              </div>

              <table className="w-full text-left text-[12px]">
                <thead className="text-[10px] uppercase tracking-widest text-white/35">
                  <tr>
                    <th className="py-1.5 pr-3">#</th>
                    <th className="py-1.5 pr-3">Done</th>
                    <th className="py-1.5 pr-3">Kg</th>
                    <th className="py-1.5 pr-3">Reps</th>
                    <th className="py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {ex.sets.map((st, setIdx) => (
                    <tr key={setIdx} className="border-t border-white/[0.04]">
                      <td className="py-1.5 pr-3 text-white/40">{setIdx + 1}</td>
                      <td className="py-1.5 pr-3">
                        <input
                          type="checkbox"
                          checked={st.done}
                          onChange={(e) =>
                            updateSet(exIdx, setIdx, { done: e.target.checked })
                          }
                          className="h-4 w-4 cursor-pointer accent-white"
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          type="number"
                          step="0.5"
                          value={st.kg}
                          onChange={(e) =>
                            updateSet(exIdx, setIdx, {
                              kg: Number(e.target.value),
                            })
                          }
                          className={`${input} w-20`}
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          type="number"
                          value={st.reps}
                          onChange={(e) =>
                            updateSet(exIdx, setIdx, {
                              reps: Number(e.target.value),
                            })
                          }
                          className={`${input} w-20`}
                        />
                      </td>
                      <td className="py-1.5 text-right">
                        <button
                          type="button"
                          onClick={() => removeSet(exIdx, setIdx)}
                          className="cursor-pointer text-[11px] font-bold text-white/40 hover:text-white/80"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                onClick={() => addSet(exIdx)}
                className="mt-3 cursor-pointer rounded-md border border-white/15 px-2.5 py-1 text-[11px] font-bold text-white/60 hover:bg-white/[0.05] hover:text-white"
              >
                + Add set
              </button>
            </div>
          );
        })}
        {s.exercises.length === 0 && (
          <p className="rounded-2xl border border-white/[0.08] px-4 py-10 text-center text-[13px] text-white/40">
            No exercises in this session.
          </p>
        )}
      </div>

      {/* Save bar */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="cursor-pointer rounded-lg bg-white px-5 py-2.5 text-[13px] font-extrabold tracking-tight text-black hover:bg-white/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-[12px] text-emerald-400">Saved ✓</span>}
        {error && <span className="text-[12px] text-red-400">{error}</span>}
      </div>
    </div>
  );
}
