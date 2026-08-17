/**
 * Прямий клієнт HubSpot CRM API — для лідів/SQL у реальному часі (в обхід затримки Windsor).
 * Потрібен HUBSPOT_TOKEN (Private App token зі scope crm.objects.deals.read).
 * Якщо токена немає — leads.ts падає назад на Windsor.
 */

const BASE = "https://api.hubapi.com";

export interface HubspotDeal {
  createdate: string; // ISO
  source: string; // hs_analytics_source
  newSql: string; // new_sql
}

/** Тягне всі угоди воронки (з пагінацією) з потрібними полями. */
export async function fetchDealsForPipeline(pipelineId: string): Promise<HubspotDeal[]> {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) throw new Error("HUBSPOT_TOKEN не заданий");

  const out: HubspotDeal[] = [];
  let after: string | undefined = undefined;

  for (let page = 0; page < 50; page++) {
    const body: Record<string, unknown> = {
      filterGroups: [
        { filters: [{ propertyName: "pipeline", operator: "EQ", value: pipelineId }] },
      ],
      properties: ["createdate", "hs_analytics_source", "new_sql"],
      limit: 100,
    };
    if (after) body.after = after;

    const res = await fetch(`${BASE}/crm/v3/objects/deals/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`HubSpot ${res.status}: ${t.slice(0, 300)}`);
    }
    const json: any = await res.json();
    for (const r of json.results ?? []) {
      const p = r.properties ?? {};
      out.push({
        createdate: p.createdate ?? "",
        source: p.hs_analytics_source ?? "",
        newSql: p.new_sql ?? "",
      });
    }
    after = json.paging?.next?.after;
    if (!after) break;
  }
  return out;
}
