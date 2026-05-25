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

## PHASE 4 — UI (COO sign-off required before starting)

### Delete
- [ ] Delete client/src/pages/CommandCenter.tsx
- [ ] Delete client/src/pages/Scorecard.tsx
- [ ] Delete client/src/pages/Briefing.tsx
- [ ] Delete client/src/pages/ComponentShowcase.tsx
- [ ] Delete client/src/lib/rina.ts
- [ ] Delete client/src/components/AIChatBox.tsx
- [ ] Delete client/src/components/DashboardLayout.tsx
- [ ] Delete client/src/components/DashboardLayoutSkeleton.tsx

### Shared components
- [ ] client/src/components/ConfidenceLabel.tsx — all 6 confidence levels with correct colors
- [ ] client/src/components/VisibilityGrade.tsx — CLEAR|PARTIAL|NOT_YET_VISIBLE display
- [ ] client/src/components/HealthGrade.tsx — STRONG|IMPROVING|AT_RISK|NEEDS_WORK display
- [ ] client/src/components/RinaLayout.tsx — rebuild (keep lavender gradient, remove dashboard sidebar)

### Pages (build in this order)
- [ ] Onboarding.tsx — 5-step structured interview (basics, offers/audience, proof, voice/goals, confirmation)
      Step 1: pre-fill from URL scan with confidence labels on every pre-filled field
      Step 5: Rina summary → confirm → triggers first scan
- [ ] WeeklyMeeting.tsx — primary post-login page
      Section 1: Week header + HealthGrade (no /100)
      Section 2: Five question cards (grade + confidence + Rina's read + chevron)
      Section 3: Rina's Read (full text, Rina's voice, business-specific)
      Section 4: This Week's Actions (1–3 items, state-aware buttons)
      Section 5: Lead Signals (4 attribution buckets)
      Section 6: Status Pipeline (5-stage, clickable counts)
      Section 7: Rina Can Help (quick-action panel)
- [ ] FixWorkspace.tsx — replaces FixDetail.tsx
      Fix header (issue, source, confidence, status, business meaning)
      Asset panel (editable draft, version history, regenerate)
      Action bar (state-aware: drafted|approved|published|verified|needs_input|failed)
      Rina's Explanation (why this fix, what impact)
      Decision history (user_decision_records surfaced)
- [ ] FixQueue.tsx — rebuild with status filters, no numerical scores
- [ ] BusinessProfile.tsx — view/edit what Rina knows (businesses + offer_profiles + audience_profiles)
- [ ] Integrations.tsx — connect platforms, set permission levels, show connection status
- [ ] Settings.tsx — account, plan, preferences

### Routing
- [ ] Update App.tsx: post-login home → /app/meeting (WeeklyMeeting)
- [ ] Remove all routes for deleted pages
- [ ] Add routes for FixWorkspace (/app/fixes/:id)

---

## PHASE 5 — Polish

- [ ] ConfidenceLabel appears next to every grade, finding, fix, lead signal
- [ ] Verify zero /100 scores anywhere in the UI
- [ ] Verify AIChatBox is gone from all pages and imports
- [ ] End-to-end test: onboard insightfulrina.com, run scan, approve a fix, verify — full loop
- [ ] Verify Rina's Read on WeeklyMeeting is business-specific (not generic metric summary)
- [ ] Run all vitest tests — must pass

---

## DEFERRED (not blocking)
- [ ] Stripe checkout (pending webdev_add_feature stripe activation)
- [ ] Heartbeat weekly scan scheduling
- [ ] External AI visibility probes (ChatGPT, Perplexity, Gemini)
- [ ] Wix draft publishing integration (Phase 3 territory)
