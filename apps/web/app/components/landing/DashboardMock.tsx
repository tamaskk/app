"use client";

/**
 * Mini HEFTOR dashboard rendered inside the hero phone. Mirrors the real
 * mobile UI: greeting, streak + rank chips, day strip, hero workout card,
 * weekly plan strip, stats grid. Pure markup — no real data.
 */
export function DashboardMock() {
  const days = ["H", "K", "SZE", "CS", "P", "SZO", "V"];
  const planLabels = ["PUSH", "PIH", "PULL", "PIH", "LÁB", "FELSŐ", "PIH"];
  return (
    // gap-2 (instead of gap-3) keeps every section visible at the smallest
    // phone size (MiniPhonePair w-36) without the bottom stats grid kissing
    // the bezel. We deliberately drop `mt-auto` on the stats below so the
    // content stacks naturally — at the larger hero phone (w-[320px]) the
    // empty bottom area reads as intentional safe-area padding.
    <div className="flex h-full w-full flex-col gap-2 px-4 pb-6 text-white">
      {/* Greeting + chips */}
      <div className="mt-2 flex items-start justify-between">
        <div>
          <p className="text-[10px] text-white/40">Szia,</p>
          <p className="text-lg font-extrabold tracking-tight">Tamás</p>
          <p className="mt-0.5 text-[9px] text-white/40">
            12,4 t ebben a hónapban
          </p>
        </div>
        <div className="flex gap-1.5">
          <ChipColumn label="STREAK" value="7" />
          <ChipColumn label="RANG" value="VII" />
        </div>
      </div>

      {/* Day strip */}
      <div className="flex justify-between gap-1 pt-1">
        {days.map((d, i) => (
          <div
            key={d}
            className="flex flex-col items-center gap-1"
          >
            <span
              className={`text-[8px] font-bold ${
                i === 3 ? "text-white" : "text-white/40"
              }`}
            >
              {d}
            </span>
            <span
              className={`text-[10px] font-bold ${
                i === 3 ? "text-white" : "text-white/40"
              }`}
            >
              {17 + i}
            </span>
            <div
              className={`mt-0.5 h-0.5 w-3 ${
                i === 3
                  ? "bg-white"
                  : i === 0 || i === 2
                    ? "bg-white/35"
                    : "bg-transparent"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Hero card */}
      <div className="mt-2 rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            <span className="text-[8px] font-bold tracking-widest text-white/50">
              MA · 47 PERC · 6 GYAKORLAT
            </span>
          </div>
          <span className="text-3xl font-extrabold text-white/10">04</span>
        </div>
        <h3 className="mt-1 text-2xl font-extrabold leading-none tracking-tight">
          Push Day
        </h3>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-0.5 flex-1 rounded-full bg-white/15">
            <div className="h-full w-3/4 rounded-full bg-white" />
          </div>
          <span className="text-[8px] text-white/50">3/4 a héten</span>
        </div>
      </div>

      {/* Start pill */}
      <button className="rounded-full bg-white py-2 text-[10px] font-extrabold tracking-widest text-black">
        KEZDÉS →
      </button>

      {/* Weekly plan strip */}
      <div className="pt-1">
        <p className="text-[8px] font-bold tracking-widest text-white/40">
          HETI TERV
        </p>
        <div className="mt-1.5 rounded-xl bg-white/[0.03] p-2 ring-1 ring-white/5">
          <div className="flex justify-between">
            {planLabels.map((label, i) => {
              const rest = label === "PIH";
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-[7px] font-bold tracking-wider text-white/40">
                    {days[i]}
                  </span>
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-md text-[7px] font-extrabold tracking-wider ${
                      rest
                        ? "border border-white/15 text-white/40"
                        : "bg-white text-black"
                    }`}
                  >
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div>
        <p className="text-[8px] font-bold tracking-widest text-white/40">
          ÖSSZESÍTETT
        </p>
        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
          {[
            ["2,5K", "SET"],
            ["47 t", "MEG"],
            ["89h", "IDŐ"],
            ["12", "PR"],
          ].map(([v, l]) => (
            <div
              key={l}
              className="rounded-md bg-white/[0.03] p-1.5 text-center ring-1 ring-white/5"
            >
              <p className="text-[11px] font-extrabold tracking-tight">{v}</p>
              <p className="text-[7px] text-white/40">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChipColumn({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.05] px-2 py-1 ring-1 ring-white/5">
      <p className="text-[7px] font-bold tracking-widest text-white/40">
        {label}
      </p>
      <p className="text-base font-extrabold leading-tight tracking-tight">
        {value}
      </p>
    </div>
  );
}
