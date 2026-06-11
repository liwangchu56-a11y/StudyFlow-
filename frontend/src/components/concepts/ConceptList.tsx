import { useState } from "react";
import { useConcepts, useConceptGroups } from "../../api/concepts";
import { ConceptCard } from "./ConceptCard";
import { ReorganizeDialog } from "./ReorganizeDialog";
import type { ConceptStatus } from "../../types/api";

const STATUS_OPTIONS: { value: ConceptStatus | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "active", label: "活跃" },
  { value: "archived", label: "已归档" },
];

export function ConceptList() {
  const [status, setStatus] = useState<ConceptStatus | "all">("active");
  const [group, setGroup] = useState<string>("");
  const [q, setQ] = useState("");
  const [showReorganize, setShowReorganize] = useState(false);

  const { data: groups } = useConceptGroups();
  const { data, isLoading } = useConcepts({
    status: status === "all" ? undefined : status,
    concept_group: group || undefined,
    q: q || undefined,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200/60 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            知识图谱
          </div>
          <button
            onClick={() => setShowReorganize(true)}
            className="text-[12px] rounded-full px-3 py-1 bg-gradient-to-r from-violet-500 to-indigo-500 text-white hover:scale-105 transition"
            title="AI 重新聚类 / 找重复 / 建议改名"
          >
            ✨ 重新整理
          </button>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索..."
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] outline-none focus:border-violet-400"
        />
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setStatus(o.value)}
              className={`text-[11px] rounded-full px-2.5 py-1 transition ${
                status === o.value
                  ? "bg-violet-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {groups && groups.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setGroup("")}
              className={`text-[10px] rounded-full px-2 py-0.5 transition ${
                !group ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              全部组
            </button>
            {groups.map((g) => (
              <button
                key={g}
                onClick={() => setGroup(g === group ? "" : g)}
                className={`text-[10px] rounded-full px-2 py-0.5 transition ${
                  g === group ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading && <div className="text-[12px] text-slate-400">加载中...</div>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <div className="text-[12px] text-slate-400 text-center py-8">
            还没有知识点。聊完天后用「✨ AI 整理」自动提取, 或手动添加。
          </div>
        )}
        {data?.map((c) => <ConceptCard key={c.id} concept={c} />)}
      </div>
      {showReorganize && <ReorganizeDialog onClose={() => setShowReorganize(false)} />}
    </div>
  );
}