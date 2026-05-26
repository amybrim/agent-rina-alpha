import { desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { fixItems, visibilityBriefings, visibilityFindings } from "../../../drizzle/schema";
import type { InferSelectModel } from "drizzle-orm";
import { invokeLLM } from "../../_core/llm";
import { buildBriefingPrompt } from "../prompts/briefingPrompt";
import { getBusinessById } from "./businessProfile";

type Briefing = InferSelectModel<typeof visibilityBriefings>;
type Grade = "clear" | "partial" | "not_yet_visible";

function parseGrade(raw: unknown): Grade {
  if (raw === "clear" || raw === "partial" || raw === "not_yet_visible") return raw;
  return "not_yet_visible";
}

export async function getLatestBriefing(businessId: number): Promise<Briefing | null> {
  const [briefing] = await db
    .select()
    .from(visibilityBriefings)
    .where(eq(visibilityBriefings.businessId, businessId))
    .orderBy(desc(visibilityBriefings.createdAt))
    .limit(1);
  return briefing ?? null;
}

export async function getBriefingHistory(businessId: number): Promise<Briefing[]> {
  return db
    .select()
    .from(visibilityBriefings)
    .where(eq(visibilityBriefings.businessId, businessId))
    .orderBy(desc(visibilityBriefings.createdAt));
}

export async function generateWeeklyBriefing(businessId: number): Promise<Briefing> {
  const business = await getBusinessById(businessId);
  if (!business) throw new Error(`Business ${businessId} not found`);

  const openFindings = await db
    .select()
    .from(visibilityFindings)
    .where(eq(visibilityFindings.businessId, businessId));

  const activeFixItems = await db
    .select()
    .from(fixItems)
    .where(eq(fixItems.businessId, businessId));

  // Build prompt and call LLM
  const prompt = buildBriefingPrompt(
    business,
    openFindings.filter((f) => f.status === "open"),
    activeFixItems
  );

  const response = await invokeLLM({
    messages: [{ role: "user", content: prompt }],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "weekly_briefing",
        strict: true,
        schema: {
          type: "object",
          properties: {
            showingUpGrade: { type: "string" },
            beingUnderstoodGrade: { type: "string" },
            trustGrade: { type: "string" },
            recommendationReadyGrade: { type: "string" },
            geoReadinessGrade: { type: "string" },
            rinaRead: { type: "string" },
            topActions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  fixItemIndex: { type: "number", description: "0-based index into the provided fix_items list" },
                  action: { type: "string" },
                  why: { type: "string" },
                },
                required: ["fixItemIndex", "action", "why"],
                additionalProperties: false,
              },
            },
          },
          required: [
            "showingUpGrade",
            "beingUnderstoodGrade",
            "trustGrade",
            "recommendationReadyGrade",
            "geoReadinessGrade",
            "rinaRead",
            "topActions",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices?.[0]?.message?.content ?? "{}";
  const rawStr: string = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
  const raw = JSON.parse(rawStr);

  // Compute week boundaries
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const completedFixes = activeFixItems.filter((f) => f.status === "verified").length;
  const inProgressFixes = activeFixItems.filter((f) =>
    ["drafted", "ready_for_review", "approved", "scheduled"].includes(f.status)
  ).length;

  // Resolve fixItemIndex → real fixId.
  // The prompt passes only the recommended fix items (status==='recommended') with 0-based indices.
  // We must index into the same filtered list to get the correct DB id.
  const recommendedFixItems = activeFixItems.filter((f) => f.status === "recommended");
  const resolvedTopActions = (raw.topActions ?? []).map(
    (a: { fixItemIndex: number; action: string; why: string }) => {
      const fixItem = recommendedFixItems[a.fixItemIndex];
      return {
        fixId: fixItem?.id ?? null,
        action: a.action,
        why: a.why,
      };
    }
  );

  // Save briefing
  const [result] = await db
    .insert(visibilityBriefings)
    .values({
      businessId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      showingUpGrade: parseGrade(raw.showingUpGrade),
      beingUnderstoodGrade: parseGrade(raw.beingUnderstoodGrade),
      trustGrade: parseGrade(raw.trustGrade),
      recommendationReadyGrade: parseGrade(raw.recommendationReadyGrade),
      geoReadinessGrade: parseGrade(raw.geoReadinessGrade),
      rinaRead: raw.rinaRead ?? null,
      fixesCompleted: completedFixes,
      fixesInProgress: inProgressFixes,
      topActions: resolvedTopActions,
    })
    .$returningId();

  const [briefing] = await db
    .select()
    .from(visibilityBriefings)
    .where(eq(visibilityBriefings.id, result.id))
    .limit(1);

  return briefing;
}
