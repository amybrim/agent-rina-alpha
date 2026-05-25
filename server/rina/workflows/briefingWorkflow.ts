import { db } from "../../db";
import { visibilityBriefings } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { generateWeeklyBriefing, getLatestBriefing } from "../brain/weeklyBriefing";
import { getVisibilitySnapshot } from "../brain/visibilitySnapshot";
import type { InferSelectModel } from "drizzle-orm";

export type Briefing = InferSelectModel<typeof visibilityBriefings>;

export interface BriefingWorkflowResult {
  briefing: Briefing;
  snapshot: Awaited<ReturnType<typeof getVisibilitySnapshot>>;
  isFirstBriefing: boolean;
  weekLabel: string;
}

/**
 * Run the full weekly briefing workflow:
 * 1. Check if a briefing already exists for this week
 * 2. If not, generate a new one
 * 3. Return the briefing + current snapshot
 */
export async function runWeeklyBriefingWorkflow(
  businessId: number,
  forceRegenerate = false
): Promise<BriefingWorkflowResult> {
  // Check for existing briefing this week
  const existing = await getLatestBriefing(businessId);
  const now = new Date();
  const isThisWeek =
    existing &&
    existing.weekStartDate &&
    isWithinCurrentWeek(new Date(existing.weekStartDate));

  let briefing: Briefing;

  if (isThisWeek && !forceRegenerate) {
    briefing = existing;
  } else {
    briefing = await generateWeeklyBriefing(businessId);
  }

  const snapshot = await getVisibilitySnapshot(businessId);
  const allBriefings = await db
    .select()
    .from(visibilityBriefings)
    .where(eq(visibilityBriefings.businessId, businessId))
    .orderBy(desc(visibilityBriefings.createdAt));

  const isFirstBriefing = allBriefings.length === 1;
  const weekLabel = formatWeekLabel(briefing.weekStartDate ? new Date(briefing.weekStartDate) : now);

  return { briefing, snapshot, isFirstBriefing, weekLabel };
}

function isWithinCurrentWeek(date: Date): boolean {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return date >= weekStart && date < weekEnd;
}

function formatWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const startStr = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endStr = weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `Week of ${startStr}–${endStr}`;
}
