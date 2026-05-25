import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { integrationConnections } from "../../../drizzle/schema";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export type Integration = InferSelectModel<typeof integrationConnections>;
export type Platform = Integration["platform"];
export type PermissionLevel = Integration["permissionLevel"];

export const PERMISSION_HIERARCHY: PermissionLevel[] = [
  "no_access",
  "read_only",
  "draft_only",
  "approval_required",
  "verify_only",
  "admin_restricted",
];

export function hasPermission(
  current: PermissionLevel,
  required: PermissionLevel
): boolean {
  const currentIdx = PERMISSION_HIERARCHY.indexOf(current);
  const requiredIdx = PERMISSION_HIERARCHY.indexOf(required);
  return currentIdx >= requiredIdx;
}

export async function getIntegration(
  businessId: number,
  platform: Platform
): Promise<Integration | null> {
  const [integration] = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.businessId, businessId),
        eq(integrationConnections.platform, platform)
      )
    )
    .limit(1);
  return integration ?? null;
}

export async function listIntegrations(businessId: number): Promise<Integration[]> {
  return db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.businessId, businessId));
}

export async function upsertIntegration(
  businessId: number,
  platform: Platform,
  data: Partial<Omit<InferInsertModel<typeof integrationConnections>, "id" | "businessId" | "platform" | "createdAt" | "updatedAt">>
): Promise<Integration> {
  const existing = await getIntegration(businessId, platform);

  if (existing) {
    await db
      .update(integrationConnections)
      .set({ ...data, lastSyncedAt: new Date() })
      .where(eq(integrationConnections.id, existing.id));
    const [updated] = await db
      .select()
      .from(integrationConnections)
      .where(eq(integrationConnections.id, existing.id))
      .limit(1);
    return updated;
  }

  const [result] = await db
    .insert(integrationConnections)
    .values({ businessId, platform, ...data })
    .$returningId();

  const [integration] = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.id, result.id))
    .limit(1);
  return integration;
}

export async function canPublish(businessId: number, platform: Platform): Promise<boolean> {
  const integration = await getIntegration(businessId, platform);
  if (!integration) return false;
  if (integration.connectionStatus !== "connected") return false;
  return hasPermission(integration.permissionLevel, "approval_required");
}

export async function canRead(businessId: number, platform: Platform): Promise<boolean> {
  const integration = await getIntegration(businessId, platform);
  if (!integration) return false;
  if (integration.connectionStatus !== "connected") return false;
  return hasPermission(integration.permissionLevel, "read_only");
}
