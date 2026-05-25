import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { fixItems, userDecisionRecords } from "../../../drizzle/schema";
import type { InferSelectModel } from "drizzle-orm";

export type FixStatus = InferSelectModel<typeof fixItems>["status"];

// ─────────────────────────────────────────────
// State machine — valid transitions only
// ─────────────────────────────────────────────
const VALID_TRANSITIONS: Record<FixStatus, FixStatus[]> = {
  found:            ["recommended"],
  recommended:      ["drafted", "needs_input", "deferred", "rejected"],
  needs_input:      ["drafted", "deferred", "rejected"],
  drafted:          ["ready_for_review", "needs_input"],
  ready_for_review: ["approved", "rejected"],
  approved:         ["scheduled", "published"],
  scheduled:        ["published"],
  published:        ["verified", "failed"],
  failed:           ["drafted"],
  verified:         [],
  deferred:         ["recommended"],
  rejected:         [],
};

export function isValidTransition(from: FixStatus, to: FixStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─────────────────────────────────────────────
// transitionFixStatus — the core brain operation
// ─────────────────────────────────────────────
export async function transitionFixStatus(
  fixId: number,
  newStatus: FixStatus,
  userId: string,
  notes?: string
): Promise<InferSelectModel<typeof fixItems>> {
  // 1. Load current fix from DB
  const [fix] = await db.select().from(fixItems).where(eq(fixItems.id, fixId)).limit(1);
  if (!fix) throw new Error(`Fix item ${fixId} not found`);

  const currentStatus = fix.status as FixStatus;

  // 2. Validate transition is legal per state machine
  if (!isValidTransition(currentStatus, newStatus)) {
    throw new Error(
      `Invalid transition: ${currentStatus} → ${newStatus}. ` +
      `Allowed next states: ${VALID_TRANSITIONS[currentStatus].join(", ") || "none (terminal)"}`
    );
  }

  // 3. Write user_decision_record
  const decisionType = ((): InferSelectModel<typeof userDecisionRecords>["decisionType"] => {
    if (newStatus === "approved") return "approved";
    if (newStatus === "rejected") return "rejected";
    if (newStatus === "deferred") return "deferred";
    return "approved"; // covers scheduled, published, verified, drafted, etc.
  })();

  await db.insert(userDecisionRecords).values({
    businessId: fix.businessId,
    userId,
    decisionType,
    entityType: "fix_item",
    entityId: fixId,
    notes: notes ?? null,
  });

  // 4. Update fix_item status
  await db
    .update(fixItems)
    .set({
      status: newStatus,
      ...(newStatus === "rejected" && notes ? { rejectedReason: notes } : {}),
      ...(newStatus === "deferred" && notes ? { deferredReason: notes } : {}),
    })
    .where(eq(fixItems.id, fixId));

  // 5. Return updated fix
  const [updated] = await db.select().from(fixItems).where(eq(fixItems.id, fixId)).limit(1);
  return updated;
}

// ─────────────────────────────────────────────
// CRUD helpers
// ─────────────────────────────────────────────
export async function createFixItem(data: {
  businessId: number;
  findingId?: number;
  issue: string;
  recommendation: string;
  impactLevel?: "high" | "medium" | "low";
  difficulty?: "easy" | "medium" | "hard";
  targetPlatform?: string;
}): Promise<InferSelectModel<typeof fixItems>> {
  const [result] = await db
    .insert(fixItems)
    .values({
      businessId: data.businessId,
      findingId: data.findingId ?? null,
      issue: data.issue,
      recommendation: data.recommendation,
      impactLevel: data.impactLevel ?? "medium",
      difficulty: data.difficulty ?? "medium",
      status: "found",
      targetPlatform: data.targetPlatform ?? null,
    })
    .$returningId();

  const [fix] = await db.select().from(fixItems).where(eq(fixItems.id, result.id)).limit(1);
  return fix;
}

export async function getFixItem(fixId: number): Promise<InferSelectModel<typeof fixItems> | null> {
  const [fix] = await db.select().from(fixItems).where(eq(fixItems.id, fixId)).limit(1);
  return fix ?? null;
}

export async function listFixItemsForBusiness(
  businessId: number,
  statusFilter?: FixStatus[]
): Promise<InferSelectModel<typeof fixItems>[]> {
  const results = await db
    .select()
    .from(fixItems)
    .where(eq(fixItems.businessId, businessId));

  if (statusFilter && statusFilter.length > 0) {
    return results.filter((f) => statusFilter.includes(f.status as FixStatus));
  }
  return results;
}

export async function getDecisionHistory(
  entityId: number,
  entityType: "fix_item" | "generated_asset" | "recommendation" = "fix_item"
): Promise<InferSelectModel<typeof userDecisionRecords>[]> {
  return db
    .select()
    .from(userDecisionRecords)
    .where(
      and(
        eq(userDecisionRecords.entityId, entityId),
        eq(userDecisionRecords.entityType, entityType)
      )
    );
}

export { VALID_TRANSITIONS };
