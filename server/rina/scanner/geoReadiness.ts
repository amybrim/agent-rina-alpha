/**
 * GEO / AI Understanding Evaluator
 *
 * Implements the full intelligence architecture from the Agent Rina spec:
 *   - 9 GEO skill categories (Section 5)
 *   - 8 Princeton/Auriti scoring categories (Section 6)
 *
 * IMPORTANT: All internal numeric scores are private to this module.
 * Only grade language (CLEAR / PARTIAL / NOT_YET_VISIBLE) exits this file.
 * The overall health grade (STRONG / IMPROVING / AT_RISK / NEEDS_WORK)
 * is computed by visibilitySnapshot.ts from the five dimension grades —
 * never from raw numbers.
 */

import type { SchemaResult } from "./schemaParser";
import type { PageMetadata } from "./metadataParser";
import type { ContentAnalysis } from "./contentAnalyzer";

// ─────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────

export type CategoryGrade = "CLEAR" | "PARTIAL" | "NOT_YET_VISIBLE";

/**
 * One evaluated GEO category.
 * `signals` = what is working.
 * `gaps`    = what is missing.
 * `grade`   = CLEAR / PARTIAL / NOT_YET_VISIBLE — the only value that leaves this module.
 * `findingType` = machine-readable key used by scanWorkflow to create visibility_findings rows.
 */
export interface GeoCategoryResult {
  category: string;
  findingType: string;
  grade: CategoryGrade;
  signals: string[];
  gaps: string[];
  /** Severity to use if a finding is created for this category */
  defaultSeverity: "critical" | "high" | "medium" | "low";
}

export interface GeoEvaluationResult {
  /** Overall GEO readiness grade (aggregate of all 9 categories) */
  overallGrade: CategoryGrade;
  /** Backward-compat alias */
  grade: CategoryGrade;

  /** Per-category results — 9 GEO skill categories */
  categories: {
    answerReadiness: GeoCategoryResult;
    entityClarity: GeoCategoryResult;
    offerClarity: GeoCategoryResult;
    audienceClarity: GeoCategoryResult;
    locationServiceArea: GeoCategoryResult;
    proofTrustSignals: GeoCategoryResult;
    structuredDataReadiness: GeoCategoryResult;
    sourceCorroboration: GeoCategoryResult;
    promptRecommendationFit: GeoCategoryResult;
  };

  /** Princeton/Auriti internal scoring categories — for briefing/grading engine only */
  auritiCategories: {
    findability: CategoryGrade;
    understandability: CategoryGrade;
    entityConfidence: CategoryGrade;
    trustAuthority: CategoryGrade;
    structuredDataReadiness: CategoryGrade;
    contentAnswerCoverage: CategoryGrade;
    localMarketRelevance: CategoryGrade;
    progressImplementation: CategoryGrade;
  };

  /** Flat lists for backward compatibility with scanWorkflow */
  allSignals: string[];
  allGaps: string[];
  /** Backward-compat alias */
  signals: string[];
  gaps: string[];

  /** AI bot access from robots.txt (populated by crawler, passed in via context) */
  aiBotAccess?: AiBotAccessResult;

  /** llms.txt presence and quality */
  llmsTxt?: LlmsTxtResult;
}

export interface AiBotAccessResult {
  /** True if all critical citation bots are allowed */
  allCriticalAllowed: boolean;
  blockedBots: string[];
  allowedBots: string[];
  hasRobotsTxt: boolean;
}

export interface LlmsTxtResult {
  present: boolean;
  hasH1: boolean;
  hasBlockquote: boolean;
  hasH2Sections: boolean;
  lineCount: number;
}

// ─────────────────────────────────────────────
// Pattern libraries
// ─────────────────────────────────────────────

const DIRECT_ANSWER_PATTERNS = [
  /how (much|long|do|does|can|should|often)/i,
  /what (is|are|does|do|can|should|makes)/i,
  /why (choose|use|work with|hire|trust)/i,
  /when (should|do|can|will|is the right)/i,
  /who (is|are|should|can|benefits from)/i,
  /which (plan|option|service|package|tier)/i,
];

const FAQ_CONTENT_PATTERNS = [
  /frequently asked|faq|common questions|people also ask/i,
  /\?\s*<\/h[2-4]>/i,
  /\?\s*<\/strong>/i,
];

const ENTITY_TYPE_PATTERNS = [
  /\b(is|are) (a|an) (digital|marketing|consulting|coaching|legal|medical|financial|technology|software|design|creative|plumbing|electrical|landscaping|real estate|insurance|accounting|dental|law|engineering)/i,
  /we are (a|an) /i,
  /\w+ is (a|an) (company|firm|agency|studio|practice|clinic|school|platform|service|provider|consultancy)/i,
  /(founded|established|serving|operating) (in|since) \d{4}/i,
  /about (us|our company|our firm|our practice|our team)/i,
];

const ENTITY_CONSISTENCY_PATTERNS = [
  /same.?as|sameAs/i,
  /linkedin\.com\/(company|in)\//i,
  /google\.com\/maps/i,
];

const OFFER_EXPLICIT_PATTERNS = [
  /our (services?|solutions?|products?|offerings?|packages?|plans?)/i,
  /we (offer|provide|deliver|specialize in|help with)/i,
  /\$([\d,]+)\s*(\/|per|a)\s*(month|year|hour|project|session)/i,
  /(pricing|plans?|packages?|rates?|fees?)\s*:/i,
  /starting (at|from) \$/i,
];

const OFFER_SPECIFICITY_PATTERNS = [
  /\b(monthly|annual|one-time|hourly|project-based|retainer)\b/i,
  /\b(included|includes|features?|deliverables?)\b/i,
  /\b(custom|bespoke|tailored|personalized)\b/i,
];

const AUDIENCE_EXPLICIT_PATTERNS = [
  /for (small|medium|large|enterprise|local|national|startup|growing)/i,
  /for (businesses?|companies|organizations|individuals|professionals|entrepreneurs|owners|founders|executives|homeowners|families|patients|students)/i,
  /designed for|built for|made for|ideal for|perfect for|best for/i,
  /we (work with|serve|partner with|help|support)/i,
  /our (clients?|customers?|members?|patients?|students?)/i,
];

const AUDIENCE_SPECIFICITY_PATTERNS = [
  /\b(b2b|b2c|smb|enterprise|consumer|residential|commercial)\b/i,
  /\b(industry|sector|vertical|niche|market)\b/i,
  /\b(revenue|employees?|team size|budget)\b/i,
];

const LOCATION_EXPLICIT_PATTERNS = [
  /\b(serving|located in|based in|operating in|available in)\b/i,
  /\b[A-Z][a-z]+,\s*[A-Z]{2}\b/,
  /\b\d{5}(-\d{4})?\b/,
  /service area|service region|we serve (the|all of|clients in)/i,
  /local|nationwide|national|statewide|regional/i,
];

const TESTIMONIAL_PATTERNS = [
  /testimonials?|reviews?|what (our|clients|customers) say/i,
  /\d+\s*(star|★|⭐)/i,
  /"[^"]{20,200}"\s*[-—]\s*[A-Z]/,
  /google reviews?|yelp|trustpilot|g2|capterra/i,
];

const CREDENTIAL_PATTERNS = [
  /certified|accredited|licensed|insured|bonded/i,
  /years? (of experience|in business|serving)/i,
  /award|recognized|featured in|as seen in|press/i,
  /case stud(y|ies)|results|outcomes|success stor/i,
  /\d+\+?\s*(years?|clients?|projects?|customers?)/i,
];

const PROOF_NEAR_OFFER_PATTERNS = [
  /trusted by|used by|chosen by|relied on by/i,
  /\d+\s*(businesses?|clients?|customers?|companies?|homeowners?)/i,
  /satisfaction guarantee|money.back|risk.free/i,
];

const SOCIAL_PROOF_PATTERNS = [
  /linkedin\.com/i,
  /facebook\.com/i,
  /instagram\.com/i,
  /twitter\.com|x\.com/i,
  /youtube\.com/i,
];

const DIRECTORY_PATTERNS = [
  /yelp\.com|google\.com\/maps|bbb\.org|angi\.com|houzz\.com/i,
  /thumbtack\.com|homeadvisor\.com|bark\.com/i,
  /clutch\.co|g2\.com|capterra\.com/i,
];

const RECOMMENDATION_QUERY_PATTERNS = [
  /best (.*) (near me|in [A-Z]|for [a-z])/i,
  /who (can|should|do I|do you) (help|hire|call|contact|use)/i,
  /top (.*) (company|agency|firm|service|provider)/i,
  /recommend(ed)? (a|an|the) /i,
  /looking for (a|an|the) /i,
];

const DIFFERENTIATOR_PATTERNS = [
  /unlike (other|most|typical|traditional)/i,
  /the only|the first|award-winning|industry-leading/i,
  /our (unique|proprietary|exclusive|proven|patented)/i,
  /what (makes|sets) us apart|why (choose|work with) us/i,
  /\d+.year (track record|history|experience)/i,
];

// ─────────────────────────────────────────────
// Grade helpers
// ─────────────────────────────────────────────

function gradeFromCount(signalCount: number, clearThreshold: number, partialThreshold: number): CategoryGrade {
  if (signalCount >= clearThreshold) return "CLEAR";
  if (signalCount >= partialThreshold) return "PARTIAL";
  return "NOT_YET_VISIBLE";
}

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.filter((p) => p.test(text)).length;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─────────────────────────────────────────────
// Category evaluators
// ─────────────────────────────────────────────

function evalAnswerReadiness(html: string, schema: SchemaResult, metadata: PageMetadata): GeoCategoryResult {
  const signals: string[] = [];
  const gaps: string[] = [];

  const directAnswerCount = countMatches(html, DIRECT_ANSWER_PATTERNS);
  const hasFAQContent = FAQ_CONTENT_PATTERNS.some((p) => p.test(html));
  const hasFAQSchema = schema.hasFAQ;
  const questionCount = (html.match(/\?/g) ?? []).length;
  const hasLongContent = metadata.wordCount >= 300;

  if (hasFAQSchema) {
    signals.push("FAQ schema markup present — AI systems can extract Q&A pairs directly");
  } else {
    gaps.push("No FAQ schema — AI systems cannot extract structured Q&A from this page");
  }

  if (hasFAQContent) {
    signals.push("FAQ section detected in page content");
  } else {
    gaps.push("No FAQ section found — consider adding question-based headings or an FAQ block");
  }

  if (directAnswerCount >= 3) {
    signals.push(`${directAnswerCount} direct buyer questions answered (how/what/why/who/when)`);
  } else if (directAnswerCount >= 1) {
    signals.push(`${directAnswerCount} direct buyer question(s) detected`);
    gaps.push("More direct answers to buyer questions would improve AI extractability");
  } else {
    gaps.push("No direct answers to buyer questions — AI recommendation systems prefer pages that answer questions explicitly");
  }

  if (questionCount >= 5) {
    signals.push(`${questionCount} question marks detected — natural language questions improve AI extractability`);
  } else if (questionCount >= 2) {
    signals.push(`${questionCount} question marks detected`);
  } else {
    gaps.push("Few or no questions on the page — consider adding FAQ section or question-based headings");
  }

  if (hasLongContent) {
    signals.push(`${metadata.wordCount} words — sufficient content depth for AI extraction`);
  } else {
    gaps.push(`Only ${metadata.wordCount} words — thin content may not give AI systems enough to summarize`);
  }

  return {
    category: "Answer Readiness",
    findingType: "answer_readiness_gap",
    grade: gradeFromCount(signals.length, 4, 2),
    signals,
    gaps,
    defaultSeverity: "high",
  };
}

function evalEntityClarity(html: string, schema: SchemaResult, metadata: PageMetadata): GeoCategoryResult {
  const signals: string[] = [];
  const gaps: string[] = [];

  const hasEntityType = ENTITY_TYPE_PATTERNS.some((p) => p.test(html));
  const hasSameAsLinks = ENTITY_CONSISTENCY_PATTERNS.some((p) => p.test(html));
  const hasAboutPage = /\/about/i.test(html);

  if (hasEntityType) {
    signals.push("Business entity type clearly stated — AI can classify this business accurately");
  } else {
    gaps.push("Business entity type not clearly stated — AI may misclassify this business");
  }

  if (schema.hasOrganization) {
    signals.push("Organization schema present — AI systems can identify this as a verified entity");
  } else {
    gaps.push("No Organization schema — AI systems must infer entity details from unstructured text");
  }

  if (schema.hasLocalBusiness) {
    signals.push("LocalBusiness schema present — strong entity signal for local queries");
  }

  if (hasSameAsLinks) {
    signals.push("Same-as links detected (LinkedIn, Google Maps, etc.) — cross-source entity confirmation");
  } else {
    gaps.push("No same-as links found — AI systems cannot confirm this entity across sources");
  }

  if (hasAboutPage) {
    signals.push("About page linked — AI systems can find entity background and story");
  } else {
    gaps.push("No About page link detected — AI systems prefer entities with accessible background pages");
  }

  if (metadata.headings.h1.length > 0) {
    signals.push("H1 heading present — business name is stated on the page");
  } else {
    gaps.push("No H1 heading — business name may not be clearly stated for AI extraction");
  }

  return {
    category: "Entity Clarity",
    findingType: "entity_clarity_gap",
    grade: gradeFromCount(signals.length, 4, 2),
    signals,
    gaps,
    defaultSeverity: "high",
  };
}

function evalOfferClarity(html: string, schema: SchemaResult): GeoCategoryResult {
  const signals: string[] = [];
  const gaps: string[] = [];

  const explicitOfferCount = countMatches(html, OFFER_EXPLICIT_PATTERNS);
  const offerSpecificityCount = countMatches(html, OFFER_SPECIFICITY_PATTERNS);
  const hasPricingSignal = /\$[\d,]+|\bpric(e|ing)\b|\bplan(s)?\b|\bpackage(s)?\b/i.test(html);

  if (explicitOfferCount >= 2) {
    signals.push("Multiple explicit offer statements detected — AI can classify services clearly");
  } else if (explicitOfferCount === 1) {
    signals.push("Offer statement present");
    gaps.push("Only one offer statement found — more specificity would help AI recommend for specific queries");
  } else {
    gaps.push("No clear offer statement — AI systems cannot confidently describe what this business provides");
  }

  if (offerSpecificityCount >= 2) {
    signals.push("Offer specificity signals present (pricing model, deliverables, or custom language)");
  } else {
    gaps.push("Offer lacks specificity — AI may not be able to recommend for 'best X for Y' queries");
  }

  if (schema.hasService) {
    signals.push("Service schema present — AI systems can extract structured service data");
  } else {
    gaps.push("No Service schema — consider adding Service or Product schema to key offer pages");
  }

  if (schema.hasProduct) {
    signals.push("Product schema present");
  }

  if (hasPricingSignal) {
    signals.push("Pricing signals detected — AI can include cost context in recommendations");
  } else {
    gaps.push("No pricing signals — AI recommendation systems often include cost context; absence may reduce recommendation confidence");
  }

  return {
    category: "Offer Clarity",
    findingType: "offer_clarity_gap",
    grade: gradeFromCount(signals.length, 3, 2),
    signals,
    gaps,
    defaultSeverity: "critical",
  };
}

function evalAudienceClarity(html: string): GeoCategoryResult {
  const signals: string[] = [];
  const gaps: string[] = [];

  const explicitAudienceCount = countMatches(html, AUDIENCE_EXPLICIT_PATTERNS);
  const audienceSpecificityCount = countMatches(html, AUDIENCE_SPECIFICITY_PATTERNS);
  const hasUseCaseLanguage = /use case|use-case|scenario|situation|when you (need|want|have)/i.test(html);
  const hasCustomerLanguage = /our (clients?|customers?|members?|patients?|students?) (say|love|trust|choose)/i.test(html);

  if (explicitAudienceCount >= 2) {
    signals.push("Audience clearly defined — AI systems know who this business serves");
  } else if (explicitAudienceCount === 1) {
    signals.push("Audience statement present");
    gaps.push("Audience definition could be more specific to improve recommendation targeting");
  } else {
    gaps.push("Audience not clearly defined — AI systems may not know whether this is for homeowners, agencies, executives, or students");
  }

  if (audienceSpecificityCount >= 1) {
    signals.push("Audience specificity signals present (B2B/B2C, industry, company size)");
  } else {
    gaps.push("No audience specificity signals — consider adding industry, company size, or buyer type language");
  }

  if (hasUseCaseLanguage) {
    signals.push("Use case language detected — AI can match this business to specific buyer situations");
  } else {
    gaps.push("No use case language — consider describing specific situations where buyers need this service");
  }

  if (hasCustomerLanguage) {
    signals.push("Customer voice language present — reinforces audience identity");
  }

  return {
    category: "Audience Clarity",
    findingType: "audience_clarity_gap",
    grade: gradeFromCount(signals.length, 3, 2),
    signals,
    gaps,
    defaultSeverity: "high",
  };
}

function evalLocationServiceArea(html: string, schema: SchemaResult, metadata: PageMetadata): GeoCategoryResult {
  const signals: string[] = [];
  const gaps: string[] = [];

  const hasExplicitLocation = LOCATION_EXPLICIT_PATTERNS.some((p) => p.test(html));
  const hasNationwideSignal = /nationwide|national|across the (us|usa|country|united states)/i.test(html);

  if (hasExplicitLocation) {
    signals.push("Service area or location language present");
  } else {
    gaps.push("No service area or location language — AI systems may not know where this business operates");
  }

  if (metadata.hasAddress) {
    signals.push("Physical address detected — strong local entity signal");
  } else if (!hasNationwideSignal) {
    gaps.push("No physical address found — local AI recommendation systems need location data");
  }

  if (metadata.hasPhoneNumber) {
    signals.push("Phone number present — supports local entity verification");
  }

  if (schema.hasLocalBusiness) {
    signals.push("LocalBusiness schema with location data — AI systems can confirm service area");
  } else if (hasExplicitLocation) {
    gaps.push("Location mentioned in text but no LocalBusiness schema — add schema to make location machine-readable");
  }

  if (hasNationwideSignal) {
    signals.push("Nationwide service area stated — AI systems understand geographic scope");
  }

  return {
    category: "Location / Service Area Clarity",
    findingType: "location_clarity_gap",
    grade: gradeFromCount(signals.length, 3, 1),
    signals,
    gaps,
    defaultSeverity: metadata.hasAddress || schema.hasLocalBusiness ? "high" : "medium",
  };
}

function evalProofTrustSignals(html: string, schema: SchemaResult): GeoCategoryResult {
  const signals: string[] = [];
  const gaps: string[] = [];

  const testimonialCount = countMatches(html, TESTIMONIAL_PATTERNS);
  const credentialCount = countMatches(html, CREDENTIAL_PATTERNS);
  const proofNearOfferCount = countMatches(html, PROOF_NEAR_OFFER_PATTERNS);
  const hasStatistics = /\d+%|\d+\s*(clients?|customers?|projects?|years?)/i.test(html);
  const hasCaseStudy = /case stud(y|ies)|success stor|before.and.after|results/i.test(html);

  if (testimonialCount >= 2) {
    signals.push("Multiple trust signals detected (testimonials, reviews, or ratings)");
  } else if (testimonialCount === 1) {
    signals.push("Testimonial or review signal present");
    gaps.push("Strong proof exists but may not be close enough to service claims");
  } else {
    gaps.push("No testimonials or reviews detected — AI recommendation systems rely on social proof to validate recommendations");
  }

  if (credentialCount >= 2) {
    signals.push("Credentials and authority signals present (certifications, years in business, awards)");
  } else if (credentialCount === 1) {
    signals.push("Some credential language detected");
    gaps.push("More credential specificity would strengthen trust signals for AI systems");
  } else {
    gaps.push("No credentials, certifications, or authority signals found");
  }

  if (proofNearOfferCount >= 1) {
    signals.push("Proof language near offer statements — AI can connect trust to specific services");
  } else {
    gaps.push("Proof signals not clearly connected to offer statements — move testimonials closer to service descriptions");
  }

  if (schema.hasReview) {
    signals.push("Review schema present — AI systems can extract structured rating data");
  } else {
    gaps.push("No Review or AggregateRating schema — consider adding structured review data");
  }

  if (hasStatistics) {
    signals.push("Specific statistics present — AI systems prefer verifiable quantitative claims");
  } else {
    gaps.push("No specific statistics — adding numbers (clients served, years, results) improves AI citation confidence");
  }

  if (hasCaseStudy) {
    signals.push("Case study or results language detected — strong recommendation signal");
  }

  return {
    category: "Proof and Trust Signals",
    findingType: "proof_trust_gap",
    grade: gradeFromCount(signals.length, 4, 2),
    signals,
    gaps,
    defaultSeverity: "high",
  };
}

function evalStructuredDataReadiness(html: string, schema: SchemaResult, metadata: PageMetadata): GeoCategoryResult {
  const signals: string[] = [];
  const gaps: string[] = [];

  if (!schema.present || !schema.valid) {
    gaps.push("No valid structured data — AI systems must infer all business details from unstructured text");
    gaps.push("Add Organization schema as the minimum baseline for entity recognition");
  } else {
    signals.push(`Structured data present (${schema.types.join(", ")})`);
  }

  if (schema.hasOrganization) {
    signals.push("Organization schema — AI systems can identify this as a verified entity");
  } else if (schema.present) {
    gaps.push("Organization schema missing — add it to establish entity identity for AI systems");
  }

  if (schema.hasLocalBusiness) {
    signals.push("LocalBusiness schema — strong GEO signal for local queries");
  }

  if (schema.hasFAQ) {
    signals.push("FAQPage schema — AI systems can extract Q&A pairs directly");
  } else {
    gaps.push("No FAQPage schema — add FAQ schema to enable direct Q&A extraction by AI systems");
  }

  if (schema.hasService) {
    signals.push("Service schema — AI systems can extract structured service data");
  } else {
    gaps.push("No Service schema — consider adding Service schema to key offer pages");
  }

  if (schema.hasBreadcrumb) {
    signals.push("Breadcrumb schema — helps AI systems understand site structure");
  }

  if (schema.hasReview) {
    signals.push("Review/AggregateRating schema — AI systems can extract trust signals");
  }

  if (metadata.canonicalUrl) {
    signals.push("Canonical URL present — prevents duplicate content confusion for AI crawlers");
  } else {
    gaps.push("No canonical URL — add canonical tags to prevent duplicate content issues");
  }

  if (metadata.ogTitle && metadata.ogDescription && metadata.ogImage) {
    signals.push("Open Graph tags complete — social and AI sharing metadata present");
  } else {
    gaps.push("Incomplete Open Graph tags — add og:title, og:description, og:image for complete metadata");
  }

  return {
    category: "Structured Data Readiness",
    findingType: "structured_data_gap",
    grade: gradeFromCount(signals.length, 5, 2),
    signals,
    gaps,
    defaultSeverity: schema.present ? "medium" : "high",
  };
}

function evalSourceCorroboration(html: string): GeoCategoryResult {
  const signals: string[] = [];
  const gaps: string[] = [];

  const socialLinkCount = countMatches(html, SOCIAL_PROOF_PATTERNS);
  const directoryLinkCount = countMatches(html, DIRECTORY_PATTERNS);
  const hasLinkedIn = /linkedin\.com/i.test(html);
  const hasGoogleProfile = /google\.com\/maps|g\.page/i.test(html);
  const hasPressOrMedia = /featured in|as seen in|press|media|publication/i.test(html);
  const hasIndustryCitations = /association|member of|certified by|accredited by/i.test(html);
  const hasSameAsLinks = /sameAs|same.?as/i.test(html);

  if (socialLinkCount >= 3) {
    signals.push(`${socialLinkCount} social platform links detected — cross-source entity confirmation`);
  } else if (socialLinkCount >= 1) {
    signals.push(`${socialLinkCount} social platform link(s) detected`);
    gaps.push("More social platform links would strengthen cross-source entity confirmation");
  } else {
    gaps.push("No social platform links found — AI systems often rely on cross-site consistency to confirm entities");
  }

  if (hasLinkedIn) {
    signals.push("LinkedIn link present — strong entity corroboration signal for AI systems");
  } else {
    gaps.push("No LinkedIn link — LinkedIn is a primary corroboration source for AI systems identifying businesses");
  }

  if (hasGoogleProfile) {
    signals.push("Google Maps or Google Business Profile link detected");
  } else {
    gaps.push("No Google Business Profile link — local AI systems use GBP as a primary entity verification source");
  }

  if (directoryLinkCount >= 1) {
    signals.push(`${directoryLinkCount} directory link(s) detected (Yelp, BBB, Angi, etc.)`);
  } else {
    gaps.push("No directory links found — industry citations are thin");
  }

  if (hasPressOrMedia) {
    signals.push("Press or media mentions detected — authority corroboration signal");
  }

  if (hasIndustryCitations) {
    signals.push("Industry association or accreditation mentions — professional authority signal");
  } else {
    gaps.push("No industry association or accreditation mentions — consider adding professional memberships");
  }

  if (hasSameAsLinks) {
    signals.push("Same-as links in schema — explicit cross-source entity linking");
  }

  return {
    category: "Source Corroboration",
    findingType: "source_corroboration_gap",
    grade: gradeFromCount(signals.length, 4, 2),
    signals,
    gaps,
    defaultSeverity: "medium",
  };
}

function evalPromptRecommendationFit(html: string, schema: SchemaResult, content: ContentAnalysis): GeoCategoryResult {
  const signals: string[] = [];
  const gaps: string[] = [];

  const recommendationQueryCount = countMatches(html, RECOMMENDATION_QUERY_PATTERNS);
  const differentiatorCount = countMatches(html, DIFFERENTIATOR_PATTERNS);
  const hasComparisonContent = /vs\.?|versus|compared to|alternative to|instead of/i.test(html);
  const hasSpecificityLanguage = /specifically|in particular|especially|particularly/i.test(html);
  const hasNearMeLanguage = /near me|in my area|local|nearby/i.test(html);

  if (recommendationQueryCount >= 2) {
    signals.push("Language optimized for recommendation queries ('best X near me', 'who can help with Y')");
  } else if (recommendationQueryCount === 1) {
    signals.push("Some recommendation query language detected");
    gaps.push("More recommendation-optimized language would improve AI 'best X' query matching");
  } else {
    gaps.push("Not yet optimized for 'best X near me' or 'who can help with Y' prompts");
  }

  if (differentiatorCount >= 2) {
    signals.push("Strong competitive differentiation language — AI can distinguish this business from competitors");
  } else if (differentiatorCount === 1) {
    signals.push("Some differentiation language present");
    gaps.push("Stronger differentiation language would help AI systems recommend this business over competitors");
  } else {
    gaps.push("No competitive differentiation — AI recommendation systems may not distinguish this business from competitors");
  }

  if (hasComparisonContent) {
    signals.push("Comparison content detected — helps AI position this business in competitive context");
  }

  if (hasSpecificityLanguage) {
    signals.push("Specificity language present — AI systems prefer precise, specific claims");
  } else {
    gaps.push("Content lacks specificity language — vague claims reduce AI recommendation confidence");
  }

  if (hasNearMeLanguage) {
    signals.push("'Near me' or local language present — optimized for local recommendation queries");
  }

  if (schema.hasFAQ && content.hasOfferStatement && content.hasAudienceStatement) {
    signals.push("FAQ schema + offer + audience combination — strong prompt-recommendation fit");
  } else if (!schema.hasFAQ) {
    gaps.push("No FAQ schema — adding FAQ schema significantly improves AI recommendation readiness");
  }

  return {
    category: "Prompt-Recommendation Fit",
    findingType: "prompt_recommendation_gap",
    grade: gradeFromCount(signals.length, 4, 2),
    signals,
    gaps,
    defaultSeverity: "high",
  };
}

// ─────────────────────────────────────────────
// Princeton/Auriti internal scoring categories
// ─────────────────────────────────────────────

function computeAuritiCategories(
  cats: GeoEvaluationResult["categories"],
  metadata: PageMetadata,
  schema: SchemaResult,
  aiBotAccess?: AiBotAccessResult,
  llmsTxt?: LlmsTxtResult,
): GeoEvaluationResult["auritiCategories"] {
  const findabilitySignals = [
    aiBotAccess?.allCriticalAllowed,
    !!metadata.canonicalUrl,
    !!metadata.metaDescription,
    !!metadata.title,
    llmsTxt?.present,
  ].filter(Boolean).length;
  const findability = gradeFromCount(findabilitySignals, 4, 2);

  const understandabilityScore = [
    cats.answerReadiness.grade === "CLEAR",
    cats.offerClarity.grade !== "NOT_YET_VISIBLE",
    cats.audienceClarity.grade !== "NOT_YET_VISIBLE",
    metadata.headings.h1.length > 0,
    !!metadata.metaDescription && metadata.metaDescription.length > 50,
  ].filter(Boolean).length;
  const understandability = gradeFromCount(understandabilityScore, 4, 2);

  const entityConfidenceScore = [
    cats.entityClarity.grade === "CLEAR",
    cats.sourceCorroboration.grade !== "NOT_YET_VISIBLE",
    schema.hasOrganization || schema.hasLocalBusiness,
    cats.entityClarity.signals.some((s) => s.includes("same-as")),
  ].filter(Boolean).length;
  const entityConfidence = gradeFromCount(entityConfidenceScore, 3, 2);

  const trustAuthorityScore = [
    cats.proofTrustSignals.grade === "CLEAR",
    cats.proofTrustSignals.grade !== "NOT_YET_VISIBLE",
    schema.hasReview,
    cats.proofTrustSignals.signals.some((s) => s.includes("credentials")),
    cats.proofTrustSignals.signals.some((s) => s.includes("statistics")),
  ].filter(Boolean).length;
  const trustAuthority = gradeFromCount(trustAuthorityScore, 3, 2);

  const structuredDataReadiness = cats.structuredDataReadiness.grade;

  const contentAnswerScore = [
    cats.answerReadiness.grade !== "NOT_YET_VISIBLE",
    cats.offerClarity.grade !== "NOT_YET_VISIBLE",
    cats.promptRecommendationFit.grade !== "NOT_YET_VISIBLE",
    cats.answerReadiness.grade === "CLEAR",
  ].filter(Boolean).length;
  const contentAnswerCoverage = gradeFromCount(contentAnswerScore, 3, 2);

  const localMarketScore = [
    cats.locationServiceArea.grade !== "NOT_YET_VISIBLE",
    cats.audienceClarity.grade !== "NOT_YET_VISIBLE",
    cats.locationServiceArea.grade === "CLEAR",
    cats.audienceClarity.grade === "CLEAR",
  ].filter(Boolean).length;
  const localMarketRelevance = gradeFromCount(localMarketScore, 3, 2);

  // Progress/implementation is computed by visibilitySnapshot at briefing time
  const progressImplementation: CategoryGrade = "NOT_YET_VISIBLE";

  return {
    findability,
    understandability,
    entityConfidence,
    trustAuthority,
    structuredDataReadiness,
    contentAnswerCoverage,
    localMarketRelevance,
    progressImplementation,
  };
}

// ─────────────────────────────────────────────
// Overall grade aggregation
// ─────────────────────────────────────────────

function computeOverallGrade(cats: GeoEvaluationResult["categories"]): CategoryGrade {
  const grades = Object.values(cats).map((c) => c.grade);
  const clearCount = grades.filter((g) => g === "CLEAR").length;
  const notVisibleCount = grades.filter((g) => g === "NOT_YET_VISIBLE").length;
  if (clearCount >= 6) return "CLEAR";
  if (notVisibleCount >= 5) return "NOT_YET_VISIBLE";
  return "PARTIAL";
}

// ─────────────────────────────────────────────
// Main evaluator
// ─────────────────────────────────────────────

export function assessGeoReadiness(
  html: string,
  schema: SchemaResult,
  metadata: PageMetadata,
  content: ContentAnalysis,
  aiBotAccess?: AiBotAccessResult,
  llmsTxt?: LlmsTxtResult,
): GeoEvaluationResult {
  const categories: GeoEvaluationResult["categories"] = {
    answerReadiness: evalAnswerReadiness(html, schema, metadata),
    entityClarity: evalEntityClarity(html, schema, metadata),
    offerClarity: evalOfferClarity(html, schema),
    audienceClarity: evalAudienceClarity(html),
    locationServiceArea: evalLocationServiceArea(html, schema, metadata),
    proofTrustSignals: evalProofTrustSignals(html, schema),
    structuredDataReadiness: evalStructuredDataReadiness(html, schema, metadata),
    sourceCorroboration: evalSourceCorroboration(html),
    promptRecommendationFit: evalPromptRecommendationFit(html, schema, content),
  };

  const auritiCategories = computeAuritiCategories(categories, metadata, schema, aiBotAccess, llmsTxt);
  const overallGrade = computeOverallGrade(categories);

  const allSignals = Object.values(categories).flatMap((c) => c.signals);
  const allGaps = Object.values(categories).flatMap((c) => c.gaps);

  return {
    overallGrade,
    grade: overallGrade,       // backward-compat
    categories,
    auritiCategories,
    allSignals,
    allGaps,
    signals: allSignals,       // backward-compat
    gaps: allGaps,             // backward-compat
    aiBotAccess,
    llmsTxt,
  };
}
