/**
 * GEO / Auriti-Style Scoring Engine
 *
 * Eight categories scored 0–100. Inspired by Princeton KDD 2024 GEO research
 * and the Auriti-Labs 8-pillar framework. Pure function over scanner findings
 * so it is deterministic, testable, and can run inside any tRPC procedure.
 */

import type { ScannerFindings } from "./scanner";

export type CategoryKey =
  | "crawlability"
  | "structure"
  | "schema"
  | "citability"
  | "authority"
  | "freshness"
  | "clarity"
  | "conversion";

export type CategoryResult = {
  key: CategoryKey;
  label: string;
  score: number;
  grade: string;
  narrative: string;
  signals: string[];
};

export type ScoringResult = {
  categories: Record<CategoryKey, CategoryResult>;
  overall: number;
  overallGrade: string;
  rinaNarrative: string;
};

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  crawlability: "Crawlability",
  structure: "Structure",
  schema: "Schema Markup",
  citability: "Citability",
  authority: "Authority Signals",
  freshness: "Freshness",
  clarity: "Clarity",
  conversion: "Conversion Readiness",
};

function letterGrade(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 88) return "A";
  if (score >= 80) return "B+";
  if (score >= 72) return "B";
  if (score >= 64) return "C+";
  if (score >= 56) return "C";
  if (score >= 48) return "D";
  return "F";
}

function clamp(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function scoreCrawlability(f: ScannerFindings): CategoryResult {
  const signals: string[] = [];
  let s = 50;
  if (f.status && f.status >= 200 && f.status < 300) {
    s += 15;
    signals.push("Homepage responded successfully.");
  } else {
    signals.push("Homepage did not return a healthy status.");
  }
  if (f.robotsTxt) {
    s += 5;
    signals.push("robots.txt is published.");
  } else {
    signals.push("robots.txt is missing — AI crawlers receive no guidance.");
  }
  if (f.robotsAllowsAi) {
    s += 10;
    signals.push("AI crawlers (GPTBot, ClaudeBot, PerplexityBot) are permitted.");
  } else {
    s -= 25;
    signals.push("robots.txt blocks one or more AI crawlers — visibility is capped.");
  }
  if (f.sitemapPresent) {
    s += 12;
    signals.push("sitemap.xml is reachable.");
  } else {
    signals.push("No sitemap.xml detected — discovery relies on link graph alone.");
  }
  if (f.llmsTxtPresent) {
    s += 8;
    signals.push("llms.txt is published — explicit AI signal.");
  }
  return {
    key: "crawlability",
    label: CATEGORY_LABELS.crawlability,
    score: clamp(s),
    grade: letterGrade(clamp(s)),
    narrative:
      f.robotsAllowsAi && f.sitemapPresent
        ? "AI engines can find and read this site without friction."
        : "AI engines may have trouble crawling or interpreting this site.",
    signals,
  };
}

function scoreStructure(f: ScannerFindings): CategoryResult {
  const signals: string[] = [];
  let s = 40;
  if (f.h1Tags.length === 1) {
    s += 18;
    signals.push("Exactly one H1 tag — clear page topic.");
  } else if (f.h1Tags.length === 0) {
    signals.push("No H1 tag — AI cannot identify the page's main topic.");
  } else {
    s += 6;
    signals.push(`Multiple H1 tags (${f.h1Tags.length}) — primary topic ambiguous.`);
  }
  if (f.h2Tags.length >= 3) {
    s += 14;
    signals.push("H2 sub-sections present.");
  } else {
    signals.push("Few or no H2 sub-sections — page lacks scannable structure.");
  }
  if (f.h3Tags.length > 0) {
    s += 6;
    signals.push("H3 supporting headings present.");
  }
  if (f.headingHierarchyValid) {
    s += 12;
    signals.push("Heading hierarchy is well-formed.");
  }
  if (f.title && f.title.length > 0) {
    s += 8;
    signals.push("Page <title> is set.");
  } else {
    signals.push("Page <title> is missing.");
  }
  if (f.canonical) {
    s += 4;
    signals.push("Canonical URL declared.");
  }
  return {
    key: "structure",
    label: CATEGORY_LABELS.structure,
    score: clamp(s),
    grade: letterGrade(clamp(s)),
    narrative:
      f.headingHierarchyValid && f.title
        ? "The page reads cleanly to both humans and machines."
        : "Page structure needs cleanup so AI can map topics confidently.",
    signals,
  };
}

function scoreSchema(f: ScannerFindings): CategoryResult {
  const signals: string[] = [];
  let s = 30;
  if (f.schemaBlocks.length > 0) {
    s += 15;
    signals.push(`${f.schemaBlocks.length} JSON-LD block(s) detected.`);
  } else {
    signals.push("No JSON-LD structured data detected.");
  }
  if (f.hasOrganizationSchema) {
    s += 18;
    signals.push("Organization schema present.");
  } else {
    signals.push("Organization schema missing — Rina recommends this fix.");
  }
  if (f.hasLocalBusinessSchema) {
    s += 12;
    signals.push("LocalBusiness schema present.");
  }
  if (f.hasServiceSchema) {
    s += 10;
    signals.push("Service or Product schema present.");
  }
  if (f.hasFAQSchema) {
    s += 12;
    signals.push("FAQ schema present — high citability signal.");
  } else if (f.hasFAQ) {
    signals.push("FAQ content exists but lacks FAQPage schema.");
  }
  if (f.sameAsLinks.length >= 2) {
    s += 8;
    signals.push("sameAs links connect this entity across the web.");
  }
  return {
    key: "schema",
    label: CATEGORY_LABELS.schema,
    score: clamp(s),
    grade: letterGrade(clamp(s)),
    narrative:
      f.hasOrganizationSchema && f.hasFAQSchema
        ? "AI engines have a structured definition of who this business is."
        : "Schema markup is incomplete — AI is guessing rather than knowing.",
    signals,
  };
}

function scoreCitability(f: ScannerFindings): CategoryResult {
  const signals: string[] = [];
  let s = 35;
  if (f.wordCount >= 600) {
    s += 18;
    signals.push(`Page has ${f.wordCount} words — enough for AI to summarize confidently.`);
  } else if (f.wordCount >= 250) {
    s += 8;
    signals.push("Word count is modest — AI summaries may be thin.");
  } else {
    signals.push("Very low word count — AI has little to cite.");
  }
  if (f.hasFAQ) {
    s += 14;
    signals.push("FAQ content is present — AI loves Q&A formats.");
  } else {
    signals.push("No FAQ section — Rina recommends adding answerable questions.");
  }
  if (f.hasAboutSection) {
    s += 10;
    signals.push("About section identified.");
  }
  if (f.metaDescription && f.metaDescription.length >= 80) {
    s += 12;
    signals.push("Meta description is descriptive enough to be quoted.");
  } else {
    signals.push("Meta description is missing or too short.");
  }
  if (f.h2Tags.length >= 4) {
    s += 6;
    signals.push("Multiple sub-sections give AI extractable passages.");
  }
  return {
    key: "citability",
    label: CATEGORY_LABELS.citability,
    score: clamp(s),
    grade: letterGrade(clamp(s)),
    narrative:
      f.hasFAQ && f.wordCount >= 600
        ? "There is plenty of quotable, structured content for AI to cite."
        : "Rina sees thin or unstructured content — citations will be rare.",
    signals,
  };
}

function scoreAuthority(f: ScannerFindings): CategoryResult {
  const signals: string[] = [];
  let s = 40;
  if (f.sameAsLinks.length >= 3) {
    s += 22;
    signals.push("Three or more sameAs links — strong cross-web identity.");
  } else if (f.sameAsLinks.length > 0) {
    s += 10;
    signals.push("Some sameAs links present.");
  } else {
    signals.push("No sameAs links — AI cannot confirm identity across platforms.");
  }
  if (f.externalLinkCount >= 5) {
    s += 10;
    signals.push("Outbound references suggest engaged content.");
  }
  if (f.openGraph["site_name"]) {
    s += 6;
    signals.push("OpenGraph site_name declared.");
  }
  if (f.twitterCard["site"] || f.twitterCard["card"]) {
    s += 6;
    signals.push("Twitter card present.");
  }
  if (f.hasOrganizationSchema) {
    s += 10;
    signals.push("Organization schema reinforces authority.");
  }
  return {
    key: "authority",
    label: CATEGORY_LABELS.authority,
    score: clamp(s),
    grade: letterGrade(clamp(s)),
    narrative:
      f.sameAsLinks.length >= 3
        ? "AI can verify this brand across multiple trusted platforms."
        : "Rina recommends building cross-platform identity signals.",
    signals,
  };
}

function scoreFreshness(f: ScannerFindings): CategoryResult {
  const signals: string[] = [];
  let s = 60; // start neutral — fetch alone cannot prove staleness
  // OG article:modified_time is a strong signal
  const ogModified = f.openGraph["updated_time"] || f.openGraph["article:modified_time"];
  const ogPublished = f.openGraph["article:published_time"];
  if (ogModified) {
    s += 20;
    signals.push("OpenGraph modified_time present.");
  } else if (ogPublished) {
    s += 10;
    signals.push("OpenGraph published_time present.");
  } else {
    signals.push("No public freshness signal — AI cannot tell if content is current.");
  }
  if (f.cmsDetected) {
    s += 6;
    signals.push(`Detected CMS: ${f.cmsDetected} — easy to update.`);
  }
  return {
    key: "freshness",
    label: CATEGORY_LABELS.freshness,
    score: clamp(s),
    grade: letterGrade(clamp(s)),
    narrative:
      ogModified
        ? "Freshness signals are visible to AI."
        : "Rina recommends adding visible last-updated dates.",
    signals,
  };
}

function scoreClarity(f: ScannerFindings): CategoryResult {
  const signals: string[] = [];
  let s = 50;
  // Heuristic: average sentence length on visible sample
  const sample = f.visibleTextSample;
  if (sample) {
    const sentences = sample.split(/[.!?]+/).filter((x) => x.trim().length > 0);
    const avgLen =
      sentences.reduce((acc, s2) => acc + s2.trim().split(/\s+/).length, 0) /
      Math.max(1, sentences.length);
    if (avgLen <= 22) {
      s += 18;
      signals.push("Sentences are short and scannable.");
    } else if (avgLen <= 32) {
      s += 8;
      signals.push("Sentence length is moderate.");
    } else {
      signals.push("Long sentences may reduce comprehension.");
    }
  }
  if (f.title && f.title.length <= 70 && f.title.length >= 20) {
    s += 10;
    signals.push("Title length is in the AI-friendly range.");
  }
  if (f.metaDescription && f.metaDescription.length <= 170 && f.metaDescription.length >= 80) {
    s += 12;
    signals.push("Meta description length is well calibrated.");
  }
  if (f.language) {
    s += 6;
    signals.push(`Page language declared as "${f.language}".`);
  } else {
    signals.push("Missing lang attribute — AI may misclassify region.");
  }
  return {
    key: "clarity",
    label: CATEGORY_LABELS.clarity,
    score: clamp(s),
    grade: letterGrade(clamp(s)),
    narrative:
      "Clarity reflects how easily a human or AI can extract meaning at a glance.",
    signals,
  };
}

function scoreConversion(f: ScannerFindings): CategoryResult {
  const signals: string[] = [];
  let s = 45;
  if (f.hasContactInfo) {
    s += 22;
    signals.push("Contact information is visible on the page.");
  } else {
    signals.push("No phone or email detected on the homepage.");
  }
  if (f.internalLinkCount >= 8) {
    s += 12;
    signals.push("Healthy internal navigation.");
  } else {
    signals.push("Sparse internal links — visitors may not find the next step.");
  }
  // CTA heuristic
  const cta = /\b(get started|book|schedule|contact us|request|sign up|try free|buy|subscribe)\b/i.test(
    f.visibleTextSample
  );
  if (cta) {
    s += 16;
    signals.push("Clear call-to-action language detected.");
  } else {
    signals.push("No clear CTA language found in the visible content.");
  }
  if (f.hasLocalBusinessSchema) {
    s += 8;
    signals.push("LocalBusiness schema reinforces conversion path.");
  }
  return {
    key: "conversion",
    label: CATEGORY_LABELS.conversion,
    score: clamp(s),
    grade: letterGrade(clamp(s)),
    narrative:
      f.hasContactInfo
        ? "When AI recommends this business, visitors can act."
        : "Rina sees no clear path for AI-referred visitors to convert.",
    signals,
  };
}

export function scoreFindings(findings: ScannerFindings): ScoringResult {
  const categories: Record<CategoryKey, CategoryResult> = {
    crawlability: scoreCrawlability(findings),
    structure: scoreStructure(findings),
    schema: scoreSchema(findings),
    citability: scoreCitability(findings),
    authority: scoreAuthority(findings),
    freshness: scoreFreshness(findings),
    clarity: scoreClarity(findings),
    conversion: scoreConversion(findings),
  };

  // Weighted overall — Auriti-style emphasizes trust + AI-readability foundations.
  const weights: Record<CategoryKey, number> = {
    crawlability: 0.16,
    structure: 0.12,
    schema: 0.18,
    citability: 0.16,
    authority: 0.12,
    freshness: 0.06,
    clarity: 0.1,
    conversion: 0.1,
  };

  const overall = clamp(
    (Object.keys(categories) as CategoryKey[]).reduce(
      (acc, key) => acc + categories[key].score * weights[key],
      0
    )
  );
  const overallGrade = letterGrade(overall);

  const lowest = (Object.values(categories) as CategoryResult[])
    .slice()
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((c) => c.label);

  const rinaNarrative = `Rina reviewed your visibility across eight pillars and gave it an overall ${overallGrade} (${overall}/100). The biggest opportunities right now are ${lowest.join(
    " and "
  )}.`;

  return {
    categories,
    overall,
    overallGrade,
    rinaNarrative,
  };
}

export const CATEGORY_KEYS: CategoryKey[] = [
  "crawlability",
  "structure",
  "schema",
  "citability",
  "authority",
  "freshness",
  "clarity",
  "conversion",
];
