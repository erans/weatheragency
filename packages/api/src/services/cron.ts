import { ulid } from "ulidx";
import type { Env } from "../bindings";
import {
  computeAvailabilityScore,
  computeQualityScore,
  computeOverallScore,
  applyProviderStatusCap,
} from "./health";
import { scrapeProviderStatus } from "./provider-status";

export async function handleScheduled(env: Env) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 30 * 60_000).toISOString();
  const windowEnd = now.toISOString();

  // 1. Scrape provider statuses
  const providers = await env.DB.prepare(
    "SELECT * FROM providers WHERE status_page_url IS NOT NULL"
  ).all();

  const providerStatusMap = new Map<string, string | null>();
  for (const p of providers.results) {
    if (p.status_page_url && p.status_page_type) {
      const status = await scrapeProviderStatus(
        p.status_page_url as string,
        p.status_page_type as string
      );
      providerStatusMap.set(p.id as string, status);
    }
  }

  // 2. Get all approved endpoints
  const endpoints = await env.DB.prepare(
    "SELECT e.*, m.provider as model_provider FROM endpoints e JOIN models m ON m.id = e.model_id WHERE e.status = 'approved'"
  ).all();

  // 3. Get trust scores for authenticated users
  const users = await env.DB.prepare(
    "SELECT id, trust_score FROM users"
  ).all();
  const trustScores = new Map<string, number>();
  for (const u of users.results) {
    trustScores.set(u.id as string, u.trust_score as number);
  }

  // 4. Compute snapshot for each endpoint
  for (const ep of endpoints.results) {
    const epId = ep.id as string;

    const reports = await env.DB.prepare(
      `SELECT status, quality, user_id, created_at FROM reports
       WHERE endpoint_id = ? AND created_at >= ?
       ORDER BY created_at DESC`
    )
      .bind(epId, windowStart)
      .all();

    const reportRows = reports.results as {
      status: string | null;
      quality: string | null;
      user_id: string | null;
      created_at: string;
    }[];

    let availabilityScore = computeAvailabilityScore(
      reportRows,
      trustScores,
      now
    );
    const qualityScore = computeQualityScore(reportRows, trustScores, now);

    // Apply provider status cap to availability
    const hostingProvider = ep.hosting_provider as string;
    const providerStatus = providerStatusMap.get(hostingProvider) ?? null;
    availabilityScore = applyProviderStatusCap(
      availabilityScore,
      providerStatus as any
    );

    const score = computeOverallScore(availabilityScore, qualityScore);

    // Count breakdowns
    let working = 0, degraded = 0, down = 0;
    let qualityGood = 0, qualityPoor = 0, qualityUnusable = 0;
    for (const r of reportRows) {
      if (r.status === "working") working++;
      if (r.status === "degraded") degraded++;
      if (r.status === "down") down++;
      if (r.quality === "good") qualityGood++;
      if (r.quality === "poor") qualityPoor++;
      if (r.quality === "unusable") qualityUnusable++;
    }

    await env.DB.prepare(
      `INSERT INTO health_snapshots
       (id, endpoint_id, score, availability_score, quality_score,
        report_count, working, degraded, down,
        quality_good, quality_poor, quality_unusable,
        provider_status, window_start, window_end)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        ulid(),
        epId,
        score,
        availabilityScore,
        qualityScore,
        reportRows.length,
        working,
        degraded,
        down,
        qualityGood,
        qualityPoor,
        qualityUnusable,
        providerStatus,
        windowStart,
        windowEnd
      )
      .run();
  }

  // 5. Clean up old rate limit entries
  await env.DB.prepare(
    "DELETE FROM rate_limits WHERE window < datetime('now', '-5 minutes')"
  ).run();
}
