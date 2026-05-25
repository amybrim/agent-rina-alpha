import { eq } from "drizzle-orm";
import { db } from "../../db";
import { visibilityFindings, fixItems } from "../../../drizzle/schema";
import type { InferSelectModel } from "drizzle-orm";
import { fetchPage, extractSameDomainLinks } from "../scanner/crawler";
import { parseMetadata } from "../scanner/metadataParser";
import { parseSchema } from "../scanner/schemaParser";
import { analyzeContent } from "../scanner/contentAnalyzer";
import { assessGeoReadiness } from "../scanner/geoReadiness";
import { resolveConfidence } from "../scanner/confidenceResolver";
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

interface RawFindingInput {
  type: string;
  source: string;
  evidence: string;
  severity: "critical" | "high" | "medium" | "low";
  businessMeaning?: string;
  confidence: InferSelectModel<typeof visibilityFindings>["confidence"];
  pageUrl?: string;
}

export async function runScan(businessId: number): Promise<ScanResult> {
  const business = await getBusinessById(businessId);
  if (!business) throw new Error(`Business ${businessId} not found`);

  const errors: string[] = [];
  const rawFindings: RawFindingInput[] = [];
  let pagesScanned = 0;

  // ── Step 1: Crawl homepage + up to 5 key pages ─────────────────────────
  const urlsToCrawl = [business.url];
  const homepageResult = await fetchPage(business.url);

  if (homepageResult.crawlable && homepageResult.html) {
    const discovered = extractSameDomainLinks(homepageResult.html, business.url);
    // Prioritize key page types
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

    // Add priority URLs first, then discovered
    for (const url of [...priorityUrls, ...discovered]) {
      if (!urlsToCrawl.includes(url) && urlsToCrawl.length < 6) {
        urlsToCrawl.push(url);
      }
    }
  } else {
    errors.push(`Homepage not crawlable: ${homepageResult.error ?? `HTTP ${homepageResult.statusCode}`}`);
  }

  // ── Step 2: Analyze each page ──────────────────────────────────────────
  for (const url of urlsToCrawl) {
    try {
      const crawl = url === business.url ? homepageResult : await fetchPage(url);

      if (!crawl.crawlable || !crawl.html) {
        if (url !== business.url) continue; // skip non-critical pages
        errors.push(`Cannot crawl ${url}: ${crawl.error ?? `HTTP ${crawl.statusCode}`}`);
        continue;
      }

      pagesScanned++;

      const metadata = parseMetadata(crawl.html);
      const schema = parseSchema(crawl.html);
      const content = analyzeContent(crawl.html, url.includes("about") ? "about" : "homepage");
      const geo = assessGeoReadiness(crawl.html, schema, metadata, content);

      // Save page record
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
      const isHomepage = url === business.url;

      // Missing or thin title
      if (!metadata.title) {
        rawFindings.push({
          type: "missing_title",
          source: "metadata_scan",
          evidence: `No <title> tag found on ${crawl.finalUrl}`,
          severity: "critical",
          confidence: resolveConfidence({ source: "live_scan", directEvidence: true, crossValidated: false }),
          pageUrl: crawl.finalUrl,
        });
      } else if (metadata.title.length < 20) {
        rawFindings.push({
          type: "thin_title",
          source: "metadata_scan",
          evidence: `Title is only ${metadata.title.length} characters: "${metadata.title}"`,
          severity: "high",
          confidence: resolveConfidence({ source: "live_scan", directEvidence: true, crossValidated: false }),
          pageUrl: crawl.finalUrl,
        });
      }

      // Missing meta description
      if (!metadata.metaDescription) {
        rawFindings.push({
          type: "missing_meta_description",
          source: "metadata_scan",
          evidence: `No meta description found on ${crawl.finalUrl}`,
          severity: "high",
          confidence: resolveConfidence({ source: "live_scan", directEvidence: true, crossValidated: false }),
          pageUrl: crawl.finalUrl,
        });
      }

      // No H1
      if (metadata.headings.h1.length === 0) {
        rawFindings.push({
          type: "missing_h1",
          source: "metadata_scan",
          evidence: `No H1 heading found on ${crawl.finalUrl}`,
          severity: isHomepage ? "critical" : "medium",
          confidence: resolveConfidence({ source: "live_scan", directEvidence: true, crossValidated: false }),
          pageUrl: crawl.finalUrl,
        });
      }

      // No schema markup
      if (!schema.present) {
        rawFindings.push({
          type: "no_schema_markup",
          source: "schema_scan",
          evidence: `No JSON-LD or microdata schema found on ${crawl.finalUrl}`,
          severity: isHomepage ? "high" : "medium",
          confidence: resolveConfidence({ source: "live_scan", directEvidence: true, crossValidated: false }),
          pageUrl: crawl.finalUrl,
        });
      } else if (!schema.hasFAQ && isHomepage) {
        rawFindings.push({
          type: "missing_faq_schema",
          source: "schema_scan",
          evidence: `Schema present but no FAQPage type on ${crawl.finalUrl}`,
          severity: "medium",
          confidence: resolveConfidence({ source: "live_scan", directEvidence: true, crossValidated: false }),
          pageUrl: crawl.finalUrl,
        });
      }

      // Clarity gaps (homepage only)
      if (isHomepage) {
        if (!content.hasOfferStatement) {
          rawFindings.push({
            type: "unclear_offer",
            source: "content_analysis",
            evidence: "Homepage does not contain a clear statement of what the business offers",
            severity: "critical",
            confidence: resolveConfidence({ source: "pattern_match", directEvidence: true, crossValidated: false }),
            pageUrl: crawl.finalUrl,
          });
        }

        if (!content.hasAudienceStatement) {
          rawFindings.push({
            type: "unclear_audience",
            source: "content_analysis",
            evidence: "Homepage does not clearly identify who the business serves",
            severity: "high",
            confidence: resolveConfidence({ source: "pattern_match", directEvidence: true, crossValidated: false }),
            pageUrl: crawl.finalUrl,
          });
        }

        if (!content.hasCallToAction) {
          rawFindings.push({
            type: "missing_cta",
            source: "content_analysis",
            evidence: "No clear call to action detected on homepage",
            severity: "medium",
            confidence: resolveConfidence({ source: "pattern_match", directEvidence: true, crossValidated: false }),
            pageUrl: crawl.finalUrl,
          });
        }

        if (!content.hasProofPoints) {
          rawFindings.push({
            type: "missing_proof",
            source: "content_analysis",
            evidence: "No proof points detected (testimonials, credentials, results, or years in business)",
            severity: "high",
            confidence: resolveConfidence({ source: "pattern_match", directEvidence: true, crossValidated: false }),
            pageUrl: crawl.finalUrl,
          });
        }
      }

      // GEO readiness gaps
      if (geo.grade === "NOT_YET_VISIBLE" || geo.grade === "PARTIAL") {
        for (const gap of geo.gaps.slice(0, 3)) {
          rawFindings.push({
            type: "geo_readiness_gap",
            source: "geo_analysis",
            evidence: gap,
            severity: "medium",
            confidence: resolveConfidence({ source: "pattern_match", directEvidence: true, crossValidated: false }),
            pageUrl: crawl.finalUrl,
          });
        }
      }
    } catch (err) {
      errors.push(`Error scanning ${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Step 3: LLM interpretation of raw findings ─────────────────────────
  const findingsForInterpretation = rawFindings.filter((f) => !f.businessMeaning).slice(0, 10);
  let interpretations: Array<{ index: number; businessMeaning: string; confidence: string; recommendedAction: string }> = [];

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

    // Save finding
    const [findingResult] = await db
      .insert(visibilityFindings)
      .values({
        businessId,
        findingType: raw.type,
        source: raw.source,
        severity: raw.severity,
        businessMeaning,
        evidence: raw.evidence,
        confidence: raw.confidence,
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
