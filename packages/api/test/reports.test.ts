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
