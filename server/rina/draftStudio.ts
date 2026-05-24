/**
 * Rina Draft Studio
 *
 * Uses the platform LLM to turn a Fix proposal into ready-to-use copy:
 * meta tags, JSON-LD schema blocks, FAQ Q&A, GBP descriptions, page sections,
 * or handoff notes. Always returns plain text the owner can paste.
 */

import { invokeLLM } from "../_core/llm";
import type { Business, Fix } from "../../drizzle/schema";

type DraftInput = {
  fix: Pick<Fix, "category" | "title" | "rationale" | "assetType" | "targetLocation">;
  business: Pick<Business, "name" | "websiteUrl" | "businessType" | "location" | "description" | "goals">;
};

const RINA_SYSTEM = `You are Rina — a sophisticated, warm, plain-spoken AI visibility advisor for small and mid-sized businesses. Always refer to yourself as "Rina." Avoid AI-vs-human framing; you amplify human-led intelligence. Your drafts are ready-to-paste, never preachy. Use the business's voice. No emojis. No marketing fluff. No "Boost your ROI" cliches.`;

export async function generateDraft(input: DraftInput): Promise<string> {
  const { fix, business } = input;

  const userPrompt = `Draft the following fix asset for a real business. Return ONLY the asset content, no commentary, no markdown code fences.

BUSINESS PROFILE
Name: ${business.name}
Website: ${business.websiteUrl}
Type: ${business.businessType ?? "not specified"}
Location: ${business.location ?? "not specified"}
Description: ${business.description ?? "not specified"}
Goals: ${business.goals ?? "not specified"}

FIX TO DRAFT
Category: ${fix.category}
Title: ${fix.title}
Asset Type: ${fix.assetType}
Target Location: ${fix.targetLocation ?? "n/a"}
Why this matters: ${fix.rationale}

OUTPUT RULES BY ASSET TYPE
- meta:            Provide the full <title> and/or <meta name="description"> tags exactly as they should appear in <head>. Title 50–60 chars, description 140–160 chars.
- org_schema:      Provide a complete valid JSON-LD <script type="application/ld+json"> block including @context, @type Organization, name, url, description, address (if location given), and sameAs[] placeholders.
- faq_schema:      Provide a JSON-LD FAQPage schema with 5–7 mainEntity Question/Answer pairs grounded in the business profile.
- faq_content:     Provide 6–10 Q&A pairs in plain text (Q: / A:) suited to the business and its likely customers.
- service_schema:  Provide JSON-LD Service or Product schema for the primary offering.
- sitemap:         Provide a minimal valid sitemap.xml referencing /, /about, /services (or /products), /contact, /faq.
- llms_txt:        Provide a clean llms.txt mapping key URLs and a one-line description per URL.
- robots_txt:      Provide a robots.txt that explicitly allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended, and references the sitemap.
- gbp:             Provide a 700–750 character Google Business Profile description in the business's voice, mentioning location and primary offerings.
- page_copy:       Provide ready-to-paste copy for the target location, with a clear H1, two short paragraphs, and a single CTA line.
- handoff_note:    Provide a short brief the owner can hand to their developer or marketing partner explaining exactly what to change and where.

Now draft the asset.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: RINA_SYSTEM },
      { role: "user", content: userPrompt },
    ],
  });

  const choice = response.choices?.[0]?.message?.content;
  const text = typeof choice === "string" ? choice : "";
  return text.trim();
}

/**
 * Generate the weekly briefing answers to the five structural questions.
 */
export async function generateBriefing(args: {
  business: Pick<Business, "name" | "websiteUrl" | "businessType" | "location" | "description" | "goals">;
  currentScore: number;
  previousScore: number | null;
  topGaps: string[];
  recentChanges: string[];
  upcomingFixes: string[];
}): Promise<{
  showingUp: string;
  understood: string;
  recommendable: string;
  whatChanged: string;
  whatsNext: string;
}> {
  const userPrompt = `Write the Weekly Visibility Briefing for ${args.business.name}. The briefing MUST answer these five questions explicitly, each in 2–4 sentences, in Rina's voice. Plain text. No markdown headers.

Context:
- Current overall visibility score: ${args.currentScore}/100
- Previous score: ${args.previousScore ?? "no prior scan"}
- Biggest gaps right now: ${args.topGaps.join("; ") || "none"}
- Recent changes since last week: ${args.recentChanges.join("; ") || "none"}
- Fixes Rina is proposing or drafting next: ${args.upcomingFixes.join("; ") || "none"}
- Business: ${args.business.name} (${args.business.businessType ?? "unspecified"}) in ${args.business.location ?? "the business's region"}
- Goals: ${args.business.goals ?? "not specified"}

Return JSON with exactly these keys: showingUp, understood, recommendable, whatChanged, whatsNext.

Each key answers one of:
1. showingUp:     "Are we showing up?" — describe AI discoverability and crawl posture.
2. understood:    "Are we understood?" — describe how clearly AI can interpret what the business does.
3. recommendable: "Are we recommendable?" — describe how citable, structured, and trustworthy the content is.
4. whatChanged:   "What changed?" — describe shifts versus last week.
5. whatsNext:     "What's next?" — name the 1–3 fixes Rina recommends approving this week.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: RINA_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "weekly_briefing",
        strict: true,
        schema: {
          type: "object",
          properties: {
            showingUp: { type: "string" },
            understood: { type: "string" },
            recommendable: { type: "string" },
            whatChanged: { type: "string" },
            whatsNext: { type: "string" },
          },
          required: [
            "showingUp",
            "understood",
            "recommendable",
            "whatChanged",
            "whatsNext",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = response.choices?.[0]?.message?.content;
  const text = typeof raw === "string" ? raw : "";
  try {
    return JSON.parse(text);
  } catch {
    return {
      showingUp: "Rina was unable to generate this section. Please retry.",
      understood: "Rina was unable to generate this section. Please retry.",
      recommendable: "Rina was unable to generate this section. Please retry.",
      whatChanged: "Rina was unable to generate this section. Please retry.",
      whatsNext: "Rina was unable to generate this section. Please retry.",
    };
  }
}
