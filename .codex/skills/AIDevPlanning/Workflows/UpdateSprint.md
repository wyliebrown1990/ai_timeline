# UpdateSprint Workflow (AI Timeline)

Update an existing sprint document by checking off completed tasks, recording decisions/gotchas, logging blockers, and bumping the timestamp. Update in place — never create "status" or "progress" files.

## Trigger Phrases
- "update sprint"
- "sprint progress"
- "mark complete"
- "completed [task]"
- "finished [feature]"
- "checking off [X]"

## Execution Steps

### 1. Read project context (MANDATORY)

```bash
cat /Users/wyliebrown/ai_timeline/.claude/CLAUDE.md
ls /Users/wyliebrown/ai_timeline/roadmap/
```

Identify the right sprint file:
- If Wylie names the sprint (e.g., "Blog-3"), open `roadmap/Sprint-Blog-3-Admin-CMS.md`.
- If Wylie names a task/feature only, grep `/roadmap/` for the matching task text to locate the sprint.
- If multiple candidates match, show the list and ask which one.

### 2. Verify the work was actually done

**Before checking any box**, confirm the claimed work exists:

- [ ] File actually created/modified (check git diff or file presence)
- [ ] `npm run typecheck` returns zero errors
- [ ] `npm run lint` returns zero errors
- [ ] Tests exist for the new code and `npm test -- [pattern]` passes
- [ ] If deployed: smoke test via `curl` (backend) and/or `/Browser` skill (frontend) confirmed behavior
- [ ] CloudWatch clean: `aws logs tail /aws/lambda/ai-timeline-api-prod --since 15m`

If verification fails, **do not check the box**. Report what's missing and offer to finish it.

### 3. Update tasks in place

**Mark completed tasks** — flip `[ ]` → `[x]`. Keep the task text unchanged.

```diff
- - [ ] Create `server/src/services/blog.ts` with listPublishedPosts
+ - [x] Create `server/src/services/blog.ts` with listPublishedPosts
```

**Partial parent tasks**:
```diff
  - [ ] 3.1 Public service
-   - [ ] listPublishedPosts
+   - [x] listPublishedPosts
-   - [ ] getPublishedPostBySlug
+   - [x] getPublishedPostBySlug
    - [ ] getRelatedPosts
    - [ ] computeReadingMinutes
```

Only mark the parent `[x]` when ALL child boxes are `[x]`.

### 4. Update metadata

Always bump the "Last updated" line at the top:

```diff
- > Last updated: 2026-04-21 by Claude (sprint created — no tasks started)
+ > Last updated: 2026-04-24 by Claude (Blog-1 Tasks 1.1–1.5 complete; migration deployed)
```

Keep the parenthetical short and informative — it's the fastest way for the next developer to know where things stand.

### 5. Record decisions / gotchas (if any)

If the work produced a decision worth preserving for future devs, add a short note under an `## Implementation Notes` section (create if missing). Example:

```markdown
## Implementation Notes

### Blog-1 (2026-04-24, Claude)
- **Slug collision**: Used append-`-2`/`-3` pattern for uniqueness. Rejected randomized suffixes — harms readability.
- **RDS pool**: Confirmed pool size from commit e8e8411 still holds under new endpoints. No regression.
- **Reading time**: 200 wpm rounded up, min 1. Matches Medium's model.
```

Keep notes terse. Pointers, not essays.

### 6. Log blockers

If Wylie reports a blocker, add it to (create if missing) `## Blocked — PM decision needed`:

```markdown
## Blocked — PM decision needed

- [ ] **Scheduled-publish worker** (2026-04-24): EventBridge cron vs on-demand check inside public list endpoint. On-demand is zero-infra but timing is approximate under low traffic. Current plan: on-demand. **Flag for Wylie if we want cron.**
```

When resolved, keep the entry but flip the checkbox `[x]` and append the resolution:

```markdown
- [x] **Scheduled-publish worker** (2026-04-24, resolved 2026-04-25): Going with EventBridge cron every 5 min. Spec: ...
```

### 7. Update initiative-level PLAN (if sprint DoD hit)

If all of a sprint's Definition of Done boxes are now checked:

1. Update the sprint's "Last updated" line with `— SPRINT COMPLETE`
2. Open `roadmap/PLAN-[Initiative].md`
3. Flip the row in the Sprint Overview table from "Not Started" to "Complete ✅"
4. If this sprint unblocks the next one, note it

### 8. Commit the update

```bash
git add roadmap/Sprint-[Prefix]-[N]-[slug].md
git commit -m "docs(roadmap): mark [Prefix]-[N] tasks [X,Y,Z] complete"
```

Commit the checkbox update alongside the code change when possible — history then reflects *what shipped* per task.

### 9. Output format

```
SUMMARY: Updated Sprint [Prefix]-[N]
COMPLETED: [N] tasks marked done
REMAINING: [M] tasks pending
BLOCKERS: [count or "None"]
SPRINT STATUS: [In progress | DoD met — sprint complete]
FILE: roadmap/Sprint-[Prefix]-[N]-[slug].md
NEXT: [First unchecked task or "Begin Sprint [Prefix]-[N+1]"]
```

---

## Rules (enforced)

1. **Update in place** — never create separate status/progress/done files.
2. **Verify before checking** — don't mark `[x]` based on a developer's word; confirm via git/tests/deploy logs.
3. **Timestamp every update** — always bump the "Last updated" line.
4. **Parenthetical summary on timestamp** — tells the next dev where things stand at a glance.
5. **Preserve original task text** — never reword a task when checking it. Original text = commitment.
6. **Honest status** — partial work gets partial check-offs. Never check a parent until all children are done.
7. **AWS cost discipline** — any new billable resource noted in Implementation Notes with its monthly estimate.
8. **Validation before escalation** — use `/Browser` (agent-browser) for UI, `curl` + CloudWatch for API, before declaring a blocker.
9. **Sprint DoD propagates to PLAN** — completing a sprint updates the master plan's Sprint Overview table.

---

## Example: Partial update

**Wylie says**: "I finished the Author and BlogPost models and the migration. Deployed to prod."

**Action**:

1. Read `roadmap/Sprint-Blog-1-Data-Model-API.md`.
2. Verify: `git log prisma/` shows migration commit, `aws rds describe-db-instances` confirms RDS healthy, `npx prisma migrate status` shows the migration applied.
3. Flip the relevant boxes:

```diff
  #### 1.1 Add `Author` model
- - [ ] Add to `prisma/schema.prisma`: [...]
+ - [x] Add to `prisma/schema.prisma`: [...]

  #### 1.2 Add `BlogPost` model
- - [ ] Add to `prisma/schema.prisma`: [...]
+ - [x] Add to `prisma/schema.prisma`: [...]

  #### 1.5 Migrate
- - [ ] Run local migration: `npx prisma migrate dev --name add_blog_posts`
+ - [x] Run local migration: `npx prisma migrate dev --name add_blog_posts`
- - [ ] Verify schema changes with `npx prisma studio`
+ - [x] Verify schema changes with `npx prisma studio`
- - [ ] Commit `prisma/schema.prisma` + new migration folder
+ - [x] Commit `prisma/schema.prisma` + new migration folder
```

4. Update timestamp:

```diff
- > Last updated: 2026-04-21 by Claude (sprint created — no tasks started)
+ > Last updated: 2026-04-24 by Claude (Schema + migration deployed; controllers/routes next)
```

5. Output:

```
SUMMARY: Updated Sprint Blog-1
COMPLETED: 8 tasks marked done
REMAINING: 24 tasks pending
BLOCKERS: None
SPRINT STATUS: In progress
FILE: roadmap/Sprint-Blog-1-Data-Model-API.md
NEXT: Task 1.3 BlogPostSubject join model / Task 2 Zod types
```

---

## Example: Adding a blocker

**Wylie says**: "Blocked on Blog-5 — need to decide between Satori and @vercel/og for OG image rendering."

**Action**: add under `## Blocked — PM decision needed`:

```markdown
- [ ] **OG image renderer choice** (2026-04-28):
  - Satori (+ @resvg/resvg-js) — 0 network deps, heavier bundle, more control.
  - @vercel/og — simpler API, requires Node runtime (Lambda compatible), slightly heavier cold start.
  - **Default plan**: Satori. Flip to @vercel/og if cold start becomes painful in Lambda.
```

Update timestamp with the blocker note:

```diff
- > Last updated: 2026-04-28 by Claude (Blog-5 Tasks 1–2 complete)
+ > Last updated: 2026-04-28 by Claude (Blog-5 blocked on OG renderer choice — see PM decisions)
```

---

## Anti-patterns (never do these)

- Create a new "status update" or "DONE.md" file
- Move completed tasks to a separate "done" section (keep the list intact; `[x]` is the record)
- Remove tasks from the original list ("cleanup")
- Rewrite task text when checking it off
- Mark tasks complete without verifying the work actually exists and passes gates
- Provision AWS resources without checking what exists first
- Create billable resources without logging a PM-decision blocker
- Skip `/Browser` validation and jump straight to "I'm blocked, please help"
- Forget to propagate a completed sprint's status to the master PLAN's Sprint Overview table
