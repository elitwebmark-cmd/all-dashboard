import { notFound } from "next/navigation";
import { getFacts, getAvailableRange } from "@/db/queries";
import { sumFacts, groupBy, ctr, cpc, engagementRate, weightedPosition } from "@/lib/facts";
import { uah, usd, int, dec, pct } from "@/lib/format";
import { KpiCard } from "@/components/KpiCard";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DateRangePicker } from "@/components/DateRangePicker";
import { parseRange } from "@/lib/range";
import { CONNECTORS, type ChannelSlug } from "@/lib/connectors";

export const dynamic = "force-dynamic";

const SUPPORTED: ChannelSlug[] = ["google_ads", "meta", "ga4", "search_console", "hubspot"];

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { from?: string; to?: string };
}) {
  const slug = params.slug as ChannelSlug;
  if (!SUPPORTED.includes(slug)) notFound();

  const cfg = CONNECTORS[slug];
  const range = parseRange(searchParams) ?? (await getAvailableRange());
  const facts = (await getFacts(range)).filter((f) => f.channelSlug === slug);
  const t = sumFacts(facts);

  const isGoogle = slug === "google_ads";
  const isMeta = slug === "meta";
  const isGa4 = slug === "ga4";
  const isSC = slug === "search_console";
  const isHubspot = slug === "hubspot";

  // Для реклами/GA4 — розбивка за сегментом; для SEO/CRM — по днях
  const rows = isSC || isHubspot ? groupBy(facts, (f) => f.date) : groupBy(facts, (f) => f.segment);

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <div>
        <h1 className="text-2xl font-semibold">{cfg.title}</h1>
        <p className="text-sm text-slate-400">
          Період: {range.from} — {range.to} · акаунт {cfg.accountId}
        </p>
      </div>

      <DateRangePicker from={range.from} to={range.to} basePath={`/channels/${slug}`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {isGoogle && (
          <>
            <KpiCard label="Витрати" value={uah(t.spend)} accent="#4285F4" />
            <KpiCard label="Кліки" value={int(t.clicks)} />
            <KpiCard label="Покази" value={int(t.impressions)} />
            <KpiCard label="CTR" value={pct(ctr(t))} />
            <KpiCard label="CPC" value={uah(cpc(t))} />
            <KpiCard label="Конверсії" value={dec(t.conversions, 1)} />
          </>
        )}
        {isMeta && (
          <>
            <KpiCard label="Витрати" value={usd(t.spend)} sub="акаунт у USD" accent="#0866FF" />
            <KpiCard label="Охоплення" value={int(t.reach)} />
            <KpiCard label="Покази" value={int(t.impressions)} />
            <KpiCard label="Кліки" value={int(t.clicks)} />
            <KpiCard label="CTR" value={pct(ctr(t))} />
            <KpiCard label="Ліди" value={int(t.leads)} />
          </>
        )}
        {isGa4 && (
          <>
            <KpiCard label="Сесії" value={int(t.sessions)} accent="#E8710A" />
            <KpiCard label="Користувачі" value={int(t.users)} />
            <KpiCard label="Залучені сесії" value={int(t.engagedSessions)} />
            <KpiCard label="Engagement" value={pct(engagementRate(t))} />
            <KpiCard label="Key events" value={int(t.conversions)} />
          </>
        )}
        {isSC && (
          <>
            <KpiCard label="Кліки" value={int(t.clicks)} accent="#34A853" />
            <KpiCard label="Покази" value={int(t.impressions)} />
            <KpiCard label="CTR" value={pct(ctr(t))} />
            <KpiCard label="Сер. позиція" value={dec(weightedPosition(facts), 1)} sub="менше = краще" />
          </>
        )}
        {isHubspot && (
          <>
            <KpiCard label="Нові ліди" value={int(t.leads)} accent="#FF7A59" />
            <KpiCard
              label="Сер. лідів/день"
              value={dec(rows.length ? t.leads / rows.length : 0, 1)}
            />
          </>
        )}
      </div>

      <div className="card overflow-x-auto">
        <div className="mb-3 text-sm font-medium text-slate-300">
          {isGoogle || isMeta
            ? "Розбивка за кампаніями"
            : isGa4
              ? "Розбивка за каналами трафіку"
              : "Динаміка по днях"}
        </div>
        <table className="data">
          <thead>
            {isGoogle && (
              <tr>
                <th>Кампанія</th>
                <th className="text-right">Витрати</th>
                <th className="text-right">Покази</th>
                <th className="text-right">Кліки</th>
                <th className="text-right">CTR</th>
                <th className="text-right">CPC</th>
                <th className="text-right">Конв.</th>
              </tr>
            )}
            {isMeta && (
              <tr>
                <th>Кампанія</th>
                <th className="text-right">Витрати</th>
                <th className="text-right">Охоплення</th>
                <th className="text-right">Покази</th>
                <th className="text-right">Кліки</th>
                <th className="text-right">CTR</th>
                <th className="text-right">Ліди</th>
              </tr>
            )}
            {isGa4 && (
              <tr>
                <th>Канал</th>
                <th className="text-right">Сесії</th>
                <th className="text-right">Користувачі</th>
                <th className="text-right">Залучені</th>
                <th className="text-right">Engagement</th>
                <th className="text-right">Key events</th>
              </tr>
            )}
            {isSC && (
              <tr>
                <th>Дата</th>
                <th className="text-right">Кліки</th>
                <th className="text-right">Покази</th>
                <th className="text-right">CTR</th>
                <th className="text-right">Сер. позиція</th>
              </tr>
            )}
            {isHubspot && (
              <tr>
                <th>Дата</th>
                <th className="text-right">Нові ліди</th>
              </tr>
            )}
          </thead>
          <tbody>
            {rows.map((c) => {
              if (isGoogle)
                return (
                  <tr key={c.key}>
                    <td className="max-w-[260px] truncate" title={c.key}>{c.key}</td>
                    <td className="text-right">{uah(c.totals.spend)}</td>
                    <td className="text-right">{int(c.totals.impressions)}</td>
                    <td className="text-right">{int(c.totals.clicks)}</td>
                    <td className="text-right">{pct(ctr(c.totals))}</td>
                    <td className="text-right">{uah(cpc(c.totals))}</td>
                    <td className="text-right">{dec(c.totals.conversions, 1)}</td>
                  </tr>
                );
              if (isMeta)
                return (
                  <tr key={c.key}>
                    <td className="max-w-[260px] truncate" title={c.key}>{c.key}</td>
                    <td className="text-right">{usd(c.totals.spend)}</td>
                    <td className="text-right">{int(c.totals.reach)}</td>
                    <td className="text-right">{int(c.totals.impressions)}</td>
                    <td className="text-right">{int(c.totals.clicks)}</td>
                    <td className="text-right">{pct(ctr(c.totals))}</td>
                    <td className="text-right">{int(c.totals.leads)}</td>
                  </tr>
                );
              if (isGa4)
                return (
                  <tr key={c.key}>
                    <td>{c.key}</td>
                    <td className="text-right">{int(c.totals.sessions)}</td>
                    <td className="text-right">{int(c.totals.users)}</td>
                    <td className="text-right">{int(c.totals.engagedSessions)}</td>
                    <td className="text-right">{pct(engagementRate(c.totals))}</td>
                    <td className="text-right">{int(c.totals.conversions)}</td>
                  </tr>
                );
              if (isSC)
                return (
                  <tr key={c.key}>
                    <td>{c.key}</td>
                    <td className="text-right">{int(c.totals.clicks)}</td>
                    <td className="text-right">{int(c.totals.impressions)}</td>
                    <td className="text-right">{pct(ctr(c.totals))}</td>
                    <td className="text-right">{dec(weightedPosition(c.facts), 1)}</td>
                  </tr>
                );
              return (
                <tr key={c.key}>
                  <td>{c.key}</td>
                  <td className="text-right">{int(c.totals.leads)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
