import { eq } from "drizzle-orm";
import { db } from "../../db";
import { leadSignalRecords } from "../../../drizzle/schema";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export type LeadSignal = InferSelectModel<typeof leadSignalRecords>;
export type Attribution = LeadSignal["attribution"];

export interface LeadSignalSummary {
  confirmedAi: number;
  likelyAi: number;
  visibilityInfluenced: number;
  unknown: number;
  total: number;
}

export async function recordLeadSignal(
  data: Omit<InferInsertModel<typeof leadSignalRecords>, "id" | "createdAt">
): Promise<LeadSignal> {
  const [result] = await db.insert(leadSignalRecords).values(data).$returningId();
  const [signal] = await db
    .select()
    .from(leadSignalRecords)
    .where(eq(leadSignalRecords.id, result.id))
    .limit(1);
  return signal;
}

export async function getLeadSignalSummary(businessId: number): Promise<LeadSignalSummary> {
  const signals = await db
    .select()
    .from(leadSignalRecords)
    .where(eq(leadSignalRecords.businessId, businessId));

  return {
    confirmedAi: signals.filter((s) => s.attribution === "confirmed_ai").length,
    likelyAi: signals.filter((s) => s.attribution === "likely_ai").length,
    visibilityInfluenced: signals.filter((s) => s.attribution === "visibility_influenced").length,
    unknown: signals.filter((s) => s.attribution === "unknown").length,
    total: signals.length,
  };
}

export async function listLeadSignals(businessId: number): Promise<LeadSignal[]> {
  return db
    .select()
    .from(leadSignalRecords)
    .where(eq(leadSignalRecords.businessId, businessId));
}
