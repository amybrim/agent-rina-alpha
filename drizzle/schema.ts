import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─────────────────────────────────────────────
// 1. users (extended from template)
// ─────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: varchar("id", { length: 128 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  avatarUrl: text("avatar_url"),
  role: mysqlEnum("role", ["admin", "user"]).notNull().default("user"),
  subscriptionTier: mysqlEnum("subscription_tier", ["starter", "growth", "pro", "agency"]).default("starter"),
  subscriptionStatus: varchar("subscription_status", { length: 64 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 128 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 128 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ─────────────────────────────────────────────
// User type alias (id field IS the openId)
// ─────────────────────────────────────────────
// User type — id IS the openId, virtual openId field added for sdk.ts compatibility
export type User = Omit<typeof users.$inferSelect, 'id'> & {
  id: string;
  openId: string;
  loginMethod?: string | null;
  lastSignedIn?: Date | null;
};

// ─────────────────────────────────────────────
// 2. businesses
// ─────────────────────────────────────────────
export const businesses = mysqlTable("businesses", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  url: varchar("url", { length: 512 }).notNull(),
  industry: varchar("industry", { length: 128 }),
  businessType: varchar("business_type", { length: 128 }),
  audience: text("audience"),
  offers: json("offers").$type<Array<{ name: string; description?: string }>>(),
  location: json("location").$type<{ city?: string; state?: string; country?: string; serviceArea?: string }>(),
  differentiators: json("differentiators").$type<string[]>(),
  proof: json("proof").$type<{ reviews?: string; awards?: string; credentials?: string; caseStudies?: string; yearsInBusiness?: number }>(),
  brandVoice: varchar("brand_voice", { length: 128 }),
  goals: text("goals"),
  competitors: json("competitors").$type<string[]>(),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ─────────────────────────────────────────────
// 3. offer_profiles
// ─────────────────────────────────────────────
export const offerProfiles = mysqlTable("offer_profiles", {
  id: int("id").primaryKey().autoincrement(),
  businessId: int("business_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  audience: text("audience"),
  problemSolved: text("problem_solved"),
  proof: json("proof").$type<{ testimonials?: string[]; caseStudies?: string[] }>(),
  locationRelevance: text("location_relevance"),
  revenuePriority: int("revenue_priority").default(0),
  relatedPageUrls: json("related_page_urls").$type<string[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ─────────────────────────────────────────────
// 4. audience_profiles
// ─────────────────────────────────────────────
export const audienceProfiles = mysqlTable("audience_profiles", {
  id: int("id").primaryKey().autoincrement(),
  businessId: int("business_id").notNull(),
  audienceType: varchar("audience_type", { length: 128 }).notNull(),
  needs: json("needs").$type<string[]>(),
  buyingQuestions: json("buying_questions").$type<string[]>(),
  objections: json("objections").$type<string[]>(),
  searchIntent: text("search_intent"),
  recommendationScenarios: json("recommendation_scenarios").$type<string[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ─────────────────────────────────────────────
// 5. website_page_records
// ─────────────────────────────────────────────
export const websitePageRecords = mysqlTable("website_page_records", {
  id: int("id").primaryKey().autoincrement(),
  businessId: int("business_id").notNull(),
  url: varchar("url", { length: 512 }).notNull(),
  pageType: varchar("page_type", { length: 64 }),
  title: text("title"),
  metaDescription: text("meta_description"),
  headings: json("headings").$type<{ h1?: string[]; h2?: string[]; h3?: string[] }>(),
  schemaPresent: json("schema_present").$type<{ types: string[]; valid: boolean; raw?: string }>(),
  contentSummary: text("content_summary"),
  clarityScore: mysqlEnum("clarity_score", ["CLEAR", "PARTIAL", "NOT_YET_VISIBLE"]),
  proofScore: mysqlEnum("proof_score", ["CLEAR", "PARTIAL", "NOT_YET_VISIBLE"]),
  crawlable: boolean("crawlable").default(true),
  lastScannedAt: timestamp("last_scanned_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ─────────────────────────────────────────────
// 6. visibility_findings
// ─────────────────────────────────────────────
export const visibilityFindings = mysqlTable("visibility_findings", {
  id: int("id").primaryKey().autoincrement(),
  businessId: int("business_id").notNull(),
  pageRecordId: int("page_record_id"),
  findingType: varchar("finding_type", { length: 128 }).notNull(),
  source: varchar("source", { length: 128 }).notNull(),
  severity: mysqlEnum("severity", ["critical", "high", "medium", "low"]).notNull(),
  businessMeaning: text("business_meaning").notNull(),
  evidence: text("evidence"),
  confidence: mysqlEnum("confidence", [
    "verified",
    "confirmed_by_user",
    "detected",
    "inferred",
    "likely",
    "unknown",
  ]).notNull().default("detected"),
  dateFound: timestamp("date_found").notNull().defaultNow(),
  status: mysqlEnum("status", ["open", "addressed", "deferred", "rejected"]).notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ─────────────────────────────────────────────
// 7. fix_items — THE MOST IMPORTANT TABLE
// ─────────────────────────────────────────────
export const fixItems = mysqlTable("fix_items", {
  id: int("id").primaryKey().autoincrement(),
  businessId: int("business_id").notNull(),
  findingId: int("finding_id"),
  issue: text("issue").notNull(),
  recommendation: text("recommendation").notNull(),
  impactLevel: mysqlEnum("impact_level", ["high", "medium", "low"]).notNull().default("medium"),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull().default("medium"),
  status: mysqlEnum("status", [
    "found",
    "recommended",
    "drafted",
    "needs_input",
    "ready_for_review",
    "approved",
    "scheduled",
    "published",
    "verified",
    "deferred",
    "rejected",
    "failed",
  ]).notNull().default("found"),
  owner: varchar("owner", { length: 128 }),
  targetPlatform: varchar("target_platform", { length: 128 }),
  dueDate: timestamp("due_date"),
  verificationMethod: text("verification_method"),
  verificationResult: text("verification_result"),
  rejectedReason: text("rejected_reason"),
  deferredReason: text("deferred_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ─────────────────────────────────────────────
// 8. generated_assets — VERSIONED, NOT OVERWRITTEN
// ─────────────────────────────────────────────
export const generatedAssets = mysqlTable("generated_assets", {
  id: int("id").primaryKey().autoincrement(),
  businessId: int("business_id").notNull(),
  fixItemId: int("fix_item_id"),
  assetType: mysqlEnum("asset_type", [
    "faq",
    "metadata",
    "schema",
    "homepage_copy",
    "service_page",
    "blog_post",
    "social_post",
    "gbp_description",
    "email",
  ]).notNull(),
  version: int("version").notNull().default(1),
  content: text("content").notNull(),
  targetUrl: varchar("target_url", { length: 512 }),
  targetPlatform: varchar("target_platform", { length: 128 }),
  status: mysqlEnum("status", ["draft", "approved", "published", "verified", "rejected"]).notNull().default("draft"),
  approverUserId: varchar("approver_user_id", { length: 128 }),
  approvedAt: timestamp("approved_at"),
  publishedAt: timestamp("published_at"),
  verifiedAt: timestamp("verified_at"),
  sourceFindingId: int("source_finding_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ─────────────────────────────────────────────
// 9. integration_connections
// ─────────────────────────────────────────────
export const integrationConnections = mysqlTable("integration_connections", {
  id: int("id").primaryKey().autoincrement(),
  businessId: int("business_id").notNull(),
  platform: mysqlEnum("platform", [
    "wix",
    "shopify",
    "wordpress",
    "ga4",
    "search_console",
    "gbp",
    "linkedin",
    "instagram",
    "gmail",
    "crm",
  ]).notNull(),
  accountIdentifier: varchar("account_identifier", { length: 255 }),
  permissionLevel: mysqlEnum("permission_level", [
    "no_access",
    "read_only",
    "draft_only",
    "approval_required",
    "verify_only",
    "admin_restricted",
  ]).notNull().default("no_access"),
  lastSyncedAt: timestamp("last_synced_at"),
  connectionStatus: mysqlEnum("connection_status", ["connected", "disconnected", "error"]).notNull().default("disconnected"),
  errorMessage: text("error_message"),
  capabilities: json("capabilities").$type<Record<string, boolean>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ─────────────────────────────────────────────
// 10. visibility_briefings
// ─────────────────────────────────────────────
export const visibilityBriefings = mysqlTable("visibility_briefings", {
  id: int("id").primaryKey().autoincrement(),
  businessId: int("business_id").notNull(),
  weekStartDate: timestamp("week_start_date").notNull(),
  weekEndDate: timestamp("week_end_date").notNull(),
  showingUpGrade: mysqlEnum("showing_up_grade", ["clear", "partial", "not_yet_visible"]),
  beingUnderstoodGrade: mysqlEnum("being_understood_grade", ["clear", "partial", "not_yet_visible"]),
  trustGrade: mysqlEnum("trust_grade", ["clear", "partial", "not_yet_visible"]),
  recommendationReadyGrade: mysqlEnum("recommendation_ready_grade", ["clear", "partial", "not_yet_visible"]),
  geoReadinessGrade: mysqlEnum("geo_readiness_grade", ["clear", "partial", "not_yet_visible"]),
  rinaRead: text("rina_read"),
  fixesCompleted: int("fixes_completed").default(0),
  fixesInProgress: int("fixes_in_progress").default(0),
  topActions: json("top_actions").$type<Array<{ fixId: number; action: string; why: string }>>(),
  leadSignalSummary: json("lead_signal_summary").$type<{
    confirmedAi: number;
    likelyVisibility: number;
    unknown: number;
    total: number;
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 11. lead_signal_records
// ─────────────────────────────────────────────
export const leadSignalRecords = mysqlTable("lead_signal_records", {
  id: int("id").primaryKey().autoincrement(),
  businessId: int("business_id").notNull(),
  attribution: mysqlEnum("attribution", [
    "confirmed_ai",
    "likely_ai",
    "visibility_influenced",
    "unknown",
  ]).notNull().default("unknown"),
  source: varchar("source", { length: 255 }),
  landingPageUrl: varchar("landing_page_url", { length: 512 }),
  formResponse: json("form_response").$type<Record<string, string>>(),
  crmRecordId: varchar("crm_record_id", { length: 128 }),
  confidence: mysqlEnum("confidence", ["verified", "likely", "unknown"]).notNull().default("unknown"),
  revenueAmount: decimal("revenue_amount", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 12. prompt_test_results
// ─────────────────────────────────────────────
export const promptTestResults = mysqlTable("prompt_test_results", {
  id: int("id").primaryKey().autoincrement(),
  businessId: int("business_id").notNull(),
  promptText: text("prompt_text").notNull(),
  platform: mysqlEnum("platform", ["chatgpt", "perplexity", "gemini", "claude", "copilot"]).notNull(),
  businessMentioned: boolean("business_mentioned").notNull().default(false),
  positionInResponse: int("position_in_response"),
  competitorsMentioned: json("competitors_mentioned").$type<string[]>(),
  summaryAccuracy: mysqlEnum("summary_accuracy", ["accurate", "partial", "inaccurate", "not_mentioned"]),
  sourceCitations: json("source_citations").$type<string[]>(),
  rawResponse: text("raw_response"),
  testedAt: timestamp("tested_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 13. user_decision_records
// ─────────────────────────────────────────────
export const userDecisionRecords = mysqlTable("user_decision_records", {
  id: int("id").primaryKey().autoincrement(),
  businessId: int("business_id").notNull(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  decisionType: mysqlEnum("decision_type", [
    "approved",
    "rejected",
    "deferred",
    "edited",
    "overridden",
  ]).notNull(),
  entityType: mysqlEnum("entity_type", ["fix_item", "generated_asset", "recommendation"]).notNull(),
  entityId: int("entity_id").notNull(),
  notes: text("notes"),
  futurePreference: json("future_preference").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
