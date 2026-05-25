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
// The users table uses `id` as the primary key (varchar, set to openId value)
// ─────────────────────────────────────────────
type UserRow = typeof schema.users.$inferSelect;

export type UpsertUserInput = {
  openId: string; // maps to users.id
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date | null; // ignored — not in schema, kept for sdk.ts compatibility
};

export async function getUserByOpenId(openId: string): Promise<(UserRow & { openId: string }) | null> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, openId))
    .limit(1);
  if (!user) return null;
  // Attach openId as virtual field (id IS the openId)
  return { ...user, openId: user.id };
}

export async function upsertUser(input: UpsertUserInput): Promise<void> {
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, input.openId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (existing) {
    const updates: Partial<typeof schema.users.$inferInsert> = { updatedAt: new Date() };
    if (input.name !== undefined && input.name !== null) updates.name = input.name;
    if (input.email !== undefined) updates.email = input.email;
    // lastSignedIn not in schema — ignored
    await db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, input.openId));
  } else {
    await db.insert(schema.users).values({
      id: input.openId,
      name: input.name ?? "User",
      email: input.email ?? null,
    });
  }
}
