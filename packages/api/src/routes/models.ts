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
  const volumeParams: string[] = [modelId];

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
    .bind(model.id)
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
    .bind(model.id)
    .all();

  return c.json({
    model,
    endpoints,
    snapshots_24h: snapshots24h.results,
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
