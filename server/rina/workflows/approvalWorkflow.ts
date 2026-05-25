import { db } from "../../db";
import { fixItems, generatedAssets } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { transitionFixStatus } from "../brain/fixEngine";
import { canPublish } from "../brain/integrationBrain";
import type { InferSelectModel } from "drizzle-orm";

export type ApprovalDecision = "approve" | "reject" | "request_revision";

export interface ApprovalResult {
  fixId: number;
  decision: ApprovalDecision;
  newStatus: InferSelectModel<typeof fixItems>["status"];
  notes?: string;
}

export interface VerifyResult {
  fixId: number;
  verified: boolean;
  evidence: string;
  newStatus: InferSelectModel<typeof fixItems>["status"];
}

/**
 * User reviews a drafted asset and makes an approval decision.
 * - approve → transitions fix to "approved"
 * - reject → transitions fix to "rejected"
 * - request_revision → transitions fix to "needs_input"
 */
export async function processApprovalDecision(
  fixId: number,
  userId: string,
  decision: ApprovalDecision,
  notes?: string
): Promise<ApprovalResult> {
  const statusMap: Record<ApprovalDecision, InferSelectModel<typeof fixItems>["status"]> = {
    approve: "approved",
    reject: "rejected",
    request_revision: "needs_input",
  };

  const newStatus = statusMap[decision];
  await transitionFixStatus(fixId, newStatus, userId, notes);

  return { fixId, decision, newStatus, notes };
}

/**
 * Gate check before publishing: ensures the fix has an approved asset
 * and the integration has publish permission.
 */
export async function canPublishFix(
  fixId: number,
  businessId: number,
  platform: "wix" | "shopify" | "wordpress" | "linkedin" | "instagram"
): Promise<{ allowed: boolean; reason?: string }> {
  // Check fix status
  const [fix] = await db
    .select()
    .from(fixItems)
    .where(eq(fixItems.id, fixId))
    .limit(1);

  if (!fix) return { allowed: false, reason: "Fix item not found" };
  if (fix.status !== "approved" && fix.status !== "scheduled") {
    return { allowed: false, reason: `Fix must be approved before publishing (current: ${fix.status})` };
  }

  // Check integration permission
  const publishAllowed = await canPublish(businessId, platform);
  if (!publishAllowed) {
    return {
      allowed: false,
      reason: `${platform} integration does not have publish permission. Connect ${platform} with at least approval_required level.`,
    };
  }

  // Check there is an approved asset
  const [asset] = await db
    .select()
    .from(generatedAssets)
    .where(eq(generatedAssets.fixItemId, fixId))
    .limit(1);

  if (!asset) {
    return { allowed: false, reason: "No generated asset found for this fix. Draft an asset first." };
  }

  return { allowed: true };
}

/**
 * Mark a fix as published and transition to "published" state.
 */
export async function markPublished(
  fixId: number,
  userId: string,
  publishedUrl?: string
): Promise<InferSelectModel<typeof fixItems>> {
  await transitionFixStatus(fixId, "published", userId, publishedUrl ? `Published at ${publishedUrl}` : undefined);

  const [fix] = await db
    .select()
    .from(fixItems)
    .where(eq(fixItems.id, fixId))
    .limit(1);

  return fix;
}

/**
 * Verify that a published fix is actually live and working.
 * For now this is a manual verification step — the user confirms.
 * Phase 3+ will add automated URL probing.
 */
export async function verifyFix(
  fixId: number,
  userId: string,
  evidence: string
): Promise<VerifyResult> {
  await transitionFixStatus(fixId, "verified", userId, evidence);

  return {
    fixId,
    verified: true,
    evidence,
    newStatus: "verified",
  };
}

/**
 * Mark a published fix as failed (e.g., publishing error, page broke).
 * Allows retry via drafted state.
 */
export async function markFailed(
  fixId: number,
  userId: string,
  reason: string
): Promise<InferSelectModel<typeof fixItems>> {
  await transitionFixStatus(fixId, "failed", userId, reason);

  const [fix] = await db
    .select()
    .from(fixItems)
    .where(eq(fixItems.id, fixId))
    .limit(1);

  return fix;
}
