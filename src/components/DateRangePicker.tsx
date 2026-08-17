"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Spinner } from "./Spinner";

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDay(d);
}
function startOfMonth(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  return isoDay(d);
}
function endOfMonth(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset + 1, 0);
  return isoDay(d);
}

export function DateRangePicker({
  from,
  to,
  basePath,
}: {
  from: string;
  to: string;
  basePath: string;
}) {
  const router = useRouter();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const [pending, startTransition] = useTransition();

  const go = (nf: string, nt: string) => {
    setF(nf);
    setT(nt);
    startTransition(() => router.push(`${basePath}?from=${nf}&to=${nt}`));
  };

  const presets: { label: string; from: string; to: string }[] = [
    { label: "7 днів", from: daysAgo(6), to: isoDay(new Date()) },
    { label: "30 днів", from: daysAgo(29), to: isoDay(new Date()) },
    { label: "Цей місяць", from: startOfMonth(0), to: isoDay(new Date()) },
    { label: "Мин. місяць", from: startOfMonth(-1), to: endOfMonth(-1) },
    { label: "90 днів", from: daysAgo(89), to: isoDay(new Date()) },
  ];

  const inputCls =
    "rounded-lg border border-[#33333a] bg-[#0f0f11] px-2 py-1.5 text-sm text-neutral-100 [color-scheme:dark]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input type="date" value={f} max={t} onChange={(e) => setF(e.target.value)} className={inputCls} />
      <span className="text-slate-500">—</span>
      <input type="date" value={t} min={f} onChange={(e) => setT(e.target.value)} className={inputCls} />
      <button
        onClick={() => go(f, t)}
        disabled={pending}
        className="flex items-center gap-2 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-70"
      >
        {pending && <Spinner />}
        {pending ? "Оновлення…" : "Показати"}
      </button>
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => {
          const active = p.from === f && p.to === t;
          return (
            <button
              key={p.label}
              onClick={() => go(p.from, p.to)}
              className={`rounded-lg px-2.5 py-1.5 text-xs ${
                active
                  ? "bg-brand text-white"
                  : "bg-white/5 text-neutral-300 hover:bg-white/10"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
