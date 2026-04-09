import type {
  StatusResponse,
  ReportsResponse,
  ModelDetail,
  AnalyticsResponse,
  ModelsResponse,
  AuthMeResponse,
  MagicLinkRequest,
  MagicLinkResponse,
  VerifyMagicLinkResponse,
  RegenerateTokenResponse,
  CreateReportRequest,
  CreateReportResponse,
  SuggestModelRequest,
  SuggestModelResponse,
} from "@weatheragency/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "https://api.weather.agency";

function getToken(): string | null {
  return localStorage.getItem("wa_token");
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getStatus: () => apiFetch<StatusResponse>("/api/status"),

  getReports: (params?: { model_id?: string; endpoint_id?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.model_id) qs.set("model_id", params.model_id);
    if (params?.endpoint_id) qs.set("endpoint_id", params.endpoint_id);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    return apiFetch<ReportsResponse>(`/api/reports?${qs}`);
  },

  getModels: (params?: { provider?: string }) => {
    const qs = new URLSearchParams();
    if (params?.provider) qs.set("provider", params.provider);
    return apiFetch<ModelsResponse>(`/api/models?${qs}`);
  },

  getModel: (id: string) => apiFetch<ModelDetail>(`/api/models/${id}`),

  getAnalytics: (id: string, params?: { period?: string; endpoint_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.period) qs.set("period", params.period);
    if (params?.endpoint_id) qs.set("endpoint_id", params.endpoint_id);
    return apiFetch<AnalyticsResponse>(`/api/models/${id}/analytics?${qs}`);
  },

  suggestModel: (body: SuggestModelRequest) =>
    apiFetch<SuggestModelResponse>("/api/models/suggest", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  createReport: (body: CreateReportRequest) =>
    apiFetch<CreateReportResponse>("/api/reports", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  requestMagicLink: (body: MagicLinkRequest) =>
    apiFetch<MagicLinkResponse>("/api/auth/magic-link", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  verifyMagicLink: (token: string) =>
    apiFetch<VerifyMagicLinkResponse>(`/api/auth/verify?token=${encodeURIComponent(token)}`),

  getMe: () => apiFetch<AuthMeResponse>("/api/auth/me"),

  regenerateToken: () =>
    apiFetch<RegenerateTokenResponse>("/api/auth/regenerate-token", {
      method: "POST",
    }),
};
