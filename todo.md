# Agent Rina Alpha — Project TODO

## Foundation
- [x] Establish brand-aligned theme tokens, typography, and Rina visual centerpiece
- [x] Upload Rina character asset to webdev static storage
- [x] Configure RinaLayout shell with Rina-specific navigation

## Database Schema
- [x] users table extended with subscription tier (starter, growth, pro, agency)
- [x] businesses table (Living Business Profile)
- [x] scans table (Evidence Store, timestamped per-business log)
- [x] scores table (8-category GEO/Auriti score history)
- [x] fixes table (5-status workflow: Recommended → Drafted → Approved → Published → Verified)
- [x] briefings table (weekly visibility briefings)
- [x] subscription fields on users (Stripe IDs + status)

## Backend
- [x] Website scanner (fetch-based hybrid): H1, meta, schema, sitemap, robots.txt, word count, CMS, internal links
- [x] GEO/Auriti 8-category scoring engine with grade labels
- [x] Fix Queue logic enforcing 5-status workflow (no collapsing)
- [x] Rina Draft Studio: LLM-generated metadata, FAQ schema, Organization schema, GBP descriptions, About/Service copy
- [x] Evidence Store with timestamped scan history per business
- [x] Weekly Briefing generator (the five structural questions)
- [x] Approval workflow logic with audit trail (fix history)
- [ ] Stripe checkout for starter, growth, pro, agency tiers (deferred — pending Stripe activation step)

## Frontend
- [x] Onboarding intake flow (Living Business Profile foundation)
- [x] Command Center home (Rina greeting, health, next best action)
- [x] Scorecard view (8 categories + history)
- [x] Fix Queue UI (status pipeline visible)
- [x] Draft Studio UI (review + edit Rina drafts)
- [x] Approval Workflow UI (approve/reject with notes + history)
- [x] Weekly Briefing screen with the five questions
- [x] Subscription / pricing page (starter, growth, pro, agency)
- [x] Authenticated routes guarded; onboarding required before scanning

## Constraints (NON-NEGOTIABLE)
- [x] Agent referred to as "Rina" everywhere
- [x] 5-status workflow exactly: Recommended → Drafted → Approved → Published → Verified
- [x] Weekly Briefing answers the five structural questions explicitly
- [x] Onboarding required before any scanning or scoring
- [x] Subscription tiers labeled exactly: starter, growth, pro, agency

## Testing
- [x] vitest coverage for scoring engine + recommendation engine
- [x] vitest coverage for auth/logout (template baseline)

## Delivery
- [x] Initial checkpoint after MVP build complete

## Next (post-alpha)
- [ ] Activate Stripe via webdev_add_feature("stripe") and wire checkout sessions per tier
- [ ] Schedule weekly recurring scans via Heartbeat
- [ ] Add external AI visibility tests (ChatGPT, Gemini, Perplexity probes)
