import { windsorGetData } from "./windsor";

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
 * Тягне ліди (контакти) і SQL (угоди) з HubSpot і зводить у денні рядки по каналах.
 * HubSpot не фільтрує по даті — тягнемо все й розкладаємо по днях створення.
 */
export async function fetchLeadsLive(): Promise<LeadRow[]> {
  const rows = new Map<string, LeadRow>();
  const ensure = (date: string, channel: LeadChannel): LeadRow => {
    const k = key(date, channel);
    if (!rows.has(k))
      rows.set(k, { date, channel, leads: 0, sqlTotal: 0, sqlCold: 0, sqlWarm: 0, sqlHot: 0 });
    return rows.get(k)!;
  };

  // Ліди = контакти за датою створення
  const contacts = await windsorGetData({
    connector: "hubspot",
    fields: ["contact_createdate", "contact_hs_analytics_source"],
  });
  for (const c of contacts) {
    const raw = c.contact_createdate;
    if (!raw) continue;
    const date = String(raw).slice(0, 10);
    ensure(date, sourceToChannel(c.contact_hs_analytics_source)).leads += 1;
  }

  // SQL = угоди з полем New SQL ∈ {Cold/Warm/Hot SQL}
  const deals = await windsorGetData({
    connector: "hubspot",
    fields: ["deal_createdate", "deal_customobject_new_sql", "deal_hs_analytics_source"],
  });
  for (const d of deals) {
    const raw = d.deal_createdate;
    const sql = String(d.deal_customobject_new_sql || "").trim().toLowerCase();
    if (!raw || !SQL_VALUES.has(sql)) continue;
    const date = String(raw).slice(0, 10);
    const row = ensure(date, sourceToChannel(d.deal_hs_analytics_source));
    row.sqlTotal += 1;
    if (sql === "cold sql") row.sqlCold += 1;
    else if (sql === "warm sql") row.sqlWarm += 1;
    else if (sql === "hot sql") row.sqlHot += 1;
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
