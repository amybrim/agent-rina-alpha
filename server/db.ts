import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  briefings,
  businesses,
  fixes,
  fixHistory,
  InsertBriefing,
  InsertBusiness,
  InsertFix,
  InsertFixHistory,
  InsertScan,
  InsertScore,
  InsertUser,
  scans,
  scores,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── Businesses ────────────────────────────────────────────────────────────

export async function listBusinessesByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(businesses).where(eq(businesses.ownerId, ownerId)).orderBy(desc(businesses.createdAt));
}

export async function getBusinessById(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(businesses)
    .where(and(eq(businesses.id, id), eq(businesses.ownerId, ownerId)))
    .limit(1);
  return rows[0];
}

export async function createBusiness(input: InsertBusiness) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(businesses).values(input);
  // mysql2 returns insertId
  // @ts-expect-error drizzle returns header at index 0 for mysql
  const insertId = result[0]?.insertId ?? result?.insertId;
  return insertId as number;
}

export async function updateBusiness(id: number, ownerId: number, patch: Partial<InsertBusiness>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(businesses)
    .set(patch)
    .where(and(eq(businesses.id, id), eq(businesses.ownerId, ownerId)));
}

// ── Scans ────────────────────────────────────────────────────────────────

export async function createScan(input: InsertScan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scans).values(input);
  // @ts-expect-error
  const insertId = result[0]?.insertId ?? result?.insertId;
  return insertId as number;
}

export async function updateScan(id: number, patch: Partial<InsertScan>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scans).set(patch).where(eq(scans.id, id));
}

export async function listScansByBusiness(businessId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(scans)
    .where(eq(scans.businessId, businessId))
    .orderBy(desc(scans.startedAt))
    .limit(limit);
}

export async function getLatestScan(businessId: number) {
  const rows = await listScansByBusiness(businessId, 1);
  return rows[0] ?? null;
}

// ── Scores ───────────────────────────────────────────────────────────────

export async function createScore(input: InsertScore) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scores).values(input);
  // @ts-expect-error
  const insertId = result[0]?.insertId ?? result?.insertId;
  return insertId as number;
}

export async function listScoresByBusiness(businessId: number, limit = 12) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(scores)
    .where(eq(scores.businessId, businessId))
    .orderBy(desc(scores.createdAt))
    .limit(limit);
}

export async function getLatestScore(businessId: number) {
  const rows = await listScoresByBusiness(businessId, 1);
  return rows[0] ?? null;
}

// ── Fixes ────────────────────────────────────────────────────────────────

export async function createFix(input: InsertFix) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(fixes).values(input);
  // @ts-expect-error
  const insertId = result[0]?.insertId ?? result?.insertId;
  return insertId as number;
}

export async function listFixesByBusiness(businessId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(fixes)
    .where(eq(fixes.businessId, businessId))
    .orderBy(fixes.priority, desc(fixes.impactPoints));
}

export async function getFixById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(fixes).where(eq(fixes.id, id)).limit(1);
  return rows[0];
}

export async function updateFix(id: number, patch: Partial<InsertFix>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(fixes).set(patch).where(eq(fixes.id, id));
}

export async function appendFixHistory(input: InsertFixHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(fixHistory).values(input);
}

export async function listFixHistory(fixId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(fixHistory)
    .where(eq(fixHistory.fixId, fixId))
    .orderBy(desc(fixHistory.createdAt));
}

// ── Briefings ────────────────────────────────────────────────────────────

export async function createBriefing(input: InsertBriefing) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(briefings).values(input);
  // @ts-expect-error
  const insertId = result[0]?.insertId ?? result?.insertId;
  return insertId as number;
}

export async function listBriefingsByBusiness(businessId: number, limit = 8) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(briefings)
    .where(eq(briefings.businessId, businessId))
    .orderBy(desc(briefings.weekOf))
    .limit(limit);
}

export async function getLatestBriefing(businessId: number) {
  const rows = await listBriefingsByBusiness(businessId, 1);
  return rows[0] ?? null;
}
