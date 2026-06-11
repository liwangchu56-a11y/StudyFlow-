import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { QACase, StudySession } from "../types/api";

export const sessionsKey = ["sessions"] as const;

export function useSessions() {
  return useQuery({
    queryKey: sessionsKey,
    queryFn: () => api.get<StudySession[]>("/sessions?limit=100"),
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      mode: "free" | "pomodoro";
      started_at: string;
      ended_at: string;
      duration_sec: number;
      focus_count: number;
      note?: string;
      summary?: string;
      summary_structured?: Record<string, unknown>;
      auto_qa?: QACase[];
    }) => api.post<StudySession>("/sessions", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sessionsKey });
      qc.invalidateQueries({ queryKey: ["cards"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function usePatchSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: number; note?: string; summary?: string }) =>
      api.patch<StudySession>(`/sessions/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionsKey }),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/sessions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionsKey }),
  });
}