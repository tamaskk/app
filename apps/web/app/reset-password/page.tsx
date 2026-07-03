"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

// Wraps the form in Suspense so useSearchParams() can suspend on the server.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Shell><p className="text-muted">Betöltés…</p></Shell>}>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <Shell>
        <h1 className="text-3xl font-extrabold mb-3">Hiányzó token</h1>
        <p className="text-muted">
          A link nem teljes. Kérj újat a{" "}
          <Link href="/login" className="underline">
            bejelentkezés
          </Link>{" "}
          oldalról.
        </p>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <h1 className="text-3xl font-extrabold mb-3">Új jelszó beállítva</h1>
        <p className="text-muted mb-6">
          Mostantól az új jelszavaddal léphetsz be a mobil app-ba és a webre.
        </p>
        <Link
          href="/"
          className="inline-block bg-white text-black font-bold px-6 py-3 rounded-full"
        >
          Tovább
        </Link>
      </Shell>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("A jelszó legalább 8 karakter legyen.");
      return;
    }
    if (password !== confirm) {
      setError("A két jelszó nem egyezik.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(
          (data && typeof data.detail === "string" && data.detail) ||
            "Sikertelen jelszó visszaállítás.",
        );
        return;
      }
      setDone(true);
    } catch {
      setError("Hálózati hiba. Próbáld újra.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Shell>
      <h1 className="text-3xl font-extrabold mb-3">Új jelszó beállítása</h1>
      <p className="text-muted mb-6">
        Válassz egy új jelszót — legalább 8 karakter.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Új jelszó"
          autoComplete="new-password"
          className="w-full bg-surface-low border border-outline rounded-2xl px-5 py-4 text-white placeholder-muted focus:border-white outline-none"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Új jelszó újra"
          autoComplete="new-password"
          className="w-full bg-surface-low border border-outline rounded-2xl px-5 py-4 text-white placeholder-muted focus:border-white outline-none"
        />
        {error && <p className="text-sm text-white/80">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-white text-black font-bold py-4 rounded-full disabled:opacity-50"
        >
          {submitting ? "Mentés…" : "Új jelszó mentése"}
        </button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-5 py-16">
      <div className="mb-8 flex items-center gap-2">
        <Image
          src="/mainlogo.png"
          alt="HEFTOR"
          width={20}
          height={20}
          priority
        />
        <p className="text-xs tracking-[0.3em] font-bold text-white">HEFTOR</p>
      </div>
      {children}
    </div>
  );
}
