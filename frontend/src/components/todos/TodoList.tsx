import { useState } from "react";
import { useTodos, useCreateTodo, useUpdateTodo, useDeleteTodo } from "../../api/todos";
import { priorityText } from "../../lib/format";

const priorityMeta: Record<0 | 1 | 2, { label: string; color: string; dot: string }> = {
  0: { label: "高", color: "text-rose-600", dot: "bg-rose-500" },
  1: { label: "中", color: "text-amber-600", dot: "bg-amber-500" },
  2: { label: "低", color: "text-slate-400", dot: "bg-slate-300" },
};

export function TodoList() {
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const { data: todos = [] } = useTodos(filter);
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<0 | 1 | 2>(1);

  const handleAdd = async () => {
    if (!title.trim()) return;
    await createTodo.mutateAsync({ title, priority });
    setTitle("");
  };

  return (
    <div className="space-y-6">
      <section className="card-elevated p-5">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="下一件事是什么?"
            className="flex-1 rounded-full border border-slate-200/80 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300/60 focus:border-violet-300 transition"
          />
          <div className="flex gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) as 0 | 1 | 2)}
              className="rounded-full border border-slate-200/80 bg-white/60 px-3 py-2.5 text-sm focus:outline-none"
            >
              <option value={0}>高优先级</option>
              <option value={1}>中优先级</option>
              <option value={2}>低优先级</option>
            </select>
            <button onClick={handleAdd} className="btn-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              添加
            </button>
          </div>
        </div>
      </section>

      <section className="flex gap-2">
        {([
          ["all", "全部"],
          ["pending", "未完成"],
          ["completed", "已完成"],
        ] as const).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
              filter === f
                ? "bg-slate-900 text-white"
                : "bg-white/60 border border-slate-200/80 text-slate-600 hover:border-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
      </section>

      <section className="space-y-2">
        {todos.length === 0 ? (
          <div className="card-elevated p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="3" width="16" height="18" rx="2.5" />
                <path d="M8 9l2.5 2.5L15 7" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">暂无待办</p>
          </div>
        ) : (
          todos.map((t) => {
            const meta = priorityMeta[t.priority];
            return (
              <div
                key={t.id}
                className={`group card-elevated p-4 flex items-center gap-3 transition ${
                  t.completed ? "opacity-50" : ""
                }`}
                style={{ animation: "fadeInUp 0.3s ease-out" }}
              >
                <button
                  onClick={() => updateTodo.mutate({ id: t.id, completed: !t.completed })}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                    t.completed
                      ? "bg-violet-500 border-violet-500"
                      : "border-slate-300 hover:border-violet-400"
                  }`}
                  aria-label={t.completed ? "标记为未完成" : "标记为完成"}
                >
                  {t.completed && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${t.completed ? "line-through text-slate-400" : "text-slate-900"} truncate`}>
                    {t.title}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    <span className={`text-xs ${meta.color}`}>{meta.label}优先级</span>
                  </div>
                </div>
                <button
                  onClick={() => deleteTodo.mutate(t.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 text-sm transition"
                  aria-label="删除"
                >
                  删除
                </button>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}