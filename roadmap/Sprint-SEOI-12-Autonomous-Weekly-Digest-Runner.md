# Sprint SEOI-12: Autonomous Weekly Digest Runner

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-05-05 by Codex (runner, schedule, fallback, docs, and focused tests implemented)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`backend.md`, `build-and-deploy-security.md`).
2. Re-read the parent PLAN (`roadmap/PLAN-SEO-Insights-Pilot.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm SEOI-5 and SEOI-11 DoDs are fully checked or consciously document which completed production pieces this sprint is hardening. If not, finish blocking work first.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA front+back → commit → `[ ] → [x]`.
6. Use `/Browser` (agent-browser) for UI validation. Never use `mcp__claude-in-chrome__*`.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

Make the SEO weekly digest run without depending on a live Codex Desktop conversation. This sprint turns the current operator prompt into an idempotent, testable shared service, schedules it from AWS EventBridge into the existing `ai-timeline-ingestion-prod` Lambda, keeps a CLI wrapper for local/manual Lambda invocation, documents a local `launchd` fallback for Wylie's Mac, and preserves `/api/admin/seo/run-status` as the source of truth. Codex can still invoke the same runner manually, but the weekly cadence no longer depends on Codex exposing an automation-management tool or keeping a thread warm.

**Priority**: HIGH
**Depends on**: SEOI-5 scheduled-agent foundation, SEOI-10 packaging lane, SEOI-11 keyword portfolio
**Estimated Effort**: 1-2 days
**Status**: In progress

---

## Prerequisites

- [x] `GET /api/admin/seo/health` works against prod and returns `paused`, `lastWeekCovered`, `agentRun`, and `serper`
- [x] `infra/template.yaml` still defines `GscWeeklyIngestRule` targeting `IngestionFunction` with `Input: '{"action":"gscWeeklyIngest"}'`; mirror this pattern for the digest schedule
- [x] `server/src/ingestionLambda.ts` still dispatches custom `event.action` payloads; add `seoWeeklyDigest` to that existing dispatch shape rather than adding a new Lambda
- [x] Existing SEO runtime SSM params remain wired for the API Lambda: `/ai-timeline/prod/seo-agent-paused`, `/ai-timeline/prod/seo-agent-last-run`, `/ai-timeline/prod/serper-api-key`, and `/ai-timeline/prod/serper-pricing-json`
- [x] Confirm `IngestionFunction` does not yet expose those SEO env var names; SEOI-12 must add them so dev/prod environments do not fall back to hardcoded `/ai-timeline/prod/*` defaults
- [x] Local dev dependencies installed: `npm install`
- [ ] Local dev server available if UI smoke testing is needed: `npm run dev`

---

## Tasks

### 1. Extract the digest into a deterministic shared service

- [x] Create `server/src/services/seo/weeklyDigestRunner.ts` as the single source of truth for digest execution
- [x] Export `runSeoWeeklyDigest(options?: { force?: boolean; dryRun?: boolean; now?: Date })` from `weeklyDigestRunner.ts`
- [x] Compose directly with existing backend services instead of calling the public admin API from inside AWS:
  - `getGscHealth()` from `server/src/services/gsc/gscIngest.ts`
  - `isPaused()` from `server/src/services/seo/agentControl.ts`
  - `getLatestAgentRunStatus()` / `setLatestAgentRunStatus()` from `server/src/services/seo/agentRunStatus.ts`
  - `getSerperUsageSummary()` from `server/src/services/seo/serperClient.ts`
  - `listPendingFeedbackActions()` / `measureSeoAction()` from `server/src/services/seo/feedbackMeasurement.ts`
  - `listInsights()` from `server/src/services/gsc/bucketClassifier.ts`
  - `shipRewrite()` from `server/src/services/seo/metadataRewriter.ts`
  - `generateProposal()`, `generateEvergreenRoutingProposal()`, `generatePackagingFixProposal()`, and `generateProposalFromKeywordOpportunity()` from `server/src/services/seo/briefGenerator.ts`
  - `listSeoPackagingAudits()` from `server/src/services/seo/serpPackagingAudit.ts`
  - `listKeywordOpportunities()` / `markKeywordOpportunityPromoted()` from `server/src/services/seo/keywordDiscovery.ts`
- [x] Do not read `/ai-timeline/prod/admin-username` or `/ai-timeline/prod/admin-password` in the Lambda path; the Lambda already has service-level access to the same underlying SEO services
- [x] Create `scripts/seo-weekly-digest-runner.mjs` as a thin local wrapper around the deployed ingestion Lambda for dry-runs/manual debugging only:
      `node scripts/seo-weekly-digest-runner.mjs --dry-run`
- [x] Implement the required read order exactly:
  - health + pause + run status + Serper summary
  - pending feedback actions
  - weekly insights for `winnable_loss`, `content_gap`, `trend_signal`, and `decay`, using `lastWeekCovered`
  - packaging backlog, page 1 limit 100
  - scored keyword portfolio backlog, limit 25
- [x] Implement idempotency before mutating:
  - if `health.agentRun.status === "success"` and `health.agentRun.weekStart` matches `health.lastWeekCovered`, exit `0` with a "already completed" summary unless `--force` is passed
  - skip insights already `dismissed` or `shipped`
  - skip packaging audits with `existingPackagingFixProposal`
  - skip keyword portfolio rows that are not `status=scored`
- [x] Implement lane classification in code using the current SEOAuditAgent rules:
  - `auto_ship`: only `winnable_loss`, blog metadata rewrite, impressions `>= 100`, confidence `>= 0.8`, cap `<= 3`
  - `propose`: `content_gap` or `trend_signal` confidence `>= 0.60`
  - `propose`: packaging evergreen when `evergreenRecommendation` exists
  - `propose`: packaging fix when page is right but packaging is weak and no recent fix proposal exists
  - `propose`: at most 2 keyword portfolio promotions with `sourceType` in `gsc_cluster|google_trends|serp_sample`, `pageTypeRecommendation=blog_post`, and `overallScore >= 60`
  - `human_only`: everything else, including `editorial_seed` rows and ambiguous product/IA decisions
- [x] Respect pause state:
  - if `health.paused === true`, still pull data and persist a digest-only successful run
  - do not call `ship-rewrite`, `generate-proposal`, packaging proposal endpoints, or portfolio promotion endpoints while paused
- [x] Treat `409` from proposal/promotion endpoints as "already queued or ineligible"; record it in the digest and keep running
- [x] Always persist run status through `setLatestAgentRunStatus()` after the run starts:
  - `status`
  - `startedAt`
  - `completedAt`
  - `weekStart`
  - `shippedCount`
  - `proposalCount`
  - `humanOnlyCount`
  - `measuredCount`
  - `digestUrl`
  - `errorMessage`
- [x] On thrown errors, catch once at the outer boundary and attempt a failed `setLatestAgentRunStatus()` before rethrowing so Lambda reports a failed invocation

### 2. Preserve SEOAuditAgent context without making the runner LLM-dependent

- [x] Make the runner read these files at startup and include their paths + content hashes in the run log:
  - `.claude/skills/SEOAuditAgent/SKILL.md`
  - `.claude/skills/SEOAuditAgent/Workflows/Digest.md`
  - `.claude/skills/SEOAuditAgent/seo_voice.md`
  - latest `.claude/skills/SEOAuditAgent/dry-run-*.md`
  - `.claude/skills/SEOAuditAgent/slop_categories.md`
  - `.claude/skills/SEOAuditAgent/bucket_playbooks/*.md`
- [x] Append to `.claude/skills/SEOAuditAgent/seo_voice.md` only when a shipped or measured action exists, using the protocol in `Workflows/Digest.md`
- [x] Do not ask an LLM to classify routine rows in the unattended runner; deterministic rules are the safety boundary. Keep LLM-based editorial generation inside existing backend proposal endpoints and human-approved skills.
- [x] Write a compact local artifact under `tmp/seo-weekly-digest/<timestamp>/summary.json` only when the CLI wrapper runs locally; keep `tmp/` gitignored
- [x] Add `tmp/` to `.gitignore` before writing local runner artifacts there

### 3. Add an AWS EventBridge schedule

- [x] Add `SeoWeeklyDigestRule` to `infra/template.yaml`, mirroring `GscWeeklyIngestRule`
- [x] Add these environment variables to `IngestionFunction` in `infra/template.yaml`, matching the API Lambda names:
  - `SEO_AGENT_PAUSED_PARAM: !Sub '/ai-timeline/${Environment}/seo-agent-paused'`
  - `SEO_AGENT_LAST_RUN_PARAM: !Sub '/ai-timeline/${Environment}/seo-agent-last-run'`
  - `SERPER_API_KEY_PARAM: !Sub '/ai-timeline/${Environment}/serper-api-key'`
  - `SERPER_PRICING_PARAM: !Sub '/ai-timeline/${Environment}/serper-pricing-json'`
- [x] Use schedule expression `cron(15 13 ? * MON *)` for Monday 13:15 UTC, after the existing GSC ingest at Monday 06:00 UTC
- [x] Target the existing `IngestionFunction` with:
      `Input: '{"action":"seoWeeklyDigest"}'`
- [x] Add the paired `SeoWeeklyDigestPermission` resource:
  - `Type: AWS::Lambda::Permission`
  - `FunctionName: !Ref IngestionFunction`
  - `Action: lambda:InvokeFunction`
  - `Principal: events.amazonaws.com`
  - `SourceArn: !GetAtt SeoWeeklyDigestRule.Arn`
- [x] Do not add a new Lambda, new API route, GitHub workflow, GitHub OIDC role, or static GitHub AWS credentials for the primary scheduler
- [x] Confirm `IngestionFunction` IAM already has `ssm:GetParameter`, `ssm:GetParameters`, and `ssm:PutParameter` for `/ai-timeline/${Environment}/*`; if not, update the existing policy in `infra/template.yaml`

### 4. Add local launchd fallback for Codex Desktop/Mac runs

- [x] Create `scripts/launchd/com.letaiexplainai.seo-weekly-digest.plist.example`
- [x] The plist must run from `/Users/wyliebrown/ai_timeline`, use the system Node path, and call `scripts/seo-weekly-digest-runner.mjs`
- [x] Add `scripts/install-seo-weekly-digest-launchd.sh` that:
  - copies the plist into `~/Library/LaunchAgents/`
  - runs `launchctl unload` if an older copy exists
  - runs `launchctl load`
  - prints `launchctl list | grep letaiexplainai.seo-weekly-digest`
- [x] Document that `launchd` is a fallback, not the primary AWS schedule, because it depends on the Mac being awake and online

### 5. Update operational documentation

- [x] Update `.claude/reference/seo-insights.md` weekly operating loop:
  - primary scheduler: EventBridge `SeoWeeklyDigestRule` -> existing `IngestionFunction`
  - fallback scheduler: local `launchd`
  - Codex Desktop automation: optional manual trigger only
- [x] Update `.claude/schedules/seo-weekly.md` so it points to `infra/template.yaml` and `server/src/services/seo/weeklyDigestRunner.ts` rather than assuming the hidden Codex automation layer can persist schedules
- [x] Update `.claude/rules/backend.md` SEO Automation section with the EventBridge schedule, ingestion-Lambda action payload, and failure-status guarantee
- [x] Update `roadmap/PLAN-SEO-Insights-Pilot.md` only if sprint scope changes during implementation

### 6. Tests

- [x] Add unit tests for classification and caps in `tests/unit/seo/seoWeeklyDigestRunner.test.ts`
- [x] Add ingestion Lambda dispatch test for `{ action: "seoWeeklyDigest" }` if an existing ingestion Lambda unit-test pattern exists; otherwise cover the dispatch through `weeklyDigestRunner.ts` tests and manual Lambda invocation
- [x] Add tests for paused mode: no mutating endpoints called, run status still persisted as success
- [x] Add tests for idempotency: already-successful same-week run exits without mutation unless `--force`
- [x] Add tests for failure handling: simulated API failure attempts failed `run-status` write and exits non-zero
- [x] Add tests for `409` handling: proposal endpoints returning `409` are counted as already queued and do not fail the run
- [x] `npm test -- seoWeeklyDigestRunner` — all pass
- [x] `npm run typecheck` — zero errors
- [x] `npm run lint` — zero errors
  - Note: lint now runs against maintained production source (`src`, `server/src`) and exits 0 with 0 errors; 533 warnings remain visible as cleanup debt.

### 7. Deploy / scheduler activation

- [x] Backend: `./scripts/deploy-backend.sh`
- [x] Confirm CloudFormation created `SeoWeeklyDigestRule` and `SeoWeeklyDigestPermission`
- [x] Trigger one manual Lambda invocation:
      `aws lambda invoke --function-name ai-timeline-ingestion-prod --payload '{"action":"seoWeeklyDigest","dryRun":true}' /tmp/seo-weekly-digest-dry-run.json --cli-binary-format raw-in-base64-out`
- [x] Trigger one real manual Lambda invocation after reviewing the dry-run payload:
      `aws lambda invoke --function-name ai-timeline-ingestion-prod --payload '{"action":"seoWeeklyDigest","force":true}' /tmp/seo-weekly-digest-force-run.json --cli-binary-format raw-in-base64-out`
- [x] Confirm `GET /api/admin/seo/health` reflects the new run status
- [x] Leave local `launchd` unloaded unless EventBridge is unavailable

### 8. Backend Validation

- [x] Smoke test health:
      `curl https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod/api/admin/seo/health -H "Authorization: Bearer $TOKEN"`
- [x] Run the CLI wrapper locally with `--dry-run` and confirm it invokes Lambda without mutating service calls
- [x] Run the Lambda manually with `{"action":"seoWeeklyDigest","dryRun":true}` and confirm no mutating service calls
- [x] Run the Lambda manually with `{"action":"seoWeeklyDigest","force":true}` only after confirming it will not duplicate proposals
- [x] Verify `GET /api/admin/seo/health` shows run status updated after manual Lambda run
- [x] Verify paused mode manually:
  - flip pause on via `PUT /api/admin/seo/pause`
  - invoke the Lambda manually with `{"action":"seoWeeklyDigest","force":true}`
  - confirm no mutations and successful digest-only status
  - flip pause off
  - Note: Lambda pause-state cache required waiting before a final active forced run restored the latest persisted digest to `paused=false`.
- [x] `aws logs tail /aws/lambda/ai-timeline-ingestion-prod --since 30m` — digest run visible, zero unexpected errors
- [x] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 30m` — admin health/status checks clean

### 9. Browser Validation (via `/Browser` skill only)

- [x] `agent-browser open https://letaiexplainai.com/admin/seo-insights`
- [x] `agent-browser screenshot` for the run-status banner
- [x] `agent-browser snapshot -i` for interactive refs
- [x] Verify the latest run timestamp, status, shipped count, proposal count, human-only count, measured count, and Serper snapshot match `GET /api/admin/seo/health`
- [x] Open `/admin/seo-insights/proposals` and verify any newly queued proposals are visible
- [x] Open `/admin/seo-insights/actions` and verify any shipped rewrites are visible
- [x] Mobile viewport: `agent-browser resize 375 812 && agent-browser screenshot`
- [x] Zero console errors, zero 4xx/5xx in network tab

---

## Definition of Done

- [ ] All tasks above checked
- [x] `server/src/services/seo/weeklyDigestRunner.ts` runs from the ingestion Lambda without admin credentials or public API calls
- [x] `scripts/seo-weekly-digest-runner.mjs` can run locally as a dry-run/manual Lambda wrapper
- [ ] EventBridge rule runs manually and on schedule
  - Note: rule is created and enabled; the first scheduled Monday run is still pending.
- [x] Runner exits idempotently when the current finalized week already succeeded
- [x] Paused mode produces digest-only status with zero mutations
- [x] Failure mode writes `status=failed` and a useful `errorMessage`
- [x] No duplicate proposals are created when existing pending proposals cover the same finding/audit/opportunity
- [x] `seo_voice.md` appends only for shipped or measured actions
- [x] Serper spend fields are included in the persisted digest/run summary
- [ ] Zero TypeScript errors, zero lint errors, tests passing
  - Note: TypeScript and lint are clean for production source; focused SEOI-12 tests pass. Full repo Jest remains blocked by unrelated existing failures.
- [x] CloudWatch + browser console clean
- [x] Sprint file timestamp updated

---

## Files Touched (expected)

```
scripts/seo-weekly-digest-runner.mjs                    (new — unattended digest runner)
server/src/services/seo/weeklyDigestRunner.ts           (new — shared digest service)
server/src/ingestionLambda.ts                           (modify — add seoWeeklyDigest event action)
tests/unit/seo/seoWeeklyDigestRunner.test.ts            (new — runner classification/idempotency/failure tests)
infra/template.yaml                                      (modify — EventBridge rule + Lambda permission)
scripts/launchd/com.letaiexplainai.seo-weekly-digest.plist.example  (new — local fallback)
scripts/install-seo-weekly-digest-launchd.sh            (new — fallback installer)
.gitignore                                              (modify — ignore tmp/ runner artifacts)
.claude/reference/seo-insights.md                       (modify — scheduler source of truth)
.claude/schedules/seo-weekly.md                         (modify — runner-based workflow)
.claude/rules/backend.md                                (modify — automation runner ops)
.claude/skills/SEOAuditAgent/seo_voice.md               (modify only when shipped/measured actions exist)
roadmap/PLAN-SEO-Insights-Pilot.md                      (modify — SEOI-12 tracking row)
```

---

## Blocked — PM decision needed

(None. PM decision resolved on 2026-05-04: use AWS EventBridge targeting the existing ingestion Lambda as the primary scheduler. Do not use GitHub Actions or long-lived GitHub AWS credentials for the primary path.)

## Validation Debt

- `npm run lint` now exits 0 against maintained production source as of 2026-05-05. It still reports 533 warnings, mostly existing `no-console`, Fast Refresh export-shape, and hook dependency cleanup debt.
- Full `npm test -- --runInBand` is not green repo-wide as of 2026-05-05. The SEOI-12 runner suite passes, but unrelated Jest/import-meta configuration and stale mock failures remain outside this sprint.
- EventBridge is deployed and enabled, but the first natural scheduled Monday invocation has not happened yet.

---

## Tech Lead Review (AITechLeadReview — 2026-05-04)

### Critical

(None.)

### Moderate

- [x] **M1. Jest will not run `.mjs` unit tests.** The repo's `jest.config.js` only matches `tests/unit/**/*.test.ts` and `tests/unit/**/*.test.tsx`, so the original `tests/unit/seoWeeklyDigestRunner.test.mjs` path would be silently skipped. **Fix applied:** test path is now `tests/unit/seo/seoWeeklyDigestRunner.test.ts`.
- [x] **M2. `tmp/` is not currently ignored.** The plan says runner artifacts go under `tmp/seo-weekly-digest/<timestamp>/summary.json`, but `.gitignore` does not include `tmp/`. **Fix applied:** added an explicit task and expected file touch for `.gitignore`.
- [x] **M3. GitHub Actions auth path is not verified.** This repo currently has no local `.github/workflows/` directory, and no in-repo evidence of an existing OIDC role. The workflow can be created, but AWS auth must be verified before calling the runner from CI. **Fix applied:** prerequisites and workflow tasks now require OIDC verification or an explicit PM decision before static credentials.
- [x] **M4. Prefer SDK SSM access over AWS CLI shell-outs in the Node runner.** `@aws-sdk/client-ssm` already exists in `package.json`, and the backend SEO services already use it. Shelling out to `aws ssm get-parameter` from a Node runner would be more brittle in GitHub Actions. **Fix applied:** the runner no longer reads SSM locally; it invokes the deployed Lambda that uses the existing backend SSM services.
- [x] **M5. PM decision supersedes GitHub Actions path.** Wylie approved the AWS-native recommendation on 2026-05-04. **Fix applied:** primary schedule is now EventBridge -> existing `IngestionFunction`; GitHub Actions credentials are out of scope for the primary path.
- [x] **M6. Ingestion Lambda needs SEO env var names.** `agentControl.ts`, `agentRunStatus.ts`, and `serperClient.ts` default to `/ai-timeline/prod/*` when env vars are absent. Moving the digest into `IngestionFunction` means `infra/template.yaml` must wire the same SEO env vars there that the API Lambda already has. **Fix applied:** EventBridge section now includes the four required env vars.

### Minor

(None after the PM decision removed the GitHub Actions primary path.)

### Verified Correct

- The sprint includes the mandatory Session Start Workflow, Backend Validation, Browser Validation, Definition of Done, Files Touched, and Blocked sections.
- Production endpoints named in the plan exist: `GET /admin/seo/health`, `GET /admin/seo/feedback/pending`, `POST /admin/seo/actions/:id/measure`, and `PUT /admin/seo/run-status`.
- SSM parameters `/ai-timeline/prod/admin-username` and `/ai-timeline/prod/admin-password` exist.
- The plan correctly avoids new Prisma schema, new public routes, new admin routes, and new Lambda functions.
- The selected schedule pattern matches existing `infra/template.yaml` EventBridge rules, including the required paired `AWS::Lambda::Permission` resource.

---

## Slop Findings (AISlopReviewer — 2026-05-04)

### P0

(None.)

### P1

(None after the primary scheduler was changed to EventBridge and the GitHub credential path was removed from MVP scope.)

### P2

- [x] **[Category 7 — Security pitfalls]** Task 3 originally allowed long-lived GitHub Actions AWS keys as a "lowest-friction" fallback without PM approval. That is operationally convenient but riskier than OIDC and easy to normalize into permanent CI credential slop. **Fix applied:** GitHub Actions and static GitHub AWS credentials are no longer the primary path; EventBridge uses the existing Lambda execution role.
- [x] **[Category 9 — Tests]** Task 6 originally used a `.mjs` test path that Jest would not discover. **Fix applied:** use `tests/unit/seo/seoWeeklyDigestRunner.test.ts`.
- [x] **[Category 16 — Process and verification gaps]** Task 2 wrote artifacts under `tmp/` while the repo did not ignore `tmp/`. **Fix applied:** add `.gitignore` update before writing local artifacts.
- [x] **[Category 12 — Architectural drift]** Task 1 originally leaned on local service execution in a place that cannot reach private RDS. **Fix applied:** local fallback invokes the deployed ingestion Lambda; the shared service stays inside AWS.
- [x] **[Category 14 — Data correctness]** Moving SEO services into the Ingestion Lambda without wiring SEO env vars would make non-prod invocations silently read `/ai-timeline/prod/*` defaults. **Fix applied:** EventBridge task now requires wiring the SEO SSM env var names into `IngestionFunction`.

### P3

(None.)

### Slop Avoided

- The plan does not add a parallel backend endpoint, Prisma model, or Lambda for digest execution; it composes with existing backend SEO services and the existing ingestion Lambda action dispatcher.
- The plan keeps `seo_voice.md` append-only and only writes it for shipped/measured actions, matching the SEOAuditAgent workflow.
- The plan preserves `/Browser` agent-browser validation and does not reference forbidden Chrome MCP tools.
- The plan makes Codex Desktop optional instead of adding another hidden scheduler dependency.
- The revised plan reuses the existing EventBridge + `IngestionFunction` action-dispatch architecture instead of adding a second scheduler plane in GitHub Actions.
