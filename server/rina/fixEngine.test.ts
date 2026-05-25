import { describe, it, expect } from "vitest";
import {
  isValidTransition,
  VALID_TRANSITIONS,
  type FixStatus,
} from "./brain/fixEngine";

describe("FixEngine state machine", () => {
  // ─────────────────────────────────────────────
  // Valid transitions
  // ─────────────────────────────────────────────
  it("allows found → recommended", () => {
    expect(isValidTransition("found", "recommended")).toBe(true);
  });

  it("allows recommended → drafted", () => {
    expect(isValidTransition("recommended", "drafted")).toBe(true);
  });

  it("allows recommended → needs_input", () => {
    expect(isValidTransition("recommended", "needs_input")).toBe(true);
  });

  it("allows recommended → deferred", () => {
    expect(isValidTransition("recommended", "deferred")).toBe(true);
  });

  it("allows recommended → rejected", () => {
    expect(isValidTransition("recommended", "rejected")).toBe(true);
  });

  it("allows needs_input → drafted", () => {
    expect(isValidTransition("needs_input", "drafted")).toBe(true);
  });

  it("allows drafted → ready_for_review", () => {
    expect(isValidTransition("drafted", "ready_for_review")).toBe(true);
  });

  it("allows drafted → needs_input", () => {
    expect(isValidTransition("drafted", "needs_input")).toBe(true);
  });

  it("allows ready_for_review → approved", () => {
    expect(isValidTransition("ready_for_review", "approved")).toBe(true);
  });

  it("allows ready_for_review → rejected", () => {
    expect(isValidTransition("ready_for_review", "rejected")).toBe(true);
  });

  it("allows approved → scheduled", () => {
    expect(isValidTransition("approved", "scheduled")).toBe(true);
  });

  it("allows approved → published", () => {
    expect(isValidTransition("approved", "published")).toBe(true);
  });

  it("allows scheduled → published", () => {
    expect(isValidTransition("scheduled", "published")).toBe(true);
  });

  it("allows published → verified", () => {
    expect(isValidTransition("published", "verified")).toBe(true);
  });

  it("allows published → failed", () => {
    expect(isValidTransition("published", "failed")).toBe(true);
  });

  it("allows failed → drafted (retry)", () => {
    expect(isValidTransition("failed", "drafted")).toBe(true);
  });

  it("allows deferred → recommended (reactivate)", () => {
    expect(isValidTransition("deferred", "recommended")).toBe(true);
  });

  // ─────────────────────────────────────────────
  // Invalid transitions
  // ─────────────────────────────────────────────
  it("rejects found → approved (skipping steps)", () => {
    expect(isValidTransition("found", "approved")).toBe(false);
  });

  it("rejects found → published (skipping steps)", () => {
    expect(isValidTransition("found", "published")).toBe(false);
  });

  it("rejects verified → anything (terminal)", () => {
    const allStatuses = Object.keys(VALID_TRANSITIONS) as FixStatus[];
    for (const target of allStatuses) {
      expect(isValidTransition("verified", target)).toBe(false);
    }
  });

  it("rejects rejected → anything (terminal)", () => {
    const allStatuses = Object.keys(VALID_TRANSITIONS) as FixStatus[];
    for (const target of allStatuses) {
      expect(isValidTransition("rejected", target)).toBe(false);
    }
  });

  it("rejects approved → found (backward)", () => {
    expect(isValidTransition("approved", "found")).toBe(false);
  });

  it("rejects published → recommended (backward)", () => {
    expect(isValidTransition("published", "recommended")).toBe(false);
  });

  it("rejects ready_for_review → drafted (backward)", () => {
    expect(isValidTransition("ready_for_review", "drafted")).toBe(false);
  });

  // ─────────────────────────────────────────────
  // State machine completeness
  // ─────────────────────────────────────────────
  it("has entries for all 12 statuses", () => {
    const expectedStatuses: FixStatus[] = [
      "found", "recommended", "drafted", "needs_input",
      "ready_for_review", "approved", "scheduled", "published",
      "verified", "deferred", "rejected", "failed",
    ];
    for (const status of expectedStatuses) {
      expect(VALID_TRANSITIONS).toHaveProperty(status);
    }
  });

  it("terminal states have empty transition arrays", () => {
    expect(VALID_TRANSITIONS["verified"]).toEqual([]);
    expect(VALID_TRANSITIONS["rejected"]).toEqual([]);
  });
});
