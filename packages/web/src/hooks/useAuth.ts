import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { MagicLinkRequest } from "@weatheragency/shared";

export function useAuth() {
  const queryClient = useQueryClient();
  const token = localStorage.getItem("wa_token");

  const me = useQuery({
    queryKey: ["me"],
    queryFn: api.getMe,
    enabled: !!token,
    retry: false,
  });

  const requestMagicLink = useMutation({
    mutationFn: (body: MagicLinkRequest) => api.requestMagicLink(body),
  });

  const verifyMagicLink = useMutation({
    mutationFn: (token: string) => api.verifyMagicLink(token),
    onSuccess: (data) => {
      localStorage.setItem("wa_token", data.token);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const logout = () => {
    localStorage.removeItem("wa_token");
    queryClient.invalidateQueries({ queryKey: ["me"] });
  };

  const regenerateToken = useMutation({
    mutationFn: api.regenerateToken,
    onSuccess: (data) => {
      localStorage.setItem("wa_token", data.token);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  return {
    user: me.data,
    isLoggedIn: !!token && !!me.data,
    isLoading: me.isLoading,
    requestMagicLink,
    verifyMagicLink,
    logout,
    regenerateToken,
  };
}
