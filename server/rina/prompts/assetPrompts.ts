import type { InferSelectModel } from "drizzle-orm";
import type { businesses, visibilityFindings } from "../../../drizzle/schema";

type Business = InferSelectModel<typeof businesses>;
type Finding = InferSelectModel<typeof visibilityFindings>;

function businessContext(b: Business): string {
  const offers = Array.isArray(b.offers) ? b.offers.map((o) => o.name).join(", ") : "not specified";
  return `
Business: ${b.name}
Website: ${b.url}
Industry: ${b.industry ?? "not specified"}
Business type: ${b.businessType ?? "not specified"}
Primary offers: ${offers}
Audience: ${b.audience ?? "not specified"}
Brand voice: ${b.brandVoice ?? "professional and clear"}
Location: ${b.location ? JSON.stringify(b.location) : "not specified"}
Differentiators: ${Array.isArray(b.differentiators) ? b.differentiators.join("; ") : "not specified"}
`.trim();
}

function findingContext(f: Finding): string {
  return `
Finding: ${f.businessMeaning}
Evidence: ${f.evidence ?? "none provided"}
Severity: ${f.severity}
Confidence: ${f.confidence}
`.trim();
}

export function buildFAQPrompt(business: Business, finding: Finding): string {
  return `${businessContext(business)}

${findingContext(finding)}

Draft 5 FAQ questions and answers for this business.
Questions must reflect real buyer intent for this specific business.
Answers must be direct, specific, and AI-readable.
Do not use generic questions. Every question must be something a 
real customer of ${business.name} would actually ask.
Format: Q: [question]\nA: [answer]

Return only the 5 Q&A pairs, nothing else.`;
}

export function buildMetadataPrompt(business: Business, finding: Finding, pageUrl?: string): string {
  return `${businessContext(business)}

${findingContext(finding)}

Page URL: ${pageUrl ?? business.url}

Write an optimized title tag and meta description for this page.
The title must be under 60 characters and clearly state what the business does and for whom.
The meta description must be under 160 characters, include the primary offer and location if relevant, 
and be written so an AI recommendation system can extract the business purpose in one reading.

Format:
TITLE: [title]
META: [meta description]`;
}

export function buildSchemaPrompt(business: Business, finding: Finding): string {
  const offers = Array.isArray(business.offers) ? business.offers : [];
  return `${businessContext(business)}

${findingContext(finding)}

Write a complete JSON-LD schema markup for this business.
Use the most appropriate schema type (LocalBusiness, Service, Organization, or a more specific subtype).
Include: name, url, description, offers or services, address if available, telephone if available, 
sameAs links if available, and any relevant service area.
The schema must be accurate to what is known about this business — do not invent details.

Return only valid JSON-LD inside a <script type="application/ld+json"> block.`;
}

export function buildHomepageCopyPrompt(business: Business, finding: Finding): string {
  return `${businessContext(business)}

${findingContext(finding)}

Rewrite the homepage hero section for this business.
The copy must:
1. State the primary offer in the first sentence — no clever wordplay that obscures what the business does
2. Name the audience in the second sentence
3. Include one proof point (years in business, number of clients, specific result)
4. End with a clear call to action

Write a headline (under 10 words), a subheadline (1–2 sentences), and a CTA button label.
Use ${business.brandVoice ?? "professional and clear"} tone.
Do not use generic phrases like "We are here to help" or "Your success is our mission."`;
}

export function buildServicePagePrompt(business: Business, finding: Finding, serviceName?: string): string {
  return `${businessContext(business)}

${findingContext(finding)}

Service to write about: ${serviceName ?? "primary service"}

Write a complete service page for this specific service.
Structure:
1. H1: Service name + who it is for (under 10 words)
2. Opening paragraph: what the service is, who it helps, what problem it solves (3–4 sentences)
3. What's included: 3–5 bullet points, specific and concrete
4. Who this is for: 2–3 sentences describing the ideal client
5. Proof: one specific result or testimonial reference
6. CTA: one clear next step

Write in ${business.brandVoice ?? "professional and clear"} tone.
Every sentence must be specific to ${business.name} — no filler.`;
}

export function buildBlogPostPrompt(business: Business, finding: Finding): string {
  return `${businessContext(business)}

${findingContext(finding)}

Write a blog post that addresses the visibility gap identified in the finding above.
The post must:
1. Answer a real question a potential customer of ${business.name} would search for
2. Be 400–600 words
3. Include at least one specific example or data point
4. End with a natural mention of how ${business.name} helps with this
5. Use headers (H2) to break up the content

Do not write a generic industry post. Write for the specific audience of ${business.name}.
Tone: ${business.brandVoice ?? "professional and clear"}.`;
}

export function buildSocialPostPrompt(business: Business, finding: Finding, platform: "linkedin" | "instagram" = "linkedin"): string {
  const platformGuidance = platform === "linkedin"
    ? "LinkedIn post: professional, insight-led, 150–250 words, no hashtag spam (max 3 relevant hashtags)"
    : "Instagram caption: warm, visual-first, 80–120 words, 5–8 relevant hashtags";

  return `${businessContext(business)}

${findingContext(finding)}

Write a ${platformGuidance}.
The post must connect to a real visibility or trust signal for this business.
Do not write a generic motivational post. Write something that demonstrates expertise.
Include a clear call to action at the end.`;
}

export function buildGBPDescriptionPrompt(business: Business, finding: Finding): string {
  return `${businessContext(business)}

${findingContext(finding)}

Write a Google Business Profile description for this business.
Requirements:
- Under 750 characters
- First sentence: what the business does and who it serves
- Second sentence: primary differentiator or proof point
- Third sentence: service area or location context
- No promotional language like "best" or "top-rated" without proof
- No URLs, phone numbers, or special characters

The description must be accurate and specific to ${business.name}.`;
}

export function buildEmailPrompt(business: Business, finding: Finding, emailType: "welcome" | "follow_up" | "check_in" = "follow_up"): string {
  const typeGuidance = {
    welcome: "a welcome email to a new customer who just engaged with the business",
    follow_up: "a follow-up email to a prospect who visited the website but did not convert",
    check_in: "a check-in email to an existing customer to maintain the relationship",
  }[emailType];

  return `${businessContext(business)}

${findingContext(finding)}

Write ${typeGuidance}.
Requirements:
- Subject line: under 50 characters, specific and not clickbait
- Opening: acknowledge where they are in the journey (1 sentence)
- Body: one clear value point or next step (2–3 sentences)
- CTA: one action, clearly stated
- Tone: ${business.brandVoice ?? "professional and warm"}
- Length: under 150 words total

Do not use generic email templates. Write for ${business.name}'s specific audience.`;
}
