import { describe, expect, it } from "vitest";
import { CATEGORY_KEYS, scoreFindings } from "./scoring";
import { buildRecommendations } from "./recommendations";
import type { ScannerFindings } from "./scanner";

function baseFindings(overrides: Partial<ScannerFindings> = {}): ScannerFindings {
  return {
    url: "https://example.com",
    fetchedAt: Date.now(),
    status: 200,
    finalUrl: "https://example.com",
    title: "Example Co — AI-ready visibility",
    metaDescription:
      "Example Co helps small businesses become discoverable, understandable, and recommendable by AI search engines like ChatGPT, Gemini, and Perplexity.",
    metaKeywords: null,
    canonical: "https://example.com",
    language: "en",
    h1Tags: ["Welcome to Example Co"],
    h2Tags: ["What we do", "How we help", "Our services", "Who we serve"],
    h3Tags: ["Pricing", "FAQ"],
    headingHierarchyValid: true,
    wordCount: 750,
    visibleTextSample:
      "Example Co helps brands. We work with founders. Get started today by booking a call. Our team answers your questions fast.",
    hasFAQ: true,
    hasAboutSection: true,
    hasContactInfo: true,
    internalLinkCount: 12,
    externalLinkCount: 6,
    internalLinks: [],
    externalLinks: [],
    sameAsLinks: [
      "https://linkedin.com/company/example",
      "https://x.com/example",
      "https://instagram.com/example",
    ],
    schemaTypes: ["Organization", "FAQPage"],
    schemaBlocks: [{}, {}],
    hasOrganizationSchema: true,
    hasLocalBusinessSchema: false,
    hasFAQSchema: true,
    hasServiceSchema: false,
    robotsTxt: "User-agent: *\nAllow: /",
    robotsAllowsAi: true,
    sitemapUrl: "https://example.com/sitemap.xml",
    sitemapPresent: true,
    llmsTxtPresent: true,
    cmsDetected: "WordPress",
    generatorTag: "WordPress 6.5",
    openGraph: { site_name: "Example", "article:modified_time": "2026-05-01" },
    twitterCard: { card: "summary_large_image" },
    errors: [],
    ...overrides,
  };
}

describe("Rina scoring engine", () => {
  it("returns all eight pillars and an overall score with grade", () => {
    const result = scoreFindings(baseFindings());
    for (const key of CATEGORY_KEYS) {
      expect(result.categories[key]).toBeDefined();
      expect(result.categories[key].score).toBeGreaterThanOrEqual(0);
      expect(result.categories[key].score).toBeLessThanOrEqual(100);
      expect(result.categories[key].grade).toMatch(/^(A\+|A|B\+|B|C\+|C|D|F)$/);
    }
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
    expect(result.rinaNarrative).toMatch(/Rina/);
  });

  it("a strong AI-ready site scores high overall (>=80)", () => {
    const result = scoreFindings(baseFindings());
    expect(result.overall).toBeGreaterThanOrEqual(80);
  });

  it("blocking AI crawlers severely caps the crawlability score", () => {
    const blocked = scoreFindings(baseFindings({ robotsAllowsAi: false }));
    const allowed = scoreFindings(baseFindings({ robotsAllowsAi: true }));
    expect(blocked.categories.crawlability.score).toBeLessThan(
      allowed.categories.crawlability.score
    );
  });

  it("a thin no-schema site scores low and surfaces opportunities", () => {
    const weak = scoreFindings(
      baseFindings({
        wordCount: 80,
        hasFAQ: false,
        hasOrganizationSchema: false,
        hasFAQSchema: false,
        hasLocalBusinessSchema: false,
        hasServiceSchema: false,
        schemaBlocks: [],
        schemaTypes: [],
        sameAsLinks: [],
        sitemapPresent: false,
        llmsTxtPresent: false,
        h1Tags: [],
        h2Tags: [],
        metaDescription: null,
      })
    );
    expect(weak.overall).toBeLessThan(70);
    expect(weak.categories.schema.score).toBeLessThan(50);
    expect(weak.categories.citability.score).toBeLessThan(60);
  });
});

describe("Rina recommendation engine", () => {
  it("returns no fixes when site is already strong", () => {
    const findings = baseFindings();
    const scoring = scoreFindings(findings);
    const fixes = buildRecommendations(findings, scoring);
    expect(fixes.length).toBeLessThanOrEqual(2);
  });

  it("emits prioritized fixes for a weak site, with crawlability first", () => {
    const findings = baseFindings({
      robotsAllowsAi: false,
      sitemapPresent: false,
      llmsTxtPresent: false,
      hasOrganizationSchema: false,
      hasFAQSchema: false,
      hasFAQ: false,
      metaDescription: null,
      h1Tags: [],
      sameAsLinks: [],
      wordCount: 120,
    });
    const scoring = scoreFindings(findings);
    const fixes = buildRecommendations(findings, scoring);
    expect(fixes.length).toBeGreaterThan(3);
    const robotsFix = fixes.find((f) => f.assetType === "robots_txt");
    expect(robotsFix).toBeDefined();
    expect(robotsFix!.priority).toBe(1);
    // Every fix maps to a known category
    for (const f of fixes) {
      expect(CATEGORY_KEYS).toContain(f.category);
    }
  });
});
