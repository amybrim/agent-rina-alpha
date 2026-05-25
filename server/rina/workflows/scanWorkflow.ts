/**
 * scanWorkflow.ts — Rina Scanner Orchestration
 *
 * Data integrity rules enforced here:
 *
 * Rule 1: Content validation gate — if a page fails content validation
 *   (empty, error page, JS-rendered shell), it is skipped with an error
 *   recorded. No findings are emitted for pages that were not actually read.
 *   If jsRendered = true, content-analysis findings use confidence:inferred
 *   with a note that JavaScript execution was not performed.
 *
 * Rule 5: Confidence labels are accurate and non-negotiable:
 *   - DETECTED: Rina fetched the value directly from the HTML or a file
 *     (title tag, meta description, H1, schema JSON-LD, robots.txt, llms.txt)
 *   - INFERRED: Rina is interpreting signals from content patterns
 *     (offer clarity, audience clarity, proof points, GEO category grades)
 *   - UNKNOWN: Rina does not have the data (AI platform results, GBP data
 *     without an active integration)
 *
 * Rule 2: AI platform findings (ChatGPT/Perplexity mentions) are NOT emitted
 *   here. They require a real prompt_test_results row from an actual API call.
 *   Any AI platform finding without a verified source must be confidence:unknown.
 *
 * Rule 4: GBP/review findings are NOT emitted here unless an active
 *   integration_connection row exists for this business. Without it,
 *   those findings would be confidence:unknown and are deferred.
 */

import { eq } from "drizzle-orm";
import { db } from "../../db";
import { visibilityFindings, fixItems } from "../../../drizzle/schema";
import type { InferSelectModel } from "drizzle-orm";
import {
  fetchPage,
  extractSameDomainLinks,
  checkAiBotAccess,
  checkLlmsTxt,
} from "../scanner/crawler";
import { parseMetadata } from "../scanner/metadataParser";
import { parseSchema } from "../scanner/schemaParser";
import { analyzeContent } from "../scanner/contentAnalyzer";
import { assessGeoReadiness } from "../scanner/geoReadiness";
import { upsertPageRecord } from "../brain/websiteInventory";
import { invokeLLM } from "../../_core/llm";
import { buildScanInterpretationPrompt } from "../prompts/scanInterpretation";
import { getBusinessById } from "../brain/businessProfile";

export interface ScanResult {
  businessId: number;
  pagesScanned: number;
  findingsCreated: number;
  fixItemsCreated: number;
  findings: InferSelectModel<typeof visibilityFindings>[];
  fixItems: InferSelectModel<typeof fixItems>[];
  errors: string[];
}

type ConfidenceValue = InferSelectModel<typeof visibilityFindings>["confidence"];

interface RawFindingInput {
  type: string;
  source: string;
  evidence: string;
  severity: "critical" | "high" | "medium" | "low";
  businessMeaning?: string;
  /** Rule 5: Must accurately reflect how the data was obtained */
  confidence: ConfidenceValue;
  pageUrl?: string;
}

// ─────────────────────────────────────────────
// Confidence constants — Rule 5
// ─────────────────────────────────────────────

/**
 * DETECTED: Rina fetched this value directly from the HTML.
 * Use for: title tag, meta description, H1 presence, schema JSON-LD
 * presence, robots.txt content, llms.txt content.
 */
const DETECTED: ConfidenceValue = "detected";

/**
 * INFERRED: Rina is interpreting signals from content patterns.
 * Use for: offer clarity, audience clarity, proof points, CTA presence,
 * GEO category grades (all derived from heuristic analysis of content).
 */
const INFERRED: ConfidenceValue = "inferred";

/**
 * LIKELY: Strong signal from a pattern match, not fully confirmed.
 * Use for: contact info detection (phone/address pattern matching).
 */
const LIKELY: ConfidenceValue = "likely";

// ─────────────────────────────────────────────
// Main scan workflow
// ─────────────────────────────────────────────

export async function runScan(businessId: number): Promise<ScanResult> {
  const business = await getBusinessById(businessId);
  if (!business) throw new Error(`Business ${businessId} not found`);

  const errors: string[] = [];
  const rawFindings: RawFindingInput[] = [];
  let pagesScanned = 0;

  // ── Step 1: Crawl homepage + up to 5 key pages ─────────────────────────
  const urlsToCrawl = [business.url];
  const homepageResult = await fetchPage(business.url);

  if (homepageResult.crawlable && homepageResult.contentValidated && homepageResult.html) {
    const discovered = extractSameDomainLinks(homepageResult.html, business.url);
    const priorityPaths = ["/about", "/services", "/contact", "/faq", "/pricing"];
    const priorityUrls = priorityPaths
      .map((p) => {
        try {
          const base = new URL(business.url);
          return `${base.protocol}//${base.host}${p}`;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as string[];

    for (const url of [...priorityUrls, ...discovered]) {
      if (!urlsToCrawl.includes(url) && urlsToCrawl.length < 6) {
        urlsToCrawl.push(url);
      }
    }
  } else {
    const reason = homepageResult.contentValidationReason ?? homepageResult.error ?? `HTTP ${homepageResult.statusCode}`;
    errors.push(`Homepage not readable: ${reason}`);
    // If homepage is JS-rendered, record it but continue — we can still check
    // robots.txt and llms.txt which don't require page content.
    if (!homepageResult.crawlable) {
      // Completely unreachable — nothing to scan
      return {
        businessId,
        pagesScanned: 0,
        findingsCreated: 0,
        fixItemsCreated: 0,
        findings: [],
        fixItems: [],
        errors,
      };
    }
  }

  // ── Step 1b: AI bot access + llms.txt (homepage domain, run once) ───────
  // Rule 1: These fetch actual files — results are confidence:detected.
  const [aiBotAccess, llmsTxt] = await Promise.all([
    checkAiBotAccess(business.url),
    checkLlmsTxt(business.url),
  ]);

  // ── Step 2: Analyze each page ──────────────────────────────────────────
  for (const url of urlsToCrawl) {
    try {
      const crawl = url === business.url ? homepageResult : await fetchPage(url);

      // Rule 1: Skip pages that didn't return real content
      if (!crawl.crawlable) {
        if (url !== business.url) continue;
        errors.push(`Cannot crawl ${url}: ${crawl.error ?? `HTTP ${crawl.statusCode}`}`);
        continue;
      }

      if (!crawl.contentValidated) {
        // Record the validation failure but don't emit findings for this page
        errors.push(
          `Skipping analysis of ${url}: ${crawl.contentValidationReason ?? "content validation failed"}`,
        );
        // For JS-rendered pages, still record the page as crawled but unanalyzable
        if (crawl.jsRendered) {
          await upsertPageRecord(businessId, crawl.finalUrl, {
            pageType: inferPageType(crawl.finalUrl),
            title: null,
            metaDescription: null,
            headings: { h1: [], h2: [], h3: [] },
            schemaPresent: { types: [], valid: false, raw: undefined },
            contentSummary: "JavaScript-rendered page — content not readable without JS execution",
            clarityScore: "NOT_YET_VISIBLE" as const,
            proofScore: "NOT_YET_VISIBLE" as const,
            crawlable: true,
          });
        }
        continue;
      }

      pagesScanned++;
      const isHomepage = url === business.url;

      // Rule 3: Parse using proper HTML parsers (node-html-parser)
      const metadata = parseMetadata(crawl.html);
      const schema = parseSchema(crawl.html);
      const content = analyzeContent(crawl.html, url.includes("about") ? "about" : "homepage");
      const geo = assessGeoReadiness(
        crawl.html,
        schema,
        metadata,
        content,
        isHomepage ? aiBotAccess : undefined,
        isHomepage ? llmsTxt : undefined,
      );

      // Save page record with raw schema for audit (Rule 3)
      await upsertPageRecord(businessId, crawl.finalUrl, {
        pageType: inferPageType(crawl.finalUrl),
        title: metadata.title,
        metaDescription: metadata.metaDescription,
        headings: metadata.headings,
        schemaPresent: {
          types: schema.types,
          valid: schema.valid,
          raw: schema.raw ?? undefined,
        },
        contentSummary: content.contentSummary,
        clarityScore: content.clarityScore,
        proofScore: content.proofScore,
        crawlable: crawl.crawlable,
      });

      // ── Generate findings from this page ─────────────────────────────
      //
      // Rule 5 label guide for this section:
      //   DETECTED  = Rina read this value directly from the HTML (tag present/absent)
      //   INFERRED  = Rina is interpreting content signals (heuristic analysis)
      //   LIKELY    = Strong pattern match on text, not a declared value

      // Missing or thin title — DETECTED (title tag is directly read)
      if (!metadata.title) {
        rawFindings.push({
          type: "missing_title",
          source: "metadata_scan",
          evidence: `No <title> tag found on ${crawl.finalUrl}`,
          severity: "critical",
          confidence: DETECTED,
          pageUrl: crawl.finalUrl,
        });
      } else if (metadata.title.length < 20) {
        rawFindings.push({
          type: "thin_title",
          source: "metadata_scan",
          evidence: `Title is only ${metadata.title.length} characters: "${metadata.title}"`,
          severity: "high",
          confidence: DETECTED,
          pageUrl: crawl.finalUrl,
        });
      }

      // Missing meta description — DETECTED (meta tag is directly read)
      if (!metadata.metaDescription) {
        rawFindings.push({
          type: "missing_meta_description",
          source: "metadata_scan",
          evidence: `No meta description found on ${crawl.finalUrl}`,
          severity: "high",
          confidence: DETECTED,
          pageUrl: crawl.finalUrl,
        });
      }

      // No H1 — DETECTED (H1 element is directly read)
      if (metadata.headings.h1.length === 0) {
        rawFindings.push({
          type: "missing_h1",
          source: "metadata_scan",
          evidence: `No H1 heading found on ${crawl.finalUrl}`,
          severity: isHomepage ? "critical" : "medium",
          confidence: DETECTED,
          pageUrl: crawl.finalUrl,
        });
      }

      // No schema markup — DETECTED (JSON-LD script tag is directly read)
      if (!schema.present) {
        rawFindings.push({
          type: "no_schema_markup",
          source: "schema_scan",
          evidence: `No JSON-LD or microdata schema found on ${crawl.finalUrl}`,
          severity: isHomepage ? "high" : "medium",
          confidence: DETECTED,
          pageUrl: crawl.finalUrl,
        });
      } else if (!schema.hasFAQ && isHomepage) {
        rawFindings.push({
          type: "missing_faq_schema",
          source: "schema_scan",
          evidence: `Schema present but no FAQPage type on ${crawl.finalUrl}`,
          severity: "medium",
          confidence: DETECTED,
          pageUrl: crawl.finalUrl,
        });
      }

      // Clarity gaps (homepage only) — INFERRED
      // These are heuristic interpretations of content signals, not declared values.
      if (isHomepage) {
        if (!content.hasOfferStatement) {
          rawFindings.push({
            type: "unclear_offer",
            source: "content_analysis",
            evidence: "Homepage does not appear to contain a clear statement of what the business offers — no offer-language patterns detected",
            severity: "critical",
            confidence: INFERRED,
            pageUrl: crawl.finalUrl,
          });
        }

        if (!content.hasAudienceStatement) {
          rawFindings.push({
            type: "unclear_audience",
            source: "content_analysis",
            evidence: "Homepage does not appear to clearly identify who the business serves — no audience-language patterns detected",
            severity: "high",
            confidence: INFERRED,
            pageUrl: crawl.finalUrl,
          });
        }

        if (!content.hasCallToAction) {
          rawFindings.push({
            type: "missing_cta",
            source: "content_analysis",
            evidence: "No clear call to action detected on homepage — no CTA-language patterns found",
            severity: "medium",
            confidence: INFERRED,
            pageUrl: crawl.finalUrl,
          });
        }

        if (!content.hasProofPoints) {
          rawFindings.push({
            type: "missing_proof",
            source: "content_analysis",
            evidence: "No proof points detected (testimonials, credentials, results, or years in business) — no proof-language patterns found",
            severity: "high",
            confidence: INFERRED,
            pageUrl: crawl.finalUrl,
          });
        }
      }

      // GEO readiness gaps — INFERRED
      // All GEO category grades are derived from heuristic analysis of content.
      // They represent Rina's interpretation of signals, not declared values.
      const geoCategoriesToEval = isHomepage
        ? Object.values(geo.categories)
        : [
            geo.categories.entityClarity,
            geo.categories.structuredDataReadiness,
            geo.categories.answerReadiness,
          ];

      for (const cat of geoCategoriesToEval) {
        if (cat.grade === "NOT_YET_VISIBLE" || cat.grade === "PARTIAL") {
          const primaryGap = cat.gaps[0];
          if (primaryGap) {
            rawFindings.push({
              type: cat.findingType,
              source: "geo_analysis",
              evidence: primaryGap,
              severity: cat.defaultSeverity,
              confidence: INFERRED, // Rule 5: GEO grades are interpretations, not direct reads
              pageUrl: crawl.finalUrl,
            });
          }
        }
      }

      // AI bot access finding — DETECTED (robots.txt was fetched directly)
      if (
        isHomepage &&
        geo.aiBotAccess &&
        !geo.aiBotAccess.allCriticalAllowed &&
        geo.aiBotAccess.blockedBots.length > 0
      ) {
        rawFindings.push({
          type: "ai_bot_blocked",
          source: "robots_txt_scan",
          evidence: `robots.txt is blocking AI citation bots: ${geo.aiBotAccess.blockedBots.join(", ")}`,
          severity: "critical",
          confidence: DETECTED, // Rule 5: robots.txt was fetched and parsed directly
          pageUrl: crawl.finalUrl,
        });
      }

      // llms.txt finding — DETECTED (file was fetched directly)
      if (isHomepage && geo.llmsTxt && !geo.llmsTxt.present) {
        rawFindings.push({
          type: "missing_llms_txt",
          source: "llms_txt_scan",
          evidence: "No llms.txt file found at domain root — AI systems cannot find a structured summary of this site",
          severity: "medium",
          confidence: DETECTED, // Rule 5: /llms.txt was fetched and returned 404
          pageUrl: crawl.finalUrl,
        });
      }
    } catch (err) {
      errors.push(`Error scanning ${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Step 3: LLM interpretation of raw findings ─────────────────────────
  // The LLM provides businessMeaning and recommendedAction — it does NOT
  // change confidence labels. Confidence is set by the scanner, not the LLM.
  const findingsForInterpretation = rawFindings.filter((f) => !f.businessMeaning).slice(0, 10);
  let interpretations: Array<{
    index: number;
    businessMeaning: string;
    confidence: string;
    recommendedAction: string;
  }> = [];

  if (findingsForInterpretation.length > 0) {
    try {
      const prompt = buildScanInterpretationPrompt(business, findingsForInterpretation);
      const response = await invokeLLM({
        messages: [{ role: "user", content: prompt }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "scan_interpretations",
            strict: false,
            schema: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "number" },
                  businessMeaning: { type: "string" },
                  confidence: { type: "string" },
                  recommendedAction: { type: "string" },
                },
                required: ["index", "businessMeaning", "confidence", "recommendedAction"],
              },
            },
          },
        },
      });
      const rawC = response.choices?.[0]?.message?.content ?? "[]";
      interpretations = JSON.parse(typeof rawC === "string" ? rawC : JSON.stringify(rawC));
    } catch {
      // LLM interpretation is best-effort; proceed without it
    }
  }

  // ── Step 4: Save findings and create fix items ─────────────────────────
  const savedFindings: InferSelectModel<typeof visibilityFindings>[] = [];
  const savedFixItems: InferSelectModel<typeof fixItems>[] = [];

  for (let i = 0; i < rawFindings.length; i++) {
    const raw = rawFindings[i];
    const interpretation = interpretations.find((interp) => interp.index === i + 1);

    const businessMeaning =
      interpretation?.businessMeaning ??
      raw.businessMeaning ??
      `${raw.type.replace(/_/g, " ")} detected on ${raw.pageUrl ?? "your website"}`;

    // Rule 5: The confidence label set by the scanner is authoritative.
    // The LLM interpretation does NOT override it.
    const [findingResult] = await db
      .insert(visibilityFindings)
      .values({
        businessId,
        findingType: raw.type,
        source: raw.source,
        severity: raw.severity,
        businessMeaning,
        evidence: raw.evidence,
        confidence: raw.confidence, // scanner-assigned, never LLM-overridden
        status: "open",
      })
      .$returningId();

    const [finding] = await db
      .select()
      .from(visibilityFindings)
      .where(eq(visibilityFindings.id, findingResult.id))
      .limit(1);
    savedFindings.push(finding);

    // Create fix item for critical and high severity
    if (raw.severity === "critical" || raw.severity === "high") {
      const recommendation =
        interpretation?.recommendedAction ??
        `Address the ${raw.type.replace(/_/g, " ")} issue identified on ${raw.pageUrl ?? "your website"}`;

      const [fixResult] = await db
        .insert(fixItems)
        .values({
          businessId,
          findingId: findingResult.id,
          issue: businessMeaning,
          recommendation,
          impactLevel: raw.severity === "critical" ? "high" : "medium",
          difficulty: "medium",
          status: "recommended",
        })
        .$returningId();

      const [fix] = await db
        .select()
        .from(fixItems)
        .where(eq(fixItems.id, fixResult.id))
        .limit(1);
      savedFixItems.push(fix);
    }
  }

  return {
    businessId,
    pagesScanned,
    findingsCreated: savedFindings.length,
    fixItemsCreated: savedFixItems.length,
    findings: savedFindings,
    fixItems: savedFixItems,
    errors,
  };
}

function inferPageType(url: string): string {
  const path = url.toLowerCase();
  if (path.endsWith("/") || path.match(/\/(index|home)?$/)) return "homepage";
  if (path.includes("/about")) return "about";
  if (path.includes("/service") || path.includes("/solution")) return "services";
  if (path.includes("/contact")) return "contact";
  if (path.includes("/faq") || path.includes("/help")) return "faq";
  if (path.includes("/blog") || path.includes("/news") || path.includes("/article")) return "blog";
  if (path.includes("/pricing") || path.includes("/plans")) return "pricing";
  if (path.includes("/product")) return "product";
  return "other";
}
