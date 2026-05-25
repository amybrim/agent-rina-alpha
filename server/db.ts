import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─────────────────────────────────────────────
// Singleton DB connection
// ─────────────────────────────────────────────
type DbType = MySql2Database<typeof schema> & { $client: mysql.Pool };

let _db: DbType | null = null;

export function getDb(): DbType {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const pool = mysql.createPool(url);
    _db = drizzle(pool, { schema, mode: "default" }) as DbType;
  }
  return _db;
}

// Named export for direct use in brain modules — lazy proxy so it initializes on first use
export const db: DbType = new Proxy({} as DbType, {
  get(_target, prop) {
    return getDb()[prop as keyof DbType];
  },
});

// ─────────────────────────────────────────────
// User type (re-exported for sdk.ts compatibility)
// ─────────────────────────────────────────────
export type { User } from "../drizzle/schema";

// ─────────────────────────────────────────────
// User helpers (required by sdk.ts)
// The users table uses `id` as auto-increment int; `openId` is the Manus openId
// ─────────────────────────────────────────────
export type UpsertUserInput = {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date | null;
};

export async function getUserByOpenId(openId: string): Promise<schema.User | null> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.openId, openId))
    .limit(1);
  return user ?? null;
}

export async function upsertUser(input: UpsertUserInput): Promise<void> {
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.openId, input.openId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (existing) {
    const updates: Partial<typeof schema.users.$inferInsert> = { updatedAt: new Date() };
    if (input.name !== undefined && input.name !== null) updates.name = input.name;
    if (input.email !== undefined) updates.email = input.email;
    if (input.loginMethod !== undefined) updates.loginMethod = input.loginMethod;
    if (input.lastSignedIn !== undefined && input.lastSignedIn !== null) updates.lastSignedIn = input.lastSignedIn;
    await db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.openId, input.openId));
  } else {
    await db.insert(schema.users).values({
      openId: input.openId,
      name: input.name ?? "User",
      email: input.email ?? null,
      loginMethod: input.loginMethod ?? null,
      lastSignedIn: input.lastSignedIn ?? new Date(),
    });
  }
}
