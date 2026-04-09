# Weather Agency — Design Spec

**"Down Detector for AI Models"** — a community-driven service where users report how AI models and agents are behaving, aggregated into a real-time status dashboard.

**URL:** `weather.agency` (frontend), `api.weather.agency` (API)

---

## Architecture

**Approach: Worker API + Cloudflare Pages**

- **API** (`packages/api`): Cloudflare Worker with Hono router, D1 database, cron triggers
- **Frontend** (`packages/web`): Cloudflare Pages serving a React + Vite SPA
- **Shared** (`packages/shared`): TypeScript types shared between API and frontend
- **Skill** (`skill/`): Superpowers skill for reporting from AI coding agents
- **Monorepo**: pnpm workspaces

The API and frontend deploy independently. The frontend talks to `api.weather.agency` via REST. CORS is configured on the Worker.

---

## Project Structure

```
weatheragency/
├── packages/
│   ├── api/                    # Cloudflare Worker
│   │   ├── src/
│   │   │   ├── index.ts        # Worker entry, Hono router
│   │   │   ├── routes/
│   │   │   │   ├── reports.ts  # POST /reports, GET /reports
│   │   │   │   ├── models.ts   # GET /models, GET /models/:id, POST /models/suggest
│   │   │   │   ├── status.ts   # GET /status (aggregated health)
│   │   │   │   └── auth.ts     # POST /auth/register, /auth/login, GET /auth/me
│   │   │   ├── services/
│   │   │   │   ├── health.ts   # Health score computation
│   │   │   │   ├── geoip.ts    # CF request → location
│   │   │   │   └── provider-status.ts  # Scrape provider status pages
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts     # Optional auth extraction
│   │   │   │   ├── cors.ts
│   │   │   │   └── rate-limit.ts
│   │   │   ├── db/
│   │   │   │   ├── schema.sql  # D1 schema
│   │   │   │   └── queries.ts  # Typed query helpers
│   │   │   └── types.ts
│   │   ├── wrangler.toml
│   │   └── package.json
│   ├── web/                    # Cloudflare Pages (React + Vite)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx    # Status grid + live feed
│   │   │   │   ├── ModelDetail.tsx  # Full analytics for one model
│   │   │   │   ├── HowItWorks.tsx   # Scoring algorithm explanation
│   │   │   │   ├── Suggest.tsx      # Suggest a new model
│   │   │   │   ├── Register.tsx     # Sign up
│   │   │   │   ├── Login.tsx        # Log in
│   │   │   │   └── Settings.tsx     # View/regenerate API token
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── api/            # API client
│   │   │   └── App.tsx
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── shared/                 # Shared types between api and web
│       ├── types.ts
│       └── package.json
├── skill/                      # Superpowers skill for reporting
│   └── report.md
├── package.json                # Workspace root (pnpm)
└── turbo.json
```

---

## Data Model (D1)

### providers

Hosting providers and AI companies with status pages.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | `"anthropic"`, `"openai"`, `"aws-bedrock"` |
| name | TEXT | Display name |
| status_page_url | TEXT | e.g., `https://status.anthropic.com` |
| status_page_type | TEXT | `"statuspage_io"` / `"custom"` |
| created_at | TEXT | ISO 8601 |

### models

Logical model identities.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | `"claude-sonnet-4"`, `"gpt-4o"` |
| provider | TEXT | Creator: `"anthropic"`, `"openai"`, `"meta"` |
| name | TEXT | Display name: `"Claude Sonnet 4"` |
| slug | TEXT UNIQUE | URL-friendly identifier |
| is_curated | INTEGER | 1 = official, 0 = user-suggested |
| status | TEXT | `"pending"` / `"approved"` / `"rejected"` |
| created_at | TEXT | ISO 8601 |

### endpoints

Where a model runs. A model has many endpoints.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | `"claude-sonnet-4--anthropic"` (format: `{model_id}--{hosting_provider}`) |
| model_id | TEXT FK | References models.id |
| hosting_provider | TEXT | `"anthropic"`, `"aws-bedrock"`, `"gcp-vertex"`, `"together"`, etc. Not an FK to providers — providers table is only for status page scraping config. |
| is_official | INTEGER | 1 = model creator's own API |
| label | TEXT | `"Anthropic API"`, `"AWS Bedrock"` |
| status_page_url | TEXT | Endpoint-specific status page (optional) |
| is_curated | INTEGER | 1 = curated, 0 = user-suggested |
| status | TEXT | `"pending"` / `"approved"` / `"rejected"` |
| created_at | TEXT | ISO 8601 |

### reports

Individual user reports filed against an endpoint.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | ULID (time-sortable) |
| endpoint_id | TEXT FK | References endpoints.id |
| status | TEXT | `"working"` / `"degraded"` / `"down"` (availability — optional, can be NULL) |
| quality | TEXT | `"good"` / `"poor"` / `"unusable"` (output quality — optional, can be NULL) |
| body | TEXT | Free text description (optional) |
| harness | TEXT | `"claude-code"`, `"cursor"`, `"copilot"` |
| harness_version | TEXT | |
| country | TEXT | ISO 3166-1, from CF GeoIP |
| region | TEXT | e.g., `"US-CA"`, from CF GeoIP |
| city | TEXT | From CF GeoIP |
| latitude | REAL | From CF GeoIP |
| longitude | REAL | From CF GeoIP |
| user_id | TEXT | NULL for anonymous |
| ip_hash | TEXT | Hashed IP for dedup (never raw) |
| created_at | TEXT | ISO 8601 |

### health_snapshots

Precomputed per-endpoint health, written by cron every 5 minutes.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| endpoint_id | TEXT FK | References endpoints.id |
| score | REAL | 0–100 overall health score (worst of availability and quality) |
| availability_score | REAL | 0–100 from status reports |
| quality_score | REAL | 0–100 from quality reports |
| report_count | INTEGER | Reports in the window |
| working | INTEGER | Count of "working" status reports |
| degraded | INTEGER | Count of "degraded" status reports |
| down | INTEGER | Count of "down" status reports |
| quality_good | INTEGER | Count of "good" quality reports |
| quality_poor | INTEGER | Count of "poor" quality reports |
| quality_unusable | INTEGER | Count of "unusable" quality reports |
| provider_status | TEXT | From official status page |
| window_start | TEXT | ISO 8601 |
| window_end | TEXT | ISO 8601 |
| created_at | TEXT | ISO 8601 |

### users

Authenticated users (registered via web UI).

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| email | TEXT UNIQUE | |
| name | TEXT | |
| api_token | TEXT UNIQUE | `"wa_xxxxx"` — shown in settings page |
| trust_score | REAL | Starts at 1.0, adjustable |
| created_at | TEXT | ISO 8601 |

---

## API Design

Base URL: `api.weather.agency`

### Reporting

**POST /api/reports**
- Body: `{ endpoint_id?, model_id?, hosting_provider?, status?, quality?, body?, harness?, harness_version? }`
- Auth: Optional Bearer token (`WEATHER_AGENCY_TOKEN`)
- Response: `{ id, created_at }`
- Notes: Accepts either `endpoint_id` directly, or `model_id` + optional `hosting_provider` (resolved to endpoint server-side; defaults to the model's official endpoint if `hosting_provider` is omitted). At least one of `status` or `quality` must be provided. GeoIP extracted from CF request. Rate limit: 10/min per IP hash. Anonymous reports accepted; authenticated reports get trust multiplier.

**GET /api/reports**
- Query: `?model_id=&endpoint_id=&limit=50&offset=0`
- Response: `{ reports: [...], total }`
- Notes: Public. Returns recent reports. No IP or user data exposed.

### Models & Endpoints

**GET /api/models**
- Query: `?provider=&status=approved`
- Response: `{ models: [{ ...model, endpoints: [...], current_health }] }`
- Notes: Returns all approved models with their endpoints and current health scores.

**GET /api/models/:id**
- Response: `{ model, endpoints: [{ ...endpoint, current_health }], snapshots_24h }`
- Notes: Model detail + per-endpoint health + recent history.

**GET /api/models/:id/analytics**
- Query: `?period=24h|7d|30d&endpoint_id=`
- Response: `{ snapshots: [...], by_harness: {...}, by_region: {...}, report_volume: [...] }`
- Notes: Full analytics breakdown. Can filter by endpoint.

**POST /api/models/suggest**
- Body: `{ provider, name, slug?, hosting_provider?, hosting_label? }`
- Auth: Optional
- Response: `{ id, status: "pending" }`
- Notes: Suggest a new model or endpoint. Goes into pending review.

### Status (Dashboard)

**GET /api/status**
- Response: `{ models: [{ id, name, provider, slug, worst_score, worst_dimension, worst_endpoint, trend, endpoints: [{ id, label, score, availability_score, quality_score, trend }] }] }`
- Notes: Main dashboard endpoint. Returns all approved models with per-endpoint health scores. `worst_score` is the lowest endpoint score (used for card headline). `worst_dimension` is `"availability"` or `"quality"` indicating which axis is worse. Served from health_snapshots.

### Auth

**POST /api/auth/register**
- Body: `{ email, name? }`
- Response: `{ user, token }`
- Notes: Called from web UI only. Creates account and returns API token immediately. No email verification for v1.

**POST /api/auth/login**
- Body: `{ token }`
- Response: `{ user }`
- Notes: Called from web UI only. Validates an existing API token and returns user info. Used to authenticate the web session (token stored in localStorage).

**GET /api/auth/me**
- Auth: Bearer token (required)
- Response: `{ id, email, name, trust_score }`
- Notes: Validates token, returns user info. Used by the skill to check auth status.

**POST /api/auth/regenerate-token**
- Auth: Bearer token (required)
- Response: `{ token }`
- Notes: Generates a new API token, invalidates the old one. Called from web settings page.

---

## Health Score Algorithm

Computed every 5 minutes per endpoint by a cron-triggered Worker. Two independent scores are computed: **availability** (from `status` reports) and **quality** (from `quality` reports). The headline score is the worse of the two.

### Inputs

1. User reports from the last 30-minute window for this endpoint
2. Official provider status (scraped from status pages)

### Availability Scoring (from `status` field)

```
For each report with a status value in the window:
  base = +1.0 (working), -0.5 (degraded), -1.0 (down)

  trust_multiplier:
    anonymous     = 0.5
    authenticated = user.trust_score (default 1.0, max 2.0)

  recency_multiplier:
    0–5 min ago   = 1.0
    5–15 min ago  = 0.8
    15–30 min ago = 0.5

  weighted_score = base × trust_multiplier × recency_multiplier

weighted_sum       = sum of all weighted_scores
max_possible       = report_count × 1.0 × max_trust × 1.0
availability_score = ((weighted_sum / max_possible) + 1) / 2 × 100
  → Normalized to 0–100 (100 = all working, 0 = all down)
```

### Quality Scoring (from `quality` field)

Same algorithm structure, applied to quality reports:

```
For each report with a quality value in the window:
  base = +1.0 (good), -0.5 (poor), -1.0 (unusable)

  (Same trust and recency multipliers as availability)

quality_score = ((weighted_sum / max_possible) + 1) / 2 × 100
  → Normalized to 0–100 (100 = all good, 0 = all unusable)
```

A single report can contribute to both scores if it has both `status` and `quality` set.

### Overall Score

```
score = min(availability_score, quality_score)
```

The headline score surfaces the worst dimension, so problems are visible regardless of whether they're availability or quality related.

### Provider Status Modifier

Applied to the **availability** score only (provider status pages don't reflect quality):
- Operational: no modifier
- Degraded performance: cap availability_score at 70
- Partial outage: cap availability_score at 40
- Major outage: cap availability_score at 15

### Edge Cases

- **No reports in window**: carry forward previous score, decaying toward 80 (assumed healthy) over 2 hours
- **Very few reports (< 3)**: display score but flag as "low data"
- **New model/endpoint**: starts at 80 (assumed healthy) until enough reports arrive

### Trend

- Compare current score to score from 1 hour ago
- `> +5` = improving, `< -5` = declining, else stable

### Model-Level Score

- The model's headline score is the **worst** endpoint score (so problems are visible at a glance)
- Model trend follows the worst endpoint's trend

### Transparency

The scoring algorithm is documented on the `/how-it-works` page of the frontend so users understand how their reports contribute to the health scores.

---

## Provider Status Scraping

Runs as part of the cron trigger (every 5 minutes).

| Provider | Status Page Type | URL |
|----------|-----------------|-----|
| Anthropic | statuspage_io | status.anthropic.com |
| OpenAI | statuspage_io | status.openai.com |
| Google Cloud | custom | status.cloud.google.com |
| AWS | custom | health.aws.amazon.com |
| Azure | custom | status.azure.com |
| Together AI | statuspage_io | status.together.ai |
| Fireworks AI | statuspage_io | status.fireworks.ai |
| Groq | statuspage_io | status.groq.com |

**Implementation:**
- `StatusScraper` interface with per-type implementations
- `statuspage_io` scraper: hits `/api/v2/components.json`, matches relevant component by name
- Custom scrapers for AWS/Google/Azure parse their specific formats
- If a scrape fails, skip the provider modifier (don't penalize for scrape failure)

---

## Frontend

### Tech Stack

- React + Vite + React Router
- TanStack Query for data fetching + polling (auto-refetch every 30s)
- Recharts for health charts and report volume graphs
- Tailwind CSS for styling

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Status grid + live report feed |
| `/model/:slug` | ModelDetail | Full analytics for one model |
| `/how-it-works` | HowItWorks | Health score algorithm explanation |
| `/suggest` | Suggest | Suggest a new model/endpoint |
| `/register` | Register | Sign up (email + name) |
| `/login` | Login | Magic link auth |
| `/settings` | Settings | View/regenerate API token, copy instructions |

### Dashboard (`/`)

**Status grid**: 3-column grid of model cards. Each card shows:
- Provider label (uppercase, muted)
- Model name
- Health score (large number, color-coded: green > 70, amber 40–70, red < 40)
- Status badge (Operational / Degraded / Down / Low data / Low quality)
- Dimension indicator: if the worst score is quality rather than availability, show a label like "Quality issues" so users know it's not a downtime problem
- Mini sparkline showing recent trend
- Report count in last 30 minutes
- Mini endpoint indicators (colored dots for each endpoint)
- Subtitle showing which endpoint is worst if degraded

**Live feed**: Below the grid, a scrolling list of recent reports showing:
- Status dot (green/amber/red)
- Model name + status label
- Free text excerpt
- Harness + version badge
- Region code
- Relative timestamp

Frontend polls `GET /api/status` every 30 seconds for the grid and `GET /api/reports?limit=20` for the feed. Designed so TanStack Query's refetch can be swapped to a WebSocket subscription later.

### Model Detail (`/model/:slug`)

- Header: model name, provider, current health score, status badge
- Per-endpoint breakdown: rows showing each endpoint with score, trend, report count
- Health score chart: line chart over 24h/7d/30d (switchable), one line per endpoint
- Report volume chart: bar chart showing report count over time
- Breakdown by harness: horizontal bar chart
- Breakdown by region: horizontal bar chart or simple table
- Recent reports list: paginated feed of reports for this model

### Settings (`/settings`)

- Displays the user's API token with a copy button
- Instructions: `export WEATHER_AGENCY_TOKEN=wa_xxxxx`
- Regenerate token button (with confirmation)
- Trust score display (read-only)

---

## Reporting Skill

A superpowers skill with two modes: **check** (query current status) and **report** (submit a report). The skill auto-detects which mode based on user intent.

### Mode Detection

- **Check mode** triggers on: "is my model dumb?", "how is Claude doing?", "is GPT-4o down?", "check model status", "what's the weather?" or any question asking about current model health
- **Report mode** triggers on: "report an issue", "Claude is being slow", "model is broken", "submit a report" or any statement describing a problem to flag
- If ambiguous, default to **check mode** and offer to submit a report afterward

### Shared: Auto-Detection

Both modes start by detecting the user's context:

1. **Harness + version**: infer from environment variables (`CLAUDE_CODE_VERSION`, etc.) or CLI commands
2. **Active model**: check harness config files / env vars
3. **Hosting provider**: check for cloud-specific env vars (e.g., `AWS_BEDROCK` → Bedrock)

### Check Mode Flow

1. **Auto-detect** the current model and endpoint (see above)
2. **Fetch status**: `GET api.weather.agency/api/status` to get current health scores
3. **Find the relevant endpoint**: match detected model + hosting provider to an endpoint in the response
4. **Present results** clearly:
   - Model name + endpoint
   - Availability score + quality score (with color-coded labels)
   - Trend (improving / stable / declining)
   - If quality is low: "Yes, users are reporting quality issues with {model} right now — quality score is {score}/100"
   - If availability is low: "There are availability issues with {model} right now — availability score is {score}/100"
   - If both are fine: "{model} looks healthy — availability {score}/100, quality {score}/100"
   - Report count in the last 30 minutes for context
5. **Offer follow-up**: "Want to submit a report about your experience?" → switches to report mode if yes

If the model can't be auto-detected, ask the user to pick from the catalog (fetched from `GET api.weather.agency/api/models?status=approved`).

### Report Mode Flow

1. **Check auth**: Look for `WEATHER_AGENCY_TOKEN` env var
   - Present: `GET api.weather.agency/api/auth/me` to validate, greet by name
   - Absent: inform user they're reporting anonymously, mention `weather.agency` for registration
2. **Fetch catalog**: `GET api.weather.agency/api/models?status=approved` to get current models + endpoints
3. **Auto-detect context** (see above)
4. **Present pre-filled form** (via AskUserQuestion):
   - Model: pre-selected if detected, otherwise choose from catalog
   - Endpoint: pre-selected if detected, otherwise choose from endpoints for selected model
   - Status: working / degraded / down (optional)
   - Quality: good / poor / unusable (optional, at least one of status/quality required)
   - Free text: optional description
   - Harness + version: pre-filled from detection, allow override
5. **Model/endpoint not in catalog**: allow user to type a new one, show note: *"This model/endpoint isn't tracked yet. Your report will be submitted as a suggestion — it may take a while to get approved."*
6. **Submit**: `POST api.weather.agency/api/reports`
7. **Confirm**: show submitted report and current health score for that endpoint

### Auto-Detection Heuristics

| Harness | Detection | Model source |
|---------|-----------|-------------|
| Claude Code | `CLAUDE_CODE_VERSION` env | `--model` flag, settings |
| Cursor | Process name / config dir | `.cursor/settings.json` |
| Copilot | VS Code extension check | Extension settings |
| Aider | `AIDER_*` env vars | `.aider.conf.yml` |
| Continue | Config dir presence | `config.json` |

Auto-detection is best-effort. If detection fails, the user picks manually.

---

## Authentication

### Approach

Lightweight token-based auth. Registration and login happen on the web UI only. The API token is used by the skill and the web frontend.

### Flow

1. User visits `weather.agency/register`, enters email + optional name
2. Backend creates user, generates `wa_` prefixed API token
3. Token is shown immediately on the registration success screen and on `/settings`
4. User copies token and sets `WEATHER_AGENCY_TOKEN=wa_xxxxx` in their shell profile
5. To log in on the web later: enter the API token on `/login` (token-based auth, no magic links for v1)
6. Web session stores token in localStorage; API requests include `Authorization: Bearer wa_xxxxx`
7. Backend resolves user from token, applies trust_score to report weighting
8. If token is lost: user must register again (recovery flow is out of scope for v1)

### Trust Scoring

- New users start at trust_score = 1.0
- Anonymous reports use effective trust of 0.5
- Trust can be adjusted manually by admins (future: algorithmic based on report accuracy)

---

## Cron Jobs

Configured in `wrangler.toml` as scheduled triggers.

**Every 5 minutes:**
1. Scrape provider status pages → store latest status per provider
2. For each approved endpoint:
   - Query reports from last 30 minutes
   - Compute weighted health score
   - Apply provider status modifier (cap)
   - Write health_snapshot row

---

## Rate Limiting

- Reports: 10 per minute per IP hash
- Status/read endpoints: 60 per minute per IP
- Auth endpoints: 5 per minute per IP
- Implementation: IP hash bucketing in D1 or Cloudflare Rate Limiting rules

---

## Future Considerations (Out of Scope for v1)

- **WebSocket support** via Durable Objects for real-time dashboard updates
- **Algorithmic trust scoring** based on report accuracy vs consensus
- **Admin dashboard** for managing model catalog, reviewing suggestions, adjusting trust scores
- **Notifications** (email/webhook) when a model's status changes
- **API key scoping** (read-only vs report-only tokens)
- **Geo map visualization** on the dashboard
