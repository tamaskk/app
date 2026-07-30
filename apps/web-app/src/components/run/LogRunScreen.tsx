"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import * as api from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Skeleton";

// Log a cardio run — distance + time — as a workout session. Stored with a
// `metric: "distance"` exercise carrying distanceM + seconds (the same set
// fields HYROX uses), so it shows up in history/calendar/progress like any
// other session, plus its distance and pace.

const HU: Record<string, string> = {
  title: "Futás naplózása",
  subtitle: "Add meg a távot és az időt.",
  distance: "TÁV (KM)",
  time: "IDŐ",
  min: "perc",
  sec: "mp",
  date: "DÁTUM",
  pace: "TEMPÓ",
  save: "Mentés",
  need: "Adj meg távot vagy időt.",
  name: "Futás",
  failed: "Nem sikerült menteni.",
};
const EN: Record<string, string> = {
  title: "Log a run",
  subtitle: "Enter the distance and time.",
  distance: "DISTANCE (KM)",
  time: "TIME",
  min: "min",
  sec: "sec",
  date: "DATE",
  pace: "PACE",
  save: "Save",
  need: "Enter a distance or time.",
  name: "Run",
  failed: "Couldn't save.",
};

function todayISO() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function LogRunScreen() {
  const router = useRouter();
  const { lang } = useI18n();
  const L = lang === "hu" ? HU : EN;

  const [km, setKm] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  const distanceM = Math.max(0, Math.round((parseFloat(km.replace(",", ".")) || 0) * 1000));
  const totalSec = Math.max(0, (parseInt(minutes, 10) || 0) * 60 + (parseInt(seconds, 10) || 0));

  const pace = useMemo(() => {
    if (distanceM <= 0 || totalSec <= 0) return null;
    const secPerKm = totalSec / (distanceM / 1000);
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${String(s).padStart(2, "0")} /km`;
  }, [distanceM, totalSec]);

  async function save() {
    if (saving) return;
    if (distanceM <= 0 && totalSec <= 0) {
      alert(L.need);
      return;
    }
    setSaving(true);
    // finishedAt = today → now; a past date → noon that day. startedAt spans the run.
    const isToday = date === todayISO();
    const finishedAt = isToday ? new Date() : new Date(`${date}T12:00:00`);
    const startedAt = new Date(finishedAt.getTime() - totalSec * 1000);
    try {
      await api.createSession({
        name: L.name,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        exercises: [
          {
            exerciseId: "cardio_run",
            name: L.name,
            gifUrl: "",
            targetMuscles: ["cardiovascular system"],
            metric: "distance",
            sets: [{ kg: 0, reps: 0, done: true, distanceM, seconds: totalSec }],
          },
        ],
      });
      router.push("/");
    } catch (e) {
      alert(e instanceof Error ? e.message : L.failed);
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[520px] px-5">
      <header className="flex items-center gap-2 py-3">
        <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-low text-on-surface">
          <Icon name="chevron_left" size={22} />
        </button>
        <span className="flex-1 text-base font-bold text-on-surface">{L.title}</span>
        <button
          onClick={save}
          disabled={saving}
          className="flex min-w-[88px] items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-bold text-background disabled:opacity-70"
        >
          {saving ? <Spinner size={16} className="text-background" /> : L.save}
        </button>
      </header>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-low text-on-surface">
          <Icon name="run" size={24} />
        </div>
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-on-surface">{L.title}</h1>
          <p className="text-[14px] text-muted">{L.subtitle}</p>
        </div>
      </div>

      {/* distance */}
      <div className="mt-8">
        <p className="text-[11px] font-bold tracking-[0.12em] text-muted">{L.distance}</p>
        <div className="mt-2 flex items-end gap-2 rounded-2xl bg-surface-low px-4 py-3">
          <input
            value={km}
            onChange={(e) => setKm(e.target.value)}
            inputMode="decimal"
            placeholder="5.0"
            className="w-full bg-transparent text-[32px] font-extrabold text-on-surface outline-none placeholder:text-surface-high"
          />
          <span className="pb-2 text-lg font-semibold text-muted">km</span>
        </div>
      </div>

      {/* time */}
      <div className="mt-5">
        <p className="text-[11px] font-bold tracking-[0.12em] text-muted">{L.time}</p>
        <div className="mt-2 flex items-stretch gap-2">
          <TimeBox value={minutes} onChange={setMinutes} unit={L.min} placeholder="30" />
          <TimeBox value={seconds} onChange={setSeconds} unit={L.sec} placeholder="00" max={59} />
        </div>
      </div>

      {/* date */}
      <div className="mt-5">
        <p className="text-[11px] font-bold tracking-[0.12em] text-muted">{L.date}</p>
        <input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="mt-2 w-full rounded-2xl bg-surface-low px-4 py-3.5 text-base font-semibold text-on-surface outline-none [color-scheme:dark]"
        />
      </div>

      {/* pace preview */}
      {pace && (
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-outline px-4 py-3.5">
          <span className="text-[11px] font-bold tracking-[0.12em] text-muted">{L.pace}</span>
          <span className="text-lg font-extrabold text-on-surface">{pace}</span>
        </div>
      )}
    </div>
  );
}

function TimeBox({
  value,
  onChange,
  unit,
  placeholder,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  unit: string;
  placeholder: string;
  max?: number;
}) {
  return (
    <div className="flex flex-1 items-end gap-1 rounded-2xl bg-surface-low px-4 py-3">
      <input
        value={value}
        inputMode="numeric"
        placeholder={placeholder}
        onChange={(e) => {
          const n = e.target.value.replace(/[^0-9]/g, "");
          if (max != null && Number(n) > max) return;
          onChange(n);
        }}
        className="w-full bg-transparent text-[32px] font-extrabold text-on-surface outline-none placeholder:text-surface-high"
      />
      <span className="pb-2 text-base font-semibold text-muted">{unit}</span>
    </div>
  );
}
