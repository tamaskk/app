"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Footer } from "../components/landing/Footer";
import { LangProvider } from "../components/landing/i18n";
import { Logo } from "../components/landing/Logo";

// ---------------------------------------------------------------------------
// Contact page
// ---------------------------------------------------------------------------
//
// Matches the landing look: floating glassy nav, brutalist headline, glass
// form card on a dot-grid background, and the big serif wordmark anchoring
// the bottom. Submission POSTs to /api/contact which persists to MongoDB.

export default function ContactPage() {
  // Wrap in LangProvider so the shared <Footer/> can resolve translations
  // and the language toggle keeps working on this page too.
  return (
    <LangProvider>
      <div className="relative min-h-screen w-full bg-black text-[#e5e2e1]">
        <BackgroundGrid />
        <Nav />
        <main className="relative mx-auto flex max-w-3xl flex-col items-center px-6 pb-24 pt-36 md:pt-44">
          <Heading />
          <ContactForm />
        </main>
        <Footer />
        <BigWordmark />
      </div>
    </LangProvider>
  );
}

// ---------------------------------------------------------------------------

function Nav() {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed inset-x-4 top-4 z-50 mx-auto max-w-6xl"
    >
      <div className="flex items-center justify-between rounded-full border border-white/[0.08] bg-black/40 px-4 py-2.5 backdrop-blur-xl">
        <Link
          href="/"
          className="flex items-center gap-2 px-2 text-sm font-extrabold tracking-tight"
        >
          <Logo size={20} />
          <span>HEFTOR</span>
        </Link>
        <Link
          href="/"
          className="cursor-pointer rounded-full bg-white px-4 py-2 text-[12px] font-bold tracking-tight text-black transition-colors hover:bg-white/90"
        >
          ← Back
        </Link>
      </div>
    </motion.div>
  );
}

function Heading() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="text-center"
    >
      <p className="text-[11px] font-extrabold tracking-widest text-white/45">
        GET IN TOUCH
      </p>
      <h1 className="mt-3 text-5xl font-extrabold leading-[1.05] tracking-tight text-white md:text-6xl">
        Say{" "}
        <span
          className="font-normal italic text-white/95"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          hello.
        </span>
      </h1>
      <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-white/55">
        Press, partnerships, bug reports, feature ideas — anything you want
        to send our way. We read every message.
      </p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------

type Status = "idle" | "sending" | "ok" | "error";

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState(""); // anti-bot
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setError(null);
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, honeypot }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(
          (data && typeof data.detail === "string" && data.detail) ||
            "Couldn't send. Try again.",
        );
        setStatus("error");
        return;
      }
      setStatus("ok");
    } catch {
      setError("Network error. Try again.");
      setStatus("error");
    }
  }

  if (status === "ok") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-16 max-w-md text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/[0.04]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2
          className="mt-6 text-4xl tracking-tight text-white"
          style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}
        >
          Message sent.
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-white/55">
          Thanks {name.split(" ")[0] || "for reaching out"} — we&apos;ll get
          back to {email || "you"} within a couple of working days.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block cursor-pointer rounded-full bg-white px-7 py-3 text-[13px] font-bold tracking-tight text-black transition-colors hover:bg-white/90"
        >
          Back to home →
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
      onSubmit={onSubmit}
      className="mt-14 w-full max-w-xl rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-xl md:p-8"
    >
      {/* Honeypot — invisible & a11y-hidden. Bots fill it; humans never see it. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        aria-hidden
        className="hidden"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Name" htmlFor="contact-name">
          <input
            id="contact-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            placeholder="Your name"
            className="w-full bg-transparent text-[14px] text-white placeholder-white/30 outline-none"
          />
        </Field>
        <Field label="Email" htmlFor="contact-email">
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@email.com"
            className="w-full bg-transparent text-[14px] text-white placeholder-white/30 outline-none"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Subject" htmlFor="contact-subject">
          <input
            id="contact-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What is this about?"
            className="w-full bg-transparent text-[14px] text-white placeholder-white/30 outline-none"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Message" htmlFor="contact-message">
          <textarea
            id="contact-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={6}
            placeholder="Tell us anything."
            className="w-full resize-none bg-transparent text-[14px] leading-relaxed text-white placeholder-white/30 outline-none"
          />
        </Field>
      </div>

      {error && (
        <p className="mt-4 text-[13px] text-white/80">{error}</p>
      )}

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-[11px] tracking-wide text-white/35">
          We read every message. No autoresponders.
        </p>
        <button
          type="submit"
          disabled={status === "sending"}
          className="cursor-pointer rounded-full bg-white px-7 py-3 text-[13px] font-bold tracking-tight text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Send message →"}
        </button>
      </div>
    </motion.form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 transition-colors focus-within:border-white/30">
      <label
        htmlFor={htmlFor}
        className="block text-[10px] font-extrabold uppercase tracking-widest text-white/45"
      >
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function BackgroundGrid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
        backgroundSize: "24px 24px",
        maskImage:
          "radial-gradient(ellipse at 50% 25%, black 30%, transparent 75%)",
        WebkitMaskImage:
          "radial-gradient(ellipse at 50% 25%, black 30%, transparent 75%)",
      }}
    />
  );
}

function BigWordmark() {
  return (
    <section className="relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 1 }}
        className="flex items-end justify-center pb-8 pt-16"
      >
        <h2
          className="select-none text-center text-[18vw] font-normal leading-none tracking-tight text-white"
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            letterSpacing: "-0.04em",
          }}
        >
          HEFTOR
        </h2>
      </motion.div>
    </section>
  );
}
