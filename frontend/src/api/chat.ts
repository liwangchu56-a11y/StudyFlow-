import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  ChatMessage,
  ChatSession,
  ChatSessionDetail,
  ExtractConceptsResponse,
  PostMessageResponse,
} from "../types/api";

export const chatSessionsKey = ["chat-sessions"] as const;
export const chatSessionKey = (id: number) => ["chat-sessions", id] as const;

export function useChatSessions() {
  return useQuery({
    queryKey: chatSessionsKey,
    queryFn: () => api.get<ChatSession[]>("/chat/sessions"),
  });
}

export function useChatSession(id: number | null) {
  return useQuery({
    queryKey: id ? chatSessionKey(id) : ["chat-sessions", "none"],
    queryFn: () => api.get<ChatSessionDetail>(`/chat/sessions/${id}`),
    enabled: id != null,
  });
}

export function useCreateChatSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload?: { title?: string; study_session_id?: number }) =>
      api.post<ChatSession>("/chat/sessions", payload ?? {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: chatSessionsKey }),
  });
}

export function useUpdateChatSessionTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      api.patch<ChatSession>(`/chat/sessions/${id}`, { title }),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: chatSessionsKey });
      qc.invalidateQueries({ queryKey: chatSessionKey(id) });
    },
  });
}

export function useDeleteChatSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/chat/sessions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: chatSessionsKey }),
  });
}

export function usePostMessage(sessionId: number) {
  const qc = useQueryClient();
  return useMutation<
    PostMessageResponse,
    Error,
    { content: string; context?: string }
  >({
    mutationFn: (payload) =>
      api.post<PostMessageResponse>(
        `/chat/sessions/${sessionId}/messages`,
        payload,
      ),

    onError: () => {
      // 用户消息已存入 DB, 只是回复失败; 刷新页面即可看到真实数据
      qc.invalidateQueries({ queryKey: chatSessionKey(sessionId) });
    },

    onSuccess: (data) => {
      // 用真实数据替换整个 cache（覆盖旧的乐观数据）
      qc.setQueryData<ChatSessionDetail>(chatSessionKey(sessionId), (old) => {
        if (!old) return old;
        // 过滤掉所有临时 ID（负值）和 pending 占位符
        const dedup = old.messages.filter(
          (m) => m.id > 0 && m.meta !== '__pending__' && m.id !== data.user.id && m.id !== data.assistant.id,
        );
        return {
          ...old,
          session: { ...old.session, message_count: dedup.length + 2 },
          messages: [...dedup, data.user, data.assistant],
        };
      });
      qc.invalidateQueries({ queryKey: chatSessionsKey });
      qc.invalidateQueries({ queryKey: chatSessionKey(sessionId) });
    },
  });
}

// ====== SSE ��ʽ���� ======

export interface StreamCallbacks {
  onUser?: (user: { id: number; role: string }) => void;
  onDelta: (piece: string) => void;
  onDone?: (info: { id: number; full: string }) => void;
  onError?: (detail: string) => void;
}

/**
 * ͨ�� SSE ��ʽ������Ϣ. �ڶ���/����ʧ��ʱ�׳� Error ���ϲ㶵��Ϊ����ʽ mutation.
 */
export async function postMessageStream(
  sessionId: number,
  payload: { content: string; context?: string },
  cb: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`/api/chat/sessions/${sessionId}/messages/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok || !res.body) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";

  const dispatch = (eventName: string, dataLine: string) => {
    if (!dataLine) return;
    let parsed: any;
    try { parsed = JSON.parse(dataLine); } catch { return; }
    if (eventName === "user") cb.onUser?.(parsed);
    else if (eventName === "delta") cb.onDelta(parsed.content ?? "");
    else if (eventName === "done") cb.onDone?.(parsed);
    else if (eventName === "error") cb.onError?.(parsed.detail ?? "stream error");
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const rawEvent = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const lines = rawEvent.split("\n");
      let ev = "";
      let data = "";
      for (const ln of lines) {
        if (ln.startsWith("event: ")) ev = ln.slice(7).trim();
        else if (ln.startsWith("data: ")) data += (data ? "\n" : "") + ln.slice(6);
      }
      if (ev && data) {
        dispatch(ev, data);
        if (ev === "error" || ev === "done") return;
      }
    }
  }
}

export function useExtractConcepts(sessionId: number) {
  return useMutation({
    mutationFn: () =>
      api.post<ExtractConceptsResponse>(
        `/chat/sessions/${sessionId}/extract-concepts`,
        {},
      ),
  });
}