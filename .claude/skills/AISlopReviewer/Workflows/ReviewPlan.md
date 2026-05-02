# ReviewPlan Workflow (AISlopReviewer)

Review a roadmap sprint plan in the AI Timeline Atlas repo for AI slop — duplication of existing utilities, drift from LAEA's centralized systems, hallucinated APIs, dead-code debris, regression of past decisions, and any of the 17 categories of vibe-code slop. Update the plan with surgical corrections so the implementer never ships the slop.

---

## Prerequisites

- A sprint plan document must exist under `/Users/wyliebrown/ai_timeline/roadmap/` (typically `Sprint-[Prefix]-N-*.md` or a one-off `PLAN-*.md`).
- The parent `PLAN-[Initiative].md` should also exist for cross-sprint context.
- Read `SKILL.md` in this skill directory first — internalize the 17 categories, the centralized systems map, and the severity model before reviewing.

---

## Steps

### Step 1: Read the Plan and Centralized Context

Read these in parallel where possible:

1. The sprint plan document the user specified
2. The parent `PLAN-[Initiative].md` in the same `/roadmap/` directory
3. Any other sprint docs in `/roadmap/` that the plan references (for cross-sprint dependency context)
4. `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` (project rules and quick commands)
5. `/Users/wyliebrown/.claude/CLAUDE.md` (global rules — especially the **Web App (agent-browser)** mandate that forbids `mcp__claude-in-chrome__*`)
6. Every `.claude/rules/*.md` file relevant to the plan's scope:
   - `backend.md` — if plan touches API, Lambda, Prisma, SSM
   - `frontend.md` — if plan touches React, Vite, routing, Tailwind
   - `data-models.md` — if plan touches schema
   - `subject-taxonomy.md` — if plan proposes any classification/tagging/grouping
   - `news-ingestion.md` — if plan touches fetchers, screening, entity extraction
   - `spam-protection.md` — if plan touches comments, votes, user-generated content
   - `build-and-deploy-security.md` — if plan touches build pipeline, env vars, deploy commands

**Understand before you investigate.** Note every concrete proposal in the plan: new functions/utilities, new constants, new API endpoints, new Prisma models, new env vars, new tasks, new tests, new migrations, new dependencies, new files, new EventBridge rules, new SSM parameters. These are your slop candidates.

---

### Step 2: Parallel Centralized-System Verification

Launch an Explore agent (`subagent_type: Explore`, thoroughness: `very thorough`) to verify the plan against LAEA's centralized systems. The agent should check, for every proposal in the plan:

#### A. Shared backend services — does an existing service already do this?

For every new utility/helper/service the plan proposes, search `server/src/services/` for an existing implementation. Especially:

- [ ] **Rate limiting?** → `rateLimiter.ts` (`BASE_LIMITS` constants, trust-tier modifiers)
- [ ] **Audit logging?** → `moderationLogger.ts` (polymorphic targetType already supports many entity types)
- [ ] **Name/slug fuzzy matching?** → `entityMatcher.ts` (Jaro-Winkler, alias chain)
- [ ] **User trust scoring?** → `trustService.ts`
- [ ] **Content filtering (URLs, blocked words)?** → `contentFilter.ts` + `SpamFilter` model
- [ ] **Auto-flagging conditions?** → `autoFlagService.ts`
- [ ] **Shadowban behavior?** → `shadowbanService.ts`
- [ ] **Vote integrity / brigade detection?** → `votePatternService.ts`
- [ ] **Article ingestion?** → `articleAnalyzer.ts`, `contentGenerator.ts`, `entityExtraction.ts`, `subjectClassifier.ts`, `glossaryExtractor.ts`, `keyFigureExtractor.ts`, `newsEventGenerator.ts` (the news ingestion pipeline)
- [ ] **Anthropic API calls for SEO content?** → `seoContentGenerator.ts` (Sprint SEO-4)
- [ ] **Blog CRUD / relations / subjects?** → `blog.ts` + `blogAdmin.ts`
- [ ] **Text → entity link resolution?** → `entityLinker.ts`
- [ ] **News quiz generation?** → `newsQuizGenerator.ts`

If the plan proposes anything in these domains, **the burden is on the plan to justify why it doesn't extend the existing service**.

#### B. Source-of-truth Prisma models — is the plan re-deriving canonical data?

- [ ] **People / Orgs / Milestones / Glossary** → must reference existing `Person`, `Organization`, `Milestone`, `GlossaryTerm`. Plans that store names/orgs/contributors as raw strings on a new model are P1.
- [ ] **Affiliation history** → `Affiliation` join table (NOT a `currentOrg` string column on a new entity).
- [ ] **Milestone contributors** → `MilestoneContributor` (NOT a `contributors[]` JSON array on a new model).
- [ ] **Subject taxonomy** → `Subject` + `ContentSubject` (NEVER a parallel tagging table; this is **P1 by `subject-taxonomy.md` rule**).
- [ ] **Spam infra** → `SpamFilter`, `ModerationLog`, `FlaggedContent`, `CommentVote.isSuspicious`. New user-content models must integrate, not bypass.
- [ ] **Blog post fields** → `BlogPost` already has `seoTitle`, `seoDescription`, `canonicalUrl`, `tags`, `featured`, `viewCount`. Plans that "add SEO fields to BlogPost" are stale.

#### C. Backend conventions

- [ ] **Admin route mounting style** — per-route `requireAdmin` (canonical: `server/src/routes/glossary.ts:69-86`). Plans applying middleware at mount time (`app.use('/api/admin/x', requireAdmin, router)`) are drift — flag as P1.
- [ ] **`requireAdmin` import path** — `'../middleware/authMiddleware'`. Both `auth.ts` and `authMiddleware.ts` exist; routes use `authMiddleware.ts`.
- [ ] **Prisma client** — `import { prisma } from '../db'`. Never instantiate parallel.
- [ ] **Public routes mounted before admin routes** in `server/src/index.ts`.
- [ ] **JWT middleware on every admin endpoint** — missing this is P0.
- [ ] **No hardcoded secrets** — every secret from SSM under `/ai-timeline/prod/*`.

#### D. SAM template (`infra/template.yaml`)

- [ ] **Lambda function** — extending `ai-timeline-api-prod` or `ai-timeline-ingestion-prod` over creating a new Lambda. Justify exceptions.
- [ ] **EventBridge schedule rules** — every new `AWS::Events::Rule` MUST have a paired `AWS::Lambda::Permission` (precedents: `IngestionSchedulePermission` line 293, `QuizGenerationSchedulePermission` line 318). Missing permission = silent failure = P1.
- [ ] **Ingestion Lambda entrypoint** — `server/src/ingestionLambda.ts`. Plans referencing `server/src/lambda/ingestion.ts` are hallucinating.
- [ ] **Existing event-action dispatch** — `IngestionFunction` switches on `event.action`. Plans that add a new schedule should add a new `event.action` case in `ingestionLambda.ts`, not a new Lambda.
- [ ] **IAM updates alongside new SSM parameters** — if a new SSM param is read at runtime (not via `{{resolve:ssm:...}}` env var), the IAM policy must list it.
- [ ] **Manual AWS console steps** — none. Everything is IaC. Manual steps = P1.

#### E. React Router and frontend

- [ ] **Lazy imports** — every new admin page goes through `const Page = lazy(() => import('./pages/admin/Page'))` in `src/App.tsx` (~line 105).
- [ ] **Admin routes inside `<ProtectedRoute>` + `<AdminLayout>`** wrapper.
- [ ] **Admin nav addition** — entry in `src/components/admin/AdminLayout.tsx` `navItems` array (~line 34). Plans referencing `AdminSidebar.tsx` are hallucinating — that file does not exist.
- [ ] **Modal / hover card patterns** — fixed overlay + backdrop blur + escape key (per `frontend.md`); React Portal for tooltips.
- [ ] **API client** — extend `src/services/api.ts`, never fork.
- [ ] **Tailwind utilities** — no hardcoded colors/spacing/radii in component classNames; use Tailwind tokens. Same for shadow values.

#### F. Build & deploy security (NON-NEGOTIABLE per `.claude/rules/build-and-deploy-security.md`)

- [ ] **Sourcemaps stripped** — three layers: Vite config, `npm run build` script (`find dist -name '*.map' -delete`), `scripts/deploy-frontend.sh`. Plan must use `./scripts/deploy-frontend.sh` for frontend deploy.
- [ ] **Every new `aws s3 sync` or `aws s3 cp`** — must include `--exclude "*.map"`. No exceptions.
- [ ] **No backend secrets in `VITE_*` env vars** — only public values (`VITE_API_URL`, `VITE_APP_TITLE`). Plans that reference `VITE_ANTHROPIC_API_KEY` etc. are P0.
- [ ] **No env files committed** — `.env`, `.env.local`, `.ai-timeline-admin-token` stay gitignored. `.env.example` is fine; `.env.production` only with public URLs.
- [ ] **No admin tokens written to disk** in committable paths.
- [ ] **`{{resolve:ssm:...}}` env var pattern** — preferred over runtime SSM SDK reads, unless the value must hot-reload (e.g., a pause switch).

#### G. Test conventions

- [ ] **Test path** — `/tests/unit/*.test.ts(x)` at repo root. NOT `server/src/services/foo/__tests__/foo.test.ts`. Verified — only `extension/` (separate package) uses colocated `__tests__/`.
- [ ] **Test framework** — Jest (project root `package.json` has `"test": "jest"`).
- [ ] **Tests of behavior, not mocks** (Category 9). Plan should describe what behavior is being asserted, not just "mock the API and check it was called."
- [ ] **No tautological assertions** (`expect(true).toBe(true)`).
- [ ] **No disabled tests** (`.skip`, `.todo` left without follow-up).

#### H. Subject taxonomy

- [ ] If the plan proposes categorization, tagging, or topic grouping, does it reuse `Subject` + `ContentSubject`? It MUST, per `.claude/rules/subject-taxonomy.md`. **Parallel tagging table = P1.**
- [ ] Subject IDs are **cuids**, not slugs. The `/api/subjects/tree` endpoint returns both. Admin payloads requiring subject references want cuids (e.g. `subjectIds: [<cuid>]` on blog post create).

#### I. Spam / moderation / auth (per `spam-protection.md`)

- [ ] If the plan touches user-generated content (comments, votes, blog comments, user submissions), does it reuse the existing spam protection infra? Plans that invent their own rate-limit table are P1.
- [ ] Rate-limit values referenced against `BASE_LIMITS` in `rateLimiter.ts`.
- [ ] Moderation logging via `moderationLogger.ts`.
- [ ] If introducing a polymorphic `targetType`, extend the existing enum, not duplicate.

#### J. Browser automation

- [ ] **`/Browser` skill (agent-browser)** — the only allowed browser tool per `~/.claude/CLAUDE.md`. Plans referencing `mcp__claude-in-chrome__*` are **P0** — replace immediately.
- [ ] Browser Validation section uses `agent-browser open / screenshot / snapshot -i / click @eN / resize 375 812` shape.

#### K. Backwards-compat

- [ ] Project rule (per `.claude/CLAUDE.md` and `/AIDevPlanning` skill): **"No backwards compatibility unless Wylie explicitly requested it."** Plans that add `_deprecated` aliases, dual-writes, or "legacy" fallback paths are P1 unless Wylie's request is in the sprint's `Blocked — PM decision needed` section.

#### L. Skill composition (avoid reinventing other AI* skills)

- [ ] **Plan reinvents drafting?** → Should compose with `/AIBlogDraft`.
- [ ] **Plan reinvents code review against architecture?** → That's `/AITechLeadReview`'s job; AISlopReviewer doesn't duplicate it.
- [ ] **Plan reinvents UX/design review?** → `/AIUXLeadReview`.
- [ ] **Plan reinvents SEO review?** → `/AISEOReview`.
- [ ] **Plan reinvents planning?** → `/AIDevPlanning`.

#### M. Schema/migration safety

- [ ] **Migration order** — does the plan add Prisma migrations? Sequencing must be clean (no FKs across new migrations from sibling sprints).
- [ ] **Backwards-incompatible API changes** without versioning or rollout — flag.
- [ ] **Schema-and-code shipped out of order** — migration must deploy before code that depends on it.
- [ ] **Rollback path** for any DDL that drops/renames.

#### N. Dependency hygiene

- [ ] **New npm dep** proposed? Search `package.json`. Often there's already a sibling.
- [ ] **Heavyweight dep for trivial function** (Category 13.1).
- [ ] **Dev deps in prod** dependencies.
- [ ] **Version pin discipline** — pinned, not `^` or `~` for security-sensitive deps.

#### O. Process & verification

- [ ] **Definition of Done** sections include live QA, not just "tests pass."
- [ ] **Deploy section present** — frontend (S3 + CloudFront), backend (SAM), migrations (Prisma) where relevant.
- [ ] **`Session Start Workflow`** block present at the top of every sprint (mandatory per `/AIDevPlanning`).
- [ ] **Backend Validation** section on API-touching sprints; **Browser Validation** on UI-touching sprints; **Blocked — PM decision needed** on every sprint (even empty).

---

### Step 3: Apply the 17-Category Lens

Walk every proposal in the plan through the 17 categories. Not every category applies to every plan — but you MUST consider each. For each finding, record:

- The category number (e.g., "1.1 Parallel helpers")
- The plan location (section / line / task #)
- The centralized system being violated (which service, which rule, which convention)
- The severity (P0/P1/P2/P3)
- The suggested fix (which centralized utility/pattern to use instead)

---

### Step 4: Compile Findings

Organize findings into severity buckets:

#### P0 — Data loss / live security risk
The plan as written would create a real, immediate hazard if implemented. Examples: admin endpoint without `requireAdmin`; `mcp__claude-in-chrome__*` references; `VITE_*` env var holding a backend secret; `aws s3 sync` without `--exclude "*.map"`; sourcemap-emitting build pipeline change.

#### P1 — Silent breakage / direct violation of centralized system
The plan would produce a real bug or directly contradict a load-bearing pattern. Examples: parallel implementation of `entityMatcher.ts`, `rateLimiter.ts`, or `moderationLogger.ts`; new tagging table bypassing `Subject`; admin route mount style violates per-route convention; EventBridge rule without paired `AWS::Lambda::Permission`; backwards-compat shim added without explicit Wylie request; hallucinated file path (e.g., `AdminSidebar.tsx`); manual AWS console step instead of SAM.

#### P2 — Operational risk / cleanup with real impact
Real smell with non-trivial blast radius. Examples: tests in `__tests__/` instead of `/tests/unit/`; missing lazy import for new admin page; missing IAM update alongside new SSM param; hardcoded color where Tailwind utility should be used; missing `data-testid` on new admin nav entry; missing `--exclude "*.map"` on a *new* `aws s3 sync` (not in the deploy script — deploy script is correct, but ad-hoc commands aren't); duplicated keyword-matching helper between two sprints when one shared helper would suffice.

#### P3 — Style / consistency / cleanup-when-touched
Naming drift, comment pollution, light dead-code, `as any` casts that should be tightened, file-organization wobble.

#### Slop Avoided (positive findings)
Things the plan does correctly that are worth calling out — e.g., "uses `./scripts/deploy-frontend.sh` instead of ad-hoc s3 sync," "extends existing `entityMatcher.ts` rather than reinventing," "follows per-route `requireAdmin` convention."

**Present findings to the user before updating.** Give them the full report so they see what's changing and why.

---

### Step 5: Update the Sprint Plan

Apply findings directly to the sprint document. Mirror the surgical-insert style of `/AITechLeadReview` and `/AIUXLeadReview`.

**Slop Findings section:**
- Add a `## Slop Findings (AISlopReviewer — YYYY-MM-DD)` section at the bottom of the plan
- Within it, sub-sections by severity: `### P0`, `### P1`, `### P2`, `### P3`, `### Slop Avoided`
- Each finding: `- [ ] **[Category N.N — short name]** [location in plan]. [Problem]. **Fix:** [centralized utility/pattern to use]. [Optional: link to rule file or service path.]`

**Inline corrections:**
- Fix wrong values inline where the plan literally writes the wrong thing (e.g., correct `server/src/lambda/ingestion.ts` to `server/src/ingestionLambda.ts`).
- Replace inline filter/match snippets with the correct shared-service call.
- Where the plan proposes a new helper that already exists, rewrite the task to "import from `server/src/services/<existing>.ts`".
- Replace `mcp__claude-in-chrome__*` with `agent-browser` commands.

**New tasks:**
- Add as new numbered tasks in the plan's existing checkbox format: `- [ ] description`.
- Place in logical order (prerequisite tasks before dependent tasks).
- Include the same level of detail as existing tasks (file paths, exact import paths, exact function names).
- Common additions: "Add `AWS::Lambda::Permission` resource for new EventBridge rule," "Add lazy import for new admin page in `src/App.tsx`," "Move tests from `__tests__/` to `/tests/unit/`," "Use existing `entityMatcher.matchPerson()` instead of new helper."

**Notes section additions:**
- Cross-references to `.claude/rules/*.md` files (the rule that the original plan didn't satisfy).
- Pointers to existing services the plan should compose with.

**DO NOT:**
- Reorganize or reformat the plan's existing structure.
- Remove or rewrite tasks that don't have slop in them.
- Add speculative tasks for hypothetical problems.
- Use "must" / "MUST" / "required" language for P3 polish — use "consider," "opportunity," "worth flagging."
- Block sprints that have no P0/P1 findings — P2/P3 are advisory updates, not gates.
- Expand scope. Slop discovered in adjacent code or other sprints goes to `roadmap/slop-ledger.md` (create if missing) — do not bolt onto the current sprint.

---

### Step 6: Update the Parent `PLAN-[Initiative].md` (only if needed)

If findings affect cross-sprint concerns, update `PLAN-[Initiative].md`:
- New prerequisites (e.g., shared service must be extracted before per-sprint work)
- Risk assessment changes (slop-introduction risk added)
- Effort estimate changes (P1 fixes add scope)
- New cross-sprint dependencies discovered

---

### Step 7: Update / Create the Slop Ledger (when warranted)

Path: `/Users/wyliebrown/ai_timeline/roadmap/slop-ledger.md` (create if missing — it's a single-source append-only ledger of known slop in the LAEA codebase).

If the review surfaced a NEW class of slop pattern that's NOT specific to this sprint (i.e., it exists in shipped code or in another sprint's plan), add a row:

```markdown
| Date | Sprint or "Plan Review" | Category | Location | Severity | Status | Note |
```

Status: `OPEN` initially. Mark `FIXED` only after a remediation sprint ships.

If the plan addresses an existing `OPEN` row in the ledger, do NOT mark it `FIXED` yet — that happens after implementation ships. Note in the plan: "Addresses slop-ledger row [N]."

---

### Step 8: Report Summary

After updating, provide a concise summary to the user:

```
## AISlopReviewer Summary

**Plan reviewed:** roadmap/Sprint-[Prefix]-N-[slug].md
**Verdict:** [Clean / Minor adjustments / Material slop risk / Blocked-pending-rewrite]

**Findings by severity:**
- P0: [count] — [one-line per finding, or "none"]
- P1: [count] — [list]
- P2: [count] — [list]
- P3: [count] — [list]
- Slop Avoided (positive): [list]

**Centralized systems referenced:** [services / rules files / conventions the plan was checked against]

**Files updated:**
- roadmap/Sprint-[Prefix]-N-[slug].md — [N corrections inline, M tasks added, Slop Findings section added]
- roadmap/PLAN-[Initiative].md — [if updated]
- roadmap/slop-ledger.md — [if a new row was added]

**Key risk to flag:** [the single most important slop risk the team should know]

**Composition note:** [if review surfaced something better suited for /AITechLeadReview or /AIUXLeadReview, mention it]
```

---

## Verification Checklist (Use This Every Time)

Every review must walk this list. Skip none.

- [ ] **17-category coverage** — every proposal in the plan considered against all 17 categories
- [ ] **Shared service overlap** — every new utility/function checked against `server/src/services/`
- [ ] **Source-of-truth respected** — Person/Organization/Milestone/GlossaryTerm/Subject not being re-derived
- [ ] **Rules folder satisfied** — all relevant `.claude/rules/*.md` checked
- [ ] **Backend conventions** — admin routes per-route `requireAdmin`, JWT on all admin endpoints, `prisma` from `'../db'`, mount order public-before-admin
- [ ] **SAM/IaC** — Lambda extension over new Lambda, EventBridge rule + permission pair, no manual console steps
- [ ] **Frontend conventions** — lazy imports, `AdminLayout` navItems for admin nav, modal patterns, `src/services/api.ts` extended not forked, Tailwind utilities not hardcoded styles
- [ ] **Build & deploy security** — sourcemaps stripped at all 3 layers, `--exclude "*.map"` on every new sync command, no `VITE_*` secrets, deploy via `scripts/deploy-frontend.sh`
- [ ] **Test convention** — `/tests/unit/*.test.ts(x)` at repo root, not `__tests__/`
- [ ] **Subject taxonomy** — reuse `Subject` + `ContentSubject`; subject cuids not slugs in admin payloads
- [ ] **Spam/moderation/auth** — reuse existing infra, JWT on admin endpoints
- [ ] **`/Browser` skill only** — zero `mcp__claude-in-chrome__*` references
- [ ] **No backwards-compat shims** unless Wylie explicitly asked
- [ ] **Skill composition** — doesn't duplicate `/AITechLeadReview`, `/AIUXLeadReview`, `/AISEOReview`, `/AIBlogDraft`, `/AIDevPlanning`
- [ ] **Schema/migration safety** — sequenceable migrations, rollback path, no out-of-order deploys
- [ ] **Dependency hygiene** — new deps justified, not duplicates
- [ ] **Process gaps** — Session Start Workflow + Backend/Browser Validation + Blocked sections present
- [ ] **No scope creep** — slop in adjacent code goes to `roadmap/slop-ledger.md`, not this sprint

---

## Anti-Patterns (NEVER DO THESE)

- **Never trust the plan's centralized-system claims without checking.** "Uses existing entityMatcher" means nothing until you've grepped the function name and confirmed signature.
- **Never report findings without updating the plan.** Findings in conversation get lost. They go into the document.
- **Never invent slop.** If a finding doesn't map to one of the 17 categories or to a centralized-system violation, drop it — you're not the place for taste-level critique.
- **Never reorganize the plan.** Surgical insertions only — `## Slop Findings` section at the bottom + inline corrections.
- **Never expand scope.** Slop in adjacent code or shipped code goes to `roadmap/slop-ledger.md`, not this sprint's plan.
- **Never skip the shared-services check.** The single most common slop class is duplicating utilities that already live in `server/src/services/`. This is the #1 thing to catch.
- **Never gate on P2/P3.** Only P0 and P1 are blocking. P2/P3 are surgical updates the team adopts when convenient.
- **Never approve admin routes without JWT middleware.** Security-critical.
- **Never approve a plan that hardcodes secrets or puts them in `VITE_*`** — route through SSM.
- **Never approve `mcp__claude-in-chrome__*` references** — global rule forbids them; replace with `/Browser` skill.
- **Never approve a deploy command that omits `--exclude "*.map"`** on a new `aws s3 sync` — `build-and-deploy-security.md` is non-negotiable.
- **Never approve backwards-compat shims** unless the plan explicitly notes Wylie requested them.
- **Never approve a parallel classification table bypassing `Subject` + `ContentSubject`** — that's the #1 P1 trap in this codebase per `subject-taxonomy.md`.
- **Never duplicate `/AITechLeadReview`'s job.** TechLead verifies file paths and config values exist; SlopReviewer verifies the plan respects centralized patterns and won't duplicate. Different lenses on the same plan — both useful, neither redundant.
