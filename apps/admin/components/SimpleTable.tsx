"use client";

import { useState } from "react";

type Row = { id: string } & Record<string, string | number>;

export function SimpleTable({
  rows: initial,
  columns,
  deleteEndpoint,
}: {
  rows: Row[];
  columns: { key: string; label: string }[];
  deleteEndpoint?: string;
}) {
  const [rows, setRows] = useState(initial);

  async function onDelete(id: string) {
    if (!deleteEndpoint) return;
    if (!confirm("Delete this item permanently?")) return;
    const res = await fetch(`${deleteEndpoint}/${id}`, { method: "DELETE" });
    if (res.ok) setRows((r) => r.filter((it) => it.id !== id));
    else alert("Delete failed");
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-white/[0.03] text-[10px] uppercase tracking-widest text-white/45">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3">
                {c.label}
              </th>
            ))}
            {deleteEndpoint && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-t border-white/[0.04] hover:bg-white/[0.02]"
            >
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-white/85">
                  {r[c.key]}
                </td>
              ))}
              {deleteEndpoint && (
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onDelete(r.id)}
                    className="cursor-pointer rounded-md border border-white/15 px-2.5 py-1 text-[11px] font-bold tracking-tight text-white/70 hover:bg-white/[0.05] hover:text-white"
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + (deleteEndpoint ? 1 : 0)}
                className="px-4 py-10 text-center text-[13px] text-white/40"
              >
                Nothing here yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
