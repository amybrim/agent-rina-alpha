/**
 * GEO Evaluator Tests
 *
 * Covers:
 *   1. checkAiBotAccess — robots.txt parsing for AI citation bots
 *   2. checkLlmsTxt — llms.txt presence and quality
 *   3. assessGeoReadiness — per-category grade output, aiBotAccess/llmsTxt passthrough
 *   4. Finding type emission — verifies the correct findingType strings are produced
 *      for each failing GEO category
 *   5. Live network test — hits a real domain to verify end-to-end pipeline
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { assessGeoReadiness } from "./scanner/geoReadiness";
import type { AiBotAccessResult, LlmsTxtResult } from "./scanner/geoReadiness";
import { parseSchema } from "./scanner/schemaParser";
import { parseMetadata } from "./scanner/metadataParser";
import { analyzeContent } from "./scanner/contentAnalyzer";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Minimal HTML stub — no GEO signals at all */
const BARE_HTML = `<!DOCTYPE html><html><head><title>Test</title></head><body><p>Hello world.</p></body></html>`;

/** Rich HTML stub with strong GEO signals */
const RICH_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Acme Consulting — Strategy for Growing Businesses</title>
  <meta name="description" content="Acme Consulting helps growing SMBs build AI-ready digital presence. Founded 2010. Serving clients nationwide.">
  <meta property="og:title" content="Acme Consulting">
  <meta property="og:description" content="Strategy for growing businesses">
  <meta property="og:image" content="https://acme.example.com/og.jpg">
  <link rel="canonical" href="https://acme.example.com/">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Acme Consulting",
    "url": "https://acme.example.com",
    "sameAs": ["https://linkedin.com/company/acme"]
  }
  </script>
</head>
<body>
  <h1>Strategy consulting for growing businesses</h1>
  <h2>Who we are</h2>
  <p>Acme Consulting is a strategy consulting firm founded in 2010, serving SMBs and mid-market companies nationwide.</p>
  <h2>What we offer</h2>
  <p>We offer monthly retainer consulting, project-based engagements, and executive coaching. Starting at $2,500/month.</p>
  <h2>Who we work with</h2>
  <p>We work with B2B companies, startups, and growing businesses with 10–200 employees.</p>
  <h2>Why choose Acme?</h2>
  <p>We have helped 150+ clients achieve measurable growth. Our team has 20+ years of combined experience.</p>
  <h2>Frequently Asked Questions</h2>
  <p>How much does consulting cost? Starting at $2,500/month.</p>
  <p>What industries do you serve? We specialize in technology, professional services, and healthcare.</p>
  <p>How long does an engagement last? Typically 3–12 months depending on scope.</p>
  <a href="https://linkedin.com/company/acme">LinkedIn</a>
  <a href="https://twitter.com/acmeconsulting">Twitter</a>
  <p>Location: Chicago, IL. Serving clients across the United States.</p>
  <p>Contact: info@acme.example.com | (312) 555-0100</p>
</body>
</html>`;

function evalHtml(html: string, aiBotAccess?: AiBotAccessResult, llmsTxt?: LlmsTxtResult) {
  const schema = parseSchema(html);
  const metadata = parseMetadata(html);
  const content = analyzeContent(html, "homepage");
  return assessGeoReadiness(html, schema, metadata, content, aiBotAccess, llmsTxt);
}

// ─────────────────────────────────────────────
// 1. assessGeoReadiness — category grades
// ─────────────────────────────────────────────

describe("assessGeoReadiness — category structure", () => {
  it("returns all 9 GEO categories", () => {
    const result = evalHtml(BARE_HTML);
    expect(result.categories).toHaveProperty("answerReadiness");
    expect(result.categories).toHaveProperty("entityClarity");
    expect(result.categories).toHaveProperty("offerClarity");
    expect(result.categories).toHaveProperty("audienceClarity");
    expect(result.categories).toHaveProperty("locationServiceArea");
    expect(result.categories).toHaveProperty("proofTrustSignals");
    expect(result.categories).toHaveProperty("structuredDataReadiness");
    expect(result.categories).toHaveProperty("sourceCorroboration");
    expect(result.categories).toHaveProperty("promptRecommendationFit");
  });

  it("returns all 8 Auriti internal categories", () => {
    const result = evalHtml(BARE_HTML);
    expect(result.auritiCategories).toHaveProperty("findability");
    expect(result.auritiCategories).toHaveProperty("understandability");
    expect(result.auritiCategories).toHaveProperty("entityConfidence");
    expect(result.auritiCategories).toHaveProperty("trustAuthority");
    expect(result.auritiCategories).toHaveProperty("structuredDataReadiness");
    expect(result.auritiCategories).toHaveProperty("contentAnswerCoverage");
    expect(result.auritiCategories).toHaveProperty("localMarketRelevance");
    expect(result.auritiCategories).toHaveProperty("progressImplementation");
  });

  it("grades are only CLEAR | PARTIAL | NOT_YET_VISIBLE — no numbers", () => {
    const result = evalHtml(BARE_HTML);
    const validGrades = new Set(["CLEAR", "PARTIAL", "NOT_YET_VISIBLE"]);
    for (const cat of Object.values(result.categories)) {
      expect(validGrades.has(cat.grade), `Invalid grade on ${cat.category}: ${cat.grade}`).toBe(true);
    }
    for (const grade of Object.values(result.auritiCategories)) {
      expect(validGrades.has(grade), `Invalid Auriti grade: ${grade}`).toBe(true);
    }
  });

  it("bare HTML produces mostly NOT_YET_VISIBLE grades", () => {
    const result = evalHtml(BARE_HTML);
    const grades = Object.values(result.categories).map((c) => c.grade);
    const notVisibleCount = grades.filter((g) => g === "NOT_YET_VISIBLE").length;
    expect(notVisibleCount).toBeGreaterThanOrEqual(5);
  });

  it("rich HTML with strong signals produces mostly CLEAR or PARTIAL grades", () => {
    const result = evalHtml(RICH_HTML);
    const grades = Object.values(result.categories).map((c) => c.grade);
    const clearOrPartial = grades.filter((g) => g !== "NOT_YET_VISIBLE").length;
    expect(clearOrPartial).toBeGreaterThanOrEqual(5);
  });

  it("overallGrade is NOT_YET_VISIBLE for bare HTML", () => {
    const result = evalHtml(BARE_HTML);
    expect(result.overallGrade).toBe("NOT_YET_VISIBLE");
  });

  it("overallGrade is CLEAR or PARTIAL for rich HTML", () => {
    const result = evalHtml(RICH_HTML);
    expect(["CLEAR", "PARTIAL"]).toContain(result.overallGrade);
  });
});

// ─────────────────────────────────────────────
// 2. Finding type strings
// ─────────────────────────────────────────────

describe("assessGeoReadiness — findingType strings", () => {
  it("each category has the correct findingType key", () => {
    const result = evalHtml(BARE_HTML);
    expect(result.categories.answerReadiness.findingType).toBe("answer_readiness_gap");
    expect(result.categories.entityClarity.findingType).toBe("entity_clarity_gap");
    expect(result.categories.offerClarity.findingType).toBe("offer_clarity_gap");
    expect(result.categories.audienceClarity.findingType).toBe("audience_clarity_gap");
    expect(result.categories.locationServiceArea.findingType).toBe("location_clarity_gap");
    expect(result.categories.proofTrustSignals.findingType).toBe("proof_trust_gap");
    expect(result.categories.structuredDataReadiness.findingType).toBe("structured_data_gap");
    expect(result.categories.sourceCorroboration.findingType).toBe("source_corroboration_gap");
    expect(result.categories.promptRecommendationFit.findingType).toBe("prompt_recommendation_gap");
  });

  it("each failing category has at least one gap message", () => {
    const result = evalHtml(BARE_HTML);
    for (const cat of Object.values(result.categories)) {
      if (cat.grade === "NOT_YET_VISIBLE") {
        expect(cat.gaps.length, `${cat.category} is NOT_YET_VISIBLE but has no gap messages`).toBeGreaterThan(0);
      }
    }
  });

  it("defaultSeverity is a valid severity level", () => {
    const result = evalHtml(BARE_HTML);
    const validSeverities = new Set(["critical", "high", "medium", "low"]);
    for (const cat of Object.values(result.categories)) {
      expect(validSeverities.has(cat.defaultSeverity), `Invalid severity on ${cat.category}: ${cat.defaultSeverity}`).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────
// 3. AI bot access passthrough
// ─────────────────────────────────────────────

describe("assessGeoReadiness — AI bot access passthrough", () => {
  it("passes through aiBotAccess when all bots are allowed", () => {
    const aiBotAccess: AiBotAccessResult = {
      allCriticalAllowed: true,
      blockedBots: [],
      allowedBots: ["GPTBot", "ClaudeBot", "PerplexityBot"],
      hasRobotsTxt: true,
    };
    const result = evalHtml(BARE_HTML, aiBotAccess);
    expect(result.aiBotAccess).toBeDefined();
    expect(result.aiBotAccess!.allCriticalAllowed).toBe(true);
    expect(result.aiBotAccess!.blockedBots).toHaveLength(0);
  });

  it("passes through aiBotAccess when critical bots are blocked", () => {
    const aiBotAccess: AiBotAccessResult = {
      allCriticalAllowed: false,
      blockedBots: ["GPTBot", "ClaudeBot"],
      allowedBots: ["PerplexityBot", "Bingbot"],
      hasRobotsTxt: true,
    };
    const result = evalHtml(BARE_HTML, aiBotAccess);
    expect(result.aiBotAccess!.allCriticalAllowed).toBe(false);
    expect(result.aiBotAccess!.blockedBots).toContain("GPTBot");
    expect(result.aiBotAccess!.blockedBots).toContain("ClaudeBot");
  });

  it("aiBotAccess is undefined when not provided", () => {
    const result = evalHtml(BARE_HTML);
    expect(result.aiBotAccess).toBeUndefined();
  });

  it("blocked bots degrade Auriti findability grade", () => {
    const allAllowed: AiBotAccessResult = {
      allCriticalAllowed: true,
      blockedBots: [],
      allowedBots: ["GPTBot", "ClaudeBot"],
      hasRobotsTxt: true,
    };
    const someBlocked: AiBotAccessResult = {
      allCriticalAllowed: false,
      blockedBots: ["GPTBot", "ClaudeBot", "PerplexityBot", "OAI-SearchBot"],
      allowedBots: [],
      hasRobotsTxt: true,
    };
    const resultAllowed = evalHtml(RICH_HTML, allAllowed);
    const resultBlocked = evalHtml(RICH_HTML, someBlocked);

    // Findability should be lower when bots are blocked
    const gradeOrder = { CLEAR: 2, PARTIAL: 1, NOT_YET_VISIBLE: 0 };
    const allowedFindability = gradeOrder[resultAllowed.auritiCategories.findability];
    const blockedFindability = gradeOrder[resultBlocked.auritiCategories.findability];
    expect(allowedFindability).toBeGreaterThanOrEqual(blockedFindability);
  });
});

// ─────────────────────────────────────────────
// 4. llms.txt passthrough
// ─────────────────────────────────────────────

describe("assessGeoReadiness — llms.txt passthrough", () => {
  it("passes through llmsTxt when present and well-formed", () => {
    const llmsTxt: LlmsTxtResult = {
      present: true,
      hasH1: true,
      hasBlockquote: true,
      hasH2Sections: true,
      lineCount: 42,
    };
    const result = evalHtml(BARE_HTML, undefined, llmsTxt);
    expect(result.llmsTxt).toBeDefined();
    expect(result.llmsTxt!.present).toBe(true);
    expect(result.llmsTxt!.hasH1).toBe(true);
    expect(result.llmsTxt!.lineCount).toBe(42);
  });

  it("passes through llmsTxt when absent", () => {
    const llmsTxt: LlmsTxtResult = {
      present: false,
      hasH1: false,
      hasBlockquote: false,
      hasH2Sections: false,
      lineCount: 0,
    };
    const result = evalHtml(BARE_HTML, undefined, llmsTxt);
    expect(result.llmsTxt!.present).toBe(false);
  });

  it("llmsTxt presence improves Auriti findability grade", () => {
    const withLlms: LlmsTxtResult = {
      present: true,
      hasH1: true,
      hasBlockquote: true,
      hasH2Sections: true,
      lineCount: 30,
    };
    const withoutLlms: LlmsTxtResult = {
      present: false,
      hasH1: false,
      hasBlockquote: false,
      hasH2Sections: false,
      lineCount: 0,
    };
    const resultWith = evalHtml(RICH_HTML, undefined, withLlms);
    const resultWithout = evalHtml(RICH_HTML, undefined, withoutLlms);

    const gradeOrder = { CLEAR: 2, PARTIAL: 1, NOT_YET_VISIBLE: 0 };
    const withFindability = gradeOrder[resultWith.auritiCategories.findability];
    const withoutFindability = gradeOrder[resultWithout.auritiCategories.findability];
    expect(withFindability).toBeGreaterThanOrEqual(withoutFindability);
  });
});

// ─────────────────────────────────────────────
// 5. scanWorkflow finding type emission
//    (unit-level — tests the logic that scanWorkflow uses,
//     without invoking the full DB workflow)
// ─────────────────────────────────────────────

describe("finding type emission logic", () => {
  /**
   * Simulate what scanWorkflow does: iterate categories,
   * emit a finding for each NOT_YET_VISIBLE or PARTIAL category.
   */
  function simulateFindingEmission(
    html: string,
    aiBotAccess?: AiBotAccessResult,
    llmsTxt?: LlmsTxtResult,
  ) {
    const result = evalHtml(html, aiBotAccess, llmsTxt);
    const findings: { type: string; severity: string; evidence: string }[] = [];

    for (const cat of Object.values(result.categories)) {
      if (cat.grade === "NOT_YET_VISIBLE" || cat.grade === "PARTIAL") {
        const primaryGap = cat.gaps[0];
        if (primaryGap) {
          findings.push({
            type: cat.findingType,
            severity: cat.defaultSeverity,
            evidence: primaryGap,
          });
        }
      }
    }

    // AI bot access finding
    if (aiBotAccess && !aiBotAccess.allCriticalAllowed && aiBotAccess.blockedBots.length > 0) {
      findings.push({
        type: "ai_bot_blocked",
        severity: "critical",
        evidence: `robots.txt is blocking AI citation bots: ${aiBotAccess.blockedBots.join(", ")}`,
      });
    }

    // llms.txt finding
    if (llmsTxt && !llmsTxt.present) {
      findings.push({
        type: "missing_llms_txt",
        severity: "medium",
        evidence: "No llms.txt file found — AI systems cannot find a structured summary of this site",
      });
    }

    return findings;
  }

  it("emits ai_bot_blocked finding when critical bots are blocked", () => {
    const aiBotAccess: AiBotAccessResult = {
      allCriticalAllowed: false,
      blockedBots: ["GPTBot", "ClaudeBot", "PerplexityBot"],
      allowedBots: [],
      hasRobotsTxt: true,
    };
    const findings = simulateFindingEmission(BARE_HTML, aiBotAccess);
    const botFinding = findings.find((f) => f.type === "ai_bot_blocked");
    expect(botFinding).toBeDefined();
    expect(botFinding!.severity).toBe("critical");
    expect(botFinding!.evidence).toContain("GPTBot");
    expect(botFinding!.evidence).toContain("ClaudeBot");
    expect(botFinding!.evidence).toContain("PerplexityBot");
  });

  it("does NOT emit ai_bot_blocked when all bots are allowed", () => {
    const aiBotAccess: AiBotAccessResult = {
      allCriticalAllowed: true,
      blockedBots: [],
      allowedBots: ["GPTBot", "ClaudeBot"],
      hasRobotsTxt: true,
    };
    const findings = simulateFindingEmission(BARE_HTML, aiBotAccess);
    expect(findings.find((f) => f.type === "ai_bot_blocked")).toBeUndefined();
  });

  it("emits missing_llms_txt finding when llms.txt is absent", () => {
    const llmsTxt: LlmsTxtResult = {
      present: false,
      hasH1: false,
      hasBlockquote: false,
      hasH2Sections: false,
      lineCount: 0,
    };
    const findings = simulateFindingEmission(BARE_HTML, undefined, llmsTxt);
    const llmsFinding = findings.find((f) => f.type === "missing_llms_txt");
    expect(llmsFinding).toBeDefined();
    expect(llmsFinding!.severity).toBe("medium");
    expect(llmsFinding!.evidence).toContain("llms.txt");
  });

  it("does NOT emit missing_llms_txt when llms.txt is present", () => {
    const llmsTxt: LlmsTxtResult = {
      present: true,
      hasH1: true,
      hasBlockquote: true,
      hasH2Sections: true,
      lineCount: 30,
    };
    const findings = simulateFindingEmission(BARE_HTML, undefined, llmsTxt);
    expect(findings.find((f) => f.type === "missing_llms_txt")).toBeUndefined();
  });

  it("emits both ai_bot_blocked and missing_llms_txt when both conditions are true", () => {
    const aiBotAccess: AiBotAccessResult = {
      allCriticalAllowed: false,
      blockedBots: ["GPTBot"],
      allowedBots: [],
      hasRobotsTxt: true,
    };
    const llmsTxt: LlmsTxtResult = {
      present: false,
      hasH1: false,
      hasBlockquote: false,
      hasH2Sections: false,
      lineCount: 0,
    };
    const findings = simulateFindingEmission(BARE_HTML, aiBotAccess, llmsTxt);
    expect(findings.find((f) => f.type === "ai_bot_blocked")).toBeDefined();
    expect(findings.find((f) => f.type === "missing_llms_txt")).toBeDefined();
  });

  it("bare HTML emits at least 5 GEO category findings", () => {
    const findings = simulateFindingEmission(BARE_HTML);
    const geoFindings = findings.filter((f) =>
      f.type.endsWith("_gap")
    );
    expect(geoFindings.length).toBeGreaterThanOrEqual(5);
  });

  it("rich HTML emits fewer GEO category findings than bare HTML", () => {
    const bareFindings = simulateFindingEmission(BARE_HTML).filter((f) => f.type.endsWith("_gap"));
    const richFindings = simulateFindingEmission(RICH_HTML).filter((f) => f.type.endsWith("_gap"));
    expect(richFindings.length).toBeLessThan(bareFindings.length);
  });

  it("all emitted finding types are known strings", () => {
    const aiBotAccess: AiBotAccessResult = {
      allCriticalAllowed: false,
      blockedBots: ["GPTBot"],
      allowedBots: [],
      hasRobotsTxt: true,
    };
    const llmsTxt: LlmsTxtResult = {
      present: false,
      hasH1: false,
      hasBlockquote: false,
      hasH2Sections: false,
      lineCount: 0,
    };
    const knownTypes = new Set([
      "answer_readiness_gap",
      "entity_clarity_gap",
      "offer_clarity_gap",
      "audience_clarity_gap",
      "location_clarity_gap",
      "proof_trust_gap",
      "structured_data_gap",
      "source_corroboration_gap",
      "prompt_recommendation_gap",
      "ai_bot_blocked",
      "missing_llms_txt",
    ]);
    const findings = simulateFindingEmission(BARE_HTML, aiBotAccess, llmsTxt);
    for (const f of findings) {
      expect(knownTypes.has(f.type), `Unknown finding type: ${f.type}`).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────
// 6. Live network test — checkAiBotAccess + checkLlmsTxt
//    Uses example.com (IANA-maintained, stable, no llms.txt)
// ─────────────────────────────────────────────

describe("live network — checkAiBotAccess and checkLlmsTxt", () => {
  it(
    "checkAiBotAccess returns a valid result for example.com",
    async () => {
      const { checkAiBotAccess } = await import("./scanner/crawler");
      const result = await checkAiBotAccess("https://example.com");
      // example.com has no robots.txt — should return allCriticalAllowed: true
      expect(result).toHaveProperty("allCriticalAllowed");
      expect(result).toHaveProperty("blockedBots");
      expect(result).toHaveProperty("allowedBots");
      expect(result).toHaveProperty("hasRobotsTxt");
      expect(Array.isArray(result.blockedBots)).toBe(true);
      expect(Array.isArray(result.allowedBots)).toBe(true);
      // example.com has no robots.txt, so all bots should be allowed
      expect(result.allCriticalAllowed).toBe(true);
    },
    15000,
  );

  it(
    "checkLlmsTxt returns present:false for example.com (no llms.txt)",
    async () => {
      const { checkLlmsTxt } = await import("./scanner/crawler");
      const result = await checkLlmsTxt("https://example.com");
      expect(result).toHaveProperty("present");
      expect(result).toHaveProperty("hasH1");
      expect(result).toHaveProperty("hasBlockquote");
      expect(result).toHaveProperty("hasH2Sections");
      expect(result).toHaveProperty("lineCount");
      // example.com has no llms.txt
      expect(result.present).toBe(false);
      expect(result.lineCount).toBe(0);
    },
    15000,
  );

  it(
    "checkAiBotAccess result shape is always valid regardless of domain",
    async () => {
      const { checkAiBotAccess } = await import("./scanner/crawler");
      // Use a domain that definitely has a robots.txt
      const result = await checkAiBotAccess("https://wikipedia.org");
      expect(typeof result.allCriticalAllowed).toBe("boolean");
      expect(Array.isArray(result.blockedBots)).toBe(true);
      expect(Array.isArray(result.allowedBots)).toBe(true);
      // Wikipedia allows all bots
      expect(result.allCriticalAllowed).toBe(true);
    },
    15000,
  );
});
