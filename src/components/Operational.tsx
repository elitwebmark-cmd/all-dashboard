import { uah, int, pct, dec } from "@/lib/format";
import { monthProgress } from "@/lib/range";
import { ProgressBar } from "./ProgressBar";

// --- Статус виконання плану (за темпом місяця) ---
function statusOf(fact: number, plan: number) {
  const expected = plan * monthProgress();
  if (plan === 0) return { label: "—", cls: "bg-white/5 text-neutral-400", bar: "#525252" };
  if (fact >= expected) return { label: "НА РІВНІ", cls: "bg-emerald-500/15 text-emerald-400", bar: "#10b981" };
  if (fact >= 0.7 * expected) return { label: "БЛИЗЬКО", cls: "bg-amber-500/15 text-amber-400", bar: "#f59e0b" };
  return { label: "КРИТИЧНО", cls: "bg-brand/20 text-brand", bar: "#FA321E" };
}

// ---------- Глобальний блок «Сьогодні» ----------
export interface LiveKpisProps {
  date: string;
  totalLeads: number;
  sqlLeads: number;
  planDone: number;
  planTotal: number;
  cplUah: number;
  metaUah: number;
  googleUah: number;
}

function MiniKpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-[#2a2a2e] bg-[#0f0f11] p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs text-neutral-500">{sub}</div> : null}
    </div>
  );
}

export function LiveKpis(p: LiveKpisProps) {
  const planPct = p.planTotal ? (p.planDone / p.planTotal) * 100 : 0;
  return (
    <section className="rounded-2xl border border-brand/40 bg-gradient-to-br from-brand/10 to-transparent p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
        </span>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-200">
          Сьогодні · онлайн
        </h2>
        <span className="text-xs text-neutral-500">({p.date}, оновлюється кожні 10 хв)</span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <MiniKpi label="Всього лідів" value={int(p.totalLeads)} accent="#FA321E" />
        <MiniKpi label="SQL лідів" value={int(p.sqlLeads)} />
        <MiniKpi
          label="План (міс.)"
          value={pct(planPct)}
          sub={`${int(p.planDone)} / ${int(p.planTotal)}`}
        />
        <MiniKpi label="Вартість ліда" value={p.totalLeads ? uah(p.cplUah) : "—"} sub="грн, платні канали" />
        <MiniKpi label="Витрати Meta" value={uah(p.metaUah)} sub="конв. з USD" />
        <MiniKpi label="Витрати Google" value={uah(p.googleUah)} />
      </div>
    </section>
  );
}

// ---------- Виконання плану по каналах ----------
export interface PlanRow {
  title: string;
  plan: number;
  fact: number;
}

export function PlanExecution({ rows }: { rows: PlanRow[] }) {
  const totalPlan = rows.reduce((s, r) => s + r.plan, 0);
  const totalFact = rows.reduce((s, r) => s + r.fact, 0);
  return (
    <div className="card overflow-x-auto">
      <div className="mb-1 text-sm font-medium text-neutral-200">Виконання плану по каналах</div>
      <div className="mb-3 text-xs text-neutral-500">Місяць-до-дати · статус за темпом місяця</div>
      <table className="data">
        <thead>
          <tr>
            <th>Канал</th>
            <th className="text-right">План</th>
            <th className="text-right">Факт</th>
            <th className="text-right">%</th>
            <th style={{ width: "34%" }}>Прогрес</th>
            <th className="text-right">Статус</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const p = r.plan ? (r.fact / r.plan) * 100 : 0;
            const st = statusOf(r.fact, r.plan);
            return (
              <tr key={r.title}>
                <td className="text-neutral-200">{r.title}</td>
                <td className="text-right">{int(r.plan)}</td>
                <td className="text-right font-semibold">{int(r.fact)}</td>
                <td className="text-right">{pct(p)}</td>
                <td>
                  <ProgressBar pct={p} color={st.bar} />
                </td>
                <td className="text-right">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${st.cls}`}>
                    {st.label}
                  </span>
                </td>
              </tr>
            );
          })}
          <tr>
            <td className="font-semibold text-neutral-100">Усього</td>
            <td className="text-right font-semibold">{int(totalPlan)}</td>
            <td className="text-right font-semibold">{int(totalFact)}</td>
            <td className="text-right font-semibold">{pct(totalPlan ? (totalFact / totalPlan) * 100 : 0)}</td>
            <td colSpan={2} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ---------- Матриця лідів ----------
export interface MatrixRow {
  title: string;
  leads: number;
  sql: number;
  spendUah: number;
  hasSpend: boolean;
  plan: number;
}

export function LeadsMatrix({ rows }: { rows: MatrixRow[] }) {
  const totalLeads = rows.reduce((s, r) => s + r.leads, 0);
  const totalSql = rows.reduce((s, r) => s + r.sql, 0);
  const totalSpend = rows.reduce((s, r) => s + r.spendUah, 0);
  const totalPlan = rows.reduce((s, r) => s + r.plan, 0);
  return (
    <div className="card overflow-x-auto">
      <div className="mb-1 text-sm font-medium text-neutral-200">Матриця лідів</div>
      <div className="mb-3 text-xs text-neutral-500">Місяць-до-дати · по каналах</div>
      <table className="data">
        <thead>
          <tr>
            <th>Канал</th>
            <th className="text-right">Ліди</th>
            <th className="text-right">SQL</th>
            <th className="text-right">Витрати (грн)</th>
            <th className="text-right">Вартість ліда</th>
            <th className="text-right">Частка</th>
            <th className="text-right">План</th>
            <th className="text-right">Викон.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const cpl = r.hasSpend && r.leads ? r.spendUah / r.leads : null;
            const share = totalLeads ? (r.leads / totalLeads) * 100 : 0;
            const exec = r.plan ? (r.leads / r.plan) * 100 : 0;
            return (
              <tr key={r.title}>
                <td className="text-neutral-200">{r.title}</td>
                <td className="text-right font-semibold">{int(r.leads)}</td>
                <td className="text-right">{int(r.sql)}</td>
                <td className="text-right">{r.hasSpend ? uah(r.spendUah) : "—"}</td>
                <td className="text-right">{cpl !== null ? uah(cpl) : "—"}</td>
                <td className="text-right">{pct(share)}</td>
                <td className="text-right">{int(r.plan)}</td>
                <td className="text-right">{pct(exec)}</td>
              </tr>
            );
          })}
          <tr>
            <td className="font-semibold text-neutral-100">Усього</td>
            <td className="text-right font-semibold">{int(totalLeads)}</td>
            <td className="text-right font-semibold">{int(totalSql)}</td>
            <td className="text-right font-semibold">{uah(totalSpend)}</td>
            <td className="text-right">{totalLeads ? uah(totalSpend / totalLeads) : "—"}</td>
            <td className="text-right">100%</td>
            <td className="text-right font-semibold">{int(totalPlan)}</td>
            <td className="text-right font-semibold">{pct(totalPlan ? (totalLeads / totalPlan) * 100 : 0)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
