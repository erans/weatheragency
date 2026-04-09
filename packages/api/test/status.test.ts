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
    await env.DB.prepare(`
      INSERT INTO health_snapshots (id, endpoint_id, score, availability_score, quality_score,
        report_count, working, degraded, down, quality_good, quality_poor, quality_unusable,
        provider_status, window_start, window_end)
      VALUES ('snap1', 'claude-sonnet-4--anthropic', 45, 45, 90, 10, 2, 3, 5, 8, 1, 1,
        'degraded', '2026-04-09T11:55:00Z', '2026-04-09T12:00:00Z')
    `).run();

    const res = await app.fetch(req("/api/status"), env);
    const body = await res.json();
    const sonnet = body.models.find(
      (m: { id: string }) => m.id === "claude-sonnet-4"
    );
    expect(sonnet.worst_score).toBe(45);
    expect(sonnet.worst_dimension).toBe("availability");
  });
});
