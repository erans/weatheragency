import type { MiddlewareHandler } from "hono";
import type { Env, Variables } from "../bindings";

export function rateLimit(
  limit: number,
  keyPrefix: string
): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> {
  return async (c, next) => {
    const ip = c.req.header("cf-connecting-ip") ?? "unknown";
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(ip)
    );
    const ipHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const window = new Date().toISOString().slice(0, 16); // per-minute window
    const key = `${keyPrefix}:${ipHash}`;

    const row = await c.env.DB.prepare(
      "INSERT INTO rate_limits (key, window, count) VALUES (?, ?, 1) ON CONFLICT(key, window) DO UPDATE SET count = count + 1 RETURNING count"
    )
      .bind(key, window)
      .first<{ count: number }>();

    if (row && row.count > limit) {
      return c.json({ error: "Rate limit exceeded" }, 429);
    }

    await next();
  };
}
