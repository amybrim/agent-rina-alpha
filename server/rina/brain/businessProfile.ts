import { eq } from "drizzle-orm";
import { db } from "../../db";
import {
  audienceProfiles,
  businesses,
  offerProfiles,
} from "../../../drizzle/schema";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export type Business = InferSelectModel<typeof businesses>;
export type OfferProfile = InferSelectModel<typeof offerProfiles>;
export type AudienceProfile = InferSelectModel<typeof audienceProfiles>;

// ─────────────────────────────────────────────
// Business CRUD
// ─────────────────────────────────────────────
export async function getBusinessForUser(userId: string): Promise<Business | null> {
  const [biz] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.userId, userId))
    .limit(1);
  return biz ?? null;
}

export async function getBusinessById(businessId: number): Promise<Business | null> {
  const [biz] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  return biz ?? null;
}

export async function createBusiness(
  data: Omit<InferInsertModel<typeof businesses>, "id" | "createdAt" | "updatedAt">
): Promise<Business> {
  const [result] = await db.insert(businesses).values(data).$returningId();
  const [biz] = await db.select().from(businesses).where(eq(businesses.id, result.id)).limit(1);
  return biz;
}

export async function updateBusiness(
  businessId: number,
  data: Partial<Omit<InferInsertModel<typeof businesses>, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<Business> {
  await db.update(businesses).set(data).where(eq(businesses.id, businessId));
  const [biz] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  return biz;
}

export async function markOnboardingComplete(businessId: number): Promise<void> {
  await db
    .update(businesses)
    .set({ onboardingComplete: true })
    .where(eq(businesses.id, businessId));
}

// ─────────────────────────────────────────────
// Offer profiles
// ─────────────────────────────────────────────
export async function listOfferProfiles(businessId: number): Promise<OfferProfile[]> {
  return db.select().from(offerProfiles).where(eq(offerProfiles.businessId, businessId));
}

export async function upsertOfferProfile(
  businessId: number,
  data: Omit<InferInsertModel<typeof offerProfiles>, "id" | "businessId" | "createdAt" | "updatedAt">,
  existingId?: number
): Promise<OfferProfile> {
  if (existingId) {
    await db.update(offerProfiles).set(data).where(eq(offerProfiles.id, existingId));
    const [op] = await db.select().from(offerProfiles).where(eq(offerProfiles.id, existingId)).limit(1);
    return op;
  }
  const [result] = await db.insert(offerProfiles).values({ ...data, businessId }).$returningId();
  const [op] = await db.select().from(offerProfiles).where(eq(offerProfiles.id, result.id)).limit(1);
  return op;
}

// ─────────────────────────────────────────────
// Audience profiles
// ─────────────────────────────────────────────
export async function listAudienceProfiles(businessId: number): Promise<AudienceProfile[]> {
  return db.select().from(audienceProfiles).where(eq(audienceProfiles.businessId, businessId));
}

export async function upsertAudienceProfile(
  businessId: number,
  data: Omit<InferInsertModel<typeof audienceProfiles>, "id" | "businessId" | "createdAt" | "updatedAt">,
  existingId?: number
): Promise<AudienceProfile> {
  if (existingId) {
    await db.update(audienceProfiles).set(data).where(eq(audienceProfiles.id, existingId));
    const [ap] = await db.select().from(audienceProfiles).where(eq(audienceProfiles.id, existingId)).limit(1);
    return ap;
  }
  const [result] = await db.insert(audienceProfiles).values({ ...data, businessId }).$returningId();
  const [ap] = await db.select().from(audienceProfiles).where(eq(audienceProfiles.id, result.id)).limit(1);
  return ap;
}

// ─────────────────────────────────────────────
// Full profile (business + offers + audiences)
// ─────────────────────────────────────────────
export async function getFullProfile(businessId: number) {
  const [biz, offers, audiences] = await Promise.all([
    getBusinessById(businessId),
    listOfferProfiles(businessId),
    listAudienceProfiles(businessId),
  ]);
  return { business: biz, offers, audiences };
}
