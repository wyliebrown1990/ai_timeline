# SEO Insights Pilot — Development Plan

> **Project**: Automated SEO insights → agent action pipeline for letaiexplainai.com. Pulls Google Search Console data weekly, classifies findings into actionable buckets, routes them to scheduled agents that auto-ship cosmetic fixes and human-approve content creation. The whole system is gated by a slop-prevention skill layer that composes with existing `/AIBlogDraft`, `/AISEOReview`, `/AITechLeadReview`, `/AIUXLeadReview` skills.
> **Code Prefix**: `SEOI`
> **Start Date**: 2026-04-30
> **Product Manager**: Wylie
> **Status**: In progress — revised 2026-05-01; pilot sprints SEOI-1 through SEOI-7 remain the MVP path, and a post-pilot expansion track (SEOI-8+) now captures clustered mining, experiment scheduling, SERP packaging, and external discovery follow-ons.

---

## Vision

The atlas already has the SEO moat: an entity graph that compounds. What it doesn't have is a feedback loop that reads Google's actual signals and routes them to the right action. Today, SEO opportunities are spotted by accident (the "Turing Award multiple winners quiz" find that prompted this plan). This pipeline replaces accident with cadence — every week, Google's data tells us which queries we're winning, which we're losing, which are rising, and which are decaying. An agent with disciplined skills reads that data, ships the cheap fixes itself, queues the expensive ones for human approval, and refuses to produce slop.

The architecture is three layers, built sequentially: a foundational data pipeline, a slop-resistant skill layer that gates all agent action, and a small set of automation lanes (auto-ship, propose, human-only) that compose the existing skill ecosystem rather than reinventing it.

## Success Metrics

- **30 days post-launch**: GSC data flowing weekly to RDS with ≥99% reliability; admin can browse 4 detection buckets at `/admin/seo-insights`.
- **60 days**: Agent has auto-shipped ≥10 metadata rewrites (seoTitle/seoDescription) with measured CTR delta ≥+5pp on average vs control window.
- **90 days**: Agent has surfaced ≥5 content-gap drafts via `/AIBlogDraft`; ≥3 published; each producing ≥100 organic impressions/week within 30 days of publish.
- **Drift control**: zero auto-shipped changes flagged as slop by the drift detector across the first 90 days. Voice file (`seo_voice.md`) accumulates ≥1 entry per week.
- **Operational**: weekly digest delivered on time ≥90% of weeks; rollback exercised at least once with zero data loss.

## Why A Post-Pilot Track Exists

The pilot intentionally started with weekly exact-query snapshots because that is the lightest viable way to close the loop between GSC and agent action. Live production data now shows the limitation of that shape on a newer site: the exact `query + page` weekly rows are sparse, while useful demand is fragmented across close variants (`ai timeline` plus long-tail timeline phrasing, `mixture of experts` plus definitional variants, and so on). The next wave should therefore operate on longer finalized windows and clustered query families, not just weekly exact matches.

The expansion track below exists to solve that data-shape problem without muddying the MVP. It keeps the pilot DoD intact, then extends the same pipeline into a stronger organic-growth operating system.

---

## Developer Workflow (MANDATORY — read before every work session)

This workflow is enforced on every sprint. Ignoring it = broken ship.

1. **Read `.claude/` first.** `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` + the relevant `.claude/rules/*.md` files. Never skip.
2. **Orient inside `/roadmap/`.** Open this PLAN and the current sprint file. Pick exactly one unchecked `[ ]` task.
3. **Write elegant code in small blocks.** Minimum code to satisfy the task. Short *why* comments only. No speculative abstractions.
4. **After every code block, before moving on**:
   - `npm run typecheck` (zero errors)
   - `npm run lint` (zero errors)
   - Write/update tests covering what changed
   - `npm test` (all pass)
5. **Update the sprint file.** `[ ] → [x]` on the task just completed. Commit code + checkbox together.
6. **QA front-to-back.** Any UI change: verify local (`localhost:5173`) and prod (`letaiexplainai.com`) with `/Browser` (agent-browser). Any API change: `curl` prod + `aws logs tail /aws/lambda/ai-timeline-api-prod`.
7. **Deploy early, deploy often.** Each sprint has a Deploy section. Don't let more than one sprint accumulate unshipped.
8. **No backwards compatibility** unless Wylie explicitly requested it.
9. **Stop conditions**: DoD met, or PM decision needed. For PM decisions, write the question under `## Blocked — PM decision needed` in the relevant sprint and ping Wylie.
10. **AWS CLI available** — deploy, logs, invalidate CloudFront, migrations per `.claude/CLAUDE.md` and `.claude/rules/backend.md`.

---

## Technical Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| GSC ingest | `googleapis` Node.js SDK + Search Console API via a user-authorized OAuth refresh token | Free; read-only OAuth refresh token in SSM; matches Search Console's authenticated-user model |
| Schedule | EventBridge → existing `ai-timeline-ingestion-prod` Lambda | Reuse existing 300s ingestion Lambda; one cron rule |
| Storage | RDS PostgreSQL via Prisma | `GscDailyMetric` + `GscWeeklySnapshot` tables; spare capacity confirmed |
| Detection | SQL views + service-layer classifiers | No ML; deterministic bucket assignment |
| Admin UI | React + Tailwind at `/admin/seo-insights` | Match existing admin page conventions |
| Agent layer | Claude Code `/schedule` skill firing remote agents | One weekly run; agent invokes `/SEOAuditAgent` skill |
| Slop prevention | New `/SEOAuditAgent` skill + `seo_voice.md` | Mirrors `/AIBlogDraft` pattern — voice file accumulates learnings |
| LLM | Claude Sonnet 4.6 for metadata rewrites; Claude Opus 4.7 for content briefs | Sonnet for high-volume cosmetic; Opus for editorial judgment |

## Data Model Summary

```prisma
// SEOI-1
model GscDailyMetric {
  id            String   @id @default(cuid())
  date          DateTime // GSC report date; always interpreted as a PT reporting day
  dataSource    String   // query_detail | page_aggregate
  query         String?  // nullable only for page_aggregate rows; anonymized queries are omitted from query_detail rows by Google
  queryKey      String   // normalized uniqueness key; page_aggregate rows use a non-null sentinel
  page          String   // landing page URL
  device        String   // DESKTOP | MOBILE | TABLET
  country       String   // ISO-3166-1 alpha-3
  clicks        Int
  impressions   Int
  ctr           Float
  position      Float
  createdAt     DateTime @default(now())

  @@unique([date, dataSource, queryKey, page, device, country])
  @@index([page, date, dataSource])
  @@index([query, date])
}

// SEOI-2 — pre-aggregated for fast bucket queries
model GscWeeklySnapshot {
  id            String   @id @default(cuid())
  weekStart     DateTime // start of the finalized 7-day PT reporting window
  dataSource    String   // query_detail | page_aggregate
  query         String?  // populated for query_detail findings; null for page_aggregate findings
  queryKey      String   // normalized uniqueness key; page_aggregate rows use a non-null sentinel
  page          String
  clicks        Int
  impressions   Int
  ctr           Float
  position      Float
  bucket        String?  // winnable_loss | content_gap | trend_signal | decay | null
  bucketScore   Float?   // ranking within the bucket
  status        String   @default("open") // open | actioned | dismissed | shipped
  createdAt     DateTime @default(now())

  @@unique([weekStart, dataSource, queryKey, page])
  @@index([bucket, weekStart])
}

// SEOI-4 — audit log for every agent-shipped change
model SeoAgentAction {
  id            String   @id @default(cuid())
  snapshotId    String?  // FK to GscWeeklySnapshot the action came from
  actionType    String   // metadata_rewrite | content_brief | dismissed
  targetType    String   // blog_post | glossary_term | milestone | person | organization
  targetId      String
  beforeJson    Json     // full prior state for rollback
  afterJson     Json     // new state
  confidence    Float    // 0..1 — agent's self-rated certainty
  rationale     String   // agent's one-paragraph reasoning, stored for later audit
  shippedAt     DateTime @default(now())
  rolledBackAt  DateTime?
  measuredAt    DateTime?
  measuredDelta Json?    // { ctrBefore, ctrAfter, impressionsBefore, impressionsAfter, ... }
}
```

## API Surface Summary

```
# SEOI-1 — admin only
POST   /api/admin/seo/ingest                          # manual trigger; cron also calls
GET    /api/admin/seo/health                          # last successful run, row counts

# SEOI-2 — admin only
GET    /api/admin/seo/insights?bucket=&limit=&page=   # paginated bucket findings
GET    /api/admin/seo/insights/:id                    # detail payload incl. sparkline data
POST   /api/admin/seo/insights/:id/dismiss
POST   /api/admin/seo/insights/:id/action             # mark as manually actioned

# SEOI-4 — admin only
GET    /api/admin/seo/actions                         # audit log
POST   /api/admin/seo/actions/:id/rollback

# SEOI-6 — admin only (drafting queue feeds existing /api/admin/blog)
GET    /api/admin/seo/proposals                       # content-gap proposals
POST   /api/admin/seo/proposals/:id/approve           # forwards to /api/admin/blog
POST   /api/admin/seo/proposals/:id/reject
```

## Frontend Routes Summary

```
/admin/seo-insights              # SEOI-2 — 4-tab dashboard
/admin/seo-insights/actions      # SEOI-4 — audit log + rollback
/admin/seo-insights/proposals    # SEOI-6 — content-gap drafts queue
```

## Skill / Voice File Summary (lives outside `/roadmap`)

```
.claude/skills/SEOAuditAgent/
├── SKILL.md                # main entry — invoked by scheduled agent and manually
├── seo_voice.md            # accumulated learnings — appended after every shipped action
├── slop_categories.md      # explicit reject list (keyword stuffing, generic listicles, etc.)
└── bucket_playbooks/
    ├── winnable-losses.md  # metadata rewrite playbook (auto-ship lane)
    ├── content-gaps.md     # content brief generation (propose lane)
    ├── trend-signals.md    # fresh-news angle generation (propose lane)
    └── decay.md            # page-refresh playbook (propose lane)
```

## Sprint Overview

| Sprint | Focus | Key Deliverables | Estimated Effort |
|--------|-------|------------------|------------------|
| **SEOI-1** | GSC data pipeline | OAuth auth, Prisma schema, weekly cron, 90-day backfill, health endpoint | 1-2 days |
| **SEOI-2** | Insights detection + admin UI | 4-bucket classifier service, paginated `/admin/seo-insights` page, dismiss/action controls | 2 days |
| **SEOI-3** | SEOAuditAgent skill + voice file | `.claude/skills/SEOAuditAgent/` files, dry-run validation against real GSC data, no agent invocation yet | 1-2 days |
| **SEOI-4** | Auto-ship lane: metadata rewrites | `metadataRewriter` service, confidence threshold, audit log, rollback button — blog posts only first | 2 days |
| **SEOI-5** | Scheduled agent + feedback loop | `/schedule` weekly cron agent, dashboard-first run status, before/after CTR measurement, voice-file append | 2 days |
| **SEOI-6** | Propose lane: content-gap drafts | Agent generates content brief → forwards to `/AIBlogDraft` → admin queue → human approves before publish | 2-3 days |
| **SEOI-7** | Polish, drift detection, initiative DoD | Drift detector for slop categories, global pause switch, `.claude/rules/seo-pipeline.md`, post-launch QA | 1-2 days |

**Total estimated effort**: 11-15 days.

## Post-Pilot Expansion Track

These sprints begin **after SEOI-7 is stable**. They do **not** change the pilot Definition of Done below. Their job is to turn the shipped pilot into a stronger organic-growth system by widening the signal horizon, turning clusters into experiments, and adding discovery beyond GSC.

| Sprint | Focus | Key Deliverables | Estimated Effort |
|--------|-------|------------------|------------------|
| **SEOI-8** | 90-day clustered opportunity mining | Query clustering, 28d/90d horizons, all-page-type near-win detection, new clustered opportunities surface in admin | 2-3 days |
| **SEOI-9** | Topic pods + experiment ledger | Cluster-backed proposals, companion-page planning, experiment scheduling with D+14 / D+28 / D+56 reviews | 2-3 days |
| **SEOI-10** | News-to-evergreen routing + SERP packaging | Repeated `/news` demand promoted into canonical evergreen actions; title/H1/meta/breadcrumb/schema/internal-link packaging audits | 2-3 days |
| **SEOI-11** | External discovery + keyword portfolio | Non-GSC keyword discovery, Serper-backed competition sampling with cache + spend metering, editorial backlog scoring, portfolio UI, and agent-fed backlog | 2-3 days |

**Expansion-track estimated effort**: 8-12 days after the pilot is stable.

### Relationship To Existing SEO Plans

- `roadmap/PLAN-SEO-Improvements.md` remains the source of truth for **foundational SEO work**: canonicals, indexing, structured-data basics, and sitewide topic authority.
- `roadmap/PLAN-SEO-Timeline-Domination.md` remains the source of truth for **timeline-specific landing-page strategy**.
- SEOI-8 through SEOI-11 do **not** replace those plans. They automate discovery, prioritization, packaging, and measurement **on top of** that existing foundation.

### Post-Pilot Success Metrics

- **120 days**: clustered mining surfaces ≥8 meaningful 28d/90d opportunities per month, with ≤20% classified as noise after human review.
- **150 days**: 100% of approved SEO actions and proposals have scheduled measurement checkpoints and visible outcomes in the admin experiment ledger.
- **180 days**: at least 3 cluster-backed topic pods have shipped, at least 2 repeated `/news` demand themes have been promoted into canonical evergreen destinations, and at least 1 discovery-lane keyword has produced a measurable organic lift.
- **Operating discipline**: SEOI-11’s Serper-backed `serp_sample` lane stays within its configured caps, auto-top-up remains off, and Wylie receives automated weekly spend updates with threshold warnings before credits become a surprise.

---

## Prevalence / Integration Strategy

This is admin-only infrastructure — there is no public surface. The integration story is internal:

- `/admin/seo-insights` is reachable from the existing admin sidebar (added in SEOI-2).
- SEOI-5 is dashboard-first. The weekly run writes health + run-status data that is visible at `/admin/seo-insights`; external notification sinks (email, chat, etc.) are optional follow-ons, not MVP requirements.
- The agent's rollback button lives at `/admin/seo-insights/actions` so any auto-shipped change can be reverted in one click.

The user-facing prevalence is downstream: every action the agent ships (better metadata, new content, refreshed pages) propagates to the public site through existing surfaces (blog index, glossary, milestone pages) without new UI being needed.

## Risks & Open Questions

1. **GSC API quotas.** Search Analytics quota is mostly a load/QPM concern, not a practical QPD bottleneck for this pilot. Our pull pattern (two dataset shapes, paginated when needed) should stay well under the documented limits, but backfill still needs verification.
2. **Anonymized queries are omitted, not returned as null rows.** Detection logic cannot assume Google returns a synthetic `query=null` row for privacy-filtered traffic. The ingest must pull both query-detail rows and page-aggregate rows so page-level opportunities still surface when query-level rows are omitted.
3. **Fresh-data lag + PT day boundaries.** Search Console data is reported on PT dates and is typically finalized 2-3 days later. Weekly ingest, bucketing, and before/after measurement must operate on finalized PT windows only, or the feedback loop will compare incomplete days and produce noisy deltas.
4. **LLM cost.** Metadata rewrites are cheap (~200 tokens out per rewrite, Sonnet). Content briefs (Opus, longer context) are pricier but volume is low (≤5/week). Estimate well under $20/month at expected cadence.
5. **Slop risk concentrates in one place.** The auto-ship lane is the single point where the system can publish without human review. SEOI-3 (skill) + SEOI-4 (confidence threshold + audit) + SEOI-7 (drift detector) all exist to keep that lane safe. If any of those three slip, the pause switch from SEOI-7 is the killswitch.
6. **PM decisions deferred to sprints**: whether to add an external notification sink later (SEOI-5 follow-on, not MVP), which entity types beyond blog posts get auto-ship eligibility (SEOI-7), confidence-threshold tuning (SEOI-4 → SEOI-7).
7. **Serper cost + expiry discipline.** Serper uses top-up credits rather than a monthly subscription, and the current public pricing is Starter `50,000 credits / $50` with 6-month expiry plus optional auto top-ups. SEOI-11 therefore needs cache-first request design, explicit caps, internal spend metering, and automated weekly spend updates to Wylie so the provider never becomes an invisible background cost.

---

## Definition of Done (whole initiative)

- [ ] All sprint DoDs checked
- [ ] `/admin/seo-insights` live in prod with 4 working buckets and ≥4 weeks of GSC data
- [ ] At least one auto-shipped metadata rewrite measured and kept (or rolled back with documented reason)
- [ ] At least one content-gap proposal published via `/AIBlogDraft` and tracked through to live URL
- [ ] Weekly cron has run for ≥4 consecutive weeks without manual intervention
- [ ] `seo_voice.md` has ≥4 dated entries (one per week of operation)
- [ ] Drift detector clean across all auto-shipped changes
- [ ] `.claude/rules/seo-pipeline.md` exists and is referenced from `CLAUDE.md`
- [ ] Lighthouse on `/admin/seo-insights` ≥90 perf, ≥95 a11y (admin pages still need a11y)
- [ ] CloudWatch clean across the ingestion Lambda's runs

### `/AISEOReview` quality gates (mandatory invocations across the initiative)

These are the SEO-quality checkpoints that the other review skills (`/AITechLeadReview`, `/AISlopReviewer`, `/AIUXLeadReview`) don't cover. They must run at the listed gates before the next-sprint work proceeds.

- [ ] **SEOI-3 dry-run gate** (Task 8): `/AISEOReview` on 5 winnable-loss artifacts + 2-3 content-gap briefs from the manual dry-run. Tightens skill playbooks before any production pipeline runs.
- [ ] **SEOI-4 first-ship calibration gate** (Task 10): `/AISEOReview` on the first 3 production-pipeline metadata rewrites. Hard gate — if `/AISEOReview` rejects ≥1 of 3, the auto-ship lane does NOT go live until `metadataRewriter.ts` is tightened. Sets the calibration benchmark that SEOI-7's drift detector compares against.
- [ ] **SEOI-6 first-brief quality gate** (Task 10): `/AISEOReview` on the first 2 generated content briefs. Hard gate — if `/AISEOReview` rejects either, the propose lane stays in supervised mode until `briefGenerator.ts` + `bucket_playbooks/content-gaps.md` are tightened.
- [ ] **SEOI-7 operating-window outcome audit** (Task 1): `/AISEOReview` on a stratified sample of 5 shipped rewrites + 3 shipped proposals. Catches *outcome* drift (CTR up but for the wrong reasons — clickbait, voice violation) that the drift detector's *process* tripwires miss.

---

## Tech Lead Review (2026-04-30)

Cross-cutting findings from a codebase-grounded review of all 7 sprints. **Per-sprint findings live in each sprint file under their own "## Tech Lead Review" section.** This section captures concerns that span the initiative.

### Critical, cross-cutting

- **C-X1. Test file convention mismatch in every sprint.** The plan's test tasks reference colocated `__tests__/` folders (e.g. `server/src/services/gsc/__tests__/gscClient.test.ts`). The project's actual convention is **`/tests/unit/*.test.ts`** at the repo root — verified at `/Users/wyliebrown/ai_timeline/tests/unit/timelineUtils.test.ts` and 14 sibling files. Colocated `__tests__/` only exists in the `extension/` subproject (separate package). Every sprint's test paths need correction. Each sprint's review section flags this individually.
- **C-X2. Admin route mounting style.** Multiple sprints show `app.use('/api/admin/seo', requireAdmin, seoAdminRouter)` (middleware at mount). Project convention applies `requireAdmin` **per-route inside the route file** — see `server/src/routes/glossary.ts:69-86` for the canonical pattern. Mount is just `app.use('/api/admin/seo', seoAdminRouter)`. Both work; only one matches the codebase. Each sprint's review section flags this individually.
- **C-X3. GSC anonymized-query handling and measurement semantics need a design correction before implementation.** The current plan assumes privacy-filtered queries arrive as `query=null` detail rows and that a simple "last 7 days" weekly job is sufficient. Google's Search Analytics API omits anonymized query rows entirely and reports dates in PT with a typical 2-3 day freshness lag. The pilot therefore needs two ingest shapes (`query_detail` and `page_aggregate`) plus finalized-window semantics for both weekly snapshots and before/after measurement. SEOI-1, SEOI-5, and SEOI-6 are patched accordingly below.

### Moderate, cross-cutting

- **M-X1. `requireAdmin` import path.** Multiple sprints assume `requireAdmin` is generically available. The current admin-route convention imports from `'../middleware/auth'` — see `server/src/routes/glossary.ts:4`. Use that path in new route files unless there is a deliberate reason to stay on an older middleware module.
- **M-X2. Existing `seoContentGenerator.ts` service.** A SEO-named service already exists at `server/src/services/seoContentGenerator.ts` (Sprint SEO-4 — generates Explained/WhoInvented page content). It is **not** a metadata rewriter, so SEOI-4's `metadataRewriter.ts` is correctly a sibling, not a duplicate. Recommendation: namespace both consistently under `server/src/services/seo/` so the directory grows cleanly. SEOI-4 already proposes `server/src/services/seo/metadataRewriter.ts` — fine; just make sure SEOI-4 doesn't try to *replace* `seoContentGenerator.ts`. Confirmed it doesn't.
- **M-X3. Inline `aws s3 sync` in PLAN's developer workflow drift-risk.** Per `.claude/rules/build-and-deploy-security.md`, every `aws s3 sync` must include `--exclude "*.map"`. The PLAN's "Standard deployment commands" block above shows `aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete` without the flag. Each sprint correctly references `./scripts/deploy-frontend.sh` (which is fully compliant), but the inline copy in the dev-workflow block does not match the rule. Either delete the inline form here or add the `--exclude "*.map"` flag inline. Same drift pattern the security rule warns against.
- **M-X4. Three migrations in sequence.** SEOI-1 adds `GscDailyMetric` + `GscWeeklySnapshot`; SEOI-4 adds `SeoAgentAction`; SEOI-6 adds `SeoProposal`. Latest existing migration is `20260429155028_add_paywall_fields`. The three new migrations are independent (no FKs across them) and sequence cleanly. Confirmed safe.
- **M-X5. `SeoAgentAction.snapshotId` and `SeoProposal.snapshotId` should declare Prisma relations.** Plan defines them as raw FK strings without `@relation`. Existing models like `BlogPost.author` show the convention. Add the relation declaration on both new models so Prisma queries can `include: { snapshot: true }` cleanly.
- **M-X6. EventBridge cron mechanism is correct, but the payload key should match the existing dispatcher.** SAM template already has two precedents (`IngestionScheduleRule` line 280, `QuizGenerationScheduleRule` line 304), both targeting the same `IngestionFunction` with `action`-based dispatch. Adding a third rule for GSC matches the established pattern exactly. **The pattern requires BOTH a `Rule` resource AND a separate `Permission` resource** — see `IngestionSchedulePermission` line 293 and `QuizGenerationSchedulePermission` line 318. SEOI-1 should use an `action` payload, not a new `task` key.

### What's verified correct

- **No Prisma model collisions.** None of `GscDailyMetric`, `GscWeeklySnapshot`, `SeoAgentAction`, `SeoProposal` collide with the 50+ existing models.
- **`BlogPost.seoTitle` and `BlogPost.seoDescription` already exist** (`prisma/schema.prisma:179-181`). SEOI-4 needs no schema change to BlogPost.
- **EventBridge as cron mechanism** matches existing precedent. Extending `ai-timeline-ingestion-prod` (Handler: `ingestionLambda.handler`) is the right call — current dispatcher pattern uses `event.action` switching.
- **Entity-graph search routes already exist:** `/api/persons/search`, `/api/organizations/search`, `/api/glossary/search`, `/api/milestones/search`, plus a global `/api/search`. SEOI-2 and SEOI-6 reference these implicitly; just call them, don't reinvent.
- **`/Browser` skill exists** at `.claude/skills/Browser/`. All Browser Validation sections use it correctly (no `mcp__claude-in-chrome__*` references — the project-global rule is honored).
- **`/schedule` skill is available** at runtime (referenced in this session's skill list). Not present at `.claude/skills/schedule` on disk — it's a plugin/runtime skill, not a repo skill. SEOI-5 uses it; the plan's `/schedule` integration is valid but commits a `.claude/schedules/seo-weekly.md` definition file whose persistence path is unverified — confirm during SEOI-5 implementation.
- **External notification sink explicitly deferred.** The MVP operator surface is `/admin/seo-insights` plus persisted run status. Any later chat/email notification path should be treated as an optional add-on, not a requirement for autonomous weekly runs.
- **No backwards-compat shims** proposed in any sprint. Honors project rule.
- **No hardcoded secrets, no manual AWS console steps** — every change is IaC-routed through SAM and SSM.
- **All 7 sprints include Session Start Workflow, Prerequisites, Tasks, Tests, Deploy, Validation, DoD, Files Touched, Blocked.**

### Effort estimate impact

The plan's 11–15 day total is unchanged. The fixes called out are mostly ≤30-minute edits per sprint (renaming test paths, fixing route mount style, adding a Lambda Permission resource). No sprint grows by more than ~10% effort.

### Status

**Ready to implement after the per-sprint corrections are applied.** No initiative-level rework required. The slop-prevention design (3 layers — pre-ship checklist in skill, server-side guardrails, post-ship drift detector) is sound; codebase verification didn't surface a structural issue with that architecture.

---

## Slop Findings (AISlopReviewer — 2026-04-30)

Reviewed against the 17-category vibe-code slop checklist + LAEA's centralized systems map. The Tech Lead Review section above caught most of the *correctness* issues; this section covers the *engineering hygiene* lens specifically — duplication, drift, regression risk. Cross-references the Tech Lead Review where the same issue applies under both lenses.

### P0 — None

The plan correctly handles every load-bearing security concern: `requireAdmin` on all admin endpoints, no `VITE_*` secrets, sourcemaps stripped via `./scripts/deploy-frontend.sh`, `/Browser` skill (not `mcp__claude-in-chrome__*`), no hardcoded secrets, all infrastructure via SAM (no manual console steps).

### P1 — Centralized-system composition gaps

- **P1-S1. `briefGenerator` should compose with `entityLinker.ts`, not just call entity search routes.** SEOI-6 Task 2's link inventory step says "queries the entity graph via existing search endpoints." Verified `server/src/services/entityLinker.ts` already does keyword → entity resolution for cross-content linking using `matchPerson()` and `matchOrganization()` from `entityMatcher.ts`. The brief generator's link inventory is the same operation `/AIBlogDraft` Phase 2 runs. **Fix:** SEOI-6 should explicitly compose with `entityLinker` (or the same underlying helpers it uses) rather than treating the entity lookup as net-new logic. Sharpens TLR finding M1 in SEOI-6. Category 1.1 (Parallel helpers) + Category 12 (Architectural drift — bypassing existing abstraction).

### P2 — Operational hygiene

- **P2-S1. `SeoAgentAction` audit-log relationship to `ModerationLog` not documented.** ModerationLog (`server/src/services/moderationLogger.ts` + `prisma/schema.prisma:1207`) is the project's existing audit-trail pattern: polymorphic `targetType`+`targetId`, `automated` flag, `metadata: Json?`, full filter/pagination API. SEOI-4's `SeoAgentAction` is a *sibling* table with overlapping shape but SEO-specific typed columns (`confidence: Float`, `measuredDelta: Json?`, `rolledBackAt: DateTime?`). **Sibling table is the right call** — SEO agent actions are conceptually distinct from user-content moderation, and the typed columns earn their keep at query time. **But the relationship must be documented in code** so future devs don't re-merge or re-fork by accident. **Fix:** add a top-of-file comment to `metadataRewriter.ts` and a Prisma schema comment on `SeoAgentAction` explicitly noting "ModerationLog is the precedent for polymorphic audit logs in this codebase; this table is intentionally separate because [reasons]." Category 2 (Inconsistency / drift if undocumented).
- **P2-S2. SEOI-2 content-gap classifier should use `entityMatcher.matchPerson()` / `matchOrganization()` directly.** Sharpens TLR M1 in SEOI-2. Verified `entityMatcher.ts` exports `matchPerson(name)` and `matchOrganization(name)` with the exact-canonical → exact-alias → fuzzy chain (Jaro-Winkler ≥0.85 threshold). The plan's "fuzzy match against `Person.canonicalName`" should be a direct call to `matchPerson()`. For `GlossaryTerm` and `Milestone` (which don't have alias columns), use raw Prisma `contains` queries rather than re-implementing similarity. Category 1.1 (Parallel helpers).
- **P2-S3. Test path convention violation in 6 sprints.** Already P2 across SEOI-1, SEOI-2, SEOI-4, SEOI-5, SEOI-6, SEOI-7 per Tech Lead Review C-X1 (and the per-sprint critical findings). Cross-referenced here as Category 9 (Tests / wrong directory convention) — the slop framing reinforces the fix.

### P3 — Style / consistency

- **P3-S1. Mixed-style Anthropic SDK instantiation across the codebase.** Discovered during this review (not specific to this plan): 16+ existing services use `new Anthropic({ apiKey })` directly (`seoContentGenerator.ts`, `newsQuizGenerator.ts`, `articleAnalyzer.ts`, `keyFigures.ts`, `glossary.ts`, `aiPrerequisiteSuggestions.ts`, `newsContextGenerator.ts`, `newsConceptLinker.ts`, etc.). A `services/claude.ts` exists but is not used uniformly. **Not introduced by this plan** — this initiative inherits the existing pattern (correct for consistency). Logged to `roadmap/slop-ledger.md` as a future cleanup-when-touched candidate. Category 1.5 (Re-derived constants — `ANTHROPIC_API_KEY` env var read in 8+ places) + Category 12 (Architectural drift — no unified client).

### Slop Avoided (positive findings — call these out so future plans repeat them)

- **No backwards-compat shims.** Project rule (no backwards compat unless Wylie explicitly asked) honored across all 7 sprints. Even the auto-ship blast-radius cap (`≤3/week`) and the pause switch are forward-looking guardrails, not legacy fallbacks.
- **No parallel classification table.** Initiative is GSC-finding triage, not content classification — but plan correctly does NOT introduce a new tagging table or bypass `Subject` + `ContentSubject`. (`subject-taxonomy.md` rule respected.)
- **No `mcp__claude-in-chrome__*` references.** All Browser Validation sections use `/Browser` (agent-browser) per global CLAUDE.md.
- **`./scripts/deploy-frontend.sh` used for every frontend deploy** — sourcemap-strip + `--exclude "*.map"` rules from `build-and-deploy-security.md` are fully respected.
- **No `VITE_*` secrets proposed.** All Anthropic API keys, GSC service-account JSON, JWT secret, etc. routed through SSM `/ai-timeline/prod/*`.
- **Direct Anthropic SDK instantiation matches existing pattern.** `metadataRewriter.ts` and `briefGenerator.ts` correctly follow the codebase's per-service SDK use (no over-engineered wrapper introduced).
- **Reuse of `BlogPost.seoTitle` / `seoDescription`** — no schema change to BlogPost, plan correctly assumes these exist.
- **Composition with `/AIBlogDraft` for content drafting** — propose lane never bypasses the voice-file + Phase 5 publish gate. SEOI-6 documents this explicitly.
- **3-layer slop guard architecture is appropriately paranoid, not over-engineered.** Pre-ship checklist (skill) + server-side guardrails (metadataRewriter enforces threshold/blast-radius/pause regardless of skill output) + post-ship drift detector (SEOI-7). Each layer catches different failure modes; none is redundant. Mirrors `/AIBlogDraft`'s discipline.
- **SEOAuditAgent skill structure mirrors `/AIBlogDraft` precedent.** 5 phases, voice file (`seo_voice.md`), safety section, append-only learnings. No reinventing of skill conventions.
- **EventBridge cron + Lambda dispatch pattern** matches the two existing precedents (`IngestionScheduleRule`, `QuizGenerationScheduleRule`). Initiative reuses, not reinvents.
- **`gscClient.ts` and `feedbackMeasurement.ts` are net-new** — no existing service does Google Search Console API integration or before/after CTR delta math. Correctly classified as new infrastructure rather than reinvented.

### Verdict

**Minor adjustments.** The plan respects every load-bearing centralized system. The two P1/P2-shaped concerns (composition with `entityLinker.ts`, documenting the `SeoAgentAction` vs `ModerationLog` relationship) are sharpening corrections, not structural rework. The 3-layer slop architecture is the right level of paranoia for a system that auto-ships content edits.

**Composition note:** if SEOI-3's dry-run validation surfaces issues with the skill output quality, **also run `/AISEOReview`** on a representative auto-shipped rewrite before SEOI-4 ships — that adds the technical-SEO lens (structured data, AEO, E-E-A-T) which AISlopReviewer doesn't cover.

---

## UX Lead Re-Verification (2026-05-01)

The 2026-04-30 UX Lead Review (above) covered SEOI-1 through SEOI-7. This 2026-05-01 pass (a) re-verifies whether the prior review's prescriptions actually shipped, and (b) adds UX Lead Reviews to the post-pilot sprints (SEOI-8 through SEOI-11) which had none. Per-sprint findings live in each sprint's "## UX Lead Review (2026-05-01)" section.

### Re-verification of 2026-04-30 UX prescriptions

The 2026-04-30 UX review prescribed three new shared `ui/` primitives (`<Tabs>`, `<Drawer>`, `<EmptyState>`) plus reuse of the existing `<ConfirmDialog>` / `<ErrorState>` / `<LoadingSkeleton>`. Verified shipped:

- ✅ **`src/components/ui/Drawer.tsx`** — shipped. Right-side slide-in primitive with focus trap + Escape dismiss + mobile full-screen mode.
- ✅ **`src/components/ui/Tabs.tsx`** — shipped. Reusable tab nav primitive used by SEOI-2/4/6 and ready for SEOI-8/9/10/11 to inherit.
- ✅ **`<EmptyState>`** — shipped. Colocated inside `src/components/ui/ErrorState.tsx` (one file, two named exports). `src/components/ui/index.ts` exports both. Functionally available; the colocation is a minor cleanup-when-touched (P3-shape) — extracting `EmptyState.tsx` as its own file would aid grep-ability but isn't worth a dedicated edit.
- ✅ **`src/components/ui/ConfirmDialog.tsx`** — was already shipped before this initiative; correctly reused across SEOI-2/4/6 destructive flows.
- ✅ **`src/components/ui/ErrorState.tsx`** — was already shipped; reused across SEOI-2/4/6.
- ✅ **`src/components/ui/LoadingSkeleton.tsx`** — was already shipped (with `MilestoneCardSkeleton`, `TimelineSkeleton` variants); reused across SEOI-2/4/6.

All seven primitives the 2026-04-30 UX review depended on are exported from `src/components/ui/index.ts` and ready for SEOI-8 through SEOI-11 to compose against. **The primitive prescription landed cleanly** — no rework needed for the post-pilot sprints to inherit them.

### Cross-cutting UX findings for the post-pilot track

#### CC-UX-1. Tab nav grows from 3 → 7 tabs across SEOI-8/9/10/11

After the post-pilot track ships, the in-page tab nav at `/admin/seo-insights` will hold seven tabs:
`Insights · Actions · Proposals · Clusters · Experiments · Packaging · Portfolio`.

This crossed a usability threshold on mobile, and the shared decision is now landed in prod:

- **Option A:** Keep horizontal scroll-with-snap on mobile (per SEOI-2 UX-2 spec). Operators scroll the tab strip on 375px screens; auto-scroll-active-tab on mount. Survives 7 tabs but starts to feel cramped.
- **Option B:** Collapse tab strip to a `<select>` dropdown on mobile when tab count >5. Single-row dropdown with active label; tap to open the full list. Shipped widely as a tab-overflow pattern. Recommended.
- **Option C:** Group SEO admin tabs into two rows. Adds vertical real estate but feels less polished than A or B.

**Shipped outcome:** Option B. The shared `SeoInsightsSectionNav` now renders a mobile `<select>` dropdown when the SEO Insights section count exceeds 5, and this was prod-validated at `375px` on May 1, 2026.

#### CC-UX-2. Color-blind safety as a uniform DoD bar

Every post-pilot sprint introduces new status / severity / score / source pills. The pilot's UX-X4 didn't fully cover this; the post-pilot review elevates color-blind safety to a per-sprint DoD line item:

- All status / severity pills MUST include icon + text + color, never color alone (SEOI-9 status pills, SEOI-10 severity pills, SEOI-11 source pills, SEOI-8 cluster bucket pills).
- All score visualizations (SEOI-11 demand/competition bars, SEOI-7 confidence chips) MUST include numeric value + tier label alongside the visual signal.
- All diff panels (SEOI-4 metadata diff, SEOI-10 canonical diff) MUST label "Before"/"After" or "Current"/"Recommended" with text headings, not just background tint.

This is enumerated per-sprint in each post-pilot UX section.

#### CC-UX-3. Mobile responsive falls back to card layout for dense tables

Three post-pilot sprints add information-dense tables (SEOI-9 experiments, SEOI-10 packaging, SEOI-11 portfolio). At `<md` (768px), horizontal table scroll preserves data shape but hides signal columns (checkpoint timeline, severity, demand bars). **Cross-cutting recommendation:** at mobile breakpoint, collapse each table row to a card layout that keeps the highest-signal field visible without horizontal scrolling.

The pattern is enumerated in SEOI-9 #5 (experiment cards). SEOI-10 + SEOI-11 should match the pattern.

#### CC-UX-4. Single-theme (light) admin chrome continues; primitives stay dark-mode-ready

The 2026-04-30 UX-X1 decision ("match existing AdminLayout styling — single-theme light for content area") continues across the post-pilot track. Page chrome stays light; the shared `ui/` primitives ship full `dark:` coverage so a future admin-dark-mode backfill won't re-touch any of these surfaces.

Per-sprint pill colors include `dark:` variants (per the per-sprint UX sections) so the pills themselves are theme-aware even though the surrounding page isn't.

#### CC-UX-5. Outcome celebration moments deserve respect-reduced-motion treatment

SEOI-9 #8 introduces the first "celebrate the win" moment in the SEO admin (toast + optional confetti when an experiment lands `won`). Set the precedent: **all celebration animations across the post-pilot track must respect `prefers-reduced-motion`** — the toast remains, the confetti drops to nothing, and operators with reduced-motion preferences still get the success signal without the visual noise.

If SEOI-7 polish or SEOI-10 SERP-packaging later add similar "drift-clean" or "audit-clean" celebration moments, follow the same pattern.

### One UX risk to flag

- ⚠️ **UX-RISK-1. Editorial-seed drawer form is the first user-input form added in the SEO admin track.** SEOI-2 through SEOI-10 are all read/select/dismiss/promote flows — no free-text input from operators (other than the SEOI-6 reject reason). SEOI-11 #9 introduces an `Add seed` form. This is a small but real new UX surface area: form validation, error states, autosave-on-blur (or not?), keyboard flow. The pattern doesn't exist elsewhere in the SEO admin to copy from. **Recommendation:** the implementing dev pulls the form pattern from `src/pages/admin/BlogEditorPage.tsx` (or another existing admin form) rather than improvising. Document the chosen reference in SEOI-11 Task 5 before implementing.

### Verdict (post-pilot)

**UX-ready after the per-sprint additions are absorbed.** No structural rework needed. The shared `ui/` primitive set delivered by the pilot is the right foundation for all four post-pilot sprints to compose against.

The two cross-cutting decisions worth making upfront:
1. **CC-UX-1 mobile tab fallback** — closed. Option B (dropdown when tab count >5) shipped in the shared `SeoInsightsSectionNav` and now propagates across Insights, Clusters, Actions, Proposals, Experiments, Packaging, and Portfolio.
2. **CC-UX-2 color-blind safety as DoD** — folded into each per-sprint UX section explicitly.

The single UX risk (CC-UX-RISK-1, the editorial-seed form being the first form pattern in the SEO admin) is a documentation fix, not architectural.

---

## Tech Lead Re-Verification (2026-05-01)

The 2026-04-30 Tech Lead Review (above) covered SEOI-1 through SEOI-7. This 2026-05-01 pass (a) re-verifies the prior review's claims against the now-shipped code, and (b) adds Tech Lead Reviews to the post-pilot sprints (SEOI-8 through SEOI-11) which had none. Per-sprint findings live in each sprint's "## Tech Lead Review (2026-05-01)" section.

### Re-verification of 2026-04-30 claims

All 2026-04-30 TLR claims hold up against current state:

- ✅ **C-X1 test path correction shipped.** `tests/unit/seo/`, `tests/unit/gsc/`, `tests/unit/pages/admin/Seo*` all exist at repo root. No `__tests__/` colocation in `server/src/` or `src/`. Pilot fix landed.
- ✅ **C-X2 admin route mount style correctly per-route.** `server/src/routes/seoAdmin.ts` declares `requireAdmin` per-handler exactly like `server/src/routes/glossary.ts:69-86`. Pilot fix landed.
- ✅ **C-X3 finalized PT window discipline shipped.** `gscIngest.ts` and `feedbackMeasurement.ts` use the latest-finalized-PT-day computation, not naive "now - N days." Pilot fix landed.
- ⚠️ **M-X1 `requireAdmin` import path — definitively settled.** Both `server/src/middleware/auth.ts` (exports `requireAdmin` at line 108) AND `server/src/middleware/authMiddleware.ts` (exports `requireAdmin` at line 70) exist. **Shipped admin routes consistently use `'../middleware/auth'`** — verified at `server/src/routes/glossary.ts:4`, `server/src/routes/learningPaths.ts:1`, and the existing `server/src/routes/seoAdmin.ts`. The 2026-04-30 TLR M-X1 was correct (`'../middleware/auth'`); the AISlopReviewer skill doc (which claims `authMiddleware.ts` is canonical) is stale and should be corrected. SEOI-8/9/10/11 TLR sections all reference this canonical path explicitly.
- ✅ **M-X4 migration sequence safe.** Three migrations (`20260430173000_add_gsc_metrics`, `20260430213500_add_seo_agent_action`, `20260430234500_add_seo_proposal`) have monotonically increasing timestamps. FKs across them are clean (`SeoAgentAction.snapshotId` → `GscWeeklySnapshot`, `SeoProposal.snapshotId` → `GscWeeklySnapshot`, `SeoProposal.draftPostId` → `BlogPost`). Deployed in order.
- ✅ **M-X5 Prisma `@relation` declarations shipped.** `SeoAgentAction.snapshot @relation(...)` (line ~295) and `SeoProposal.snapshot @relation(...)` + `SeoProposal.draftPost @relation(...)` (line ~327) are declared per the prescribed fix. The pattern is set for SEOI-8/9/11's new models.
- ✅ **M-X6 EventBridge + Lambda Permission pairing.** `GscWeeklyIngestRule` (`infra/template.yaml:332`) paired with `GscWeeklyIngestPermission` (line 344). Pilot fix landed.

### One **NEW** finding from re-verification

- ⚠️ **NEW-1. SEO agent SSM params wired only into API Lambda env, not Ingestion Lambda env.** `infra/template.yaml`: `/ai-timeline/${Environment}/seo-agent-paused` and `/ai-timeline/${Environment}/seo-agent-last-run` are exposed as `SEO_AGENT_PAUSED_PARAM` / `SEO_AGENT_LAST_RUN_PARAM` env vars on the API Lambda (lines 104-105) but NOT on the Ingestion Lambda (lines 227-235). For the pilot this is correct — the `/SEOAuditAgent` workflow is driven by the `/schedule` remote agent + admin-API endpoints, not by ingestion-Lambda code paths. **Flag as a future-proofing risk:** if a future sprint moves any pause-check or run-status-write into the Ingestion Lambda (e.g., to make GSC ingest itself pause-aware), the env vars must be added there too. Add to `seo-pipeline.md` (when SEOI-7 writes that file) as a known constraint. Not blocking for SEOI-8 through SEOI-11.

### Cross-cutting findings for the post-pilot track (SEOI-8 → SEOI-11)

Per-sprint TLR sections in each sprint file capture the specifics. Cross-cutting items below.

#### CC-1. Admin nav stays flat — use in-page tab nav for new SEO sub-surfaces.

`src/components/admin/AdminLayout.tsx` `navItems` (lines 35-141) supports flat top-level entries only. The current SEO IA is one flat entry (`SEO Insights` line 73) with `actions` and `proposals` reachable only via the in-page tab nav added in SEOI-4. **All four post-pilot sprints (SEOI-8 clusters, SEOI-9 experiments, SEOI-10 packaging, SEOI-11 portfolio) should add their surface as a new tab in the existing `/admin/seo-insights` tab nav rather than a flat sidebar entry.** This means the tab nav grows from 3 (Insights / Actions / Proposals) to 7 (+ Clusters / Experiments / Packaging / Portfolio). At desktop that's still readable; at mobile, horizontal scroll-with-snap (per UX-X-2 in the 2026-04-30 UX review) handles it. Confirmed in each post-pilot sprint's TLR M-section.

#### CC-2. Page-type allowlist (used by SEOI-8 Task 4) is real and stable.

The 6 routes (`/explained/:slug`, `/who-invented/:slug`, `/events/:id`, `/people/:slug`, `/organizations/:slug`, `/timeline`) all exist in `src/App.tsx` and are wired in production. SEOI-8's `bucketClassifier.ts` extension can match GSC `page` URLs against these via prefix matching with confidence.

#### CC-3. SEO foundation is fully shipped — SEOI-10's audit-vs-generate boundary is enforceable.

`src/components/SEO.tsx` (Helmet-driven canonical, JSON-LD, meta) and `server/src/routes/sitemap.ts` (full URL enumeration) are production-ready. SEOI-10's `serpPackagingAudit.ts` has real generators to read from. Confirmed in SEOI-10's TLR M1 with explicit read-only contract.

#### CC-4. Post-pilot data-model fragmentation needs documentation, not consolidation.

After SEOI-11 ships, the schema will hold four overlapping shapes:

| Model | Sprint | Role | Lifecycle |
|---|---|---|---|
| `SeoAgentAction` | SEOI-4 | Auto-shipped change with rollback | Single 7-day measured delta |
| `SeoProposal` | SEOI-6 | Post-finding draft (GSC evidence exists; specific page+keyword pair) | `pending → drafting → (approved \| shipped) \| rejected` |
| `SeoExperiment` | SEOI-9 | Approved action with scheduled measurement checkpoints | D+14 / D+28 / D+56 schedule; `planned → running → won \| flat \| lost \| archived` |
| `KeywordOpportunity` | SEOI-11 | Pre-impression demand scouting (no GSC evidence yet) | `discovered → scored → promoted-to-experiment \| archived` |

The four roles ARE genuinely distinct. The risk is documentation, not architecture. **Patch:** add this taxonomy to the "Data Model Summary" section above when SEOI-9 ships, and add Prisma `///` comments on each model referencing the taxonomy. Cross-references AISlopReviewer CC-P1 in this PLAN's slop section.

#### CC-5. Sprint-template gaps surfaced uniformly across SEOI-8/9/10/11.

All four sprints had implicit (not explicit) commitments to: (a) per-route `requireAdmin` middleware in the route file; (b) `lazy(() => import(...))` registration in `src/App.tsx`. Both ARE conventions — the shipped pilot code follows them — but the sprint TEMPLATE doesn't surface them as default sub-tasks. Cleanup-when-touched: update `/AIDevPlanning` skill to surface "per-route requireAdmin" and "lazy admin page import" as default checklist items for any sprint adding an admin route or page. Logged as `LEDGER-003`.

### Verdict (post-pilot)

**Ready to implement after the per-sprint patches are absorbed.** The structural assumptions all hold: no Prisma collisions, no service-file collisions, no React Router collisions, the page-type allowlist is real, the SEO foundation is shipped, the auth/route conventions are settled. The single P1-shaped finding (SEOI-9 C1 measurement-table reconciliation) is a documentation/comment fix, not architectural rework.

The recurring CC-1 (in-page tab nav) and CC-5 (sprint-template gap) findings are template-shape, not per-sprint — fold them into `/AIDevPlanning` once and they don't re-occur.

---

## Slop Findings — Post-pilot expansion track (AISlopReviewer — 2026-05-01)

The 2026-04-30 review above covered SEOI-1 through SEOI-7. The post-pilot expansion track (SEOI-8 through SEOI-11) was added in commit `389beb7` after that review and needs its own pass. Per-sprint findings live in each sprint file under their own "## Slop Findings (AISlopReviewer — 2026-05-01)" section. This subsection captures the cross-cutting concerns that span SEOI-8 through SEOI-11.

### Cross-cutting P1

- **CC-P1. Data-model fragmentation across SEOI-6, SEOI-9, SEOI-11.** The schema now has FOUR overlapping shapes for "approved-or-candidate SEO action with target/source/measurement metadata":
  - `SeoAgentAction` (SEOI-4) — auto-shipped change with rollback + single 7-day measured delta (`measuredDelta: Json?`)
  - `SeoProposal` (SEOI-6) — post-finding draft (GSC evidence exists; specific page+keyword pair)
  - `SeoExperiment` (SEOI-9) — approved action with scheduled measurement checkpoints (D+14/D+28/D+56) + `metricsBeforeJson` / `metricsAfterJson`
  - `KeywordOpportunity` (SEOI-11) — pre-impression demand scouting (no GSC evidence yet)
  
  The shapes ARE genuinely different (cardinality, lifecycle, evidence requirements differ), but the difference is invisible from the schema alone. Without an explicit taxonomy, future devs will either merge two of them by accident, fork a fifth, or duplicate functionality across them.
  
  **Fix:** add the 4-row taxonomy above to this PLAN's "Data Model Summary" section. Add Prisma `///` comments on each model's first line referencing the taxonomy and the table's specific role. Add a top-of-file comment on `experimentLedger.ts` distinguishing it from `feedbackMeasurement.ts`. Category 2 (Inconsistency / drift if undocumented) + Category 1.1 (Parallel helpers risk).

### Cross-cutting P2

- **CC-P2-1. Per-route `requireAdmin` not specified in any of the four post-pilot sprints.** SEOI-8/9/10/11 each add new admin endpoints without explicitly stating that they follow the per-route `adminRouter.METHOD('/path', requireAdmin, ctrl)` pattern (canonical: `server/src/routes/glossary.ts:69-86`; existing `seoAdmin.ts` already follows it). Each sprint's per-sprint section flags this individually as P2-S1. The fix is uniform: add an explicit one-line note under the route-task in each sprint.
- **CC-P2-2. Lazy admin page imports not committed in any of the four post-pilot sprints.** SEOI-8 (clusters page or tab — undecided), SEOI-9 (`SeoExperimentsPage`), SEOI-10 (`SeoPackagingPage`), SEOI-11 (`SeoKeywordPortfolioPage`) all introduce new admin pages but none explicitly call out the `const PageName = lazy(() => import(...))` addition to `src/App.tsx` that SEOI-2/4/6 followed. Each sprint flags this as a P2 finding. The cross-cutting fix: add an explicit lazy-import sub-task to each new-page sprint as a sprint-template default.
- **CC-P2-3. Audit-vs-generate boundary on `serpPackagingAudit.ts` (SEOI-10).** The packaging audit must read what the existing Sprint-SEO-1 through SEO-7 foundation services produce (canonical tags, sitemap, structured data, breadcrumbs) and flag drift, NOT regenerate them. SEOI-10's per-sprint section flags this as P1-S1 with a top-of-file boundary comment as the fix.

### Cross-cutting P3

- **CC-P3-1. URL pattern coupling.** SEOI-10 hardcodes `/news` and `/news/:id` in `serpPackagingAudit.ts`. SEOI-11 implies SERP-sampling URLs hardcoded into `keywordDiscovery.ts`. Cleanup-when-touched: read URL patterns from a constants file or the React Router config rather than hardcoding strings inside services.

### Cross-cutting Slop Avoided (call out — these patterns continue from the pilot review)

- **No parallel `Subject` taxonomy across all four sprints.** GSC clusters (SEOI-8), topic pods (SEOI-9), packaging audits (SEOI-10), and keyword portfolio (SEOI-11) all operate on **operational data** (GSC findings, audit results, discovery candidates), not on **content classification**. None bypasses `Subject` + `ContentSubject` per `subject-taxonomy.md` rule.
- **Extension over fork.** SEOI-8 extends `bucketClassifier.ts` (page-type allowlist), SEOI-9 extends `briefGenerator.ts` (cluster-source proposals), SEOI-10 extends `SeoProposal.proposalType` (evergreen-routing as enum value, not new model). Category 1.1 (Parallel helpers) avoided structurally.
- **No broad SEO suite, proxy stack, or multi-vendor SERP layer introduced.** SEOI-8 explicitly defers vector clustering. SEOI-11 may use Serper, but only as a search-only, cache-first, budget-capped enrichment layer with auto-top-up off. Avoids Category 4 (Over-engineering) + Category 13 (Dependency hygiene).
- **Auto-ship discipline preserved across the expansion.** SEOI-8's page-type expansion explicitly excludes `BlogPost.bodyMarkdown`. SEOI-10's H1/schema/canonical/internal-link changes stay human-only. The "metadata-only auto-ship" hard cap from SEOI-4 survives the expansion.
- **Killswitch (`SSM /ai-timeline/prod/seo-agent-paused`) respected by every new surface.** Every SEOI-8/9/10/11 admin flow honors paused → read-only mode. No surface bypasses the pause.
- **Test paths uniformly at `/tests/unit/`** across all four sprints. The pilot's C-X1 test-path drift (where SEOI-1 through SEOI-7 originally had `__tests__/` colocated paths and were corrected) does NOT recur in SEOI-8 through SEOI-11 — the post-pilot plans were authored with the corrected convention from the start.
- **No `mcp__claude-in-chrome__*`, no `VITE_*` secrets, no manual AWS console steps, no backwards-compat shims** in any of the four post-pilot sprints. Discipline carries forward from the pilot.

### Verdict (post-pilot)

**Minor adjustments.** The expansion track respects every centralized-system rule the pilot established. The single P1 (data-model fragmentation across SEOI-6/9/11) is a documentation fix, not structural rework — the four tables ARE genuinely distinct, but the schema alone doesn't communicate that. Adding the 4-row taxonomy to this PLAN + Prisma `///` comments closes it.

The recurring P2 patterns (per-route `requireAdmin`, lazy imports) are sprint-template-shape findings, not architectural problems — the *first* sprint to land in this track (likely SEOI-8) should establish the explicit defaults and the others should inherit. Worth folding into the next `/AIDevPlanning` skill update so future sprints surface these by default rather than requiring an AISlopReviewer pass to catch them.

**Composition note:** if SEOI-8 ships and the deterministic clustering produces noisy clusters on real data, **run `/AISEOReview`** on a representative sample of cluster-backed proposals before SEOI-9's experiment ledger ships — that adds the SERP-winnability lens (does the cluster actually represent winnable demand?) which AISlopReviewer doesn't cover.

---

## UX Lead Review (2026-04-30)

Reviewed against LAEA's actual frontend conventions and the small `src/components/ui/` primitives library. The initiative is **admin-only** — no public surface — so the UX bar is *desktop-first power-user productivity* rather than mobile-first reading experience. Per-sprint findings live in each sprint file under their own "## UX Lead Review" section. This section captures cross-cutting concerns.

### Cross-cutting UX risks

- **UX-X1. Admin pages do not currently support dark mode parity.** Verified across the existing admin codebase: `AdminLayout.tsx` is hardcoded `bg-gray-100` for content + `bg-gray-900` for sidebar (no `dark:` variants). Existing admin pages are inconsistent: `AdminDashboard.tsx` has 0 `dark:` instances, `BlogAdminListPage.tsx` has 23, `IngestedArticlesPage.tsx` has 2. **Decision needed for this initiative**: either (a) match existing admin styling and ship single-theme admin pages (consistent with most of the admin CMS), or (b) commit to dark-mode-parity for new admin pages and treat it as a forcing function for backfilling the rest of the admin (separate sprint). **Default recommendation: (a) for SEOI-2, SEOI-4, SEOI-5, SEOI-6, SEOI-7 — match `AdminLayout` styling convention (`bg-gray-100` content area + `bg-white` cards), so all new pages are visually consistent with sibling admin pages. Add a follow-up note in the slop ledger to backfill admin dark mode at large.** Each sprint's review section flags this with explicit Tailwind class conventions to use.
- **UX-X2. Three new tab-nav surfaces — no existing `Tabs` component.** SEOI-2 introduces "4-tab nav: Winnable Losses · Content Gaps · Trend Signals · Decay." SEOI-4 adds "tab nav at the top of `SeoInsightsPage` so users can switch between Insights and Actions views" (which becomes 3 tabs after SEOI-6 adds Proposals). SEOI-6 reuses that same outer tab nav + adds inner status tabs (Pending · Drafting · Approved · Rejected) on the proposals page. **That's 4 distinct tab-nav placements introduced by this initiative.** Verified `src/components/ui/` does not contain a `Tabs` primitive today. **Recommendation: add a shared `<Tabs>` component to `src/components/ui/` in SEOI-2 (the first sprint that needs tabs)** — with `dark:` coverage even if the rest of the page is single-theme, so the component itself is theme-ready. Reuse across SEOI-4 and SEOI-6. Avoids three independently-styled tab implementations drifting apart over time.
- **UX-X3. Three new "drawer" patterns — no existing right-side drawer in the codebase.** SEOI-2 Task 6 ("detail drawer slides from side"), SEOI-4 Task 6 ("View Diff opens a side panel"), SEOI-6 Task 6 ("View Detail drawer opens with full brief"). Verified: existing project drawer-shaped components are `ChatPanel` (floating bottom-right popup) and `FilterPanel` (left-side filters) — neither is a generic side drawer. **Decision needed: define what "drawer" means in this initiative.** Options:
  - **A. Modal sheet** (overlay-style, centered, matches existing `ConfirmDialog`/`GlobalSearch` precedent — no new pattern needed)
  - **B. Right-side slide-in panel** (new pattern; if introduced, add `<Drawer>` to `src/components/ui/`)
  - **Default recommendation: B — new shared `<Drawer>` primitive** added to `ui/` in SEOI-2 (which is the first to need it). Right-side slide-in is the better UX for keeping the source list visible while inspecting one item. Reuse across SEOI-4 and SEOI-6. Don't ship 3 independent drawer implementations. Mobile spec: at `<sm`, drawer becomes full-screen modal sheet (no room for split view at 375px).
- **UX-X4. `<ConfirmDialog>` already exists at `src/components/ui/ConfirmDialog.tsx` and is used in 3 admin pages today** (`BlogAdminListPage`, `MilestonesListPage`, `BlogEditorPage`). **All destructive flows in this initiative MUST reuse it** — rollback (SEOI-4), reject proposal (SEOI-6), pause (SEOI-5 — hot debatable since it's not destructive in the data-loss sense, but the killswitch framing argues for it). Each sprint's review flags this individually.
- **UX-X5. No empty-state component in `ui/` library yet.** All 4 buckets (SEOI-2), the actions audit log (SEOI-4), and the proposals queue (SEOI-6) need empty states ("No winnable-loss findings this week", "No actions shipped yet", "No pending proposals"). **Recommendation: propose an `<EmptyState>` primitive** in SEOI-2 (the first sprint that needs it), put it in `src/components/ui/`, reuse across SEOI-4 and SEOI-6. Same pattern as `<ErrorState>` (which already exists). Empty-state copy needs to communicate that emptiness here is *expected* (no slop signal), not a failure.

### Cross-cutting initiative DoD additions (UX quality gates)

Add to the initiative-level Definition of Done:

- [ ] All 3 new admin pages render correctly in light theme (matching `AdminLayout` `bg-gray-100` convention)
- [ ] Responsive verified at 375px (mobile), 768px (tablet), 1280px (desktop) — primary surface is desktop, but mobile must degrade gracefully (no horizontal scroll on the page chrome itself; tables MAY scroll horizontally with explicit overflow indicators)
- [ ] Lighthouse Accessibility ≥95 on each new admin page — keyboard reach, focus management on drawer/modal, ARIA labels on icon-only buttons (pause toggle especially)
- [ ] `prefers-reduced-motion` respected on every drawer slide-in animation
- [ ] All color-coded indicators (drift severity green/yellow/red, action status chips, bucket scores) have a non-color alternative (icon + text label) — color-blind users must be able to use the dashboard
- [ ] Three new shared `ui/` primitives (Tabs, Drawer, EmptyState) added in SEOI-2 with full dark-mode coverage, ready for reuse beyond this initiative

### What's verified UX-correct

- **3-page IA with 1 sidebar nav entry + internal tab nav is the right call.** Promoting all 3 admin pages to top-level sidebar entries would over-promote a single feature. The `/admin/seo-insights` parent + internal tabs (Insights · Actions · Proposals) is correct IA. AdminLayout's existing breadcrumb logic (`getBreadcrumbs(location.pathname)`) handles sub-routes.
- **`<ErrorState>` and `<LoadingSkeleton>` are already-shipped, dark-mode-ready primitives** (`src/components/ui/`) — every plan's data-dependent surface should use them. Each sprint's review flags this individually.
- **`react-hot-toast` is wired globally for transient feedback** — every action's success/failure toast goes through it (no one-off notification UI).
- **Pause-switch placement on the operational banner above the tabs is correct** — the killswitch lives where the user goes to monitor SEO actions, which is the natural surface to flip it. No need to globalize it into AdminLayout sidebar (would over-promote).
- **`data-testid` convention** for admin nav (`nav-${label.toLowerCase()}`) and sidebar (`admin-sidebar`) verified — new entry must follow.
- **No public-site UX patterns leaking into admin or vice versa.** Initiative is correctly scoped to admin density + power-user productivity, not public-site mobile-first reading experience.

### Status

**UX-ready after the per-sprint additions are absorbed.** No initiative-level rework. Three shared `ui/` primitives (`<Tabs>`, `<Drawer>`, `<EmptyState>`) are the most leveraged adds — they pay back across all 3 new admin pages plus future admin work.
