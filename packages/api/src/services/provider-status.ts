import type { ProviderStatus } from "./health";

export function normalizeStatus(indicator: string): ProviderStatus | null {
  switch (indicator) {
    case "none":
      return "operational";
    case "minor":
      return "degraded";
    case "major":
      return "major_outage";
    case "critical":
      return "major_outage";
    default:
      return null;
  }
}

export function parseStatuspageIo(
  json: { status?: { indicator?: string } }
): ProviderStatus | null {
  const indicator = json?.status?.indicator;
  if (!indicator) return null;
  return normalizeStatus(indicator);
}

export async function scrapeStatuspage(
  url: string
): Promise<ProviderStatus | null> {
  try {
    const apiUrl = url.replace(/\/$/, "") + "/api/v2/status.json";
    const res = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return parseStatuspageIo(json as { status?: { indicator?: string } });
  } catch {
    return null;
  }
}

/**
 * Parse an Atom feed from status pages (used by Anthropic/Claude and OpenAI).
 * Checks for active (unresolved) incidents in the last 24 hours.
 * Incident status keywords: Investigating, Identified, Monitoring → active
 * Resolved → not active
 */
export async function scrapeAtomFeed(
  url: string
): Promise<ProviderStatus | null> {
  try {
    const feedUrl = url.replace(/\/$/, "") + "/history.atom";
    const res = await fetch(feedUrl, {
      headers: { Accept: "application/atom+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const xml = await res.text();

    // Extract entries from the Atom feed
    const entries = xml.split("<entry>").slice(1);
    if (entries.length === 0) return "operational";

    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    let hasActiveIncident = false;
    let severity: ProviderStatus = "degraded";

    for (const entry of entries.slice(0, 10)) {
      // Check if the entry is recent (within 24h)
      const updatedMatch = entry.match(/<updated>([^<]+)<\/updated>/);
      if (updatedMatch) {
        const updatedTime = new Date(updatedMatch[1]).getTime();
        if (updatedTime < twentyFourHoursAgo) continue;
      }

      // Get the content and check the latest status
      const contentMatch = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/);
      if (!contentMatch) continue;

      const content = contentMatch[1];

      // Check if the incident is resolved
      if (/<strong>Resolved<\/strong>/i.test(content)) continue;

      // Active incident found — determine severity from title/content
      hasActiveIncident = true;

      const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
      const title = titleMatch ? titleMatch[1].toLowerCase() : "";
      const contentLower = content.toLowerCase();

      // Major outage indicators
      if (
        title.includes("outage") ||
        title.includes("down") ||
        title.includes("unavailable") ||
        contentLower.includes("major") ||
        contentLower.includes("outage")
      ) {
        severity = "major_outage";
        break;
      }
    }

    return hasActiveIncident ? severity : "operational";
  } catch {
    return null;
  }
}

export async function scrapeProviderStatus(
  statusPageUrl: string,
  statusPageType: string
): Promise<ProviderStatus | null> {
  if (statusPageType === "statuspage_io") {
    return scrapeStatuspage(statusPageUrl);
  }
  if (statusPageType === "atom_feed") {
    return scrapeAtomFeed(statusPageUrl);
  }
  return null;
}
