import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  appendFixHistory,
  createBriefing,
  createBusiness,
  createFix,
  createScan,
  createScore,
  getBusinessById,
  getFixById,
  getLatestBriefing,
  getLatestScan,
  getLatestScore,
  listBriefingsByBusiness,
  listBusinessesByOwner,
  listFixHistory,
  listFixesByBusiness,
  listScansByBusiness,
  listScoresByBusiness,
  updateBusiness,
  updateFix,
  updateScan,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { generateBriefing, generateDraft } from "./rina/draftStudio";
import { buildRecommendations } from "./rina/recommendations";
import { scanWebsite } from "./rina/scanner";
import { CATEGORY_KEYS, scoreFindings } from "./rina/scoring";

const VALID_NEXT: Record<string, string[]> = {
  recommended: ["drafted"],
  drafted: ["approved", "recommended"],
  approved: ["published", "drafted"],
  published: ["verified", "approved"],
  verified: [],
};

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Business / Living Profile ───────────────────────────────────────────
  businesses: router({
    list: protectedProcedure.query(({ ctx }) => listBusinessesByOwner(ctx.user.id)),
    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const b = await getBusinessById(input.id, ctx.user.id);
        if (!b) throw new TRPCError({ code: "NOT_FOUND" });
        return b;
      }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(256),
          websiteUrl: z.string().url(),
          businessType: z.string().max(128).optional(),
          location: z.string().max(256).optional(),
          description: z.string().max(2000).optional(),
          goals: z.string().max(2000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createBusiness({
          ownerId: ctx.user.id,
          name: input.name,
          websiteUrl: input.websiteUrl,
          businessType: input.businessType ?? null,
          location: input.location ?? null,
          description: input.description ?? null,
          goals: input.goals ?? null,
          profileStatus: "active",
        });
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          patch: z.object({
            name: z.string().min(1).max(256).optional(),
            websiteUrl: z.string().url().optional(),
            businessType: z.string().max(128).optional(),
            location: z.string().max(256).optional(),
            description: z.string().max(2000).optional(),
            goals: z.string().max(2000).optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await getBusinessById(input.id, ctx.user.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        await updateBusiness(input.id, ctx.user.id, input.patch);
        return { success: true } as const;
      }),
  }),

  // ── Scans + Scoring + Recommendations ───────────────────────────────────
  scans: router({
    listByBusiness: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const b = await getBusinessById(input.businessId, ctx.user.id);
        if (!b) throw new TRPCError({ code: "NOT_FOUND" });
        return listScansByBusiness(input.businessId);
      }),
    latest: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const b = await getBusinessById(input.businessId, ctx.user.id);
        if (!b) throw new TRPCError({ code: "NOT_FOUND" });
        return getLatestScan(input.businessId);
      }),
    runNow: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const b = await getBusinessById(input.businessId, ctx.user.id);
        if (!b) throw new TRPCError({ code: "NOT_FOUND" });
        if (b.profileStatus !== "active") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Complete onboarding before scanning.",
          });
        }

        const scanId = await createScan({
          businessId: b.id,
          status: "running",
        });

        try {
          const findings = await scanWebsite(b.websiteUrl);
          const scoring = scoreFindings(findings);

          await updateScan(scanId, {
            status: "complete",
            findings: findings as unknown as object,
            completedAt: new Date(),
          });

          const c = scoring.categories;
          await createScore({
            businessId: b.id,
            scanId,
            crawlability: c.crawlability.score,
            structure: c.structure.score,
            schemaScore: c.schema.score,
            citability: c.citability.score,
            authority: c.authority.score,
            freshness: c.freshness.score,
            clarity: c.clarity.score,
            conversion: c.conversion.score,
            overall: scoring.overall,
            grade: scoring.overallGrade,
            narrative: scoring.rinaNarrative,
          });

          // Seed Fix Queue with new "recommended" items, skipping duplicates by title.
          const existingFixes = await listFixesByBusiness(b.id);
          const existingTitles = new Set(existingFixes.map((f) => f.title));
          const proposals = buildRecommendations(findings, scoring);
          for (const p of proposals) {
            if (existingTitles.has(p.title)) continue;
            const fixId = await createFix({
              businessId: b.id,
              category: p.category,
              title: p.title,
              rationale: p.rationale,
              assetType: p.assetType,
              targetLocation: p.targetLocation,
              priority: p.priority,
              impactPoints: p.impactPoints,
              status: "recommended",
            });
            await appendFixHistory({
              fixId,
              fromStatus: null,
              toStatus: "recommended",
              actorUserId: ctx.user.id,
              note: "Rina identified this opportunity.",
            });
          }

          return {
            scanId,
            overall: scoring.overall,
            grade: scoring.overallGrade,
            seededFixCount: proposals.filter((p) => !existingTitles.has(p.title)).length,
          };
        } catch (err) {
          await updateScan(scanId, {
            status: "failed",
            errorMessage: err instanceof Error ? err.message : String(err),
            completedAt: new Date(),
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Rina could not complete the scan. Please retry.",
          });
        }
      }),
  }),

  scores: router({
    history: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const b = await getBusinessById(input.businessId, ctx.user.id);
        if (!b) throw new TRPCError({ code: "NOT_FOUND" });
        return listScoresByBusiness(input.businessId);
      }),
    latest: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const b = await getBusinessById(input.businessId, ctx.user.id);
        if (!b) throw new TRPCError({ code: "NOT_FOUND" });
        return getLatestScore(input.businessId);
      }),
    categoryKeys: publicProcedure.query(() => CATEGORY_KEYS),
  }),

  // ── Fix Queue (5-status workflow) ───────────────────────────────────────
  fixes: router({
    listByBusiness: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const b = await getBusinessById(input.businessId, ctx.user.id);
        if (!b) throw new TRPCError({ code: "NOT_FOUND" });
        return listFixesByBusiness(input.businessId);
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const fix = await getFixById(input.id);
        if (!fix) throw new TRPCError({ code: "NOT_FOUND" });
        const b = await getBusinessById(fix.businessId, ctx.user.id);
        if (!b) throw new TRPCError({ code: "FORBIDDEN" });
        const history = await listFixHistory(input.id);
        return { fix, history };
      }),

    /** Generate the draft using Rina Draft Studio and move recommended → drafted. */
    draft: protectedProcedure
      .input(z.object({ fixId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const fix = await getFixById(input.fixId);
        if (!fix) throw new TRPCError({ code: "NOT_FOUND" });
        const business = await getBusinessById(fix.businessId, ctx.user.id);
        if (!business) throw new TRPCError({ code: "FORBIDDEN" });
        if (fix.status !== "recommended" && fix.status !== "drafted") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Drafts can only be generated for recommended or already-drafted fixes.",
          });
        }
        const content = await generateDraft({ fix, business });
        const previous = fix.status;
        await updateFix(fix.id, { draftContent: content, status: "drafted" });
        await appendFixHistory({
          fixId: fix.id,
          fromStatus: previous,
          toStatus: "drafted",
          actorUserId: ctx.user.id,
          note: "Rina drafted the asset.",
        });
        return { draftContent: content };
      }),

    /** Generic status transition with strict 5-status workflow validation. */
    transition: protectedProcedure
      .input(
        z.object({
          fixId: z.number().int().positive(),
          toStatus: z.enum(["recommended", "drafted", "approved", "published", "verified"]),
          ownerNotes: z.string().max(2000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const fix = await getFixById(input.fixId);
        if (!fix) throw new TRPCError({ code: "NOT_FOUND" });
        const business = await getBusinessById(fix.businessId, ctx.user.id);
        if (!business) throw new TRPCError({ code: "FORBIDDEN" });
        const allowed = VALID_NEXT[fix.status] ?? [];
        if (!allowed.includes(input.toStatus)) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Invalid transition: ${fix.status} → ${input.toStatus}. Allowed next: ${allowed.join(", ") || "none"}.`,
          });
        }
        // Approval requires existing draft
        if (input.toStatus === "approved" && !fix.draftContent) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Cannot approve a fix without drafted content.",
          });
        }
        await updateFix(fix.id, {
          status: input.toStatus,
          ownerNotes: input.ownerNotes ?? fix.ownerNotes,
        });
        await appendFixHistory({
          fixId: fix.id,
          fromStatus: fix.status,
          toStatus: input.toStatus,
          actorUserId: ctx.user.id,
          note: input.ownerNotes ?? null,
        });
        return { success: true } as const;
      }),

    updateDraft: protectedProcedure
      .input(z.object({ fixId: z.number().int().positive(), draftContent: z.string().min(1).max(20000) }))
      .mutation(async ({ ctx, input }) => {
        const fix = await getFixById(input.fixId);
        if (!fix) throw new TRPCError({ code: "NOT_FOUND" });
        const business = await getBusinessById(fix.businessId, ctx.user.id);
        if (!business) throw new TRPCError({ code: "FORBIDDEN" });
        await updateFix(fix.id, { draftContent: input.draftContent });
        return { success: true } as const;
      }),
  }),

  // ── Weekly Visibility Briefings ─────────────────────────────────────────
  briefings: router({
    listByBusiness: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const b = await getBusinessById(input.businessId, ctx.user.id);
        if (!b) throw new TRPCError({ code: "NOT_FOUND" });
        return listBriefingsByBusiness(input.businessId);
      }),
    latest: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const b = await getBusinessById(input.businessId, ctx.user.id);
        if (!b) throw new TRPCError({ code: "NOT_FOUND" });
        return getLatestBriefing(input.businessId);
      }),

    /** Generate this week's briefing using current state + recent history. */
    generate: protectedProcedure
      .input(z.object({ businessId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const business = await getBusinessById(input.businessId, ctx.user.id);
        if (!business) throw new TRPCError({ code: "NOT_FOUND" });

        const scoreHistory = await listScoresByBusiness(input.businessId, 2);
        const current = scoreHistory[0];
        if (!current) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Run a scan before generating a briefing.",
          });
        }
        const previous = scoreHistory[1];

        const allFixes = await listFixesByBusiness(input.businessId);
        const upcoming = allFixes
          .filter((f) => f.status === "recommended" || f.status === "drafted")
          .slice(0, 3)
          .map((f) => f.title);
        const recent = allFixes
          .filter((f) => f.status === "published" || f.status === "verified")
          .slice(0, 3)
          .map((f) => `${f.title} (${f.status})`);

        // Find lowest 2 categories from current scoring
        const cats: Array<{ key: string; score: number }> = [
          { key: "crawlability", score: current.crawlability },
          { key: "structure", score: current.structure },
          { key: "schema", score: current.schemaScore },
          { key: "citability", score: current.citability },
          { key: "authority", score: current.authority },
          { key: "freshness", score: current.freshness },
          { key: "clarity", score: current.clarity },
          { key: "conversion", score: current.conversion },
        ];
        cats.sort((a, b) => a.score - b.score);
        const topGaps = cats.slice(0, 2).map((c) => c.key);

        const text = await generateBriefing({
          business,
          currentScore: current.overall,
          previousScore: previous?.overall ?? null,
          topGaps,
          recentChanges: recent,
          upcomingFixes: upcoming,
        });

        const id = await createBriefing({
          businessId: business.id,
          weekOf: new Date(),
          showingUp: text.showingUp,
          understood: text.understood,
          recommendable: text.recommendable,
          whatChanged: text.whatChanged,
          whatsNext: text.whatsNext,
          overallScore: current.overall,
        });
        return { id, ...text, overallScore: current.overall };
      }),
  }),
});

export type AppRouter = typeof appRouter;
