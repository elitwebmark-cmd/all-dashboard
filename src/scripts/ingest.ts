/**
 * Точка входу ETL для Railway Cron.
 * Розклад (приклад):
 *   - щогодини:  ingest сьогодні+вчора (гарячі дані)
 *   - щоночі:    ingest останні 7 днів (backfill коригувань атрибуції)
 *
 * Режим керується аргументом: `tsx src/scripts/ingest.ts hot|backfill`
 */
import { ingestAll } from "../lib/ingest";

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const mode = process.argv[2] ?? "hot";
  const today = daysAgo(0);
  const range = mode === "backfill" ? { dateFrom: daysAgo(7), dateTo: today } : { dateFrom: daysAgo(1), dateTo: today };

  console.log(`[ingest:${mode}] ${range.dateFrom}..${range.dateTo}`);
  const results = await ingestAll(range);
  for (const r of results) {
    console.log(r.ok ? `  ✓ ${r.channel}: ${r.rows} рядків` : `  ✗ ${r.channel}: ${r.error}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
