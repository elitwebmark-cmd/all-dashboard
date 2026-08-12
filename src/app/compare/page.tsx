import { Fragment } from "react";
import { getFacts } from "@/db/queries";
import { sumFacts, ctr, engagementRate, type FactTotals } from "@/lib/facts";
import { parsePeriods, rangeLabel, type DateRange } from "@/lib/range";
import { uah, usd, int, dec, pct } from "@/lib/format";
import { PeriodCompare } from "@/components/PeriodCompare";
import { CompareBars } from "@/components/CompareBars";

export const dynamic = "force-dynamic";

interface Col {
  range: DateRange;
  g: FactTotals;
  m: FactTotals;
  a: FactTotals;
}

const deltaPct = (cur: number, base: number): string => {
  if (base === 0) return cur === 0 ? "—" : "▲ нове";
  const d = ((cur - base) / base) * 100;
  const sign = d > 0 ? "▲" : d < 0 ? "▼" : "";
  return `${sign} ${dec(Math.abs(d), 1)}%`;
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: { p?: string | string[] };
}) {
  const periods = parsePeriods(searchParams.p);

  const cols: Col[] = await Promise.all(
    periods.map(async (range) => {
      const facts = await getFacts(range, { allowLive: true });
      return {
        range,
        g: sumFacts(facts.filter((f) => f.channelSlug === "google_ads")),
        m: sumFacts(facts.filter((f) => f.channelSlug === "meta")),
        a: sumFacts(facts.filter((f) => f.channelSlug === "ga4")),
      };
    }),
  );

  const rows: { group: string; label: string; fmt: (n: number) => string; get: (c: Col) => number }[] = [
    { group: "Google Ads", label: "Витрати", fmt: uah, get: (c) => c.g.spend },
    { group: "Google Ads", label: "Кліки", fmt: int, get: (c) => c.g.clicks },
    { group: "Google Ads", label: "Покази", fmt: int, get: (c) => c.g.impressions },
    { group: "Google Ads", label: "CTR", fmt: pct, get: (c) => ctr(c.g) },
    { group: "Google Ads", label: "Конверсії", fmt: (n) => dec(n, 1), get: (c) => c.g.conversions },
    { group: "Meta Ads", label: "Витрати (USD)", fmt: usd, get: (c) => c.m.spend },
    { group: "Meta Ads", label: "Охоплення", fmt: int, get: (c) => c.m.reach },
    { group: "Meta Ads", label: "Кліки", fmt: int, get: (c) => c.m.clicks },
    { group: "Meta Ads", label: "Ліди", fmt: int, get: (c) => c.m.leads },
    { group: "GA4", label: "Сесії", fmt: int, get: (c) => c.a.sessions },
    { group: "GA4", label: "Користувачі", fmt: int, get: (c) => c.a.users },
    { group: "GA4", label: "Key events", fmt: int, get: (c) => c.a.conversions },
    { group: "GA4", label: "Engagement", fmt: pct, get: (c) => engagementRate(c.a) },
  ];

  const labels = cols.map((c, i) => `П${i + 1}: ${rangeLabel(c.range)}`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Порівняння періодів</h1>
        <p className="text-sm text-slate-400">
          Обери до 5 довільних дат або діапазонів і порівняй показники по всіх каналах.
        </p>
      </div>

      <PeriodCompare initial={periods} />

      {cols.length === 0 ? (
        <div className="card text-sm text-slate-400">
          Додай періоди вище та натисни «Порівняти».
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <CompareBars
              title="Сесії (GA4)"
              color="#E8710A"
              data={cols.map((c, i) => ({ label: `П${i + 1}`, value: c.a.sessions }))}
            />
            <CompareBars
              title="Витрати Google Ads (грн)"
              color="#4285F4"
              data={cols.map((c, i) => ({ label: `П${i + 1}`, value: Math.round(c.g.spend) }))}
            />
            <CompareBars
              title="Витрати Meta (USD)"
              color="#0866FF"
              data={cols.map((c, i) => ({ label: `П${i + 1}`, value: Math.round(c.m.spend) }))}
            />
          </div>

          <div className="card overflow-x-auto">
            <div className="mb-1 text-sm font-medium text-slate-300">Таблиця порівняння</div>
            <div className="mb-3 text-xs text-slate-500">
              Відхилення (▲/▼) рахується відносно Періоду 1.
            </div>
            <table className="data">
              <thead>
                <tr>
                  <th>Показник</th>
                  {labels.map((l) => (
                    <th key={l} className="text-right">{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => {
                  const prevGroup = ri > 0 ? rows[ri - 1].group : null;
                  const showGroup = row.group !== prevGroup;
                  const base = row.get(cols[0]);
                  return (
                    <Fragment key={`${row.group}-${row.label}`}>
                      {showGroup && (
                        <tr>
                          <td colSpan={labels.length + 1} className="bg-slate-800/40 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {row.group}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className="text-slate-300">{row.label}</td>
                        {cols.map((c, ci) => {
                          const v = row.get(c);
                          return (
                            <td key={ci} className="text-right">
                              <div>{row.fmt(v)}</div>
                              {ci > 0 && (
                                <div className="text-[11px] text-slate-500">{deltaPct(v, base)}</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
