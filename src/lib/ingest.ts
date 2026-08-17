import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { factChannelDaily, factLeadsDaily, ingestionRuns } from "@/db/schema";
import { windsorGetData } from "./windsor";
import { normalize } from "./facts";
import { fetchLeadsLive } from "./leads";
import { CONNECTORS, ACTIVE_CHANNELS, type ChannelSlug } from "./connectors";

export interface IngestOptions {
  channels?: ChannelSlug[];
  dateFrom?: string;
  dateTo?: string;
  datePreset?: string; // якщо не задано from/to
}

/**
 * Завантаження одного каналу: Windsor → normalize → UPSERT у fact_channel_daily.
 * Ідемпотентно (ON CONFLICT DO UPDATE) — повторний запуск того ж дня оновлює.
 */
export async function ingestChannel(channel: ChannelSlug, opts: IngestOptions) {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL не заданий — ingest потребує БД");

  const cfg = CONNECTORS[channel];
  const [run] = await db
    .insert(ingestionRuns)
    .values({
      channelSlug: channel,
      dateFrom: opts.dateFrom ?? null,
      dateTo: opts.dateTo ?? null,
      status: "running",
    })
    .returning();

  try {
    const rows = await windsorGetData({
      connector: cfg.windsorConnector,
      fields: cfg.fields,
      dateFrom: opts.dateFrom,
      dateTo: opts.dateTo,
      datePreset: opts.dateFrom ? undefined : opts.datePreset ?? "last_7d",
    });

    const facts = normalize(channel, rows);

    // UPSERT батчами
    for (const f of facts) {
      await db
        .insert(factChannelDaily)
        .values({
          channelSlug: f.channelSlug,
          date: f.date,
          segment: f.segment,
          spend: String(f.spend),
          impressions: f.impressions,
          clicks: f.clicks,
          conversions: String(f.conversions),
          conversionsValue: String(f.conversionsValue),
          sessions: f.sessions,
          users: f.users,
          engagedSessions: f.engagedSessions,
          reach: f.reach,
          position: String(f.position),
          leads: f.leads,
          revenue: String(f.revenue),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [factChannelDaily.channelSlug, factChannelDaily.date, factChannelDaily.segment],
          set: {
            spend: sql`excluded.spend`,
            impressions: sql`excluded.impressions`,
            clicks: sql`excluded.clicks`,
            conversions: sql`excluded.conversions`,
            conversionsValue: sql`excluded.conversions_value`,
            sessions: sql`excluded.sessions`,
            users: sql`excluded.users`,
            engagedSessions: sql`excluded.engaged_sessions`,
            reach: sql`excluded.reach`,
            position: sql`excluded.position`,
            leads: sql`excluded.leads`,
            revenue: sql`excluded.revenue`,
            updatedAt: sql`now()`,
          },
        });
    }

    await db
      .update(ingestionRuns)
      .set({ status: "ok", rowsLoaded: facts.length, finishedAt: new Date() })
      .where(sql`${ingestionRuns.id} = ${run.id}`);

    return { channel, rows: facts.length };
  } catch (e: any) {
    await db
      .update(ingestionRuns)
      .set({ status: "error", error: String(e?.message ?? e), finishedAt: new Date() })
      .where(sql`${ingestionRuns.id} = ${run.id}`);
    throw e;
  }
}

/** Завантаження лідів HubSpot (контакти + SQL-угоди) у fact_leads_daily. */
export async function ingestLeads() {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL не заданий");
  const [run] = await db
    .insert(ingestionRuns)
    .values({ channelSlug: "leads", status: "running" })
    .returning();
  try {
    const rows = await fetchLeadsLive();
    // Повне оновлення: джерело віддає всю історію воронки, тож замінюємо цілком
    await db.execute(sql`DELETE FROM fact_leads_daily`);
    for (const r of rows) {
      await db
        .insert(factLeadsDaily)
        .values({
          date: r.date,
          channel: r.channel,
          leads: r.leads,
          sqlTotal: r.sqlTotal,
          sqlCold: r.sqlCold,
          sqlWarm: r.sqlWarm,
          sqlHot: r.sqlHot,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [factLeadsDaily.date, factLeadsDaily.channel],
          set: {
            leads: sql`excluded.leads`,
            sqlTotal: sql`excluded.sql_total`,
            sqlCold: sql`excluded.sql_cold`,
            sqlWarm: sql`excluded.sql_warm`,
            sqlHot: sql`excluded.sql_hot`,
            updatedAt: sql`now()`,
          },
        });
    }
    await db
      .update(ingestionRuns)
      .set({ status: "ok", rowsLoaded: rows.length, finishedAt: new Date() })
      .where(sql`${ingestionRuns.id} = ${run.id}`);
    return { rows: rows.length };
  } catch (e: any) {
    await db
      .update(ingestionRuns)
      .set({ status: "error", error: String(e?.message ?? e), finishedAt: new Date() })
      .where(sql`${ingestionRuns.id} = ${run.id}`);
    throw e;
  }
}

/** Завантаження всіх активних каналів. Помилка одного не валить інші. */
export async function ingestAll(opts: IngestOptions = {}) {
  const channels = opts.channels ?? ACTIVE_CHANNELS;
  const results: { channel: string; ok: boolean; rows?: number; error?: string }[] = [];
  for (const ch of channels) {
    try {
      const r = await ingestChannel(ch, opts);
      results.push({ channel: ch, ok: true, rows: r.rows });
    } catch (e: any) {
      results.push({ channel: ch, ok: false, error: String(e?.message ?? e) });
    }
  }
  // Ліди HubSpot (контакти + SQL-угоди)
  try {
    const r = await ingestLeads();
    results.push({ channel: "leads", ok: true, rows: r.rows });
  } catch (e: any) {
    results.push({ channel: "leads", ok: false, error: String(e?.message ?? e) });
  }
  return results;
}
