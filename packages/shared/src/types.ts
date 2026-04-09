// --- Domain Models ---

export interface Provider {
  id: string;
  name: string;
  status_page_url: string | null;
  status_page_type: string | null;
  created_at: string;
}

export interface Model {
  id: string;
  provider: string;
  name: string;
  slug: string;
  is_curated: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface Endpoint {
  id: string;
  model_id: string;
  hosting_provider: string;
  is_official: number;
  label: string;
  status_page_url: string | null;
  is_curated: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface Report {
  id: string;
  endpoint_id: string;
  status: "working" | "degraded" | "down" | null;
  quality: "good" | "poor" | "unusable" | null;
  body: string | null;
  harness: string | null;
  harness_version: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  user_id: string | null;
  ip_hash: string;
  created_at: string;
}

export interface HealthSnapshot {
  id: string;
  endpoint_id: string;
  score: number;
  availability_score: number;
  quality_score: number;
  report_count: number;
  working: number;
  degraded: number;
  down: number;
  quality_good: number;
  quality_poor: number;
  quality_unusable: number;
  provider_status: string | null;
  window_start: string;
  window_end: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  api_token: string;
  trust_score: number;
  created_at: string;
}

// --- API Request Types ---

export interface CreateReportRequest {
  endpoint_id?: string;
  model_id?: string;
  hosting_provider?: string;
  status?: "working" | "degraded" | "down";
  quality?: "good" | "poor" | "unusable";
  body?: string;
  harness?: string;
  harness_version?: string;
}

export interface SuggestModelRequest {
  provider: string;
  name: string;
  slug?: string;
  hosting_provider?: string;
  hosting_label?: string;
}

export interface RegisterRequest {
  email: string;
  name?: string;
}

export interface MagicLinkRequest {
  email: string;
  name?: string;
  turnstileToken: string;
}

export interface MagicLinkResponse {
  sent: boolean;
}

export interface VerifyMagicLinkRequest {
  token: string;
}

export interface VerifyMagicLinkResponse {
  user: User;
  token: string;
}

// --- API Response Types ---

export type Trend = "improving" | "stable" | "declining";

export interface EndpointHealth {
  id: string;
  label: string;
  hosting_provider: string;
  is_official: number;
  score: number;
  availability_score: number;
  quality_score: number;
  trend: Trend;
  report_count: number;
}

export interface ModelStatus {
  id: string;
  name: string;
  provider: string;
  slug: string;
  worst_score: number;
  worst_dimension: "availability" | "quality";
  worst_endpoint: string;
  trend: Trend;
  report_count: number;
  endpoints: EndpointHealth[];
}

export interface StatusResponse {
  models: ModelStatus[];
}

export interface PublicReport {
  id: string;
  endpoint_id: string;
  model_name: string;
  endpoint_label: string;
  status: "working" | "degraded" | "down" | null;
  quality: "good" | "poor" | "unusable" | null;
  body: string | null;
  harness: string | null;
  harness_version: string | null;
  country: string | null;
  region: string | null;
  created_at: string;
}

export interface ReportsResponse {
  reports: PublicReport[];
  total: number;
}

export interface ModelDetail {
  model: Model;
  endpoints: EndpointHealth[];
  snapshots_24h: HealthSnapshot[];
}

export interface AnalyticsResponse {
  snapshots: HealthSnapshot[];
  by_harness: Record<string, number>;
  by_region: Record<string, number>;
  report_volume: { timestamp: string; count: number }[];
}

export interface ModelWithEndpoints extends Model {
  endpoints: Endpoint[];
  current_health: number | null;
}

export interface ModelsResponse {
  models: ModelWithEndpoints[];
}

export interface AuthMeResponse {
  id: string;
  email: string;
  name: string | null;
  trust_score: number;
}

export interface RegisterResponse {
  user: AuthMeResponse;
  token: string;
}

export interface RegenerateTokenResponse {
  token: string;
}

export interface CreateReportResponse {
  id: string;
  created_at: string;
}

export interface SuggestModelResponse {
  id: string;
  status: "pending";
}

export interface ErrorResponse {
  error: string;
}
