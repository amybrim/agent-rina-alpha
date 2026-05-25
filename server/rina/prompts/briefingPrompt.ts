import type { InferSelectModel } from "drizzle-orm";
import type { businesses, fixItems, visibilityFindings } from "../../../drizzle/schema";
import { RINA_SYSTEM_PROMPT } from "./systemPrompt";

type Business = InferSelectModel<typeof businesses>;
type Fix = InferSelectModel<typeof fixItems>;
type Finding = InferSelectModel<typeof visibilityFindings>;

export function buildBriefingPrompt(
  business: Business,
  openFindings: Finding[],
  activeFixItems: Fix[]
): string {
  const topFindings = openFindings
    .filter((f) => f.severity === "critical" || f.severity === "high")
    .slice(0, 5)
    .map((f) => `- [${f.severity}] ${f.businessMeaning}`)
    .join("\n");

  const inProgress = activeFixItems
    .filter((f) => ["drafted", "ready_for_review", "approved", "scheduled"].includes(f.status))
    .slice(0, 5)
    .map((f) => `- ${f.issue} (${f.status})`)
    .join("\n");

  return `${RINA_SYSTEM_PROMPT}

Generate a weekly visibility briefing for ${business.name}.

Business: ${business.name}
Industry: ${business.industry ?? "not specified"}
Offers: ${Array.isArray(business.offers) ? business.offers.map((o) => o.name).join(", ") : "not specified"}
Audience: ${business.audience ?? "not specified"}

Open critical/high findings:
${topFindings || "None"}

Fixes currently in progress:
${inProgress || "None"}

Answer these five questions for this business specifically:
1. Are we showing up? (grade: clear | partial | not_yet_visible, then one sentence of evidence)
2. Are we being understood? (grade + one sentence)
3. Are we trusted? (grade + one sentence)
4. Are we recommendation-ready? (grade + one sentence)
5. What should we fix next? (grade + specific recommendation)

Then write Rina's Read: 3–5 sentences in Rina's voice summarizing the week.

Return JSON:
{
  "showingUpGrade": "clear|partial|not_yet_visible",
  "beingUnderstoodGrade": "clear|partial|not_yet_visible",
  "trustGrade": "clear|partial|not_yet_visible",
  "recommendationReadyGrade": "clear|partial|not_yet_visible",
  "geoReadinessGrade": "clear|partial|not_yet_visible",
  "rinaRead": "...",
  "topActions": [
    { "action": "...", "why": "..." }
  ]
}`;
}
