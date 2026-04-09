import type { MiddlewareHandler } from "hono";
import type { User } from "@weatheragency/shared";
import type { Env, Variables } from "../bindings";

export function authMiddleware(): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  return async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const result = await c.env.DB.prepare(
        "SELECT id, email, name, api_token, trust_score, created_at FROM users WHERE api_token = ?"
      )
        .bind(token)
        .first<User>();
      c.set("user", result ?? null);
    } else {
      c.set("user", null);
    }
    await next();
  };
}
