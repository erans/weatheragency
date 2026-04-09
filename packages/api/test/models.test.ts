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
