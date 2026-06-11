import { useState } from "react";
import { useCreateSession } from "../../api/sessions";
import { useUiStore } from "../../store/uiStore";
import { useSettings } from "../../api/settings";
import { ai } from "../../api/ai";
import { ApiError } from "../../api/client";

export function SummaryModal() {
  const modal = useUiStore((s) => s.modal);
  const modalData = useUiStore((s) => s.modalData) as
    | { mode: "free" | "pomodoro"; durationSec: number; focusCount: number; startedAt: string }
    | null;
  const closeModal = useUiStore((s) => s.closeModal);
  const showToast = useUiStore((s) => s.showToast);
  const { data: settings } = useSettings();
  const createSession = useCreateSession();

  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{ summary: string; key_points: string[]; suggestions: string[] } | null>(null);

  if (modal !== "summary" || !modalData) return null;

  const aiEnabled = settings?.ai_enabled ?? false;
  const isPomo = modalData.mode === "pomodoro";
  const minutes = Math.floor(modalData.durationSec / 60);

  const handleSubmit = async () => {
    if (!note.trim()) {
      showToast("请输入学习笔记");
      return;
    }
    const ended = new Date().toISOString();
    try {
      await createSession.mutateAsync({
        mode: modalData.mode,
        started_at: modalData.startedAt,
        ended_at: ended,
        duration_sec: modalData.durationSec,
        focus_count: modalData.focusCount,
        note,
      });
      closeModal();
      setNote("");
      setSummary(null);
      showToast("已保存学习记录");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "保存失败";
      showToast(msg);
    }
  };

  const handleAiSummarize = async () => {
    if (!note.trim()) {
      showToast("请先输入学习笔记");
      return;
    }
    if (!aiEnabled) {
      showToast("AI 不可用, 请先在 .env 配置 LLM_API_KEY");
      return;
    }
    setLoading(true);
    try {
      const r = await ai.summarize({ note, duration_sec: modalData.durationSec });
      setSummary(r);
      showToast("总结已生成");
    } catch (e) {
      const msg =
        e instanceof ApiError ? `${e.status}: ${e.detail}` : e instanceof Error ? e.message : "AI 总结失败";
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={closeModal} aria-hidden />
      <div className="relative card-elevated w-full max-w-lg p-7 animate-slide-up-spring max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-violet flex items-center justify-center shadow-glow-violet">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5v-18Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">学习结束</h3>
            <p className="text-xs text-slate-500">
              {isPomo ? "番茄钟" : "自由计时"} · {minutes} 分钟
              {modalData.focusCount > 0 && ` · ${modalData.focusCount} 个专注`}
            </p>
          </div>
        </div>

        <div className="divider my-5" />

        <label className="block text-eyebrow mb-2">学后笔记</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={5}
          maxLength={6000}
          placeholder="写下你学到的内容, 心得体会..."
          className="w-full rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300/60 focus:border-violet-300 transition resize-none"
        />
        <div className="text-right text-[11px] text-slate-400 mt-1 tracking-wider">
          {note.length} / 6000
        </div>

        {summary && (
          <div className="mt-4 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50/60 border border-violet-100 p-5 space-y-4">
            <div>
              <div className="text-eyebrow text-violet-600 mb-1.5">Summary</div>
              <div className="text-sm text-slate-700 leading-relaxed">{summary.summary}</div>
            </div>
            {summary.key_points.length > 0 && (
              <div>
                <div className="text-eyebrow text-violet-600 mb-1.5">Key Points</div>
                <ul className="space-y-1">
                  {summary.key_points.map((p, i) => (
                    <li key={i} className="text-sm text-slate-700 flex gap-2">
                      <span className="text-violet-400 mt-1">·</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.suggestions.length > 0 && (
              <div>
                <div className="text-eyebrow text-violet-600 mb-1.5">Suggestions</div>
                <ul className="space-y-1">
                  {summary.suggestions.map((p, i) => (
                    <li key={i} className="text-sm text-slate-700 flex gap-2">
                      <span className="text-violet-400 mt-1">·</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-6">
          {aiEnabled && (
            <button onClick={handleAiSummarize} disabled={loading} className="btn-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
              </svg>
              {loading ? "生成中" : "AI 总结"}
            </button>
          )}
          <button onClick={handleSubmit} className="btn-ghost flex-1">
            保存记录
          </button>
          <button onClick={closeModal} className="btn-ghost">
            取消
          </button>
        </div>
      </div>
    </div>
  );
}