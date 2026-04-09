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
