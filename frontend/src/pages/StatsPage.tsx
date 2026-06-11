import { useStats, useDailyTrend } from "../api/stats";
import { useCards } from "../api/cards";
import { StatCard } from "../components/stats/StatCard";
import { WeeklyBarChart } from "../components/stats/WeeklyBarChart";
import { TrendLineChart } from "../components/stats/TrendLineChart";
import { useUiStore } from "../store/uiStore";

export function StatsPage() {
  const { data: stats } = useStats();
  const { data: trend = [] } = useDailyTrend(30);
  const { data: cards = [] } = useCards();
  const showToast = useUiStore((s) => s.showToast);

  const handleExport = async () => {
    const lines: string[] = [];
    lines.push("# StudyFlow 学习记录导出");
    lines.push("");
    lines.push("## 概览");
    lines.push(`- 今日学习: ${stats?.today_minutes ?? 0} 分钟`);
    lines.push(`- 今日番茄: ${stats?.today_pomodoros ?? 0}`);
    lines.push(`- 总学习时长: ${stats?.total_minutes ?? 0} 分钟`);
    lines.push(`- 连续学习: ${stats?.streak_days ?? 0} 天`);
    lines.push("");
    lines.push("## 知识卡");
    for (const c of cards) {
      lines.push(`### Q: ${c.question}`);
      lines.push(`A: ${c.answer}`);
      if (c.tag) lines.push(`标签: #${c.tag} · 等级 ${c.mastery}`);
      lines.push("");
    }
    const md = lines.join("\n");
    try {
      await navigator.clipboard.writeText(md);
      showToast("已复制 Markdown 到剪贴板");
    } catch {
      showToast("复制失败, 请手动选择");
    }
  };

  return (
    <div className="space-y-8 sm:space-y-12">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
        <div className="space-y-2">
          <div className="text-eyebrow">ANALYTICS</div>
          <h1 className="text-display text-[clamp(2rem,4vw,3.25rem)] text-slate-900">
            看见<span className="italic font-serif text-violet-600">持续</span>的力量.
          </h1>
          <p className="text-sm text-slate-500">每日学习时长 · 番茄累计 · 知识增长</p>
        </div>
        <button onClick={handleExport} className="btn-ghost self-start sm:self-auto">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          复制 Markdown
        </button>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 grid-flow-dense">
        <StatCard icon="⏱" label="今日学习" value={`${stats?.today_minutes ?? 0}m`} accent="violet" />
        <StatCard icon="◉" label="今日番茄" value={String(stats?.today_pomodoros ?? 0)} accent="indigo" />
        <StatCard icon="▤" label="总时长" value={`${Math.floor((stats?.total_minutes ?? 0) / 60)}h`} hint={`${stats?.total_minutes ?? 0} 分钟`} accent="amber" />
        <StatCard icon="◆" label="连续天数" value={String(stats?.streak_days ?? 0)} hint="天" accent="rose" />
        <StatCard icon="◈" label="总专注" value={String(stats?.total_focus_sessions ?? 0)} hint="次" accent="violet" />
        <StatCard icon="◇" label="知识点" value={String(stats?.knowledge_points ?? 0)} accent="indigo" />
        <StatCard icon="▦" label="问答卡" value={String(stats?.total_cards ?? 0)} accent="amber" />
        <StatCard icon="○" label="待办未完成" value={String(stats?.pending_todos ?? 0)} accent="slate" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <WeeklyBarChart data={trend} />
        <TrendLineChart data={trend} />
      </section>
    </div>
  );
}