import { describe, it, expect } from "vitest";
import {
  computeAvailabilityScore,
  computeQualityScore,
  computeOverallScore,
  computeTrend,
} from "../src/services/health";

const now = new Date("2026-04-09T12:00:00Z");

function minutesAgo(minutes: number): string {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}

describe("computeAvailabilityScore", () => {
  it("returns 100 when all reports are working", () => {
    const reports = [
      { status: "working", user_id: null, created_at: minutesAgo(1) },
      { status: "working", user_id: null, created_at: minutesAgo(2) },
      { status: "working", user_id: null, created_at: minutesAgo(3) },
    ];
    const score = computeAvailabilityScore(reports, new Map(), now);
    expect(score).toBeCloseTo(100, 0);
  });

  it("returns 0 when all reports are down", () => {
    const reports = [
      { status: "down", user_id: null, created_at: minutesAgo(1) },
      { status: "down", user_id: null, created_at: minutesAgo(2) },
      { status: "down", user_id: null, created_at: minutesAgo(3) },
    ];
    const score = computeAvailabilityScore(reports, new Map(), now);
    expect(score).toBeCloseTo(0, 0);
  });

  it("weights authenticated users higher", () => {
    const trustScores = new Map([["user1", 2.0]]);
    const allAnon = [
      { status: "down", user_id: null, created_at: minutesAgo(1) },
      { status: "working", user_id: null, created_at: minutesAgo(1) },
    ];
    const withTrusted = [
      { status: "down", user_id: null, created_at: minutesAgo(1) },
      { status: "working", user_id: "user1", created_at: minutesAgo(1) },
    ];
    const anonScore = computeAvailabilityScore(allAnon, new Map(), now);
    const trustedScore = computeAvailabilityScore(
      withTrusted,
      trustScores,
      now
    );
    // Trusted "working" should pull the score higher
    expect(trustedScore).toBeGreaterThan(anonScore);
  });

  it("weights recent reports higher", () => {
    const recentDown = [
      { status: "down", user_id: null, created_at: minutesAgo(1) },
      { status: "working", user_id: null, created_at: minutesAgo(20) },
    ];
    const oldDown = [
      { status: "working", user_id: null, created_at: minutesAgo(1) },
      { status: "down", user_id: null, created_at: minutesAgo(20) },
    ];
    const recentDownScore = computeAvailabilityScore(
      recentDown,
      new Map(),
      now
    );
    const oldDownScore = computeAvailabilityScore(oldDown, new Map(), now);
    // Recent down should give lower score
    expect(recentDownScore).toBeLessThan(oldDownScore);
  });

  it("returns 80 for empty reports", () => {
    const score = computeAvailabilityScore([], new Map(), now);
    expect(score).toBe(80);
  });
});

describe("computeQualityScore", () => {
  it("returns 100 when all reports are good", () => {
    const reports = [
      { quality: "good", user_id: null, created_at: minutesAgo(1) },
      { quality: "good", user_id: null, created_at: minutesAgo(2) },
    ];
    const score = computeQualityScore(reports, new Map(), now);
    expect(score).toBeCloseTo(100, 0);
  });

  it("returns 0 when all reports are unusable", () => {
    const reports = [
      { quality: "unusable", user_id: null, created_at: minutesAgo(1) },
      { quality: "unusable", user_id: null, created_at: minutesAgo(2) },
    ];
    const score = computeQualityScore(reports, new Map(), now);
    expect(score).toBeCloseTo(0, 0);
  });

  it("returns 80 for empty reports", () => {
    const score = computeQualityScore([], new Map(), now);
    expect(score).toBe(80);
  });
});

describe("computeOverallScore", () => {
  it("returns the minimum of availability and quality", () => {
    expect(computeOverallScore(90, 60)).toBe(60);
    expect(computeOverallScore(50, 80)).toBe(50);
  });
});

describe("computeTrend", () => {
  it("returns improving when score increased", () => {
    expect(computeTrend(80, 70)).toBe("improving");
  });

  it("returns declining when score decreased", () => {
    expect(computeTrend(60, 70)).toBe("declining");
  });

  it("returns stable when score is similar", () => {
    expect(computeTrend(72, 70)).toBe("stable");
  });
});
