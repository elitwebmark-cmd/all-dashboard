/**
 * Ідемпотентні міграції (CREATE TABLE IF NOT EXISTS).
 * Запуск: npm run db:migrate  (потрібен DATABASE_URL)
 * На Railway додається як release-крок перед стартом.
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL не заданий");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

async function main() {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS channels (
      id SMALLSERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      windsor_account_id TEXT
    );

    CREATE TABLE IF NOT EXISTS ingestion_runs (
      id BIGSERIAL PRIMARY KEY,
      channel_slug TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      finished_at TIMESTAMPTZ,
      date_from DATE,
      date_to DATE,
      rows_loaded INTEGER,
      status TEXT NOT NULL DEFAULT 'running',
      error TEXT
    );

    CREATE TABLE IF NOT EXISTS fact_channel_daily (
      channel_slug TEXT NOT NULL,
      date DATE NOT NULL,
      segment TEXT NOT NULL DEFAULT '(none)',
      spend NUMERIC(14,4) DEFAULT 0,
      impressions BIGINT DEFAULT 0,
      clicks BIGINT DEFAULT 0,
      conversions NUMERIC(14,2) DEFAULT 0,
      conversions_value NUMERIC(14,2) DEFAULT 0,
      sessions BIGINT DEFAULT 0,
      users BIGINT DEFAULT 0,
      engaged_sessions BIGINT DEFAULT 0,
      leads INTEGER DEFAULT 0,
      revenue NUMERIC(14,2) DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (channel_slug, date, segment)
    );
    CREATE INDEX IF NOT EXISTS idx_fact_date ON fact_channel_daily(date);
    CREATE INDEX IF NOT EXISTS idx_fact_channel ON fact_channel_daily(channel_slug);

    CREATE TABLE IF NOT EXISTS kpi_snapshots (
      id BIGSERIAL PRIMARY KEY,
      captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      period_type TEXT NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      channel_slug TEXT,
      kpis JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id BIGSERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      channel_slug TEXT,
      period_start DATE,
      period_end DATE,
      file_path TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Довідник каналів
  await sql`
    INSERT INTO channels (slug, title, windsor_account_id) VALUES
      ('google_ads', 'Google Ads', '430-346-2372'),
      ('ga4', 'Google Analytics 4', '280095058'),
      ('meta', 'Meta Ads', '837664791809030'),
      ('hubspot', 'HubSpot', '143596207'),
      ('search_console', 'Search Console', 'https://elit-web.ua/')
    ON CONFLICT (slug) DO NOTHING;
  `;

  console.log("✓ Міграції застосовано");
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
