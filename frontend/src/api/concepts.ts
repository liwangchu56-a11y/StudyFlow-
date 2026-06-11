import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { ConceptStatus, LearnedConcept, ReorganizeResponse } from "../types/api";

export const conceptsKey = ["concepts"] as const;
export const conceptGroupsKey = ["concept-groups"] as const;

export interface ConceptsQuery {
  status?: ConceptStatus;
  concept_group?: string;
  category?: string;
  q?: string;
}

export function useConcepts(q?: ConceptsQuery) {
  const params = new URLSearchParams();
  if (q?.status) params.set("status", q.status);
  if (q?.concept_group) params.set("concept_group", q.concept_group);
  if (q?.category) params.set("category", q.category);
  if (q?.q) params.set("q", q.q);
  const qs = params.toString();
  return useQuery({
    queryKey: [...conceptsKey, qs] as const,
    queryFn: () => api.get<LearnedConcept[]>(`/concepts${qs ? `?${qs}` : ""}`),
  });
}

export function useConceptGroups() {
  return useQuery({
    queryKey: conceptGroupsKey,
    queryFn: () => api.get<string[]>(`/concepts/groups`),
  });
}

export interface CreateConceptPayload {
  name: string;
  description: string;
  category?: string | null;
  concept_group?: string | null;
  source_session_id?: number | null;
  source_message_ids?: number[] | null;
}

export function useCreateConcept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateConceptPayload) =>
      api.post<LearnedConcept>(`/concepts`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: conceptsKey });
      qc.invalidateQueries({ queryKey: conceptGroupsKey });
    },
  });
}

export function useBulkCreateConcepts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: CreateConceptPayload[]) =>
      api.post<LearnedConcept[]>(`/concepts/bulk`, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: conceptsKey });
      qc.invalidateQueries({ queryKey: conceptGroupsKey });
    },
  });
}

export interface UpdateConceptPayload {
  id: number;
  patch: Partial<{
    name: string;
    description: string;
    category: string | null;
    concept_group: string | null;
    status: ConceptStatus;
  }>;
}

export function useUpdateConcept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: UpdateConceptPayload) =>
      api.patch<LearnedConcept>(`/concepts/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: conceptsKey });
      qc.invalidateQueries({ queryKey: conceptGroupsKey });
    },
  });
}

export function useDeleteConcept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/concepts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: conceptsKey });
      qc.invalidateQueries({ queryKey: conceptGroupsKey });
    },
  });
}

export function useReorganizeConcepts() {
  return useMutation({
    mutationFn: () => api.post<ReorganizeResponse>(`/concepts/reorganize`, {}),
  });
}

export function useApplyReorganize() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReorganizeResponse) =>
      api.post<{ affected: number }>(`/concepts/apply-reorganize`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: conceptsKey });
      qc.invalidateQueries({ queryKey: conceptGroupsKey });
    },
  });
}