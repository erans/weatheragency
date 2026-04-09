import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export function useModel(id: string) {
  return useQuery({
    queryKey: ["model", id],
    queryFn: () => api.getModel(id),
    enabled: !!id,
  });
}

export function useAnalytics(
  id: string,
  params?: { period?: string; endpoint_id?: string }
) {
  return useQuery({
    queryKey: ["analytics", id, params],
    queryFn: () => api.getAnalytics(id, params),
    enabled: !!id,
    refetchInterval: 60_000,
  });
}
