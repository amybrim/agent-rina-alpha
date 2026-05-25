// ─────────────────────────────────────────────
// Rina client-side constants and helpers
// ─────────────────────────────────────────────

// Rina character images — served from Manus storage
export const RINA_HERO_IMAGE = "/manus-storage/rina_character_illustrated_3823b86e.png";
export const RINA_AVATAR_IMAGE = "/manus-storage/rina_character_avatar_b1dfb753.png";

// ─────────────────────────────────────────────
// Fix status display helpers
// ─────────────────────────────────────────────
export type FixStatus =
  | "found"
  | "recommended"
  | "drafted"
  | "needs_input"
  | "ready_for_review"
  | "approved"
  | "scheduled"
  | "published"
  | "verified"
  | "deferred"
  | "rejected"
  | "failed";

export const FIX_STATUS_LABEL: Record<FixStatus, string> = {
  found: "Found",
  recommended: "Recommended",
  drafted: "Draft Ready",
  needs_input: "Needs Your Input",
  ready_for_review: "Ready for Review",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  verified: "Verified",
  deferred: "Deferred",
  rejected: "Rejected",
  failed: "Failed",
};

export const FIX_STATUS_TONE: Record<FixStatus, "default" | "secondary" | "destructive" | "outline"> = {
  found: "outline",
  recommended: "secondary",
  drafted: "secondary",
  needs_input: "destructive",
  ready_for_review: "default",
  approved: "default",
  scheduled: "default",
  published: "default",
  verified: "default",
  deferred: "outline",
  rejected: "destructive",
  failed: "destructive",
};

export const FIX_STATUS_ORDER: FixStatus[] = [
  "needs_input",
  "recommended",
  "drafted",
  "ready_for_review",
  "approved",
  "scheduled",
  "published",
  "verified",
  "found",
  "deferred",
  "rejected",
  "failed",
];

// ─────────────────────────────────────────────
// Scorecard helpers
// ─────────────────────────────────────────────
export interface ScoreCategory {
  key: string;
  label: string;
  description: string;
  question: string;
}

export const SCORE_CATEGORIES: ScoreCategory[] = [
  {
    key: "showing_up",
    label: "Showing Up",
    description: "Are you appearing in AI-generated answers?",
    question: "Are we showing up?",
  },
  {
    key: "being_understood",
    label: "Being Understood",
    description: "When AI mentions you, is the description accurate?",
    question: "Are we being understood?",
  },
  {
    key: "trusted",
    label: "Trusted",
    description: "Does AI present you as credible and authoritative?",
    question: "Are we trusted?",
  },
  {
    key: "recommendation_ready",
    label: "Recommendation Ready",
    description: "Would AI recommend you when someone asks for a provider?",
    question: "Are we recommendation-ready?",
  },
  {
    key: "fix_priority",
    label: "Fix Priority",
    description: "What should be fixed first to improve visibility?",
    question: "What should we fix next?",
  },
];

export type ConfidenceLabel = "confirmed" | "inferred" | "estimated" | "unknown";

export const CONFIDENCE_COLOR: Record<ConfidenceLabel, string> = {
  confirmed: "text-emerald-600",
  inferred: "text-violet-600",
  estimated: "text-amber-600",
  unknown: "text-slate-400",
};

export const CONFIDENCE_LABEL: Record<ConfidenceLabel, string> = {
  confirmed: "Confirmed",
  inferred: "Inferred",
  estimated: "Estimated",
  unknown: "Unknown",
};

export type GradeLevel = "A" | "B" | "C" | "D" | "F" | "—";

export function gradeForScore(score: number | null | undefined): GradeLevel {
  if (score === null || score === undefined) return "—";
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

export function gradeColor(grade: GradeLevel): string {
  switch (grade) {
    case "A": return "text-emerald-600";
    case "B": return "text-teal-600";
    case "C": return "text-amber-600";
    case "D": return "text-orange-600";
    case "F": return "text-rose-600";
    default: return "text-slate-400";
  }
}
