import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table — extended with Rina subscription tier.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** Rina subscription tier — labels are NON-NEGOTIABLE. */
  subscriptionTier: mysqlEnum("subscriptionTier", [
    "starter",
    "growth",
    "pro",
    "agency",
  ])
    .default("starter")
    .notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  subscriptionStatus: varchar("subscriptionStatus", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Living Business Profile — the foundation Rina uses for every decision.
 * Onboarding MUST be completed before scanning or scoring runs.
 */
export const businesses = mysqlTable("businesses", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  websiteUrl: varchar("websiteUrl", { length: 512 }).notNull(),
  businessType: varchar("businessType", { length: 128 }),
  location: varchar("location", { length: 256 }),
  description: text("description"),
  goals: text("goals"),
  /** Computed status. "draft" = onboarding incomplete. "active" = ready for scan. */
  profileStatus: mysqlEnum("profileStatus", ["draft", "active"])
    .default("draft")
    .notNull(),
  /** Heartbeat task uid for the weekly briefing schedule (nullable). */
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = typeof businesses.$inferInsert;

/**
 * Evidence Store — every scan saved with full payload + timestamp.
 * Used to compare current state against last week.
 */
export const scans = mysqlTable("scans", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  status: mysqlEnum("status", ["queued", "running", "complete", "failed"])
    .default("queued")
    .notNull(),
  /** Raw scanner findings — JSON blob with H1, meta, schema types, sitemap, robots.txt, internal links, etc. */
  findings: json("findings"),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Scan = typeof scans.$inferSelect;
export type InsertScan = typeof scans.$inferInsert;

/**
 * GEO/Auriti-Style Scoring — 8 categories, full history per scan.
 * Categories (each scored 0-100):
 *  1. crawlability       — robots.txt, sitemap, AI-bot access
 *  2. structure          — semantic HTML, headings, page hierarchy
 *  3. schema             — Organization, Service, FAQ, LocalBusiness markup
 *  4. citability         — quotable, factual, well-attributed content
 *  5. authority          — sameAs links, external presence, credentials
 *  6. freshness          — recent updates, dated content
 *  7. clarity            — plain language, no jargon, audience match
 *  8. conversion         — clear CTAs, contact info, next-step paths
 */
export const scores = mysqlTable("scores", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  scanId: int("scanId").notNull(),
  crawlability: int("crawlability").notNull(),
  structure: int("structure").notNull(),
  schemaScore: int("schemaScore").notNull(),
  citability: int("citability").notNull(),
  authority: int("authority").notNull(),
  freshness: int("freshness").notNull(),
  clarity: int("clarity").notNull(),
  conversion: int("conversion").notNull(),
  overall: int("overall").notNull(),
  /** Letter grade derived from overall: A+, A, B, C, D, F */
  grade: varchar("grade", { length: 4 }).notNull(),
  /** Human narrative from Rina explaining the score. */
  narrative: text("narrative"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Score = typeof scores.$inferSelect;
export type InsertScore = typeof scores.$inferInsert;

/**
 * Fix Queue — STRICT 5-status workflow (NON-NEGOTIABLE order):
 *   recommended → drafted → approved → published → verified
 */
export const fixes = mysqlTable("fixes", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  /** Which scoring pillar this fix improves. */
  category: mysqlEnum("category", [
    "crawlability",
    "structure",
    "schema",
    "citability",
    "authority",
    "freshness",
    "clarity",
    "conversion",
  ]).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  rationale: text("rationale").notNull(),
  /** What kind of asset Rina drafts: meta, faq_schema, org_schema, gbp, page_copy, handoff_note, etc. */
  assetType: varchar("assetType", { length: 64 }).notNull(),
  /** The drafted content (filled when status >= drafted). */
  draftContent: text("draftContent"),
  /** Live-site reference where fix should be applied. */
  targetLocation: varchar("targetLocation", { length: 512 }),
  /** Priority: 1 = highest. */
  priority: int("priority").default(3).notNull(),
  /** Estimated visibility points gained when verified. */
  impactPoints: int("impactPoints").default(0).notNull(),
  status: mysqlEnum("status", [
    "recommended",
    "drafted",
    "approved",
    "published",
    "verified",
  ])
    .default("recommended")
    .notNull(),
  /** Owner notes attached during approval. */
  ownerNotes: text("ownerNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Fix = typeof fixes.$inferSelect;
export type InsertFix = typeof fixes.$inferInsert;

/**
 * Audit trail of every fix transition. Append-only history.
 */
export const fixHistory = mysqlTable("fixHistory", {
  id: int("id").autoincrement().primaryKey(),
  fixId: int("fixId").notNull(),
  fromStatus: varchar("fromStatus", { length: 32 }),
  toStatus: varchar("toStatus", { length: 32 }).notNull(),
  actorUserId: int("actorUserId"),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FixHistory = typeof fixHistory.$inferSelect;
export type InsertFixHistory = typeof fixHistory.$inferInsert;

/**
 * Weekly Visibility Briefing — answers the FIVE structural questions explicitly:
 *   1. Are we showing up?
 *   2. Are we understood?
 *   3. Are we recommendable?
 *   4. What changed?
 *   5. What's next?
 */
export const briefings = mysqlTable("briefings", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  weekOf: timestamp("weekOf").notNull(),
  showingUp: text("showingUp").notNull(),
  understood: text("understood").notNull(),
  recommendable: text("recommendable").notNull(),
  whatChanged: text("whatChanged").notNull(),
  whatsNext: text("whatsNext").notNull(),
  /** Optional snapshot of overall score at the time. */
  overallScore: int("overallScore"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Briefing = typeof briefings.$inferSelect;
export type InsertBriefing = typeof briefings.$inferInsert;
