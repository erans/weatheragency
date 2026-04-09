import type { User } from "@weatheragency/shared";

export interface Env {
  DB: D1Database;
  CORS_ORIGIN: string;
  FRONTEND_URL: string;
  SEND_EMAIL: SendEmail;
  TURNSTILE_SECRET_KEY: string;
}

// Extended Hono context variables
export interface Variables {
  user: User | null;
}
