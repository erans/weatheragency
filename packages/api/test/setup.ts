import { env } from "cloudflare:test";
// Import SQL schema as a raw string at build time (vite raw import)
import schema from "../src/db/schema.sql?raw";

export async function initDb() {
  // Remove SQL line comments, then split on semicolons
  const stripped = schema
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");

  const statements = stripped
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await env.DB.prepare(stmt).run();
  }
}
