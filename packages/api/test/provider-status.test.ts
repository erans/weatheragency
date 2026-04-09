import { describe, it, expect } from "vitest";
import {
  parseStatuspageIo,
  normalizeStatus,
} from "../src/services/provider-status";

describe("parseStatuspageIo", () => {
  it("parses operational status", () => {
    const json = {
      status: { indicator: "none", description: "All Systems Operational" },
    };
    expect(parseStatuspageIo(json)).toBe("operational");
  });

  it("parses minor degradation", () => {
    const json = {
      status: {
        indicator: "minor",
        description: "Partially Degraded Service",
      },
    };
    expect(parseStatuspageIo(json)).toBe("degraded");
  });

  it("parses major outage", () => {
    const json = {
      status: { indicator: "major", description: "Major System Outage" },
    };
    expect(parseStatuspageIo(json)).toBe("major_outage");
  });

  it("parses critical outage", () => {
    const json = {
      status: { indicator: "critical", description: "Critical" },
    };
    expect(parseStatuspageIo(json)).toBe("major_outage");
  });
});

describe("normalizeStatus", () => {
  it("maps indicator values correctly", () => {
    expect(normalizeStatus("none")).toBe("operational");
    expect(normalizeStatus("minor")).toBe("degraded");
    expect(normalizeStatus("major")).toBe("major_outage");
    expect(normalizeStatus("critical")).toBe("major_outage");
    expect(normalizeStatus("unknown")).toBe(null);
  });
});
