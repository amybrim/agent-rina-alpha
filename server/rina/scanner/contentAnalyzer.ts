export interface ContentAnalysis {
  clarityScore: "CLEAR" | "PARTIAL" | "NOT_YET_VISIBLE";
  proofScore: "CLEAR" | "PARTIAL" | "NOT_YET_VISIBLE";
  hasOfferStatement: boolean;
  hasAudienceStatement: boolean;
  hasProblemStatement: boolean;
  hasCallToAction: boolean;
  hasProofPoints: boolean;
  hasTestimonials: boolean;
  hasCaseStudies: boolean;
  hasCredentials: boolean;
  hasYearsInBusiness: boolean;
  hasNumbers: boolean;
  hasLocation: boolean;
  hasServiceArea: boolean;
  contentSummary: string;
  signals: string[];
  gaps: string[];
}

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.filter((p) => p.test(text)).length;
}

function extractContentSummary(text: string): string {
  // Take first 500 chars of visible text as summary
  return text.slice(0, 500).replace(/\s+/g, " ").trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function analyzeContent(html: string, pageType = "homepage"): ContentAnalysis {
  const text = stripHtml(html).toLowerCase();
  const signals: string[] = [];
  const gaps: string[] = [];

  // ── Offer clarity signals ──────────────────────────────────────────────
  const offerPatterns = [
    /we (help|provide|offer|specialize|build|create|design|manage|deliver)/,
    /our (services?|solutions?|products?|platform|software|app)/,
    /(digital|web|marketing|consulting|coaching|training|therapy|legal|medical|financial) (services?|solutions?|help)/,
    /what we do/,
  ];
  const hasOfferStatement = countMatches(text, offerPatterns) >= 1;
  if (hasOfferStatement) signals.push("Offer statement present");
  else gaps.push("No clear offer statement detected");

  // ── Audience clarity signals ───────────────────────────────────────────
  const audiencePatterns = [
    /for (small|medium|large|enterprise|local|national|global|startup)/,
    /for (businesses?|companies|organizations|individuals|professionals|entrepreneurs|owners)/,
    /designed for|built for|made for|ideal for|perfect for/,
    /we (work with|serve|partner with|help)/,
  ];
  const hasAudienceStatement = countMatches(text, audiencePatterns) >= 1;
  if (hasAudienceStatement) signals.push("Audience statement present");
  else gaps.push("Audience not clearly defined");

  // ── Problem statement ──────────────────────────────────────────────────
  const problemPatterns = [
    /struggling with|frustrated by|tired of|overwhelmed/,
    /the problem|the challenge|the issue/,
    /without (a|the|our|your)/,
    /most (businesses?|companies|people|owners) (don't|can't|won't|struggle)/,
  ];
  const hasProblemStatement = countMatches(text, problemPatterns) >= 1;
  if (hasProblemStatement) signals.push("Problem statement present");

  // ── Call to action ─────────────────────────────────────────────────────
  const ctaPatterns = [
    /get started|get a (free|quote|demo|consultation|call)/,
    /book (a|your|now|today)/,
    /schedule (a|your|now|today)/,
    /contact us|reach out|talk to us|let's talk/,
    /sign up|try (it|for free|now)|start (your|a|for free)/,
    /learn more|see how|find out/,
  ];
  const hasCallToAction = countMatches(text, ctaPatterns) >= 1;
  if (hasCallToAction) signals.push("Call to action present");
  else gaps.push("No clear call to action");

  // ── Proof signals ──────────────────────────────────────────────────────
  const testimonialPatterns = [
    /testimonial|review|what (our|clients?|customers?) say/,
    /"[^"]{20,}"/, // quoted text (likely testimonial)
    /stars?|rating|rated/,
  ];
  const hasTestimonials = countMatches(text, testimonialPatterns) >= 1;
  if (hasTestimonials) signals.push("Testimonials/reviews present");

  const caseStudyPatterns = [
    /case study|case studies|success stor|client stor|project spotlight/,
    /results?:|outcome:|before.*after/,
  ];
  const hasCaseStudies = countMatches(text, caseStudyPatterns) >= 1;
  if (hasCaseStudies) signals.push("Case studies present");

  const credentialPatterns = [
    /certified|accredited|licensed|registered|member of|association|award/,
    /phd|mba|cpa|cfa|md|rn|pe|esq/i,
    /featured in|as seen in|press|media/,
  ];
  const hasCredentials = countMatches(text, credentialPatterns) >= 1;
  if (hasCredentials) signals.push("Credentials/awards present");

  const yearsPatterns = [
    /\d+\+?\s*years? (of experience|in business|serving|helping)/,
    /since \d{4}|founded in \d{4}|established \d{4}/,
    /over \d+ years/,
  ];
  const hasYearsInBusiness = countMatches(text, yearsPatterns) >= 1;
  if (hasYearsInBusiness) signals.push("Years in business stated");

  const numberPatterns = [
    /\d+\+?\s*(clients?|customers?|projects?|businesses?|companies|students?|patients?)/,
    /\$\d+[km]?\s*(in|of|revenue|saved|generated)/,
    /\d+%\s*(increase|improvement|reduction|growth|satisfaction)/,
  ];
  const hasNumbers = countMatches(text, numberPatterns) >= 1;
  if (hasNumbers) signals.push("Specific numbers/results present");

  const hasProofPoints = hasTestimonials || hasCaseStudies || hasCredentials || hasYearsInBusiness || hasNumbers;
  if (!hasProofPoints) gaps.push("No proof points detected (testimonials, credentials, or specific results)");

  // ── Location / service area ────────────────────────────────────────────
  const locationPatterns = [
    /serving (the )?(greater |metro )?\w+ (area|region|county)/,
    /located in|based in|headquartered in/,
    /\b[A-Z][a-z]+,\s*[A-Z]{2}\b/, // City, ST
  ];
  const hasLocation = countMatches(text, locationPatterns) >= 1;
  if (hasLocation) signals.push("Location information present");

  const serviceAreaPatterns = [
    /service area|we serve|serving clients? (in|across|throughout)/,
    /nationwide|across the (country|us|united states)/,
    /remote|virtual|online (services?|consulting|coaching)/,
  ];
  const hasServiceArea = countMatches(text, serviceAreaPatterns) >= 1;
  if (hasServiceArea) signals.push("Service area defined");

  // ── Compute grades ─────────────────────────────────────────────────────
  const claritySignalCount = [hasOfferStatement, hasAudienceStatement, hasCallToAction].filter(Boolean).length;
  const clarityScore: ContentAnalysis["clarityScore"] =
    claritySignalCount >= 3 ? "CLEAR" : claritySignalCount >= 1 ? "PARTIAL" : "NOT_YET_VISIBLE";

  const proofSignalCount = [hasTestimonials, hasCaseStudies, hasCredentials, hasYearsInBusiness, hasNumbers].filter(Boolean).length;
  const proofScore: ContentAnalysis["proofScore"] =
    proofSignalCount >= 3 ? "CLEAR" : proofSignalCount >= 1 ? "PARTIAL" : "NOT_YET_VISIBLE";

  return {
    clarityScore,
    proofScore,
    hasOfferStatement,
    hasAudienceStatement,
    hasProblemStatement,
    hasCallToAction,
    hasProofPoints,
    hasTestimonials,
    hasCaseStudies,
    hasCredentials,
    hasYearsInBusiness,
    hasNumbers,
    hasLocation,
    hasServiceArea,
    contentSummary: extractContentSummary(stripHtml(html)),
    signals,
    gaps,
  };
}
