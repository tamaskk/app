"use client";

import { useMemo, useState } from "react";

interface Row {
  id: string;
  email: string;
  source: string;
  status: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

const STATUSES = ["active", "unsubscribed", "bounced"] as const;

export function NewsletterTable({ rows: initial }: { rows: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q),
    );
  }, [rows, query]);

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/newsletter/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setRows((r) => r.map((s) => (s.id === id ? { ...s, status } : s)));
    } else {
      alert("Update failed");
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this subscriber permanently?")) return;
    const res = await fetch(`/api/newsletter/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((r) => r.filter((s) => s.id !== id));
    } else {
      alert("Delete failed");
    }
  }

  async function copyAll() {
    const list = rows
      .filter((r) => r.status === "active")
      .map((r) => r.email)
      .join(", ");
    try {
      await navigator.clipboard.writeText(list);
      alert(`Copied ${list.split(", ").filter(Boolean).length} active emails`);
    } catch {
      alert("Clipboard unavailable");
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by email or source"
          className="w-full max-w-sm rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-[13px] text-white placeholder-white/30 outline-none focus:border-white/30"
        />
        <div className="flex items-center gap-3">
          <p className="text-[11px] text-white/40">
            {filtered.length} of {rows.length}
          </p>
          <button
            type="button"
            onClick={copyAll}
            className="cursor-pointer rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold tracking-tight text-white/75 hover:bg-white/[0.04] hover:text-white"
          >
            Copy active emails
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-white/[0.03] text-[10px] uppercase tracking-widest text-white/45">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Subscribed</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="border-t border-white/[0.04] hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3 text-white/90">{r.email}</td>
                <td className="px-4 py-3 text-white/55">{r.source}</td>
                <td className="px-4 py-3">
                  <StatusPicker
                    current={r.status}
                    onChange={(s) => setStatus(r.id, s)}
                  />
                </td>
                <td className="px-4 py-3 text-white/45">{r.createdAt}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onDelete(r.id)}
                    className="cursor-pointer rounded-md border border-white/15 px-2.5 py-1 text-[11px] font-bold tracking-tight text-white/70 hover:bg-white/[0.05] hover:text-white"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-[13px] text-white/40"
                >
                  No subscribers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StatusPicker({
  current,
  onChange,
}: {
  current: string;
  onChange: (s: string) => void;
}) {
  return (
    <div className="flex gap-1">
      {STATUSES.map((s) => {
        const active = current === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold tracking-widest transition-colors ${
              active
                ? "border-white bg-white text-black"
                : "border-white/15 text-white/55 hover:bg-white/[0.04]"
            }`}
          >
            {s.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
