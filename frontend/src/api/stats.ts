import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { DailyPoint, Stats } from "../types/api";

export const statsKey = ["stats"] as const;
export const trendKey = ["stats", "trend"] as const;

export function useStats() {
  return useQuery({
    queryKey: statsKey,
    queryFn: () => api.get<Stats>("/stats"),
    refetchInterval: 30 * 1000,
  });
}

export function useDailyTrend(days = 30) {
  return useQuery({
    queryKey: [...trendKey, days],
    queryFn: () => api.get<DailyPoint[]>(`/stats/trend?days=${days}`),
  });
}