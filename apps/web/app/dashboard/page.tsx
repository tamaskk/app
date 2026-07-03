import Link from "next/link";
import StagnationBanner from "../components/StagnationBanner";

const todayWorkout = { name: "Lower", duration: "57 min", number: "02", completedThisWeek: 1, totalThisWeek: 3 };
const weekWorkouts = [
  { name: "Upper", exercises: 5, number: "01" },
  { name: "Upper", exercises: 7, number: "03" },
];
const weekDays = ["H", "K", "Sz", "Cs", "P", "Szo", "V"];
const currentDay = 3;
const stats = [
  { label: "Összes set", value: "2,5K" },
  { label: "Megemelt", value: "47,2T" },
  { label: "Aktív idő", value: "89h" },
  { label: "Rekordok", value: "12" },
];

export default function DashboardPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-muted text-sm mb-1">Szia,</p>
          <h2 className="text-4xl font-extrabold tracking-tight text-white">Alex</h2>
        </div>
        <div className="flex items-center gap-2 bg-surface-low px-4 py-2 rounded-full">
          <span className="text-2xl font-bold text-white">49</span>
          <span className="text-accent-red text-lg">🔥</span>
        </div>
      </div>

      {/* Week strip */}
      <div className="flex gap-2 mb-8">
        {weekDays.map((day, i) => (
          <div
            key={day}
            className={`flex-1 flex flex-col items-center gap-1.5 py-2 rounded-xl transition-all ${
              i === currentDay ? "bg-white" : ""
            }`}
          >
            <span className={`text-xs font-medium ${i === currentDay ? "text-black" : "text-muted"}`}>{day}</span>
            <span className={`text-sm font-bold ${i === currentDay ? "text-black" : "text-muted"}`}>{22 + i}</span>
          </div>
        ))}
      </div>

      {/* Stagnation banner — hidden unless something is stagnating */}
      <div className="mb-8 -mt-4">
        <StagnationBanner />
      </div>

      {/* Today hero card */}
      <Link href="/workouts">
        <div className="relative bg-surface-low rounded-3xl p-6 mb-3 overflow-hidden cursor-pointer hover:bg-surface-mid transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-red" />
              <span className="text-xs text-muted font-medium tracking-widest uppercase">Ma • {todayWorkout.duration}</span>
            </div>
            <span className="text-6xl font-extrabold text-surface-mid leading-none select-none">{todayWorkout.number}</span>
          </div>
          <h3 className="text-5xl font-extrabold tracking-tight text-white mb-4">{todayWorkout.name}</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1 rounded-full bg-outline">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${(todayWorkout.completedThisWeek / todayWorkout.totalThisWeek) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted">{todayWorkout.completedThisWeek}/{todayWorkout.totalThisWeek} edzés ezen a héten</span>
          </div>
        </div>
      </Link>

      {/* Other workouts */}
      <div className="flex flex-col gap-2 mb-10">
        {weekWorkouts.map((w) => (
          <div key={w.number} className="flex items-center justify-between bg-white rounded-2xl px-6 py-4">
            <div>
              <p className="text-base font-bold text-black">{w.name}</p>
              <p className="text-sm text-[#636565]">{w.exercises} gyakorlat</p>
            </div>
            <span className="text-4xl font-extrabold text-[#e0e0e0]">{w.number}</span>
          </div>
        ))}
      </div>

      {/* Stats grid */}
      <p className="text-xs text-muted uppercase tracking-widest mb-4">Összesített</p>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface-low rounded-2xl p-5">
            <p className="text-3xl font-extrabold text-white tracking-tight">{s.value}</p>
            <p className="text-sm text-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
