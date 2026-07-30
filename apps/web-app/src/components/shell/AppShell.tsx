"use client";

import { AuthGate } from "./AuthGate";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";

/**
 * The main tab chrome. Mobile: a single 480px column with the bottom nav — a
 * pixel copy of the phone app. Desktop (≥ lg): a fixed left sidebar and a wide,
 * comfortable canvas. Screens render their own mobile-first bodies and layer on
 * `lg:` enhancements, so both breakpoints share one component tree.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-dvh lg:pl-64">
        <Sidebar />
        <main className="mx-auto w-full max-w-[480px] pb-24 lg:max-w-[1100px] lg:px-8 lg:pb-10 lg:pt-4">
          {children}
        </main>
        <BottomNav />
      </div>
    </AuthGate>
  );
}
