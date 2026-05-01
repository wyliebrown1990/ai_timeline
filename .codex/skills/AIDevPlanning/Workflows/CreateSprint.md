# CreateSprint Workflow (AI Timeline)

Create a single sprint document with the full structure this project requires. Must enforce Session Start Workflow, lint+test-after-every-block, front+back QA, and Definition of Done sections.

## Trigger Phrases
- "create sprint"
- "new sprint"
- "sprint N for [feature]"
- "add sprint to [plan]"

## Execution Steps

### 1. Read project context (MANDATORY)

```bash
cat /Users/wyliebrown/ai_timeline/.claude/CLAUDE.md
ls /Users/wyliebrown/ai_timeline/.claude/rules/
ls /Users/wyliebrown/ai_timeline/roadmap/
```

Read rule files relevant to the sprint's scope. Read the parent PLAN if one exists.

### 2. Confirm sprint details
- Sprint number (next unused `[Prefix]-N`)
- Focus area / theme
- Prerequisite sprints
- Relationship to the master PLAN
- Which parts of the stack it touches (backend? frontend? both? schema?)

### 3. Create the sprint document

**Location**: `/Users/wyliebrown/ai_timeline/roadmap/Sprint-[Prefix]-[N]-[Kebab-Slug].md`

Use this exact template — every section listed below is required. Omit a section only if it is genuinely not applicable (e.g., Browser Validation on a pure-backend sprint) and note the omission.

```markdown
# Sprint [Prefix]-[N]: [Title]

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: [YYYY-MM-DD] by [Developer] (sprint created — no tasks started)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (e.g. `backend.md`, `frontend.md`, `data-models.md`, `subject-taxonomy.md`).
2. Re-read the parent PLAN (`roadmap/PLAN-[Initiative].md`) **Developer Workflow (MANDATORY)** section.
3. Confirm any prerequisite sprints' Definitions of Done are fully checked. If not, finish them first.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA front+back → commit → `[ ] → [x]`.
6. Use `/Browser` (agent-browser) for UI validation. Never use `mcp__claude-in-chrome__*`.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

[One-paragraph goal statement.]

**Priority**: [HIGH | MEDIUM | LOW]
**Depends on**: [Sprints that must ship first]
**Estimated Effort**: [N days]
**Status**: Not started

---

## Prerequisites

- [ ] [Prerequisite sprint DoD complete]
- [ ] [External dependency ready, credentials in SSM, etc.]
- [ ] Local dev server running: `npm run dev` + `npm run dev:server`

---

## Tasks

### 1. [Category]

#### 1.1 [Subcategory if needed]
- [ ] [Concrete task — name the exact file, function, or command]
  ```prisma / ```typescript / ```bash
  [code snippet if useful]
  ```
- [ ] [Next concrete task]

#### 1.2 [Subcategory]
- [ ] [...]

### 2. [Category]
- [ ] [...]

### N. Tests

- [ ] Unit tests for [new service/component] in `[path]/__tests__/[name].test.ts(x)`
- [ ] Integration tests for [new endpoint] in `server/src/controllers/__tests__/[name].test.ts`
- [ ] `npm test -- [pattern]` — all pass
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors

### N+1. Deploy

- [ ] Backend: `cd infra && sam build && sam deploy --no-confirm-changeset`
- [ ] Migrations (if schema changed):
      `export DATABASE_URL=$(aws ssm get-parameter --name "/ai-timeline/prod/database-url" --with-decryption --query "Parameter.Value" --output text) && npx prisma migrate deploy`
- [ ] Frontend: `npm run build && aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete && aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"`

### N+2. Backend Validation (if API changed)

- [ ] Smoke test each new/changed endpoint:
      `curl https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod/api/[path]`
- [ ] Admin endpoints: obtain JWT via `POST /api/auth/login`, hit with `Authorization: Bearer`
- [ ] `aws logs tail /aws/lambda/ai-timeline-api-prod --since 15m` — zero errors
- [ ] RDS pool healthy (recent baseline reduced pool — see commit e8e8411)

### N+3. Browser Validation (if UI changed) — via `/Browser` skill only

- [ ] `agent-browser open https://letaiexplainai.com/[route]`
- [ ] `agent-browser screenshot` (initial state)
- [ ] `agent-browser snapshot -i` for element refs
- [ ] Test primary flow: clicks, form inputs, navigation
- [ ] Verify loading/empty/error states
- [ ] Dark mode: toggle theme, screenshot
- [ ] Mobile viewport: `agent-browser resize 375 812 && agent-browser screenshot`
- [ ] Zero console errors, zero 4xx/5xx in network tab
- [ ] Lighthouse (if SEO-sensitive page): Performance ≥90, Accessibility ≥95, SEO ≥95

---

## Definition of Done

- [ ] All tasks above checked
- [ ] [Specific measurable outcomes for this sprint]
- [ ] Deployed to prod, verified live
- [ ] Zero TypeScript errors, zero lint errors, tests passing
- [ ] CloudWatch + browser console clean
- [ ] Sprint file timestamp updated

---

## Files Touched (expected)

```
prisma/schema.prisma                           (modify/new — purpose)
prisma/migrations/<ts>_[name]/                 (new)
server/src/services/[name].ts                  (new)
server/src/controllers/[name].ts               (new)
server/src/routes/[name].ts                    (new)
server/src/index.ts                            (modify — mount routes)
src/services/api.ts                            (modify — new client)
src/pages/[Name]Page.tsx                       (new)
src/components/[Name]/[Component].tsx          (new)
src/App.tsx                                    (modify — routes)
package.json / package-lock.json               (modify — deps)
```

---

## Blocked — PM decision needed

(None yet. Add questions for Wylie here as they arise. Include context so Wylie can decide without re-reading the whole sprint.)
```

### 4. Output format

```
SUMMARY: Created Sprint [Prefix]-[N] for [focus]
FILE: roadmap/Sprint-[Prefix]-[N]-[slug].md
TASKS: [N] tasks across [M] categories
NEXT: Review unchecked [ ] tasks; begin with task 1.1
```

---

## Rules (enforced)

1. **Session Start Workflow block at the top** — full copy, not a link.
2. **Every actionable item is `[ ]`** — no narrative-only work items.
3. **Concrete file paths** — `src/pages/X.tsx`, not "the component".
4. **Concrete commands** — paste the `curl`, `aws`, `sam`, `prisma` commands the dev will actually run.
5. **Tests as first-class tasks** — a dedicated Tests section, not scattered across categories.
6. **Deploy section mandatory** — the sprint doesn't end in a feature branch; it ends on prod.
7. **Backend + Browser Validation** — include both unless truly pure-backend or truly no-API.
8. **Definition of Done with checkboxes** — "sprint is shipped" must be verifiable, not vibey.
9. **Files Touched list** — reviewers and future devs scan this first.
10. **`Blocked — PM decision needed`** — always present, even if "(None yet.)". Signals the channel for PM calls.
11. **Do NOT reference `mcp__claude-in-chrome__*`** — project-global CLAUDE.md forbids it. Use `/Browser` only.
12. **Do NOT add backwards-compatibility tasks** unless Wylie explicitly asked.

---

## Anti-patterns (never do these)

- "Build the API" as a single task (break it into endpoints, services, tests, deploy)
- Omitting the Session Start Workflow to save space
- Writing "and more" or "etc." in task lists
- Checking `[x]` in a freshly created sprint — always leave unchecked
- Skipping the Deploy section because "it's obvious"
- Referencing `agent-browser` directly without noting it's invoked via the `/Browser` skill

---

## Example invocation

```
User: "Create Sprint Blog-7 for analytics integration"

→ Read .claude/CLAUDE.md + frontend.md + backend.md
→ Read roadmap/PLAN-Blog-Editorial.md for context
→ Check roadmap/ — Sprint-Blog-6 is the latest, `Blog-7` is next
→ Determine scope: Plausible/PostHog integration, admin dashboard tiles,
   per-post view charts
→ Write roadmap/Sprint-Blog-7-Analytics.md with:
    Progress disclaimer, Session Start Workflow (full), Overview,
    Prerequisites, Tasks grouped by (1. Provider setup, 2. Tracking script,
    3. Admin dashboard, 4. Per-post view chart, 5. Tests, 6. Deploy,
    7. Backend Validation, 8. Browser Validation), DoD, Files Touched,
    Blocked section (flag: which analytics provider + cost approval)
→ Output SUMMARY with file path and next-task pointer
```
