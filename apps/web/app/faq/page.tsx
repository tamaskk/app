"use client";

import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import {
  MarketingShell,
  PageHeading,
} from "../components/landing/MarketingShell";

// ---------------------------------------------------------------------------
// /faq
// ---------------------------------------------------------------------------
//
// Grouped accordion. Categories keep related questions together so the page
// reads as a manual rather than a flat dump. Only one question expanded at
// a time per category.

interface QA {
  q: string;
  a: string;
}

interface Category {
  title: string;
  items: QA[];
}

const categories: Category[] = [
  {
    title: "Getting started",
    items: [
      {
        q: "Do I need an account to use HEFTOR?",
        a: "Yes — every workout is tied to your account so progress, ranks and PR detection work consistently across devices. Sign-up takes about 30 seconds and the onboarding (goal, experience, weekly rhythm) takes another minute.",
      },
      {
        q: "Is HEFTOR available on iOS and Android?",
        a: "Both. The Flutter app ships from a single codebase, so the iOS and Android versions are feature-parity at every release.",
      },
      {
        q: "Can I import data from another app?",
        a: "CSV import is on the roadmap. Today you can rebuild your strongest lifts by tapping each exercise in the catalog and entering your best set — the engine seeds your progression from there.",
      },
    ],
  },
  {
    title: "Training plans",
    items: [
      {
        q: "How does the plan generator work?",
        a: "Pick how many weeks (1-20) and how many sessions per week. The generator selects a split (Full Body, Upper/Lower, PPL, Bro) based on your frequency, then materialises every individual workout — exercises, sets, reps, rest. Optional focus muscles re-weight the split.",
      },
      {
        q: "Can I edit a generated plan?",
        a: "Yes. Every generated training is a normal saved training — you can rename it, add/remove exercises, change set targets, or delete it entirely. Long-press the training card for the actions menu.",
      },
      {
        q: "What's RPE and do I need to log it?",
        a: "RPE is Rate of Perceived Exertion — a 6-10 scale that tells the engine how hard a set felt. Logging RPE is optional, but the adaptive progression engine uses it to suggest the next session's load. No RPE = conservative linear progression.",
      },
    ],
  },
  {
    title: "Ranks & XP",
    items: [
      {
        q: "How is XP calculated?",
        a: "Per validated set (+1), per substantial session (+50), per new e1RM PR (+100), per weekly goal hit (+200), and a streak bonus (+25/week, capped 250). The engine validates server-side and ignores low-effort spam.",
      },
      {
        q: "Can I lose XP or rank?",
        a: "No. XP is monotonic — you only ever go up. Your rank stays where it is even after a break.",
      },
      {
        q: "Where do I see the leaderboard?",
        a: "Account screen → Rank section → Leaderboard. Four scopes: Global, Country, Same Rank (only the users at your tier), and Weekly XP. Your row stays pinned at the bottom even if you're outside the visible page.",
      },
    ],
  },
  {
    title: "Data & privacy",
    items: [
      {
        q: "Where is my data stored?",
        a: "MongoDB on AWS (eu-central-1 region by default). Backups are encrypted at rest. We don't sell, share, or train AI on your training data.",
      },
      {
        q: "Can I export everything?",
        a: "Pro users get CSV + PDF export of every session, training and PR. Free users can request a one-time export by emailing support.",
      },
      {
        q: "How do I delete my account?",
        a: "Account screen → bottom → Delete account. Sessions and the user document are removed within 24h; anonymised aggregates may persist for ranking integrity.",
      },
    ],
  },
  {
    title: "Pricing & billing",
    items: [
      {
        q: "What's free forever vs. Pro?",
        a: "Free includes workouts, plan generator, ranks, PR detection, calendar and reminders. Pro adds form review video feedback, coach mode, unlimited mesocycle history, Apple Health / Google Fit sync, and the muscle heatmap.",
      },
      {
        q: "How do I cancel Pro?",
        a: "Account screen → Subscription → Cancel. You keep Pro features until the end of the current billing period; your data is unaffected.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <MarketingShell>
      <section className="relative px-6 pb-24 pt-36 md:pt-44">
        <div className="mx-auto max-w-3xl">
          <PageHeading
            eyebrow="FREQUENTLY ASKED"
            line1="Questions,"
            accent="answered."
            subtitle="If your question isn't here, send it our way — we read every message."
          />

          <div className="mt-20 space-y-16">
            {categories.map((cat) => (
              <FaqCategory key={cat.title} category={cat} />
            ))}
          </div>

          <div className="mt-24 text-center">
            <h3 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              Still curious?{" "}
              <span
                className="font-normal italic text-white/95"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Say hello.
              </span>
            </h3>
            <Link
              href="/contact"
              className="mt-8 inline-block cursor-pointer rounded-full bg-white px-7 py-3 text-[13px] font-bold tracking-tight text-black transition-colors hover:bg-white/90"
            >
              Contact us →
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

function FaqCategory({ category }: { category: Category }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
    >
      <h2 className="text-[11px] font-extrabold tracking-widest text-white/45">
        {category.title.toUpperCase()}
      </h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur">
        {category.items.map((item, i) => (
          <FaqItem
            key={item.q}
            item={item}
            open={openIdx === i}
            onToggle={() => setOpenIdx(openIdx === i ? null : i)}
            isFirst={i === 0}
          />
        ))}
      </div>
    </motion.div>
  );
}

function FaqItem({
  item,
  open,
  onToggle,
  isFirst,
}: {
  item: QA;
  open: boolean;
  onToggle: () => void;
  isFirst: boolean;
}) {
  return (
    <div className={isFirst ? "" : "border-t border-white/5"}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-6 px-6 py-5 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span className="text-[15px] font-bold tracking-tight text-white">
          {item.q}
        </span>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-[13px] text-white transition-transform duration-300 ${
            open ? "rotate-45" : ""
          }`}
          aria-hidden
        >
          +
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-6 text-[13px] leading-relaxed text-white/65">
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
