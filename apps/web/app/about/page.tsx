"use client";

import Link from "next/link";
import {
  MarketingShell,
  PageHeading,
} from "../components/landing/MarketingShell";
import { useLang } from "../components/landing/i18n";

// ---------------------------------------------------------------------------
// /about
// ---------------------------------------------------------------------------
//
// Marketing surface explaining what HEFTOR is, where it came from, and the
// principles we ship under. Pulls translations from the shared LangProvider
// so EN/HU stay in lockstep with the rest of the marketing site.
// ---------------------------------------------------------------------------

export default function AboutPage() {
  return (
    <MarketingShell>
      <AboutBody />
    </MarketingShell>
  );
}

function AboutBody() {
  const { t } = useLang();
  return (
    <section className="relative px-6 pb-24 pt-36 md:pt-44">
      <div className="mx-auto max-w-3xl">
        <PageHeading
          eyebrow={t("about.eyebrow")}
          line1={t("about.heading_main")}
          accent={t("about.heading_accent")}
          subtitle={t("about.subtitle")}
        />

        <article className="mt-16 space-y-12 text-[15px] leading-relaxed text-white/75">
          <Section title={t("about.story.title")}>
            <p>{t("about.story.body")}</p>
          </Section>

          <Section title={t("about.belief.title")}>
            <p>{t("about.belief.body")}</p>
          </Section>

          <Section title={t("about.engine.title")}>
            <p>{t("about.engine.body")}</p>
          </Section>

          <Section title={t("about.values.title")}>
            <ValueList
              items={[
                t("about.value.privacy"),
                t("about.value.transparency"),
                t("about.value.craft"),
                t("about.value.respect"),
              ]}
            />
          </Section>
        </article>

        <NewsletterCta />
      </div>
    </section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[20px] font-extrabold tracking-tight text-white md:text-[22px]">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function ValueList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
        >
          <span className="mt-[3px] inline-block h-2 w-2 shrink-0 rounded-full bg-white/70" />
          <span className="text-[14px] leading-relaxed text-white/80">
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

function NewsletterCta() {
  const { t } = useLang();
  return (
    <div className="mt-20 rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 backdrop-blur-xl md:p-10">
      <p className="text-[11px] font-extrabold tracking-widest text-white/45">
        STAY IN TOUCH
      </p>
      <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
        {t("about.cta.title")}
      </h3>
      <p className="mt-3 text-[14px] leading-relaxed text-white/65">
        {t("about.cta.subtitle")}
      </p>
      <Link
        href="/#download"
        className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-5 py-3 text-[12px] font-bold tracking-tight text-black transition-colors hover:bg-white/90"
      >
        {t("about.cta.button")} →
      </Link>
    </div>
  );
}
