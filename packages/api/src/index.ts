import { Hono } from "hono";
import type { Env, Variables } from "./bindings";
import { corsMiddleware } from "./middleware/cors";
import { authMiddleware } from "./middleware/auth";
import { auth } from "./routes/auth";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", corsMiddleware());
app.use("/api/*", authMiddleware());

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/auth", auth);

export default {
  fetch: app.fetch,
  async scheduled(
    _event: ScheduledEvent,
    _env: Env,
    _ctx: ExecutionContext
  ) {
    // Cron handler will be implemented in Task 12
  },
};
