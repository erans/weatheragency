import { cors } from "hono/cors";
import type { Env, Variables } from "../bindings";
import type { MiddlewareHandler } from "hono";

export function corsMiddleware(): MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> {
  return async (c, next) => {
    const origin = c.env.CORS_ORIGIN;
    const handler = cors({
      origin: origin === "*" ? "*" : origin.split(","),
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      maxAge: 86400,
    });
    return handler(c, next);
  };
}
