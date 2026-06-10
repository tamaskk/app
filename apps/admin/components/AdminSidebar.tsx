"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items: { href: string; label: string; icon: React.ReactNode }[] = [
  { href: "/dashboard", label: "Dashboard", icon: <IconDash /> },
  { href: "/users", label: "Users", icon: <IconUsers /> },
  { href: "/sessions", label: "Sessions", icon: <IconSessions /> },
  { href: "/trainings", label: "Trainings", icon: <IconTrainings /> },
  { href: "/contact", label: "Contact", icon: <IconMail /> },
  { href: "/newsletter", label: "Newsletter", icon: <IconNewsletter /> },
  { href: "/blog", label: "Blog", icon: <IconBlog /> },
  { href: "/changelog", label: "Changelog", icon: <IconChangelog /> },
];

export function AdminSidebar() {
  const pathname = usePathname();

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <nav className="flex w-60 shrink-0 flex-col border-r border-white/5 bg-black px-4 py-6">
      <div className="mb-8 px-3">
        <p className="text-[10px] font-extrabold tracking-widest text-white/45">
          HEFTOR
        </p>
        <p className="mt-1 text-xl font-extrabold tracking-tight text-white">
          Admin
        </p>
      </div>

      <ul className="flex-1 space-y-1">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-colors ${
                  active
                    ? "bg-white/[0.08] text-white"
                    : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <span className="text-current">{it.icon}</span>
                <span className="font-semibold">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onLogout}
        className="mt-4 cursor-pointer rounded-xl border border-white/10 px-3 py-2.5 text-[12px] font-bold tracking-tight text-white/65 transition-colors hover:bg-white/[0.04] hover:text-white"
      >
        Sign out
      </button>
    </nav>
  );
}

function IconDash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 12l9-9 9 9M5 10v10h14V10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 11a3 3 0 100-6M21 20c0-2.6-1.6-4.8-3.9-5.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconSessions() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7h16M4 12h16M4 17h10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconTrainings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 12h2m12 0h2M7 8v8M17 8v8M9 10h6v4H9z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function IconNewsletter() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 6h13l3 3v9H4V6zM4 10h16M8 14h6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconBlog() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 4h11l3 3v13H5V4zM16 4v3h3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconChangelog() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="6" cy="18" r="2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M6 8v8M10 6h8M10 18h8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
