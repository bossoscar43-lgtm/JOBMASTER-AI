"use client";

import { cn } from "@/lib/utils";

export function BarChart({ data, height = 170 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.length === 0 && <p className="m-auto text-xs jm-muted">Aucune donnée</p>}
      {data.map((d, i) => (
        <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[10px] font-semibold opacity-70 group-hover:opacity-100">{d.value}</span>
          <div className="w-full max-w-[38px] rounded-t-md bg-gradient-to-t from-indigo-600 to-violet-400 transition-all duration-500 group-hover:brightness-110"
            style={{ height: `${Math.max(4, (d.value / max) * (height - 42))}px` }} />
          <span className="truncate text-[10px] jm-muted" title={d.label}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function LineChart({ values, height = 180, labels }: { values: number[]; height?: number; labels?: string[] }) {
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const w = 600;
  const h = height;
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * w;
    const y = h - 16 - ((v - min) / (max - min || 1)) * (h - 36);
    return `${x},${y}`;
  }).join(" ");
  const area = pts ? `M ${pts.split(" ").map((p) => p.replace(",", " ")).join(" L ")} L ${w},${h} L 0,${h} Z` : "";
  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity=".38" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((p) => <line key={p} x1="0" x2={w} y1={h * p} y2={h * p} stroke="currentColor" strokeOpacity=".08" />)}
        {area && <path d={area} fill="url(#lineFill)" />}
        {pts && <polyline points={pts} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {values.map((v, i) => {
          const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * w;
          const y = h - 16 - ((v - min) / (max - min || 1)) * (h - 36);
          return <circle key={i} cx={x} cy={y} r="3.5" fill="#7c3aed" stroke="white" strokeWidth="1.5" />;
        })}
      </svg>
      {labels && <div className="mt-1 flex justify-between text-[10px] jm-muted">{labels.map((l, i) => <span key={i}>{l}</span>)}</div>}
    </div>
  );
}

export function Donut({ segments, size = 140 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0));
  let offset = 0;
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeOpacity=".08" strokeWidth="12" />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const el = <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="12"
            strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} strokeLinecap="round" />;
          offset += len;
          return el;
        })}
      </svg>
      <div className="space-y-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            <span className="jm-muted">{s.label}</span>
            <span className="font-semibold">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f43f5e";
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeOpacity=".1" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${(Math.max(0, Math.min(100, score)) / 100) * c} ${c}`} />
      </svg>
      <span className={cn("absolute inset-0 grid place-items-center text-sm font-extrabold")}>{score}</span>
    </div>
  );
}
