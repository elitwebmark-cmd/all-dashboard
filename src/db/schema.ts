import {
  pgTable,
  smallserial,
  serial,
  bigserial,
  smallint,
  integer,
  bigint,
  text,
  date,
  numeric,
  timestamp,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";

// Довідник каналів
export const channels = pgTable("channels", {
  id: smallserial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // google_ads | ga4 | meta | hubspot | search_console
  title: text("title").notNull(),
  windsorAccountId: text("windsor_account_id"),
});

// Журнал завантажень (аудит ETL)
export const ingestionRuns = pgTable("ingestion_runs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  channelSlug: text("channel_slug").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  dateFrom: date("date_from"),
  dateTo: date("date_to"),
  rowsLoaded: integer("rows_loaded"),
  status: text("status").notNull().default("running"), // running | ok | error
  error: text("error"),
});

// Уніфіковані денні факти по каналах/сегментах
export const factChannelDaily = pgTable(
  "fact_channel_daily",
  {
    channelSlug: text("channel_slug").notNull(),
    date: date("date").notNull(),
    // сегмент: для google_ads — назва кампанії, для ga4 — default_channel_group
    segment: text("segment").notNull().default("(none)"),
    // рекламні метрики
    spend: numeric("spend", { precision: 14, scale: 4 }).default("0"),
    impressions: bigint("impressions", { mode: "number" }).default(0),
    clicks: bigint("clicks", { mode: "number" }).default(0),
    // конверсії / цінність
    conversions: numeric("conversions", { precision: 14, scale: 2 }).default("0"),
    conversionsValue: numeric("conversions_value", { precision: 14, scale: 2 }).default("0"),
    // аналітика / трафік (GA4)
    sessions: bigint("sessions", { mode: "number" }).default(0),
    users: bigint("users", { mode: "number" }).default(0),
    engagedSessions: bigint("engaged_sessions", { mode: "number" }).default(0),
    // CRM (HubSpot) — наступні етапи
    leads: integer("leads").default(0),
    revenue: numeric("revenue", { precision: 14, scale: 2 }).default("0"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.channelSlug, t.date, t.segment] }),
  }),
);

// Історичні знімки KPI (статистика в часі)
export const kpiSnapshots = pgTable("kpi_snapshots", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  periodType: text("period_type").notNull(), // daily | weekly | monthly
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  channelSlug: text("channel_slug"), // null = комплексний (усі канали)
  kpis: jsonb("kpis").notNull(),
});

// Збережені звіти (PDF) — наступні етапи
export const reports = pgTable("reports", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  type: text("type").notNull(), // complex | channel
  channelSlug: text("channel_slug"),
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  filePath: text("file_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FactRow = typeof factChannelDaily.$inferSelect;
export type NewFactRow = typeof factChannelDaily.$inferInsert;
