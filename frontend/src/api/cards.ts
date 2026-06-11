import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { QACard, QACase } from "../types/api";

export const cardsKey = ["cards"] as const;
export const reviewKey = ["cards", "review"] as const;

export function useCards(params?: { tag?: string; favorited?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.tag) qs.set("tag", params.tag);
  if (params?.favorited !== undefined) qs.set("favorited", String(params.favorited));
  const path = "/cards" + (qs.toString() ? "?" + qs : "");
  return useQuery({
    queryKey: [...cardsKey, params ?? {}],
    queryFn: () => api.get<QACard[]>(path),
  });
}

export function useReviewQueue() {
  return useQuery({
    queryKey: reviewKey,
    queryFn: () => api.get<QACard[]>("/cards/review"),
  });
}

export function useCreateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: QACase & { source?: "manual" | "ai" | "session"; session_id?: number }) =>
      api.post<QACard>("/cards", { source: "manual", ...payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cardsKey });
      qc.invalidateQueries({ queryKey: reviewKey });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useUpdateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<QACard> & { id: number }) =>
      api.patch<QACard>(`/cards/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cardsKey });
      qc.invalidateQueries({ queryKey: reviewKey });
    },
  });
}

export function useReviewCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, passed }: { id: number; passed: boolean }) =>
      api.post<QACard>(`/cards/${id}/review`, { passed }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cardsKey });
      qc.invalidateQueries({ queryKey: reviewKey });
    },
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/cards/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cardsKey });
      qc.invalidateQueries({ queryKey: reviewKey });
    },
  });
}