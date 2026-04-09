import type { Trend } from "@weatheragency/shared";

interface ReportForAvailability {
  status: string | null;
  user_id: string | null;
  created_at: string;
}

interface ReportForQuality {
  quality: string | null;
  user_id: string | null;
  created_at: string;
}

function getRecencyMultiplier(createdAt: string, now: Date): number {
  const ageMs = now.getTime() - new Date(createdAt).getTime();
  const ageMinutes = ageMs / 60_000;
  if (ageMinutes <= 5) return 1.0;
  if (ageMinutes <= 15) return 0.8;
  return 0.5;
}

function getTrustMultiplier(
  userId: string | null,
  trustScores: Map<string, number>
): number {
  if (!userId) return 0.5;
  return trustScores.get(userId) ?? 1.0;
}

function computeWeightedScore(
  baseValues: { base: number; userId: string | null; createdAt: string }[],
  trustScores: Map<string, number>,
  now: Date,
  defaultScore: number
): number {
  if (baseValues.length === 0) return defaultScore;

  let weightedSum = 0;
  let maxPossible = 0;

  for (const { base, userId, createdAt } of baseValues) {
    const trust = getTrustMultiplier(userId, trustScores);
    const recency = getRecencyMultiplier(createdAt, now);
    weightedSum += base * trust * recency;
    maxPossible += 1.0 * trust * recency;
  }

  if (maxPossible === 0) return defaultScore;

  return ((weightedSum / maxPossible + 1) / 2) * 100;
}

const STATUS_BASE: Record<string, number> = {
  working: 1.0,
  degraded: -0.5,
  down: -1.0,
};

const QUALITY_BASE: Record<string, number> = {
  good: 1.0,
  poor: -0.5,
  unusable: -1.0,
};

export function computeAvailabilityScore(
  reports: ReportForAvailability[],
  trustScores: Map<string, number>,
  now: Date
): number {
  const values = reports
    .filter((r) => r.status && STATUS_BASE[r.status] !== undefined)
    .map((r) => ({
      base: STATUS_BASE[r.status!],
      userId: r.user_id,
      createdAt: r.created_at,
    }));

  return computeWeightedScore(values, trustScores, now, 80);
}

export function computeQualityScore(
  reports: ReportForQuality[],
  trustScores: Map<string, number>,
  now: Date
): number {
  const values = reports
    .filter((r) => r.quality && QUALITY_BASE[r.quality] !== undefined)
    .map((r) => ({
      base: QUALITY_BASE[r.quality!],
      userId: r.user_id,
      createdAt: r.created_at,
    }));

  return computeWeightedScore(values, trustScores, now, 80);
}

export function computeOverallScore(
  availabilityScore: number,
  qualityScore: number
): number {
  return Math.min(availabilityScore, qualityScore);
}

export function computeTrend(
  currentScore: number,
  previousScore: number | null
): Trend {
  if (previousScore === null) return "stable";
  const diff = currentScore - previousScore;
  if (diff > 5) return "improving";
  if (diff < -5) return "declining";
  return "stable";
}

export type ProviderStatus =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage";

export function applyProviderStatusCap(
  availabilityScore: number,
  providerStatus: ProviderStatus | null
): number {
  if (!providerStatus || providerStatus === "operational")
    return availabilityScore;
  const caps: Record<string, number> = {
    degraded: 70,
    partial_outage: 40,
    major_outage: 15,
  };
  const cap = caps[providerStatus];
  return cap !== undefined ? Math.min(availabilityScore, cap) : availabilityScore;
}
