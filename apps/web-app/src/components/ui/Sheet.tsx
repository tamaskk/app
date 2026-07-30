"use client";

import { useEffect } from "react";

// Bottom sheet — the app's modal chrome: black bg, 28px top corners, 1px
// outline border, grab handle. On desktop it centres as a dialog card. Used for
// training actions, delete/edit, workout menus, pickers.

export function Sheet({
  open,
  onClose,
  children,
  maxHeight = "85vh",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="fade-in relative w-full max-w-[480px] rounded-t-[28px] border border-outline bg-background sm:rounded-[28px]"
        style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-surface-high" />
        </div>
        <div className="overflow-y-auto pb-[max(16px,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}

/** A tappable list row inside a sheet (leading icon + title). */
export function SheetItem({
  icon,
  label,
  muted,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  muted?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  const color = danger ? "text-accent-red" : muted ? "text-muted" : "text-on-surface";
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-4 px-6 py-4 text-left ${color} transition-colors hover:bg-surface-low/60`}
    >
      <span className={color}>{icon}</span>
      <span className="text-base font-semibold">{label}</span>
    </button>
  );
}
