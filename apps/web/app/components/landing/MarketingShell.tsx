"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { LangProvider } from "./i18n";
import { MarketingNav } from "./MarketingNav";

// ---------------------------------------------------------------------------
// Wraps a sub-marketing page (ranks / pricing / faq / contact) with the
// shared chrome: LangProvider for translations, fixed glass nav, dot grid
// backdrop, the standard Footer, and the giant serif wordmark anchor.
//
// Landing page (page.tsx) renders its sections directly without this shell
// because the hero takes the full viewport. Sub-pages plug in here so the
// content slot only needs to focus on its own copy.
// ---------------------------------------------------------------------------

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <div className="relative min-h-screen w-full bg-black text-[#e5e2e1]">
        <BackgroundGrid />
        <MarketingNav />
        <main className="relative">{children}</main>
        <Footer />
        <BigWordmark />
      </div>
    </LangProvider>
  );
}

export function BackgroundGrid() {
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

export function BigWordmark() {
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

// Helper: brutalist headline with mixed sans + serif-italic accent.
export function PageHeading({
  eyebrow,
  line1,
  accent,
  subtitle,
}: {
  eyebrow?: string;
  line1: string;
  accent: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="text-center"
    >
      {eyebrow && (
        <p className="text-[11px] font-extrabold tracking-widest text-white/45">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-3 text-5xl font-extrabold leading-[1.05] tracking-tight text-white md:text-6xl">
        {line1}{" "}
        <span
          className="font-normal italic text-white/95"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {accent}
        </span>
      </h1>
      {subtitle && (
        <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-white/55">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
