# Weather Agency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a community-driven "Down Detector for AI Models" — a Cloudflare-hosted service where users report model availability and quality, aggregated into a real-time status dashboard.

**Architecture:** Monorepo with a Cloudflare Worker API (Hono + D1), a React SPA on Cloudflare Pages, and a superpowers skill for agent-based reporting/checking. Reports track both availability (working/degraded/down) and quality (good/poor/unusable) per model endpoint.

**Tech Stack:** TypeScript, pnpm workspaces, Hono, Cloudflare Workers + D1 + Pages, React, Vite, TanStack Query, Recharts, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-04-09-weather-agency-design.md`

---

## File Map

```
weatheragency/
├── .gitignore
├── package.json                          # pnpm workspace root
├── pnpm-workspace.yaml                   # workspace config
├── turbo.json                            # turborepo config
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── types.ts                  # All shared types (models, endpoints, reports, API responses)
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   ├── wrangler.toml                 # D1 binding, cron triggers, vars
│   │   ├── src/
│   │   │   ├── index.ts                  # Hono app entry + scheduled handler
│   │   │   ├── bindings.ts               # CF Worker env type (D1, vars)
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts               # register, login, me, regenerate-token
│   │   │   │   ├── models.ts             # list, get, analytics, suggest
│   │   │   │   ├── reports.ts            # create, list
│   │   │   │   └── status.ts             # aggregated dashboard status
│   │   │   ├── services/
│   │   │   │   ├── health.ts             # Health score computation
│   │   │   │   ├── geoip.ts              # Extract geo from CF request
│   │   │   │   └── provider-status.ts    # Scrape status pages
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts               # Extract optional user from Bearer token
│   │   │   │   ├── cors.ts               # CORS headers
│   │   │   │   └── rate-limit.ts         # IP-hash-based rate limiting
│   │   │   └── db/
│   │   │       ├── schema.sql            # D1 table definitions + seed data
│   │   │       └── queries.ts            # Typed query helpers
│   │   └── test/
│   │       ├── setup.ts                  # Test harness with D1 init
│   │       ├── health.test.ts            # Health score algorithm tests
│   │       ├── auth.test.ts              # Auth route tests
│   │       ├── reports.test.ts           # Reports route tests
│   │       ├── models.test.ts            # Models route tests
│   │       ├── status.test.ts            # Status route tests
│   │       └── provider-status.test.ts   # Scraper tests
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── postcss.config.js
│       ├── index.html
│       └── src/
│           ├── main.tsx                  # React root
│           ├── App.tsx                   # Router setup
│           ├── api/
│           │   └── client.ts             # Fetch wrapper + TanStack Query config
│           ├── hooks/
│           │   ├── useStatus.ts          # Dashboard polling
│           │   ├── useModel.ts           # Model detail + analytics
│           │   ├── useReports.ts         # Report feed polling
│           │   └── useAuth.ts            # Auth state management
│           ├── components/
│           │   ├── Layout.tsx            # Nav + page shell
│           │   ├── ModelCard.tsx          # Status grid card
│           │   ├── EndpointRow.tsx        # Endpoint breakdown row
│           │   ├── ReportFeed.tsx         # Scrolling report list
│           │   ├── HealthChart.tsx        # Recharts line chart
│           │   ├── Sparkline.tsx          # Mini sparkline for cards
│           │   └── StatusBadge.tsx        # Color-coded status pill
│           └── pages/
│               ├── Dashboard.tsx          # Status grid + live feed
│               ├── ModelDetail.tsx        # Full analytics
│               ├── HowItWorks.tsx         # Algorithm docs
│               ├── Suggest.tsx            # Suggest model form
│               ├── Register.tsx           # Sign up
│               ├── Login.tsx              # Token-based login
│               └── Settings.tsx           # Token display + regenerate
├── skill/
│   └── weather-report.md                 # Superpowers skill (check + report)
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-04-09-weather-agency-design.md
        └── plans/
            └── 2026-04-09-weather-agency-plan.md  # This file
```

---

## Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`
- Create: `packages/api/package.json`, `packages/api/tsconfig.json`
- Create: `packages/web/package.json`, `packages/web/tsconfig.json`

- [ ] **Step 1: Create root workspace config**

Create `package.json`:
```json
{
  "name": "weatheragency",
  "private": true,
  "scripts": {
    "dev:api": "turbo run dev --filter=@weatheragency/api",
    "dev:web": "turbo run dev --filter=@weatheragency/web",
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2",
    "typescript": "^5.7"
  },
  "packageManager": "pnpm@9.15.0"
}
```

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/*"
```

Create `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

Create `.gitignore`:
```
node_modules/
dist/
.wrangler/
.dev.vars
.superpowers/
*.local
```

- [ ] **Step 2: Create shared package**

Create `packages/shared/package.json`:
```json
{
  "name": "@weatheragency/shared",
  "version": "0.0.1",
  "private": true,
  "main": "src/types.ts",
  "types": "src/types.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7"
  }
}
```

Create `packages/shared/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create API package**

Create `packages/api/package.json`:
```json
{
  "name": "@weatheragency/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "build": "wrangler deploy --dry-run",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "db:migrate": "wrangler d1 execute weather-agency-db --local --file=src/db/schema.sql"
  },
  "dependencies": {
    "@weatheragency/shared": "workspace:*",
    "hono": "^4",
    "ulidx": "^2"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.8",
    "@cloudflare/workers-types": "^4",
    "vitest": "^3",
    "wrangler": "^4",
    "typescript": "^5.7"
  }
}
```

Create `packages/api/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["@cloudflare/workers-types"],
    "paths": {
      "@weatheragency/shared": ["../shared/src/types"]
    }
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 4: Create web package**

Create `packages/web/package.json`:
```json
{
  "name": "@weatheragency/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@weatheragency/shared": "workspace:*",
    "react": "^19",
    "react-dom": "^19",
    "react-router": "^7",
    "@tanstack/react-query": "^5",
    "recharts": "^2",
    "clsx": "^2"
  },
  "devDependencies": {
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^4",
    "autoprefixer": "^10",
    "postcss": "^8",
    "tailwindcss": "^4",
    "typescript": "^5.7",
    "vite": "^6"
  }
}
```

Create `packages/web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "paths": {
      "@weatheragency/shared": ["../shared/src/types"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Install dependencies and commit**

Run:
```bash
pnpm install
```

Expected: lockfile created, node_modules installed for all packages.

```bash
git add -A && git commit -m "feat: scaffold monorepo with shared, api, and web packages"
```

---

## Task 2: Shared Types

**Files:**
- Create: `packages/shared/src/types.ts`

- [ ] **Step 1: Write all shared types**

Create `packages/shared/src/types.ts`:
```typescript
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

export interface LoginRequest {
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

export interface LoginResponse {
  user: AuthMeResponse;
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
```

- [ ] **Step 2: Typecheck and commit**

Run:
```bash
cd packages/shared && npx tsc --noEmit
```
Expected: no errors.

```bash
git add packages/shared/src/types.ts && git commit -m "feat: add shared types for models, endpoints, reports, and API contracts"
```

---

## Task 3: D1 Schema and Seed Data

**Files:**
- Create: `packages/api/src/db/schema.sql`
- Create: `packages/api/wrangler.toml`

- [ ] **Step 1: Write D1 schema**

Create `packages/api/src/db/schema.sql`:
```sql
-- Providers: status page scraping config
CREATE TABLE IF NOT EXISTS providers (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  status_page_url TEXT,
  status_page_type TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Models: logical model identities
CREATE TABLE IF NOT EXISTS models (
  id          TEXT PRIMARY KEY,
  provider    TEXT NOT NULL,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  is_curated  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Endpoints: where a model runs
CREATE TABLE IF NOT EXISTS endpoints (
  id                TEXT PRIMARY KEY,
  model_id          TEXT NOT NULL REFERENCES models(id),
  hosting_provider  TEXT NOT NULL,
  is_official       INTEGER NOT NULL DEFAULT 0,
  label             TEXT NOT NULL,
  status_page_url   TEXT,
  is_curated        INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'pending',
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_endpoints_model_id ON endpoints(model_id);

-- Reports: user-submitted status/quality reports
CREATE TABLE IF NOT EXISTS reports (
  id              TEXT PRIMARY KEY,
  endpoint_id     TEXT NOT NULL REFERENCES endpoints(id),
  status          TEXT,
  quality         TEXT,
  body            TEXT,
  harness         TEXT,
  harness_version TEXT,
  country         TEXT,
  region          TEXT,
  city            TEXT,
  latitude        REAL,
  longitude       REAL,
  user_id         TEXT,
  ip_hash         TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reports_endpoint_id ON reports(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_endpoint_created ON reports(endpoint_id, created_at);

-- Health snapshots: precomputed per-endpoint health
CREATE TABLE IF NOT EXISTS health_snapshots (
  id                  TEXT PRIMARY KEY,
  endpoint_id         TEXT NOT NULL REFERENCES endpoints(id),
  score               REAL NOT NULL,
  availability_score  REAL NOT NULL,
  quality_score       REAL NOT NULL,
  report_count        INTEGER NOT NULL,
  working             INTEGER NOT NULL DEFAULT 0,
  degraded            INTEGER NOT NULL DEFAULT 0,
  down                INTEGER NOT NULL DEFAULT 0,
  quality_good        INTEGER NOT NULL DEFAULT 0,
  quality_poor        INTEGER NOT NULL DEFAULT 0,
  quality_unusable    INTEGER NOT NULL DEFAULT 0,
  provider_status     TEXT,
  window_start        TEXT NOT NULL,
  window_end          TEXT NOT NULL,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_snapshots_endpoint_id ON health_snapshots(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON health_snapshots(created_at);
CREATE INDEX IF NOT EXISTS idx_snapshots_endpoint_created ON health_snapshots(endpoint_id, created_at);

-- Users: authenticated reporters
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  api_token   TEXT NOT NULL UNIQUE,
  trust_score REAL NOT NULL DEFAULT 1.0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Rate limiting buckets
CREATE TABLE IF NOT EXISTS rate_limits (
  key         TEXT NOT NULL,
  window      TEXT NOT NULL,
  count       INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window)
);

-- Seed: providers (for status page scraping)
INSERT OR IGNORE INTO providers (id, name, status_page_url, status_page_type) VALUES
  ('anthropic',    'Anthropic',     'https://status.anthropic.com',  'statuspage_io'),
  ('openai',       'OpenAI',        'https://status.openai.com',     'statuspage_io'),
  ('google-cloud', 'Google Cloud',  'https://status.cloud.google.com', 'custom'),
  ('aws',          'AWS',           'https://health.aws.amazon.com', 'custom'),
  ('azure',        'Azure',         'https://status.azure.com',      'custom'),
  ('together',     'Together AI',   'https://status.together.ai',    'statuspage_io'),
  ('fireworks',    'Fireworks AI',  'https://status.fireworks.ai',   'statuspage_io'),
  ('groq',         'Groq',          'https://status.groq.com',       'statuspage_io');

-- Seed: models (curated catalog)
INSERT OR IGNORE INTO models (id, provider, name, slug, is_curated, status) VALUES
  ('claude-opus-4',       'anthropic', 'Claude Opus 4',       'claude-opus-4',       1, 'approved'),
  ('claude-sonnet-4',     'anthropic', 'Claude Sonnet 4',     'claude-sonnet-4',     1, 'approved'),
  ('claude-haiku-3.5',    'anthropic', 'Claude Haiku 3.5',    'claude-haiku-3-5',    1, 'approved'),
  ('gpt-4o',              'openai',    'GPT-4o',              'gpt-4o',              1, 'approved'),
  ('gpt-4.1',             'openai',    'GPT-4.1',             'gpt-4-1',            1, 'approved'),
  ('o3',                  'openai',    'o3',                  'o3',                  1, 'approved'),
  ('o4-mini',             'openai',    'o4-mini',             'o4-mini',             1, 'approved'),
  ('gemini-2.5-pro',      'google',    'Gemini 2.5 Pro',      'gemini-2-5-pro',      1, 'approved'),
  ('gemini-2.5-flash',    'google',    'Gemini 2.5 Flash',    'gemini-2-5-flash',    1, 'approved'),
  ('grok-3',              'xai',       'Grok 3',              'grok-3',              1, 'approved'),
  ('llama-4-maverick',    'meta',      'Llama 4 Maverick',    'llama-4-maverick',    1, 'approved'),
  ('llama-4-scout',       'meta',      'Llama 4 Scout',       'llama-4-scout',       1, 'approved'),
  ('deepseek-r1',         'deepseek',  'DeepSeek R1',         'deepseek-r1',         1, 'approved');

-- Seed: endpoints (curated)
INSERT OR IGNORE INTO endpoints (id, model_id, hosting_provider, is_official, label, is_curated, status) VALUES
  -- Anthropic models
  ('claude-opus-4--anthropic',     'claude-opus-4',    'anthropic',    1, 'Anthropic API',  1, 'approved'),
  ('claude-opus-4--aws-bedrock',   'claude-opus-4',    'aws-bedrock',  0, 'AWS Bedrock',    1, 'approved'),
  ('claude-opus-4--gcp-vertex',    'claude-opus-4',    'gcp-vertex',   0, 'GCP Vertex AI',  1, 'approved'),
  ('claude-sonnet-4--anthropic',   'claude-sonnet-4',  'anthropic',    1, 'Anthropic API',  1, 'approved'),
  ('claude-sonnet-4--aws-bedrock', 'claude-sonnet-4',  'aws-bedrock',  0, 'AWS Bedrock',    1, 'approved'),
  ('claude-sonnet-4--gcp-vertex',  'claude-sonnet-4',  'gcp-vertex',   0, 'GCP Vertex AI',  1, 'approved'),
  ('claude-haiku-3.5--anthropic',  'claude-haiku-3.5', 'anthropic',    1, 'Anthropic API',  1, 'approved'),
  ('claude-haiku-3.5--aws-bedrock','claude-haiku-3.5', 'aws-bedrock',  0, 'AWS Bedrock',    1, 'approved'),
  -- OpenAI models
  ('gpt-4o--openai',               'gpt-4o',           'openai',       1, 'OpenAI API',     1, 'approved'),
  ('gpt-4o--azure-openai',         'gpt-4o',           'azure-openai', 0, 'Azure OpenAI',   1, 'approved'),
  ('gpt-4.1--openai',              'gpt-4.1',          'openai',       1, 'OpenAI API',     1, 'approved'),
  ('gpt-4.1--azure-openai',        'gpt-4.1',          'azure-openai', 0, 'Azure OpenAI',   1, 'approved'),
  ('o3--openai',                    'o3',               'openai',       1, 'OpenAI API',     1, 'approved'),
  ('o4-mini--openai',               'o4-mini',          'openai',       1, 'OpenAI API',     1, 'approved'),
  -- Google models
  ('gemini-2.5-pro--google',        'gemini-2.5-pro',   'google',       1, 'Google AI',      1, 'approved'),
  ('gemini-2.5-flash--google',      'gemini-2.5-flash', 'google',       1, 'Google AI',      1, 'approved'),
  -- xAI
  ('grok-3--xai',                   'grok-3',           'xai',          1, 'xAI API',        1, 'approved'),
  -- Meta (open source — no official endpoint)
  ('llama-4-maverick--together',    'llama-4-maverick', 'together',     0, 'Together AI',    1, 'approved'),
  ('llama-4-maverick--fireworks',   'llama-4-maverick', 'fireworks',    0, 'Fireworks AI',   1, 'approved'),
  ('llama-4-maverick--groq',        'llama-4-maverick', 'groq',         0, 'Groq',           1, 'approved'),
  ('llama-4-maverick--aws-bedrock', 'llama-4-maverick', 'aws-bedrock',  0, 'AWS Bedrock',    1, 'approved'),
  ('llama-4-scout--together',       'llama-4-scout',    'together',     0, 'Together AI',    1, 'approved'),
  ('llama-4-scout--fireworks',      'llama-4-scout',    'fireworks',    0, 'Fireworks AI',   1, 'approved'),
  ('llama-4-scout--groq',           'llama-4-scout',    'groq',         0, 'Groq',           1, 'approved'),
  -- DeepSeek
  ('deepseek-r1--deepseek',         'deepseek-r1',      'deepseek',     1, 'DeepSeek API',   1, 'approved'),
  ('deepseek-r1--together',         'deepseek-r1',      'together',     0, 'Together AI',    1, 'approved'),
  ('deepseek-r1--fireworks',        'deepseek-r1',      'fireworks',    0, 'Fireworks AI',   1, 'approved');
```

- [ ] **Step 2: Write wrangler.toml**

Create `packages/api/wrangler.toml`:
```toml
name = "weather-agency-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[triggers]
crons = ["*/5 * * * *"]

[[d1_databases]]
binding = "DB"
database_name = "weather-agency-db"
database_id = "local"

[vars]
CORS_ORIGIN = "https://weather.agency"
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/db/schema.sql packages/api/wrangler.toml && git commit -m "feat: add D1 schema with seed data and wrangler config"
```

---

## Task 4: API Skeleton — Bindings, Middleware, Entry Point

**Files:**
- Create: `packages/api/src/bindings.ts`
- Create: `packages/api/src/middleware/cors.ts`
- Create: `packages/api/src/middleware/auth.ts`
- Create: `packages/api/src/middleware/rate-limit.ts`
- Create: `packages/api/src/services/geoip.ts`
- Create: `packages/api/src/index.ts`
- Create: `packages/api/vitest.config.ts`

- [ ] **Step 1: Write bindings type**

Create `packages/api/src/bindings.ts`:
```typescript
import type { User } from "@weatheragency/shared";

export interface Env {
  DB: D1Database;
  CORS_ORIGIN: string;
}

// Extended Hono context variables
export interface Variables {
  user: User | null;
}
```

- [ ] **Step 2: Write CORS middleware**

Create `packages/api/src/middleware/cors.ts`:
```typescript
import { cors } from "hono/cors";
import type { Env, Variables } from "../bindings";
import type { MiddlewareHandler } from "hono";

export function corsMiddleware(): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  return async (c, next) => {
    const origin = c.env.CORS_ORIGIN;
    const handler = cors({
      origin: origin === "*" ? "*" : origin.split(","),
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      maxAge: 86400,
    });
    return handler(c, next);
  };
}
```

- [ ] **Step 3: Write auth middleware**

Create `packages/api/src/middleware/auth.ts`:
```typescript
import type { MiddlewareHandler } from "hono";
import type { Env, Variables } from "../bindings";

export function authMiddleware(): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  return async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const result = await c.env.DB.prepare(
        "SELECT id, email, name, api_token, trust_score, created_at FROM users WHERE api_token = ?"
      )
        .bind(token)
        .first();
      c.set("user", result ?? null);
    } else {
      c.set("user", null);
    }
    await next();
  };
}
```

- [ ] **Step 4: Write rate limiting middleware**

Create `packages/api/src/middleware/rate-limit.ts`:
```typescript
import type { MiddlewareHandler } from "hono";
import type { Env, Variables } from "../bindings";

export function rateLimit(
  limit: number,
  keyPrefix: string
): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> {
  return async (c, next) => {
    const ip = c.req.header("cf-connecting-ip") ?? "unknown";
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(ip)
    );
    const ipHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const window = new Date().toISOString().slice(0, 16); // per-minute window
    const key = `${keyPrefix}:${ipHash}`;

    const row = await c.env.DB.prepare(
      "INSERT INTO rate_limits (key, window, count) VALUES (?, ?, 1) ON CONFLICT(key, window) DO UPDATE SET count = count + 1 RETURNING count"
    )
      .bind(key, window)
      .first<{ count: number }>();

    if (row && row.count > limit) {
      return c.json({ error: "Rate limit exceeded" }, 429);
    }

    await next();
  };
}
```

- [ ] **Step 5: Write GeoIP service**

Create `packages/api/src/services/geoip.ts`:
```typescript
export interface GeoData {
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

export function extractGeo(request: Request): GeoData {
  const cf = (request as Request & { cf?: IncomingRequestCfProperties }).cf;
  if (!cf) {
    return {
      country: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
    };
  }
  return {
    country: (cf.country as string) ?? null,
    region: cf.region ?? null,
    city: cf.city ?? null,
    latitude: cf.latitude ? parseFloat(cf.latitude as string) : null,
    longitude: cf.longitude ? parseFloat(cf.longitude as string) : null,
  };
}

export async function hashIp(request: Request): Promise<string> {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for") ??
    "unknown";
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(ip)
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
```

- [ ] **Step 6: Write Hono app entry point (stub routes)**

Create `packages/api/src/index.ts`:
```typescript
import { Hono } from "hono";
import type { Env, Variables } from "./bindings";
import { corsMiddleware } from "./middleware/cors";
import { authMiddleware } from "./middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", corsMiddleware());
app.use("/api/*", authMiddleware());

app.get("/api/health", (c) => c.json({ ok: true }));

// Route modules will be mounted here in subsequent tasks

export default {
  fetch: app.fetch,
  async scheduled(
    _event: ScheduledEvent,
    _env: Env,
    _ctx: ExecutionContext
  ) {
    // Cron handler will be implemented in Task 12
  },
};
```

- [ ] **Step 7: Write vitest config**

Create `packages/api/vitest.config.ts`:
```typescript
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          d1Databases: {
            DB: "weather-agency-test-db",
          },
        },
      },
    },
  },
});
```

- [ ] **Step 8: Typecheck and commit**

Run:
```bash
cd packages/api && npx tsc --noEmit
```
Expected: no errors.

```bash
git add packages/api/src/ packages/api/vitest.config.ts && git commit -m "feat: add API skeleton with Hono, middleware (CORS, auth, rate limit), and GeoIP"
```

---

## Task 5: Auth Routes

**Files:**
- Create: `packages/api/src/routes/auth.ts`
- Create: `packages/api/test/auth.test.ts`
- Create: `packages/api/test/setup.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: Write test setup**

Create `packages/api/test/setup.ts`:
```typescript
import { env } from "cloudflare:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export async function initDb() {
  const schema = readFileSync(
    resolve(__dirname, "../src/db/schema.sql"),
    "utf-8"
  );
  // Split on semicolons and execute each statement
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await env.DB.exec(stmt);
  }
}
```

- [ ] **Step 2: Write failing auth tests**

Create `packages/api/test/auth.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { initDb } from "./setup";
import app from "../src/index";

const worker = app;

function req(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, init);
}

describe("POST /api/auth/register", () => {
  beforeEach(async () => {
    await initDb();
  });

  it("creates a user and returns token", async () => {
    const res = await worker.fetch(
      req("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", name: "Test User" }),
      }),
      env
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe("test@example.com");
    expect(body.user.name).toBe("Test User");
    expect(body.token).toMatch(/^wa_/);
  });

  it("rejects duplicate email", async () => {
    const body = JSON.stringify({ email: "dup@example.com" });
    const opts = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    };
    await worker.fetch(req("/api/auth/register", opts), env);
    const res = await worker.fetch(
      req("/api/auth/register", opts),
      env
    );
    expect(res.status).toBe(409);
  });

  it("rejects missing email", async () => {
    const res = await worker.fetch(
      req("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      env
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await initDb();
  });

  it("validates a token and returns user", async () => {
    // Register first
    const regRes = await worker.fetch(
      req("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "login@example.com" }),
      }),
      env
    );
    const { token } = await regRes.json();

    const res = await worker.fetch(
      req("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }),
      env
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe("login@example.com");
  });

  it("rejects invalid token", async () => {
    const res = await worker.fetch(
      req("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "wa_invalid" }),
      }),
      env
    );
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  beforeEach(async () => {
    await initDb();
  });

  it("returns user for valid Bearer token", async () => {
    const regRes = await worker.fetch(
      req("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "me@example.com", name: "Me" }),
      }),
      env
    );
    const { token } = await regRes.json();

    const res = await worker.fetch(
      req("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      env
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe("me@example.com");
    expect(body.trust_score).toBe(1.0);
  });

  it("returns 401 without token", async () => {
    const res = await worker.fetch(req("/api/auth/me"), env);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/regenerate-token", () => {
  beforeEach(async () => {
    await initDb();
  });

  it("returns a new token and invalidates old one", async () => {
    const regRes = await worker.fetch(
      req("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "regen@example.com" }),
      }),
      env
    );
    const { token: oldToken } = await regRes.json();

    const res = await worker.fetch(
      req("/api/auth/regenerate-token", {
        method: "POST",
        headers: { Authorization: `Bearer ${oldToken}` },
      }),
      env
    );
    expect(res.status).toBe(200);
    const { token: newToken } = await res.json();
    expect(newToken).toMatch(/^wa_/);
    expect(newToken).not.toBe(oldToken);

    // Old token should no longer work
    const meRes = await worker.fetch(
      req("/api/auth/me", {
        headers: { Authorization: `Bearer ${oldToken}` },
      }),
      env
    );
    expect(meRes.status).toBe(401);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:
```bash
cd packages/api && npx vitest run test/auth.test.ts
```
Expected: FAIL (routes not implemented).

- [ ] **Step 4: Implement auth routes**

Create `packages/api/src/routes/auth.ts`:
```typescript
import { Hono } from "hono";
import type { Env, Variables } from "../bindings";

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `wa_${hex}`;
}

auth.post("/register", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { email, name } = body as { email?: string; name?: string };

  if (!email || typeof email !== "string") {
    return c.json({ error: "email is required" }, 400);
  }

  const id = crypto.randomUUID();
  const token = generateToken();

  try {
    await c.env.DB.prepare(
      "INSERT INTO users (id, email, name, api_token) VALUES (?, ?, ?, ?)"
    )
      .bind(id, email, name ?? null, token)
      .run();
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("UNIQUE")) {
      return c.json({ error: "Email already registered" }, 409);
    }
    throw e;
  }

  return c.json({
    user: { id, email, name: name ?? null, trust_score: 1.0 },
    token,
  });
});

auth.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { token } = body as { token?: string };

  if (!token) {
    return c.json({ error: "token is required" }, 400);
  }

  const user = await c.env.DB.prepare(
    "SELECT id, email, name, trust_score FROM users WHERE api_token = ?"
  )
    .bind(token)
    .first();

  if (!user) {
    return c.json({ error: "Invalid token" }, 401);
  }

  return c.json({ user });
});

auth.get("/me", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    trust_score: user.trust_score,
  });
});

auth.post("/regenerate-token", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const newToken = generateToken();
  await c.env.DB.prepare("UPDATE users SET api_token = ? WHERE id = ?")
    .bind(newToken, user.id)
    .run();

  return c.json({ token: newToken });
});

export { auth };
```

- [ ] **Step 5: Mount auth routes in index.ts**

Update `packages/api/src/index.ts` — add after the health endpoint:
```typescript
import { auth } from "./routes/auth";

app.route("/api/auth", auth);
```

Full `packages/api/src/index.ts` should now be:
```typescript
import { Hono } from "hono";
import type { Env, Variables } from "./bindings";
import { corsMiddleware } from "./middleware/cors";
import { authMiddleware } from "./middleware/auth";
import { auth } from "./routes/auth";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", corsMiddleware());
app.use("/api/*", authMiddleware());

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/auth", auth);

export default {
  fetch: app.fetch,
  async scheduled(
    _event: ScheduledEvent,
    _env: Env,
    _ctx: ExecutionContext
  ) {
    // Cron handler will be implemented in Task 12
  },
};
```

- [ ] **Step 6: Run tests to verify they pass**

Run:
```bash
cd packages/api && npx vitest run test/auth.test.ts
```
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/routes/auth.ts packages/api/src/index.ts packages/api/test/ && git commit -m "feat: add auth routes (register, login, me, regenerate-token)"
```

---

## Task 6: Models & Endpoints Routes

**Files:**
- Create: `packages/api/src/routes/models.ts`
- Create: `packages/api/test/models.test.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: Write failing models tests**

Create `packages/api/test/models.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { initDb } from "./setup";
import app from "../src/index";

function req(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, init);
}

describe("GET /api/models", () => {
  beforeEach(async () => {
    await initDb();
  });

  it("returns approved models with endpoints", async () => {
    const res = await app.fetch(req("/api/models"), env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.models.length).toBeGreaterThan(0);
    // Claude Sonnet 4 should have 3 endpoints
    const sonnet = body.models.find(
      (m: { id: string }) => m.id === "claude-sonnet-4"
    );
    expect(sonnet).toBeDefined();
    expect(sonnet.endpoints.length).toBe(3);
  });

  it("filters by provider", async () => {
    const res = await app.fetch(req("/api/models?provider=openai"), env);
    const body = await res.json();
    expect(
      body.models.every((m: { provider: string }) => m.provider === "openai")
    ).toBe(true);
  });
});

describe("GET /api/models/:id", () => {
  beforeEach(async () => {
    await initDb();
  });

  it("returns model detail with endpoints", async () => {
    const res = await app.fetch(req("/api/models/claude-sonnet-4"), env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.model.name).toBe("Claude Sonnet 4");
    expect(body.endpoints.length).toBe(3);
  });

  it("returns 404 for unknown model", async () => {
    const res = await app.fetch(req("/api/models/nonexistent"), env);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/models/suggest", () => {
  beforeEach(async () => {
    await initDb();
  });

  it("creates a pending model suggestion", async () => {
    const res = await app.fetch(
      req("/api/models/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "mistral",
          name: "Mistral Large 2",
        }),
      }),
      env
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("pending");
    expect(body.id).toBeDefined();
  });

  it("creates model + endpoint suggestion together", async () => {
    const res = await app.fetch(
      req("/api/models/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "mistral",
          name: "Codestral",
          hosting_provider: "mistral",
          hosting_label: "Mistral API",
        }),
      }),
      env
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBeDefined();
  });

  it("rejects missing provider", async () => {
    const res = await app.fetch(
      req("/api/models/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "No Provider" }),
      }),
      env
    );
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd packages/api && npx vitest run test/models.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement models routes**

Create `packages/api/src/routes/models.ts`:
```typescript
import { Hono } from "hono";
import type { Env, Variables } from "../bindings";

const models = new Hono<{ Bindings: Env; Variables: Variables }>();

models.get("/", async (c) => {
  const provider = c.req.query("provider");
  const status = c.req.query("status") ?? "approved";

  let query = `
    SELECT m.*, e.id as endpoint_id, e.hosting_provider, e.is_official, e.label as endpoint_label, e.status as endpoint_status
    FROM models m
    LEFT JOIN endpoints e ON e.model_id = m.id AND e.status = 'approved'
    WHERE m.status = ?
  `;
  const params: string[] = [status];

  if (provider) {
    query += " AND m.provider = ?";
    params.push(provider);
  }

  query += " ORDER BY m.provider, m.name";

  const rows = await c.env.DB.prepare(query)
    .bind(...params)
    .all();

  // Group endpoints under their model
  const modelMap = new Map<string, any>();
  for (const row of rows.results) {
    if (!modelMap.has(row.id as string)) {
      modelMap.set(row.id as string, {
        id: row.id,
        provider: row.provider,
        name: row.name,
        slug: row.slug,
        is_curated: row.is_curated,
        status: row.status,
        created_at: row.created_at,
        endpoints: [],
        current_health: null,
      });
    }
    if (row.endpoint_id) {
      modelMap.get(row.id as string).endpoints.push({
        id: row.endpoint_id,
        hosting_provider: row.hosting_provider,
        is_official: row.is_official,
        label: row.endpoint_label,
      });
    }
  }

  return c.json({ models: Array.from(modelMap.values()) });
});

models.get("/:id", async (c) => {
  const id = c.req.param("id");

  const model = await c.env.DB.prepare(
    "SELECT * FROM models WHERE (id = ? OR slug = ?) AND status = 'approved'"
  )
    .bind(id, id)
    .first();

  if (!model) {
    return c.json({ error: "Model not found" }, 404);
  }

  const endpointsResult = await c.env.DB.prepare(
    "SELECT * FROM endpoints WHERE model_id = ? AND status = 'approved'"
  )
    .bind(id)
    .all();

  // Get latest snapshot per endpoint for current health
  const endpoints = [];
  for (const ep of endpointsResult.results) {
    const snapshot = await c.env.DB.prepare(
      "SELECT * FROM health_snapshots WHERE endpoint_id = ? ORDER BY created_at DESC LIMIT 1"
    )
      .bind(ep.id)
      .first();

    endpoints.push({
      id: ep.id,
      label: ep.label,
      hosting_provider: ep.hosting_provider,
      is_official: ep.is_official,
      score: snapshot ? snapshot.score : 80,
      availability_score: snapshot ? snapshot.availability_score : 80,
      quality_score: snapshot ? snapshot.quality_score : 80,
      trend: "stable" as const,
      report_count: snapshot ? snapshot.report_count : 0,
    });
  }

  // Get 24h snapshots
  const snapshots24h = await c.env.DB.prepare(
    `SELECT * FROM health_snapshots
     WHERE endpoint_id IN (SELECT id FROM endpoints WHERE model_id = ?)
     AND created_at >= datetime('now', '-24 hours')
     ORDER BY created_at`
  )
    .bind(id)
    .all();

  return c.json({
    model,
    endpoints,
    snapshots_24h: snapshots24h.results,
  });
});

models.get("/:id/analytics", async (c) => {
  const id = c.req.param("id");
  const period = c.req.query("period") ?? "24h";
  const endpointId = c.req.query("endpoint_id");

  // Use model_id from the resolved model (handle slug lookup)
  const model = await c.env.DB.prepare(
    "SELECT id FROM models WHERE (id = ? OR slug = ?) AND status = 'approved'"
  )
    .bind(id, id)
    .first<{ id: string }>();

  if (!model) {
    return c.json({ error: "Model not found" }, 404);
  }

  const modelId = model.id;
  const periodHours = period === "30d" ? 720 : period === "7d" ? 168 : 24;

  let snapshotQuery = `
    SELECT * FROM health_snapshots
    WHERE endpoint_id IN (SELECT id FROM endpoints WHERE model_id = ?)
    AND created_at >= datetime('now', '-${periodHours} hours')
  `;
  const snapshotParams: string[] = [modelId];

  if (endpointId) {
    snapshotQuery = `
      SELECT * FROM health_snapshots
      WHERE endpoint_id = ?
      AND created_at >= datetime('now', '-${periodHours} hours')
    `;
    snapshotParams[0] = endpointId;
  }
  snapshotQuery += " ORDER BY created_at";

  const snapshots = await c.env.DB.prepare(snapshotQuery)
    .bind(...snapshotParams)
    .all();

  // Breakdown by harness
  let harnessQuery = `
    SELECT harness, COUNT(*) as count FROM reports
    WHERE endpoint_id IN (SELECT id FROM endpoints WHERE model_id = ?)
    AND created_at >= datetime('now', '-${periodHours} hours')
    AND harness IS NOT NULL
    GROUP BY harness ORDER BY count DESC
  `;
  const harnessParams: string[] = [modelId];

  if (endpointId) {
    harnessQuery = `
      SELECT harness, COUNT(*) as count FROM reports
      WHERE endpoint_id = ?
      AND created_at >= datetime('now', '-${periodHours} hours')
      AND harness IS NOT NULL
      GROUP BY harness ORDER BY count DESC
    `;
    harnessParams[0] = endpointId;
  }

  const byHarnessRows = await c.env.DB.prepare(harnessQuery)
    .bind(...harnessParams)
    .all();

  const byHarness: Record<string, number> = {};
  for (const row of byHarnessRows.results) {
    byHarness[row.harness as string] = row.count as number;
  }

  // Breakdown by region
  let regionQuery = `
    SELECT country, COUNT(*) as count FROM reports
    WHERE endpoint_id IN (SELECT id FROM endpoints WHERE model_id = ?)
    AND created_at >= datetime('now', '-${periodHours} hours')
    AND country IS NOT NULL
    GROUP BY country ORDER BY count DESC
  `;
  const regionParams: string[] = [modelId];

  if (endpointId) {
    regionQuery = `
      SELECT country, COUNT(*) as count FROM reports
      WHERE endpoint_id = ?
      AND created_at >= datetime('now', '-${periodHours} hours')
      AND country IS NOT NULL
      GROUP BY country ORDER BY count DESC
    `;
    regionParams[0] = endpointId;
  }

  const byRegionRows = await c.env.DB.prepare(regionQuery)
    .bind(...regionParams)
    .all();

  const byRegion: Record<string, number> = {};
  for (const row of byRegionRows.results) {
    byRegion[row.country as string] = row.count as number;
  }

  // Report volume over time (bucketed by hour)
  let volumeQuery = `
    SELECT strftime('%Y-%m-%dT%H:00:00Z', created_at) as bucket, COUNT(*) as count
    FROM reports
    WHERE endpoint_id IN (SELECT id FROM endpoints WHERE model_id = ?)
    AND created_at >= datetime('now', '-${periodHours} hours')
    GROUP BY bucket ORDER BY bucket
  `;
  const volumeParams: string[] = [id];

  if (endpointId) {
    volumeQuery = `
      SELECT strftime('%Y-%m-%dT%H:00:00Z', created_at) as bucket, COUNT(*) as count
      FROM reports
      WHERE endpoint_id = ?
      AND created_at >= datetime('now', '-${periodHours} hours')
      GROUP BY bucket ORDER BY bucket
    `;
    volumeParams[0] = endpointId;
  }

  const volumeRows = await c.env.DB.prepare(volumeQuery)
    .bind(...volumeParams)
    .all();

  const reportVolume = volumeRows.results.map((row) => ({
    timestamp: row.bucket as string,
    count: row.count as number,
  }));

  return c.json({
    snapshots: snapshots.results,
    by_harness: byHarness,
    by_region: byRegion,
    report_volume: reportVolume,
  });
});

models.post("/suggest", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { provider, name, slug, hosting_provider, hosting_label } = body as {
    provider?: string;
    name?: string;
    slug?: string;
    hosting_provider?: string;
    hosting_label?: string;
  };

  if (!provider || !name) {
    return c.json({ error: "provider and name are required" }, 400);
  }

  const modelSlug =
    slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const modelId = modelSlug;

  // Check if model already exists
  const existing = await c.env.DB.prepare(
    "SELECT id FROM models WHERE id = ? OR slug = ?"
  )
    .bind(modelId, modelSlug)
    .first();

  if (!existing) {
    await c.env.DB.prepare(
      "INSERT INTO models (id, provider, name, slug, is_curated, status) VALUES (?, ?, ?, ?, 0, 'pending')"
    )
      .bind(modelId, provider, name, modelSlug)
      .run();
  }

  // Create endpoint suggestion if provided
  if (hosting_provider) {
    const endpointId = `${existing ? existing.id : modelId}--${hosting_provider}`;
    const label = hosting_label ?? hosting_provider;
    await c.env.DB.prepare(
      "INSERT OR IGNORE INTO endpoints (id, model_id, hosting_provider, is_official, label, is_curated, status) VALUES (?, ?, ?, 0, ?, 0, 'pending')"
    )
      .bind(
        endpointId,
        existing ? existing.id : modelId,
        hosting_provider,
        label
      )
      .run();
  }

  return c.json({ id: modelId, status: "pending" as const });
});

export { models };
```

- [ ] **Step 4: Mount models routes in index.ts**

Add to `packages/api/src/index.ts`:
```typescript
import { models } from "./routes/models";

app.route("/api/models", models);
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
cd packages/api && npx vitest run test/models.test.ts
```
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/models.ts packages/api/test/models.test.ts packages/api/src/index.ts && git commit -m "feat: add models/endpoints routes (list, detail, analytics, suggest)"
```

---

## Task 7: Reports Routes

**Files:**
- Create: `packages/api/src/routes/reports.ts`
- Create: `packages/api/test/reports.test.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: Write failing reports tests**

Create `packages/api/test/reports.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { initDb } from "./setup";
import app from "../src/index";

function req(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, init);
}

describe("POST /api/reports", () => {
  beforeEach(async () => {
    await initDb();
  });

  it("creates a report with endpoint_id", async () => {
    const res = await app.fetch(
      req("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint_id: "claude-sonnet-4--anthropic",
          status: "working",
          quality: "good",
          body: "Fast and responsive",
          harness: "claude-code",
          harness_version: "1.2.0",
        }),
      }),
      env
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.created_at).toBeDefined();
  });

  it("creates a report with model_id (resolves to official endpoint)", async () => {
    const res = await app.fetch(
      req("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: "claude-sonnet-4",
          status: "degraded",
        }),
      }),
      env
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBeDefined();
  });

  it("creates a report with model_id + hosting_provider", async () => {
    const res = await app.fetch(
      req("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: "claude-sonnet-4",
          hosting_provider: "aws-bedrock",
          status: "down",
        }),
      }),
      env
    );
    expect(res.status).toBe(200);
  });

  it("rejects report with neither status nor quality", async () => {
    const res = await app.fetch(
      req("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint_id: "claude-sonnet-4--anthropic",
          body: "Just a comment",
        }),
      }),
      env
    );
    expect(res.status).toBe(400);
  });

  it("rejects report with no endpoint or model", async () => {
    const res = await app.fetch(
      req("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "working" }),
      }),
      env
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/reports", () => {
  beforeEach(async () => {
    await initDb();
    // Insert some reports
    for (let i = 0; i < 5; i++) {
      await app.fetch(
        req("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint_id: "claude-sonnet-4--anthropic",
            status: "working",
            harness: "claude-code",
          }),
        }),
        env
      );
    }
  });

  it("returns recent reports", async () => {
    const res = await app.fetch(req("/api/reports?limit=10"), env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reports.length).toBe(5);
    expect(body.total).toBe(5);
    // Should not contain ip_hash or user_id
    expect(body.reports[0].ip_hash).toBeUndefined();
    expect(body.reports[0].user_id).toBeUndefined();
  });

  it("filters by endpoint_id", async () => {
    const res = await app.fetch(
      req("/api/reports?endpoint_id=claude-sonnet-4--anthropic"),
      env
    );
    const body = await res.json();
    expect(body.reports.length).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd packages/api && npx vitest run test/reports.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement reports routes**

Create `packages/api/src/routes/reports.ts`:
```typescript
import { Hono } from "hono";
import { ulid } from "ulidx";
import type { Env, Variables } from "../bindings";
import { extractGeo, hashIp } from "../services/geoip";
import { rateLimit } from "../middleware/rate-limit";

const reports = new Hono<{ Bindings: Env; Variables: Variables }>();

reports.post("/", rateLimit(10, "report"), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const {
    endpoint_id,
    model_id,
    hosting_provider,
    status,
    quality,
    body: reportBody,
    harness,
    harness_version,
  } = body as {
    endpoint_id?: string;
    model_id?: string;
    hosting_provider?: string;
    status?: string;
    quality?: string;
    body?: string;
    harness?: string;
    harness_version?: string;
  };

  // Validate: at least one of status or quality
  if (!status && !quality) {
    return c.json(
      { error: "At least one of status or quality is required" },
      400
    );
  }

  // Validate status/quality values
  if (status && !["working", "degraded", "down"].includes(status)) {
    return c.json({ error: "Invalid status value" }, 400);
  }
  if (quality && !["good", "poor", "unusable"].includes(quality)) {
    return c.json({ error: "Invalid quality value" }, 400);
  }

  // Resolve endpoint_id
  let resolvedEndpointId = endpoint_id;

  if (!resolvedEndpointId) {
    if (!model_id) {
      return c.json(
        { error: "Either endpoint_id or model_id is required" },
        400
      );
    }

    if (hosting_provider) {
      // Resolve from model_id + hosting_provider
      resolvedEndpointId = `${model_id}--${hosting_provider}`;
    } else {
      // Find official endpoint for this model
      const official = await c.env.DB.prepare(
        "SELECT id FROM endpoints WHERE model_id = ? AND is_official = 1 AND status = 'approved' LIMIT 1"
      )
        .bind(model_id)
        .first<{ id: string }>();

      if (!official) {
        // Fall back to first approved endpoint
        const first = await c.env.DB.prepare(
          "SELECT id FROM endpoints WHERE model_id = ? AND status = 'approved' LIMIT 1"
        )
          .bind(model_id)
          .first<{ id: string }>();

        if (!first) {
          return c.json(
            { error: "No approved endpoint found for this model" },
            400
          );
        }
        resolvedEndpointId = first.id;
      } else {
        resolvedEndpointId = official.id;
      }
    }
  }

  // Verify endpoint exists and is approved
  const endpoint = await c.env.DB.prepare(
    "SELECT id FROM endpoints WHERE id = ? AND status = 'approved'"
  )
    .bind(resolvedEndpointId)
    .first();

  if (!endpoint) {
    return c.json({ error: "Endpoint not found or not approved" }, 400);
  }

  const geo = extractGeo(c.req.raw);
  const ipHash = await hashIp(c.req.raw);
  const user = c.get("user");
  const id = ulid();

  await c.env.DB.prepare(
    `INSERT INTO reports (id, endpoint_id, status, quality, body, harness, harness_version,
     country, region, city, latitude, longitude, user_id, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      resolvedEndpointId,
      status ?? null,
      quality ?? null,
      reportBody ?? null,
      harness ?? null,
      harness_version ?? null,
      geo.country,
      geo.region,
      geo.city,
      geo.latitude,
      geo.longitude,
      user?.id ?? null,
      ipHash
    )
    .run();

  const report = await c.env.DB.prepare(
    "SELECT id, created_at FROM reports WHERE id = ?"
  )
    .bind(id)
    .first();

  return c.json({ id: report!.id, created_at: report!.created_at });
});

reports.get("/", async (c) => {
  const modelId = c.req.query("model_id");
  const endpointId = c.req.query("endpoint_id");
  const limit = Math.min(parseInt(c.req.query("limit") ?? "50", 10), 100);
  const offset = parseInt(c.req.query("offset") ?? "0", 10);

  let whereClause = "1=1";
  const params: string[] = [];

  if (endpointId) {
    whereClause = "r.endpoint_id = ?";
    params.push(endpointId);
  } else if (modelId) {
    whereClause =
      "r.endpoint_id IN (SELECT id FROM endpoints WHERE model_id = ?)";
    params.push(modelId);
  }

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM reports r WHERE ${whereClause}`
  )
    .bind(...params)
    .first<{ total: number }>();

  const rows = await c.env.DB.prepare(
    `SELECT r.id, r.endpoint_id, r.status, r.quality, r.body,
            r.harness, r.harness_version, r.country, r.region, r.created_at,
            m.name as model_name, e.label as endpoint_label
     FROM reports r
     JOIN endpoints e ON e.id = r.endpoint_id
     JOIN models m ON m.id = e.model_id
     WHERE ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...params, limit, offset)
    .all();

  return c.json({
    reports: rows.results,
    total: countResult?.total ?? 0,
  });
});

export { reports };
```

- [ ] **Step 4: Mount reports routes in index.ts**

Add to `packages/api/src/index.ts`:
```typescript
import { reports } from "./routes/reports";

app.route("/api/reports", reports);
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
cd packages/api && npx vitest run test/reports.test.ts
```
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/reports.ts packages/api/test/reports.test.ts packages/api/src/index.ts && git commit -m "feat: add reports routes (create with endpoint resolution, list with filters)"
```

---

## Task 8: Health Score Computation Service

**Files:**
- Create: `packages/api/src/services/health.ts`
- Create: `packages/api/test/health.test.ts`

- [ ] **Step 1: Write failing health score tests**

Create `packages/api/test/health.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import {
  computeAvailabilityScore,
  computeQualityScore,
  computeOverallScore,
  computeTrend,
} from "../src/services/health";

const now = new Date("2026-04-09T12:00:00Z");

function minutesAgo(minutes: number): string {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}

describe("computeAvailabilityScore", () => {
  it("returns 100 when all reports are working", () => {
    const reports = [
      { status: "working", user_id: null, created_at: minutesAgo(1) },
      { status: "working", user_id: null, created_at: minutesAgo(2) },
      { status: "working", user_id: null, created_at: minutesAgo(3) },
    ];
    const score = computeAvailabilityScore(reports, new Map(), now);
    expect(score).toBeCloseTo(100, 0);
  });

  it("returns 0 when all reports are down", () => {
    const reports = [
      { status: "down", user_id: null, created_at: minutesAgo(1) },
      { status: "down", user_id: null, created_at: minutesAgo(2) },
      { status: "down", user_id: null, created_at: minutesAgo(3) },
    ];
    const score = computeAvailabilityScore(reports, new Map(), now);
    expect(score).toBeCloseTo(0, 0);
  });

  it("weights authenticated users higher", () => {
    const trustScores = new Map([["user1", 2.0]]);
    const allAnon = [
      { status: "down", user_id: null, created_at: minutesAgo(1) },
      { status: "working", user_id: null, created_at: minutesAgo(1) },
    ];
    const withTrusted = [
      { status: "down", user_id: null, created_at: minutesAgo(1) },
      { status: "working", user_id: "user1", created_at: minutesAgo(1) },
    ];
    const anonScore = computeAvailabilityScore(allAnon, new Map(), now);
    const trustedScore = computeAvailabilityScore(
      withTrusted,
      trustScores,
      now
    );
    // Trusted "working" should pull the score higher
    expect(trustedScore).toBeGreaterThan(anonScore);
  });

  it("weights recent reports higher", () => {
    const recentDown = [
      { status: "down", user_id: null, created_at: minutesAgo(1) },
      { status: "working", user_id: null, created_at: minutesAgo(20) },
    ];
    const oldDown = [
      { status: "working", user_id: null, created_at: minutesAgo(1) },
      { status: "down", user_id: null, created_at: minutesAgo(20) },
    ];
    const recentDownScore = computeAvailabilityScore(
      recentDown,
      new Map(),
      now
    );
    const oldDownScore = computeAvailabilityScore(oldDown, new Map(), now);
    // Recent down should give lower score
    expect(recentDownScore).toBeLessThan(oldDownScore);
  });

  it("returns 80 for empty reports", () => {
    const score = computeAvailabilityScore([], new Map(), now);
    expect(score).toBe(80);
  });
});

describe("computeQualityScore", () => {
  it("returns 100 when all reports are good", () => {
    const reports = [
      { quality: "good", user_id: null, created_at: minutesAgo(1) },
      { quality: "good", user_id: null, created_at: minutesAgo(2) },
    ];
    const score = computeQualityScore(reports, new Map(), now);
    expect(score).toBeCloseTo(100, 0);
  });

  it("returns 0 when all reports are unusable", () => {
    const reports = [
      { quality: "unusable", user_id: null, created_at: minutesAgo(1) },
      { quality: "unusable", user_id: null, created_at: minutesAgo(2) },
    ];
    const score = computeQualityScore(reports, new Map(), now);
    expect(score).toBeCloseTo(0, 0);
  });

  it("returns 80 for empty reports", () => {
    const score = computeQualityScore([], new Map(), now);
    expect(score).toBe(80);
  });
});

describe("computeOverallScore", () => {
  it("returns the minimum of availability and quality", () => {
    expect(computeOverallScore(90, 60)).toBe(60);
    expect(computeOverallScore(50, 80)).toBe(50);
  });
});

describe("computeTrend", () => {
  it("returns improving when score increased", () => {
    expect(computeTrend(80, 70)).toBe("improving");
  });

  it("returns declining when score decreased", () => {
    expect(computeTrend(60, 70)).toBe("declining");
  });

  it("returns stable when score is similar", () => {
    expect(computeTrend(72, 70)).toBe("stable");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd packages/api && npx vitest run test/health.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement health score service**

Create `packages/api/src/services/health.ts`:
```typescript
import type { Trend } from "@weatheragency/shared";

interface ReportForAvailability {
  status: string | null;
  user_id: string | null;
  created_at: string;
}

interface ReportForQuality {
  quality: string | null;
  user_id: string | null;
  created_at: string;
}

function getRecencyMultiplier(createdAt: string, now: Date): number {
  const ageMs = now.getTime() - new Date(createdAt).getTime();
  const ageMinutes = ageMs / 60_000;
  if (ageMinutes <= 5) return 1.0;
  if (ageMinutes <= 15) return 0.8;
  return 0.5;
}

function getTrustMultiplier(
  userId: string | null,
  trustScores: Map<string, number>
): number {
  if (!userId) return 0.5;
  return trustScores.get(userId) ?? 1.0;
}

function computeWeightedScore(
  baseValues: { base: number; userId: string | null; createdAt: string }[],
  trustScores: Map<string, number>,
  now: Date,
  defaultScore: number
): number {
  if (baseValues.length === 0) return defaultScore;

  let weightedSum = 0;
  let maxPossible = 0;

  for (const { base, userId, createdAt } of baseValues) {
    const trust = getTrustMultiplier(userId, trustScores);
    const recency = getRecencyMultiplier(createdAt, now);
    weightedSum += base * trust * recency;
    maxPossible += 1.0 * trust * recency;
  }

  if (maxPossible === 0) return defaultScore;

  return ((weightedSum / maxPossible + 1) / 2) * 100;
}

const STATUS_BASE: Record<string, number> = {
  working: 1.0,
  degraded: -0.5,
  down: -1.0,
};

const QUALITY_BASE: Record<string, number> = {
  good: 1.0,
  poor: -0.5,
  unusable: -1.0,
};

export function computeAvailabilityScore(
  reports: ReportForAvailability[],
  trustScores: Map<string, number>,
  now: Date
): number {
  const values = reports
    .filter((r) => r.status && STATUS_BASE[r.status] !== undefined)
    .map((r) => ({
      base: STATUS_BASE[r.status!],
      userId: r.user_id,
      createdAt: r.created_at,
    }));

  return computeWeightedScore(values, trustScores, now, 80);
}

export function computeQualityScore(
  reports: ReportForQuality[],
  trustScores: Map<string, number>,
  now: Date
): number {
  const values = reports
    .filter((r) => r.quality && QUALITY_BASE[r.quality] !== undefined)
    .map((r) => ({
      base: QUALITY_BASE[r.quality!],
      userId: r.user_id,
      createdAt: r.created_at,
    }));

  return computeWeightedScore(values, trustScores, now, 80);
}

export function computeOverallScore(
  availabilityScore: number,
  qualityScore: number
): number {
  return Math.min(availabilityScore, qualityScore);
}

export function computeTrend(
  currentScore: number,
  previousScore: number | null
): Trend {
  if (previousScore === null) return "stable";
  const diff = currentScore - previousScore;
  if (diff > 5) return "improving";
  if (diff < -5) return "declining";
  return "stable";
}

export type ProviderStatus =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage";

export function applyProviderStatusCap(
  availabilityScore: number,
  providerStatus: ProviderStatus | null
): number {
  if (!providerStatus || providerStatus === "operational")
    return availabilityScore;
  const caps: Record<string, number> = {
    degraded: 70,
    partial_outage: 40,
    major_outage: 15,
  };
  const cap = caps[providerStatus];
  return cap !== undefined ? Math.min(availabilityScore, cap) : availabilityScore;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd packages/api && npx vitest run test/health.test.ts
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/health.ts packages/api/test/health.test.ts && git commit -m "feat: add health score computation (availability, quality, trend, provider cap)"
```

---

## Task 9: Provider Status Scraping Service

**Files:**
- Create: `packages/api/src/services/provider-status.ts`
- Create: `packages/api/test/provider-status.test.ts`

- [ ] **Step 1: Write failing scraper tests**

Create `packages/api/test/provider-status.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import {
  parseStatuspageIo,
  normalizeStatus,
} from "../src/services/provider-status";

describe("parseStatuspageIo", () => {
  it("parses operational status", () => {
    const json = {
      status: { indicator: "none", description: "All Systems Operational" },
    };
    expect(parseStatuspageIo(json)).toBe("operational");
  });

  it("parses minor degradation", () => {
    const json = {
      status: {
        indicator: "minor",
        description: "Partially Degraded Service",
      },
    };
    expect(parseStatuspageIo(json)).toBe("degraded");
  });

  it("parses major outage", () => {
    const json = {
      status: { indicator: "major", description: "Major System Outage" },
    };
    expect(parseStatuspageIo(json)).toBe("major_outage");
  });

  it("parses critical outage", () => {
    const json = {
      status: { indicator: "critical", description: "Critical" },
    };
    expect(parseStatuspageIo(json)).toBe("major_outage");
  });
});

describe("normalizeStatus", () => {
  it("maps indicator values correctly", () => {
    expect(normalizeStatus("none")).toBe("operational");
    expect(normalizeStatus("minor")).toBe("degraded");
    expect(normalizeStatus("major")).toBe("major_outage");
    expect(normalizeStatus("critical")).toBe("major_outage");
    expect(normalizeStatus("unknown")).toBe(null);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd packages/api && npx vitest run test/provider-status.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement provider status service**

Create `packages/api/src/services/provider-status.ts`:
```typescript
import type { ProviderStatus } from "./health";

export function normalizeStatus(indicator: string): ProviderStatus | null {
  switch (indicator) {
    case "none":
      return "operational";
    case "minor":
      return "degraded";
    case "major":
      return "major_outage";
    case "critical":
      return "major_outage";
    default:
      return null;
  }
}

export function parseStatuspageIo(
  json: { status?: { indicator?: string } }
): ProviderStatus | null {
  const indicator = json?.status?.indicator;
  if (!indicator) return null;
  return normalizeStatus(indicator);
}

export async function scrapeStatuspage(
  url: string
): Promise<ProviderStatus | null> {
  try {
    const apiUrl = url.replace(/\/$/, "") + "/api/v2/status.json";
    const res = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return parseStatuspageIo(json as { status?: { indicator?: string } });
  } catch {
    return null;
  }
}

export async function scrapeProviderStatus(
  statusPageUrl: string,
  statusPageType: string
): Promise<ProviderStatus | null> {
  if (statusPageType === "statuspage_io") {
    return scrapeStatuspage(statusPageUrl);
  }
  // Custom scrapers for AWS/Google/Azure can be added here
  // For now, return null (skip) for custom types
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd packages/api && npx vitest run test/provider-status.test.ts
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/provider-status.ts packages/api/test/provider-status.test.ts && git commit -m "feat: add provider status scraping (statuspage.io parser)"
```

---

## Task 10: Status Route (Dashboard Endpoint)

**Files:**
- Create: `packages/api/src/routes/status.ts`
- Create: `packages/api/test/status.test.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: Write failing status tests**

Create `packages/api/test/status.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { initDb } from "./setup";
import app from "../src/index";

function req(path: string) {
  return new Request(`http://localhost${path}`);
}

describe("GET /api/status", () => {
  beforeEach(async () => {
    await initDb();
  });

  it("returns all approved models with default scores", async () => {
    const res = await app.fetch(req("/api/status"), env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.models.length).toBeGreaterThan(0);

    const sonnet = body.models.find(
      (m: { id: string }) => m.id === "claude-sonnet-4"
    );
    expect(sonnet).toBeDefined();
    expect(sonnet.worst_score).toBe(80); // Default when no snapshots
    expect(sonnet.endpoints.length).toBe(3);
  });

  it("uses health snapshots when available", async () => {
    // Insert a snapshot
    await env.DB.exec(`
      INSERT INTO health_snapshots (id, endpoint_id, score, availability_score, quality_score,
        report_count, working, degraded, down, quality_good, quality_poor, quality_unusable,
        provider_status, window_start, window_end)
      VALUES ('snap1', 'claude-sonnet-4--anthropic', 45, 45, 90, 10, 2, 3, 5, 8, 1, 1,
        'degraded', '2026-04-09T11:55:00Z', '2026-04-09T12:00:00Z')
    `);

    const res = await app.fetch(req("/api/status"), env);
    const body = await res.json();
    const sonnet = body.models.find(
      (m: { id: string }) => m.id === "claude-sonnet-4"
    );
    expect(sonnet.worst_score).toBe(45);
    expect(sonnet.worst_dimension).toBe("availability");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd packages/api && npx vitest run test/status.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement status route**

Create `packages/api/src/routes/status.ts`:
```typescript
import { Hono } from "hono";
import type { Env, Variables } from "../bindings";
import type { ModelStatus, EndpointHealth, Trend } from "@weatheragency/shared";

const status = new Hono<{ Bindings: Env; Variables: Variables }>();

status.get("/", async (c) => {
  // Get all approved models with their endpoints
  const rows = await c.env.DB.prepare(`
    SELECT m.id, m.name, m.provider, m.slug,
           e.id as endpoint_id, e.label, e.hosting_provider, e.is_official
    FROM models m
    JOIN endpoints e ON e.model_id = m.id AND e.status = 'approved'
    WHERE m.status = 'approved'
    ORDER BY m.provider, m.name
  `).all();

  // Get latest snapshot per endpoint
  const latestSnapshots = await c.env.DB.prepare(`
    SELECT hs.*
    FROM health_snapshots hs
    INNER JOIN (
      SELECT endpoint_id, MAX(created_at) as max_created
      FROM health_snapshots
      GROUP BY endpoint_id
    ) latest ON hs.endpoint_id = latest.endpoint_id AND hs.created_at = latest.max_created
  `).all();

  // Get snapshot from ~1 hour ago per endpoint (for trend)
  const hourAgoSnapshots = await c.env.DB.prepare(`
    SELECT hs.*
    FROM health_snapshots hs
    INNER JOIN (
      SELECT endpoint_id, MAX(created_at) as max_created
      FROM health_snapshots
      WHERE created_at <= datetime('now', '-55 minutes')
      GROUP BY endpoint_id
    ) older ON hs.endpoint_id = older.endpoint_id AND hs.created_at = older.max_created
  `).all();

  const snapshotMap = new Map<string, any>();
  for (const s of latestSnapshots.results) {
    snapshotMap.set(s.endpoint_id as string, s);
  }

  const hourAgoMap = new Map<string, any>();
  for (const s of hourAgoSnapshots.results) {
    hourAgoMap.set(s.endpoint_id as string, s);
  }

  // Group into models
  const modelMap = new Map<string, ModelStatus>();

  for (const row of rows.results) {
    const modelId = row.id as string;
    if (!modelMap.has(modelId)) {
      modelMap.set(modelId, {
        id: modelId,
        name: row.name as string,
        provider: row.provider as string,
        slug: row.slug as string,
        worst_score: 80,
        worst_dimension: "availability",
        worst_endpoint: "",
        trend: "stable" as Trend,
        report_count: 0,
        endpoints: [],
      });
    }

    const epId = row.endpoint_id as string;
    const snapshot = snapshotMap.get(epId);
    const hourAgo = hourAgoMap.get(epId);

    const score = snapshot ? (snapshot.score as number) : 80;
    const availabilityScore = snapshot
      ? (snapshot.availability_score as number)
      : 80;
    const qualityScore = snapshot ? (snapshot.quality_score as number) : 80;
    const previousScore = hourAgo ? (hourAgo.score as number) : null;

    let trend: Trend = "stable";
    if (previousScore !== null) {
      const diff = score - previousScore;
      if (diff > 5) trend = "improving";
      else if (diff < -5) trend = "declining";
    }

    const epHealth: EndpointHealth = {
      id: epId,
      label: row.label as string,
      hosting_provider: row.hosting_provider as string,
      is_official: row.is_official as number,
      score,
      availability_score: availabilityScore,
      quality_score: qualityScore,
      trend,
      report_count: snapshot ? (snapshot.report_count as number) : 0,
    };

    const model = modelMap.get(modelId)!;
    model.endpoints.push(epHealth);
    model.report_count += epHealth.report_count;

    // Update worst score
    if (score < model.worst_score || model.worst_endpoint === "") {
      model.worst_score = score;
      model.worst_endpoint = epId;
      model.trend = trend;
      model.worst_dimension =
        availabilityScore <= qualityScore ? "availability" : "quality";
    }
  }

  return c.json({ models: Array.from(modelMap.values()) });
});

export { status };
```

- [ ] **Step 4: Mount status route in index.ts**

Add to `packages/api/src/index.ts`:
```typescript
import { status } from "./routes/status";

app.route("/api/status", status);
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
cd packages/api && npx vitest run test/status.test.ts
```
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/status.ts packages/api/test/status.test.ts packages/api/src/index.ts && git commit -m "feat: add status route (dashboard endpoint with per-endpoint health)"
```

---

## Task 11: Cron Trigger (Health Snapshots)

**Files:**
- Modify: `packages/api/src/index.ts`
- Create: `packages/api/src/services/cron.ts`

- [ ] **Step 1: Implement cron handler**

Create `packages/api/src/services/cron.ts`:
```typescript
import { ulid } from "ulidx";
import type { Env } from "../bindings";
import {
  computeAvailabilityScore,
  computeQualityScore,
  computeOverallScore,
  applyProviderStatusCap,
} from "./health";
import { scrapeProviderStatus } from "./provider-status";

export async function handleScheduled(env: Env) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 30 * 60_000).toISOString();
  const windowEnd = now.toISOString();

  // 1. Scrape provider statuses
  const providers = await env.DB.prepare(
    "SELECT * FROM providers WHERE status_page_url IS NOT NULL"
  ).all();

  const providerStatusMap = new Map<string, string | null>();
  for (const p of providers.results) {
    if (p.status_page_url && p.status_page_type) {
      const status = await scrapeProviderStatus(
        p.status_page_url as string,
        p.status_page_type as string
      );
      providerStatusMap.set(p.id as string, status);
    }
  }

  // 2. Get all approved endpoints
  const endpoints = await env.DB.prepare(
    "SELECT e.*, m.provider as model_provider FROM endpoints e JOIN models m ON m.id = e.model_id WHERE e.status = 'approved'"
  ).all();

  // 3. Get trust scores for authenticated users
  const users = await env.DB.prepare(
    "SELECT id, trust_score FROM users"
  ).all();
  const trustScores = new Map<string, number>();
  for (const u of users.results) {
    trustScores.set(u.id as string, u.trust_score as number);
  }

  // 4. Compute snapshot for each endpoint
  for (const ep of endpoints.results) {
    const epId = ep.id as string;

    const reports = await env.DB.prepare(
      `SELECT status, quality, user_id, created_at FROM reports
       WHERE endpoint_id = ? AND created_at >= ?
       ORDER BY created_at DESC`
    )
      .bind(epId, windowStart)
      .all();

    const reportRows = reports.results as {
      status: string | null;
      quality: string | null;
      user_id: string | null;
      created_at: string;
    }[];

    let availabilityScore = computeAvailabilityScore(
      reportRows,
      trustScores,
      now
    );
    const qualityScore = computeQualityScore(reportRows, trustScores, now);

    // Apply provider status cap to availability
    const hostingProvider = ep.hosting_provider as string;
    const providerStatus = providerStatusMap.get(hostingProvider) ?? null;
    availabilityScore = applyProviderStatusCap(
      availabilityScore,
      providerStatus as any
    );

    const score = computeOverallScore(availabilityScore, qualityScore);

    // Count breakdowns
    let working = 0, degraded = 0, down = 0;
    let qualityGood = 0, qualityPoor = 0, qualityUnusable = 0;
    for (const r of reportRows) {
      if (r.status === "working") working++;
      if (r.status === "degraded") degraded++;
      if (r.status === "down") down++;
      if (r.quality === "good") qualityGood++;
      if (r.quality === "poor") qualityPoor++;
      if (r.quality === "unusable") qualityUnusable++;
    }

    await env.DB.prepare(
      `INSERT INTO health_snapshots
       (id, endpoint_id, score, availability_score, quality_score,
        report_count, working, degraded, down,
        quality_good, quality_poor, quality_unusable,
        provider_status, window_start, window_end)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        ulid(),
        epId,
        score,
        availabilityScore,
        qualityScore,
        reportRows.length,
        working,
        degraded,
        down,
        qualityGood,
        qualityPoor,
        qualityUnusable,
        providerStatus,
        windowStart,
        windowEnd
      )
      .run();
  }

  // 5. Clean up old rate limit entries
  await env.DB.prepare(
    "DELETE FROM rate_limits WHERE window < datetime('now', '-5 minutes')"
  ).run();
}
```

- [ ] **Step 2: Wire cron handler into index.ts**

Update the `scheduled` handler in `packages/api/src/index.ts`:
```typescript
import { handleScheduled } from "./services/cron";

export default {
  fetch: app.fetch,
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ) {
    ctx.waitUntil(handleScheduled(env));
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/services/cron.ts packages/api/src/index.ts && git commit -m "feat: add cron handler (health snapshot computation + provider scraping)"
```

---

## Task 12: Frontend Setup (Vite + React + Tailwind + Router)

**Files:**
- Create: `packages/web/index.html`
- Create: `packages/web/vite.config.ts`
- Create: `packages/web/postcss.config.js`
- Create: `packages/web/tailwind.config.ts`
- Create: `packages/web/src/main.tsx`
- Create: `packages/web/src/App.tsx`
- Create: `packages/web/src/index.css`

- [ ] **Step 1: Create Vite config**

Create `packages/web/vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
});
```

- [ ] **Step 2: Create Tailwind + PostCSS config**

Create `packages/web/postcss.config.js`:
```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};
```

Create `packages/web/tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#0f1923",
          card: "#1a2332",
          border: "#2a3a4a",
          muted: "#5a6a7a",
          text: "#e1e8ef",
          subtitle: "#8899aa",
        },
        health: {
          green: "#22c55e",
          amber: "#f59e0b",
          red: "#ef4444",
          gray: "#6b7b8d",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 3: Create index.html and entry point**

Create `packages/web/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Weather Agency — AI Model Status</title>
  </head>
  <body class="bg-brand-bg text-brand-text min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `packages/web/src/index.css`:
```css
@import "tailwindcss";
```

Create `packages/web/src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import { App } from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchInterval: 30_000,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
```

- [ ] **Step 4: Create App with router**

Create `packages/web/src/App.tsx`:
```tsx
import { Routes, Route } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { ModelDetail } from "./pages/ModelDetail";
import { HowItWorks } from "./pages/HowItWorks";
import { Suggest } from "./pages/Suggest";
import { Register } from "./pages/Register";
import { Login } from "./pages/Login";
import { Settings } from "./pages/Settings";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="model/:slug" element={<ModelDetail />} />
        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="suggest" element={<Suggest />} />
        <Route path="register" element={<Register />} />
        <Route path="login" element={<Login />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 5: Create Layout component**

Create `packages/web/src/components/Layout.tsx`:
```tsx
import { Link, Outlet } from "react-router";

export function Layout() {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-brand-border px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="text-xl font-bold text-brand-text">
            Weather Agency
          </Link>
          <div className="flex items-center gap-6 text-sm text-brand-subtitle">
            <Link to="/how-it-works" className="hover:text-brand-text">
              How it works
            </Link>
            <Link to="/suggest" className="hover:text-brand-text">
              Suggest a model
            </Link>
            <Link to="/login" className="hover:text-brand-text">
              Log in
            </Link>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Create stub pages**

Create the following stub pages so the app compiles. Each exports a component with placeholder text:

`packages/web/src/pages/Dashboard.tsx`:
```tsx
export function Dashboard() {
  return <div>Dashboard — TODO</div>;
}
```

`packages/web/src/pages/ModelDetail.tsx`:
```tsx
export function ModelDetail() {
  return <div>Model Detail — TODO</div>;
}
```

`packages/web/src/pages/HowItWorks.tsx`:
```tsx
export function HowItWorks() {
  return <div>How It Works — TODO</div>;
}
```

`packages/web/src/pages/Suggest.tsx`:
```tsx
export function Suggest() {
  return <div>Suggest — TODO</div>;
}
```

`packages/web/src/pages/Register.tsx`:
```tsx
export function Register() {
  return <div>Register — TODO</div>;
}
```

`packages/web/src/pages/Login.tsx`:
```tsx
export function Login() {
  return <div>Login — TODO</div>;
}
```

`packages/web/src/pages/Settings.tsx`:
```tsx
export function Settings() {
  return <div>Settings — TODO</div>;
}
```

- [ ] **Step 7: Verify it runs**

Run:
```bash
cd packages/web && npx vite --open
```
Expected: app opens in browser showing "Weather Agency" nav and "Dashboard — TODO".

- [ ] **Step 8: Commit**

```bash
git add packages/web/ && git commit -m "feat: scaffold frontend (Vite, React, Tailwind, React Router, stub pages)"
```

---

## Task 13: API Client and Data Hooks

**Files:**
- Create: `packages/web/src/api/client.ts`
- Create: `packages/web/src/hooks/useStatus.ts`
- Create: `packages/web/src/hooks/useModel.ts`
- Create: `packages/web/src/hooks/useReports.ts`
- Create: `packages/web/src/hooks/useAuth.ts`

- [ ] **Step 1: Create API client**

Create `packages/web/src/api/client.ts`:
```typescript
import type {
  StatusResponse,
  ReportsResponse,
  ModelDetail,
  AnalyticsResponse,
  ModelsResponse,
  AuthMeResponse,
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
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

  register: (body: RegisterRequest) =>
    apiFetch<RegisterResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: LoginRequest) =>
    apiFetch<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getMe: () => apiFetch<AuthMeResponse>("/api/auth/me"),

  regenerateToken: () =>
    apiFetch<RegenerateTokenResponse>("/api/auth/regenerate-token", {
      method: "POST",
    }),
};
```

- [ ] **Step 2: Create data hooks**

Create `packages/web/src/hooks/useStatus.ts`:
```typescript
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export function useStatus() {
  return useQuery({
    queryKey: ["status"],
    queryFn: api.getStatus,
    refetchInterval: 30_000,
  });
}
```

Create `packages/web/src/hooks/useReports.ts`:
```typescript
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
```

Create `packages/web/src/hooks/useModel.ts`:
```typescript
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
```

Create `packages/web/src/hooks/useAuth.ts`:
```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/api/ packages/web/src/hooks/ && git commit -m "feat: add API client and data hooks (status, reports, models, auth)"
```

---

## Task 14: Dashboard Page (Status Grid + Live Feed)

**Files:**
- Create: `packages/web/src/components/StatusBadge.tsx`
- Create: `packages/web/src/components/Sparkline.tsx`
- Create: `packages/web/src/components/ModelCard.tsx`
- Create: `packages/web/src/components/ReportFeed.tsx`
- Modify: `packages/web/src/pages/Dashboard.tsx`

- [ ] **Step 1: Create StatusBadge**

Create `packages/web/src/components/StatusBadge.tsx`:
```tsx
import { clsx } from "clsx";

interface StatusBadgeProps {
  score: number;
  dimension?: "availability" | "quality";
  reportCount?: number;
}

function getLabel(score: number, dimension?: string, reportCount?: number): string {
  if (reportCount !== undefined && reportCount < 3) return "Low data";
  if (dimension === "quality" && score < 70) return "Quality issues";
  if (score > 70) return "Operational";
  if (score > 40) return "Degraded";
  return "Down";
}

function getColor(score: number, reportCount?: number): string {
  if (reportCount !== undefined && reportCount < 3)
    return "text-health-gray bg-health-gray/15";
  if (score > 70) return "text-health-green bg-health-green/15";
  if (score > 40) return "text-health-amber bg-health-amber/15";
  return "text-health-red bg-health-red/15";
}

export function StatusBadge({ score, dimension, reportCount }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        "rounded-full px-2 py-0.5 text-xs",
        getColor(score, reportCount)
      )}
    >
      {getLabel(score, dimension, reportCount)}
    </span>
  );
}
```

- [ ] **Step 2: Create Sparkline**

Create `packages/web/src/components/Sparkline.tsx`:
```tsx
interface SparklineProps {
  score: number;
}

export function Sparkline({ score }: SparklineProps) {
  const color =
    score > 70
      ? "rgb(34, 197, 94)"
      : score > 40
        ? "rgb(245, 158, 11)"
        : "rgb(239, 68, 68)";

  // Generate a simple bar sparkline from the score
  const bars = 7;
  const heights = Array.from({ length: bars }, (_, i) => {
    const variation = Math.sin(i * 0.8) * 4;
    return Math.max(2, Math.min(30, (score / 100) * 30 + variation));
  });

  return (
    <div className="flex items-end gap-0.5" style={{ height: 30 }}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: h,
            backgroundColor: color,
            borderRadius: 2,
            opacity: 0.5 + (i / bars) * 0.5,
          }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create ModelCard**

Create `packages/web/src/components/ModelCard.tsx`:
```tsx
import { Link } from "react-router";
import { clsx } from "clsx";
import type { ModelStatus } from "@weatheragency/shared";
import { StatusBadge } from "./StatusBadge";
import { Sparkline } from "./Sparkline";

interface ModelCardProps {
  model: ModelStatus;
}

function scoreColor(score: number, reportCount: number): string {
  if (reportCount < 3) return "text-health-gray";
  if (score > 70) return "text-health-green";
  if (score > 40) return "text-health-amber";
  return "text-health-red";
}

function borderColor(score: number, reportCount: number): string {
  if (reportCount < 3) return "border-l-health-gray";
  if (score > 70) return "border-l-health-green";
  if (score > 40) return "border-l-health-amber";
  return "border-l-health-red";
}

function trendIcon(trend: string): string {
  if (trend === "improving") return "\u25B2";
  if (trend === "declining") return "\u25BC";
  return "\u2014";
}

export function ModelCard({ model }: ModelCardProps) {
  return (
    <Link
      to={`/model/${model.slug}`}
      className={clsx(
        "block rounded-lg border border-brand-border border-l-4 bg-brand-card p-4 transition-colors hover:border-brand-subtitle",
        borderColor(model.worst_score, model.report_count)
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-brand-subtitle">
          {model.provider}
        </span>
        <StatusBadge
          score={model.worst_score}
          dimension={model.worst_dimension}
          reportCount={model.report_count}
        />
      </div>

      <div className="mb-3 text-base font-semibold">{model.name}</div>

      <div className="mb-2 flex items-baseline gap-2">
        <span
          className={clsx(
            "text-3xl font-bold",
            scoreColor(model.worst_score, model.report_count)
          )}
        >
          {Math.round(model.worst_score)}
        </span>
        <span className="text-sm text-brand-muted">/100</span>
        <span
          className={clsx(
            "ml-auto text-xs",
            model.trend === "improving"
              ? "text-health-green"
              : model.trend === "declining"
                ? "text-health-red"
                : "text-brand-muted"
          )}
        >
          {trendIcon(model.trend)} {model.trend}
        </span>
      </div>

      <Sparkline score={model.worst_score} />

      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-brand-muted">
          {model.report_count} reports in last 30m
        </span>
      </div>

      {/* Mini endpoint indicators */}
      <div className="mt-2 flex gap-1.5">
        {model.endpoints.map((ep) => (
          <div
            key={ep.id}
            className="flex items-center gap-1 rounded bg-brand-bg px-1.5 py-0.5 text-[10px] text-brand-muted"
          >
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor:
                  ep.score > 70
                    ? "rgb(34, 197, 94)"
                    : ep.score > 40
                      ? "rgb(245, 158, 11)"
                      : "rgb(239, 68, 68)",
              }}
            />
            {ep.label.replace(/ (API|AI)$/, "")}
          </div>
        ))}
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Create ReportFeed**

Create `packages/web/src/components/ReportFeed.tsx`:
```tsx
import type { PublicReport } from "@weatheragency/shared";

interface ReportFeedProps {
  reports: PublicReport[];
}

function dotColor(report: PublicReport): string {
  const status = report.status ?? report.quality;
  if (status === "working" || status === "good") return "bg-health-green";
  if (status === "degraded" || status === "poor") return "bg-health-amber";
  return "bg-health-red";
}

function statusLabel(report: PublicReport): { text: string; color: string } {
  if (report.status) {
    const colors: Record<string, string> = {
      working: "text-health-green",
      degraded: "text-health-amber",
      down: "text-health-red",
    };
    return { text: report.status, color: colors[report.status] ?? "" };
  }
  if (report.quality) {
    const colors: Record<string, string> = {
      good: "text-health-green",
      poor: "text-health-amber",
      unusable: "text-health-red",
    };
    return { text: report.quality, color: colors[report.quality] ?? "" };
  }
  return { text: "", color: "" };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function ReportFeed({ reports }: ReportFeedProps) {
  if (reports.length === 0) {
    return (
      <div className="rounded-lg border border-brand-border bg-brand-card p-8 text-center text-brand-muted">
        No recent reports
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-brand-border bg-brand-card">
      {reports.map((report, i) => {
        const label = statusLabel(report);
        return (
          <div
            key={report.id}
            className={`flex items-center gap-3 px-4 py-3 ${
              i < reports.length - 1 ? "border-b border-brand-border" : ""
            }`}
          >
            <div className={`h-2 w-2 shrink-0 rounded-full ${dotColor(report)}`} />
            <div className="min-w-0 flex-1">
              <span className="font-medium">{report.model_name}</span>
              <span className={`ml-2 text-sm ${label.color}`}>
                {label.text}
              </span>
              {report.body && (
                <span className="ml-2 text-sm text-brand-muted">
                  — {report.body.slice(0, 80)}
                  {report.body.length > 80 ? "..." : ""}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {report.harness && (
                <span className="rounded bg-brand-bg px-1.5 py-0.5 text-[11px] text-brand-muted">
                  {report.harness}
                  {report.harness_version ? ` v${report.harness_version}` : ""}
                </span>
              )}
              {report.region && (
                <span className="text-[11px] text-brand-muted">
                  {report.region}
                </span>
              )}
              <span className="text-[11px] text-brand-muted">
                {timeAgo(report.created_at)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Implement Dashboard page**

Replace `packages/web/src/pages/Dashboard.tsx`:
```tsx
import { useStatus } from "../hooks/useStatus";
import { useReports } from "../hooks/useReports";
import { ModelCard } from "../components/ModelCard";
import { ReportFeed } from "../components/ReportFeed";

export function Dashboard() {
  const { data: status, isLoading: statusLoading } = useStatus();
  const { data: reports, isLoading: reportsLoading } = useReports({
    limit: 20,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">AI Model Status</h1>

      {statusLoading ? (
        <div className="text-brand-muted">Loading...</div>
      ) : (
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {status?.models.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      )}

      <h2 className="mb-4 text-lg font-semibold">Live Feed</h2>

      {reportsLoading ? (
        <div className="text-brand-muted">Loading...</div>
      ) : (
        <ReportFeed reports={reports?.reports ?? []} />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Verify the dashboard renders**

Run:
```bash
cd packages/web && npx vite
```
Expected: dashboard page renders with the status grid and live feed sections (data will show loading state without the API running).

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/ && git commit -m "feat: implement dashboard page (status grid, model cards, live report feed)"
```

---

## Task 15: Model Detail Page

**Files:**
- Create: `packages/web/src/components/EndpointRow.tsx`
- Create: `packages/web/src/components/HealthChart.tsx`
- Modify: `packages/web/src/pages/ModelDetail.tsx`

- [ ] **Step 1: Create EndpointRow**

Create `packages/web/src/components/EndpointRow.tsx`:
```tsx
import { clsx } from "clsx";
import type { EndpointHealth } from "@weatheragency/shared";

interface EndpointRowProps {
  endpoint: EndpointHealth;
}

export function EndpointRow({ endpoint }: EndpointRowProps) {
  const color =
    endpoint.score > 70
      ? "text-health-green"
      : endpoint.score > 40
        ? "text-health-amber"
        : "text-health-red";

  const dotColor =
    endpoint.score > 70
      ? "bg-health-green"
      : endpoint.score > 40
        ? "bg-health-amber"
        : "bg-health-red";

  return (
    <div className="flex items-center gap-4 border-b border-brand-border px-4 py-3 last:border-b-0">
      <div className={clsx("h-2 w-2 shrink-0 rounded-full", dotColor)} />
      <div className="flex-1">
        <div className="font-medium">{endpoint.label}</div>
        <div className="text-xs text-brand-muted">
          {endpoint.is_official ? "Official" : endpoint.hosting_provider}
          {" \u00B7 "}
          {endpoint.report_count} reports
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={clsx("text-xl font-bold", color)}>
          {Math.round(endpoint.score)}
        </span>
        <span className="text-xs text-brand-muted">/100</span>
      </div>
      <span
        className={clsx(
          "text-xs",
          endpoint.trend === "improving"
            ? "text-health-green"
            : endpoint.trend === "declining"
              ? "text-health-red"
              : "text-brand-muted"
        )}
      >
        {endpoint.trend === "improving"
          ? "\u25B2 improving"
          : endpoint.trend === "declining"
            ? "\u25BC declining"
            : "\u2014 stable"}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Create HealthChart**

Create `packages/web/src/components/HealthChart.tsx`:
```tsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { HealthSnapshot } from "@weatheragency/shared";

interface HealthChartProps {
  snapshots: HealthSnapshot[];
}

export function HealthChart({ snapshots }: HealthChartProps) {
  if (snapshots.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-brand-border bg-brand-card text-brand-muted">
        No data yet
      </div>
    );
  }

  const data = snapshots.map((s) => ({
    time: new Date(s.created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    availability: Math.round(s.availability_score),
    quality: Math.round(s.quality_score),
    overall: Math.round(s.score),
  }));

  return (
    <div className="h-64 rounded-lg border border-brand-border bg-brand-card p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4a" />
          <XAxis dataKey="time" stroke="#5a6a7a" fontSize={11} />
          <YAxis domain={[0, 100]} stroke="#5a6a7a" fontSize={11} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a2332",
              border: "1px solid #2a3a4a",
              borderRadius: 8,
            }}
          />
          <Line
            type="monotone"
            dataKey="availability"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            name="Availability"
          />
          <Line
            type="monotone"
            dataKey="quality"
            stroke="#818cf8"
            strokeWidth={2}
            dot={false}
            name="Quality"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Implement ModelDetail page**

Replace `packages/web/src/pages/ModelDetail.tsx`:
```tsx
import { useState } from "react";
import { useParams } from "react-router";
import { useModel, useAnalytics } from "../hooks/useModel";
import { useReports } from "../hooks/useReports";
import { StatusBadge } from "../components/StatusBadge";
import { EndpointRow } from "../components/EndpointRow";
import { HealthChart } from "../components/HealthChart";
import { ReportFeed } from "../components/ReportFeed";
import { clsx } from "clsx";

export function ModelDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [period, setPeriod] = useState("24h");

  // Slug is used as the model ID for API calls
  const { data: modelData, isLoading } = useModel(slug ?? "");
  const { data: analytics } = useAnalytics(slug ?? "", { period });
  const { data: reports } = useReports({ model_id: slug, limit: 20 });

  if (isLoading || !modelData) {
    return <div className="text-brand-muted">Loading...</div>;
  }

  const { model, endpoints } = modelData;
  const worstEndpoint = endpoints.reduce(
    (worst, ep) => (ep.score < worst.score ? ep : worst),
    endpoints[0]
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <span className="text-sm uppercase tracking-wide text-brand-subtitle">
          {model.provider}
        </span>
        <h1 className="mt-1 text-2xl font-bold">{model.name}</h1>
        <div className="mt-2 flex items-center gap-3">
          <span
            className={clsx(
              "text-3xl font-bold",
              worstEndpoint.score > 70
                ? "text-health-green"
                : worstEndpoint.score > 40
                  ? "text-health-amber"
                  : "text-health-red"
            )}
          >
            {Math.round(worstEndpoint.score)}
          </span>
          <span className="text-brand-muted">/100</span>
          <StatusBadge score={worstEndpoint.score} />
        </div>
      </div>

      {/* Endpoint breakdown */}
      <h2 className="mb-3 text-lg font-semibold">Endpoints</h2>
      <div className="mb-8 overflow-hidden rounded-lg border border-brand-border bg-brand-card">
        {endpoints.map((ep) => (
          <EndpointRow key={ep.id} endpoint={ep} />
        ))}
      </div>

      {/* Health chart */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Health Over Time</h2>
          <div className="flex gap-2">
            {["24h", "7d", "30d"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={clsx(
                  "rounded px-3 py-1 text-sm",
                  period === p
                    ? "bg-brand-border text-brand-text"
                    : "text-brand-muted hover:text-brand-text"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <HealthChart snapshots={analytics?.snapshots ?? modelData.snapshots_24h} />
      </div>

      {/* Breakdowns */}
      {analytics && (
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* By harness */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-brand-subtitle">
              By Harness
            </h3>
            <div className="rounded-lg border border-brand-border bg-brand-card p-4">
              {Object.entries(analytics.by_harness).length === 0 ? (
                <span className="text-sm text-brand-muted">No data</span>
              ) : (
                Object.entries(analytics.by_harness)
                  .sort(([, a], [, b]) => b - a)
                  .map(([harness, count]) => (
                    <div
                      key={harness}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm">{harness}</span>
                      <span className="text-sm text-brand-muted">{count}</span>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* By region */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-brand-subtitle">
              By Region
            </h3>
            <div className="rounded-lg border border-brand-border bg-brand-card p-4">
              {Object.entries(analytics.by_region).length === 0 ? (
                <span className="text-sm text-brand-muted">No data</span>
              ) : (
                Object.entries(analytics.by_region)
                  .sort(([, a], [, b]) => b - a)
                  .map(([region, count]) => (
                    <div
                      key={region}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm">{region}</span>
                      <span className="text-sm text-brand-muted">{count}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent reports */}
      <h2 className="mb-3 text-lg font-semibold">Recent Reports</h2>
      <ReportFeed reports={reports?.reports ?? []} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/ && git commit -m "feat: implement model detail page (endpoint breakdown, health chart, analytics)"
```

---

## Task 16: Auth Pages (Register, Login, Settings)

**Files:**
- Modify: `packages/web/src/pages/Register.tsx`
- Modify: `packages/web/src/pages/Login.tsx`
- Modify: `packages/web/src/pages/Settings.tsx`
- Modify: `packages/web/src/components/Layout.tsx`

- [ ] **Step 1: Implement Register page**

Replace `packages/web/src/pages/Register.tsx`:
```tsx
import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

export function Register() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate(
      { email, name: name || undefined },
      { onSuccess: () => navigate("/settings") }
    );
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold">Create Account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-brand-subtitle">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-brand-text outline-none focus:border-brand-subtitle"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-brand-subtitle">
            Name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-brand-text outline-none focus:border-brand-subtitle"
          />
        </div>
        {register.isError && (
          <p className="text-sm text-health-red">
            {register.error.message}
          </p>
        )}
        <button
          type="submit"
          disabled={register.isPending}
          className="w-full rounded-lg bg-health-green px-4 py-2 font-medium text-brand-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {register.isPending ? "Creating..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Implement Login page**

Replace `packages/web/src/pages/Login.tsx`:
```tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

export function Login() {
  const [token, setToken] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ token }, { onSuccess: () => navigate("/settings") });
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold">Log In</h1>
      <p className="mb-4 text-sm text-brand-subtitle">
        Enter your API token to log in. You can find it in your shell environment
        as <code className="rounded bg-brand-card px-1">WEATHER_AGENCY_TOKEN</code>.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-brand-subtitle">
            API Token
          </label>
          <input
            type="text"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="wa_..."
            className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 font-mono text-sm text-brand-text outline-none focus:border-brand-subtitle"
          />
        </div>
        {login.isError && (
          <p className="text-sm text-health-red">{login.error.message}</p>
        )}
        <button
          type="submit"
          disabled={login.isPending}
          className="w-full rounded-lg bg-health-green px-4 py-2 font-medium text-brand-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {login.isPending ? "Logging in..." : "Log In"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-brand-muted">
        Don't have an account?{" "}
        <Link to="/register" className="text-brand-text underline">
          Register
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Implement Settings page**

Replace `packages/web/src/pages/Settings.tsx`:
```tsx
import { useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

export function Settings() {
  const { user, isLoggedIn, isLoading, regenerateToken, logout } = useAuth();
  const [copied, setCopied] = useState(false);
  const token = localStorage.getItem("wa_token") ?? "";

  if (isLoading) return <div className="text-brand-muted">Loading...</div>;
  if (!isLoggedIn) return <Navigate to="/login" />;

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <div className="mb-6 rounded-lg border border-brand-border bg-brand-card p-4">
        <div className="mb-1 text-sm text-brand-subtitle">Signed in as</div>
        <div className="font-medium">{user?.email}</div>
        {user?.name && (
          <div className="text-sm text-brand-muted">{user.name}</div>
        )}
        <div className="mt-2 text-sm text-brand-muted">
          Trust score: {user?.trust_score}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">API Token</h2>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 font-mono text-sm text-brand-text">
            {token}
          </code>
          <button
            onClick={copyToken}
            className="shrink-0 rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-subtitle hover:text-brand-text"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="mt-2 text-sm text-brand-muted">
          Add this to your shell profile:
        </p>
        <code className="mt-1 block rounded-lg bg-brand-bg px-3 py-2 font-mono text-xs text-brand-subtitle">
          export WEATHER_AGENCY_TOKEN={token}
        </code>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => {
            if (confirm("This will invalidate your current token. Continue?")) {
              regenerateToken.mutate();
            }
          }}
          className="rounded-lg border border-health-amber px-4 py-2 text-sm text-health-amber hover:bg-health-amber/10"
        >
          Regenerate Token
        </button>
        <button
          onClick={logout}
          className="rounded-lg border border-brand-border px-4 py-2 text-sm text-brand-muted hover:text-brand-text"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update Layout nav for auth state**

Replace `packages/web/src/components/Layout.tsx`:
```tsx
import { Link, Outlet } from "react-router";
import { useAuth } from "../hooks/useAuth";

export function Layout() {
  const { isLoggedIn } = useAuth();

  return (
    <div className="min-h-screen">
      <nav className="border-b border-brand-border px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="text-xl font-bold text-brand-text">
            Weather Agency
          </Link>
          <div className="flex items-center gap-6 text-sm text-brand-subtitle">
            <Link to="/how-it-works" className="hover:text-brand-text">
              How it works
            </Link>
            <Link to="/suggest" className="hover:text-brand-text">
              Suggest a model
            </Link>
            {isLoggedIn ? (
              <Link to="/settings" className="hover:text-brand-text">
                Settings
              </Link>
            ) : (
              <Link to="/login" className="hover:text-brand-text">
                Log in
              </Link>
            )}
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/ && git commit -m "feat: implement auth pages (register, login, settings with token management)"
```

---

## Task 17: How It Works + Suggest Pages

**Files:**
- Modify: `packages/web/src/pages/HowItWorks.tsx`
- Modify: `packages/web/src/pages/Suggest.tsx`

- [ ] **Step 1: Implement HowItWorks page**

Replace `packages/web/src/pages/HowItWorks.tsx`:
```tsx
export function HowItWorks() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">How It Works</h1>

      <div className="space-y-8 text-brand-subtitle leading-relaxed">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-brand-text">
            Community-Driven Status
          </h2>
          <p>
            Weather Agency aggregates reports from developers using AI models
            through their coding tools. When you report that a model is down,
            degraded, or producing poor output, it contributes to the overall
            health score visible to everyone.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-brand-text">
            Two Dimensions: Availability + Quality
          </h2>
          <p>
            Each report can include an <strong>availability</strong> rating
            (working / degraded / down) and a <strong>quality</strong> rating
            (good / poor / unusable). These are tracked independently — a model
            can be up but producing bad output, and we'll surface that.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-brand-text">
            Health Score (0–100)
          </h2>
          <p className="mb-3">
            Every 5 minutes, we compute a health score per model endpoint. The
            score is the <strong>worse</strong> of the availability and quality
            scores.
          </p>
          <div className="rounded-lg border border-brand-border bg-brand-card p-4 font-mono text-sm">
            <p>For each report in the last 30 minutes:</p>
            <p className="mt-1 ml-4">base = +1.0 (working/good), -0.5 (degraded/poor), -1.0 (down/unusable)</p>
            <p className="mt-1 ml-4">× trust multiplier (anonymous: 0.5, authenticated: 1.0–2.0)</p>
            <p className="mt-1 ml-4">× recency multiplier (0–5min: 1.0, 5–15min: 0.8, 15–30min: 0.5)</p>
            <p className="mt-3">score = normalized weighted average → 0–100</p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-brand-text">
            Provider Status Integration
          </h2>
          <p>
            We also check official status pages (Anthropic, OpenAI, Google,
            AWS, etc.). If a provider reports an outage, we cap the availability
            score accordingly — even if user reports haven't caught up yet.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-brand-text">
            Trust & Weighting
          </h2>
          <p>
            Registered users' reports carry more weight than anonymous ones.
            This helps prevent spam and ensures the health scores reflect
            genuine experiences. Create a free account to increase your impact.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-brand-text">
            Reporting From Your Agent
          </h2>
          <p>
            Install the Weather Agency skill in your AI coding tool to report
            and check model status without leaving your workflow. The skill
            auto-detects your model, harness, and endpoint.
          </p>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement Suggest page**

Replace `packages/web/src/pages/Suggest.tsx`:
```tsx
import { useState } from "react";
import { api } from "../api/client";

export function Suggest() {
  const [provider, setProvider] = useState("");
  const [name, setName] = useState("");
  const [hostingProvider, setHostingProvider] = useState("");
  const [hostingLabel, setHostingLabel] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.suggestModel({
        provider,
        name,
        hosting_provider: hostingProvider || undefined,
        hosting_label: hostingLabel || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-4 text-2xl font-bold">Suggestion Submitted</h1>
        <p className="text-brand-subtitle">
          Your suggestion is pending review. It may take a while to get
          approved. Thank you for helping expand our catalog!
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-2xl font-bold">Suggest a Model</h1>
      <p className="mb-6 text-sm text-brand-subtitle">
        Don't see a model or endpoint you use? Suggest it here.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-brand-subtitle">
            Provider *
          </label>
          <input
            type="text"
            required
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="e.g. mistral, cohere"
            className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-brand-text outline-none focus:border-brand-subtitle"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-brand-subtitle">
            Model Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mistral Large 2"
            className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-brand-text outline-none focus:border-brand-subtitle"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-brand-subtitle">
            Hosting Provider (optional)
          </label>
          <input
            type="text"
            value={hostingProvider}
            onChange={(e) => setHostingProvider(e.target.value)}
            placeholder="e.g. together, fireworks"
            className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-brand-text outline-none focus:border-brand-subtitle"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-brand-subtitle">
            Hosting Label (optional)
          </label>
          <input
            type="text"
            value={hostingLabel}
            onChange={(e) => setHostingLabel(e.target.value)}
            placeholder="e.g. Together AI"
            className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-brand-text outline-none focus:border-brand-subtitle"
          />
        </div>
        {error && <p className="text-sm text-health-red">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-health-green px-4 py-2 font-medium text-brand-bg transition-opacity hover:opacity-90"
        >
          Submit Suggestion
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/pages/HowItWorks.tsx packages/web/src/pages/Suggest.tsx && git commit -m "feat: implement How It Works page and Suggest Model page"
```

---

## Task 18: Reporting Skill

**Files:**
- Create: `skill/weather-report.md`

- [ ] **Step 1: Write the skill**

Create `skill/weather-report.md`:
```markdown
---
name: weather-report
description: Check AI model status or report issues to Weather Agency. Use when the user asks about model health ("is my model dumb?", "is Claude down?"), or wants to report a problem ("model is slow", "report an issue"). Also triggered by "/weather" or "/report".
---

# Weather Agency: Check & Report

You are a skill for checking and reporting AI model health via Weather Agency (api.weather.agency).

## Mode Detection

Determine the mode from user intent:
- **Check mode**: "is my model dumb?", "how is Claude doing?", "is GPT-4o down?", "check model status", "what's the weather?", or any question about current model health
- **Report mode**: "report an issue", "Claude is being slow", "model is broken", "submit a report", or any statement describing a problem to flag
- **Ambiguous**: default to **check mode**, offer to report afterward

## Step 1: Auto-Detect Context

Detect the user's environment. Run these commands to gather info:

```bash
# Harness detection
echo "CLAUDE_CODE_VERSION=${CLAUDE_CODE_VERSION:-unset}"
echo "CURSOR_VERSION=${CURSOR_VERSION:-unset}"
# Check for common harness processes
ps aux 2>/dev/null | grep -i -E "(cursor|copilot|aider|continue)" | head -3 || true
```

```bash
# Model detection for Claude Code
cat ~/.claude/settings.json 2>/dev/null | grep -i model || echo "no claude settings"
# Check env vars for cloud endpoints
echo "AWS_BEDROCK=${AWS_BEDROCK:-unset}"
echo "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:+set}"
echo "OPENAI_API_KEY=${OPENAI_API_KEY:+set}"
```

From these results, infer:
- **Harness**: which tool (claude-code, cursor, copilot, aider, continue)
- **Harness version**: from env var or CLI
- **Model**: from config or env
- **Endpoint**: if AWS/GCP env vars are present, likely Bedrock/Vertex; otherwise the provider's direct API

## Step 2: Check Auth

```bash
echo "WEATHER_AGENCY_TOKEN=${WEATHER_AGENCY_TOKEN:+set}"
```

- If set: validate with `GET api.weather.agency/api/auth/me` using `Authorization: Bearer $WEATHER_AGENCY_TOKEN`. Greet the user by name.
- If unset: note that the user is anonymous. Mention: "Register at weather.agency to increase your report weight."

## Step 3A: Check Mode

Fetch current status:

```bash
curl -s "https://api.weather.agency/api/status" | head -c 5000
```

Find the detected model in the response. Present:

- Model name + endpoint
- Availability score + quality score
- Trend (improving / stable / declining)
- Report count in last 30 minutes

**Response format:**
- If quality is low (< 70): "Yes, users are reporting quality issues with {model} right now — quality score is {score}/100"
- If availability is low (< 70): "There are availability issues with {model} right now — availability score is {score}/100"
- If both fine: "{model} looks healthy — availability {score}/100, quality {score}/100"

Then ask: "Want to submit a report about your experience?" If yes, proceed to Step 3B.

If the model wasn't auto-detected, fetch the catalog and ask the user to pick:

```bash
curl -s "https://api.weather.agency/api/models?status=approved" | head -c 5000
```

Present models as AskUserQuestion options.

## Step 3B: Report Mode

Fetch the model catalog:

```bash
curl -s "https://api.weather.agency/api/models?status=approved" | head -c 5000
```

Present a form via AskUserQuestion with these fields:

1. **Model** — pre-selected if detected, otherwise choose from catalog
2. **Endpoint** — pre-selected if detected, otherwise choose from endpoints for selected model
3. **Availability** — working / degraded / down (optional)
4. **Quality** — good / poor / unusable (optional)
   - At least one of availability or quality must be provided
5. **Description** — free text (optional)

If the user's model or endpoint isn't in the catalog, allow them to type it and show: "This model/endpoint isn't tracked yet. Your report will be submitted as a suggestion — it may take a while to get approved."

Submit the report:

```bash
curl -s -X POST "https://api.weather.agency/api/reports" \
  -H "Content-Type: application/json" \
  ${WEATHER_AGENCY_TOKEN:+-H "Authorization: Bearer $WEATHER_AGENCY_TOKEN"} \
  -d '{
    "model_id": "<detected_model_id>",
    "hosting_provider": "<detected_hosting_provider>",
    "status": "<user_choice>",
    "quality": "<user_choice>",
    "body": "<user_text>",
    "harness": "<detected_harness>",
    "harness_version": "<detected_version>"
  }'
```

Confirm the submission and show the current health score for that endpoint.
```

- [ ] **Step 2: Commit**

```bash
git add skill/weather-report.md && git commit -m "feat: add Weather Agency reporting skill (check + report modes)"
```

---

## Task 19: Final Integration — Run All Tests + Verify

**Files:** None new — verification only.

- [ ] **Step 1: Install all dependencies**

Run:
```bash
pnpm install
```

- [ ] **Step 2: Run all API tests**

Run:
```bash
cd packages/api && pnpm test
```
Expected: all tests PASS.

- [ ] **Step 3: Typecheck all packages**

Run:
```bash
pnpm typecheck
```
Expected: no type errors.

- [ ] **Step 4: Verify frontend builds**

Run:
```bash
cd packages/web && pnpm build
```
Expected: build succeeds, output in `dist/`.

- [ ] **Step 5: Verify API runs locally**

Run:
```bash
cd packages/api && pnpm db:migrate && pnpm dev
```
Expected: Worker starts, `curl http://localhost:8787/api/health` returns `{"ok":true}`, `curl http://localhost:8787/api/status` returns models with default scores.

- [ ] **Step 6: Final commit**

```bash
git add -A && git commit -m "chore: verify full integration (all tests pass, builds succeed)"
```
