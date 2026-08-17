"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Spinner } from "./Spinner";

interface P {
  from: string;
  to: string;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDay(d);
}

const MAX = 5;

export function PeriodCompare({ initial }: { initial: P[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [periods, setPeriods] = useState<P[]>(
    initial.length ? initial : [
      { from: daysAgo(6), to: isoDay(new Date()) },
      { from: daysAgo(13), to: daysAgo(7) },
    ],
  );

  const update = (i: number, patch: Partial<P>) =>
    setPeriods((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const remove = (i: number) => setPeriods((ps) => ps.filter((_, idx) => idx !== i));
  const add = () => {
    if (periods.length >= MAX) return;
    setPeriods((ps) => [...ps, { from: daysAgo(6), to: isoDay(new Date()) }]);
  };

  const compare = () => {
    const q = periods
      .filter((p) => p.from && p.to)
      .map((p) => `p=${p.from}..${p.to}`)
      .join("&");
    startTransition(() => router.push(`/compare?${q}`));
  };

  const inputCls =
    "rounded-lg border border-[#33333a] bg-[#0f0f11] px-2 py-1.5 text-sm text-neutral-100 [color-scheme:dark]";

  return (
    <div className="card space-y-3">
      <div className="text-sm font-medium text-slate-300">Періоди для порівняння (до {MAX})</div>
      <div className="space-y-2">
        {periods.map((p, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <span className="w-16 text-xs text-slate-400">Період {i + 1}</span>
            <input
              type="date"
              value={p.from}
              max={p.to}
              onChange={(e) => update(i, { from: e.target.value })}
              className={inputCls}
            />
            <span className="text-slate-500">—</span>
            <input
              type="date"
              value={p.to}
              min={p.from}
              onChange={(e) => update(i, { to: e.target.value })}
              className={inputCls}
            />
            {periods.length > 1 && (
              <button
                onClick={() => remove(i)}
                className="rounded-lg px-2 py-1.5 text-xs text-red-300 hover:bg-red-900/30"
              >
                ✕ Прибрати
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={add}
          disabled={periods.length >= MAX}
          className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-neutral-200 hover:bg-white/10 disabled:opacity-40"
        >
          + Додати період
        </button>
        <button
          onClick={compare}
          disabled={pending}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-70"
        >
          {pending && <Spinner />}
          {pending ? "Рахую…" : "Порівняти"}
        </button>
      </div>
    </div>
  );
}
