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
  // Довільний діапазон: npm run ingest range 2026-01-01 2026-01-31
  let range: { dateFrom: string; dateTo: string };
  if (mode === "range") {
    const from = process.argv[3];
    const to = process.argv[4];
    if (!from || !to) {
      console.error("Використання: ingest range <YYYY-MM-DD> <YYYY-MM-DD>");
      process.exit(1);
    }
    range = { dateFrom: from, dateTo: to };
  } else if (mode === "backfill") {
    range = { dateFrom: daysAgo(7), dateTo: today };
  } else {
    range = { dateFrom: daysAgo(1), dateTo: today };
  }

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
