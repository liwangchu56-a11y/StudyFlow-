import type { ChatMessage as Msg } from "../../types/api";

/** 极简 markdown-ish 渲染: 支持 ```code``` 代码块, 段落换行, 自动转义其他. */
function renderContent(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /```([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(renderParagraphs(text.slice(last, m.index), `p-${i}`));
    }
    parts.push(
      <pre
        key={`code-${i}`}
        className="my-2 rounded-xl bg-slate-900/95 text-slate-100 px-4 py-3 text-[13px] overflow-x-auto font-mono"
      >
        <code>{m[1].trim()}</code>
      </pre>,
    );
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) {
    parts.push(renderParagraphs(text.slice(last), `p-${i}`));
  }
  return <>{parts}</>;
}

function renderParagraphs(text: string, key: string): React.ReactNode {
  return (
    <span key={key} className="whitespace-pre-wrap leading-relaxed">
      {text}
    </span>
  );
}

export function ChatMessage({ message }: { message: Msg }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isPending = message.meta === "__pending__";

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-3 py-1">
          {message.content}
        </div>
      </div>
    );
  }

  // 乐观插入 / 流式中: 还没有任何内容, 显示三个跳动的小点
  if (isPending && !message.content) {
    return (
      <div className="flex justify-start my-2">
        <div className="rounded-2xl px-4 py-3 bg-white border border-slate-200/60 shadow-sm flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: "0.15s" }} />
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: "0.3s" }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} my-2`}>
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-[14px] ${
          isUser
            ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-[0_4px_16px_-4px_rgba(139,92,246,0.4)]"
            : "bg-white text-slate-800 border border-slate-200/60 shadow-sm"
        } ${isPending ? "animate-pulse-soft" : ""}`}
      >
        {renderContent(message.content)}
        {isPending && (
          <span className="inline-block w-1.5 h-3 ml-0.5 align-middle bg-violet-400 animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  );
}