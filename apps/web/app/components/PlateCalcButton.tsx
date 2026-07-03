"use client";

import { useState } from "react";
import {
  computePlates,
  formatEquation,
  formatBarDiagram,
  closestNote,
} from "@/lib/plates";

// Info-icon that opens a text-only plate-calculator popup for a working weight.
// Uses the default bar/plate set (the web prototype has no user settings yet).
export default function PlateCalcButton({ kg }: { kg: number }) {
  const [open, setOpen] = useState(false);
  const r = computePlates(kg);
  const note = closestNote(r);

  return (
    <>
      <button
        type="button"
        aria-label="Plate calculator"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="ml-2 text-muted hover:text-white transition-colors text-xs align-middle"
      >
        ⓘ
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-outline bg-background p-6 font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[12px] uppercase tracking-widest text-muted font-bold mb-4 font-sans">
              Plate calc
            </p>
            {!r.feasible ? (
              <>
                <p className="text-white text-sm">
                  {kg}kg a rúd súlya alatt van.
                </p>
                <p className="text-muted text-sm mt-1">
                  Minimum: {r.barWeight}kg (üres rúd)
                </p>
              </>
            ) : (
              <>
                <p className="text-white text-sm font-semibold">
                  {formatEquation(r)}
                </p>
                <pre className="text-muted text-sm mt-4 overflow-x-auto whitespace-pre">
                  {formatBarDiagram(r)}
                </pre>
                {note && <p className="text-muted text-sm mt-3">{note}</p>}
              </>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-xl border border-outline py-2.5 text-muted text-sm font-semibold hover:text-white transition-colors font-sans"
            >
              Bezárás
            </button>
          </div>
        </div>
      )}
    </>
  );
}
