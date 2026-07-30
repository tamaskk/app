"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Skeleton";

/**
 * AuthField — outlined (no fill), radius 14, 1px `outline` border that turns
 * `onSurface` on focus. Floating label: muted at rest, onSurface when active.
 * Mirrors `AuthField` in auth_widgets.dart.
 */
export function AuthField({
  label,
  type = "text",
  value,
  onChange,
  onEnter,
  autoComplete,
  inputMode,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  autoComplete?: string;
  inputMode?: "text" | "email" | "numeric" | "decimal";
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;

  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        inputMode={inputMode}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) onEnter();
        }}
        className={`h-14 w-full rounded-[14px] border bg-transparent px-4 pt-2 text-base text-on-surface caret-on-surface outline-none transition-colors ${
          focused ? "border-on-surface" : "border-outline"
        }`}
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-4 transition-all ${
          floated
            ? "top-1.5 text-[11px] " + (focused ? "text-on-surface" : "text-muted")
            : "top-1/2 -translate-y-1/2 text-base text-muted"
        }`}
      >
        {label}
      </label>
    </div>
  );
}

/**
 * AuthButton — full-width white pill-less button (radius 16), black label,
 * spinner while loading, surfaceHigh fill when disabled. Mirrors `AuthButton`.
 */
export function AuthButton({
  label,
  loading,
  onClick,
  disabled,
  type = "button",
}: {
  label: string;
  loading?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const off = loading || disabled;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={off}
      className={`flex h-[52px] w-full items-center justify-center rounded-2xl text-base font-bold transition-colors ${
        off ? "bg-surface-high text-background" : "bg-primary text-background active:opacity-90"
      }`}
    >
      {loading ? <Spinner size={18} className="text-background" /> : label}
    </button>
  );
}

/** Inline monochrome error row: error icon + message (both onSurface). */
export function AuthError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 text-on-surface">
      <Icon name="error" size={18} className="mt-0.5 shrink-0" />
      <span className="text-[13px]">{message}</span>
    </div>
  );
}

/** Center "switch" link: "{leading} " (muted) + action (onSurface, bold). */
export function AuthLink({
  leading,
  action,
  onClick,
  disabled,
}: {
  leading: string;
  action: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-2 text-center text-sm disabled:opacity-50"
    >
      <span className="text-muted">{leading} </span>
      <span className="font-bold text-on-surface">{action}</span>
    </button>
  );
}

// --- Password strength (password_strength.dart) ---

const WEAK = new Set([
  "password",
  "12345678",
  "qwerty12",
  "letmein",
  "welcome1",
  "admin123",
  "football",
]);

export function scorePassword(pw: string): number {
  if (!pw) return 0;
  const classes =
    (/[a-z]/.test(pw) ? 1 : 0) +
    (/[A-Z]/.test(pw) ? 1 : 0) +
    (/[0-9]/.test(pw) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(pw) ? 1 : 0);
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (classes >= 2) score++;
  if (classes >= 3 && pw.length >= 10) score++;
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
  if (WEAK.has(pw.toLowerCase())) return clamp(score, 0, 1);
  return clamp(score, 0, 4);
}

export function PasswordStrength({
  password,
  label,
}: {
  password: string;
  label: string;
}) {
  const score = scorePassword(password);
  return (
    <div>
      <div className="flex">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i < 3 ? "mr-1.5" : ""} ${
              i < score ? "bg-on-surface" : "bg-surface-high"
            }`}
          />
        ))}
      </div>
      <div className="mt-2 text-[12px] font-bold tracking-[0.1em] text-muted">
        {password ? label : " "}
      </div>
    </div>
  );
}
