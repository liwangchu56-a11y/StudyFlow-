import { useMemo, useState } from "react";
import { useCreateCard, useUpdateCard } from "../../api/cards";
import { useUiStore } from "../../store/uiStore";
import { parseQA } from "../../lib/parseQA";
import type { QACard } from "../../types/api";

export function CardEditor() {
  const modal = useUiStore((s) => s.modal);
  const modalData = useUiStore((s) => s.modalData) as { card?: QACard } | null;
  const closeModal = useUiStore((s) => s.closeModal);
  const showToast = useUiStore((s) => s.showToast);
  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const editing = modalData?.card;

  // 编辑模式: 预填 Q: ...\nA: ...
  const initial = editing
    ? `Q: ${editing.question}\nA: ${editing.answer}`
    : "";
  const [text, setText] = useState(initial);
  const [tag, setTag] = useState(editing?.tag ?? "");
  const [saving, setSaving] = useState(false);

  // 实时解析
  const parsed = useMemo(() => parseQA(text, tag.trim() || undefined), [text, tag]);

  if (modal !== "cardEditor") return null;

  const handleSave = async () => {
    if (parsed.length === 0) {
      showToast("请输入至少一张卡片");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        // 编辑模式只支持单卡
        const c = parsed[0];
        await updateCard.mutateAsync({
          id: editing.id,
          question: c.question,
          answer: c.answer,
          tag: c.tag ?? null,
        });
        showToast("已更新");
      } else {
        // 新建: 批量创建
        for (const c of parsed) {
          await createCard.mutateAsync({
            question: c.question,
            answer: c.answer,
            ...(c.tag ? { tag: c.tag } : {}),
          });
        }
        showToast(parsed.length === 1 ? "已添加" : `已添加 ${parsed.length} 张`);
      }
      closeModal();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={closeModal} aria-hidden />
      <div className="relative card-elevated w-full max-w-xl p-7 animate-slide-up-spring max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-violet flex items-center justify-center shadow-glow-violet">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              {editing ? (
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              ) : (
                <path d="M12 5v14M5 12h14" />
              )}
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
              {editing ? "编辑卡片" : "新建卡片"}
            </h3>
            <p className="text-xs text-slate-500">
              {editing ? "单卡编辑" : "支持单张或多张批量, 用空行分隔"}
            </p>
          </div>
        </div>

        <div className="divider my-4" />

        {/* 格式提示 (新建模式) */}
        {!editing && (
          <details className="rounded-2xl bg-slate-50/60 border border-slate-200/60 mb-3 group" open>
            <summary className="cursor-pointer px-4 py-2.5 text-xs text-slate-600 flex items-center justify-between list-none">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                <span>支持的写法</span>
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="text-slate-400 transition-transform group-open:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <div className="px-4 pb-3 text-xs text-slate-500 space-y-2 font-mono">
              <div>
                <div className="text-slate-400 mb-1">// 单张卡</div>
                <div>Q: 什么是闭包</div>
                <div>A: 函数 + 引用环境</div>
              </div>
              <div>
                <div className="text-slate-400 mb-1">// 多张卡 (空行分隔)</div>
                <div>Q: 闭包</div>
                <div>A: ...</div>
                <div>&nbsp;</div>
                <div>Q: 装饰器</div>
                <div>A: ...</div>
              </div>
              <div className="text-slate-400 font-sans">
                也支持: <span className="font-mono">问:/答:</span> / <span className="font-mono">问题:/答案:</span> / 纯文本 (作为问题)
              </div>
            </div>
          </details>
        )}

        {/* 主输入区 */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={editing ? 6 : 8}
          maxLength={6000}
          placeholder={editing ? "Q: ...&#10;A: ..." : "Q: 什么是闭包&#10;A: 函数 + 引用环境&#10;&#10;Q: 什么是装饰器&#10;A: 接受函数返回函数"}
          className="w-full rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300/60 focus:border-violet-300 transition resize-none font-mono leading-relaxed"
        />

        {/* 标签 (新建模式: 应用到所有; 编辑模式: 单卡) */}
        <div className="mt-3 flex items-center gap-2">
          <label className="text-eyebrow whitespace-nowrap">标签</label>
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            maxLength={64}
            className="flex-1 rounded-full border border-slate-200/80 bg-white/60 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300/60 focus:border-violet-300 transition"
            placeholder={editing ? "" : "应用到所有卡片 (可选)"}
          />
        </div>

        {/* 实时预览 */}
        {parsed.length > 0 && (
          <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50/40 px-4 py-2.5 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <div className="flex-1 text-xs">
              <span className="font-medium text-violet-900">
                将创建 {parsed.length} 张{parsed.length === 1 ? "卡片" : "卡片"}
              </span>
              {parsed.length > 1 && (
                <span className="text-violet-600 ml-2">· 批量模式</span>
              )}
            </div>
            <div className="text-[10px] text-violet-500/80 tabular-nums">
              {text.length}/6000
            </div>
          </div>
        )}

        {text.trim() && parsed.length === 0 && (
          <div className="mt-3 rounded-2xl border border-amber-200/60 bg-amber-50/40 px-4 py-2.5 text-xs text-amber-800">
            未识别到有效问题, 请检查格式
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={handleSave} disabled={saving || parsed.length === 0} className="btn-primary flex-1 disabled:opacity-50">
            {saving ? "保存中" : editing ? "保存" : parsed.length > 1 ? `保存 ${parsed.length} 张` : "保存"}
          </button>
          <button onClick={closeModal} className="btn-ghost">
            取消
          </button>
        </div>
      </div>
    </div>
  );
}