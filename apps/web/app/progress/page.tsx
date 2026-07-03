"use client";

import { useState } from "react";

const metrics = [
  { label: "PROGRESS", value: 1.4, max: 10 },
  { label: "CONSISTENCY", value: 5.4, max: 10 },
  { label: "INTENSITY", value: 8.6, max: 10 },
  { label: "VOLUME", value: 1.2, max: 10 },
];

const timeFilters = ["1H", "1M", "1Y", "All"];

const monthlyData = [
  { month: "M", sets: 180 },
  { month: "A", sets: 220 },
  { month: "M", sets: 195 },
  { month: "J", sets: 260 },
  { month: "J", sets: 310 },
  { month: "A", sets: 290 },
  { month: "S", sets: 340 },
  { month: "O", sets: 380 },
  { month: "N", sets: 420 },
  { month: "D", sets: 390 },
  { month: "J", sets: 460 },
];

const rmData = [130, 130, 132, 136, 136, 138, 139, 139, 141, 143, 145];

function RadialMetric({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = value / max;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#2c2c2e" strokeWidth="4" />
        <circle
          cx="36" cy="36" r={r}
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
        <text x="36" y="40" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">{value}</text>
      </svg>
      <span className="text-[10px] text-muted tracking-widest uppercase">{label}</span>
    </div>
  );
}

export default function ProgressPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("1RM");

  const maxSets = Math.max(...monthlyData.map((d) => d.sets));

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      {/* Tabs */}
      <div className="flex gap-6 mb-8 border-b border-outline pb-4">
        {["Global", "Exercises"].map((tab) => (
          <button
            key={tab}
            className={`text-lg font-bold transition-colors ${tab === "Global" ? "text-white" : "text-muted hover:text-white"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Radial metrics */}
      <div className="flex justify-between mb-8">
        {metrics.map((m) => (
          <RadialMetric key={m.label} label={m.label} value={m.value} max={m.max} />
        ))}
      </div>

      {/* Time filters */}
      <div className="flex gap-2 mb-6">
        {timeFilters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              activeFilter === f ? "bg-white text-black" : "text-muted hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Bar chart */}
      <div className="mb-2">
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-5xl font-extrabold text-white tracking-tight">2,5K</span>
          <span className="text-muted text-lg">sets</span>
          <div className="ml-auto flex items-center gap-1 text-sm text-muted">
            Sets <span className="ml-1">▾</span>
          </div>
        </div>
        <div className="flex items-end gap-1.5 h-32">
          {monthlyData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-lg bg-surface-high hover:bg-surface-mid transition-colors"
                style={{ height: `${(d.sets / maxSets) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-1.5 mt-1">
          {monthlyData.map((d, i) => (
            <div key={i} className="flex-1 text-center text-[10px] text-muted">{d.month}</div>
          ))}
        </div>
      </div>

      {/* Exercise detail */}
      <div className="mt-8 bg-surface-low rounded-3xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white">Bench Press</h3>
              <span className="text-muted">›</span>
            </div>
            <p className="text-sm text-muted">Barbell</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-white">139 Kg</p>
            <p className="text-sm text-accent-green">↑ 8.56 %</p>
          </div>
        </div>

        {/* Metric tabs */}
        <div className="flex gap-4 mb-4 border-b border-outline pb-3">
          {["1RM", "Max Weight", "Volume", "Total Reps"].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`text-sm font-semibold pb-1 transition-colors ${
                activeTab === t ? "text-white border-b-2 border-white" : "text-muted hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Line chart */}
        <div className="relative h-28">
          <svg width="100%" height="100%" viewBox="0 0 440 112" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
              </linearGradient>
            </defs>
            {rmData.map((val, i) => {
              const minV = Math.min(...rmData);
              const maxV = Math.max(...rmData);
              const x = (i / (rmData.length - 1)) * 440;
              const y = 112 - ((val - minV) / (maxV - minV || 1)) * 90 - 10;
              return i === 0 ? null : (
                <line
                  key={i}
                  x1={(i - 1) / (rmData.length - 1) * 440}
                  y1={112 - ((rmData[i - 1] - minV) / (maxV - minV || 1)) * 90 - 10}
                  x2={x} y2={y}
                  stroke="white" strokeWidth="2.5" strokeLinecap="round"
                />
              );
            })}
            {rmData.map((val, i) => {
              const minV = Math.min(...rmData);
              const maxV = Math.max(...rmData);
              const x = (i / (rmData.length - 1)) * 440;
              const y = 112 - ((val - minV) / (maxV - minV || 1)) * 90 - 10;
              return i === rmData.length - 1 ? (
                <circle key={i} cx={x} cy={y} r="4" fill="white" />
              ) : null;
            })}
          </svg>
          <div className="absolute right-0 top-0 flex flex-col justify-between h-full text-[10px] text-muted pr-1">
            {[145, 140, 135, 130, 125].map((v) => <span key={v}>{v}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
