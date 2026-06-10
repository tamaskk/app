"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface BlogShape {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  published: boolean;
}

export function BlogEditor({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: BlogShape;
}) {
  const router = useRouter();
  const [post, setPost] = useState<BlogShape>(
    initial ?? {
      slug: "",
      title: "",
      excerpt: "",
      content: "",
      author: "HEFTOR",
      published: false,
    },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const endpoint = mode === "create" ? "/api/blog" : `/api/blog/${post.id}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError((j && j.detail) || "Save failed");
      return;
    }
    router.push("/blog");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Field label="Title">
        <input
          type="text"
          value={post.title}
          onChange={(e) =>
            setPost({
              ...post,
              title: e.target.value,
              slug: post.slug || slugify(e.target.value),
            })
          }
          placeholder="My post title"
          className="w-full bg-transparent text-base font-bold text-white outline-none"
        />
      </Field>
      <Field label="Slug">
        <input
          type="text"
          value={post.slug}
          onChange={(e) => setPost({ ...post, slug: slugify(e.target.value) })}
          placeholder="my-post-title"
          className="w-full bg-transparent text-[13px] text-white outline-none"
        />
      </Field>
      <Field label="Excerpt">
        <textarea
          value={post.excerpt}
          onChange={(e) => setPost({ ...post, excerpt: e.target.value })}
          rows={2}
          placeholder="Shown on the listing page."
          className="w-full resize-none bg-transparent text-[13px] text-white outline-none"
        />
      </Field>
      <Field label="Author">
        <input
          type="text"
          value={post.author}
          onChange={(e) => setPost({ ...post, author: e.target.value })}
          className="w-full bg-transparent text-[13px] text-white outline-none"
        />
      </Field>
      <Field label="Content (markdown)">
        <textarea
          value={post.content}
          onChange={(e) => setPost({ ...post, content: e.target.value })}
          rows={20}
          placeholder="# Heading\n\nWrite your post in markdown."
          className="w-full resize-none bg-transparent font-mono text-[13px] leading-relaxed text-white outline-none"
        />
      </Field>

      <label className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-[13px] text-white">
        <input
          type="checkbox"
          checked={post.published}
          onChange={(e) => setPost({ ...post, published: e.target.checked })}
          className="h-4 w-4 cursor-pointer accent-white"
        />
        <span>Published — visible on the public /blog page.</span>
      </label>

      {error && <p className="text-[13px] text-white/80">{error}</p>}

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.push("/blog")}
          className="cursor-pointer rounded-full border border-white/15 px-4 py-2 text-[12px] font-bold tracking-tight text-white/80 hover:bg-white/[0.04]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving || !post.title || !post.slug || !post.content}
          className="cursor-pointer rounded-full bg-white px-5 py-2 text-[12px] font-bold tracking-tight text-black hover:bg-white/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : mode === "create" ? "Create post" : "Save changes"}
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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
