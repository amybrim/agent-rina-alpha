# Agent Rina GEO/AI Intelligence Architecture Spec
Source: AgentRinaWorkingOrder,Tools,Sources,andAI-GEOIntelligenceMap.pdf

## Build Priority (Section 10)
1. Business Profile Builder ✅
2. Website Scanner and Evidence Store ✅ (basic HTML crawler exists)
3. **GEO / AI Understanding Evaluator** ← BUILD NOW (Step 3 approved)
4. Auriti / Princeton-Style Scoring Engine
5. Recommendation and Prioritization Engine
6. Fix Drafting Engine
7. Status and Approval Manager
8. Verification Engine
9. Weekly Briefing Engine
10. Integrations

## Section 5: The AI/GEO Skill Layer
Rina evaluates these GEO skills:

| GEO Skill | What Rina Checks | Example Finding |
|---|---|---|
| Answer Readiness | Does the site answer common buyer and AI-summary questions clearly? | "The site says what you sell, but not who it is best for." |
| Entity Clarity | Is the business clearly identifiable as a real entity with consistent name, category, location, and proof? | "Your business name is consistent, but your service category varies across pages." |
| Offer Clarity | Are the main services/products explicit, specific, and easy to classify? | "The premium offer is mentioned but not explained enough to recommend." |
| Audience Clarity | Does the site say who the business helps? | "AI systems may not know whether this is for homeowners, agencies, executives, or students." |
| Location / Service Area Clarity | Is geography clear where relevant? | "The homepage lacks service-area language, which weakens local recommendation readiness." |
| Proof and Trust Signals | Are reviews, testimonials, credentials, years in business, case studies, or outcomes easy to find? | "Strong proof exists but is not close to the service claims." |
| Structured Data Readiness | Is schema present and aligned with the business? | "Organization schema exists, but Service and FAQ schema are missing." |
| Source Corroboration | Can the business be confirmed across profiles, directories, social, and trusted sources? | "LinkedIn and Google profile support the entity, but industry citations are thin." |
| Prompt-Recommendation Fit | Does the business match the kinds of questions a potential customer would ask AI? | "You are not yet optimized for 'best X near me' or 'who can help with Y' prompts." |

## Section 6: Princeton/Auriti-Style Scoring Architecture
Eight scoring categories (internal engine only — NO numbers shown to users):

| Scoring Category | What It Measures |
|---|---|
| Findability | Can the business and key pages be discovered? |
| Understandability | Can systems understand what the business does? |
| Entity Confidence | Is the business clearly defined as a real entity? |
| Trust and Authority | Is there enough proof to support recommendations? |
| Structured Data Readiness | Can machines parse key business details? |
| Content and Answer Coverage | Does the business answer buyer and AI-discovery questions? |
| Local / Market Relevance | Is location, service area, industry, or niche context clear? |
| Progress and Implementation | Are fixes moving from recommendation to verified improvement? |

**Grade language (NO numbers ever reach the user):**
- Per category: CLEAR / PARTIAL / NOT YET VISIBLE
- Overall health: STRONG / IMPROVING / AT RISK / NEEDS WORK

## Section 7: How AI Systems Know a Business
Eight AI knowledge needs Rina evaluates:

| AI Knowledge Need | What AI Systems Look For | What Rina Checks |
|---|---|---|
| Identity | Who is this business? | Name, website, About page, Organization schema, Google profile, LinkedIn, same-as links |
| Category | What kind of business is it? | Page titles, headings, service descriptions, categories, schema type, directory categories |
| Offer | What does it sell or provide? | Service pages, product pages, pricing, FAQs, offer blocks, product feeds |
| Audience | Who is it for? | Customer language, use cases, industries served, testimonials, FAQs |
| Location | Where does it operate? | Address, service area, city pages, GBP, local schema, citations |
| Proof | Why should it be trusted? | Reviews, testimonials, credentials, press, case studies |
| Freshness | Is the business active and current? | Blog updates, social posts, profile updates, recent reviews, current hours |
| Consistency | Is the story the same across sources? | Website, profiles, directories, social, schema, search snippets |
| Recommendation Fit | For which customer questions should this business be suggested? | Prompt tests, FAQ coverage, offer specificity, proof strength, competitor comparison |

## Scanner Step 3: GEO/AI Understanding Evaluator
**What it does:** Evaluates whether the business has answer-ready content for generative engines and AI summaries.

**Input:** Business profile + crawled page content (from existing scanner)
**Output per page/site:** findings with category, severity, grade (CLEAR/PARTIAL/NOT_YET_VISIBLE), evidence, and business_meaning

**Finding types to detect:**
1. Answer readiness gaps (no FAQ, no "who it's for" language, no "what you do" clarity)
2. Entity clarity issues (inconsistent name/category, missing About page, no org schema)
3. Offer clarity gaps (services not explicitly named, no pricing signals, no offer blocks)
4. Audience clarity gaps (no audience language, no "who this is for" copy)
5. Location/service area gaps (no service area language, no local schema, no city pages)
6. Proof/trust signal gaps (no testimonials near service claims, no credentials visible)
7. Structured data gaps (missing Organization, Service, FAQ, LocalBusiness schema)
8. Source corroboration gaps (no LinkedIn/GBP confirmation, thin directory presence)
9. Prompt-recommendation fit gaps (not optimized for "best X near me" queries)

**Severity levels:** critical / high / medium / low
**Confidence levels:** detected / inferred / likely / verified
