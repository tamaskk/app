"use client";

import { motion, useInView } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  MarketingShell,
  PageHeading,
} from "../components/landing/MarketingShell";

// ---------------------------------------------------------------------------
// /pricing
// ---------------------------------------------------------------------------
//
// Two tiers — FREE forever and PRO for advanced features. Monthly + Annual
// toggle on Pro. Annual is the default selection because the savings story
// is the conversion lever.

interface Tier {
  id: "free" | "pro";
  name: string;
  byline: string;
  priceMonthly: string;
  priceAnnual: string;
  monthlyNote: string;
  annualNote: string;
  cta: string;
  emphasized: boolean;
  features: string[];
}

const tiers: Tier[] = [
  {
    id: "free",
    name: "FREE",
    byline: "Start your training, free.",
    priceMonthly: "0 Ft",
    priceAnnual: "0 Ft",
    monthlyNote: "Forever. No card required.",
    annualNote: "Forever. No card required.",
    cta: "Download →",
    emphasized: false,
    features: [
      "Up to 2 saved workouts",
      "10-rank XP system and global leaderboard",
      "Plate calculator and smart rest timer",
      "Push reminders on training days",
      "Last 30 days of progress history",
      "Catalogue of 1300+ exercises",
    ],
  },
  {
    id: "pro",
    name: "PRO",
    byline: "Everything you need to keep progressing.",
    // 17990 / 12 ≈ 1499 — effective monthly when paid annually.
    priceMonthly: "2 490 Ft",
    priceAnnual: "1 499 Ft",
    monthlyNote: "/ month",
    annualNote: "/ month, billed 17 990 Ft annually",
    cta: "Start 3-day trial →",
    emphasized: true,
    features: [
      "Everything in Free",
      "Unlimited saved workouts",
      "Adaptive progression engine",
      "Real PR detection with e1RM tracking",
      "Plan generator (up to 20 weeks)",
      "Full progress history & export",
      "Generated workout stories",
      "Priority support",
    ],
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  return (
    <MarketingShell>
      <section className="relative px-6 pb-24 pt-36 md:pt-44">
        <div className="mx-auto max-w-5xl">
          <PageHeading
            eyebrow="PRICING"
            line1="Pricing engineered"
            accent="fairly."
            subtitle="One free tier built to last forever. One paid tier for lifters who want the deeper toolkit. No hidden upsells."
          />

          <div className="mt-12 flex justify-center">
            <div className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.02] p-1 backdrop-blur">
              <BillingToggle
                active={billing === "monthly"}
                onClick={() => setBilling("monthly")}
              >
                Monthly
              </BillingToggle>
              <BillingToggle
                active={billing === "annual"}
                onClick={() => setBilling("annual")}
              >
                Annual{" "}
                <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-extrabold tracking-widest text-black">
                  -40%
                </span>
              </BillingToggle>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
            {tiers.map((tier, i) => (
              <TierCard key={tier.id} tier={tier} billing={billing} delay={i * 0.1} />
            ))}
          </div>

          <div className="mt-24 text-center">
            <h3 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              No surprise fees.{" "}
              <span
                className="font-normal italic text-white/95"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Cancel anytime.
              </span>
            </h3>
            <p className="mx-auto mt-4 max-w-md text-[13px] text-white/55">
              Pro is month-to-month or yearly. Stop and you keep every workout
              you logged — only the Pro features go offline. Your training
              history never gets paywalled.
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-4 md:grid-cols-3">
            <ValueCard
              title="Student?"
              body="50% off Pro with a valid student email. Email us to verify."
            />
            <ValueCard
              title="Coach?"
              body="Manage up to 10 athletes from a single Pro seat. Inquire on /contact."
            />
            <ValueCard
              title="Team?"
              body="Volume pricing starts at 5 seats. We'll quote you in 24 hours."
            />
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

function BillingToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full px-5 py-2 text-[12px] font-bold tracking-tight transition-colors ${
        active
          ? "bg-white text-black"
          : "text-white/55 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function TierCard({
  tier,
  billing,
  delay,
}: {
  tier: Tier;
  billing: "monthly" | "annual";
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const price = billing === "monthly" ? tier.priceMonthly : tier.priceAnnual;
  const note = billing === "monthly" ? tier.monthlyNote : tier.annualNote;
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={`flex flex-col rounded-3xl border p-8 backdrop-blur-xl ${
        tier.emphasized
          ? "border-white/30 bg-white/[0.05]"
          : "border-white/[0.08] bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-extrabold tracking-widest text-white">
          {tier.name}
        </p>
        {tier.emphasized && (
          <span
            className="text-base font-normal italic text-white/95"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            most popular
          </span>
        )}
      </div>
      <p className="mt-2 text-[14px] text-white/55">{tier.byline}</p>

      <div className="mt-8 flex items-baseline gap-2">
        <span className="text-5xl font-extrabold leading-none tracking-tight text-white md:text-6xl">
          {price}
        </span>
        <span className="text-[12px] text-white/45">{note}</span>
      </div>

      <Link
        href={tier.id === "free" ? "/#download" : "/contact"}
        className={`mt-8 block w-full cursor-pointer rounded-full py-3 text-center text-[13px] font-bold tracking-tight transition-colors ${
          tier.emphasized
            ? "bg-white text-black hover:bg-white/90"
            : "border border-white/15 bg-white/[0.05] text-white hover:bg-white/[0.08]"
        }`}
      >
        {tier.cta}
      </Link>

      <ul className="mt-8 space-y-3">
        {tier.features.map((f) => (
          <li
            key={f}
            className="flex items-start gap-3 text-[13px] leading-relaxed text-white/80"
          >
            <Check />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function Check() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className="mt-0.5 shrink-0"
    >
      <path
        d="M5 13l4 4L19 7"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ValueCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur">
      <p className="text-[11px] font-extrabold tracking-widest text-white/80">
        {title.toUpperCase()}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-white/55">{body}</p>
    </div>
  );
}
