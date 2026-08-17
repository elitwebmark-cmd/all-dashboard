import { windsorGetData } from "./windsor";
import { fetchDealsForPipeline } from "./hubspot";

/** Канали лідів (внутрішня класифікація за джерелом HubSpot). */
export type LeadChannel = "seo" | "context" | "target" | "cold";

export const LEAD_CHANNELS: { key: LeadChannel; title: string }[] = [
  { key: "seo", title: "SEO" },
  { key: "context", title: "Контекст (Google Ads)" },
  { key: "target", title: "Таргет (Meta)" },
  { key: "cold", title: "Холодні активності / реактивація" },
];

// --- Конфіг (редагується) ---
/** Місячні плани по лідах на канал. */
export const PLANS_MONTHLY: Record<LeadChannel, number> = {
  seo: 70,
  context: 80,
  target: 80,
  cold: 40,
};

/** Курс USD→UAH для зведення витрат Meta у гривні. */
export const USD_TO_UAH = 41;

/** Воронка HubSpot, по якій рахуємо ліди (Elit-Web UA). */
export const LEADS_PIPELINE_ID = "1377358017";

/** Значення поля HubSpot deal «New SQL», які вважаємо SQL. */
const SQL_VALUES = new Set(["cold sql", "warm sql", "hot sql"]);

/** Мапінг HubSpot Original Source → канал ліда. */
export function sourceToChannel(src?: string | null): LeadChannel {
  switch ((src || "").toUpperCase()) {
    case "ORGANIC_SEARCH":
      return "seo";
    case "PAID_SEARCH":
      return "context";
    case "PAID_SOCIAL":
    case "SOCIAL_MEDIA":
      return "target";
    default:
      // OFFLINE, EMAIL_MARKETING, DIRECT_TRAFFIC, REFERRALS, OTHER_CAMPAIGNS, ...
      return "cold";
  }
}

/** Денний рядок лідів по каналу. */
export interface LeadRow {
  date: string; // YYYY-MM-DD
  channel: LeadChannel;
  leads: number;
  sqlTotal: number;
  sqlCold: number;
  sqlWarm: number;
  sqlHot: number;
}

const key = (date: string, channel: LeadChannel) => `${date}|${channel}`;

/**
 * Ліди = угоди у воронці Elit-Web UA (за датою створення, канал — з Original Source).
 * SQL = ті ж угоди з полем New SQL ∈ {Cold/Warm/Hot SQL}.
 * HubSpot не фільтрує угоди по даті — тягнемо всі й розкладаємо по днях створення.
 */
export async function fetchLeadsLive(): Promise<LeadRow[]> {
  const rows = new Map<string, LeadRow>();
  const ensure = (date: string, channel: LeadChannel): LeadRow => {
    const k = key(date, channel);
    if (!rows.has(k))
      rows.set(k, { date, channel, leads: 0, sqlTotal: 0, sqlCold: 0, sqlWarm: 0, sqlHot: 0 });
    return rows.get(k)!;
  };

  // Джерело угод: прямий HubSpot (реальний час) якщо є токен, інакше Windsor (із затримкою)
  let deals: { createdate: string; source: string; newSql: string }[];
  if (process.env.HUBSPOT_TOKEN) {
    deals = await fetchDealsForPipeline(LEADS_PIPELINE_ID);
  } else {
    const raw = await windsorGetData({
      connector: "hubspot",
      fields: ["deal_createdate", "deal_pipeline", "deal_customobject_new_sql", "deal_hs_analytics_source"],
    });
    deals = raw
      .filter((d) => String(d.deal_pipeline) === LEADS_PIPELINE_ID)
      .map((d) => ({
        createdate: String(d.deal_createdate || ""),
        source: d.deal_hs_analytics_source,
        newSql: d.deal_customobject_new_sql,
      }));
  }

  for (const d of deals) {
    if (!d.createdate) continue;
    const date = d.createdate.slice(0, 10);
    const row = ensure(date, sourceToChannel(d.source));
    row.leads += 1;
    const sql = String(d.newSql || "").trim().toLowerCase();
    if (SQL_VALUES.has(sql)) {
      row.sqlTotal += 1;
      if (sql === "cold sql") row.sqlCold += 1;
      else if (sql === "warm sql") row.sqlWarm += 1;
      else if (sql === "hot sql") row.sqlHot += 1;
    }
  }

  return [...rows.values()];
}

// --- Агрегації ---
export interface ChannelLeadTotals {
  leads: number;
  sqlTotal: number;
  sqlCold: number;
  sqlWarm: number;
  sqlHot: number;
}

const zero = (): ChannelLeadTotals => ({ leads: 0, sqlTotal: 0, sqlCold: 0, sqlWarm: 0, sqlHot: 0 });

export function sumLeads(rows: LeadRow[]): ChannelLeadTotals {
  return rows.reduce((a, r) => {
    a.leads += r.leads;
    a.sqlTotal += r.sqlTotal;
    a.sqlCold += r.sqlCold;
    a.sqlWarm += r.sqlWarm;
    a.sqlHot += r.sqlHot;
    return a;
  }, zero());
}

export function byChannel(rows: LeadRow[]): Record<LeadChannel, ChannelLeadTotals> {
  const out = {
    seo: zero(),
    context: zero(),
    target: zero(),
    cold: zero(),
  } as Record<LeadChannel, ChannelLeadTotals>;
  for (const r of rows) {
    const t = out[r.channel];
    t.leads += r.leads;
    t.sqlTotal += r.sqlTotal;
    t.sqlCold += r.sqlCold;
    t.sqlWarm += r.sqlWarm;
    t.sqlHot += r.sqlHot;
  }
  return out;
}
