import { Hono } from "hono";
import type { Env, Variables } from "./bindings";
import { handleScheduled } from "./services/cron";
import { corsMiddleware } from "./middleware/cors";
import { authMiddleware } from "./middleware/auth";
import { auth } from "./routes/auth";
import { models } from "./routes/models";
import { reports } from "./routes/reports";
import { status } from "./routes/status";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", corsMiddleware());
app.use("/api/*", authMiddleware());

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/auth", auth);
app.route("/api/models", models);
app.route("/api/reports", reports);
app.route("/api/status", status);

export default {
  fetch: app.fetch,
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ) {
    ctx.waitUntil(handleScheduled(env));
  },
};
