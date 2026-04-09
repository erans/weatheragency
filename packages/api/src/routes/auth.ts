import { Hono } from "hono";
import type { Env, Variables } from "../bindings";

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `wa_${hex}`;
}

auth.post("/register", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { email, name } = body as { email?: string; name?: string };

  if (!email || typeof email !== "string") {
    return c.json({ error: "email is required" }, 400);
  }

  const id = crypto.randomUUID();
  const token = generateToken();

  try {
    await c.env.DB.prepare(
      "INSERT INTO users (id, email, name, api_token) VALUES (?, ?, ?, ?)"
    )
      .bind(id, email, name ?? null, token)
      .run();
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("UNIQUE")) {
      return c.json({ error: "Email already registered" }, 409);
    }
    throw e;
  }

  return c.json({
    user: { id, email, name: name ?? null, trust_score: 1.0 },
    token,
  });
});

auth.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { token } = body as { token?: string };

  if (!token) {
    return c.json({ error: "token is required" }, 400);
  }

  const user = await c.env.DB.prepare(
    "SELECT id, email, name, trust_score FROM users WHERE api_token = ?"
  )
    .bind(token)
    .first();

  if (!user) {
    return c.json({ error: "Invalid token" }, 401);
  }

  return c.json({ user });
});

auth.get("/me", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    trust_score: user.trust_score,
  });
});

auth.post("/regenerate-token", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const newToken = generateToken();
  await c.env.DB.prepare("UPDATE users SET api_token = ? WHERE id = ?")
    .bind(newToken, user.id)
    .run();

  return c.json({ token: newToken });
});

export { auth };
