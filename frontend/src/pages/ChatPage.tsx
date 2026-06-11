import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useChatSession,
  useCreateChatSession,
  usePostMessage,
  useExtractConcepts,
  useUpdateChatSessionTitle,
  postMessageStream,
  chatSessionKey,
  chatSessionsKey,
} from "../api/chat";
import { useBulkCreateConcepts } from "../api/concepts";
import { ChatMessage } from "../components/chat/ChatMessage";
import { ChatInput } from "../components/chat/ChatInput";
import { TimerBubble } from "../components/layout/TimerBubble";
import { TodoBubble } from "../components/todos/TodoBubble";
import { useUiStore } from "../store/uiStore";
import type { ChatSessionDetail, ChatMessage as ChatMsg, ExtractedConcept } from "../types/api";



const TITLE_MAX = 60;

export function ChatPage() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [candidates, setCandidates] = useState<ExtractedConcept[] | null>(null);

  const createdRef = useRef(false);
  const qc = useQueryClient();
  const create = useCreateChatSession();
  const updateTitle = useUpdateChatSessionTitle();
  const { data, isLoading } = useChatSession(sessionId);
  const post = usePostMessage(sessionId ?? 0);
  const extract = useExtractConcepts(sessionId ?? 0);
  const bulk = useBulkCreateConcepts();
  const showToast = useUiStore((s) => s.showToast);
  const setDrawerOpen = useUiStore((s) => s.setDrawerOpen);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 首次进入: 没 session 就建一个 (用 ref 防止 StrictMode 重复创建)
  useEffect(() => {
    if (sessionId == null && !createdRef.current) {
      createdRef.current = true;
      create
        .mutateAsync({})
        .then((s) => setSessionId(s.id))
        .catch(() => showToast("创建对话失败"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 监听抽屉里切换 session 事件
  useEffect(() => {
    const onSelect = (e: Event) => {
      const id = (e as CustomEvent<number>).detail;
      abortRef.current?.abort();
      abortRef.current = null;
      setSessionId(id);
    };
    window.addEventListener("chat:select", onSelect);
    return () => window.removeEventListener("chat:select", onSelect);
  }, []);

  // 组件卸载时取消正在进行的流
  useEffect(() => () => abortRef.current?.abort(), []);

  // 消息变化时滚到底
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.length]);

  // 乐观 + 流式: 用户消息先入缓存 (临时 id), AI 占位紧随其后;
  // SSE 流式到达后, 用真实 id + 完整内容替换占位. 失败兜底为非流式 mutation.
  const onSend = async (text: string) => {
    if (!sessionId) return;
    const sid = sessionId;
    const now = new Date().toISOString();
    const tempUserId = -Date.now();
    const tempAssistantId = tempUserId - 1;

    // 乐观插入 (用户消息 + AI 占位)
    qc.setQueryData<ChatSessionDetail>(chatSessionKey(sid), (old) => {
      if (!old) return old;
      const userMsg: ChatMsg = {
        id: tempUserId, session_id: sid, role: "user",
        content: text, meta: null, created_at: now,
      };
      const pendingMsg: ChatMsg = {
        id: tempAssistantId, session_id: sid, role: "assistant",
        content: "", meta: "__pending__", created_at: now,
      };
      return {
        ...old,
        session: { ...old.session, message_count: (old.session.message_count ?? 0) + 2 },
        messages: [...old.messages, userMsg, pendingMsg],
      };
    });

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const removePending = () => {
      qc.setQueryData<ChatSessionDetail>(chatSessionKey(sid), (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.filter((m) => m.id !== tempAssistantId),
          session: { ...old.session, message_count: Math.max(0, (old.session.message_count ?? 1) - 1) },
        };
      });
    };

    const finalizeAssistant = (id: number, full: string) => {
      qc.setQueryData<ChatSessionDetail>(chatSessionKey(sid), (old) => {
        if (!old) return old;
        const messages = old.messages.map((m) => {
          if (m.id === tempAssistantId) {
            return { ...m, id, content: full, meta: null };
          }
          return m;
        });
        return { ...old, messages };
      });
      qc.invalidateQueries({ queryKey: chatSessionKey(sid) });
      qc.invalidateQueries({ queryKey: chatSessionsKey });
    };

    try {
      await postMessageStream(
        sid,
        { content: text },
        {
          onDelta: () => {},
          onDone: ({ id, full }) => finalizeAssistant(id, full),
          onError: (detail) => {
            removePending();
            showToast(detail || "AI 不可用");
          },
        },
        ctrl.signal,
      );
    } catch {
      removePending();
      post.mutate({ content: text });
    }
  };

  const onExtract = async () => {
    if (!sessionId) return;
    try {
      const r = await extract.mutateAsync();
      if (r.concepts.length === 0) {
        showToast("对话里还没发现可提取的知识点");
        return;
      }
      setCandidates(r.concepts);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "提取失败";
      showToast(msg.includes("LLM") || msg.includes("503") ? "AI 不可用" : "提取失败");
    }
  };

  const onConfirmConcepts = async () => {
    if (!candidates || !sessionId) return;
    try {
      await bulk.mutateAsync(
        candidates.map((c) => ({
          name: c.name,
          description: c.description,
          category: c.category ?? null,
          source_session_id: sessionId,
        })),
      );
      showToast(`已保存 ${candidates.length} 个知识点`);
      setCandidates(null);
    } catch {
      showToast("保存失败");
    }
  };

  const commitTitle = () => {
    setEditingTitle(false);
    if (data?.session && titleDraft.trim() && titleDraft !== data.session.title) {
      updateTitle.mutate({ id: data.session.id, title: titleDraft.trim() });
    }
  };

  const session = data?.session;
  const messages = data?.messages ?? [];

  return (
    <div className="relative flex flex-col h-screen w-full">
      {/* 渐变背景 - 跟 PageShell 一致 */}
      <div className="fixed inset-0 -z-10 bg-gradient-page" aria-hidden />
      <div
        className="fixed top-0 left-1/4 w-[600px] h-[600px] -z-10 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(196,181,253,0.4) 0%, transparent 70%)" }}
        aria-hidden
      />
      <div
        className="fixed bottom-0 right-1/4 w-[500px] h-[500px] -z-10 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(165,180,252,0.4) 0%, transparent 70%)" }}
        aria-hidden
      />
      <div className="flex flex-col h-full w-full max-w-3xl mx-auto">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/60 bg-white/50 backdrop-blur-md">
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-violet-600 transition"
          title="菜单"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value.slice(0, TITLE_MAX))}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setEditingTitle(false);
                  setTitleDraft(session?.title ?? "");
                }
              }}
              className="text-[15px] font-semibold text-slate-800 outline-none border-b border-violet-400 bg-transparent w-full"
            />
          ) : (
            <button
              onClick={() => {
                setTitleDraft(session?.title ?? "");
                setEditingTitle(true);
              }}
              className="text-[15px] font-semibold text-slate-800 truncate hover:text-violet-600 transition max-w-full"
            >
              {session?.title || "新对话"}
            </button>
          )}
          <div className="text-[10px] text-slate-400 mt-0.5">
            {messages.length} 条消息
          </div>
        </div>
        <button
          onClick={onExtract}
          disabled={extract.isPending || messages.length < 2}
          className="rounded-full px-3 py-1.5 text-[12px] text-white bg-gradient-to-br from-violet-500 to-indigo-500 disabled:opacity-40 hover:scale-105 transition"
          title="从这次对话里提取我学到的知识点"
        >
          ✨ 整理学到的
        </button>
        <button
          onClick={async () => {
            const s = await create.mutateAsync({});
            setSessionId(s.id);
          }}
          className="rounded-full px-3 py-1.5 text-[12px] bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          + 新对话
        </button>
      </header>

      <div className="flex items-center justify-between px-4 py-1.5 border-b border-slate-200/60 bg-white/40 backdrop-blur-sm">
        <TimerBubble />
        <TodoBubble />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading && <div className="text-center text-slate-400 text-[12px] py-8">加载中...</div>}
        {!isLoading && messages.length === 0 && <EmptyHint />}
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
        <div ref={messagesEnd} />
      </div>

      <ChatInput
        onSend={(t) => { void onSend(t); }}
        disabled={!sessionId}
        placeholder="和你的 AI 教练聊聊今天学了什么..."
      />

      {candidates && (
        <ExtractDialog
          candidates={candidates}
          onCancel={() => setCandidates(null)}
          onConfirm={onConfirmConcepts}
        />
      )}
      </div>

    </div>
  );
}

const QUOTES: { text: string; by: string }[] = [
  { text: "学而时习之, 不亦说乎。", by: "孔子" },
  { text: "千里之行, 始于足下。", by: "老子" },
  { text: "不积跬步, 无以至千里; 不积小流, 无以成江海。", by: "荀子" },
  { text: "种一棵树最好的时间是十年前, 其次是现在。", by: "非洲谚语" },
  { text: "Stay hungry, stay foolish.", by: "Steve Jobs" },
  { text: "慢慢来, 比较快。", by: "雷军" },
  { text: "你学的每一个知识, 都在让你成为未来的你。", by: "" },
  { text: "今日不肯埋头, 明日何以抬头。", by: "" },
  { text: "凡是过往, 皆为序章。", by: "莎士比亚" },
  { text: "把眼前的事情做到极致, 下一步自然会出现。", by: "" },
];

function pickQuote(): { text: string; by: string } {
  // 用日期作种子, 同一天显示同一句 (避免每次刷新都换, 显得乱)
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return QUOTES[seed % QUOTES.length];
}

function EmptyHint() {
  const q = pickQuote();
  return (
    <div className="flex items-center justify-center h-full px-6">
      <div className="max-w-xl text-center">
        <div className="text-[11px] uppercase tracking-[0.25em] text-violet-500/80 mb-4">
          today
        </div>
        <blockquote className="text-display text-[24px] sm:text-[28px] leading-[1.4] text-slate-800 font-medium tracking-tight">
          “{q.text}”
        </blockquote>
        {q.by && (
          <div className="text-[12px] text-slate-400 mt-5 tracking-wider">
            — {q.by}
          </div>
        )}
      </div>
    </div>
  );
}

function ExtractDialog({
  candidates,
  onCancel,
  onConfirm,
}: {
  candidates: ExtractedConcept[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-lg max-h-[80vh] rounded-3xl bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-[15px] font-semibold text-slate-800">✨ AI 整理出 {candidates.length} 个知识点</h3>
          <p className="text-[12px] text-slate-500 mt-1">确认后存入长期记忆, 之后所有对话会自动带上这些上下文。</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {candidates.map((c, i) => (
            <div key={i} className="rounded-xl bg-slate-50 border border-slate-200/60 px-3 py-2">
              <div className="text-[13px] font-medium text-slate-800">{c.name}</div>
              <div className="text-[12px] text-slate-500 mt-1">{c.description}</div>
              {c.category && (
                <span className="inline-block text-[10px] mt-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">
                  {c.category}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost">取消</button>
          <button onClick={onConfirm} className="btn-primary">全部保存</button>
        </div>
      </div>
    </div>
  );
}