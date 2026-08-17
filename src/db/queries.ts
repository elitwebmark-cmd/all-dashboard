import { promises as fs } from "fs";
import path from "path";
import { and, gte, lte } from "drizzle-orm";
import { getDb, hasDatabase } from "./client";
import { factChannelDaily, factLeadsDaily } from "./schema";
import { normalize, type UnifiedFact } from "@/lib/facts";
import type { LeadRow, LeadChannel } from "@/lib/leads";
import { CONNECTORS, ACTIVE_CHANNELS, type ChannelSlug } from "@/lib/connectors";
import { windsorGetData } from "@/lib/windsor";
import { eachDate, type DateRange } from "@/lib/range";

export type { DateRange };

const factKey = (f: UnifiedFact) => `${f.channelSlug}|${f.date}|${f.segment}`;

/** Обʼєднати факти з бази та живі (живі мають пріоритет за однаковим ключем). */
function mergeFacts(dbFacts: UnifiedFact[], live: UnifiedFact[]): UnifiedFact[] {
  const m = new Map<string, UnifiedFact>();
  for (const f of dbFacts) m.set(factKey(f), f);
  for (const f of live) m.set(factKey(f), f);
  return [...m.values()];
}

let seedCache: {
  google_ads: any[];
  ga4: any[];
  meta: any[];
  search_console: any[];
  hubspot: any[];
} | null = null;

async function loadSeed() {
  if (seedCache) return seedCache;
  const p = path.join(process.cwd(), "data", "seed.json");
  const raw = await fs.readFile(p, "utf-8");
  const json = JSON.parse(raw);
  seedCache = {
    google_ads: json.google_ads ?? [],
    ga4: json.ga4 ?? [],
    meta: json.meta ?? [],
    search_console: json.search_console ?? [],
    hubspot: json.hubspot ?? [],
  };
  return seedCache;
}

/** Живе дотягування діапазону напряму з Windsor (коли в базі його ще нема). */
async function fetchLive(range: DateRange): Promise<UnifiedFact[]> {
  const perChannel = await Promise.all(
    ACTIVE_CHANNELS.map(async (ch) => {
      try {
        const cfg = CONNECTORS[ch];
        const rows = await windsorGetData({
          connector: cfg.windsorConnector,
          fields: cfg.fields,
          dateFrom: range.from,
          dateTo: range.to,
        });
        return normalize(ch, rows);
      } catch {
        return []; // помилка одного каналу не валить звіт
      }
    }),
  );
  return perChannel.flat();
}

/**
 * Усі уніфіковані факти в діапазоні.
 * Порядок: база → (якщо порожньо і є ключ) Windsor наживо → демо-сід.
 */
export async function getFacts(
  range?: DateRange,
  opts: { allowLive?: boolean } = {},
): Promise<UnifiedFact[]> {
  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(factChannelDaily)
      .where(
        range
          ? and(gte(factChannelDaily.date, range.from), lte(factChannelDaily.date, range.to))
          : undefined,
      );
    const dbFacts: UnifiedFact[] = rows.map((r) => ({
      channelSlug: r.channelSlug as ChannelSlug,
      date: r.date,
      segment: r.segment,
      spend: Number(r.spend ?? 0),
      impressions: Number(r.impressions ?? 0),
      clicks: Number(r.clicks ?? 0),
      conversions: Number(r.conversions ?? 0),
      conversionsValue: Number(r.conversionsValue ?? 0),
      sessions: Number(r.sessions ?? 0),
      users: Number(r.users ?? 0),
      engagedSessions: Number(r.engagedSessions ?? 0),
      reach: Number(r.reach ?? 0),
      position: Number(r.position ?? 0),
      leads: Number(r.leads ?? 0),
      revenue: Number(r.revenue ?? 0),
    }));

    // Якщо діапазон не повністю покритий базою — дотягуємо відсутнє наживо з Windsor
    if (range && opts.allowLive !== false && process.env.WINDSOR_API_KEY) {
      const covered = new Set(dbFacts.map((f) => f.date));
      const hasGap = eachDate(range.from, range.to).some((d) => !covered.has(d));
      if (hasGap) {
        const live = await fetchLive(range);
        if (live.length > 0) return mergeFacts(dbFacts, live);
      }
    }

    if (dbFacts.length > 0) return dbFacts;
    // База порожня і без live — демо-сід (щоб екран не був порожнім на старті)
    return loadSeedFacts(range);
  }

  // Немає бази (демо-режим)
  return loadSeedFacts(range);
}

/** Факти з демо-сіду (data/seed.json), опційно відфільтровані по діапазону. */
async function loadSeedFacts(range?: DateRange) {
  const seed = await loadSeed();
  let facts = [
    ...normalize("google_ads", seed.google_ads),
    ...normalize("ga4", seed.ga4),
    ...normalize("meta", seed.meta),
    ...normalize("search_console", seed.search_console),
    ...normalize("hubspot", seed.hubspot),
  ];
  if (range) facts = facts.filter((f) => f.date >= range.from && f.date <= range.to);
  return facts;
}

/** Доступний діапазон дат у даних. */
export async function getAvailableRange(): Promise<DateRange> {
  const facts = await getFacts();
  if (facts.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    return { from: today, to: today };
  }
  const dates = facts.map((f) => f.date).sort();
  return { from: dates[0], to: dates[dates.length - 1] };
}

export const usingDatabase = hasDatabase;

// --- Ліди (HubSpot) ---
let leadsSeedCache: any[] | null = null;
async function loadLeadsSeed(): Promise<LeadRow[]> {
  if (!leadsSeedCache) {
    const raw = await fs.readFile(path.join(process.cwd(), "data", "seed.json"), "utf-8");
    leadsSeedCache = JSON.parse(raw).leads ?? [];
  }
  return (leadsSeedCache as any[]).map((r) => ({
    date: r.date,
    channel: r.channel as LeadChannel,
    leads: Number(r.leads ?? 0),
    sqlTotal: Number(r.sqlTotal ?? 0),
    sqlCold: Number(r.sqlCold ?? 0),
    sqlWarm: Number(r.sqlWarm ?? 0),
    sqlHot: Number(r.sqlHot ?? 0),
  }));
}

/** Ліди по днях/каналах у діапазоні (з БД або демо-сіду). */
export async function getLeads(range?: DateRange): Promise<LeadRow[]> {
  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(factLeadsDaily)
      .where(
        range
          ? and(gte(factLeadsDaily.date, range.from), lte(factLeadsDaily.date, range.to))
          : undefined,
      );
    if (rows.length > 0)
      return rows.map((r) => ({
        date: r.date,
        channel: r.channel as LeadChannel,
        leads: Number(r.leads ?? 0),
        sqlTotal: Number(r.sqlTotal ?? 0),
        sqlCold: Number(r.sqlCold ?? 0),
        sqlWarm: Number(r.sqlWarm ?? 0),
        sqlHot: Number(r.sqlHot ?? 0),
      }));
  }
  let seed = await loadLeadsSeed();
  if (range) seed = seed.filter((r) => r.date >= range.from && r.date <= range.to);
  return seed;
}
