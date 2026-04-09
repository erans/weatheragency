# Weather Agency

Community-driven "Down Detector" for AI models. Aggregates real-time reports from developers about model availability and quality, computes health scores, and displays them on a live dashboard.

## How It Works

Developers report model status (working / degraded / down) and quality (good / poor / unusable) through the API or an AI coding tool skill. Reports are weighted by trust score and recency, then aggregated into a 0-100 health score per model endpoint every 5 minutes. Official provider status pages are also scraped to cap scores during known outages.

## Architecture

```
weather.agency (frontend)     api.weather.agency (API)
      |                              |
  React SPA                   Cloudflare Workers
  Vite + Tailwind v4          Hono router + D1 (SQLite)
  TanStack Query              Cron triggers (*/5 min)
```

**Monorepo layout:**

| Package | Description |
|---------|-------------|
| `packages/api` | Cloudflare Workers API with Hono, D1, cron triggers |
| `packages/web` | React SPA with Vite, Tailwind CSS v4, TanStack Query |
| `packages/shared` | Shared TypeScript types |
| `skill/` | Weather Agency reporting skill for AI coding tools |

## Getting Started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) 9.15+
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (for API development)

### Install

```bash
pnpm install
```

### Development

```bash
# Run both API and frontend
pnpm dev

# Run API only
pnpm dev:api

# Run frontend only
pnpm dev:web
```

The API runs on `http://localhost:8787` and the frontend on `http://localhost:3000`.

### Testing

```bash
# Run all tests
pnpm test

# Typecheck all packages
pnpm typecheck
```

### Build

```bash
pnpm build
```

## API

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/status` | Dashboard data (all models with health scores) |
| `GET` | `/api/models` | List models with endpoints |
| `GET` | `/api/models/:id` | Model detail with endpoint breakdown |
| `GET` | `/api/models/:id/analytics` | Analytics (snapshots, by harness, by region) |
| `GET` | `/api/reports` | Recent reports (PII excluded) |
| `POST` | `/api/reports` | Submit a report |
| `POST` | `/api/models/suggest` | Suggest a new model/endpoint |

### Auth Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Create account (returns API token) |
| `POST` | `/api/auth/login` | Validate token |
| `GET` | `/api/auth/me` | Current user info |
| `POST` | `/api/auth/regenerate-token` | Generate new API token |

Authentication uses Bearer tokens with a `wa_` prefix. Anonymous reports are accepted but weighted lower.

## Health Score Algorithm

Each model endpoint gets a score from 0 to 100, recomputed every 5 minutes:

1. Collect reports from the last 30 minutes
2. Score each report: `+1.0` (working/good), `-0.5` (degraded/poor), `-1.0` (down/unusable)
3. Apply trust multiplier: anonymous `0.5x`, authenticated `1.0-2.0x`
4. Apply recency weight: 0-5min `1.0x`, 5-15min `0.8x`, 15-30min `0.5x`
5. Compute weighted average, normalize to 0-100
6. Track availability and quality independently; headline = min(both)
7. Cap by provider status page if outage reported

## Reporting Skill

The Weather Agency skill lets you check model status and submit reports directly from your AI coding tool without leaving your workflow. It auto-detects your model, harness, and endpoint.

### Installing the Skill

**Claude Code:**

```bash
# Copy the skill file into your Claude Code skills directory
cp skill/weather-report.md ~/.claude/skills/weather-report.md
```

Or add it to a project-level `.claude/skills/` directory for team use.

**Other AI coding tools (Cursor, Copilot, Aider, etc.):**

Copy `skill/weather-report.md` into the tool's skill/prompt directory. The skill uses standard tool interfaces (bash, user prompts) and should work with any tool that supports markdown-based skills.

### Authentication (Optional)

For higher-weight reports, register at [weather.agency](https://weather.agency) and set the token in your shell:

```bash
export WEATHER_AGENCY_TOKEN=wa_your_token_here
```

Add this to your shell profile (`.bashrc`, `.zshrc`, etc.) to persist it across sessions. Anonymous reports are accepted but carry less weight in health score calculations.

## License

[Apache License 2.0](LICENSE) - Copyright 2026 Eran Sandler
