import type { InferSelectModel } from "drizzle-orm";
import type { businesses } from "../../../drizzle/schema";
import { RINA_SYSTEM_PROMPT } from "./systemPrompt";

type Business = InferSelectModel<typeof businesses>;

export interface RawFinding {
  type: string;
  source: string;
  evidence: string;
  severity: "critical" | "high" | "medium" | "low";
}

export function buildScanInterpretationPrompt(business: Business, rawFindings: RawFinding[]): string {
  const offers = Array.isArray(business.offers) ? business.offers.map((o) => o.name).join(", ") : "not specified";

  return `${RINA_SYSTEM_PROMPT}

You are interpreting a website scan for ${business.name}.

Business context:
- Industry: ${business.industry ?? "not specified"}
- Primary offers: ${offers}
- Audience: ${business.audience ?? "not specified"}
- Goals: ${business.goals ?? "not specified"}

Raw scan findings:
${rawFindings.map((f, i) => `${i + 1}. [${f.severity.toUpperCase()}] ${f.type}
   Source: ${f.source}
   Evidence: ${f.evidence}`).join("\n\n")}

For each finding, write a "business meaning" — one to two sentences that explain what this gap means 
for how ${business.name} appears to AI discovery systems and potential customers.

Do NOT write technical descriptions. Write what a business owner needs to understand.
Example: "Your homepage does not clearly state what you do for whom. When an AI system reads your site, 
it cannot confidently recommend you for searches related to your service."

Return a JSON array with this structure:
[
  {
    "index": 1,
    "businessMeaning": "...",
    "confidence": "detected|inferred|likely",
    "recommendedAction": "one sentence describing the fix"
  }
]`;
}

export function buildBriefingInterpretationPrompt(
  business: Business,
  weekData: {
    findingsCount: number;
    fixesCompleted: number;
    fixesInProgress: number;
    grades: {
      showingUp: string;
      beingUnderstood: string;
      trust: string;
      recommendationReady: string;
      geoReadiness: string;
    };
    topFindings: string[];
  }
): string {
  const offers = Array.isArray(business.offers) ? business.offers.map((o) => o.name).join(", ") : "not specified";

  return `${RINA_SYSTEM_PROMPT}

Write Rina's weekly read for ${business.name}.

Business context:
- Industry: ${business.industry ?? "not specified"}
- Primary offers: ${offers}
- Audience: ${business.audience ?? "not specified"}

This week's data:
- Showing up: ${weekData.grades.showingUp}
- Being understood: ${weekData.grades.beingUnderstood}
- Trust: ${weekData.grades.trust}
- Recommendation-ready: ${weekData.grades.recommendationReady}
- GEO readiness: ${weekData.grades.geoReadiness}
- New findings: ${weekData.findingsCount}
- Fixes completed this week: ${weekData.fixesCompleted}
- Fixes in progress: ${weekData.fixesInProgress}
- Top issues: ${weekData.topFindings.join("; ")}

Write Rina's Read — a 3–5 sentence plain-language interpretation of where this business stands this week.
Requirements:
- Specific to ${business.name} — not generic
- Acknowledge what improved if anything improved
- Name the biggest remaining gap
- End with one clear recommendation
- Use Rina's voice: smart, warm, direct, no hype
- Do NOT mention numerical scores or /100 ratings

Return only the text of Rina's Read, no JSON wrapper.`;
}
