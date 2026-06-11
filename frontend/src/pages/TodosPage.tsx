import { TodoList } from "../components/todos/TodoList";

export function TodosPage() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="space-y-2">
        <div className="text-eyebrow">TASKS</div>
        <h1 className="text-display text-[clamp(2rem,4vw,3.25rem)] text-slate-900">
          要做什么, <span className="italic font-serif text-violet-600">一件件</span>来.
        </h1>
        <p className="text-sm text-slate-500">按优先级排序, 完成时勾选</p>
      </header>
      <TodoList />
    </div>
  );
}