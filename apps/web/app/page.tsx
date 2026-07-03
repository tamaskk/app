"use client";

import { motion, useInView, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PhoneFrame } from "./components/landing/PhoneFrame";
// Real iPhone screenshots (1179 × 2556) shown inside the PhoneFrame bezel.
// Imported as static assets so Next.js can generate responsive variants.
import phoneHome from "@/assets/page1.png";
import phoneWorkouts from "@/assets/page2.png";
import phoneCalendar from "@/assets/page3.png";
// Hand-drawn mocks (DashboardMock, RankMock) have been replaced by the
// real-app screenshots above. The mock components remain in
// `app/components/landing/` and can be re-imported here if we ever want to
// swap a phone view back to a stylised mock — e.g. for press-kit shots.
import { LangProvider, useLang } from "./components/landing/i18n";
import { Logo } from "./components/landing/Logo";
import { Footer, AvatarStack } from "./components/landing/Footer";

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------
//
// The whole tree lives inside <LangProvider> so every section can swap copy
// between English (default) and Hungarian via the footer language picker.

export default function LandingPage() {
  return (
    <LangProvider>
      <Page />
    </LangProvider>
  );
}

function Page() {
  return (
    <div className="relative min-h-screen w-full bg-black text-[#e5e2e1]">
      <Nav />
      <Hero />
      <FeaturesGrid />
      <Steps />
      <RadialFeatures />
      <Stats />
      <FinalCTA />
      <Footer />
      <BigWordmark />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------

function Nav() {
  const { t } = useLang();
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
          className="flex items-center gap-1.5 px-2 text-sm font-extrabold tracking-tight"
        >
          <Logo />
          <span>HEFTOR</span>
        </Link>
        <nav className="hidden items-center gap-7 text-[13px] font-medium text-white/70 md:flex">
          <a className="cursor-pointer hover:text-white" href="#features">
            {t("nav.features")}
          </a>
          <a className="cursor-pointer hover:text-white" href="#how">
            {t("nav.how")}
          </a>
          <a className="cursor-pointer hover:text-white" href="#stats">
            {t("nav.stats")}
          </a>
          <a className="cursor-pointer hover:text-white" href="#download">
            {t("nav.download")}
          </a>
        </nav>
        <a
          href="#download"
          className="cursor-pointer rounded-full bg-white px-4 py-2 text-[12px] font-bold tracking-tight text-black transition-colors hover:bg-white/90"
        >
          {t("nav.download")}
        </a>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
  const { t } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, -80]);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden border-b border-white/5"
    >
      <BackgroundGrid />
      <SpotlightGlow />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-36 md:pt-44">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center text-5xl font-extrabold leading-[1.05] tracking-tight text-white md:text-7xl"
        >
          {t("hero.headline_main")}{" "}
          <span
            className="font-normal italic text-white/95"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {t("hero.headline_accent")}
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
          className="mt-5 max-w-md text-center text-[15px] leading-relaxed text-white/55"
        >
          {t("hero.subtitle")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.3, ease: "easeOut" }}
          style={{ y: phoneY }}
          className="relative mt-14 w-[260px] md:mt-20 md:w-[320px]"
        >
          <PhoneFrame
            screenshot={phoneHome}
            screenshotAlt="HEFTOR home screen showing today's plan and weekly progress"
          />

          <FloatCard
            className="-left-28 top-16 md:-left-44"
            delay={0.6}
            float={{ y: -8 }}
            duration={4.2}
          >
            <GlassChip kind="rank" />
          </FloatCard>
          <FloatCard
            className="-right-24 top-32 md:-right-40"
            delay={0.8}
            float={{ y: 12 }}
            duration={5.3}
          >
            <GlassChip kind="streak" />
          </FloatCard>
          <FloatCard
            className="-left-32 bottom-24 md:-left-48"
            delay={1.0}
            float={{ y: -14 }}
            duration={4.8}
          >
            <GlassChip kind="pr" />
          </FloatCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0, ease: "easeOut" }}
          className="mt-14 flex flex-col items-center gap-5"
        >
          <div className="flex items-center gap-3">
            <AvatarStack />
            <div>
              <p className="text-[11px] font-extrabold tracking-widest text-white">
                {t("hero.community_title")}
              </p>
              <p className="text-[10px] tracking-wide text-white/45">
                {t("hero.community_members")}
              </p>
            </div>
          </div>
          <a
            href="#download"
            className="cursor-pointer rounded-full bg-white px-7 py-3 text-[13px] font-bold tracking-tight text-black transition-colors hover:bg-white/90"
          >
            {t("hero.cta")}
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function FloatCard({
  children,
  className = "",
  delay = 0,
  float = { y: -10 },
  duration = 4.5,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  float?: { y: number };
  duration?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={`absolute z-20 hidden md:block ${className}`}
    >
      <motion.div
        animate={{ y: [0, float.y, 0] }}
        transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function GlassChip({ kind }: { kind: "rank" | "streak" | "pr" }) {
  const { t, lang } = useLang();
  const surface =
    "rounded-2xl border border-white/[0.12] bg-white/[0.05] p-4 backdrop-blur-xl shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]";
  if (kind === "rank") {
    return (
      <div className={`${surface} w-44`}>
        <p className="text-[9px] font-bold tracking-widest text-white/50">
          {lang === "hu" ? "RANG" : "RANK"}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className="text-4xl font-extrabold leading-none tracking-tighter text-white"
            style={{ letterSpacing: "-0.05em" }}
          >
            VII
          </span>
          <span className="text-[10px] font-bold tracking-widest text-white/60">
            STRONG
          </span>
        </div>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-3/5 rounded-full bg-white" />
        </div>
        <p className="mt-1.5 text-[9px] text-white/40">12.4K / 13K XP</p>
      </div>
    );
  }
  if (kind === "streak") {
    return (
      <div className={`${surface} w-36`}>
        <p className="text-[9px] font-bold tracking-widest text-white/50">
          {lang === "hu" ? "HETI STREAK" : "WEEK STREAK"}
        </p>
        <p className="mt-1 text-4xl font-extrabold leading-none tracking-tighter text-white">
          7
        </p>
        <p className="mt-1 text-[9px] text-white/40">
          {lang === "hu" ? "all-time legjobb 12" : "all-time best 12"}
        </p>
      </div>
    );
  }
  return (
    <div className={`${surface} w-48`}>
      <p className="text-[9px] font-bold tracking-widest text-white/50">
        {lang === "hu" ? "ÚJ REKORD" : "NEW PR"}
      </p>
      <p className="mt-1 text-base font-extrabold leading-tight text-white">
        Bench Press
      </p>
      <p className="text-[10px] text-white/50">105 kg × 5</p>
      <p className="mt-2 text-[9px] font-bold tracking-widest text-white/40">
        {lang === "hu" ? "TEGNAP" : "YESTERDAY"}
      </p>
      {/* `t` is unused here but kept in scope so future copy lives in i18n.tsx. */}
      <span className="hidden">{t("hero.cta")}</span>
    </div>
  );
}

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
          "radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%)",
        WebkitMaskImage:
          "radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%)",
      }}
    />
  );
}

function SpotlightGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50"
      style={{
        background:
          "radial-gradient(circle, rgba(255,255,255,0.06), transparent 70%)",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Powerful Features grid
// ---------------------------------------------------------------------------

function FeaturesGrid() {
  const { t } = useLang();
  return (
    <section
      id="features"
      className="relative overflow-hidden border-b border-white/5 px-6 py-32"
    >
      <BackgroundGrid />
      <div className="relative mx-auto max-w-6xl">
        <SectionHeading
          line1={t("features.heading_main")}
          line2Accent={t("features.heading_accent")}
        />
        <p className="mx-auto mt-4 max-w-md text-center text-[13px] text-white/45">
          {t("features.subtitle")}
        </p>

        <div className="mt-20 grid grid-cols-1 gap-x-12 gap-y-20 md:grid-cols-2">
          <FeatureBlock
            title={t("features.adaptive.title")}
            body={t("features.adaptive.body")}
            visual={<GlassChip kind="rank" />}
          />
          <FeatureBlock
            title={t("features.pr.title")}
            body={t("features.pr.body")}
            visual={<PRStrip />}
          />
          <FeatureBlock
            title={t("features.volume.title")}
            body={t("features.volume.body")}
            visual={<VolumeRing />}
          />
          <FeatureBlock
            title={t("features.unified.title")}
            body={t("features.unified.body")}
            visual={<MiniPhonePair />}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureBlock({
  title,
  body,
  visual,
}: {
  title: string;
  body: string;
  visual: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="flex flex-col gap-6"
    >
      <div className="flex justify-center">{visual}</div>
      <div>
        <h3 className="text-xl font-extrabold tracking-tight text-white">
          {title}
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-white/55">{body}</p>
      </div>
    </motion.div>
  );
}

function PRStrip() {
  return (
    <div className="grid w-full max-w-md grid-cols-4 gap-1.5">
      {[
        ["84%", "BENCH"],
        ["64%", "SQUAT"],
        ["72%", "DEAD"],
        ["58%", "OHP"],
      ].map(([v, l]) => (
        <div
          key={l}
          className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-2 text-center backdrop-blur"
        >
          <p className="text-base font-extrabold tracking-tight text-white">
            {v}
          </p>
          <p className="text-[8px] font-bold tracking-widest text-white/40">
            {l}
          </p>
        </div>
      ))}
    </div>
  );
}

function VolumeRing() {
  const { lang } = useLang();
  return (
    <div className="relative flex h-44 w-44 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl">
      <svg className="absolute inset-0" viewBox="0 0 176 176">
        <circle
          cx="88"
          cy="88"
          r="76"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="3"
        />
        <circle
          cx="88"
          cy="88"
          r="76"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeDasharray="280 478"
          strokeLinecap="round"
          transform="rotate(-90 88 88)"
        />
      </svg>
      <div className="relative text-center">
        <p className="text-3xl font-extrabold tracking-tight text-white">12</p>
        <p className="text-[9px] font-bold tracking-widest text-white/40">
          {lang === "hu" ? "MELL / HÉT" : "CHEST / WEEK"}
        </p>
        <p className="mt-1 text-[8px] tracking-widest text-white/35">
          MAV 14 · MEV 8
        </p>
      </div>
    </div>
  );
}

function MiniPhonePair() {
  // The pair is intentionally small but we keep just enough size that the
  // dashboard and rank mocks don't look stuffed against the bezel. Width
  // stays under the narrow-mobile column (≈300px) so the pair never
  // overflows the parent FeatureBlock at any viewport.
  return (
    <div className="flex gap-4">
      <div className="w-36 -rotate-3">
        <PhoneFrame
          glow={false}
          screenshot={phoneWorkouts}
          screenshotAlt="HEFTOR workouts library"
        />
      </div>
      <div className="mt-6 w-36 rotate-3">
        <PhoneFrame
          glow={false}
          screenshot={phoneCalendar}
          screenshotAlt="HEFTOR training calendar"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3-step "Set it once" section
// ---------------------------------------------------------------------------

function Steps() {
  const { t } = useLang();
  const steps = [
    { n: "01", title: t("steps.1.title"), body: t("steps.1.body") },
    { n: "02", title: t("steps.2.title"), body: t("steps.2.body") },
    { n: "03", title: t("steps.3.title"), body: t("steps.3.body") },
  ];
  return (
    <section
      id="how"
      className="relative overflow-hidden border-b border-white/5 px-6 py-32"
    >
      <BackgroundGrid />
      <div className="relative mx-auto max-w-6xl">
        <SectionHeading
          line1={t("steps.heading_main")}
          line2Accent={t("steps.heading_accent")}
        />
        <p className="mx-auto mt-4 max-w-md text-center text-[13px] text-white/45">
          {t("steps.subtitle")}
        </p>

        <div className="mt-16 grid grid-cols-1 items-center gap-12 md:grid-cols-2">
          <div className="space-y-5">
            {steps.map((s, i) => (
              <StepRow key={s.n} {...s} delay={i * 0.15} />
            ))}
          </div>
          <div className="flex justify-center">
            <div className="w-[280px]">
              <PhoneFrame
                screenshot={phoneWorkouts}
                screenshotAlt="HEFTOR workouts library — your plan, generated by the engine"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepRow({
  n,
  title,
  body,
  delay,
}: {
  n: string;
  title: string;
  body: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur"
    >
      <div className="flex items-start gap-4">
        <span
          className="text-2xl font-extrabold leading-none tracking-tighter text-white/30"
          style={{ letterSpacing: "-0.05em" }}
        >
          {n}
        </span>
        <div className="flex-1">
          <h4 className="text-base font-extrabold text-white">{title}</h4>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">
            {body}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Radial features
// ---------------------------------------------------------------------------

function RadialFeatures() {
  const { t } = useLang();
  const labels = [
    { side: "left", top: "12%", text: t("radial.label.1") },
    { side: "left", top: "44%", text: t("radial.label.2") },
    { side: "left", top: "76%", text: t("radial.label.3") },
    { side: "right", top: "12%", text: t("radial.label.4") },
    { side: "right", top: "44%", text: t("radial.label.5") },
    { side: "right", top: "76%", text: t("radial.label.6") },
  ];
  return (
    <section className="relative overflow-hidden border-b border-white/5 px-6 py-36">
      <BackgroundGrid />
      <RadialRings />
      <div className="relative mx-auto max-w-6xl">
        <SectionHeading
          line1={t("radial.heading_main")}
          line2Accent={t("radial.heading_accent")}
        />
        <p className="mx-auto mt-4 max-w-md text-center text-[13px] text-white/45">
          {t("radial.subtitle")}
        </p>

        <div className="relative mt-16 flex h-[520px] items-center justify-center md:h-[640px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative z-10 w-[240px] md:w-[280px]"
          >
            <PhoneFrame
              screenshot={phoneHome}
              screenshotAlt="HEFTOR home screen — every detail in one monochrome surface"
            />
          </motion.div>

          {labels.map((l, i) => (
            <RadialLabel key={l.text} {...l} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RadialRings() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      {[260, 380, 500, 620].map((d) => (
        <div
          key={d}
          className="absolute left-1/2 top-1/2 rounded-full border border-white/[0.04]"
          style={{ width: d, height: d, transform: "translate(-50%, -50%)" }}
        />
      ))}
    </div>
  );
}

function RadialLabel({
  side,
  top,
  text,
  delay,
}: {
  side: string;
  top: string;
  text: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const positionClass =
    side === "left" ? "left-2 md:left-12" : "right-2 md:right-12";
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: side === "left" ? -20 : 20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={`absolute z-0 hidden md:block ${positionClass}`}
      style={{ top }}
    >
      <div className="flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 backdrop-blur-xl">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        <span className="text-[12px] font-medium text-white/85">{text}</span>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

function Stats() {
  const { t } = useLang();
  return (
    <section
      id="stats"
      className="relative overflow-hidden border-b border-white/5 px-6 py-32"
    >
      <div className="relative mx-auto max-w-5xl">
        <SectionHeading
          line1={t("stats.heading_main")}
          line2Accent={t("stats.heading_accent")}
        />
        <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
          <Stat value={30} suffix="%+" label={t("stats.faster")} />
          <Stat
            value={10000}
            suffix="+"
            label={t("stats.sets")}
            compact
          />
          <Stat value={10} label={t("stats.ranks")} />
          <Stat value={98} suffix="%" label={t("stats.retention")} />
        </div>
      </div>
    </section>
  );
}

function Stat({
  value,
  suffix = "",
  label,
  compact = false,
}: {
  value: number;
  suffix?: string;
  label: string;
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const progress = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setN(Math.round(value * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);
  const display = compact && n >= 1000 ? `${Math.round(n / 1000)}K` : n;
  return (
    <div
      ref={ref}
      className="flex flex-col items-start border-l border-white/10 pl-4 md:pl-6"
    >
      <p className="text-xs font-bold tracking-widest text-white/40">{label}</p>
      <p className="mt-1 text-4xl font-extrabold tracking-tight text-white md:text-5xl">
        {display}
        {suffix}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Final CTA
// ---------------------------------------------------------------------------

function FinalCTA() {
  const { t } = useLang();
  return (
    <section
      id="download"
      className="relative overflow-hidden border-b border-white/5 px-6 py-36"
    >
      <BackgroundGrid />
      <div className="relative mx-auto max-w-6xl">
        <SectionHeading
          line1={t("cta.heading_main")}
          line2Accent={t("cta.heading_accent")}
        />
        <p className="mx-auto mt-4 max-w-md text-center text-[13px] text-white/45">
          {t("cta.subtitle")}
        </p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mt-10 flex justify-center"
        >
          <a
            href="#"
            className="cursor-pointer rounded-full bg-white px-7 py-3 text-[13px] font-bold tracking-tight text-black transition-colors hover:bg-white/90"
          >
            {t("cta.button")}
          </a>
        </motion.div>

        <div className="mt-20 flex items-center justify-center gap-6">
          <div className="w-[200px] -rotate-6 md:w-[260px]">
            <PhoneFrame
              screenshot={phoneHome}
              screenshotAlt="HEFTOR home screen"
            />
          </div>
          <div className="w-[200px] rotate-6 md:w-[260px]">
            <PhoneFrame
              screenshot={phoneCalendar}
              screenshotAlt="HEFTOR training calendar"
            />
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 md:flex-row md:justify-center md:gap-6">
          <StoreButton kind="apple" />
          <StoreButton kind="google" />
        </div>
      </div>
    </section>
  );
}

function StoreButton({ kind }: { kind: "apple" | "google" }) {
  const { lang } = useLang();
  return (
    <a
      href="#"
      className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.05] px-5 py-3 backdrop-blur transition-colors hover:bg-white/[0.08]"
    >
      {kind === "apple" ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
          <path d="M17.6 13.04c0-3.05 2.49-4.51 2.6-4.58-1.42-2.07-3.62-2.36-4.4-2.39-1.87-.19-3.65 1.1-4.6 1.1-.96 0-2.41-1.08-3.97-1.05-2.04.03-3.93 1.2-4.97 3.02-2.13 3.69-.54 9.13 1.52 12.13.99 1.46 2.18 3.1 3.74 3.04 1.5-.06 2.07-.97 3.89-.97 1.81 0 2.32.97 3.91.94 1.61-.03 2.64-1.48 3.62-2.95 1.16-1.7 1.63-3.35 1.66-3.43-.04-.02-3.19-1.22-3.22-4.83zM14.93 4.1c.83-1.01 1.39-2.42 1.23-3.81-1.2.05-2.65.79-3.5 1.8-.77.89-1.45 2.33-1.26 3.7 1.33.1 2.7-.68 3.53-1.69z" />
        </svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
          <path d="M3.8 1.6c-.3.3-.5.7-.5 1.3v18.2c0 .6.2 1 .5 1.3l11.4-11.4L3.8 1.6zm12.7 12.7l3.5 2c.6.3 1 1 1 1.7s-.4 1.4-1 1.7l-3.5 2L13 19l3.5-4.7zM3.9 22.7l11.1-11.1L18.1 14 7.8 22.3c-.5.3-.9.6-1.4.7-.5.1-1 0-1.4-.2-.4-.1-.7-.3-1.1-.1zM3.9 1.3L18.1 10l-3.1 2.4L3.9 1.3z" />
        </svg>
      )}
      <div className="text-left leading-tight">
        <p className="text-[9px] font-medium uppercase tracking-widest text-white/55">
          {kind === "apple"
            ? lang === "hu"
              ? "Töltsd le az"
              : "Download on the"
            : lang === "hu"
              ? "Töltsd le innen:"
              : "Get it on"}
        </p>
        <p className="text-sm font-bold tracking-tight text-white">
          {kind === "apple" ? "App Store" : "Google Play"}
        </p>
      </div>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Big wordmark
// ---------------------------------------------------------------------------

function BigWordmark() {
  return (
    <section className="relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
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

// ---------------------------------------------------------------------------
// Section heading helper
// ---------------------------------------------------------------------------

function SectionHeading({
  line1,
  line2Accent,
}: {
  line1: string;
  line2Accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7 }}
      className="text-center"
    >
      <h2 className="text-4xl font-extrabold tracking-tight leading-tight text-white md:text-5xl">
        {line1}
        <br />
        <span
          className="font-normal italic text-white/95"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {line2Accent}
        </span>
      </h2>
    </motion.div>
  );
}
