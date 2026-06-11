import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Todo } from "../types/api";

export const todosKey = ["todos"] as const;

export function useTodos(status: "all" | "pending" | "completed" = "all") {
  return useQuery({
    queryKey: [...todosKey, status],
    queryFn: () => api.get<Todo[]>(`/todos?status=${status}`),
  });
}

export function useCreateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { title: string; priority?: 0 | 1 | 2; due_at?: string }) =>
      api.post<Todo>("/todos", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: todosKey });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useUpdateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<Todo> & { id: number }) =>
      api.patch<Todo>(`/todos/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: todosKey });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useDeleteTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/todos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: todosKey });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}