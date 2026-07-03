"use client";

import { useEffect, useState } from "react";

type StagnationItem = {
  exerciseId: string;
  name: string;
  weeksStagnant: number;
  e1rm: number;
  tips: string[];
};

// Title-case each word so catalogue names render consistently.
function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// Dashboard banner for stagnating exercises. Fetches on mount and renders
// nothing unless there's something to report — so the dashboard is unchanged
// when you're progressing. Minimal grey styling, no warning colours.
export default function StagnationBanner() {
  const [items, setItems] = useState<StagnationItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/progress/stagnation")
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((d) => {
        if (active) setItems(Array.isArray(d.results) ? d.results : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (items.length === 0) return null;

  const label = `${items.length} ${
    items.length === 1 ? "exercise" : "exercises"
  } stagnating — tap to view`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between rounded-2xl border border-outline px-4 py-3 text-left transition-colors hover:border-muted"
      >
        <span className="text-[12px] uppercase tracking-wider text-muted font-semibold">
          {label}
        </span>
        <span className="text-muted text-sm">›</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-md max-h-[70vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-outline bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[12px] uppercase tracking-widest text-muted font-bold mb-2">
              Stagnálás
            </p>
            <div className="flex flex-col">
              {items.map((item, i) => (
                <div
                  key={item.exerciseId}
                  className={`py-3.5 ${i === 0 ? "" : "border-t border-outline"}`}
                >
                  <p className="text-white font-bold">{titleCase(item.name)}</p>
                  <p className="text-muted text-sm mt-1">
                    {item.weeksStagnant} hét stagnál
                    {item.tips.length > 0 && ` · ${item.tips.join(" / ")}`}
                  </p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-xl border border-outline py-2.5 text-muted text-sm font-semibold hover:text-white transition-colors"
            >
              Bezárás
            </button>
          </div>
        </div>
      )}
    </>
  );
}
