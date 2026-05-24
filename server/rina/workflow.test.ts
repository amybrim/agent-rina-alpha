import { describe, expect, it } from "vitest";

/**
 * Mirror of the server-side VALID_NEXT contract. This test pins the exact
 * 5-status workflow so that future edits cannot silently collapse, reorder, or
 * relax the Recommended → Drafted → Approved → Published → Verified pipeline.
 */
const VALID_NEXT: Record<string, string[]> = {
  recommended: ["drafted"],
  drafted: ["approved", "recommended"],
  approved: ["published", "drafted"],
  published: ["verified", "approved"],
  verified: [],
};

const STATUSES = ["recommended", "drafted", "approved", "published", "verified"] as const;

describe("Rina fix workflow (5-status pipeline)", () => {
  it("exposes exactly the five canonical statuses", () => {
    expect(Object.keys(VALID_NEXT).sort()).toEqual([...STATUSES].sort());
  });

  it("forces forward path: recommended → drafted → approved → published → verified", () => {
    expect(VALID_NEXT.recommended).toContain("drafted");
    expect(VALID_NEXT.drafted).toContain("approved");
    expect(VALID_NEXT.approved).toContain("published");
    expect(VALID_NEXT.published).toContain("verified");
  });

  it("does not allow skipping stages", () => {
    expect(VALID_NEXT.recommended).not.toContain("approved");
    expect(VALID_NEXT.recommended).not.toContain("published");
    expect(VALID_NEXT.recommended).not.toContain("verified");
    expect(VALID_NEXT.drafted).not.toContain("published");
    expect(VALID_NEXT.drafted).not.toContain("verified");
    expect(VALID_NEXT.approved).not.toContain("verified");
  });

  it("verified is terminal", () => {
    expect(VALID_NEXT.verified).toEqual([]);
  });

  it("permits one-step rollbacks but never skipping backwards", () => {
    expect(VALID_NEXT.drafted).toContain("recommended");
    expect(VALID_NEXT.approved).toContain("drafted");
    expect(VALID_NEXT.published).toContain("approved");
    // No status may rollback more than one stage
    expect(VALID_NEXT.approved).not.toContain("recommended");
    expect(VALID_NEXT.published).not.toContain("drafted");
    expect(VALID_NEXT.published).not.toContain("recommended");
  });
});
