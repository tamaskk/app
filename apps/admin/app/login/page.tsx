"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense>
      <Form />
    </Suspense>
  );
}

function Form() {
  // Deliberately not using `useRouter()` here — the middleware re-checks the
  // cookie on every request, so we trigger a full navigation after sign-in.
  const params = useSearchParams();
  const from = params.get("from") ?? "/dashboard";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setError((j && j.detail) || "Login failed");
        return;
      }
      // Hard navigation — middleware needs to re-check the cookie.
      window.location.href = from;
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 backdrop-blur-xl"
      >
        <p className="text-[10px] font-extrabold tracking-widest text-white/45">
          HEFTOR ADMIN
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
          Sign in
        </h1>

        <div className="mt-8 space-y-3">
          <LabelledField label="Username">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full bg-transparent text-sm text-white outline-none"
            />
          </LabelledField>
          <LabelledField label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-transparent text-sm text-white outline-none"
            />
          </LabelledField>
        </div>

        {error && (
          <p className="mt-4 text-[13px] text-white/80">{error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full cursor-pointer rounded-full bg-white py-3 text-[13px] font-bold tracking-tight text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in →"}
        </button>
      </form>
    </div>
  );
}

function LabelledField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 transition-colors focus-within:border-white/30">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/45">
        {label}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
