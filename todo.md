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

## Mockup Realignment (post-feedback)
- [x] Replace photographic hero with illustrated Rina character per approved mockup
- [x] Refactor RinaLayout to feel like a meeting with Rina (sidebar w/ Weekly Meeting + Health card)
- [x] Rebuild Weekly Meeting as the primary post-login screen with five numbered question tiles
- [x] Add "AI Lead Signals" card to Weekly Meeting
- [x] Add "Rina Can Help" action panel to Weekly Meeting
- [x] Add 5-stage horizontal pipeline rail at the bottom of Weekly Meeting
- [x] Diagnose and repair onboarding flow (URL normalizer + sign-in nudge)
- [x] Re-run vitest and save a corrective checkpoint

## Agent-feel pass + runtime fixes (post-/app review)
- [x] Fix `briefings.latest` and `scores.latest` returning `undefined` (must return `null` so React Query accepts the value)
- [x] Fix nested `<a>` warning in RinaLayout sidebar links
- [x] Replace card-grid Command Center with a true "meeting with Rina" feel: conversational greeting, Rina's voice in copy, sectioned narrative flow
- [x] Make Rina address the user by first name and reference the current week
- [x] Add Rina speech/portrait column on the left of the meeting screen so Rina is *present*, not decorative
- [x] Audit all `*.latest` and `*.history` procedures to ensure they return `null` or `[]` rather than `undefined`
- [x] Re-run vitest, save corrected checkpoint

## Layout + Hero pass (session 4)
- [x] RinaLayout fully rebuilt: lavender gradient page, full-height Rina on left outside card, floating white card with internal sidebar
- [x] Home hero updated: Rina stands full-height beside copy on lavender gradient (no boxed image)
- [x] Onboarding: fixed duplicate useAuth import, background updated to lavender gradient
- [x] index.css: body background set to lavender gradient (135deg, #e8e4f8 → #dde8f8 → #e4ecf8)
- [x] Settings page (placeholder with proper nav)
- [x] Integrations page (placeholder with proper nav)
- [x] Scorecard: agent-feel header, Rina addresses user by first name, grade colors, run-scan CTA
- [x] Briefing: agent-feel header, Rina addresses user by first name, updated 5-question labels
- [x] BusinessProfile: agent-feel header, Rina-voice copy, improved field placeholders
- [x] FixQueue: agent-feel header, Rina-voice greeting with active fix count, status descriptions
- [x] FixDetail: agent-feel polish, improved draft studio copy, status badge inline with title
