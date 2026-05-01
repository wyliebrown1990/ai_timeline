---
name: AIDevPlanning
description: Sprint-based development planning specific to the AI Timeline Atlas project (letaiexplainai.com). USE WHEN plan project OR create sprint OR development guide OR roadmap OR task breakdown OR new feature plan for this repo. Enforces checkboxes, read-`.claude`-first discipline, lint+test-after-every-block, front+back QA, no-backwards-compat, and single-source documentation in `/roadmap`.
---

# AIDevPlanning

Project-specific framework for creating structured, sprint-based development plans for the **AI Timeline Atlas** repo (letaiexplainai.com). Adapted from the broader DevPlanning skill but tuned to this codebase's stack, AWS resources, conventions, and the operating rules Wylie set for this project.

## File Location (MANDATORY)

All development plans and sprint documents live in:

```
/Users/wyliebrown/ai_timeline/
└── roadmap/
    ├── PLAN-[Initiative].md             # Master plan for a multi-sprint initiative
    ├── Sprint-[Prefix]-1-[Slug].md      # Sprint documents
    ├── Sprint-[Prefix]-2-[Slug].md
    └── Sprint-[Prefix]-N-[Slug].md
```

**Naming conventions** (match the existing `/roadmap` precedent — see `Sprint-Feed-*`, `Sprint-SEO-*`, `Sprint-TD-*`, `Sprint-Blog-*`):

- Initiatives get a short code prefix (e.g. `Feed`, `SEO`, `TD`, `Spam`, `Subj`, `LP`, `Blog`). Pick one that doesn't already exist.
- Master plan file: `PLAN-[Initiative-Name].md`.
- Sprint files: `Sprint-[Prefix]-[N]-[Kebab-Slug].md`.
- Create the `/roadmap` folder if it doesn't exist. Never scatter planning docs elsewhere.

---

## Core Principles (MANDATORY for every plan and sprint)

These principles are not optional. Every plan and every sprint doc produced by this skill must enforce them in writing — not just link to them. Copy the full workflow block into each sprint so a developer opening any single sprint sees the rules without hunting.

### 1. Read `.claude/` first, every session
Every sprint starts with a **Session Start Workflow** block that instructs the developer to open:

- `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` — project scope, AWS resources, deployment commands
- Relevant `.claude/rules/*.md` files for the work at hand:
  - `backend.md` for API/Lambda/Prisma work
  - `frontend.md` for React/Vite/Tailwind work
  - `data-models.md` for schema work
  - `subject-taxonomy.md` for Subject-linked features
  - `news-ingestion.md` for pipeline work
  - `spam-protection.md` for any comment/vote/user-content feature

Never skip this. Stale context = broken ship.

### 2. Orient inside `/roadmap/` before writing code
Open `PLAN-[Initiative].md` and the current sprint file. Find the **next unchecked `[ ]` task**. Think hard about what that task actually requires before touching code. Pick exactly one task at a time.

### 3. Write elegant code in small blocks — and lint+test **after every block, before moving on**
- Minimum code that satisfies the task. No speculative abstractions. No feature creep.
- Short comments for *why* (non-obvious invariants, constraints). Not *what* — good names do that.
- After each code block, **before starting the next**:
  - [ ] `npm run typecheck` — zero errors
  - [ ] `npm run lint` — zero errors
  - [ ] Write or update tests covering what just changed
  - [ ] Run tests: `npm test` (or targeted) — all pass
- Then, and only then, update the sprint file checkbox `[ ] → [x]` and commit.

### 4. QA live on **both** frontend and backend before closing a section
- Backend changes: `curl` the deployed endpoint, check `aws logs tail /aws/lambda/ai-timeline-api-prod --since 10m`.
- Frontend changes: verify in browser on `localhost:5173` then again on `https://letaiexplainai.com` after deploy. Use the `/Browser` skill (agent-browser CLI) for structured validation. **Do NOT use `mcp__claude-in-chrome__*` tools per project-global CLAUDE.md.**
- Screenshot or curl output is the proof.

### 5. No backwards compatibility unless Wylie explicitly requests it
Delete the old code. Rename the field. Migrate the schema. Don't leave `_deprecated` aliases, dead branches, or "legacy" adapters behind.

### 6. Deploy early, deploy often
Each sprint ends with a Deploy section. Don't let more than one sprint's worth of changes accumulate unshipped.

### 7. Don't stop until done — except for PM decisions
Only stop when (a) the sprint's Definition of Done is fully met, or (b) you hit a decision that genuinely needs Wylie's input. In case (b), write the question under the sprint's `## Blocked — PM decision needed` section, ping Wylie, and continue with any parallel unblocked work.

### 8. Single source of truth
No separate status docs. No "progress report" files. Update the sprint file's checkboxes and timestamp in place.

---

## Project Context (bake into every plan)

Plans produced by this skill must reflect the actual AI Timeline stack. Use these specifics instead of generic placeholders.

### Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS + React Router v6 + React Query |
| Backend | Express.js on AWS Lambda (`ai-timeline-api-prod`, 30s timeout) |
| Ingestion | Separate Lambda (`ai-timeline-ingestion-prod`, 300s timeout) |
| DB | PostgreSQL 15 on RDS (`ai-timeline-db`) via Prisma ORM |
| CDN/Hosting | S3 (`ai-timeline-frontend-1765916222`) + CloudFront (`E23Z9QNRPDI3HW`) |
| API Gateway | `nhnkwe8o6i` → `https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod` |
| Secrets | SSM Parameter Store (`/ai-timeline/prod/*`) |
| Auth | JWT for admin; user auth in Sprint LEarn-3 |

### Standard deployment commands

```bash
# Frontend
npm run build
aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete
aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"

# Backend
cd infra && sam build && sam deploy --no-confirm-changeset

# Database migrations (set DATABASE_URL from SSM, then):
export DATABASE_URL=$(aws ssm get-parameter --name "/ai-timeline/prod/database-url" --with-decryption --query "Parameter.Value" --output text)
npx prisma migrate deploy
```

### Standard quality gates (developers run these in this order, after every code block)

```bash
npm run typecheck       # zero errors
npm run lint            # zero errors
npm test                # or targeted: npm test -- [pattern]
npm run build           # only before deploy
```

### Project-specific rule files to reference in sprints

- `.claude/rules/backend.md` — API endpoints, deployment, SSM params
- `.claude/rules/frontend.md` — component structure, routing, styling
- `.claude/rules/data-models.md` — Prisma schemas for Person, Organization, Milestone, etc.
- `.claude/rules/subject-taxonomy.md` — 3-level subject hierarchy, ContentSubject
- `.claude/rules/news-ingestion.md` — multi-source pipeline
- `.claude/rules/spam-protection.md` — rate limits, trust tiers, moderation

---

## AWS Resource Guidelines

**Before provisioning ANY new AWS resource**, the sprint must include these tasks:

- [ ] Run `aws [service] list-*` or equivalent to check what already exists
- [ ] Prefer extending existing resources over creating new ones (e.g., add a route to `ai-timeline-api-prod` rather than a new Lambda)
- [ ] For billable resources, document the cost estimate in the sprint and **flag under `## Blocked — PM decision needed` until Wylie approves**
- [ ] Update `.claude/CLAUDE.md` or `.claude/rules/backend.md` with any new resource so future devs know it exists

---

## Browser Validation (MANDATORY for web features)

The project-global `CLAUDE.md` requires `agent-browser` (via the `/Browser` skill) for web automation. **Never use `mcp__claude-in-chrome__*` tools** in this repo.

Every sprint that touches web UI must include a Browser Validation section with these steps:

```markdown
### Browser Validation (agent-browser via /Browser skill)

- [ ] Open deployed URL: `agent-browser open https://letaiexplainai.com/[route]`
- [ ] Take initial screenshot: `agent-browser screenshot`
- [ ] Get interactive snapshot: `agent-browser snapshot -i` (yields @e1, @e2, ...)
- [ ] Test primary user flow: `agent-browser click @eN` / `agent-browser fill @eN "text"`
- [ ] Verify expected UI states (loaded, empty, error, dark mode)
- [ ] Take final screenshot: `agent-browser screenshot`
- [ ] Verify mobile viewport: `agent-browser resize 375 812 && agent-browser screenshot`
- [ ] Confirm zero console errors and zero 4xx/5xx network responses
```

Do NOT mark web tasks complete or request human support without screenshots as evidence.

---

## Backend Validation (MANDATORY for API changes)

```markdown
### Backend Validation (curl + CloudWatch)

- [ ] Smoke test each new/changed endpoint via curl against prod:
      `curl https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod/api/[path]`
- [ ] For admin endpoints: obtain JWT via `POST /api/auth/login` and hit with `Authorization: Bearer`
- [ ] Tail logs: `aws logs tail /aws/lambda/ai-timeline-api-prod --since 10m --follow` — zero errors
- [ ] Confirm RDS connection pool not exhausted (check recent commits like ac509e1 reduced pool)
- [ ] If schema changed: `npx prisma migrate deploy` against prod, confirmed migration row exists
```

---

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **CreatePlan** | "plan project", "new roadmap", "development plan", "plan [feature]" | `Workflows/CreatePlan.md` |
| **CreateSprint** | "create sprint", "new sprint", "sprint N for [feature]" | `Workflows/CreateSprint.md` |
| **UpdateSprint** | "update sprint", "sprint progress", "mark complete", "finished [X]" | `Workflows/UpdateSprint.md` |

---

## Required Sprint Document Structure

Every sprint doc produced by this skill MUST include these sections, in order:

1. **Progress Tracking disclaimer** + Last updated line
2. **Session Start Workflow (MANDATORY)** — reminds dev to read `.claude/`, pick one unchecked task, lint+test after every block, QA front+back, stop only when done or PM-blocked
3. **Overview** — goal, scope, priority, depends-on, estimated effort, status
4. **Prerequisites** — unchecked `[ ]` boxes for anything that must be true before work starts
5. **Tasks** — unchecked `[ ]` boxes, grouped by logical category, with concrete file paths and commands
6. **Backend Validation** (if API touched)
7. **Browser Validation** (if UI touched)
8. **Definition of Done** — unchecked `[ ]` boxes that together = "sprint is shipped"
9. **Files Touched (expected)** — list so reviewers can scope the diff
10. **Blocked — PM decision needed** — open questions for Wylie

---

## Example: Sprint Session Start Workflow Block (copy into every sprint)

```markdown
## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files (e.g. `backend.md`, `frontend.md`, `data-models.md`).
2. Re-read the Session Start Workflow and Core Principles in the AIDevPlanning skill — do not skip.
3. Confirm any prerequisite sprints' Definitions of Done are fully checked. If not, finish them first.
4. Open this file. Find the next unchecked `[ ]` task — start there. Pick exactly one.
5. For every code block you write: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → QA front+back → commit → check the box.
6. Use `/Browser` (agent-browser) for UI validation. Never use `mcp__claude-in-chrome__*`.
7. No backwards compatibility unless Wylie explicitly asked for it.
8. Stop only when the Definition of Done below is fully met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).
```

---

## Examples of when this skill fires

**Example 1** — planning a new feature
```
User: "Plan a podcast section for the site"
→ Invokes CreatePlan workflow
→ Confirms short prefix (e.g. `Pod`), creates `PLAN-Podcast.md`
→ Breaks into sprints (data model, reader UX, admin, integration, SEO, polish)
→ Every sprint has the MANDATORY Session Start Workflow block
```

**Example 2** — creating a single sprint
```
User: "Create Sprint Blog-7 for analytics integration"
→ Invokes CreateSprint workflow
→ Creates `roadmap/Sprint-Blog-7-Analytics.md`
→ Unchecked tasks, deploy section, browser + backend validation sections
```

**Example 3** — checking off progress
```
User: "I shipped the Author model and migration from Blog-1"
→ Invokes UpdateSprint workflow
→ Opens `roadmap/Sprint-Blog-1-Data-Model-API.md`
→ Marks the Author-model and migration tasks `[x]`
→ Updates "Last updated" line with today's date
```

---

## Anti-patterns (never do these)

- Scatter plan docs outside `/roadmap/`
- Create a separate "status" or "progress" document
- Write generic workflow language instead of baking in this project's actual AWS resources and commands
- Omit the Session Start Workflow block from a sprint "to save space"
- Reference `mcp__claude-in-chrome__*` tools (project-global CLAUDE.md forbids them)
- Leave backwards-compat shims unless Wylie asked for them
- Check a task `[x]` without having run typecheck + lint + tests + live QA
- Stop for anything other than sprint-done or a genuine PM-level decision
