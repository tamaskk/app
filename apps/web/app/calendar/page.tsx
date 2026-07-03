const months = [
  {
    name: "Feb",
    highlight: 26,
    weeks: [
      [null, null, null, null, null, null, "s"],
      [null, null, null, null, null, "s", "s"],
      [null, "w", null, null, null, "s", "s"],
      [null, "w", null, "w", null, "s", "s"],
      [null, "w", null, "t", null, "s", "s"],
    ],
  },
  {
    name: "Mar",
    highlight: null,
    weeks: [
      [null, null, null, null, null, null, null],
    ],
  },
];

const days = ["M", "T", "W", "T", "F", "S", "S"];

const summary = {
  sets: 15,
  kg: 7678,
  minutes: 47,
  kcal: 238,
  records: 1,
};

const recentExercises = [
  { name: "Incline Bench Press", tags: ["R", "V"] },
  { name: "Chest Press", tags: [] },
];

function Dot({ type }: { type: string | null }) {
  if (!type) return <div className="w-2 h-2 rounded-full bg-surface-high" />;
  if (type === "t") return <div className="w-2 h-2 rounded-full bg-accent-red" />;
  if (type === "w") return <div className="w-2 h-2 rounded-full bg-white" />;
  return <div className="w-2 h-2 rounded-full bg-surface-high" />;
}

export default function CalendarPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-10 flex flex-col gap-6">
      {/* Streak */}
      <div className="flex flex-col items-center py-10 bg-surface-low rounded-3xl">
        <p className="text-8xl font-extrabold text-white tracking-tighter leading-none">49</p>
        <p className="text-muted text-base mt-2">week streak</p>
      </div>

      {/* Calendar card */}
      <div className="bg-white rounded-3xl p-6">
        {months.map((month) => (
          <div key={month.name} className="mb-4 last:mb-0">
            <div className="flex items-center gap-2 mb-3">
              {month.highlight && <span className="w-2 h-2 rounded-full bg-accent-red" />}
              <h3 className="text-lg font-bold text-black">
                {month.name}{" "}
                {month.highlight && <span className="text-[#636565]">{month.highlight}</span>}
              </h3>
            </div>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {days.map((d, i) => (
                <div key={i} className="text-center text-xs text-[#8e8e93] font-medium">{d}</div>
              ))}
            </div>
            {/* Weeks */}
            {month.weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 mb-2">
                {week.map((cell, ci) => (
                  <div key={ci} className="flex items-center justify-center py-1">
                    <Dot type={cell} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Congratulations card */}
      <div className="bg-surface-low rounded-3xl p-6">
        <div className="flex items-center justify-center gap-3 mb-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
          </svg>
          <span className="text-xs text-muted tracking-widest uppercase font-semibold">Congratulations</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
          </svg>
        </div>

        <p className="text-center text-muted mb-2">You have completed</p>
        <p className="text-center text-3xl font-extrabold text-white tracking-tight mb-1">
          <span className="text-white">{summary.sets} sets</span>{" "}
          <span className="text-muted font-semibold text-2xl">and lifted</span>
        </p>
        <p className="text-center text-3xl font-extrabold text-white tracking-tight mb-4">
          {summary.kg.toLocaleString()} kg{" "}
          <span className="text-muted font-semibold text-2xl">in</span>{" "}
          {summary.minutes} min
        </p>

        <div className="flex justify-center gap-3">
          <div className="flex items-center gap-1.5 bg-surface-high rounded-full px-4 py-2">
            <span className="text-sm">🔥</span>
            <span className="text-sm font-semibold text-white">{summary.kcal} kcal</span>
          </div>
          <div className="flex items-center gap-1.5 bg-surface-high rounded-full px-4 py-2">
            <span className="text-sm">🏆</span>
            <span className="text-sm font-semibold text-white">{summary.records} record</span>
          </div>
        </div>
      </div>

      {/* Recent exercises */}
      <div className="flex flex-col gap-2">
        {recentExercises.map((ex) => (
          <div key={ex.name} className="flex items-center justify-between bg-surface-low rounded-2xl px-5 py-4">
            <span className="font-bold text-white">{ex.name}</span>
            <div className="flex items-center gap-2">
              {ex.tags.map((tag) => (
                <div key={tag} className="w-7 h-7 rounded-full bg-surface-high flex items-center justify-center text-xs font-bold text-white">
                  {tag}
                </div>
              ))}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
