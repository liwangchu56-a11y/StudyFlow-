import { useChatSessions, useCreateChatSession, useDeleteChatSession } from "../../api/chat";
import { useUiStore } from "../../store/uiStore";

export interface ChatSessionListProps {
  activeId: number | null;
  onSelect: (id: number) => void;
}

export function ChatSessionList({ activeId, onSelect }: ChatSessionListProps) {
  const { data, isLoading } = useChatSessions();
  const create = useCreateChatSession();
  const remove = useDeleteChatSession();
  const showToast = useUiStore((s) => s.showToast);

  const onNew = async () => {
    try {
      const s = await create.mutateAsync({});
      onSelect(s.id);
    } catch {
      showToast("新建会话失败");
    }
  };

  const onDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("删除这个对话?消息也会一起删除。")) return;
    try {
      await remove.mutateAsync(id);
      if (activeId === id) onSelect(-1 as unknown as number);
    } catch {
      showToast("删除失败");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60">
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          对话历史
        </div>
        <button
          onClick={onNew}
          className="text-[12px] rounded-full px-3 py-1 bg-violet-500 text-white hover:bg-violet-600 transition"
        >
          + 新建
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="p-4 text-[12px] text-slate-400">加载中...</div>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <div className="p-4 text-[12px] text-slate-400">还没有对话, 点右上角新建一个吧</div>
        )}
        {data?.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`w-full text-left px-4 py-3 border-b border-slate-100 flex items-center justify-between group hover:bg-slate-50 transition ${
              activeId === s.id ? "bg-violet-50/60" : ""
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-slate-800 truncate">
                {s.title || `对话 ${s.id}`}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {new Date(s.updated_at).toLocaleString("zh-CN", { hour12: false })}
                {s.message_count != null && ` · ${s.message_count} 条`}
              </div>
            </div>
            <span
              onClick={(e) => onDelete(e, s.id)}
              role="button"
              tabIndex={0}
              className="ml-2 text-slate-300 hover:text-rose-500 text-[14px] opacity-0 group-hover:opacity-100 transition"
            >
              ×
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}