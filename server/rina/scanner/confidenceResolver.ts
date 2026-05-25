export type ConfidenceLevel =
  | "verified"
  | "confirmed_by_user"
  | "detected"
  | "inferred"
  | "likely"
  | "unknown";

export interface ConfidenceRules {
  // How was this finding sourced?
  source: "live_scan" | "integration_data" | "user_input" | "llm_inference" | "pattern_match";
  // Was the evidence directly observed in the HTML/data?
  directEvidence: boolean;
  // Was the finding confirmed by a second source?
  crossValidated: boolean;
  // Did the user explicitly confirm or deny this?
  userConfirmed?: boolean;
}

export function resolveConfidence(rules: ConfidenceRules): ConfidenceLevel {
  // User explicitly confirmed → highest confidence
  if (rules.userConfirmed === true) return "confirmed_by_user";

  // Live scan with direct evidence + cross-validated → verified
  if (rules.source === "live_scan" && rules.directEvidence && rules.crossValidated) {
    return "verified";
  }

  // Live scan with direct evidence → detected
  if (rules.source === "live_scan" && rules.directEvidence) {
    return "detected";
  }

  // Integration data (e.g., Search Console) with direct evidence → detected
  if (rules.source === "integration_data" && rules.directEvidence) {
    return "detected";
  }

  // Pattern match (regex, heuristic) → likely
  if (rules.source === "pattern_match" && rules.directEvidence) {
    return "likely";
  }

  // LLM inference from content → inferred
  if (rules.source === "llm_inference") {
    return "inferred";
  }

  // Cross-validated pattern match → likely
  if (rules.source === "pattern_match" && rules.crossValidated) {
    return "likely";
  }

  // User denied → still detected but noted
  if (rules.userConfirmed === false) return "detected";

  return "unknown";
}

// ─────────────────────────────────────────────
// Confidence label display helpers
// ─────────────────────────────────────────────
export const CONFIDENCE_LABELS: Record<ConfidenceLevel, { label: string; description: string; color: string }> = {
  verified: {
    label: "Verified",
    description: "Confirmed by live scan and cross-validated",
    color: "emerald",
  },
  confirmed_by_user: {
    label: "Confirmed",
    description: "You confirmed this directly",
    color: "blue",
  },
  detected: {
    label: "Detected",
    description: "Found in live scan data",
    color: "violet",
  },
  inferred: {
    label: "Inferred",
    description: "Interpreted from available signals",
    color: "amber",
  },
  likely: {
    label: "Likely",
    description: "Strong signal, not fully confirmed",
    color: "orange",
  },
  unknown: {
    label: "Unknown",
    description: "Insufficient data to determine",
    color: "slate",
  },
};
