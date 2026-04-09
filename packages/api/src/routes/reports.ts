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
