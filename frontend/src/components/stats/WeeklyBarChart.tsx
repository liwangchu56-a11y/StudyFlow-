import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyPoint } from "../../types/api";

export function WeeklyBarChart({ data }: { data: DailyPoint[] }) {
  const last7 = data.slice(-7);
  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-slate-900 tracking-tight">本周</h3>
        <span className="text-eyebrow">7 DAYS</span>
      </div>
      <p className="text-xs text-slate-500 mb-5">每日学习分钟数</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={last7} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity={1} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} width={36} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(139,92,246,0.05)" }}
            contentStyle={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(15,23,42,0.08)", borderRadius: 12, fontSize: 12, boxShadow: "0 4px 16px rgba(15,23,42,0.08)" }}
            formatter={(v: number) => [`${v} 分钟`, "学习"]}
          />
          <Bar dataKey="minutes" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}