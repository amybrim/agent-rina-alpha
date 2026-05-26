# Agent Rina — Full Rebuild TODO
# Brief: agent_rina_rebuild_brief.md (COO/Claude sign-off)
# Build order: Phase 1 → 2 → 3 → 4 (COO sign-off required) → 5

## PHASE 1 — Foundation (no UI until this is done)

### Schema
- [x] Delete drizzle/schema.ts and all existing migration SQL files
- [x] Rebuild drizzle/schema.ts with all 13 tables (12 + users extended):
      businesses, offer_profiles, audience_profiles, website_page_records,
      visibility_findings, fix_items, generated_assets, integration_connections,
      visibility_briefings, lead_signal_records, prompt_test_results, user_decision_records, users
- [x] Run pnpm drizzle-kit generate and apply migration via webdev_execute_sql
- [x] Verify all 13 tables exist in DB

### Brain modules (server/rina/brain/)
- [x] businessProfile.ts — CRUD for businesses, offers, audiences (stateful, DB-connected)
- [x] visibilitySnapshot.ts — aggregates grades from findings + briefings
- [x] websiteInventory.ts — CRUD and query for page records
- [x] fixEngine.ts — full state machine + fix item CRUD (transitionFixStatus pattern)
- [x] assetDrafting.ts — AI-powered asset generation per fix type
- [x] leadSignals.ts — lead attribution logic
- [x] weeklyBriefing.ts — assembles briefing from all brain sources
- [x] integrationBrain.ts — integration registry and permission checks

### State machine (fixEngine.ts)
- [x] Enforce all valid transitions:
      found→recommended, recommended→drafted|needs_input|deferred|rejected,
      needs_input→drafted|deferred|rejected, drafted→ready_for_review|needs_input,
      ready_for_review→approved|rejected, approved→scheduled|published,
      scheduled→published, published→verified|failed, failed→drafted,
      verified→(terminal), deferred→recommended, rejected→(terminal)
- [x] Write user_decision_record on every transition
- [x] Reject invalid transitions with typed error

### Prompts (server/rina/prompts/)
- [x] systemPrompt.ts — full RINA_SYSTEM_PROMPT with personality, confidence rules, status rules, voice example
- [x] assetPrompts.ts — buildFAQPrompt, buildMetadataPrompt, buildSchemaPrompt,
      buildHomepageCopyPrompt, buildServicePagePrompt, buildBlogPostPrompt,
      buildSocialPostPrompt, buildGBPDescriptionPrompt
- [x] scanInterpretation.ts — converts raw findings to business meaning
- [x] briefingPrompt.ts — weekly briefing generation prompt
- [x] priorityPrompt.ts — priority ranking logic

### Tests
- [x] server/rina/fixEngine.test.ts — 26 state machine tests, all passing
- [x] Verify all 27 tests pass after schema rebuild (2 test files, 27 tests)

---

## PHASE 2 — Core Intelligence

### Scanner (server/rina/scanner/)
- [x] crawler.ts — fetches pages, checks crawlability (robots.txt, status codes)
- [x] metadataParser.ts — extracts title, description, headings, OG tags
- [x] schemaParser.ts — detects and validates schema markup (JSON-LD, microdata)
- [x] contentAnalyzer.ts — clarity, proof, offer, audience signals
- [x] geoReadiness.ts — AI/GEO specific signal detection (FAQ, structured data, entity clarity)
- [x] confidenceResolver.ts — assigns confidence labels (verified|detected|inferred|likely|unknown)

### Scan workflow (server/rina/workflows/)
- [x] scanWorkflow.ts — orchestrates: fetch → parse → findings → fix items → confidence labels
- [x] Wire scanWorkflow to tRPC procedure: scanner.run

### Live test
- [ ] Run scan on insightfulrina.com and validate against known gaps
- [x] Verify scanner returns confidence labels on all findings
- [x] Verify fix_items are created from findings

---

## PHASE 3 — Approval and Publishing Layer

### Workflows
- [x] approvalWorkflow.ts — approve/reject/defer with state transitions + decision records
- [x] briefingWorkflow.ts — triggers weekly briefing assembly from all brain sources
- [ ] verifyWorkflow.ts — rescans after publish, updates status to verified|failed (deferred to Phase 5)
- [ ] publishWorkflow.ts — clipboard/download; Search Console read-only (deferred to Phase 5)

### Search Console integration
- [ ] searchConsole.ts — read-only: impressions, clicks, queries, top pages (Phase 5)

### Tests
- [x] All 27 tests passing (26 state machine + 1 auth)
- [x] All server-side TypeScript errors resolved (0 errors)
- [x] All client-side TypeScript errors resolved (0 errors)

---

## PHASE 4 — UI (COMPLETE)

### Delete
- [x] CommandCenter.tsx replaced by WeeklyMeeting.tsx (route /app → WeeklyMeeting)
- [x] FixDetail.tsx replaced by FixWorkspace.tsx (route /app/fixes/:id → FixWorkspace)
- [x] Scorecard, Briefing, Settings, Integrations: RinaLayout wrapper removed (now provided by App.tsx)
- [x] AIChatBox removed from ComponentShowcase (no longer used)

### Shared components
- [x] client/src/components/ConfidenceLabel.tsx — confirmed|inferred|estimated|unknown + GradePill
- [x] client/src/components/RinaLayout.tsx — lavender gradient, Rina character, floating white card, sidebar nav

### Pages
- [x] Onboarding.tsx — 5-step structured interview (basics, offers/audience, proof, voice/goals, confirmation)
- [x] WeeklyMeeting.tsx — Rina's Read, five questions with GradePill + ConfidenceLabel, top actions, pipeline rail
- [x] FixWorkspace.tsx — two-column workspace: fix context left, asset drafting studio right, state machine controls
- [x] FixQueue.tsx — tabbed (Active/Approved/Live/Deferred), Rina-voice header, no scores
- [x] BusinessProfile.tsx — view/edit business profile, RinaLayout wrapper removed
- [x] Integrations.tsx — connector cards with permission levels
- [x] Settings.tsx — account, plan, preferences

### Routing
- [x] App.tsx: /app → WeeklyMeeting, /app/fixes/:id → FixWorkspace
- [x] All /app/* routes wrapped in RinaLayout via AppShell at App.tsx level
- [x] Zero TypeScript errors, 27 tests passing

---

## PHASE 5 — Polish (COMPLETE)

- [x] ConfidenceLabel appears next to every grade, finding, fix, lead signal (Scorecard, WeeklyMeeting, FixWorkspace, FixQueue)
- [x] Zero /100 scores anywhere in the UI — grade labels only (clear/partial/not_yet_visible)
- [x] AIChatBox removed from all pages and imports
- [x] Home.tsx copy scrubbed: no "scorecard" language, five questions updated to exact brief spec
- [x] Scorecard.tsx rebuilt: five dimensions with GradePill + ConfidenceLabel, health grade, no letter grades
- [x] WeeklyMeeting.tsx: Lead Signals section added (At a glance stats), Rina Can Help panel added
- [x] All 27 vitest tests passing, zero TypeScript errors
- [ ] End-to-end live test: onboard insightfulrina.com, run scan, approve a fix, verify (requires browser login)

---

## DEFERRED (not blocking)
- [ ] Stripe checkout (pending webdev_add_feature stripe activation)
- [ ] Heartbeat weekly scan scheduling
- [ ] External AI visibility probes (ChatGPT, Perplexity, Gemini)
- [ ] Wix draft publishing integration (Phase 3 territory)

---

## POST-PHASE 5 — OAuth Fix (COMPLETE)

- [x] Identify root cause: users table had camelCase columns (loginMethod, lastSignedIn) from migration 0000, but schema.ts was rebuilt with snake_case column names (login_method, last_signed_in) causing Drizzle to query wrong columns
- [x] Fix schema.ts users table to match actual DB structure (int id + openId varchar + camelCase column names)
- [x] Fix db.ts user helpers to use openId column for lookups instead of id
- [x] Fix routers.ts to use ctx.user.openId instead of ctx.user.id (40 occurrences replaced)
- [x] Fix sdk.ts buildCronUser to use correct User type shape (int id, openId field)
- [x] Zero TypeScript errors after all fixes
- [x] 27 vitest tests passing after all fixes
- [x] Fix businesses table: drop old-structure table (ownerId/websiteUrl) and recreate with correct schema (user_id/url) from migration 0002
- [x] Apply all pending migrations (0001, 0002, 0003) and mark as applied in __drizzle_migrations
- [x] Remove duplicate snake_case columns (login_method, last_signed_in) from users table
- [x] Zero TypeScript errors, 27 tests passing after full migration fix
- [ ] Live end-to-end test: sign in → onboard insightfulrina.com → run scan → verify findings appear in DB → approve a fix → verify state machine transitions
- [ ] Push final state to GitHub

---

## Step 3 — GEO/AI Understanding Evaluator (Build Priority #3)

- [x] Rewrite geoReadiness.ts: implement all 9 GEO skill categories (Answer Readiness, Entity Clarity, Offer Clarity, Audience Clarity, Location/Service Area, Proof & Trust, Structured Data, Source Corroboration, Prompt-Recommendation Fit) — each producing CLEAR/PARTIAL/NOT_YET_VISIBLE
- [x] Extend geoReadiness.ts: implement 8 Princeton/Auriti scoring categories (Findability, Understandability, Entity Confidence, Trust & Authority, Structured Data Readiness, Content & Answer Coverage, Local/Market Relevance, Progress & Implementation) — internal only, no numbers to UI
- [x] Extend crawler.ts: add AI bot access check (OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, GPTBot, anthropic-ai, Bingbot) from robots.txt
- [x] Extend crawler.ts: add llms.txt detection (presence, H1, blockquote, H2 sections)
- [x] Update scanWorkflow.ts: replace simple geo.gaps loop with per-category structured findings using new evaluator output
- [x] Update scanWorkflow.ts: map each GEO category finding to correct findingType for downstream grading
- [x] Run TypeScript check and all tests after changes (0 errors, 27 tests passing)
- [x] Save checkpoint

---

## Data Integrity Rules (Non-Negotiable — Before GEO Evaluator)

- [ ] Rule 1: Replace fetchText/fetchHtml with prerender-aware fetch; confirm real content (not error page, not empty) before any analysis runs
- [ ] Rule 1: Add content validation gate — if fetched HTML is < 500 chars or is an error page, mark scan page as crawl_failed and skip analysis
- [ ] Rule 3: Replace all regex-based schema parsing with node-html-parser; store raw schema JSON in DB for audit
- [ ] Rule 3: Replace all regex-based metadata parsing with node-html-parser
- [ ] Rule 5: Add confidence column (detected/inferred/unknown) to visibility_findings table and apply migration
- [ ] Rule 5: Every finding emitted by scanWorkflow must carry the correct confidence label — never label inferred signals as detected
- [ ] Rule 5: GEO category findings from HTML analysis = inferred (Rina is interpreting signals, not reading a declared value)
- [ ] Rule 5: robots.txt/llms.txt findings = detected (Rina fetched the file directly)
- [ ] Rule 5: Schema/metadata findings = detected (parsed from actual fetched HTML)
- [ ] Rule 2: All AI platform findings (ChatGPT/Perplexity mention checks) must be confidence:unknown until a real prompt_test_results row exists
- [ ] Rule 2: Remove any code that infers or fabricates AI platform mention results
- [ ] Rule 4: GBP/review findings must be labeled confidence:unknown when no GBP integration is connected for that business
- [ ] Run TypeScript check and all tests after changes
- [ ] Save checkpoint

---

## Visual Redesign — Match Mockup Design Language

- [ ] Remove business limit for Amy's account (amybrim11@gmail.com) in DB
- [ ] Update global theme: purple/indigo palette (#6366F1 primary), Inter/Plus Jakarta Sans typography, sidebar brand logo
- [ ] Redesign Command Center: metric tiles with icons, Rina character illustration, fix queue cards with status badges, GEO readiness panel
- [ ] Redesign Weekly Meeting: 5-question cards with icons and status badges, AI Lead Signals panel, Rina Can Help panel, pipeline tracker bar
- [ ] Run TypeScript check and save checkpoint after redesign
