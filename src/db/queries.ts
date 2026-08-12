import { promises as fs } from "fs";
import path from "path";
import { and, gte, lte } from "drizzle-orm";
import { getDb, hasDatabase } from "./client";
import { factChannelDaily } from "./schema";
import { normalize, type UnifiedFact } from "@/lib/facts";
import { CONNECTORS, ACTIVE_CHANNELS, type ChannelSlug } from "@/lib/connectors";
import { windsorGetData } from "@/lib/windsor";
import type { DateRange } from "@/lib/range";

export type { DateRange };

let seedCache: { google_ads: any[]; ga4: any[]; meta: any[] } | null = null;

async function loadSeed() {
  if (seedCache) return seedCache;
  const p = path.join(process.cwd(), "data", "seed.json");
  const raw = await fs.readFile(p, "utf-8");
  const json = JSON.parse(raw);
  seedCache = { google_ads: json.google_ads ?? [], ga4: json.ga4 ?? [], meta: json.meta ?? [] };
  return seedCache;
}

/** Живе дотягування діапазону напряму з Windsor (коли в базі його ще нема). */
async function fetchLive(range: DateRange): Promise<UnifiedFact[]> {
  const out: UnifiedFact[] = [];
  for (const ch of ACTIVE_CHANNELS) {
    try {
      const cfg = CONNECTORS[ch];
      const rows = await windsorGetData({
        connector: cfg.windsorConnector,
        fields: cfg.fields,
        dateFrom: range.from,
        dateTo: range.to,
      });
      out.push(...normalize(ch, rows));
    } catch {
      // помилка одного каналу не валить звіт
    }
  }
  return out;
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
    if (rows.length > 0)
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

    // База порожня для цього діапазону — дотягуємо наживо з Windsor
    if (range && opts.allowLive !== false && process.env.WINDSOR_API_KEY) {
      return fetchLive(range);
    }
    // інакше — демо-сід (щоб екран не був порожнім на старті)
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
