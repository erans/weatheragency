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

export async function scrapeProviderStatus(
  statusPageUrl: string,
  statusPageType: string
): Promise<ProviderStatus | null> {
  if (statusPageType === "statuspage_io") {
    return scrapeStatuspage(statusPageUrl);
  }
  // Custom scrapers for AWS/Google/Azure can be added here
  // For now, return null (skip) for custom types
  return null;
}
