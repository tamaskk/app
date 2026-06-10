"use client";

import { useState } from "react";

interface Msg {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

const STATUSES = ["new", "read", "archived", "spam"] as const;

export function ContactTable({ rows: initial }: { rows: Msg[] }) {
  const [rows, setRows] = useState(initial);
  const [opened, setOpened] = useState<Msg | null>(null);

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/contact/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setRows((r) => r.map((m) => (m.id === id ? { ...m, status } : m)));
      if (opened?.id === id) setOpened({ ...opened, status });
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this message?")) return;
    const res = await fetch(`/api/contact/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((r) => r.filter((m) => m.id !== id));
      if (opened?.id === id) setOpened(null);
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-white/[0.03] text-[10px] uppercase tracking-widest text-white/45">
            <tr>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr
                key={m.id}
                className="cursor-pointer border-t border-white/[0.04] hover:bg-white/[0.02]"
                onClick={() => setOpened(m)}
              >
                <td className="px-4 py-3">
                  <div className="text-white">{m.name}</div>
                  <div className="text-[11px] text-white/45">{m.email}</div>
                </td>
                <td className="max-w-md truncate px-4 py-3 text-white/85">
                  {m.subject}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={m.status} />
                </td>
                <td className="px-4 py-3 text-white/45">{m.createdAt}</td>
                <td
                  className="px-4 py-3 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onDelete(m.id)}
                    className="cursor-pointer rounded-md border border-white/15 px-2.5 py-1 text-[11px] font-bold tracking-tight text-white/70 hover:bg-white/[0.05] hover:text-white"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-[13px] text-white/40"
                >
                  Inbox is empty.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {opened && (
        <Drawer
          message={opened}
          onClose={() => setOpened(null)}
          onSetStatus={(s) => setStatus(opened.id, s)}
          onDelete={() => onDelete(opened.id)}
        />
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "new"
      ? "border-white/30 text-white"
      : status === "read"
        ? "border-white/15 text-white/70"
        : status === "spam"
          ? "border-white/10 text-white/40 line-through"
          : "border-white/10 text-white/40";
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold tracking-widest ${cls}`}
    >
      {status.toUpperCase()}
    </span>
  );
}

function Drawer({
  message,
  onClose,
  onSetStatus,
  onDelete,
}: {
  message: Msg;
  onClose: () => void;
  onSetStatus: (s: string) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-[#0a0a0b] p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold tracking-widest text-white/45">
              MESSAGE
            </p>
            <p className="mt-1 text-xl font-bold text-white">{message.subject}</p>
            <p className="mt-1 text-[13px] text-white/65">
              {message.name} · {message.email}
            </p>
            <p className="mt-1 text-[11px] text-white/40">{message.createdAt}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-white/15 px-3 py-1 text-[11px] text-white/70 hover:bg-white/[0.05]"
          >
            Close
          </button>
        </div>

        <div className="mt-6 whitespace-pre-wrap rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-[14px] leading-relaxed text-white/85">
          {message.message}
        </div>

        <div className="mt-6">
          <p className="text-[10px] font-extrabold tracking-widest text-white/45">
            STATUS
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSetStatus(s)}
                className={`cursor-pointer rounded-full border px-3 py-1 text-[11px] font-bold tracking-tight transition-colors ${
                  message.status === s
                    ? "border-white bg-white text-black"
                    : "border-white/15 text-white/70 hover:bg-white/[0.04]"
                }`}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="mt-8 cursor-pointer rounded-full border border-white/15 px-4 py-2 text-[12px] font-bold tracking-tight text-white/70 hover:bg-white/[0.04] hover:text-white"
        >
          Delete message
        </button>
      </div>
    </div>
  );
}
