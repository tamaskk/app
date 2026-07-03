"use client";

/**
 * Mini rank screen rendered inside the radial-feature phone. Mirrors the
 * mobile RankCard: huge roman numeral, XP, progress bar, weekly breakdown.
 */
export function RankMock() {
  return (
    <div className="flex h-full w-full flex-col items-center gap-2 px-5 pb-6 text-white">
      <div className="mt-3 w-full">
        <p className="text-[9px] font-bold tracking-widest text-white/40">
          RANG
        </p>
      </div>

      {/* Rank hero */}
      <div className="mt-2 flex w-full flex-col items-center rounded-2xl bg-white/[0.04] py-5 ring-1 ring-white/5">
        <span
          className="text-7xl font-extrabold leading-none tracking-tighter"
          style={{ letterSpacing: "-0.05em" }}
        >
          VII
        </span>
        <div className="mt-2 h-px w-12 bg-white/15" />
        <p className="mt-2 text-xs font-extrabold tracking-[0.3em]">STRONG</p>
        <p className="mt-4 text-2xl font-extrabold tracking-tight">12,4K</p>
        <p className="text-[9px] font-bold tracking-widest text-white/40">
          XP
        </p>
        <div className="mt-3 h-1.5 w-3/4 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-3/5 rounded-full bg-white" />
        </div>
        <p className="mt-1.5 text-[8px] font-bold tracking-widest text-white/40">
          600 / 13,000 → VIII ELITE
        </p>
      </div>

      {/* Weekly breakdown */}
      <div className="w-full">
        <p className="text-[8px] font-bold tracking-widest text-white/40">
          EZ A HÉT · +240 XP
        </p>
        <div className="mt-1.5 rounded-xl bg-white/[0.03] px-3 py-1 ring-1 ring-white/5">
          {[
            ["Szettek", "+88"],
            ["Edzések", "+150"],
            ["Új PR-ok", "+100"],
            ["Heti cél", "+200"],
          ].map(([k, v], i) => (
            <div
              key={k}
              className={`flex items-center justify-between py-1.5 text-[10px] ${
                i > 0 ? "border-t border-white/5" : ""
              }`}
            >
              <span className="text-white/90">{k}</span>
              <span className="font-extrabold">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
