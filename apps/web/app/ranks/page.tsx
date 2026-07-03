"use client";

import { motion, useInView } from "motion/react";
import Link from "next/link";
import { useRef } from "react";
import {
  MarketingShell,
  PageHeading,
} from "../components/landing/MarketingShell";

// ---------------------------------------------------------------------------
// /ranks
// ---------------------------------------------------------------------------
//
// Lays out the 10-tier progression visible in the mobile RankCard. Keep this
// in sync with apps/web/lib/rank.ts and apps/mobile/lib/models/rank.dart.

interface RankRow {
  tier: number;
  numeral: string;
  name: string;
  threshold: number;
  estimate: string;
}

const ranks: RankRow[] = [
  { tier: 1, numeral: "I", name: "NOVICE", threshold: 0, estimate: "Start here" },
  { tier: 2, numeral: "II", name: "TRAINEE", threshold: 250, estimate: "~1 week" },
  { tier: 3, numeral: "III", name: "LIFTER", threshold: 750, estimate: "~3 weeks" },
  { tier: 4, numeral: "IV", name: "REGULAR", threshold: 1_750, estimate: "~7 weeks" },
  { tier: 5, numeral: "V", name: "INTERMEDIATE", threshold: 3_500, estimate: "~3 months" },
  { tier: 6, numeral: "VI", name: "ADVANCED", threshold: 7_000, estimate: "~6 months" },
  { tier: 7, numeral: "VII", name: "STRONG", threshold: 13_000, estimate: "~1 year" },
  { tier: 8, numeral: "VIII", name: "ELITE", threshold: 24_000, estimate: "~2 years" },
  { tier: 9, numeral: "IX", name: "MASTER", threshold: 45_000, estimate: "~3-4 years" },
  { tier: 10, numeral: "X", name: "LEGEND", threshold: 80_000, estimate: "~6+ years" },
];

const xpSources = [
  { source: "Per completed set", xp: "+1 XP", note: "RPE 6-10, ≥3 reps, capped 30/session" },
  { source: "Per session", xp: "+50 XP", note: "≥10 sets and ≥20 min" },
  { source: "New e1RM PR", xp: "+100 XP", note: "Max 3 PRs/session" },
  { source: "Weekly goal met", xp: "+200 XP", note: "Hit your onboarding days/week" },
  { source: "Streak bonus", xp: "+25/week", note: "Cap 250 XP" },
];

export default function RanksPage() {
  return (
    <MarketingShell>
      <section className="relative px-6 pb-24 pt-36 md:pt-44">
        <div className="mx-auto max-w-5xl">
          <PageHeading
            eyebrow="THE PATH"
            line1="Ten ranks."
            accent="One ascent."
            subtitle="Climb from Novice to Legend through honest, verified XP — no daily-login boosts, no participation trophies."
          />

          <div className="mt-20 space-y-3">
            {ranks.map((r, i) => (
              <RankCard key={r.tier} rank={r} delay={i * 0.04} />
            ))}
          </div>

          <div className="mt-24">
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              How{" "}
              <span
                className="font-normal italic text-white/95"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                XP works.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-center text-[13px] text-white/55">
              All XP is server-side validated. The engine ignores sets without
              a kilogram, reps under 3, and sessions shorter than 20 minutes.
            </p>

            <div className="mt-12 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur">
              {xpSources.map((s, i) => (
                <div
                  key={s.source}
                  className={`flex items-center gap-4 px-6 py-5 ${
                    i > 0 ? "border-t border-white/5" : ""
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-[14px] font-extrabold tracking-tight text-white">
                      {s.source}
                    </p>
                    <p className="text-[12px] text-white/45">{s.note}</p>
                  </div>
                  <p className="text-[14px] font-extrabold tracking-tight text-white md:text-base">
                    {s.xp}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-24 text-center">
            <p className="text-[11px] font-extrabold tracking-widest text-white/45">
              READY?
            </p>
            <h3
              className="mt-3 text-3xl tracking-tight text-white md:text-4xl"
              style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}
            >
              Start at I. End wherever you want.
            </h3>
            <Link
              href="/#download"
              className="mt-8 inline-block cursor-pointer rounded-full bg-white px-7 py-3 text-[13px] font-bold tracking-tight text-black transition-colors hover:bg-white/90"
            >
              Download →
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

function RankCard({ rank, delay }: { rank: RankRow; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  // First 5 ranks use an outlined numeral; the last 5 (Advanced and up)
  // get a filled treatment — same brand cue as the mobile RankCard.
  const solid = rank.tier >= 6;
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
      className="grid grid-cols-[1fr_2fr_1fr] items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-5 backdrop-blur md:grid-cols-[1.5fr_3fr_1fr_1fr] md:px-8 md:py-6"
    >
      <span
        className="text-4xl font-extrabold leading-none md:text-5xl"
        style={{
          letterSpacing: "-0.05em",
          color: solid ? "white" : "transparent",
          WebkitTextStroke: solid ? undefined : "1.5px white",
        }}
      >
        {rank.numeral}
      </span>
      <span className="text-base font-extrabold tracking-[0.2em] text-white md:text-lg">
        {rank.name}
      </span>
      <span className="text-right text-[12px] font-bold tracking-tight text-white/70 md:text-[14px]">
        {fmtXp(rank.threshold)} XP
      </span>
      <span className="hidden text-right text-[12px] font-medium tracking-tight text-white/40 md:block">
        {rank.estimate}
      </span>
    </motion.div>
  );
}

function fmtXp(xp: number): string {
  if (xp >= 1000) {
    const v = xp / 1000;
    return v % 1 === 0 ? `${v}K` : `${v.toFixed(2).replace(/0$/, "")}K`;
  }
  return xp.toString();
}
