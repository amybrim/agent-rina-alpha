import { desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { fixItems, visibilityBriefings, visibilityFindings } from "../../../drizzle/schema";

export type Grade = "clear" | "partial" | "not_yet_visible";
export type HealthGrade = "STRONG" | "IMPROVING" | "AT_RISK" | "NEEDS_WORK";

/** GEO readiness category breakdown for the Command Center panel */
export interface GeoCategory {
  label: string;
  findingType: string;
  grade: Grade;
}

const GEO_CATEGORY_MAP: Array<{ label: string; findingType: string }> = [
  { label: "Clear Offers", findingType: "offer_clarity_gap" },
  { label: "Structured Data", findingType: "structured_data_gap" },
  { label: "Proof Signals", findingType: "proof_trust_gap" },
  { label: "Answer Readiness", findingType: "answer_readiness_gap" },
  { label: "Entity Clarity", findingType: "entity_clarity_gap" },
  { label: "Source Corroboration", findingType: "source_corroboration_gap" },
];

export interface VisibilitySnapshot {
  businessId: number;
  healthGrade: HealthGrade;
  showingUp: Grade;
  beingUnderstood: Grade;
  trust: Grade;
  recommendationReady: Grade;
  geoReadiness: Grade;
  geoCategories: GeoCategory[];
  openFindings: number;
  criticalFindings: number;
  activeFixCount: number;
  completedFixCount: number;
  rinaRead: string | null;
  weekStartDate: Date | null;
  confidence: "verified" | "detected" | "inferred";
}

function computeHealthGrade(grades: Grade[]): HealthGrade {
  const clearCount = grades.filter((g) => g === "clear").length;
  const notVisibleCount = grades.filter((g) => g === "not_yet_visible").length;

  if (clearCount >= 4) return "STRONG";
  if (clearCount >= 2 && notVisibleCount === 0) return "IMPROVING";
  if (notVisibleCount >= 3) return "NEEDS_WORK";
  return "AT_RISK";
}

export async function getVisibilitySnapshot(businessId: number): Promise<VisibilitySnapshot> {
  // Get latest briefing
  const [latestBriefing] = await db
    .select()
    .from(visibilityBriefings)
    .where(eq(visibilityBriefings.businessId, businessId))
    .orderBy(desc(visibilityBriefings.createdAt))
    .limit(1);

  // Get open findings counts
  const findings = await db
    .select()
    .from(visibilityFindings)
    .where(eq(visibilityFindings.businessId, businessId));

  const openFindings = findings.filter((f) => f.status === "open");
  const criticalFindings = openFindings.filter((f) => f.severity === "critical" || f.severity === "high");

  // Get fix counts
  const fixes = await db
    .select()
    .from(fixItems)
    .where(eq(fixItems.businessId, businessId));

  const activeFixCount = fixes.filter((f) =>
    ["recommended", "drafted", "needs_input", "ready_for_review", "approved", "scheduled"].includes(f.status)
  ).length;
  const completedFixCount = fixes.filter((f) => f.status === "verified").length;

  // Build grades from latest briefing or infer from findings
  let showingUp: Grade = "not_yet_visible";
  let beingUnderstood: Grade = "not_yet_visible";
  let trust: Grade = "not_yet_visible";
  let recommendationReady: Grade = "not_yet_visible";
  let geoReadiness: Grade = "not_yet_visible";
  let rinaRead: string | null = null;
  let weekStartDate: Date | null = null;
  let confidence: VisibilitySnapshot["confidence"] = "inferred";

  if (latestBriefing) {
    showingUp = (latestBriefing.showingUpGrade as Grade) ?? "not_yet_visible";
    beingUnderstood = (latestBriefing.beingUnderstoodGrade as Grade) ?? "not_yet_visible";
    trust = (latestBriefing.trustGrade as Grade) ?? "not_yet_visible";
    recommendationReady = (latestBriefing.recommendationReadyGrade as Grade) ?? "not_yet_visible";
    geoReadiness = (latestBriefing.geoReadinessGrade as Grade) ?? "not_yet_visible";
    rinaRead = latestBriefing.rinaRead ?? null;
    weekStartDate = latestBriefing.weekStartDate;
    confidence = "detected";
  } else if (openFindings.length > 0) {
    // Infer from findings when no briefing exists
    const criticalCount = criticalFindings.length;
    showingUp = criticalCount === 0 ? "partial" : "not_yet_visible";
    confidence = "inferred";
  }

  // Build GEO category breakdown from findings
  const geoCategories: GeoCategory[] = GEO_CATEGORY_MAP.map(({ label, findingType }) => {
    const categoryFindings = openFindings.filter((f) => f.findingType === findingType);
    let grade: Grade;
    if (categoryFindings.length === 0) {
      grade = "clear";
    } else if (categoryFindings.some((f) => f.severity === "critical" || f.severity === "high")) {
      grade = "not_yet_visible";
    } else {
      grade = "partial";
    }
    return { label, findingType, grade };
  });

  const grades: Grade[] = [showingUp, beingUnderstood, trust, recommendationReady, geoReadiness];
  const healthGrade = computeHealthGrade(grades);

  return {
    businessId,
    healthGrade,
    showingUp,
    beingUnderstood,
    trust,
    recommendationReady,
    geoReadiness,
    geoCategories,
    openFindings: openFindings.length,
    criticalFindings: criticalFindings.length,
    activeFixCount,
    completedFixCount,
    rinaRead,
    weekStartDate,
    confidence,
  };
}
