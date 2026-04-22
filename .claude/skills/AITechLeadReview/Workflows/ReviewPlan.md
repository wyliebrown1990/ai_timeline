# ReviewPlan Workflow (AITechLeadReview)

Review a roadmap sprint plan in the AI Timeline Atlas repo against the actual codebase. Verify every technical claim, identify issues, update the plan document with findings, and report a concise summary.

---

## Prerequisites

- A sprint plan document must exist under `/Users/wyliebrown/ai_timeline/roadmap/` (typically `Sprint-[Prefix]-N-*.md`).
- The parent `PLAN-[Initiative].md` should also exist in the same directory for cross-sprint context.
- You have read access to `.claude/CLAUDE.md` and `.claude/rules/*.md`.

---

## Steps

### Step 1: Read the Plan and Parent Context

1. Read the sprint plan document the user specified.
2. Read the parent `PLAN-[Initiative].md` in the same `/roadmap/` directory.
3. Read other sprint docs in `/roadmap/` that the plan references (for cross-sprint dependency context).
4. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md`.
5. Read every `.claude/rules/*.md` file relevant to the plan's scope:
   - `backend.md` — if plan touches API, Lambda, Prisma, SSM
   - `frontend.md` — if plan touches React, Vite, routing, Tailwind
   - `data-models.md` — if plan touches Prisma schema
   - `subject-taxonomy.md` — if plan touches classification, tagging, ContentSubject
   - `news-ingestion.md` — if plan touches fetchers, screening, entity extraction
   - `spam-protection.md` — if plan touches comments, votes, user-generated content

**Understand before you investigate.** Note every technical claim in the plan: file paths, line numbers, function names, Prisma model/field names, SAM template keys, SSM parameter names, React Router paths, API endpoint paths, env var names, CloudFront/S3 IDs.

---

### Step 2: Parallel Codebase Verification

Launch an Explore agent (`subagent_type: Explore`, thoroughness: `very thorough`) to verify ALL technical claims in parallel. The agent must check every category below.

#### A. File paths and line numbers
- [ ] Every file path in the plan — does it exist?
- [ ] Every line number — does it match the claimed content? Line numbers drift; re-check.
- [ ] Every "we will create `X.tsx`" — does `X.tsx` already exist? If yes, flag conflict.

#### B. Function, method, and variable names
- [ ] Every function name referenced — grep the repo; confirm it exists in the file the plan attributes it to.
- [ ] Every React component name — confirm the component file, export pattern, and current props shape.
- [ ] Every Prisma client query (`prisma.foo.findMany`) — does `foo` exist as a model?

#### C. Prisma schema and migrations
- [ ] Every claimed new model — does it already exist in `prisma/schema.prisma` under that name?
- [ ] Every claimed new field on an existing model — does the field already exist? If yes, plan is out of date.
- [ ] Every claimed index — is there an existing index that conflicts or supersedes?
- [ ] Every claimed relation — does the inverse relation need to be added on the other model? Plan often forgets.
- [ ] Every claimed migration — search `prisma/migrations/` for an existing migration that already made this change.
- [ ] Foreign key cascade rules (`onDelete: Cascade`) — are they specified where data integrity demands them?
- [ ] Is the plan idempotent on seed scripts? If it says "run the seed," verify the seed is upsert-by-unique-key.

#### D. SAM template (`infra/template.yaml`)
- [ ] Lambda memory claims — verify at the exact YAML key for the named function (not just the template default).
- [ ] Lambda timeout claims — same verification.
- [ ] Env vars — does the plan reference env vars that aren't wired into the template?
- [ ] IAM policies — if the plan adds a new AWS integration (S3 PutObject, SES SendEmail, SSM GetParameter outside existing namespace), is the IAM policy update listed as a task?
- [ ] Does the plan propose a new Lambda when extending `ai-timeline-api-prod` would suffice? (Usually it should just extend the API.)
- [ ] Does the plan propose infrastructure outside SAM (manual console clicks)? Flag as critical — everything must be IaC.

#### E. Express routes and controllers
- [ ] Every new route path — does it collide with an existing route in `server/src/routes/*.ts`?
- [ ] Mount order in `server/src/index.ts` — public before admin is the project convention; flag if the plan gets this wrong.
- [ ] Every admin route — is it gated by the existing JWT middleware? Plans often forget this and it's a **critical** security issue.
- [ ] Controller handler names — confirm naming consistency with existing controllers.
- [ ] Response shapes — do proposed responses conflict with Zod schemas already in `src/types/*`?

#### F. Services (`server/src/services/*.ts`)
- [ ] For every proposed new service, search for an existing service doing the same job. The most commonly reinvented services are:
  - `rateLimiter.ts` — reuse for any rate-limiting need
  - `moderationLogger.ts` — reuse for any audit trail
  - `shadowbanService.ts` / `autoFlagService.ts` — reuse for UGC moderation
  - `entityMatcher.ts` — reuse for name/slug matching
  - `trustService.ts` — reuse for user scoring
  - `contentFilter.ts` — reuse for content filtering
  - `articleAnalyzer.ts`, `contentGenerator.ts`, `entityExtraction.ts` — reuse for pipeline stages
- [ ] If the plan proposes to implement something one of these already does, flag and redirect to the existing service.

#### G. React Router routes (`src/App.tsx`)
- [ ] Every new route — does it collide with an existing route? (e.g. `/blog` vs existing lazy imports)
- [ ] Admin routes must be inside the `<AuthProvider><ProtectedRoute>` wrapper — confirm.
- [ ] Routes outside the `<Layout>` wrapper — verify if full-screen is actually intended (per existing precedent: `/feed`, `/collections`, `/embed/timeline`).
- [ ] Lazy imports — does the plan use `lazy(() => import(...))` matching the file's convention?

#### H. Pages and components (`src/pages/`, `src/components/`)
- [ ] For every proposed new page, search for an existing page that could be extended.
- [ ] Does the plan reuse `Layout`, `AdminLayout`, `Header`, existing skeleton/loader components? It should.
- [ ] Modal/tooltip patterns — does it follow the existing fixed-overlay + backdrop + escape-key pattern from `frontend.md`?

#### I. API client (`src/services/api.ts`)
- [ ] Does the plan add new methods to `api.ts` or create a parallel client? It should extend `api.ts`, not create a new file.
- [ ] Do the proposed client method names match the endpoint controllers?

#### J. Subject taxonomy
- [ ] If the plan proposes categorization, tagging, or topic grouping, does it reuse `Subject` + `ContentSubject`? It must, per `.claude/rules/subject-taxonomy.md`.
- [ ] Flag any proposal to create a parallel classification table as a **critical** issue.

#### K. Spam / moderation / auth
- [ ] If the plan touches user-generated content (comments, posts, votes, subscribers), does it reuse the existing spam protection infra?
- [ ] Are rate-limit values specified against the existing `BASE_LIMITS` in `rateLimiter.ts`?
- [ ] Is moderation logging wired via `moderationLogger.ts`?
- [ ] If introducing a polymorphic target (e.g. `blog_post`), is the existing `targetType` enum updated, not duplicated?

#### L. SSM parameters
- [ ] Every secret the plan references — does the SSM parameter exist under `/ai-timeline/prod/*`?
- [ ] If new secrets are proposed, is there a task to create the SSM parameter AND grant Lambda read permission in IAM?
- [ ] No hardcoded secrets anywhere — flag if the plan shows a raw API key, DB password, or JWT secret.

#### M. SEO and frontend meta
- [ ] If the plan claims JSON-LD, OG tags, or meta tags, does the repo currently use `react-helmet-async` or a similar head manager? Verify before recommending additions.
- [ ] Sitemap inclusion — is it routed through the existing `server/src/routes/sitemap.ts`?
- [ ] Does the plan validate JSON-LD with Google Rich Results Test as a QA step?

#### N. Deployment steps
- [ ] Frontend tasks include: `npm run build`, S3 sync to `ai-timeline-frontend-1765916222`, CloudFront invalidation on `E23Z9QNRPDI3HW`.
- [ ] Backend tasks include: `cd infra && sam build && sam deploy --no-confirm-changeset`.
- [ ] Migration tasks include: `DATABASE_URL` export from SSM, then `npx prisma migrate deploy`.
- [ ] Missing any of these = moderate issue, add as task.

#### O. Session Start Workflow + Validation sections
- [ ] Does the sprint include the **Session Start Workflow (MANDATORY)** block? If missing, add as a task.
- [ ] Does every API-touching sprint include a **Backend Validation** section (curl + CloudWatch tail)? If missing, add.
- [ ] Does every UI-touching sprint include a **Browser Validation** section using the `/Browser` skill? If missing, add.
- [ ] Does the sprint have a **Blocked — PM decision needed** section? (Even empty it should exist.)

#### P. Forbidden tools
- [ ] Does the plan reference any `mcp__claude-in-chrome__*` tools? If yes, **critical** — replace with `agent-browser` commands from the `/Browser` skill.

#### Q. Backwards-compat
- [ ] Does the plan propose renames, deletes, or schema changes but then add `_deprecated` aliases, dual-writes, or legacy routes?
- [ ] Unless the plan explicitly notes Wylie asked for backwards compat, flag the shims as issues and add a task to delete the old code directly.

#### R. Testing conventions
- [ ] Tests placed next to source in `__tests__/` folders (project convention)?
- [ ] For API tests, does the plan use supertest against the Express app (existing pattern)?
- [ ] For UI tests, does the plan use the existing testing setup (check `package.json` for jest/vitest/playwright)?

#### S. Cross-sprint dependencies
- [ ] Does the sprint depend on another sprint's completion? Is the dependency gated with an explicit "Confirm Sprint X DoD is complete before starting" prerequisite?
- [ ] Search other `roadmap/*.md` files for overlap — does another sprint already claim this work?

#### T. Coverage completeness
- [ ] Does the plan omit any routes, services, or pages that the feature requires?
- [ ] Does the plan omit any admin-side counterpart to a public feature (or vice versa)?
- [ ] Does the plan omit a seed/fixture task when the feature needs test data?

---

### Step 3: Compile Findings

Organize findings from most to least severe. Format them for a report to the user before mutating the plan.

#### Critical Issues
Factual errors that would cause implementation to fail, break production, or violate project rules:
- Wrong file paths, line numbers, or function names
- Prisma field already exists (or doesn't)
- Missing JWT middleware on admin routes
- Parallel classification table instead of reusing `Subject`
- Parallel moderation infra instead of reusing spam-protection services
- References to `mcp__claude-in-chrome__*`
- Hardcoded secrets
- Manual AWS console steps instead of SAM

#### Moderate Issues
Gaps that won't break anything but reduce the plan's value:
- Missing **Session Start Workflow** block
- Missing **Backend Validation** / **Browser Validation** sections
- Missing deployment steps
- Ambiguous task descriptions without file paths
- Unverified function names flagged with "confirm before implementing"
- Cross-sprint dependencies not explicitly gated
- Missing seed/fixture task
- Missing IAM update alongside new SSM parameter

#### Minor Issues
Polish and completeness:
- Naming inconsistencies (function name in plan vs. actual)
- Missing context that would help the implementer (e.g., "runs in parallel via `Promise.all`")
- "Files Touched (expected)" section incomplete
- No entry in the **Blocked — PM decision needed** section (even if nothing is blocked, the section should exist)

#### Assumptions to Verify
Things the plan takes for granted that may not hold:
- "Sprint N-1 is complete" without a prerequisite check
- "This utility exists" without confirming file path
- Effort estimates that don't account for discovered scope

**Present the full report to the user before updating the plan.** They should see what's changing and why.

---

### Step 4: Update the Sprint Plan

Apply all findings directly to the sprint document. Follow these rules strictly.

**Corrections:**
- Fix wrong values inline (function names, config numbers, line numbers, route paths).
- Add the correct service attribution where it was missing or wrong.
- Replace any `mcp__claude-in-chrome__*` references with `/Browser` (agent-browser) equivalents.

**New tasks:**
- Add as new numbered subtasks using the plan's existing checkbox format: `- [ ] description`.
- Place them in logical order (prerequisite tasks before dependent tasks).
- Match the specificity of existing tasks — include file paths, function names, and exact commands.

**Prerequisites and dependencies:**
- If missing, add a `## Prerequisites` section with `[ ]` boxes.
- Add explicit gate checks: "Verify Sprint X DoD is complete before starting."

**Missing sections:**
- If the sprint lacks the **Session Start Workflow (MANDATORY)** block, insert the canonical block from `/AIDevPlanning`.
- If API is touched and **Backend Validation** is missing, add the section with curl + CloudWatch tasks.
- If UI is touched and **Browser Validation** is missing, add the section with `/Browser` (agent-browser) tasks.
- If **Blocked — PM decision needed** is missing, add an empty section at the bottom.

**Context notes:**
- Add implementation-relevant context inline (e.g., "NOTE: these run in parallel via `Promise.all()`").

**Timestamp:**
- Update the "Last updated: YYYY-MM-DD by Claude (AITechLeadReview)" line at the top.

**DO NOT:**
- Reorganize or reformat the plan's existing structure.
- Remove or rewrite tasks that are correct.
- Add speculative tasks for problems that don't exist.
- Change the plan's voice or tone.

---

### Step 5: Update the Parent `PLAN-[Initiative].md`

If findings affect cross-sprint concerns, update the PLAN doc:
- Effort estimate changes (scope increased/decreased)
- Dependency changes (new prerequisites between sprints)
- Risk assessment changes (discovered deployment risks)
- New tasks that cross sprint boundaries
- Update the initiative-level Definition of Done if coverage changed

---

### Step 6: Report Summary

After updating, provide a concise summary to the user:

```
## AI Tech Lead Review Summary

**Files updated:**
- roadmap/Sprint-[Prefix]-N-*.md — [N corrections, M new tasks, K notes added]
- roadmap/PLAN-[Initiative].md — [what changed, if anything]

**Critical fixes:** [bulleted list]
**New tasks added:** [bulleted list with task numbers or section names]
**Key finding:** [the single most important thing the team should know]

**Status:** Plan is ready to implement / needs further PM input on [X].
```

Keep the summary under 30 lines. The detail is in the updated plan itself.

---

## Verification Checklist (Use This Every Time)

Every review must verify these categories. Skip none. Missing any category = incomplete review.

- [ ] **File paths & line numbers** — every path/line checked against the actual file
- [ ] **Function names** — every function name grepped or read
- [ ] **Prisma schema & migrations** — models, fields, indexes, relations, existing migrations
- [ ] **SAM template** — memory, timeout, env vars, IAM policies at exact YAML keys
- [ ] **Express routes** — mount order, auth middleware, path collisions
- [ ] **Services** — existing services that make proposed services redundant
- [ ] **React Router routes** — collisions in `src/App.tsx`, Layout wrapping, auth wrapping
- [ ] **Pages/components** — reuse of existing Layout/AdminLayout/Header/Modal patterns
- [ ] **API client** — extends `src/services/api.ts`, doesn't fork
- [ ] **Subject taxonomy** — reuse `Subject` + `ContentSubject`
- [ ] **Spam/moderation/auth** — reuse existing infra; JWT gating on admin endpoints
- [ ] **SSM parameters** — existence verified, IAM read grants included
- [ ] **SEO/meta** — head manager usage, sitemap routing, JSON-LD validation step
- [ ] **Deployment steps** — frontend (S3+CF), backend (SAM), migrations (prisma) all present
- [ ] **Session Start Workflow** — block present on every sprint
- [ ] **Backend Validation** — present on API-touching sprints
- [ ] **Browser Validation** — present on UI-touching sprints, using `/Browser` (agent-browser)
- [ ] **Forbidden tools** — zero references to `mcp__claude-in-chrome__*`
- [ ] **Backwards-compat** — no shims unless Wylie asked
- [ ] **Cross-sprint dependencies** — explicit gates, no duplicated scope
- [ ] **Coverage completeness** — no omitted routes/services/pages/seeds

---

## Anti-Patterns (NEVER DO THESE)

- **Never trust the plan's claims without checking.** "The plan says line 49" means nothing until you read line 49.
- **Never report findings without updating the plan.** Findings in conversation get lost. Put them in the document.
- **Never add tasks for hypothetical problems.** Only flag issues you can verify exist in the codebase today.
- **Never reorganize the plan.** Surgical insertions, not structural rewrites.
- **Never skip the `.claude/rules/*` cross-check.** Plans that reinvent Subject taxonomy, spam protection, or ingestion pipeline stages almost always come from a reviewer who didn't read the rules.
- **Never skip the Prisma migration history check.** A plan that "adds a field" when the field already exists is a critical miss.
- **Never skip the SAM template check for Lambda config claims.** Memory/timeout claims must be verified at the exact YAML key for the specific function, not just the template default.
- **Never approve a plan that references `mcp__claude-in-chrome__*`.** Project-global CLAUDE.md forbids these.
- **Never approve a plan that omits the Session Start Workflow block.** It's mandatory per `/AIDevPlanning`.
- **Never approve admin routes without JWT middleware.** Security-critical.
- **Never approve a plan that hardcodes secrets.** Route through SSM.
- **Never approve backwards-compat shims unless the plan explicitly notes Wylie requested them.**
