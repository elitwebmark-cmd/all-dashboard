import { getFacts, getAvailableRange, usingDatabase } from "@/db/queries";
import { sumFacts, groupBy, ctr, cpc, engagementRate } from "@/lib/facts";
import { uah, usd, int, dec, pct, shortDate } from "@/lib/format";
import { KpiCard } from "@/components/KpiCard";
import { TrendChart, type TrendPoint } from "@/components/TrendChart";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const range = await getAvailableRange();
  const facts = await getFacts(range);

  const google = facts.filter((f) => f.channelSlug === "google_ads");
  const ga4 = facts.filter((f) => f.channelSlug === "ga4");
  const meta = facts.filter((f) => f.channelSlug === "meta");

  const g = sumFacts(google);
  const a = sumFacts(ga4);
  const m = sumFacts(meta);

  // Тренд по днях
  const dates = [...new Set(facts.map((f) => f.date))].sort();
  const trend: TrendPoint[] = dates.map((d) => ({
    date: shortDate(d),
    spend: Math.round(google.filter((f) => f.date === d).reduce((s, f) => s + f.spend, 0)),
    sessions: ga4.filter((f) => f.date === d).reduce((s, f) => s + f.sessions, 0),
  }));

  const campaigns = groupBy(google, (f) => f.segment).sort((x, y) => y.totals.spend - x.totals.spend);
  const metaCampaigns = groupBy(meta, (f) => f.segment).sort((x, y) => y.totals.spend - x.totals.spend);
  const channelGroups = groupBy(ga4, (f) => f.segment).sort(
    (x, y) => y.totals.sessions - x.totals.sessions,
  );

  return (
    <div className="space-y-6">
      <AutoRefresh />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Комплексний огляд</h1>
          <p className="text-sm text-slate-400">
            Період: {range.from} — {range.to}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs ${
            usingDatabase ? "bg-emerald-900/50 text-emerald-300" : "bg-amber-900/40 text-amber-300"
          }`}
        >
          {usingDatabase ? "Джерело: база даних" : "Демо-дані (реальні цифри Elit-Web із Windsor)"}
        </span>
      </div>

      {/* Google Ads KPIs */}
      <section>
        <h2 className="mb-2 text-sm font-medium text-channel-google_ads">Google Ads</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Витрати" value={uah(g.spend)} accent="#4285F4" />
          <KpiCard label="Кліки" value={int(g.clicks)} />
          <KpiCard label="Покази" value={int(g.impressions)} />
          <KpiCard label="CTR" value={pct(ctr(g))} />
          <KpiCard label="Сер. CPC" value={uah(cpc(g))} />
          <KpiCard label="Конверсії" value={dec(g.conversions, 1)} />
        </div>
      </section>

      {/* GA4 KPIs */}
      <section>
        <h2 className="mb-2 text-sm font-medium text-channel-ga4">Трафік і поведінка (GA4)</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Сесії" value={int(a.sessions)} accent="#E8710A" />
          <KpiCard label="Користувачі" value={int(a.users)} />
          <KpiCard label="Залучені сесії" value={int(a.engagedSessions)} />
          <KpiCard label="Engagement rate" value={pct(engagementRate(a))} />
          <KpiCard label="Key events (конверсії)" value={int(a.conversions)} />
        </div>
      </section>

      {/* Meta Ads KPIs */}
      <section>
        <h2 className="mb-2 text-sm font-medium text-channel-meta">Meta Ads (Facebook / Instagram)</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Витрати" value={usd(m.spend)} sub="акаунт у USD" accent="#0866FF" />
          <KpiCard label="Охоплення" value={int(m.reach)} />
          <KpiCard label="Покази" value={int(m.impressions)} />
          <KpiCard label="Кліки" value={int(m.clicks)} />
          <KpiCard label="CTR" value={pct(ctr(m))} />
          <KpiCard label="Ліди" value={int(m.leads)} />
        </div>
      </section>

      <TrendChart data={trend} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* GA4 by channel group */}
        <div className="card overflow-x-auto">
          <div className="mb-3 text-sm font-medium text-slate-300">Трафік за каналами (GA4)</div>
          <table className="data">
            <thead>
              <tr>
                <th>Канал</th>
                <th className="text-right">Сесії</th>
                <th className="text-right">Користувачі</th>
                <th className="text-right">Key events</th>
                <th className="text-right">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {channelGroups.map((c) => (
                <tr key={c.key}>
                  <td>{c.key}</td>
                  <td className="text-right">{int(c.totals.sessions)}</td>
                  <td className="text-right">{int(c.totals.users)}</td>
                  <td className="text-right">{int(c.totals.conversions)}</td>
                  <td className="text-right">{pct(engagementRate(c.totals))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Google Ads by campaign */}
        <div className="card overflow-x-auto">
          <div className="mb-3 text-sm font-medium text-slate-300">Кампанії Google Ads</div>
          <table className="data">
            <thead>
              <tr>
                <th>Кампанія</th>
                <th className="text-right">Витрати</th>
                <th className="text-right">Кліки</th>
                <th className="text-right">CTR</th>
                <th className="text-right">CPC</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.key}>
                  <td className="max-w-[220px] truncate" title={c.key}>
                    {c.key}
                  </td>
                  <td className="text-right">{uah(c.totals.spend)}</td>
                  <td className="text-right">{int(c.totals.clicks)}</td>
                  <td className="text-right">{pct(ctr(c.totals))}</td>
                  <td className="text-right">{uah(cpc(c.totals))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meta Ads campaigns */}
      {metaCampaigns.length > 0 && (
        <div className="card overflow-x-auto">
          <div className="mb-3 text-sm font-medium text-slate-300">Кампанії Meta Ads (USD)</div>
          <table className="data">
            <thead>
              <tr>
                <th>Кампанія</th>
                <th className="text-right">Витрати</th>
                <th className="text-right">Охоплення</th>
                <th className="text-right">Покази</th>
                <th className="text-right">Кліки</th>
                <th className="text-right">CTR</th>
                <th className="text-right">Ліди</th>
              </tr>
            </thead>
            <tbody>
              {metaCampaigns.map((c) => (
                <tr key={c.key}>
                  <td className="max-w-[260px] truncate" title={c.key}>{c.key}</td>
                  <td className="text-right">{usd(c.totals.spend)}</td>
                  <td className="text-right">{int(c.totals.reach)}</td>
                  <td className="text-right">{int(c.totals.impressions)}</td>
                  <td className="text-right">{int(c.totals.clicks)}</td>
                  <td className="text-right">{pct(ctr(c.totals))}</td>
                  <td className="text-right">{int(c.totals.leads)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
