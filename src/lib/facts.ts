import type { ChannelSlug } from "./connectors";

/** Уніфікований денний факт — спільна модель для всіх каналів. */
export interface UnifiedFact {
  channelSlug: ChannelSlug;
  date: string; // YYYY-MM-DD
  segment: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionsValue: number;
  sessions: number;
  users: number;
  engagedSessions: number;
  reach: number;
  leads: number;
  revenue: number;
  position: number; // Search Console: середня позиція (денна, зважуємо по показах)
}

const zeroFact = (
  channelSlug: ChannelSlug,
  date: string,
  segment: string,
): UnifiedFact => ({
  channelSlug,
  date,
  segment: segment || "(none)",
  spend: 0,
  impressions: 0,
  clicks: 0,
  conversions: 0,
  conversionsValue: 0,
  sessions: 0,
  users: 0,
  engagedSessions: 0,
  reach: 0,
  leads: 0,
  revenue: 0,
  position: 0,
});

const num = (v: unknown): number => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

/** Нормалізація сирих рядків Windsor у UnifiedFact по кожному каналу. */
export function normalize(channel: ChannelSlug, rows: any[]): UnifiedFact[] {
  switch (channel) {
    case "google_ads":
      return rows.map((r) => ({
        ...zeroFact("google_ads", r.date, r.campaign),
        spend: num(r.spend),
        impressions: num(r.impressions),
        clicks: num(r.clicks),
        conversions: num(r.conversions),
        conversionsValue: num(r.conversions_value),
      }));
    case "ga4":
      return rows.map((r) => ({
        ...zeroFact("ga4", r.date, r.default_channel_group),
        sessions: num(r.sessions),
        users: num(r.totalusers),
        engagedSessions: num(r.engaged_sessions),
        conversions: num(r.conversions),
      }));
    case "meta":
      return rows.map((r) => ({
        ...zeroFact("meta", r.date, r.campaign),
        spend: num(r.spend),
        impressions: num(r.impressions),
        clicks: num(r.clicks),
        reach: num(r.reach),
        leads: num(r.actions_lead),
        conversions: num(r.actions_lead),
      }));
    case "search_console":
      return rows.map((r) => ({
        ...zeroFact("search_console", r.date, "(all)"),
        clicks: num(r.clicks),
        impressions: num(r.impressions),
        position: num(r.position),
      }));
    case "hubspot": {
      // денна аналітика приходить розбита по джерелах — сумуємо контакти в денний підсумок
      const byDate = new Map<string, number>();
      for (const r of rows) {
        const d = r.analytics_date ?? r.date;
        if (!d) continue;
        byDate.set(d, (byDate.get(d) ?? 0) + num(r.analytics_contacts));
      }
      return [...byDate.entries()].map(([date, leads]) => ({
        ...zeroFact("hubspot", date, "(all)"),
        leads,
      }));
    }
    default:
      return rows.map((r) => zeroFact(channel, r.date, String(r[Object.keys(r)[1]] ?? "")));
  }
}

/** Сума набору фактів у один агрегат. */
export function sumFacts(facts: UnifiedFact[]) {
  return facts.reduce(
    (a, f) => ({
      spend: a.spend + f.spend,
      impressions: a.impressions + f.impressions,
      clicks: a.clicks + f.clicks,
      conversions: a.conversions + f.conversions,
      conversionsValue: a.conversionsValue + f.conversionsValue,
      sessions: a.sessions + f.sessions,
      users: a.users + f.users,
      engagedSessions: a.engagedSessions + f.engagedSessions,
      reach: a.reach + f.reach,
      leads: a.leads + f.leads,
      revenue: a.revenue + f.revenue,
      position: a.position + f.position, // сирою сумою не користуємось — див. weightedPosition
    }),
    {
      spend: 0, impressions: 0, clicks: 0, conversions: 0, conversionsValue: 0,
      sessions: 0, users: 0, engagedSessions: 0, reach: 0, leads: 0, revenue: 0, position: 0,
    },
  );
}

export type FactTotals = ReturnType<typeof sumFacts>;

/** Групування по ключу з підсумками. */
export function groupBy(
  facts: UnifiedFact[],
  key: (f: UnifiedFact) => string,
): { key: string; totals: FactTotals; facts: UnifiedFact[] }[] {
  const map = new Map<string, UnifiedFact[]>();
  for (const f of facts) {
    const k = key(f);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(f);
  }
  return [...map.entries()]
    .map(([k, fs]) => ({ key: k, totals: sumFacts(fs), facts: fs }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

// Похідні KPI
export const ctr = (t: FactTotals) => (t.impressions ? (t.clicks / t.impressions) * 100 : 0);
export const cpc = (t: FactTotals) => (t.clicks ? t.spend / t.clicks : 0);
export const cpl = (t: FactTotals) => (t.conversions ? t.spend / t.conversions : 0);
export const engagementRate = (t: FactTotals) =>
  t.sessions ? (t.engagedSessions / t.sessions) * 100 : 0;

/** Середня позиція Search Console, зважена по показах. */
export const weightedPosition = (facts: UnifiedFact[]) => {
  const impr = facts.reduce((s, f) => s + f.impressions, 0);
  if (!impr) return 0;
  return facts.reduce((s, f) => s + f.position * f.impressions, 0) / impr;
};
