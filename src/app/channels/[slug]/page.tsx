import { notFound } from "next/navigation";
import { getFacts, getAvailableRange } from "@/db/queries";
import { sumFacts, groupBy, ctr, cpc, engagementRate } from "@/lib/facts";
import { uah, usd, int, dec, pct } from "@/lib/format";
import { KpiCard } from "@/components/KpiCard";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CONNECTORS, type ChannelSlug } from "@/lib/connectors";

export const dynamic = "force-dynamic";

const SUPPORTED: ChannelSlug[] = ["google_ads", "meta", "ga4"];

export default async function ChannelPage({ params }: { params: { slug: string } }) {
  const slug = params.slug as ChannelSlug;
  if (!SUPPORTED.includes(slug)) notFound();

  const cfg = CONNECTORS[slug];
  const range = await getAvailableRange();
  const facts = (await getFacts(range)).filter((f) => f.channelSlug === slug);
  const t = sumFacts(facts);
  const bySegment = groupBy(facts, (f) => f.segment);

  const isGoogle = slug === "google_ads";
  const isMeta = slug === "meta";
  const isAds = isGoogle || isMeta;

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <div>
        <h1 className="text-2xl font-semibold">{cfg.title}</h1>
        <p className="text-sm text-slate-400">
          Період: {range.from} — {range.to} · акаунт {cfg.accountId}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {isGoogle ? (
          <>
            <KpiCard label="Витрати" value={uah(t.spend)} accent="#4285F4" />
            <KpiCard label="Кліки" value={int(t.clicks)} />
            <KpiCard label="Покази" value={int(t.impressions)} />
            <KpiCard label="CTR" value={pct(ctr(t))} />
            <KpiCard label="CPC" value={uah(cpc(t))} />
            <KpiCard label="Конверсії" value={dec(t.conversions, 1)} />
          </>
        ) : isMeta ? (
          <>
            <KpiCard label="Витрати" value={usd(t.spend)} sub="акаунт у USD" accent="#0866FF" />
            <KpiCard label="Охоплення" value={int(t.reach)} />
            <KpiCard label="Покази" value={int(t.impressions)} />
            <KpiCard label="Кліки" value={int(t.clicks)} />
            <KpiCard label="CTR" value={pct(ctr(t))} />
            <KpiCard label="Ліди" value={int(t.leads)} />
          </>
        ) : (
          <>
            <KpiCard label="Сесії" value={int(t.sessions)} accent="#E8710A" />
            <KpiCard label="Користувачі" value={int(t.users)} />
            <KpiCard label="Залучені сесії" value={int(t.engagedSessions)} />
            <KpiCard label="Engagement" value={pct(engagementRate(t))} />
            <KpiCard label="Key events" value={int(t.conversions)} />
          </>
        )}
      </div>

      <div className="card overflow-x-auto">
        <div className="mb-3 text-sm font-medium text-slate-300">
          {isAds ? "Розбивка за кампаніями" : "Розбивка за каналами трафіку"}
        </div>
        <table className="data">
          <thead>
            {isGoogle ? (
              <tr>
                <th>Кампанія</th>
                <th className="text-right">Витрати</th>
                <th className="text-right">Покази</th>
                <th className="text-right">Кліки</th>
                <th className="text-right">CTR</th>
                <th className="text-right">CPC</th>
                <th className="text-right">Конв.</th>
              </tr>
            ) : isMeta ? (
              <tr>
                <th>Кампанія</th>
                <th className="text-right">Витрати</th>
                <th className="text-right">Охоплення</th>
                <th className="text-right">Покази</th>
                <th className="text-right">Кліки</th>
                <th className="text-right">CTR</th>
                <th className="text-right">Ліди</th>
              </tr>
            ) : (
              <tr>
                <th>Канал</th>
                <th className="text-right">Сесії</th>
                <th className="text-right">Користувачі</th>
                <th className="text-right">Залучені</th>
                <th className="text-right">Engagement</th>
                <th className="text-right">Key events</th>
              </tr>
            )}
          </thead>
          <tbody>
            {bySegment.map((c) =>
              isGoogle ? (
                <tr key={c.key}>
                  <td className="max-w-[260px] truncate" title={c.key}>{c.key}</td>
                  <td className="text-right">{uah(c.totals.spend)}</td>
                  <td className="text-right">{int(c.totals.impressions)}</td>
                  <td className="text-right">{int(c.totals.clicks)}</td>
                  <td className="text-right">{pct(ctr(c.totals))}</td>
                  <td className="text-right">{uah(cpc(c.totals))}</td>
                  <td className="text-right">{dec(c.totals.conversions, 1)}</td>
                </tr>
              ) : isMeta ? (
                <tr key={c.key}>
                  <td className="max-w-[260px] truncate" title={c.key}>{c.key}</td>
                  <td className="text-right">{usd(c.totals.spend)}</td>
                  <td className="text-right">{int(c.totals.reach)}</td>
                  <td className="text-right">{int(c.totals.impressions)}</td>
                  <td className="text-right">{int(c.totals.clicks)}</td>
                  <td className="text-right">{pct(ctr(c.totals))}</td>
                  <td className="text-right">{int(c.totals.leads)}</td>
                </tr>
              ) : (
                <tr key={c.key}>
                  <td>{c.key}</td>
                  <td className="text-right">{int(c.totals.sessions)}</td>
                  <td className="text-right">{int(c.totals.users)}</td>
                  <td className="text-right">{int(c.totals.engagedSessions)}</td>
                  <td className="text-right">{pct(engagementRate(c.totals))}</td>
                  <td className="text-right">{int(c.totals.conversions)}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
