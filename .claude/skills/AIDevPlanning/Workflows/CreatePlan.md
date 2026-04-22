# CreatePlan Workflow (AI Timeline)

Create a master `PLAN-[Initiative].md` plus the full set of `Sprint-[Prefix]-N-*.md` files for a new multi-sprint initiative on the AI Timeline Atlas project.

## Trigger Phrases
- "plan project"
- "new roadmap"
- "development plan"
- "plan [feature/system]"
- "plan a blog section" / "plan a podcast feature" / etc.

## Execution Steps

### 1. Read project context (MANDATORY)

```bash
cat /Users/wyliebrown/ai_timeline/.claude/CLAUDE.md
ls /Users/wyliebrown/ai_timeline/.claude/rules/
ls /Users/wyliebrown/ai_timeline/roadmap/        # see existing prefixes to avoid clashes
```

Read any rule files relevant to the initiative (`backend.md`, `frontend.md`, `data-models.md`, `subject-taxonomy.md`, `news-ingestion.md`, `spam-protection.md`).

Scan existing sprints to confirm:
- No code prefix collision (`Feed`, `SEO`, `TD`, `Spam`, `Subj`, `LP`, `Blog`, `Bib` are taken)
- No duplicated scope — if an existing sprint already owns this area, extend it instead of creating a new one

### 2. Clarify with Wylie (only if needed)

Ask only if genuinely blocking:
- Is this a multi-sprint initiative or a single sprint?
- Any hard deadline?
- Any infra constraint (new AWS resource? cost approval needed?)

Default assumption: multi-sprint; no deadline; prefer extending existing infra.

### 3. Create the master plan

**Location**: `/Users/wyliebrown/ai_timeline/roadmap/PLAN-[Initiative-Name].md`

Use this template — do not trim sections:

```markdown
# [Initiative Name] — Development Plan

> **Project**: [One-line description]
> **Code Prefix**: `[Prefix]`
> **Start Date**: [YYYY-MM-DD]
> **Product Manager**: Wylie
> **Status**: Planning — ready to execute Sprint [Prefix]-1

---

## Vision
[2-4 sentences — what this initiative does for letaiexplainai.com and why now.]

## Success Metrics
- [Concrete, measurable — e.g. "≥3 featured posts live within 30 days"]
- [...]

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
| [...]     | [...]  | [...]     |

## Data Model Summary
[Prisma pseudo-code for new models; link to Sprint-N for full definitions.]

## API Surface Summary
```
GET    /api/[resource]
POST   /api/admin/[resource]
[...]
```

## Frontend Routes Summary
```
/[route]
/[route]/:slug
/admin/[route]
```

## Sprint Overview
| Sprint | Focus | Key Deliverables | Estimated Effort |
|--------|-------|------------------|------------------|
| **[Prefix]-1** | [...] | [...] | [N days] |
| **[Prefix]-N** | [...] | [...] | [N days] |

**Total estimated effort**: [range].

---

## Prevalence / Integration Strategy
[If applicable — how this feature becomes discoverable from existing surfaces: header, homepage, entity pages, sitemap, RSS.]

## Risks & Open Questions
- [...]

---

## Definition of Done (whole initiative)
- [ ] All sprint DoDs checked
- [ ] Deployed to prod
- [ ] Smoke test end-to-end
- [ ] Lighthouse thresholds met (if frontend)
- [ ] CloudWatch clean post-launch
```

### 4. Create every sprint file

For each row in the Sprint Overview table, invoke the **CreateSprint** workflow (`Workflows/CreateSprint.md`). Each sprint doc must include the full Session Start Workflow block — do NOT just link to the PLAN.

### 5. Output format

```
SUMMARY: Created development plan for [Initiative]
CODE PREFIX: [Prefix]
SPRINTS: [N] sprints defined
FILES:
  - roadmap/PLAN-[Initiative-Name].md
  - roadmap/Sprint-[Prefix]-1-[Slug].md
  ...
  - roadmap/Sprint-[Prefix]-N-[Slug].md
NEXT: Begin Sprint [Prefix]-1 tasks starting with the first unchecked [ ] box.
```

---

## Rules (enforced)

1. **Real project context, not placeholders** — reference actual AWS resources (`ai-timeline-frontend-1765916222`, `E23Z9QNRPDI3HW`, `ai-timeline-api-prod`, `nhnkwe8o6i`), actual deployment commands, actual Prisma models.
2. **Checkboxes everywhere** — every actionable item uses `[ ]`.
3. **Session Start Workflow in every sprint** — copy the full block, don't link.
4. **Prefix-check** — scan `/roadmap/` to avoid code prefix collisions before naming.
5. **No time estimates on individual tasks** — effort estimates belong only in the Sprint Overview table.
6. **Single source** — never duplicate task lists across files.
7. **Prevalence thinking** — if the feature is user-facing, the plan must include how it gets discovered (header nav, homepage, cross-entity injections).
8. **AWS cost flag** — any new billable resource becomes a `Blocked — PM decision needed` item.
9. **Browser validation via `/Browser` only** — never reference `mcp__claude-in-chrome__*` (project-global rule).
10. **No backwards-compat shims** unless Wylie explicitly asked.

---

## Example invocation

```
User: "Plan a podcast section for the site"

→ Read .claude/CLAUDE.md + frontend.md + backend.md + data-models.md
→ Check /roadmap/ — no `Pod` prefix exists, safe to use
→ Ask Wylie only if critical (default: multi-sprint, no deadline)
→ Write roadmap/PLAN-Podcast.md with:
    Vision, Success Metrics, Developer Workflow (full), Stack,
    Data Model (PodcastEpisode, PodcastShow), API surface, Routes,
    Sprint Overview (Pod-1 Data+API, Pod-2 Reader UX, Pod-3 Admin CMS,
    Pod-4 RSS+Cross-linking, Pod-5 SEO+Prevalence, Pod-6 Polish),
    Prevalence Strategy, Risks, Initiative DoD
→ Invoke CreateSprint for each sprint, passing context from PLAN
→ Output SUMMARY with file list and "Begin Sprint Pod-1"
```
