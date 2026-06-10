"use client";

import { useState } from "react";

interface UserRow {
  id: string;
  email: string;
  name: string;
  username: string | null;
  xp: number;
  rank: number;
  rankName: string;
  country: string | null;
  createdAt: string;
}

export function UsersTable({ rows: initial }: { rows: UserRow[] }) {
  const [rows, setRows] = useState(initial);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<UserRow | null>(null);

  const filtered = query
    ? rows.filter((r) => {
        const q = query.toLowerCase();
        return (
          r.email.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          (r.username ?? "").toLowerCase().includes(q)
        );
      })
    : rows;

  async function onDelete(id: string) {
    if (!confirm("Permanently delete this user and all their data?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((r) => r.filter((u) => u.id !== id));
    } else {
      alert("Delete failed");
    }
  }

  async function onSave(updated: UserRow) {
    const res = await fetch(`/api/users/${updated.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: updated.name,
        username: updated.username,
        xp: updated.xp,
        country: updated.country,
      }),
    });
    if (res.ok) {
      const j = await res.json();
      setRows((r) =>
        r.map((u) =>
          u.id === updated.id
            ? {
                ...u,
                ...updated,
                rank: j.user.rank,
                rankName: j.user.rankName,
              }
            : u,
        ),
      );
      setEditing(null);
    } else {
      alert("Save failed");
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by email, name or username"
          className="w-full max-w-sm rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-[13px] text-white placeholder-white/30 outline-none focus:border-white/30"
        />
        <p className="ml-4 text-[11px] text-white/40">
          {filtered.length} of {rows.length}
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-white/[0.03] text-[10px] uppercase tracking-widest text-white/45">
            <tr>
              <Th>Email</Th>
              <Th>Name</Th>
              <Th>Username</Th>
              <Th>XP</Th>
              <Th>Rank</Th>
              <Th>Joined</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr
                key={u.id}
                className="border-t border-white/[0.04] hover:bg-white/[0.02]"
              >
                <Td className="text-white/85">{u.email}</Td>
                <Td className="text-white">{u.name || "—"}</Td>
                <Td className="text-white/70">{u.username || "—"}</Td>
                <Td className="font-bold text-white">{u.xp.toLocaleString()}</Td>
                <Td>
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-extrabold tracking-widest text-white">
                    {u.rankName}
                  </span>
                </Td>
                <Td className="text-white/45">{u.createdAt}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(u)}
                      className="cursor-pointer rounded-md border border-white/15 px-2.5 py-1 text-[11px] font-bold tracking-tight text-white hover:bg-white/[0.05]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(u.id)}
                      className="cursor-pointer rounded-md border border-white/15 px-2.5 py-1 text-[11px] font-bold tracking-tight text-white/70 hover:bg-white/[0.05] hover:text-white"
                    >
                      Delete
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-[13px] text-white/40"
                >
                  No users match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditDialog
          user={editing}
          onCancel={() => setEditing(null)}
          onSave={onSave}
        />
      )}
    </>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3">{children}</th>;
}
function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function EditDialog({
  user,
  onCancel,
  onSave,
}: {
  user: UserRow;
  onCancel: () => void;
  onSave: (updated: UserRow) => Promise<void>;
}) {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username ?? "");
  const [xp, setXp] = useState(user.xp);
  const [country, setCountry] = useState(user.country ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#101012] p-6">
        <p className="text-[10px] font-extrabold tracking-widest text-white/45">
          EDIT USER
        </p>
        <p className="mt-1 text-base font-bold text-white">{user.email}</p>

        <div className="mt-6 space-y-3">
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none"
            />
          </Field>
          <Field label="Username">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="(leave empty for anonymous)"
              className="w-full bg-transparent text-sm text-white placeholder-white/25 outline-none"
            />
          </Field>
          <Field label="XP">
            <input
              type="number"
              value={xp}
              onChange={(e) => setXp(Math.max(0, parseInt(e.target.value || "0", 10)))}
              className="w-full bg-transparent text-sm text-white outline-none"
            />
          </Field>
          <Field label="Country (ISO-2)">
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="HU"
              className="w-full bg-transparent text-sm text-white placeholder-white/25 outline-none"
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-full border border-white/15 px-4 py-2 text-[12px] font-bold tracking-tight text-white/80 hover:bg-white/[0.04]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await onSave({
                ...user,
                name,
                username: username || null,
                xp,
                country: country || null,
              });
              setSaving(false);
            }}
            className="cursor-pointer rounded-full bg-white px-4 py-2 text-[12px] font-bold tracking-tight text-black hover:bg-white/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/45">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
