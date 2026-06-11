import { useState, useRef } from "react";
import { useTodos, useCreateTodo, useUpdateTodo, useDeleteTodo } from "../../api/todos";

// \u4f18\u5148\u7ea7 -> \u989c\u8272
const PRI_COLOR: Record<0 | 1 | 2, string> = {
  0: "bg-rose-500",
  1: "bg-amber-500",
  2: "bg-blue-500",
};
const PRI_LABEL: Record<0 | 1 | 2, string> = {
  0: "高",
  1: "中",
  2: "低",
};

const ORDER: (0 | 1 | 2)[] = [1, 0, 2]; // \u9ed8\u8ba4\u4e2d -> \u9ad8 -> \u4f4e -> \u4e2d

export function TodoBubble() {
  const { data: todos = [] } = useTodos("pending");
  const cr = useCreateTodo();
  const up = useUpdateTodo();
  const del = useDeleteTodo();
  const [t, setT] = useState("");
  const [prIdx, setPrIdx] = useState(0); // \u5728 ORDER \u4e2d\u7684\u7d22\u5f15
  const inp = useRef<HTMLInputElement>(null);

  const cyclePriority = () => setPrIdx((i) => (i + 1) % ORDER.length);
  const pr = ORDER[prIdx];

  const add = async () => {
    const v = t.trim();
    if (!v) return;
    await cr.mutateAsync({ title: v, priority: pr });
    setT("");
    inp.current?.focus();
  };

  const empty = todos.length === 0;

  return (
    <div
      className={[
        "relative rounded-2xl bg-white/90 backdrop-blur-xl border border-white/60",
        "w-[240px] h-[112px]",
        "shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)]",
        "hover:shadow-[0_8px_28px_-6px_rgba(16,185,129,0.22)]",
        "transition-all duration-300",
        "flex flex-col overflow-hidden",
      ].join(" ")}
    >
      {/* \u5934\u90e8 */}
      <div className="flex items-center gap-1.5 px-2.5 pt-1 pb-0.5 flex-shrink-0">
        <span className="text-[12px] leading-none">{"\u{1F4CB}"}</span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">
          TODOS
        </span>
        <span
          className={[
            "ml-auto inline-flex items-center justify-center min-w-[18px] h-[16px] px-1 rounded-full text-[9px] font-bold tabular-nums",
            empty
              ? "bg-slate-100 text-slate-400"
              : "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm",
          ].join(" ")}
        >
          {todos.length}
        </span>
      </div>

      {/* \u6e05\u5355\u533a */}
      <div
        className="flex-1 min-h-0 overflow-y-auto no-scrollbar"
        onWheel={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight > el.clientHeight) {
            el.scrollTop += e.deltaY;
            e.stopPropagation();
          }
        }}
      >
        {empty ? (
          <div className="h-full flex items-center justify-center text-[10px] text-slate-400 italic px-2">
            {"\u{1F338}"} 今天没什么要做的
          </div>
        ) : (
          <ul className="space-y-px py-px">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="group flex items-center gap-2 py-px pr-1"
              >
                <button
                  onClick={() => up.mutate({ id: todo.id, completed: true })}
                  className="w-3.5 h-3.5 rounded-full border-[1.5px] border-slate-300 hover:border-emerald-500 flex items-center justify-center transition flex-shrink-0 hover:bg-emerald-50 ml-1"
                  aria-label="完成"
                  title="完成 (移到已完成)"
                />
                <span
                  className={"w-1.5 h-1.5 rounded-full flex-shrink-0 " + PRI_COLOR[todo.priority]}
                  title={"优先级: " + PRI_LABEL[todo.priority]}
                />
                <span className="flex-1 text-[11px] text-slate-700 truncate group-hover:text-slate-900 transition leading-tight">
                  {todo.title}
                </span>
                <button
                  onClick={() => del.mutate(todo.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 text-[11px] transition w-3.5 h-3.5 flex items-center justify-center flex-shrink-0"
                  aria-label="删除"
                  title="永久删除"
                >
                  {"\u00D7"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* \u6dfb\u52a0\u533a: \u5355\u5706\u70b9\u70b9\u51fb\u5faa\u73af\u5207\u6362\u989c\u8272 */}
      <div className="flex items-center gap-1.5 px-2.5 pb-1 pt-0.5 flex-shrink-0 border-t border-slate-100/60">
        <button
          onClick={cyclePriority}
          className={[
            "w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300",
            "ring-2 ring-white shadow-sm",
            "hover:scale-125 active:scale-95",
            PRI_COLOR[pr],
          ].join(" ")}
          aria-label={"优先级: " + PRI_LABEL[pr]}
          title={"优先级: " + PRI_LABEL[pr] + " (点击切换)"}
        />
        <input
          ref={inp}
          value={t}
          onChange={(e) => setT(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="加一件事 ..."
          className="flex-1 min-w-0 rounded-md border border-slate-200 bg-white/70 px-1.5 py-0.5 text-[11px] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
        />
        <button
          onClick={add}
          disabled={!t.trim() || cr.isPending}
          className="rounded-md w-5 h-5 flex items-center justify-center text-white text-[12px] leading-none bg-gradient-to-br from-emerald-500 to-teal-500 disabled:opacity-30 hover:scale-110 active:scale-95 transition"
          aria-label="添加"
        >
          +
        </button>
      </div>
    </div>
  );
}
