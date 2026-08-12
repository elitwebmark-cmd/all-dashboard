import { NextRequest, NextResponse } from "next/server";
import { ingestAll } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Тригер завантаження. Захищено секретом INGEST_SECRET.
 * Railway Cron викликає: POST /api/ingest?mode=hot  (Authorization: Bearer <INGEST_SECRET>)
 */
export async function POST(req: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const mode = req.nextUrl.searchParams.get("mode") ?? "hot";
  const today = new Date().toISOString().slice(0, 10);
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - (mode === "backfill" ? 7 : 1));

  try {
    const results = await ingestAll({ dateFrom: from.toISOString().slice(0, 10), dateTo: today });
    return NextResponse.json({ ok: true, mode, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
