export const RINA_HERO_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663126464465/eGbWZFt35deHWYWd9tynau/rina_character_illustrated-iWMXakysx7htEtAjsS3kNF.png";
export const RINA_AVATAR_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663126464465/eGbWZFt35deHWYWd9tynau/rina_character_illustrated-nnjGCWLnxSYCfRb29oDrrG.webp";

export const SCORE_CATEGORIES: Array<{ key: string; label: string; description: string }> = [
  { key: "crawlability", label: "Crawlability", description: "Can AI crawlers reach and read this site?" },
  { key: "structure", label: "Structure", description: "Are pages organized so AI can interpret them?" },
  { key: "schema", label: "Schema", description: "Is structured data present and accurate?" },
  { key: "citability", label: "Citability", description: "Is content quotable, structured, and answer-friendly?" },
  { key: "authority", label: "Authority", description: "Are external signals confirming who you are?" },
  { key: "freshness", label: "Freshness", description: "Is the site updated and signaling recency?" },
  { key: "clarity", label: "Clarity", description: "Is your offer obvious within seconds?" },
  { key: "conversion", label: "Conversion", description: "Are calls to action clear and reachable?" },
];

export const FIX_STATUS_ORDER = [
  "recommended",
  "drafted",
  "approved",
  "published",
  "verified",
] as const;

export type FixStatus = (typeof FIX_STATUS_ORDER)[number];

export const FIX_STATUS_LABEL: Record<FixStatus, string> = {
  recommended: "Recommended",
  drafted: "Drafted",
  approved: "Approved",
  published: "Published",
  verified: "Verified",
};

export const FIX_STATUS_TONE: Record<FixStatus, string> = {
  recommended: "bg-secondary text-secondary-foreground",
  drafted: "bg-amber-100 text-amber-900",
  approved: "bg-blue-100 text-blue-900",
  published: "bg-emerald-100 text-emerald-900",
  verified: "bg-primary text-primary-foreground",
};

export function gradeForScore(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}
