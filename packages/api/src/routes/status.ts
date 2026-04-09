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
    WHERE m.status = 'approved' AND m.featured = 1
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
