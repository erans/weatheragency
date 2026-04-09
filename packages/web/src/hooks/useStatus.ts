import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export function useStatus() {
  return useQuery({
    queryKey: ["status"],
    queryFn: api.getStatus,
    refetchInterval: 30_000,
  });
}
