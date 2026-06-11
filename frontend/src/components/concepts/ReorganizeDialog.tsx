import { useState } from "react";
import { useReorganizeConcepts, useApplyReorganize } from "../../api/concepts";
import { useUiStore } from "../../store/uiStore";

export function ReorganizeDialog({ onClose }: { onClose: () => void }) {
  const reorganize = useReorganizeConcepts();
  const apply = useApplyReorganize();
  const showToast = useUiStore((s) => s.showToast);
  const [data, setData] = useState<Awaited<ReturnType<typeof reorganize.mutateAsync>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setError(null);
    try {
      const r = await reorganize.mutateAsync();
      setData(r);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "分析失败";
      setError(msg.includes("503") || msg.includes("LLM") ? "未配置 LLM 或 AI 不可用" : msg);
    }
  };

  const onApply = async () => {
    if (!data) return;
    try {
      const r = await apply.mutateAsync(data);
      showToast(`已应用 ${r.affected} 项变更`);
      onClose();
    } catch {
      showToast("应用失败");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[80vh] rounded-3xl bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-slate-800">✨ AI 重新整理知识点</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-[18px]">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {!data && !error && (
            <div className="text-center py-8">
              <p className="text-[13px] text-slate-600 mb-4">
                AI 会分析所有活跃知识点, 找重复、建议改名、按主题重新分组。
              </p>
              <button
                onClick={start}
                disabled={reorganize.isPending}
                className="rounded-full px-5 py-2 text-sm text-white bg-gradient-to-br from-violet-500 to-indigo-500 disabled:opacity-50"
              >
                {reorganize.isPending ? "分析中..." : "开始分析"}
              </button>
            </div>
          )}
          {error && (
            <div className="text-center py-8">
              <p className="text-[13px] text-rose-500 mb-4">{error}</p>
              <button onClick={onClose} className="btn-ghost">
                关闭
              </button>
            </div>
          )}
          {data && (
            <div className="space-y-5">
              {data.groups.length > 0 && (
                <section>
                  <h4 className="text-[12px] font-semibold text-slate-700 mb-2">📁 分组建议 ({data.groups.length})</h4>
                  <div className="space-y-2">
                    {data.groups.map((g, i) => (
                      <div key={i} className="rounded-xl bg-slate-50 px-3 py-2 text-[12px]">
                        <div className="font-medium text-slate-800">{g.group}</div>
                        {g.description && <div className="text-slate-500 mt-0.5">{g.description}</div>}
                        <div className="text-slate-400 mt-1">包含 {g.concept_ids.length} 个知识点</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {data.suggested_renames.length > 0 && (
                <section>
                  <h4 className="text-[12px] font-semibold text-slate-700 mb-2">✏️ 改名建议 ({data.suggested_renames.length})</h4>
                  <div className="space-y-1">
                    {data.suggested_renames.map((r, i) => (
                      <div key={i} className="rounded-xl bg-slate-50 px-3 py-2 text-[12px]">
                        <span className="text-slate-800 font-medium">{r.new_name}</span>
                        {r.reason && <span className="text-slate-500 ml-2">— {r.reason}</span>}
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {data.duplicates.length > 0 && (
                <section>
                  <h4 className="text-[12px] font-semibold text-slate-700 mb-2">🔁 重复合并 ({data.duplicates.length} 组)</h4>
                  <div className="text-[11px] text-slate-500">每组保留第 1 个, 其余自动归档。</div>
                </section>
              )}
              {data.groups.length === 0 && data.suggested_renames.length === 0 && data.duplicates.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-[13px]">没有发现需要调整的地方 ✨</div>
              )}
            </div>
          )}
        </div>
        {data && (
          <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
            <button onClick={onClose} className="btn-ghost">取消</button>
            <button
              onClick={onApply}
              disabled={apply.isPending}
              className="btn-primary"
            >
              {apply.isPending ? "应用中..." : "应用全部"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}