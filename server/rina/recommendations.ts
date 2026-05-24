/**
 * Rina Recommendation Engine
 *
 * Translates scoring gaps into concrete, prioritized fix proposals that get
 * inserted into the Fix Queue at status "recommended".
 */

import type { ScannerFindings } from "./scanner";
import type { CategoryKey, ScoringResult } from "./scoring";

export type FixProposal = {
  category: CategoryKey;
  title: string;
  rationale: string;
  assetType: string; // e.g. "meta", "faq_schema", "org_schema", "gbp", "page_copy", "robots_txt", "handoff_note"
  targetLocation: string | null;
  priority: number; // 1=highest
  impactPoints: number;
};

export function buildRecommendations(
  findings: ScannerFindings,
  scoring: ScoringResult
): FixProposal[] {
  const fixes: FixProposal[] = [];

  // Crawlability
  if (!findings.robotsAllowsAi) {
    fixes.push({
      category: "crawlability",
      title: "Allow AI crawlers in robots.txt",
      rationale:
        "Your robots.txt currently disallows one or more AI bots (GPTBot, ClaudeBot, PerplexityBot). This is the single largest cap on AI visibility — Rina recommends opening access.",
      assetType: "robots_txt",
      targetLocation: "/robots.txt",
      priority: 1,
      impactPoints: 18,
    });
  }
  if (!findings.sitemapPresent) {
    fixes.push({
      category: "crawlability",
      title: "Publish a sitemap.xml",
      rationale:
        "AI engines and search crawlers rely on sitemap.xml for fast discovery. Rina will draft a sitemap referencing your key pages.",
      assetType: "sitemap",
      targetLocation: "/sitemap.xml",
      priority: 2,
      impactPoints: 10,
    });
  }
  if (!findings.llmsTxtPresent) {
    fixes.push({
      category: "crawlability",
      title: "Add an llms.txt for AI engines",
      rationale:
        "An llms.txt file gives AI engines a curated map of your most important content. Rina drafts this in your voice.",
      assetType: "llms_txt",
      targetLocation: "/llms.txt",
      priority: 3,
      impactPoints: 6,
    });
  }

  // Structure
  if (findings.h1Tags.length !== 1) {
    fixes.push({
      category: "structure",
      title: "Set exactly one descriptive H1",
      rationale:
        findings.h1Tags.length === 0
          ? "Your homepage has no H1 — AI cannot identify the page topic."
          : `Your homepage has ${findings.h1Tags.length} H1 tags — AI cannot tell which is the primary topic.`,
      assetType: "page_copy",
      targetLocation: "homepage <h1>",
      priority: 2,
      impactPoints: 8,
    });
  }
  if (!findings.title) {
    fixes.push({
      category: "structure",
      title: "Add a homepage <title>",
      rationale: "The page <title> is missing entirely — Rina will draft one.",
      assetType: "meta",
      targetLocation: "<head><title>",
      priority: 1,
      impactPoints: 8,
    });
  }
  if (!findings.canonical) {
    fixes.push({
      category: "structure",
      title: "Declare a canonical URL",
      rationale:
        "A canonical link prevents AI from confusing duplicate URLs.",
      assetType: "meta",
      targetLocation: '<link rel="canonical">',
      priority: 4,
      impactPoints: 4,
    });
  }

  // Schema
  if (!findings.hasOrganizationSchema) {
    fixes.push({
      category: "schema",
      title: "Add Organization JSON-LD schema",
      rationale:
        "Organization schema tells AI exactly who you are, what you do, and how to reach you. Rina drafts the JSON-LD.",
      assetType: "org_schema",
      targetLocation: "<head> JSON-LD",
      priority: 1,
      impactPoints: 14,
    });
  }
  if (!findings.hasFAQSchema && findings.hasFAQ) {
    fixes.push({
      category: "schema",
      title: "Wrap your FAQ in FAQPage schema",
      rationale:
        "You already have FAQ content — adding FAQPage schema turns it into AI-citable answers.",
      assetType: "faq_schema",
      targetLocation: "FAQ section JSON-LD",
      priority: 2,
      impactPoints: 12,
    });
  }
  if (!findings.hasServiceSchema) {
    fixes.push({
      category: "schema",
      title: "Describe your offerings with Service schema",
      rationale:
        "Service or Product schema lets AI list what you actually sell when recommending your business.",
      assetType: "service_schema",
      targetLocation: "Services page JSON-LD",
      priority: 3,
      impactPoints: 8,
    });
  }

  // Citability
  if (!findings.hasFAQ) {
    fixes.push({
      category: "citability",
      title: "Add a FAQ section answering top customer questions",
      rationale:
        "AI engines preferentially cite Q&A formatted content. Rina will draft 6–10 starter questions tuned to your business.",
      assetType: "faq_content",
      targetLocation: "Homepage or /faq",
      priority: 2,
      impactPoints: 12,
    });
  }
  if (!findings.metaDescription || findings.metaDescription.length < 80) {
    fixes.push({
      category: "citability",
      title: "Write a quotable meta description",
      rationale:
        "AI uses your meta description as a ready-made summary. Rina drafts a 140–160 character version.",
      assetType: "meta",
      targetLocation: '<meta name="description">',
      priority: 2,
      impactPoints: 8,
    });
  }

  // Authority
  if (findings.sameAsLinks.length < 3) {
    fixes.push({
      category: "authority",
      title: "Add sameAs links to your social and platform profiles",
      rationale:
        "sameAs links let AI verify your brand across LinkedIn, Instagram, Google Business Profile, and other trusted platforms.",
      assetType: "org_schema",
      targetLocation: "Organization schema sameAs[]",
      priority: 3,
      impactPoints: 10,
    });
  }

  // Freshness
  const ogModified =
    findings.openGraph["updated_time"] || findings.openGraph["article:modified_time"];
  if (!ogModified) {
    fixes.push({
      category: "freshness",
      title: "Surface a visible 'last updated' signal",
      rationale:
        "Rina recommends adding a visible last-updated date and an article:modified_time meta tag so AI knows your content is current.",
      assetType: "meta",
      targetLocation: "Footer or article meta",
      priority: 4,
      impactPoints: 6,
    });
  }

  // Clarity
  if (!findings.language) {
    fixes.push({
      category: "clarity",
      title: "Declare page language",
      rationale: "Add lang=\"en\" (or appropriate locale) on the <html> tag.",
      assetType: "meta",
      targetLocation: "<html lang>",
      priority: 4,
      impactPoints: 4,
    });
  }

  // Conversion
  if (!findings.hasContactInfo) {
    fixes.push({
      category: "conversion",
      title: "Make contact info visible on the homepage",
      rationale:
        "When AI recommends you, visitors need a phone number or email to act. Rina drafts a contact strip.",
      assetType: "page_copy",
      targetLocation: "Homepage header or footer",
      priority: 1,
      impactPoints: 12,
    });
  }
  const cta = /\b(get started|book|schedule|contact us|request|sign up|try free|buy|subscribe)\b/i.test(
    findings.visibleTextSample
  );
  if (!cta) {
    fixes.push({
      category: "conversion",
      title: "Add a clear call-to-action",
      rationale:
        "Rina drafts a primary CTA aligned to your business goals so AI-referred visitors know the next step.",
      assetType: "page_copy",
      targetLocation: "Homepage hero",
      priority: 2,
      impactPoints: 10,
    });
  }

  // Always recommend a Google Business Profile description tune-up if local-leaning
  if (findings.hasLocalBusinessSchema || /local|near me|location/i.test(findings.visibleTextSample)) {
    fixes.push({
      category: "authority",
      title: "Refresh your Google Business Profile description",
      rationale:
        "Rina drafts a GBP description that mirrors your website language so AI sees one consistent identity.",
      assetType: "gbp",
      targetLocation: "Google Business Profile",
      priority: 3,
      impactPoints: 8,
    });
  }

  // Sort by priority then impact
  fixes.sort((a, b) => a.priority - b.priority || b.impactPoints - a.impactPoints);

  // Suppress fixes if the category already scores >= 90
  return fixes.filter((f) => scoring.categories[f.category].score < 90);
}
