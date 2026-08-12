"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface TrendPoint {
  date: string;
  spend: number;
  sessions: number;
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="card">
      <div className="mb-3 text-sm font-medium text-slate-300">
        Динаміка: витрати Google Ads (грн) та сесії GA4 по днях
      </div>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
            <YAxis yAxisId="left" stroke="#4285F4" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke="#E8710A" fontSize={12} />
            <Tooltip
              contentStyle={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: 8,
                color: "#e2e8f0",
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="spend" name="Витрати, грн" fill="#4285F4" radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="sessions"
              name="Сесії"
              stroke="#E8710A"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
