"use client";

import Link from "next/link";
import { useState } from "react";

interface Row {
  id: string;
  slug: string;
  title: string;
  author: string;
  published: boolean;
  publishedAt: string;
  updated: string;
}

export function BlogTable({ rows: initial }: { rows: Row[] }) {
  const [rows, setRows] = useState(initial);

  async function onDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    const res = await fetch(`/api/blog/${id}`, { method: "DELETE" });
    if (res.ok) setRows((r) => r.filter((p) => p.id !== id));
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-white/[0.03] text-[10px] uppercase tracking-widest text-white/45">
          <tr>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Slug</th>
            <th className="px-4 py-3">Author</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Updated</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr
              key={p.id}
              className="border-t border-white/[0.04] hover:bg-white/[0.02]"
            >
              <td className="px-4 py-3 text-white">{p.title}</td>
              <td className="px-4 py-3 text-white/65">{p.slug}</td>
              <td className="px-4 py-3 text-white/65">{p.author || "—"}</td>
              <td className="px-4 py-3">
                {p.published ? (
                  <span className="rounded-full border border-white/30 px-2 py-0.5 text-[10px] font-extrabold tracking-widest text-white">
                    PUBLISHED · {p.publishedAt}
                  </span>
                ) : (
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-extrabold tracking-widest text-white/50">
                    DRAFT
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-white/45">{p.updated}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/blog/${p.id}`}
                    className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] font-bold tracking-tight text-white hover:bg-white/[0.05]"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(p.id)}
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
                No posts yet. Click &quot;New post&quot; to start.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
