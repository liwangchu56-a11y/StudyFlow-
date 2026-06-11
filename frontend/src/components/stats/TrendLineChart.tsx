import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyPoint } from "../../types/api";

export function TrendLineChart({ data }: { data: DailyPoint[] }) {
  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-slate-900 tracking-tight">近 30 天</h3>
        <span className="text-eyebrow">TREND</span>
      </div>
      <p className="text-xs text-slate-500 mb-5">每日学习时长趋势</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(d) => d.slice(5)} interval={4} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={36} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ stroke: "rgba(139,92,246,0.2)", strokeWidth: 1 }}
            contentStyle={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(15,23,42,0.08)", borderRadius: 12, fontSize: 12, boxShadow: "0 4px 16px rgba(15,23,42,0.08)" }}
            formatter={(v: number) => [`${v} 分钟`, "学习"]}
          />
          <Line type="monotone" dataKey="minutes" stroke="url(#lineGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#8b5cf6", strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}