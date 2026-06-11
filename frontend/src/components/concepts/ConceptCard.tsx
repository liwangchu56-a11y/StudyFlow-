import type { LearnedConcept } from "../../types/api";
import { useUpdateConcept, useDeleteConcept } from "../../api/concepts";

export function ConceptCard({ concept }: { concept: LearnedConcept }) {
  const update = useUpdateConcept();
  const remove = useDeleteConcept();

  const toggleArchive = () => {
    update.mutate({
      id: concept.id,
      patch: { status: concept.status === "active" ? "archived" : "active" },
    });
  };

  const onDelete = () => {
    if (!confirm(`删除知识点「${concept.name}」?`)) return;
    remove.mutate(concept.id);
  };

  return (
    <div
      className={`rounded-2xl border border-slate-200/60 bg-white p-4 transition hover:-translate-y-0.5 ${
        concept.status === "archived" ? "opacity-60" : ""
      }`}
      style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.8) inset, 0 1px 2px rgba(15,23,42,0.03)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-[14px] font-semibold text-slate-800">{concept.name}</h4>
            {concept.category && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">
                {concept.category}
              </span>
            )}
            {concept.concept_group && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                {concept.concept_group}
              </span>
            )}
          </div>
          <p className="text-[12px] text-slate-500 mt-1.5 leading-relaxed line-clamp-3">
            {concept.description}
          </p>
        </div>
        <div className="flex flex-col gap-1 text-[11px] text-slate-400">
          <button onClick={toggleArchive} className="hover:text-violet-500 transition" title={concept.status === "active" ? "归档" : "恢复"}>
            {concept.status === "active" ? "📥" : "📤"}
          </button>
          <button onClick={onDelete} className="hover:text-rose-500 transition" title="删除">
            ×
          </button>
        </div>
      </div>
    </div>
  );
}