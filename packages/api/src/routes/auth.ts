import { Hono } from "hono";
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";
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

function generateMagicToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildMagicLinkEmail(link: string): { html: string; text: string } {
  const text = `Click here to log in to Weather Agency: ${link}\n\nThis link expires in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weather Agency Login</title>
</head>
<body style="margin:0;padding:0;background-color:#0f1923;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1923;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#1a2b3c;border-radius:12px;padding:40px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Weather Agency</h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <p style="margin:0;font-size:16px;line-height:1.5;color:#94a3b8;">
                Click the button below to log in to your account. This link expires in 15 minutes.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <a href="${link}" style="display:inline-block;background-color:#22c55e;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                Log in to Weather Agency
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:16px;">
              <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">
                If you didn't request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center">
              <p style="margin:0;font-size:12px;color:#475569;word-break:break-all;">
                ${link}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html, text };
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

auth.post("/magic-link", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { email, name } = body as { email?: string; name?: string };

  if (!email || typeof email !== "string") {
    return c.json({ error: "email is required" }, 400);
  }

  // Rate limit: max 3 magic links per email per 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const recentCount = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM magic_links WHERE email = ? AND created_at > ?"
  )
    .bind(email, tenMinutesAgo)
    .first<{ cnt: number }>();

  if (recentCount && recentCount.cnt >= 3) {
    return c.json({ error: "Too many requests. Please try again later." }, 429);
  }

  const id = crypto.randomUUID();
  const token = generateMagicToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await c.env.DB.prepare(
    "INSERT INTO magic_links (id, email, name, token, expires_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(id, email, name ?? null, token, expiresAt)
    .run();

  const link = `${c.env.FRONTEND_URL}/verify?token=${token}`;

  try {
    const { html, text } = buildMagicLinkEmail(link);

    const msg = createMimeMessage();
    msg.setSender({ name: "Weather Agency", addr: "noreply@weather.agency" });
    msg.setRecipient(email);
    msg.setSubject("Your Weather Agency login link");
    msg.addMessage({
      contentType: "text/plain",
      data: text,
    });
    msg.addMessage({
      contentType: "text/html",
      data: html,
    });

    const emailMsg = new EmailMessage(
      "noreply@weather.agency",
      email,
      msg.asRaw()
    );
    await c.env.SEND_EMAIL.send(emailMsg);
  } catch {
    // Don't leak email sending errors — still return success
  }

  return c.json({ sent: true });
});

auth.get("/verify", async (c) => {
  const token = c.req.query("token");

  if (!token) {
    return c.json({ error: "Token is required" }, 400);
  }

  const now = new Date().toISOString();
  const magicLink = await c.env.DB.prepare(
    "SELECT id, email, name FROM magic_links WHERE token = ? AND used_at IS NULL AND expires_at > ?"
  )
    .bind(token, now)
    .first<{ id: string; email: string; name: string | null }>();

  if (!magicLink) {
    return c.json({ error: "Invalid or expired link" }, 400);
  }

  // Mark as used
  await c.env.DB.prepare(
    "UPDATE magic_links SET used_at = ? WHERE id = ?"
  )
    .bind(new Date().toISOString(), magicLink.id)
    .run();

  // Check if user exists
  const existingUser = await c.env.DB.prepare(
    "SELECT id, email, name, api_token, trust_score FROM users WHERE email = ?"
  )
    .bind(magicLink.email)
    .first<{
      id: string;
      email: string;
      name: string | null;
      api_token: string;
      trust_score: number;
    }>();

  if (existingUser) {
    return c.json({
      user: {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        trust_score: existingUser.trust_score,
      },
      token: existingUser.api_token,
    });
  }

  // Create new user
  const userId = crypto.randomUUID();
  const apiToken = generateToken();

  await c.env.DB.prepare(
    "INSERT INTO users (id, email, name, api_token) VALUES (?, ?, ?, ?)"
  )
    .bind(userId, magicLink.email, magicLink.name, apiToken)
    .run();

  return c.json({
    user: {
      id: userId,
      email: magicLink.email,
      name: magicLink.name,
      trust_score: 1.0,
    },
    token: apiToken,
  });
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
