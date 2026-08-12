/**
 * Тонкий клієнт Windsor.ai REST get_data API.
 * Док: https://windsor.ai/data-field/<connector>/  ·  Base: https://connectors.windsor.ai/<connector>
 *
 * Потрібен WINDSOR_API_KEY (кабінет Windsor → API key).
 */

const BASE = "https://connectors.windsor.ai";

export interface GetDataParams {
  connector: string; // напр. "google_ads", "googleanalytics4"
  fields: string[];
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  datePreset?: string; // напр. "last_7d"
}

export async function windsorGetData(params: GetDataParams): Promise<any[]> {
  const apiKey = process.env.WINDSOR_API_KEY;
  if (!apiKey) throw new Error("WINDSOR_API_KEY не заданий");

  const q = new URLSearchParams();
  q.set("api_key", apiKey);
  q.set("fields", params.fields.join(","));
  q.set("_renderer", "json");
  if (params.datePreset) q.set("date_preset", params.datePreset);
  if (params.dateFrom) q.set("date_from", params.dateFrom);
  if (params.dateTo) q.set("date_to", params.dateTo);

  const url = `${BASE}/${params.connector}?${q.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Windsor ${params.connector} HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    const json = await res.json();
    // Windsor віддає {data:[...]}; підстраховуємось на {result:[...]}
    const rows = json.data ?? json.result ?? [];
    if (!Array.isArray(rows)) throw new Error(`Windsor ${params.connector}: неочікуваний формат відповіді`);
    return rows;
  } finally {
    clearTimeout(timeout);
  }
}
