# Sprint Ext-1: Backend Prep — CORS + Endpoint Contract Audit

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-26 by SeniorDeveloper — Sprint Ext-1 complete (CORS allowlist updated, Lambda redeployed, smoke tests green, extension key + ID generated)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (`backend.md`, `news-ingestion.md`).
2. Re-read the parent PLAN (`roadmap/PLAN-Chrome-Extension.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm any prerequisite sprints' Definitions of Done are fully checked. (None — Ext-1 is the first.)
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA back-end (curl + CloudWatch) → commit → `[ ] → [x]`.
6. Use `/Browser` (agent-browser) for UI validation. Never use `mcp__claude-in-chrome__*`. (No UI changes in this sprint.)
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

Prepare the backend so a Chrome extension running at a `chrome-extension://<id>` origin can authenticate and submit articles using the existing endpoints. **No new endpoints, no schema changes** — this sprint is pure config + verification. The deliverable is a deployed Lambda whose CORS allowlist accepts the extension origin, plus curl-based smoke proofs that `POST /api/auth/login`, `POST /api/admin/articles/scrape`, and `POST /api/admin/articles/submit` work end-to-end when called with an extension-style `Origin` header.

**Priority**: HIGH (blocks Ext-2)
**Depends on**: None
**Estimated Effort**: 0.5 day
**Status**: ✅ Complete

---

## Prerequisites

- [x] AWS CLI authenticated (`aws sts get-caller-identity` succeeds)
- [x] `gh` or local clone has push access to deploy via `sam`
- [x] Local dev server runnable for offline iteration: `npm run dev` + `npm run dev:server`
- [x] Confirm current `CORS_ORIGIN` value in prod Lambda env: `aws lambda get-function-configuration --function-name ai-timeline-api-prod --query 'Environment.Variables.CORS_ORIGIN'`
- [x] **CORS source-of-truth check**: `CORS_ORIGIN` resolves from SSM parameter `/ai-timeline/prod/cors-origin` per `infra/template.yaml:101`, NOT from a hardcoded template value. The update path in task 3 reflects this. Confirm by reading `infra/template.yaml:95-105`.

---

## Tasks

### 1. Audit existing CORS handling

- [x] Re-read `server/src/index.ts:67-101` (CORS block) and confirm the allowlist mechanism: `CORS_ORIGIN` env var, comma-separated, `*` wildcard supported, `credentials: true` set at line 99.
- [x] **Confirmed by AITechLeadReview**: `chrome-extension://<id>` works through the existing matcher unchanged because `allowedOrigins.includes(origin)` is pure string equality (line 91). **No code change needed** — but exact-match means every distinct extension ID needs its own allowlist entry. Stable signing key (task 2) is mandatory.
- [x] Decide: do we want glob support for `chrome-extension://*` to ease multi-machine setup later? **Decision: NO** — explicit allowlist is safer for credentialed admin endpoints. Multi-machine setup will copy `key.pem` between machines so the ID stays stable, avoiding the need for a glob.
- [x] Document the current `CORS_ORIGIN` value (from SSM, not from template) and the new appended value in `Files Touched` below.

**Before**: `https://letaiexplainai.com,https://www.letaiexplainai.com`
**After**:  `https://letaiexplainai.com,https://www.letaiexplainai.com,chrome-extension://lfakkoeldmhibejkjolcmenpmlokbled`

### 2. Generate a stable extension ID for development

- [x] Generate a Manifest V3 `key` so the extension always loads with the same ID across machines. Stored at `extension/key.pem` (private, gitignored). Public-key base64 cached at `/tmp/ext-key-info.txt` for embedding into `manifest.json` in Ext-2.
- [x] Compute the extension ID that Chrome will assign for that key. Derived deterministically without needing Chrome via `sha256(public_key_DER)[:16] → hex → translate(0-9a-f → a-p)`. Result: **`lfakkoeldmhibejkjolcmenpmlokbled`**. Verified inside Chrome at sideload time in Ext-2.
- [x] Save the extension ID to `extension/EXTENSION_ID.txt` (gitignored — see task 5) so Ext-2 can read it without re-deriving.

### 3. Add the extension origin to CORS (via SSM, then redeploy)

**CORRECTED by AITechLeadReview**: `CORS_ORIGIN` is sourced from SSM parameter `/ai-timeline/prod/cors-origin` per `infra/template.yaml:101`, not a hardcoded template value. SAM/CFN resolves SSM at deploy time, so updating the param alone is not enough — the Lambda must be redeployed to pick up the new env var.

- [x] Read current value: confirmed `https://letaiexplainai.com,https://www.letaiexplainai.com`.
- [x] Append the extension origin (preserved existing comma-separated entries — `*` rejected since admin endpoints carry credentials).
- [x] Equivalent for local dev — deferred. The extension's local dev story uses `npm run dev:server` which reads from `server/.env`; can append at the time the local flow is exercised in Ext-2 task 7.
- [x] Redeploy the API Lambda. **`sam deploy` reported "No changes to deploy"** because the template body itself is unchanged when only the SSM value moved. Worked around by pushing the new value directly via `aws lambda update-function-configuration` — same value as SSM, so no drift. Documented in `.claude/rules/backend.md` so future operators don't trip on the same gotcha.
- [x] Verify the deployed Lambda picked up the new value. Output: `https://letaiexplainai.com,https://www.letaiexplainai.com,chrome-extension://lfakkoeldmhibejkjolcmenpmlokbled` ✅

### 4. Smoke test the three endpoints from the extension origin

Use `curl --header 'Origin: chrome-extension://<id>'` to simulate the extension. Run each against prod (`https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod`).

- [x] **Preflight (OPTIONS)** — `HTTP/2 204`, `access-control-allow-origin: chrome-extension://lfakkoeldmhibejkjolcmenpmlokbled`, `access-control-allow-credentials: true`, `access-control-allow-headers: Content-Type,Authorization`. ✅
- [x] **`POST /api/auth/login`** — JWT received (168 chars), saved to `/tmp/ext-jwt.txt`.
- [x] **`POST /api/admin/articles/scrape`** — arXiv 2305.10601 returned `HTTP 202`, `articleId: cmog68gb7000102l4y5i19myc`, `analysisStatus: screening`, 808 words.
- [x] **`POST /api/admin/articles/submit`** — synthetic 600-char content returned `HTTP 202`, `articleId: cmog68vwu000302l4v9l9v43w`, `analysisStatus: screening`.
- [x] **Duplicate path** — re-scraping the arXiv URL returned `HTTP 409` with `existingId: cmog68gb7000102l4y5i19myc` and full CORS headers (`access-control-allow-origin: chrome-extension://lfakkoeldmhibejkjolcmenpmlokbled`).

### 5. Documentation + housekeeping

- [x] Added `extension/dist/`, `extension/node_modules/`, `extension/EXTENSION_ID.txt`, `extension/key.pem`, `extension/.env.development`, `extension/.env.production` to `.gitignore`. Verified with `git check-ignore -v`.
- [x] Appended "Chrome extension CORS" subsection to `.claude/rules/backend.md` (covers SSM update path + the SAM "no changes" footgun).

### 6. Tests

- [x] No CORS matcher change required — exact-match works for `chrome-extension://<id>` unchanged. Skipping unit test (no code change to test).
- [x] `npm test -- cors` — N/A (no matcher change).
- [x] `npm run typecheck` — N/A for this sprint (no code change).
- [x] `npm run lint` — N/A for this sprint (no code change).

### 7. Deploy

- [x] Backend: `sam build` succeeded. `sam deploy` reported no template-level changes (expected — SSM-resolved env). Forced Lambda env refresh via `aws lambda update-function-configuration` with the new SSM value.
- [x] No migrations (no schema change).
- [x] No frontend changes.

### 8. Backend Validation

- [x] All four curl smoke tests in task 4 pass against prod with the deployed CORS update.
- [x] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 10m` — zero CORS-rejection log lines, zero unhandled errors. Only entries: expected 409 from duplicate test + unrelated `.env` security-scanner probes.
- [x] RDS pool healthy — no `prisma:warn` lines.

### 9. Browser Validation

**N/A — backend-only sprint.** No UI surface changes. Ext-2 will run agent-browser flows once the extension exists.

---

## Definition of Done

- [x] All tasks above checked
- [x] Prod Lambda's `CORS_ORIGIN` includes `chrome-extension://<id>`, verified via `aws lambda get-function-configuration`
- [x] Curl-from-extension-origin succeeds against `/api/auth/login`, `/api/admin/articles/scrape`, `/api/admin/articles/submit`
- [x] Stable extension ID (and key.pem) saved locally and ready for Ext-2 to embed
- [x] Zero TypeScript errors, zero lint errors, tests passing (no code changes in this sprint)
- [x] CloudWatch clean
- [x] `.claude/rules/backend.md` updated with the CORS note
- [x] Sprint file timestamp updated

---

## Files Touched (expected)

```
SSM /ai-timeline/prod/cors-origin              (modify via aws ssm put-parameter — NOT template.yaml)
infra/template.yaml                            (no change needed — SSM resolves at deploy time)
server/src/index.ts                            (no change expected — exact-match works for chrome-extension://)
server/src/__tests__/cors.test.ts              (new ONLY if task 1 decides to add glob support)
server/.env                                    (modify locally — gitignored)
.claude/rules/backend.md                       (modify — append CORS subsection)
.gitignore                                     (modify — extension/ build artifacts)
roadmap/Sprint-Ext-1-Backend-Prep.md           (modify — checkbox progress)
```

**Not committed (local only):**
```
extension/key.pem                              (private signing key — gitignored)
extension/EXTENSION_ID.txt                     (gitignored — derived from key)
/tmp/ext-jwt.txt                               (test JWT, ephemeral)
```

---

## Blocked — PM decision needed

(None yet. Add questions for Wylie here as they arise.)
