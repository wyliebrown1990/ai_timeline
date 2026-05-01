# Sprint SEOI-1: GSC Data Pipeline

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-30 by Codex (local implementation complete; awaiting manual Google OAuth setup + deploy)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`backend.md`, `data-models.md`, `news-ingestion.md` — the Lambda/cron pattern parallels GSC ingest).
2. Re-read the parent PLAN (`roadmap/PLAN-SEO-Insights-Pilot.md`) **Developer Workflow (MANDATORY)** section.
3. No prerequisite sprints. This is the foundation.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA front+back → commit → `[ ] → [x]`.
6. Use `/Browser` (agent-browser) for UI validation. Never use `mcp__claude-in-chrome__*`. (This sprint is backend-only — no Browser Validation needed.)
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

Stand up the data pipeline that pulls Google Search Console metrics into RDS on a weekly cadence. No detection logic, no UI, no agent — just clean data flowing reliably. Every later sprint depends on this. Includes a 90-day backfill so SEOI-2 has enough data to surface meaningful trend signals on day one.

**Priority**: HIGH
**Depends on**: None
**Estimated Effort**: 1-2 days
**Status**: In progress — code, migration, tests, and local validation complete. Remaining work is environment setup, deploy, backfill, and prod verification.

---

## Prerequisites

- [ ] Google Cloud project exists with Search Console API enabled
- [ ] OAuth client credentials downloaded locally from Google Cloud Console (desktop app client preferred; never committed)
- [ ] A Search Console owner or Full user account for `sc-domain:letaiexplainai.com` is available to complete the OAuth consent flow
- [ ] OAuth refresh token generated with `https://www.googleapis.com/auth/webmasters.readonly`
- [ ] `letaiexplainai.com` domain property is verified in Search Console
- [ ] Local dev server running: `npm run dev` + `npm run dev:server`

---

## Tasks

### 1. OAuth credentials

- [ ] Do **not** use a service account here. Search Console user management requires a valid Google Account and rejects raw service-account emails at the permissions layer.
- [ ] Generate a refresh token locally with:
  ```bash
  npm run gsc:oauth-setup -- --client-secret ~/Downloads/client_secret_<id>.json
  ```
- [ ] Create SSM parameter `/ai-timeline/prod/gsc-oauth-credentials-json` (SecureString) containing:
  ```json
  {
    "clientId": "...",
    "clientSecret": "...",
    "refreshToken": "..."
  }
  ```
- [ ] Store the OAuth credentials JSON in SSM:
  ```bash
  aws ssm put-parameter \
    --name "/ai-timeline/prod/gsc-oauth-credentials-json" \
    --type SecureString \
    --overwrite \
    --region us-east-1 \
    --value "$(cat /path/to/gsc-oauth-credentials.json)"
  ```
- [ ] Create SSM parameter `/ai-timeline/prod/gsc-site-url` = `sc-domain:letaiexplainai.com` (Search Console expects `sc-domain:` prefix for domain properties):
  ```bash
  aws ssm put-parameter \
    --name "/ai-timeline/prod/gsc-site-url" \
    --type String \
    --value "sc-domain:letaiexplainai.com"
  ```
- [ ] Update `.claude/rules/backend.md` SSM Parameters section with the two new entries

### 2. Dependencies

- [ ] Add `googleapis` to `server/package.json`:
  ```bash
  cd server && npm install googleapis
  ```
- [ ] Verify it bundles cleanly into the Lambda zip (no native deps, but check `sam build` size)

### 3. Prisma schema

- [ ] Add `GscDailyMetric` model to `prisma/schema.prisma` per the PLAN's Data Model Summary
- [ ] Make `GscDailyMetric.query` nullable and add `dataSource` (`query_detail | page_aggregate`) so query-detail rows and page aggregates can coexist without fake `query=null` detail rows
- [ ] Add `GscWeeklySnapshot` model (stub for SEOI-2 — only `bucket`, `bucketScore`, `status` left null in this sprint) with `weekStart` defined as the start of a finalized 7-day PT reporting window, not the cron fire time
- [ ] Generate migration:
  ```bash
  npx prisma migrate dev --name add_gsc_metrics
  ```
- [ ] Inspect the migration SQL — confirm indexes match the revised uniqueness rules (`@@unique([date, dataSource, query, page, device, country])`, `@@index([page, date, dataSource])`, `@@index([query, date])`)

### 4. GSC client service

- [ ] Create `server/src/services/gsc/gscClient.ts`:
  - Loads OAuth credentials JSON from SSM (cache for the Lambda lifetime)
  - Uses an OAuth2 client with the `webmasters.readonly` scope and stored refresh token
  - Returns an authenticated `searchconsole.searchanalytics` client
  - Exposes `queryDateRange({ startDate, endDate, dimensions, rowLimit, startRow })`
- [ ] Add `server/src/services/gsc/oauthSetup.ts` to run the one-time localhost OAuth consent flow and print the exact JSON shape to store in SSM
- [ ] Handle paginated responses using the API's larger page size (`rowLimit=25000` with `startRow` pagination)
- [ ] Add a helper that determines the latest finalized GSC date to ingest (PT reporting day, typically `today - 3 days`; never assume same-day freshness)
- [ ] Do **not** synthesize fake `query=null` rows for privacy-filtered traffic. Google's query tables omit anonymized rows entirely; page totals come from a separate page-aggregate pull.

### 5. Ingest service

- [ ] Create `server/src/services/gsc/gscIngest.ts`:
  - `runWeeklyIngest()` — pulls the most recent **7 finalized PT days**, not simply "the last 7 calendar days"
  - For each day, ingest two shapes into `GscDailyMetric`:
    - `query_detail`: dimensions `[date, query, page, device, country]`
    - `page_aggregate`: dimensions `[date, page, device, country]` so page-level totals still include anonymized-query traffic
  - `runBackfill(daysBack: number)` — same dual-source shape, batched per day to avoid memory pressure
  - On every run, also recompute `GscWeeklySnapshot` for the relevant finalized 7-day PT windows (no bucket assignment yet — SEOI-2)
- [ ] Use Prisma `createMany` with `skipDuplicates: true` against the `@@unique` constraint
- [ ] Log row count + duration per run; emit a `console.log` line CloudWatch can grep on

### 6. Route + Lambda integration

- [ ] Add `server/src/routes/seoAdmin.ts`:
  - `POST /api/admin/seo/ingest` (admin JWT) — manually triggers `runWeeklyIngest()`
  - `GET /api/admin/seo/health` (admin JWT) — returns `{ lastRunAt, finalizedThroughDate, lastRowCount, lastWeekCovered, totalRowsLast30d }`
- [ ] Mount in `server/src/index.ts`: `app.use('/api/admin/seo', seoAdminRouter)`
- [ ] Verify the existing `ai-timeline-api-prod` Lambda (30s timeout) is sufficient for manual triggers; the weekly cron uses the ingestion Lambda (300s) — see Task 7

### 7. Scheduled cron

- [ ] Extend the existing `ai-timeline-ingestion-prod` Lambda with a new GSC entrypoint. The cron timing is acceptable as long as the ingest always pulls the most recent **finalized** 7-day PT window rather than assuming Monday's freshest data is complete.
- [ ] In `infra/template.yaml`, add a new EventBridge rule:
  ```yaml
  GscWeeklyIngestRule:
    Type: AWS::Events::Rule
    Properties:
      ScheduleExpression: "cron(0 6 ? * MON *)"
      Targets:
        - Arn: !GetAtt IngestionFunction.Arn
          Id: GscWeeklyIngest
          Input: '{"action":"gscWeeklyIngest"}'
  ```
- [ ] Add the matching `AWS::Lambda::Permission` resource for the new rule (same pattern as `QuizGenerationSchedulePermission`)
- [ ] In the ingestion Lambda's handler, add a switch on `event.action === 'gscWeeklyIngest'` → calls `runWeeklyIngest()`
- [ ] Grant the ingestion Lambda's execution role read access to the two new SSM params

### 8. Backfill

- [ ] Add a one-shot npm script to `server/package.json`:
  ```json
  "gsc:backfill": "tsx src/services/gsc/backfill.ts"
  ```
- [ ] Run locally against prod DB after the migration deploys:
  ```bash
  export DATABASE_URL=$(aws ssm get-parameter --name "/ai-timeline/prod/database-url" --with-decryption --query "Parameter.Value" --output text)
  cd server && npm run gsc:backfill -- --days 90
  ```
- [ ] Confirm row counts for past 90 days look reasonable (>0 per day for at least the last 30; older days may legitimately be sparse)

### 9. Tests

- [ ] Unit tests for `gscClient.ts` in `tests/unit/gscClient.test.ts` (mock the googleapis client; assert pagination + finalized-date handling)
- [ ] Unit tests for `gscIngest.ts` in `tests/unit/gscIngest.test.ts` (mock the client; assert query-detail + page-aggregate idempotency and WeeklySnapshot rebuild)
- [ ] Integration test for `GET /api/admin/seo/health` in `tests/unit/seoAdmin.test.ts`
- [ ] `npm test -- gsc` — all pass
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors

### 10. Deploy

- [ ] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`
- [ ] Migrations:
      `export DATABASE_URL=$(aws ssm get-parameter --name "/ai-timeline/prod/database-url" --with-decryption --query "Parameter.Value" --output text) && npx prisma migrate deploy`
- [ ] Verify EventBridge rule exists: `aws events list-rules --name-prefix Gsc`
- [ ] Trigger one manual run via the admin endpoint to populate the table immediately
- [ ] Run the 90-day backfill against prod DB

### 11. Backend Validation

- [ ] Get a JWT and hit the manual-trigger endpoint:
  ```bash
  TOKEN=$(curl -sS -X POST https://letaiexplainai.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"...\",\"password\":\"...\"}" | jq -r .token)
  curl -sS -X POST https://letaiexplainai.com/api/admin/seo/ingest \
    -H "Authorization: Bearer $TOKEN"
  ```
- [ ] `curl https://letaiexplainai.com/api/admin/seo/health -H "Authorization: Bearer $TOKEN"` — confirm `lastRunAt` is recent and `totalRowsLast30d` is > 0
- [ ] `aws logs tail /aws/lambda/ai-timeline-ingestion-prod --since 30m` — confirm the GSC ingest log lines, zero errors
- [ ] Run a sanity SQL via the admin DB console:
  ```sql
  SELECT date, COUNT(*) FROM "GscDailyMetric" GROUP BY date ORDER BY date DESC LIMIT 10;
  ```
  Each of the last 7 days should have rows.

### Browser Validation

This sprint has no UI — skip Browser Validation. SEOI-2 will exercise it.

---

## Definition of Done

- [ ] All tasks above checked
- [ ] `GscDailyMetric` table exists in prod RDS with ≥30 days of data after backfill
- [ ] `GscWeeklySnapshot` table exists (still missing `bucket` assignments — SEOI-2 fills these in)
- [ ] EventBridge rule firing weekly is verified (manually invoke once, confirm new rows)
- [ ] Manual-trigger admin endpoint works against prod
- [ ] Health endpoint reports clean
- [ ] Zero TypeScript errors, zero lint errors, tests passing
- [ ] CloudWatch clean
- [ ] Sprint file timestamp updated

---

## Files Touched (expected)

```
prisma/schema.prisma                                       (modify — add 2 models)
prisma/migrations/<ts>_add_gsc_metrics/                    (new)
server/package.json                                        (modify — googleapis dep + backfill script)
server/src/services/gsc/gscClient.ts                       (new)
server/src/services/gsc/gscIngest.ts                       (new)
server/src/services/gsc/backfill.ts                        (new)
tests/unit/gscClient.test.ts                               (new)
tests/unit/gscIngest.test.ts                               (new)
server/src/controllers/seoAdmin.ts                         (new)
tests/unit/seoAdmin.test.ts                                (new)
server/src/routes/seoAdmin.ts                              (new)
server/src/index.ts                                        (modify — mount route)
server/src/ingestionLambda.ts                              (modify — add gscWeeklyIngest switch)
infra/template.yaml                                        (modify — EventBridge rule + SSM perms)
.claude/rules/backend.md                                   (modify — document new SSM params)
```

---

## Blocked — PM decision needed

1. **Lambda choice for the weekly cron.** ✅ **RESOLVED by tech lead review (2026-04-30):** extend `ai-timeline-ingestion-prod`. The existing SAM template already targets that single Lambda with both `IngestionScheduleRule` (daily articles) and `QuizGenerationScheduleRule` (weekly quiz) using event-input dispatch (`event.action` switching) inside `server/src/ingestionLambda.ts`. Adding a third schedule + a new `event.action` case is the established pattern. Lambda has 900s timeout and 1024 MB memory — ample for a GSC weekly pull. No new Lambda.
2. **GSC quota.** Default quota is 1,200 queries/day per project; our pull pattern uses ~50-200/run. No blocker expected, but a single 90-day backfill could spike. If the backfill fails on quota, batch it across two days instead. **No upfront decision needed; flag here in case it surfaces during Task 8.**
3. **Manual setup still required before prod verification.** OAuth client creation, one-time Search Console owner consent, and SSM population are human/environment tasks. Local code is ready; prod validation waits on these.

---

## Tech Lead Review (2026-04-30)

Verification against actual codebase. See `PLAN-SEO-Insights-Pilot.md` "Tech Lead Review" section for cross-cutting findings.

### Critical

- **C1. Wrong Lambda entrypoint file path.** Task 7 says modify `server/src/lambda/ingestion.ts` — that file does not exist. Actual entrypoint is `/Users/wyliebrown/ai_timeline/server/src/ingestionLambda.ts` (verified). SAM template's `IngestionFunction` Handler value is `ingestionLambda.handler` (`infra/template.yaml:213`). **Patch:** in Task 7, change "the ingestion Lambda's handler" target file to `server/src/ingestionLambda.ts`. Update Files Touched section accordingly.
- **C2. Test file paths use the wrong convention.** Task 9 references `server/src/services/gsc/__tests__/gscClient.test.ts` and similar. Actual project convention: tests live at `/tests/unit/*.test.ts` at the repo root (verified — no `__tests__/` folders exist anywhere in `server/src/` or `src/`; only `extension/` uses that pattern, and it's a separate package). **Patch:** rewrite Task 9 test paths to `tests/unit/gsc/gscClient.test.ts`, `tests/unit/gsc/gscIngest.test.ts`, `tests/unit/seo/seoAdmin.test.ts`. Update Files Touched section.
- **C3. Admin route mount style does not match convention.** Task 6 shows `app.use('/api/admin/seo', requireAdmin, seoAdminRouter)` — middleware applied at mount. Project applies `requireAdmin` **per-route inside the route file** (canonical example: `server/src/routes/glossary.ts:69-86`). **Patch:** declare `adminRouter` inside `server/src/routes/seoAdmin.ts`, apply `requireAdmin` per-handler (e.g. `adminRouter.post('/ingest', requireAdmin, controller.runIngest)`), then mount in `server/src/index.ts` as `app.use('/api/admin/seo', seoAdminRouter)`. Match the existing pattern exactly.

### Moderate

- **M1. Missing `AWS::Lambda::Permission` resource for the new EventBridge rule.** Task 7 adds `GscWeeklyIngestRule` but the SAM template's existing precedents (`IngestionSchedulePermission` line 293, `QuizGenerationSchedulePermission` line 318) make clear that **every EventBridge rule needs a paired `Permission` resource** — without it, EventBridge can't invoke the Lambda. **Add a new task:** create `GscWeeklyIngestPermission` (`AWS::Lambda::Permission`) modeled on lines 293-300 of `template.yaml`.
- **M2. `requireAdmin` import path unspecified.** Existing routes import from `'../middleware/authMiddleware'` (e.g. `server/src/routes/comments.ts:15`, `routes/auth.ts:10`). Both `auth.ts` and `authMiddleware.ts` exist in `server/src/middleware/` and both export `requireAdmin`; `authMiddleware.ts` is the one route files actually use. Use that exact path.
- **M3. Prisma client import.** Add a note to the service files: `import { prisma } from '../db'` (matches existing services like `seoContentGenerator.ts`).
- **M4. SSM permission for new params.** Task 7 grants the ingestion Lambda's IAM role read access to two new SSM params. The existing template grants SSM read to all `/ai-timeline/${Environment}/*` resolved at deploy time via `{{resolve:ssm:...}}` — adding these two params under the same prefix means they're already covered by the existing IAM if you wire them as Lambda env vars (lines 224-233 pattern). If kept as runtime SSM reads instead, ensure the IAM policy explicitly lists them. Either approach is fine; pick one and stick with it.

### Minor

- **Mi1. `Sourcemap: true` on the IngestionFunction BuildProperties** (template.yaml line 263) is intentional — those sourcemaps live inside the Lambda zip, not exposed to the public internet. Different rule than the frontend `.map` rule. No change needed; flagging so the implementer doesn't get confused.
- **Mi2. `--days 90` backfill flag.** Task 8 shows `npm run gsc:backfill -- --days 90`. Confirm the script accepts that flag (or use a hard-coded constant with an env var override to avoid arg-parsing complexity).

### What's verified correct

- EventBridge cron mechanism + extending `IngestionFunction` with a new event-action ✓
- Prisma model names don't collide ✓
- SSM param naming matches existing convention ✓
- 90-day backfill window is conservative and within GSC quota ✓
- Cron expression `cron(0 6 ? * MON *)` is valid EventBridge cron ✓

### Effort impact

~30 min total to apply the patches above. No DoD changes required.

---

## Slop Findings (AISlopReviewer — 2026-04-30)

Cross-references the Tech Lead Review section above where the same issue applies under both lenses. See `PLAN-SEO-Insights-Pilot.md` "Slop Findings" section for cross-cutting items.

### P0

(None.)

### P1

(None.)

### P2

- **P2-S1. Test path violation.** Cross-referenced from TLR C2: `__tests__/` colocated folders are wrong convention (project uses `/tests/unit/`). Slop framing: Category 9 (Tests / wrong directory convention).

### P3

(None.)

### Slop Avoided

- **`gscClient.ts` and `gscIngest.ts` are net-new infrastructure.** No existing service does Google Search Console API integration. Plan correctly classifies them as net-new rather than trying to extend an unrelated service.
- **EventBridge cron + Lambda event-dispatch pattern matches existing precedent.** `IngestionScheduleRule` (`infra/template.yaml:280`) and `QuizGenerationScheduleRule` (line 304) both target `IngestionFunction` with `Input` payload-based dispatch. Adding a third rule + a new `event.action` case in `ingestionLambda.ts` matches the pattern exactly. (TLR C1 fixes the file path; the *pattern* is correct.)
- **SSM parameter naming under `/ai-timeline/prod/*`** matches existing convention.
- **`Sourcemap: true` on the IngestionFunction BuildProperties** is intentional (Lambda zip contents, not public CDN) — different rule than the frontend `.map` rule. No regression.
- **Direct `prisma` import from `'../db'`** matches existing service pattern. No parallel client.
- **No backwards-compat shims** in this sprint.
