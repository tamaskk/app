"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useLang } from "./i18n";
import { Logo } from "./Logo";

// ---------------------------------------------------------------------------
// Floating glass nav shared by every public marketing page (landing, ranks,
// pricing, faq, contact). Cross-page links keep the same shape regardless
// of which page you're on; the Features anchor jumps back to the landing
// hero so the section nav still works from anywhere.
// ---------------------------------------------------------------------------

export function MarketingNav() {
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
          className="flex items-center gap-2 px-2 text-sm font-extrabold tracking-tight"
        >
          <Logo size={20} />
          <span>HEFTOR</span>
        </Link>
        <nav className="hidden items-center gap-7 text-[13px] font-medium text-white/70 md:flex">
          <Link className="cursor-pointer hover:text-white" href="/#features">
            {t("nav.features")}
          </Link>
          <Link className="cursor-pointer hover:text-white" href="/ranks">
            {t("nav.ranks")}
          </Link>
          <Link className="cursor-pointer hover:text-white" href="/pricing">
            {t("nav.pricing")}
          </Link>
          <Link className="cursor-pointer hover:text-white" href="/faq">
            {t("nav.faq")}
          </Link>
          <Link className="cursor-pointer hover:text-white" href="/about">
            {t("nav.about")}
          </Link>
        </nav>
        <Link
          href="/#download"
          className="cursor-pointer rounded-full bg-white px-4 py-2 text-[12px] font-bold tracking-tight text-black transition-colors hover:bg-white/90"
        >
          {t("nav.download")}
        </Link>
      </div>
    </motion.div>
  );
}
