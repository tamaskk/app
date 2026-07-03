"use client";

import Link from "next/link";
import { useState } from "react";
import { useLang } from "./i18n";
import { Logo } from "./Logo";

// ---------------------------------------------------------------------------
// Shared footer rendered on the landing page and on /contact. Tied to the
// LangProvider so the language toggle works the same way wherever it sits.
// ---------------------------------------------------------------------------

export function Footer() {
  const { t } = useLang();
  return (
    <section className="relative overflow-hidden border-b border-white/5 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 text-sm font-extrabold tracking-tight">
              <Logo size={28} />
              <span>HEFTOR</span>
            </div>
            <p
              className="mt-4 max-w-xs text-2xl leading-tight tracking-tight text-white"
              style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}
            >
              {t("footer.tagline")}
            </p>
            <NewsletterForm />
            <div className="mt-6 flex items-center gap-2">
              <AvatarStack />
              <p className="text-[10px] tracking-wide text-white/40">
                {t("footer.community")}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-[12px] text-white/55">
            <FooterColumn
              title={t("footer.company")}
              items={[
                { label: t("footer.company.about"), href: "/about" },
                { label: t("footer.company.contact"), href: "/contact" },
              ]}
            />
            <FooterColumn
              title={t("footer.product")}
              items={[
                { label: t("footer.product.features"), href: "/#features" },
                { label: t("footer.product.ranks"), href: "/ranks" },
                { label: t("footer.product.pricing"), href: "/pricing" },
                { label: t("footer.product.faq"), href: "/faq" },
              ]}
            />
            <FooterColumn
              title={t("footer.resources")}
              items={[
                { label: t("footer.resources.blog"), href: "/blog" },
                // { label: t("footer.resources.methodology") },
                { label: t("footer.resources.changelog"), href: "/changelog" },
                { label: t("footer.resources.privacy"), href: "/privacy" },
              ]}
              extra={<LanguageSelector />}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// Newsletter subscribe form. Plain client component so we can show inline
// success / error states without a page reload. The honeypot input traps
// dumb bots that auto-fill every field; legit users never see it.
function NewsletterForm() {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "pending" }
    | { kind: "ok"; existing: boolean }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind === "pending") return;
    setState({ kind: "pending" });
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, honeypot, source: "footer" }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as {
          detail?: string;
        } | null;
        setState({
          kind: "error",
          message: j?.detail ?? "Subscribe failed",
        });
        return;
      }
      const j = (await res.json()) as { existing?: boolean };
      setState({ kind: "ok", existing: Boolean(j.existing) });
      setEmail("");
    } catch {
      setState({ kind: "error", message: "Network error" });
    }
  }

  const pending = state.kind === "pending";

  return (
    <div className="mt-6 max-w-sm">
      <form
        onSubmit={onSubmit}
        className="flex overflow-hidden rounded-full border border-white/10 bg-white/[0.04] backdrop-blur"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("footer.email_placeholder")}
          className="flex-1 bg-transparent px-5 py-3 text-[13px] text-white placeholder-white/40 outline-none"
        />
        {/* Honeypot — visually hidden, off the tab order. */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="hidden"
          aria-hidden="true"
        />
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer bg-white px-4 py-3 text-[12px] font-bold tracking-tight text-black hover:bg-white/90 disabled:opacity-60"
        >
          {pending ? "…" : t("footer.email_button")}
        </button>
      </form>
      {state.kind === "ok" && (
        <p className="mt-2 text-[11px] tracking-wide text-white/55">
          {state.existing
            ? t("footer.newsletter.already")
            : t("footer.newsletter.ok")}
        </p>
      )}
      {state.kind === "error" && (
        <p className="mt-2 text-[11px] tracking-wide text-white/55">
          {state.message}
        </p>
      )}
    </div>
  );
}

export function AvatarStack() {
  return (
    <div className="flex -space-x-2">
      {["#3b3b3d", "#525258", "#7c7c80", "#a1a1a4", "#cfcfd2"].map((c, i) => (
        <div
          key={i}
          className="h-7 w-7 rounded-full border-2 border-black"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${c}, #1a1a1c)`,
          }}
        />
      ))}
    </div>
  );
}

function FooterColumn({
  title,
  items,
  extra,
}: {
  title: string;
  // Items can be raw labels (rendered as plain hover text) or labelled links.
  // Keeping this loose lets us flip an item to a real route — e.g. Contact —
  // without rebuilding the whole column shape.
  items: { label: string; href?: string }[];
  extra?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-extrabold tracking-widest text-white/80">
        {title.toUpperCase()}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((i) =>
          i.href ? (
            <li key={i.label}>
              <Link
                href={i.href}
                className="cursor-pointer text-white/55 transition-colors hover:text-white"
              >
                {i.label}
              </Link>
            </li>
          ) : (
            <li
              key={i.label}
              className="cursor-pointer text-white/55 transition-colors hover:text-white"
            >
              {i.label}
            </li>
          ),
        )}
        {extra && <li>{extra}</li>}
      </ul>
    </div>
  );
}

function LanguageSelector() {
  const { lang, setLang, t } = useLang();
  const opt = (code: "en" | "hu", label: string) => (
    <button
      type="button"
      onClick={() => setLang(code)}
      className={`cursor-pointer transition-colors ${
        lang === code
          ? "font-bold text-white"
          : "text-white/40 hover:text-white"
      }`}
      aria-pressed={lang === code}
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-center gap-1.5 text-white/55">
      <span className="uppercase tracking-widest text-[10px] text-white/35">
        {t("footer.lang")}
      </span>
      <span className="text-white/20">·</span>
      {opt("en", "EN")}
      <span className="text-white/20">·</span>
      {opt("hu", "HU")}
    </div>
  );
}
