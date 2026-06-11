import React, { useEffect, useRef, useState } from "react";

export interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_LEN = 8000;

export const ChatInput = React.memo(function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  // 自动增高 (确保宽高正确)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 先还原高度, 再测量滚动高度
    el.style.height = 'auto';
    el.style.minHeight = '44px';
    const h = Math.min(el.scrollHeight, 128);
    el.style.height = Math.max(44, h) + 'px';
  }, [text]);

  const send = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const len = text.length;
  const tooLong = len > MAX_LEN;

  return (
    <div className="border-t border-slate-200/60 bg-white/80 backdrop-blur-xl p-3">
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN + 200))}
          onKeyDown={onKey}
          disabled={false}
          placeholder={placeholder ?? "说点什么... (Enter 发送, Shift+Enter 换行)"}
          className="flex-1 min-w-0 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition disabled:opacity-50 max-h-32 min-h-[44px] break-words whitespace-pre-wrap overflow-x-hidden overflow-y-auto"
        />
        <button
          onClick={send}
          disabled={disabled || !text.trim() || tooLong}  // disabled 只控制发送按钮
          className="rounded-2xl px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-br from-violet-500 to-indigo-500 shadow-[0_4px_16px_-4px_rgba(139,92,246,0.4)] disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.99] transition"
        >
          发送
        </button>
      </div>
      {len > MAX_LEN * 0.8 && (
        <div className="text-[11px] text-slate-400 text-center mt-1">
          {len} / {MAX_LEN} 字
        </div>
      )}
    </div>
  );
});