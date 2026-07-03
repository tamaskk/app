"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/workouts",
    label: "Edzések",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    href: "/progress",
    label: "Fejlődés",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  {
    href: "/calendar",
    label: "Naptar",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  // Hide the app sidebar on marketing / public pages — they'd compete with
  // the floating top nav and squeeze the hero. Anything that should look
  // like a marketing surface gets the full viewport width.
  const marketingPaths = [
    "/",
    "/about",
    "/contact",
    "/ranks",
    "/pricing",
    "/faq",
    "/blog",
    "/changelog",
    "/privacy",
  ];
  if (
    marketingPaths.includes(pathname ?? "") ||
    pathname?.startsWith("/blog/") ||
    pathname?.startsWith("/reset-password")
  ) {
    return null;
  }

  return (
    <nav className="hidden md:flex flex-col w-64 min-h-screen border-r border-[#2c2c2e] bg-black px-4 py-8 shrink-0">
      <div className="mb-10 px-2">
        <div className="flex items-center gap-2">
          <Image
            src="/mainlogo.png"
            alt="HEFTOR"
            width={24}
            height={24}
            priority
          />
          <h1 className="text-xl font-extrabold tracking-tighter text-white">HEFTOR</h1>
        </div>
        <p className="text-xs text-[#8e8e93] mt-0.5 tracking-widest uppercase">Pure Training Pro</p>
      </div>

      <div className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-white text-black"
                  : "text-[#8e8e93] hover:text-white hover:bg-[#1c1b1b]"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-[#1c1b1b]">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-bold text-sm">
          A
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Alex</p>
          <p className="text-xs text-[#8e8e93]">49 hetes streak 🔥</p>
        </div>
      </div>
    </nav>
  );
}
