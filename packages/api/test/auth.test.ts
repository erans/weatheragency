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
