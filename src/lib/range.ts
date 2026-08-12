export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

const RE = /^\d{4}-\d{2}-\d{2}$/;

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return isoDay(d);
}

/** Валідний діапазон із query (?from=&to=) або null. */
export function parseRange(sp?: { from?: string; to?: string }): DateRange | null {
  const from = sp?.from;
  const to = sp?.to;
  if (from && to && RE.test(from) && RE.test(to)) {
    return from <= to ? { from, to } : { from: to, to: from };
  }
  return null;
}

/** Періоди для порівняння з query (?p=from..to повторюється). */
export function parsePeriods(p?: string | string[]): DateRange[] {
  if (!p) return [];
  const arr = Array.isArray(p) ? p : [p];
  const out: DateRange[] = [];
  for (const item of arr.slice(0, 5)) {
    const [from, to] = item.split("..");
    if (from && to && RE.test(from) && RE.test(to)) {
      out.push(from <= to ? { from, to } : { from: to, to: from });
    }
  }
  return out;
}

/** Усі дати діапазону включно. */
export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (d <= end) {
    out.push(isoDay(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export const rangeLabel = (r: DateRange) => (r.from === r.to ? r.from : `${r.from} — ${r.to}`);

export const daysInRange = (r: DateRange) => eachDate(r.from, r.to).length;
