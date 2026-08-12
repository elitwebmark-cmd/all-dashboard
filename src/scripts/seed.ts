/**
 * Засів БД реальними демо-даними з data/seed.json (Google Ads + GA4).
 * Запуск: npm run db:seed  (потрібен DATABASE_URL; спершу db:migrate)
 */
import { promises as fs } from "fs";
import path from "path";
import postgres from "postgres";
import { normalize } from "../lib/facts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL не заданий");
  process.exit(1);
}
const sql = postgres(url, { max: 1 });

async function main() {
  const raw = await fs.readFile(path.join(process.cwd(), "data", "seed.json"), "utf-8");
  const json = JSON.parse(raw);
  const facts = [
    ...normalize("google_ads", json.google_ads ?? []),
    ...normalize("ga4", json.ga4 ?? []),
    ...normalize("meta", json.meta ?? []),
    ...normalize("search_console", json.search_console ?? []),
    ...normalize("hubspot", json.hubspot ?? []),
  ];

  let n = 0;
  for (const f of facts) {
    await sql`
      INSERT INTO fact_channel_daily
        (channel_slug, date, segment, spend, impressions, clicks, conversions,
         conversions_value, sessions, users, engaged_sessions, reach, position, leads, revenue)
      VALUES
        (${f.channelSlug}, ${f.date}, ${f.segment}, ${f.spend}, ${f.impressions},
         ${f.clicks}, ${f.conversions}, ${f.conversionsValue}, ${f.sessions},
         ${f.users}, ${f.engagedSessions}, ${f.reach}, ${f.position}, ${f.leads}, ${f.revenue})
      ON CONFLICT (channel_slug, date, segment) DO UPDATE SET
        spend = excluded.spend, impressions = excluded.impressions,
        clicks = excluded.clicks, conversions = excluded.conversions,
        conversions_value = excluded.conversions_value, sessions = excluded.sessions,
        users = excluded.users, engaged_sessions = excluded.engaged_sessions,
        reach = excluded.reach, position = excluded.position, updated_at = now();
    `;
    n++;
  }
  console.log(`✓ Засіяно ${n} рядків`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
