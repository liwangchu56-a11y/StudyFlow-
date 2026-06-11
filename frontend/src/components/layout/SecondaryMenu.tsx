import { useState } from "react";
import { useUiStore } from "../../store/uiStore";
import { ChatSessionList } from "../chat/ChatSessionList";
import { ConceptList } from "../concepts/ConceptList";
import { TodoList } from "../todos/TodoList";
import { useStats } from "../../api/stats";
import { useSettings, useUpdateSettings } from "../../api/settings";

type DrawerView = "concepts" | "history" | "todos" | "stats" | "settings";

const VIEWS: { key: DrawerView; label: string; icon: string }[] = [
  { key: "concepts", label: "知识图谱", icon: "🧠" },
  { key: "history", label: "对话历史", icon: "💬" },
  { key: "todos", label: "待办", icon: "✅" },
  { key: "stats", label: "统计", icon: "📊" },
  { key: "settings", label: "设置", icon: "⚙️" },
];

export function SecondaryMenu() {
  const open = useUiStore((s) => s.drawerOpen);
  const setOpen = useUiStore((s) => s.setDrawerOpen);
  const [view, setView] = useState<DrawerView>("concepts");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <aside
        className="absolute top-0 right-0 h-full w-full sm:w-[480px] bg-white border-l border-slate-200 shadow-2xl flex flex-col"
        style={{ animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-slate-800">菜单</h2>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700 text-[20px] leading-none">
            ×
          </button>
        </div>
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`flex-1 min-w-[80px] px-3 py-2.5 text-[12px] font-medium transition border-b-2 ${
                view === v.key
                  ? "text-violet-600 border-violet-500"
                  : "text-slate-500 border-transparent hover:text-slate-800"
              }`}
            >
              <span className="mr-1">{v.icon}</span>
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-hidden">
          {view === "concepts" && <ConceptList />}
          {view === "history" && (
            <ChatSessionList
              activeId={null}
              onSelect={(id) => {
                window.dispatchEvent(new CustomEvent("chat:select", { detail: id }));
                setOpen(false);
              }}
            />
          )}
          {view === "todos" && (
            <div className="h-full overflow-y-auto">
              <TodoList />
            </div>
          )}
          {view === "stats" && <StatsTab />}
          {view === "settings" && <SettingsTab />}
        </div>
      </aside>
    </div>
  );
}

function StatsTab() {
  const { data: stats } = useStats();
  if (!stats) return <div className="p-4 text-[12px] text-slate-400">加载中...</div>;
  const items = [
    { label: "今日学习", value: `${stats.today_minutes} 分钟`, hint: `${stats.today_pomodoros} 番茄` },
    { label: "总专注次数", value: stats.total_focus_sessions, hint: `${stats.total_minutes} 分钟` },
    { label: "连续天数", value: `${stats.streak_days} 天`, hint: "" },
    { label: "知识点 / 卡片", value: `${stats.knowledge_points} / ${stats.total_cards}`, hint: "" },
    { label: "未完成待办", value: stats.pending_todos, hint: "" },
  ];
  return (
    <div className="h-full overflow-y-auto p-4 space-y-2">
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl bg-white border border-slate-200/60 p-4">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">{it.label}</div>
          <div className="text-[20px] font-semibold text-slate-800 mt-1 tabular-nums">{it.value}</div>
          {it.hint && <div className="text-[11px] text-slate-400 mt-0.5">{it.hint}</div>}
        </div>
      ))}
    </div>
  );
}

function SettingsTab() {
  const { data: cfg } = useSettings();
  const update = useUpdateSettings();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  if (!cfg) return <div className="p-4 text-[12px] text-slate-400">加载中...</div>;

  const fields: { key: keyof typeof cfg; label: string; suffix: string; min: number; max: number }[] = [
    { key: "focus_min", label: "专注时长", suffix: "分钟", min: 1, max: 240 },
    { key: "short_break_min", label: "短休息", suffix: "分钟", min: 1, max: 60 },
    { key: "long_break_min", label: "长休息", suffix: "分钟", min: 1, max: 120 },
    { key: "long_break_interval", label: "长休息间隔", suffix: "个专注", min: 2, max: 12 },
  ];

  const startEdit = (key: string, val: number) => {
    setEditing(key);
    setDraft(String(val));
  };

  const commitEdit = (key: string) => {
    const v = parseInt(draft, 10);
    const field = fields.find((f) => f.key === key);
    if (!field || isNaN(v)) return;
    const clamped = Math.max(field.min, Math.min(field.max, v));
    update.mutate({ [key]: clamped } as any);
    setEditing(null);
  };

  return (
    <div className="p-4 space-y-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">计时参数</div>
      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.key} className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/60 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-slate-600 min-w-[72px]">{f.label}</span>
              {editing === f.key ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
                  onBlur={() => commitEdit(f.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setEditing(null);
                  }}
                  className="w-16 px-1.5 py-0.5 rounded-md border border-violet-400 bg-white text-[12px] font-semibold text-slate-800 outline-none text-center"
                />
              ) : (
                <button
                  onClick={() => startEdit(f.key, cfg[f.key] as number)}
                  className="px-1.5 py-0.5 rounded-md hover:bg-slate-100 text-[12px] font-semibold text-slate-800 transition cursor-text min-w-[40px] text-center"
                >
                  {cfg[f.key] as number}
                </button>
              )}
              <span className="text-[11px] text-slate-400">{f.suffix}</span>
            </div>
            {/* 快速 +/- 按钮 */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => update.mutate({ [f.key]: Math.max(f.min, (cfg[f.key] as number) - (f.key === 'long_break_interval' ? 1 : 5)) } as any)}
                className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-500 text-[12px] hover:bg-slate-100 hover:border-violet-300 transition flex items-center justify-center"
                title="减 5"
              >{"−"}</button>
              <button
                onClick={() => update.mutate({ [f.key]: Math.min(f.max, (cfg[f.key] as number) + (f.key === 'long_break_interval' ? 1 : 5)) } as any)}
                className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-500 text-[12px] hover:bg-slate-100 hover:border-violet-300 transition flex items-center justify-center"
                title="加 5"
              >+</button>
            </div>
          </div>
        ))}
      </div>
      <div className="pt-2 border-t border-slate-100">
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">关于</div>
        <div className="text-[11px] text-slate-400 space-y-1">
          <p>• 数据存储: 本地 SQLite (data/sqlite/studyflow.db)</p>
          <p>• 主题: 紫蓝渐变, 锁定</p>
          <p>• AI: {cfg.ai_enabled ? "✅ 已配置" : "❌ 未配置 (设 LLM_API_KEY)"}</p>
        </div>
      </div>
    </div>
  );
}