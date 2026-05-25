import type { SchemaResult } from "./schemaParser";
import type { PageMetadata } from "./metadataParser";
import type { ContentAnalysis } from "./contentAnalyzer";

export interface GeoReadinessResult {
  grade: "CLEAR" | "PARTIAL" | "NOT_YET_VISIBLE";
  hasFAQSchema: boolean;
  hasEntityClarity: boolean;
  hasStructuredData: boolean;
  hasAIReadableContent: boolean;
  hasDirectAnswers: boolean;
  hasNaturalLanguageQuestions: boolean;
  hasCompetitiveDifferentiation: boolean;
  signals: string[];
  gaps: string[];
  geoScore: number; // 0–10 internal only, NOT exposed to UI
}

export function assessGeoReadiness(
  html: string,
  schema: SchemaResult,
  metadata: PageMetadata,
  content: ContentAnalysis
): GeoReadinessResult {
  const signals: string[] = [];
  const gaps: string[] = [];
  let geoScore = 0;

  // ── FAQ schema ─────────────────────────────────────────────────────────
  const hasFAQSchema = schema.hasFAQ;
  if (hasFAQSchema) {
    signals.push("FAQ schema markup present — AI systems can extract Q&A pairs directly");
    geoScore += 2;
  } else {
    gaps.push("No FAQ schema — AI systems cannot extract structured Q&A from this page");
  }

  // ── Entity clarity ─────────────────────────────────────────────────────
  // Does the page clearly define what the business IS (not just what it does)?
  const entityPatterns = [
    /is a (digital|marketing|consulting|coaching|legal|medical|financial|technology|software|design|creative)/i,
    /we are a(n)? /i,
    /\w+ is a(n)? (company|firm|agency|studio|practice|clinic|school|platform)/i,
  ];
  const hasEntityClarity = entityPatterns.some((p) => p.test(html));
  if (hasEntityClarity) {
    signals.push("Entity type clearly stated — AI can classify this business accurately");
    geoScore += 1;
  } else {
    gaps.push("Business entity type not clearly stated — AI may misclassify this business");
  }

  // ── Structured data ────────────────────────────────────────────────────
  const hasStructuredData = schema.present && schema.valid;
  if (hasStructuredData) {
    signals.push(`Structured data present (${schema.types.join(", ")})`);
    geoScore += 2;
    if (schema.hasLocalBusiness) {
      signals.push("LocalBusiness schema — strong GEO signal for local queries");
      geoScore += 1;
    }
    if (schema.hasOrganization) {
      signals.push("Organization schema — helps AI systems identify the entity");
      geoScore += 1;
    }
  } else {
    gaps.push("No valid structured data — AI systems must infer business details from unstructured text");
  }

  // ── AI-readable content ────────────────────────────────────────────────
  // Short, direct sentences that AI can extract as facts
  const shortSentenceCount = (html.match(/[.!?][^.!?]{10,80}[.!?]/g) ?? []).length;
  const hasAIReadableContent = shortSentenceCount > 5 && content.hasOfferStatement;
  if (hasAIReadableContent) {
    signals.push("Content includes short, direct sentences AI can extract as facts");
    geoScore += 1;
  } else {
    gaps.push("Content may be too dense or vague for AI systems to extract clear facts");
  }

  // ── Direct answers ─────────────────────────────────────────────────────
  // Does the page directly answer common buyer questions?
  const directAnswerPatterns = [
    /how (much|long|do|does|can|should)/i,
    /what (is|are|does|do|can|should)/i,
    /why (choose|use|work with|hire)/i,
    /when (should|do|can|will)/i,
    /who (is|are|should|can)/i,
  ];
  const hasDirectAnswers = directAnswerPatterns.some((p) => p.test(html));
  if (hasDirectAnswers) {
    signals.push("Direct answers to buyer questions detected — strong GEO signal");
    geoScore += 1;
  } else {
    gaps.push("No direct answers to buyer questions — AI recommendation systems prefer pages that answer questions explicitly");
  }

  // ── Natural language questions ─────────────────────────────────────────
  const questionCount = (html.match(/\?/g) ?? []).length;
  const hasNaturalLanguageQuestions = questionCount >= 3;
  if (hasNaturalLanguageQuestions) {
    signals.push(`${questionCount} question marks detected — natural language questions improve AI extractability`);
    geoScore += 1;
  } else {
    gaps.push("Few or no questions on the page — consider adding FAQ section or question-based headings");
  }

  // ── Competitive differentiation ────────────────────────────────────────
  const diffPatterns = [
    /unlike (other|most|typical|traditional)/i,
    /the only|the first|the best|award-winning|industry-leading/i,
    /our (unique|proprietary|exclusive|proven|patented)/i,
    /what (makes|sets) us apart/i,
  ];
  const hasCompetitiveDifferentiation = diffPatterns.some((p) => p.test(html));
  if (hasCompetitiveDifferentiation) {
    signals.push("Competitive differentiation language present");
    geoScore += 1;
  } else {
    gaps.push("No competitive differentiation — AI recommendation systems may not distinguish this business from competitors");
  }

  // ── Compute grade ──────────────────────────────────────────────────────
  const grade: GeoReadinessResult["grade"] =
    geoScore >= 7 ? "CLEAR" : geoScore >= 3 ? "PARTIAL" : "NOT_YET_VISIBLE";

  return {
    grade,
    hasFAQSchema,
    hasEntityClarity,
    hasStructuredData,
    hasAIReadableContent,
    hasDirectAnswers,
    hasNaturalLanguageQuestions,
    hasCompetitiveDifferentiation,
    signals,
    gaps,
    geoScore,
  };
}
