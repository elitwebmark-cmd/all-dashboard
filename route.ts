import { NextRequest, NextResponse } from "next/server";
import { getFacts, getAvailableRange } from "@/db/queries";
import { sumFacts, groupBy } from "@/lib/facts";

export const dynamic = "force-dynamic";

/** JSON API показників (для інтеграцій/експорту). GET /api/metrics?from=&to=&channel= */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const avail = await getAvailableRange();
  const from = sp.get("from") ?? avail.from;
  const to = sp.get("to") ?? avail.to;
  const channel = sp.get("channel");

  let facts = await getFacts({ from, to });
  if (channel) facts = facts.filter((f) => f.channelSlug === channel);

  return NextResponse.json({
    range: { from, to },
    totals: sumFacts(facts),
    byChannel: groupBy(facts, (f) => f.channelSlug).map((c) => ({ channel: c.key, totals: c.totals })),
  });
}
