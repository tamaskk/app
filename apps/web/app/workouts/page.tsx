"use client";

import { useState } from "react";
import {
  computeSuggestion,
  formatSuggestion,
  type ProgressionStrategy,
} from "@/lib/progression";
import PlateCalcButton from "@/app/components/PlateCalcButton";

const exercises = [
  {
    id: 1,
    name: "Pull-up",
    variant: "Weighted",
    active: true,
    strategy: "linear" as ProgressionStrategy,
    // Top set from this exercise's previous session (drives the suggestion).
    lastSession: [{ kg: 40, reps: 5 }],
    sets: [
      { kg: 40, reps: 5, done: true },
      { kg: 40, reps: 5, done: true },
      { kg: 40, reps: 5, done: false },
      { kg: 0, reps: 12, done: false },
    ],
  },
  {
    id: 2,
    name: "Incline Bench Press",
    variant: "Barbell",
    active: false,
    strategy: "linear" as ProgressionStrategy,
    lastSession: [{ kg: 80, reps: 8 }],
    sets: [
      { kg: 80, reps: 8, done: false },
      { kg: 80, reps: 8, done: false },
      { kg: 80, reps: 8, done: false },
    ],
  },
  {
    id: 3,
    name: "Chest Press",
    variant: "Machine",
    active: false,
    strategy: "double-progression" as ProgressionStrategy,
    lastSession: [{ kg: 60, reps: 12 }],
    sets: [
      { kg: 60, reps: 10, done: false },
      { kg: 60, reps: 10, done: false },
      { kg: 60, reps: 10, done: false },
    ],
  },
];

export default function WorkoutsPage() {
  const [timer] = useState("01:31");
  const [restTimer] = useState("03:00");
  const [current, setCurrent] = useState(0);
  const totalSets = exercises.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);

  return (
    <div className="max-w-3xl mx-auto px-5 py-10 flex flex-col gap-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted text-sm">Aktív edzés</p>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">Lower</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{doneSets}/{totalSets} set</span>
          <button className="bg-white text-black text-sm font-bold px-5 py-2 rounded-full hover:bg-[#e0e0e0] transition-colors">
            Befejezés
          </button>
        </div>
      </div>

      {/* Rest timer */}
      <div className="bg-surface-low rounded-3xl p-6 flex flex-col items-center gap-4">
        <p className="text-xs text-muted uppercase tracking-widest">Pihenő</p>
        <p className="text-7xl font-extrabold tracking-tighter text-white">{timer}</p>
        <p className="text-muted text-sm">01:25 előző</p>
        <div className="flex items-center gap-6 mt-2">
          <button className="w-12 h-12 rounded-full bg-surface-high text-white flex items-center justify-center text-sm font-bold hover:bg-surface-mid transition-colors">
            −10
          </button>
          <button className="px-8 py-2.5 rounded-full bg-surface-high text-white text-sm font-bold hover:bg-surface-mid transition-colors">
            SKIP
          </button>
          <button className="w-12 h-12 rounded-full bg-surface-high text-white flex items-center justify-center text-sm font-bold hover:bg-surface-mid transition-colors">
            +10
          </button>
        </div>
      </div>

      {/* Exercises */}
      <div className="flex flex-col gap-3">
        {exercises.map((ex, ei) => (
          <div
            key={ex.id}
            className={`rounded-3xl overflow-hidden cursor-pointer transition-all ${
              ei === current ? "bg-surface-low" : "bg-surface-low opacity-60"
            }`}
            onClick={() => setCurrent(ei)}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                {ei === current && <span className="w-2 h-2 rounded-full bg-accent-red shrink-0" />}
                <div>
                  <span className="font-bold text-white">{ex.name}</span>
                  <span className="text-muted text-sm ml-2">{ex.variant}</span>
                </div>
              </div>
              <button className="text-muted hover:text-white">•••</button>
            </div>

            {ei === current && (
              <div className="px-5 pb-5 flex flex-col gap-2">
                {/* Auto-progression hint — faint grey, optional, non-intrusive */}
                {(() => {
                  const s = computeSuggestion({
                    strategy: ex.strategy,
                    name: ex.name,
                    history: [{ sets: ex.lastSession }],
                  });
                  if (!s) return null;
                  return (
                    <p className="px-1 text-xs" style={{ color: "#3a3a3a" }}>
                      Javasolt: {formatSuggestion(s)}
                    </p>
                  );
                })()}
                {/* Column headers */}
                <div className="flex items-center gap-4 px-1 mb-1">
                  <span className="w-20 text-xs text-muted uppercase tracking-wider">Kg</span>
                  <span className="flex-1 text-xs text-muted uppercase tracking-wider">Ismétlés</span>
                  <span className="w-8" />
                </div>
                {ex.sets.map((set, si) => (
                  <div
                    key={si}
                    className={`flex items-center gap-4 rounded-2xl px-4 py-3 transition-all ${
                      set.done ? "bg-white" : "bg-surface-high"
                    }`}
                  >
                    <span className={`w-20 font-bold text-base ${set.done ? "text-black" : "text-white"}`}>
                      {set.kg > 0 ? `${set.kg} kg` : "BW"}
                      {set.kg > 0 && <PlateCalcButton kg={set.kg} />}
                    </span>
                    <span className={`flex-1 font-semibold ${set.done ? "text-black" : "text-white"}`}>
                      {set.reps} reps
                    </span>
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center border-2 transition-all ${
                        set.done
                          ? "bg-black border-black"
                          : "border-muted"
                      }`}
                    >
                      {set.done && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add set + rest timer */}
                <div className="flex items-center gap-3 mt-1">
                  <button className="w-10 h-10 rounded-full bg-surface-high text-white flex items-center justify-center text-xl font-bold hover:bg-surface-mid transition-colors">
                    +
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 bg-surface-high rounded-full py-2.5 text-white text-sm font-bold hover:bg-surface-mid transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" d="M12 6v6l4 2" />
                    </svg>
                    {restTimer}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
