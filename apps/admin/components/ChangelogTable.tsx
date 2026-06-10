"use client";

import Link from "next/link";
import { useState } from "react";

interface Row {
  id: string;
  version: string;
  title: string;
  changes: number;
  published: boolean;
  releasedAt: string;
}

export function ChangelogTable({ rows: initial }: { rows: Row[] }) {
  const [rows, setRows] = useState(initial);

  async function onDelete(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/changelog/${id}`, { method: "DELETE" });
    if (res.ok) setRows((r) => r.filter((e) => e.id !== id));
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-white/[0.03] text-[10px] uppercase tracking-widest text-white/45">
          <tr>
            <th className="px-4 py-3">Version</th>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Changes</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Released</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr
              key={e.id}
              className="border-t border-white/[0.04] hover:bg-white/[0.02]"
            >
              <td className="px-4 py-3 font-bold text-white">{e.version}</td>
              <td className="px-4 py-3 text-white/85">{e.title || "—"}</td>
              <td className="px-4 py-3 text-white/65">{e.changes}</td>
              <td className="px-4 py-3">
                {e.published ? (
                  <span className="rounded-full border border-white/30 px-2 py-0.5 text-[10px] font-extrabold tracking-widest text-white">
                    PUBLISHED
                  </span>
                ) : (
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-extrabold tracking-widest text-white/50">
                    DRAFT
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-white/45">{e.releasedAt}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/changelog/${e.id}`}
                    className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] font-bold tracking-tight text-white hover:bg-white/[0.05]"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(e.id)}
                    className="cursor-pointer rounded-md border border-white/15 px-2.5 py-1 text-[11px] font-bold tracking-tight text-white/70 hover:bg-white/[0.05] hover:text-white"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-10 text-center text-[13px] text-white/40"
              >
                No entries yet. Click &quot;New entry&quot; to start.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
