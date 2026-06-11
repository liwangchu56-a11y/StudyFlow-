import { useState } from "react";
import { useCreateCard } from "../../api/cards";
import { useSettings } from "../../api/settings";
import { useUiStore } from "../../store/uiStore";
import { ai } from "../../api/ai";
import { ApiError } from "../../api/client";

export function ImportTextModal() {
  const modal = useUiStore((s) => s.modal);
  const closeModal = useUiStore((s) => s.closeModal);
  const showToast = useUiStore((s) => s.showToast);
  const { data: settings } = useSettings();
  const createCard = useCreateCard();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  if (modal !== "importText") return null;
  const aiEnabled = settings?.ai_enabled ?? false;

  const handleExtract = async () => {
    if (!text.trim()) {
      showToast("请粘贴文本");
      return;
    }
    if (text.length > 6000) {
      showToast("文本过长, 已截断到 6000 字符");
    }
    const truncated = text.slice(0, 6000);
    setLoading(true);
    try {
      const r = await ai.extractQA(truncated);
      for (const c of r.cards) {
        await createCard.mutateAsync({ ...c, source: "ai" });
      }
      showToast(`已提炼 ${r.cards.length} 张卡片`);
      setText("");
      closeModal();
    } catch (e) {
      const msg = e instanceof ApiError ? e.detail : e instanceof Error ? e.message : "提炼失败";
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={closeModal} aria-hidden />
      <div className="relative card-elevated w-full max-w-lg p-7 animate-slide-up-spring">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-violet flex items-center justify-center shadow-glow-violet">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">AI 提炼</h3>
            <p className="text-xs text-slate-500">粘贴文本, 自动生成问答卡</p>
          </div>
        </div>

        <div className="divider my-4" />

        {!aiEnabled && (
          <div className="rounded-2xl border border-amber-200/60 bg-amber-50/60 text-amber-900 text-sm p-3.5">
            AI 未配置: 请在 <code className="text-xs bg-amber-100/60 px-1.5 py-0.5 rounded">.env</code> 设置 LLM_API_KEY 后重启
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          maxLength={6000}
          disabled={!aiEnabled}
          placeholder="粘贴笔记, 文章, 概念解释..."
          className="w-full rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300/60 focus:border-violet-300 transition resize-none disabled:bg-slate-50/60 disabled:text-slate-400 mt-3"
        />
        <div className="text-right text-[11px] text-slate-400 mt-1 tracking-wider">
          {text.length} / 6000
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={handleExtract} disabled={loading || !aiEnabled} className="btn-primary flex-1">
            {loading ? "提炼中" : "开始提炼"}
          </button>
          <button onClick={closeModal} className="btn-ghost">取消</button>
        </div>
      </div>
    </div>
  );
}