import { eq } from "drizzle-orm";
import { db } from "../../db";
import { websitePageRecords } from "../../../drizzle/schema";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export type PageRecord = InferSelectModel<typeof websitePageRecords>;

export async function upsertPageRecord(
  businessId: number,
  url: string,
  data: Partial<Omit<InferInsertModel<typeof websitePageRecords>, "id" | "businessId" | "url" | "createdAt" | "updatedAt">>
): Promise<PageRecord> {
  const existing = await db
    .select()
    .from(websitePageRecords)
    .where(eq(websitePageRecords.businessId, businessId))
    .then((rows) => rows.find((r) => r.url === url));

  if (existing) {
    await db
      .update(websitePageRecords)
      .set({ ...data, lastScannedAt: new Date() })
      .where(eq(websitePageRecords.id, existing.id));
    const [updated] = await db
      .select()
      .from(websitePageRecords)
      .where(eq(websitePageRecords.id, existing.id))
      .limit(1);
    return updated;
  }

  const [result] = await db
    .insert(websitePageRecords)
    .values({ businessId, url, ...data, lastScannedAt: new Date() })
    .$returningId();

  const [page] = await db
    .select()
    .from(websitePageRecords)
    .where(eq(websitePageRecords.id, result.id))
    .limit(1);
  return page;
}

export async function listPageRecords(businessId: number): Promise<PageRecord[]> {
  return db
    .select()
    .from(websitePageRecords)
    .where(eq(websitePageRecords.businessId, businessId));
}

export async function getPageRecord(pageId: number): Promise<PageRecord | null> {
  const [page] = await db
    .select()
    .from(websitePageRecords)
    .where(eq(websitePageRecords.id, pageId))
    .limit(1);
  return page ?? null;
}
