import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

// Brain modules
import {
  createBusiness,
  getBusinessForUser,
  getFullProfile,
  markOnboardingComplete,
  updateBusiness,
  upsertAudienceProfile,
  upsertOfferProfile,
} from "./rina/brain/businessProfile";
import {
  createFixItem,
  getDecisionHistory,
  getFixItem,
  listFixItemsForBusiness,
  transitionFixStatus,
} from "./rina/brain/fixEngine";
import {
  draftAssetForFix,
  getAssetVersionHistory,
  getLatestAssetForFix,
  updateAssetContent,
} from "./rina/brain/assetDrafting";
import {
  generateWeeklyBriefing,
  getBriefingHistory,
  getLatestBriefing,
} from "./rina/brain/weeklyBriefing";
import { getVisibilitySnapshot } from "./rina/brain/visibilitySnapshot";
import { getLeadSignalSummary, listLeadSignals, recordLeadSignal } from "./rina/brain/leadSignals";
import {
  canPublish,
  listIntegrations,
  upsertIntegration,
} from "./rina/brain/integrationBrain";
import { listPageRecords } from "./rina/brain/websiteInventory";

// Workflows
import { runScan } from "./rina/workflows/scanWorkflow";
import {
  processApprovalDecision,
  canPublishFix,
  markPublished,
  verifyFix,
  markFailed,
} from "./rina/workflows/approvalWorkflow";
import { runWeeklyBriefingWorkflow } from "./rina/workflows/briefingWorkflow";

// ─────────────────────────────────────────────
// Zod schemas
// ─────────────────────────────────────────────
const fixStatusSchema = z.enum([
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
]);

const gradeSchema = z.enum(["clear", "partial", "not_yet_visible"]);

const platformSchema = z.enum([
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
]);

const permissionLevelSchema = z.enum([
  "no_access",
  "read_only",
  "draft_only",
  "approval_required",
  "verify_only",
  "admin_restricted",
]);

// ─────────────────────────────────────────────
// App router
// ─────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  // ── Auth ──────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Business profile ──────────────────────────────────────────────────
  business: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getBusinessForUser(ctx.user.id);
    }),
    // list returns the user's single business as an array for UI compatibility
    list: protectedProcedure.query(async ({ ctx }) => {
      const biz = await getBusinessForUser(ctx.user.id);
      return biz ? [biz] : [];
    }),

    getFullProfile: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        return getFullProfile(input.businessId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          url: z.string().url(),
          industry: z.string().optional(),
          businessType: z.string().optional(),
          audience: z.string().optional(),
          brandVoice: z.string().optional(),
          goals: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await getBusinessForUser(ctx.user.id);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Business already exists" });
        return createBusiness({ ...input, userId: ctx.user.id });
      }),

    update: protectedProcedure
      .input(
        z.object({
          businessId: z.number().int().positive(),
          name: z.string().min(1).optional(),
          url: z.string().url().optional(),
          industry: z.string().optional(),
          businessType: z.string().optional(),
          audience: z.string().optional(),
          brandVoice: z.string().optional(),
          goals: z.string().optional(),
          differentiators: z.array(z.string()).optional(),
          competitors: z.array(z.string()).optional(),
          location: z
            .object({
              city: z.string().optional(),
              state: z.string().optional(),
              country: z.string().optional(),
              serviceArea: z.string().optional(),
            })
            .optional(),
          proof: z
            .object({
              reviews: z.string().optional(),
              awards: z.string().optional(),
              credentials: z.string().optional(),
              caseStudies: z.string().optional(),
              yearsInBusiness: z.number().optional(),
            })
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { businessId, ...data } = input;
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== businessId) throw new TRPCError({ code: "NOT_FOUND" });
        return updateBusiness(businessId, data);
      }),

    completeOnboarding: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        await markOnboardingComplete(input.businessId);
        return { success: true };
      }),

    upsertOffer: protectedProcedure
      .input(
        z.object({
          businessId: z.number().int().positive(),
          existingId: z.number().int().positive().optional(),
          name: z.string().min(1),
          description: z.string().optional(),
          audience: z.string().optional(),
          problemSolved: z.string().optional(),
          revenuePriority: z.number().int().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        const { businessId, existingId, ...data } = input;
        return upsertOfferProfile(businessId, data, existingId);
      }),

    upsertAudience: protectedProcedure
      .input(
        z.object({
          businessId: z.number().int().positive(),
          existingId: z.number().int().positive().optional(),
          audienceType: z.string().min(1),
          needs: z.array(z.string()).optional(),
          buyingQuestions: z.array(z.string()).optional(),
          objections: z.array(z.string()).optional(),
          searchIntent: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        const { businessId, existingId, ...data } = input;
        return upsertAudienceProfile(businessId, data, existingId);
      }),
  }),

  // ── Fix items ─────────────────────────────────────────────────────────
  fixes: router({
    list: protectedProcedure
      .input(
        z.object({
          businessId: z.number().int().positive(),
          statusFilter: z.array(fixStatusSchema).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        return listFixItemsForBusiness(input.businessId, input.statusFilter);
      }),

    get: protectedProcedure
      .input(z.object({ fixId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const fix = await getFixItem(input.fixId);
        if (!fix) throw new TRPCError({ code: "NOT_FOUND" });
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== fix.businessId) throw new TRPCError({ code: "FORBIDDEN" });
        return fix;
      }),

    create: protectedProcedure
      .input(
        z.object({
          businessId: z.number().int().positive(),
          issue: z.string().min(1),
          recommendation: z.string().min(1),
          impactLevel: z.enum(["high", "medium", "low"]).optional(),
          difficulty: z.enum(["easy", "medium", "hard"]).optional(),
          targetPlatform: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        return createFixItem(input);
      }),

    transition: protectedProcedure
      .input(
        z.object({
          fixId: z.number().int().positive(),
          newStatus: fixStatusSchema,
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const fix = await getFixItem(input.fixId);
        if (!fix) throw new TRPCError({ code: "NOT_FOUND" });
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== fix.businessId) throw new TRPCError({ code: "FORBIDDEN" });
        try {
          return await transitionFixStatus(input.fixId, input.newStatus, ctx.user.id, input.notes);
        } catch (err: unknown) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: err instanceof Error ? err.message : "Invalid transition",
          });
        }
      }),

    decisionHistory: protectedProcedure
      .input(z.object({ fixId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const fix = await getFixItem(input.fixId);
        if (!fix) throw new TRPCError({ code: "NOT_FOUND" });
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== fix.businessId) throw new TRPCError({ code: "FORBIDDEN" });
        return getDecisionHistory(input.fixId, "fix_item");
      }),
  }),

  // ── Generated assets ──────────────────────────────────────────────────
  assets: router({
    draft: protectedProcedure
      .input(
        z.object({
          fixId: z.number().int().positive(),
          assetTypeOverride: z
            .enum([
              "faq",
              "metadata",
              "schema",
              "homepage_copy",
              "service_page",
              "blog_post",
              "social_post",
              "gbp_description",
              "email",
            ])
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const fix = await getFixItem(input.fixId);
        if (!fix) throw new TRPCError({ code: "NOT_FOUND" });
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== fix.businessId) throw new TRPCError({ code: "FORBIDDEN" });
        return draftAssetForFix(input.fixId, input.assetTypeOverride);
      }),

    getLatest: protectedProcedure
      .input(z.object({ fixId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const fix = await getFixItem(input.fixId);
        if (!fix) throw new TRPCError({ code: "NOT_FOUND" });
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== fix.businessId) throw new TRPCError({ code: "FORBIDDEN" });
        return getLatestAssetForFix(input.fixId);
      }),

    history: protectedProcedure
      .input(z.object({ fixId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const fix = await getFixItem(input.fixId);
        if (!fix) throw new TRPCError({ code: "NOT_FOUND" });
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== fix.businessId) throw new TRPCError({ code: "FORBIDDEN" });
        return getAssetVersionHistory(input.fixId);
      }),

    updateContent: protectedProcedure
      .input(
        z.object({
          assetId: z.number().int().positive(),
          content: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return updateAssetContent(input.assetId, input.content);
      }),
  }),

  // ── Briefing ──────────────────────────────────────────────────────────
  briefing: router({
    latest: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        return getLatestBriefing(input.businessId);
      }),

    history: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        return getBriefingHistory(input.businessId);
      }),

    generate: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        return generateWeeklyBriefing(input.businessId);
      }),
  }),

  // ── Visibility snapshot ───────────────────────────────────────────────
  snapshot: router({
    get: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        return getVisibilitySnapshot(input.businessId);
      }),
  }),

  // ── Lead signals ──────────────────────────────────────────────────────
  leads: router({
    summary: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        return getLeadSignalSummary(input.businessId);
      }),

    list: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        return listLeadSignals(input.businessId);
      }),

    record: protectedProcedure
      .input(
        z.object({
          businessId: z.number().int().positive(),
          attribution: z.enum(["confirmed_ai", "likely_ai", "visibility_influenced", "unknown"]),
          source: z.string().optional(),
          landingPageUrl: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        return recordLeadSignal(input);
      }),
  }),

  // ── Integrations ──────────────────────────────────────────────────────
  integrations: router({
    list: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        return listIntegrations(input.businessId);
      }),

    upsert: protectedProcedure
      .input(
        z.object({
          businessId: z.number().int().positive(),
          platform: platformSchema,
          permissionLevel: permissionLevelSchema,
          accountIdentifier: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        const { businessId, platform, ...data } = input;
        return upsertIntegration(businessId, platform, {
          ...data,
          connectionStatus: "connected",
        });
      }),

    canPublish: protectedProcedure
      .input(
        z.object({
          businessId: z.number().int().positive(),
          platform: platformSchema,
        })
      )
      .query(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        return { canPublish: await canPublish(input.businessId, input.platform) };
      }),
  }),

  // ── Website pages ─────────────────────────────────────────────────────
  pages: router({
    list: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        return listPageRecords(input.businessId);
      }),
  }),

  // ── Scanner ────────────────────────────────────────────────────────────
  scanner: router({
    run: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        return runScan(input.businessId);
      }),
  }),

  // ── Approval workflow ─────────────────────────────────────────────────
  approval: router({
    decide: protectedProcedure
      .input(
        z.object({
          fixId: z.number().int().positive(),
          decision: z.enum(["approve", "reject", "request_revision"]),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const fix = await getFixItem(input.fixId);
        if (!fix) throw new TRPCError({ code: "NOT_FOUND" });
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== fix.businessId) throw new TRPCError({ code: "FORBIDDEN" });
        return processApprovalDecision(input.fixId, ctx.user.id, input.decision, input.notes);
      }),

    canPublish: protectedProcedure
      .input(
        z.object({
          fixId: z.number().int().positive(),
          businessId: z.number().int().positive(),
          platform: z.enum(["wix", "shopify", "wordpress", "linkedin", "instagram"]),
        })
      )
      .query(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        return canPublishFix(input.fixId, input.businessId, input.platform);
      }),

    markPublished: protectedProcedure
      .input(
        z.object({
          fixId: z.number().int().positive(),
          publishedUrl: z.string().url().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const fix = await getFixItem(input.fixId);
        if (!fix) throw new TRPCError({ code: "NOT_FOUND" });
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== fix.businessId) throw new TRPCError({ code: "FORBIDDEN" });
        return markPublished(input.fixId, ctx.user.id, input.publishedUrl);
      }),

    verify: protectedProcedure
      .input(
        z.object({
          fixId: z.number().int().positive(),
          evidence: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const fix = await getFixItem(input.fixId);
        if (!fix) throw new TRPCError({ code: "NOT_FOUND" });
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== fix.businessId) throw new TRPCError({ code: "FORBIDDEN" });
        return verifyFix(input.fixId, ctx.user.id, input.evidence);
      }),

    markFailed: protectedProcedure
      .input(
        z.object({
          fixId: z.number().int().positive(),
          reason: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const fix = await getFixItem(input.fixId);
        if (!fix) throw new TRPCError({ code: "NOT_FOUND" });
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== fix.businessId) throw new TRPCError({ code: "FORBIDDEN" });
        return markFailed(input.fixId, ctx.user.id, input.reason);
      }),
  }),

  // ── Weekly briefing workflow ───────────────────────────────────────────
  weeklyMeeting: router({
    run: protectedProcedure
      .input(
        z.object({
          businessId: z.number().int().positive(),
          forceRegenerate: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const biz = await getBusinessForUser(ctx.user.id);
        if (!biz || biz.id !== input.businessId) throw new TRPCError({ code: "NOT_FOUND" });
        return runWeeklyBriefingWorkflow(input.businessId, input.forceRegenerate);
      }),
  }),
});

export type AppRouter = typeof appRouter;