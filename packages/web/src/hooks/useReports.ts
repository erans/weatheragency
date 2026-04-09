import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export function useReports(params?: {
  model_id?: string;
  endpoint_id?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["reports", params],
    queryFn: () => api.getReports(params),
    refetchInterval: 30_000,
  });
}
