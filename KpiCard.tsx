export function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sub ? <div className="kpi-sub">{sub}</div> : null}
    </div>
  );
}
