import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { RegisterRequest, LoginRequest } from "@weatheragency/shared";

export function useAuth() {
  const queryClient = useQueryClient();
  const token = localStorage.getItem("wa_token");

  const me = useQuery({
    queryKey: ["me"],
    queryFn: api.getMe,
    enabled: !!token,
    retry: false,
  });

  const register = useMutation({
    mutationFn: (body: RegisterRequest) => api.register(body),
    onSuccess: (data) => {
      localStorage.setItem("wa_token", data.token);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const login = useMutation({
    mutationFn: (body: LoginRequest) => api.login(body),
    onSuccess: (_data, variables) => {
      localStorage.setItem("wa_token", variables.token);
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
    register,
    login,
    logout,
    regenerateToken,
  };
}
