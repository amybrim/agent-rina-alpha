import type { InferSelectModel } from "drizzle-orm";
import type { businesses, fixItems } from "../../../drizzle/schema";
import { RINA_SYSTEM_PROMPT } from "./systemPrompt";

type Business = InferSelectModel<typeof businesses>;
type Fix = InferSelectModel<typeof fixItems>;

export function buildPriorityPrompt(business: Business, fixes: Fix[]): string {
  const fixList = fixes
    .map((f, i) => `${i + 1}. [${f.impactLevel} impact / ${f.difficulty} difficulty] ${f.issue}`)
    .join("\n");

  return `${RINA_SYSTEM_PROMPT}

Rank these fix items for ${business.name} by priority.

Business context:
- Industry: ${business.industry ?? "not specified"}
- Goals: ${business.goals ?? "not specified"}
- Audience: ${business.audience ?? "not specified"}

Fix items to rank:
${fixList}

Rank by: (1) impact on AI visibility and recommendation likelihood, (2) ease of implementation, 
(3) how foundational the fix is (fixes that unblock other fixes rank higher).

Return JSON array of fix indices in priority order (highest priority first):
{ "rankedIndices": [3, 1, 5, 2, 4], "reasoning": "one sentence explaining the top priority" }`;
}
