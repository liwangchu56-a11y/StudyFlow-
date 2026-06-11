type Accent = "violet" | "indigo" | "amber" | "rose" | "slate";

const accentMap: Record<Accent, { bg: string; text: string; border: string }> = {
  violet: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-100" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
  rose: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100" },
  slate: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-100" },
};

interface Props {
  icon: string;
  label: string;
  value: string | number;
  hint?: string;
  accent?: Accent;
}
export function StatCard({ icon, label, value, hint, accent = "violet" }: Props) {
  const a = accentMap[accent];
  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl ${a.bg} ${a.text} flex items-center justify-center text-base font-semibold border ${a.border} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
      <div className="text-eyebrow mt-3">{label}</div>
      <div className="text-display text-2xl text-slate-900 mt-1 tabular-nums">
        {value}
      </div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}