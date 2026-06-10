"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Change {
  type: string;
  text: string;
}

interface EntryShape {
  id?: string;
  version: string;
  title: string;
  summary: string;
  changes: Change[];
  published: boolean;
}

const CHANGE_TYPES = ["feature", "improvement", "fix", "chore"] as const;

export function ChangelogEditor({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: EntryShape;
}) {
  const router = useRouter();
  const [entry, setEntry] = useState<EntryShape>(
    initial ?? {
      version: "",
      title: "",
      summary: "",
      changes: [{ type: "feature", text: "" }],
      published: false,
    },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const endpoint =
      mode === "create" ? "/api/changelog" : `/api/changelog/${entry.id}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...entry,
        // Drop empty change lines so the public renderer doesn't show blanks.
        changes: entry.changes.filter((c) => c.text.trim() !== ""),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError((j && j.detail) || "Save failed");
      return;
    }
    router.push("/changelog");
    router.refresh();
  }

  function updateChange(i: number, patch: Partial<Change>) {
    setEntry((e) => ({
      ...e,
      changes: e.changes.map((c, j) => (i === j ? { ...c, ...patch } : c)),
    }));
  }

  return (
    <div className="space-y-4">
      <Field label="Version">
        <input
          type="text"
          value={entry.version}
          onChange={(e) => setEntry({ ...entry, version: e.target.value.trim() })}
          placeholder="1.4.0"
          className="w-full bg-transparent text-base font-bold text-white outline-none"
        />
      </Field>
      <Field label="Title (optional)">
        <input
          type="text"
          value={entry.title}
          onChange={(e) => setEntry({ ...entry, title: e.target.value })}
          placeholder="The 'Smart Reminders' release"
          className="w-full bg-transparent text-[13px] text-white outline-none"
        />
      </Field>
      <Field label="Summary (optional)">
        <textarea
          value={entry.summary}
          onChange={(e) => setEntry({ ...entry, summary: e.target.value })}
          rows={3}
          placeholder="One short paragraph that gets shown above the bullets."
          className="w-full resize-none bg-transparent text-[13px] text-white outline-none"
        />
      </Field>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/45">
            Changes
          </p>
          <button
            type="button"
            onClick={() =>
              setEntry((e) => ({
                ...e,
                changes: [...e.changes, { type: "feature", text: "" }],
              }))
            }
            className="cursor-pointer rounded-full border border-white/15 px-3 py-1 text-[11px] font-bold tracking-tight text-white/80 hover:bg-white/[0.04]"
          >
            + Add line
          </button>
        </div>
        <div className="space-y-2">
          {entry.changes.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={c.type}
                onChange={(e) => updateChange(i, { type: e.target.value })}
                className="cursor-pointer rounded-md border border-white/15 bg-black px-2 py-1.5 text-[11px] font-bold tracking-widest text-white outline-none"
              >
                {CHANGE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.toUpperCase()}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={c.text}
                onChange={(e) => updateChange(i, { text: e.target.value })}
                placeholder="Describe the change."
                className="flex-1 bg-transparent text-[13px] text-white outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  setEntry((e) => ({
                    ...e,
                    changes: e.changes.filter((_, j) => j !== i),
                  }))
                }
                className="cursor-pointer rounded-md border border-white/15 px-2 py-1 text-[10px] text-white/60 hover:bg-white/[0.04] hover:text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-[13px] text-white">
        <input
          type="checkbox"
          checked={entry.published}
          onChange={(e) => setEntry({ ...entry, published: e.target.checked })}
          className="h-4 w-4 cursor-pointer accent-white"
        />
        <span>Published — visible on the public /changelog page.</span>
      </label>

      {error && <p className="text-[13px] text-white/80">{error}</p>}

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.push("/changelog")}
          className="cursor-pointer rounded-full border border-white/15 px-4 py-2 text-[12px] font-bold tracking-tight text-white/80 hover:bg-white/[0.04]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving || !entry.version}
          className="cursor-pointer rounded-full bg-white px-5 py-2 text-[12px] font-bold tracking-tight text-black hover:bg-white/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : mode === "create" ? "Create entry" : "Save changes"}
        </button>
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
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/45">
        {label}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
