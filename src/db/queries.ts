import { promises as fs } from "fs";
import path from "path";
import { and, gte, lte } from "drizzle-orm";
import { getDb, hasDatabase } from "./client";
import { factChannelDaily } from "./schema";
import { normalize, type UnifiedFact } from "@/lib/facts";
import type { ChannelSlug } from "@/lib/connectors";

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

let seedCache: { google_ads: any[]; ga4: any[]; meta: any[] } | null = null;

async function loadSeed() {
  if (seedCache) return seedCache;
  const p = path.join(process.cwd(), "data", "seed.json");
  const raw = await fs.readFile(p, "utf-8");
  const json = JSON.parse(raw);
  seedCache = { google_ads: json.google_ads ?? [], ga4: json.ga4 ?? [], meta: json.meta ?? [] };
  return seedCache;
}

/** Усі уніфіковані факти в діапазоні (з БД або з демо-сіду). */
export async function getFacts(range?: DateRange): Promise<UnifiedFact[]> {
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
    // База підключена, але ще без даних — показуємо демо-сід, щоб дешборд не був порожнім
    if (rows.length === 0) return loadSeedFacts(range);
    return rows.map((r) => ({
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
      leads: Number(r.leads ?? 0),
      revenue: Number(r.revenue ?? 0),
    }));
  }

  // Fallback: демо-сід
  return loadSeedFacts(range);
}

/** Факти з демо-сіду (data/seed.json), опційно відфільтровані по діапазону. */
async function loadSeedFacts(range?: DateRange) {
  const seed = await loadSeed();
  let facts = [
    ...normalize("google_ads", seed.google_ads),
    ...normalize("ga4", seed.ga4),
    ...normalize("meta", seed.meta),
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
