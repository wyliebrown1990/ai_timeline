# Sprint SEOI-3: SEOAuditAgent Skill + Voice File

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-30 by Codex (skill scaffolding landed; dry-run still blocked)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and the relevant `.claude/rules/*.md` files. Also read existing skills for pattern reference: `.claude/skills/AIBlogDraft/SKILL.md`, `.claude/skills/AIBlogDraft/blog_voice.md`, `.claude/skills/AISEOReview/SKILL.md`.
2. Re-read the parent PLAN (`roadmap/PLAN-SEO-Insights-Pilot.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm SEOI-1 and SEOI-2 DoDs are fully checked. If not, finish them first.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. **No traditional code in this sprint** — outputs are markdown skill files. The lint+test discipline still applies (markdown linting on the skill files; manual dry-run validation against real GSC data instead of unit tests).
6. Use `/Browser` (agent-browser) for UI validation. Never use `mcp__claude-in-chrome__*`. (This sprint has no UI — Browser Validation is N/A.)
7. No backwards compatibility — this is a fresh skill.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie (document it under `## Blocked — PM decision needed`).

---

## Overview

Design and ship the `/SEOAuditAgent` skill that every later sprint composes against. This is the **slop-prevention layer** — the single document set that defines what the agent will and will not do, and the voice file (`seo_voice.md`) that accumulates learnings the way `blog_voice.md` does for `/AIBlogDraft`. No agent automation runs yet. Validation is a manual dry-run: invoke the skill against real GSC data from SEOI-2, review the output with Wylie, iterate until the recommendations would survive review.

The bet: a well-designed skill on day one is the cheapest insurance against months of slop later.

**Priority**: HIGH (gates everything in SEOI-4 onward)
**Depends on**: SEOI-1, SEOI-2 (need real bucket findings to dry-run against)
**Estimated Effort**: 1-2 days
**Status**: In progress — skill files, playbooks, and voice/slop scaffolding are in repo. Remaining work is the live dry-run, `/AISEOReview` passes, and Wylie review.

---

## Prerequisites

- [ ] SEOI-1 and SEOI-2 DoDs fully checked
- [ ] At least 1 week of real findings visible at `/admin/seo-insights` for dry-run material
- [ ] Read `.claude/skills/AIBlogDraft/SKILL.md` and `blog_voice.md` for the pattern this sprint mirrors
- [ ] Read `.claude/skills/AISEOReview/SKILL.md` to understand what review-quality bars already exist (avoid reinventing them)
- [ ] Local dev server running: `npm run dev` + `npm run dev:server`

---

## Tasks

### 1. Skill scaffolding

- [ ] Create directory: `.claude/skills/SEOAuditAgent/`
- [ ] Create `.claude/skills/SEOAuditAgent/SKILL.md` with frontmatter:
  ```markdown
  ---
  name: SEOAuditAgent
  description: SEO audit agent for letaiexplainai.com. Reads GSC insights from /admin/seo-insights, classifies findings into action lanes (auto-ship cosmetic, propose content, human-only), composes with /AIBlogDraft and /AISEOReview, refuses slop. USE WHEN running the weekly SEO digest, reviewing GSC findings, scoping a metadata rewrite or content gap.
  ---
  ```
- [ ] Body sections (covered in Tasks 2-7 below)

### 2. Skill body — invocation + phases

Document the 5 phases the skill runs through. Mirror `/AIBlogDraft`'s phase discipline.

- [ ] **Phase 0 — Mode selection.** Three modes: `digest` (weekly all-bucket sweep), `bucket` (deep-dive on one bucket), `finding` (single-finding action). Skill detects from invocation; asks if ambiguous.
- [ ] **Phase 1 — Read context.** Read `seo_voice.md`, `slop_categories.md`, the relevant bucket playbook, and the most recent 4 weekly digests' `seo_voice.md` entries. Never skip.
- [ ] **Phase 2 — Pull findings.** Hit `GET /api/admin/seo/insights` for the relevant bucket(s). Cap at 50 per bucket per run. Skip findings already in `status='dismissed'` or `'shipped'`.
- [ ] **Phase 3 — Classify per finding into action lane.** Lanes: `auto_ship` (cosmetic only, below confidence threshold), `propose` (content creation, must use `/AIBlogDraft` or generate a glossary/milestone draft, never publishes), `human_only` (kill page, redirect, IA change, anything ambiguous).
- [ ] **Phase 4 — Generate action artifact.** For `auto_ship`: produce the proposed seoTitle/seoDescription with rationale + confidence score. For `propose`: produce a content brief (target keyword, angle, link inventory, suggested skill to invoke). For `human_only`: produce a one-paragraph "why this needs you" note with options.
- [ ] **Phase 5 — Pre-flight slop check.** Before returning any artifact, run the `slop_categories.md` checklist. Any hit downgrades the finding to `human_only` regardless of confidence.

### 3. `seo_voice.md` — accumulated learnings

- [ ] Create `.claude/skills/SEOAuditAgent/seo_voice.md` with the same structure as `blog_voice.md`:
  - **Baseline** section (pre-first-action) summarizing inferred priors from the LAEA atlas — entity-graph-first, opinion-forward, no-clickbait, under-statement.
  - **Entries** section (empty at start) — the agent appends one entry per shipped action in SEOI-5+.
  - **Append-only rule** documented inline (matches `blog_voice.md`).
  - **Reversal protocol**: if Wylie reverses a preference, the agent appends a reversal entry with date — never deletes prior learnings.

### 4. `slop_categories.md` — explicit reject list

- [ ] Create `.claude/skills/SEOAuditAgent/slop_categories.md` with the categories the agent must refuse to produce. Each category has: name, definition, example of what NOT to write, recovery action ("if you catch yourself producing this, do X instead"). Mandatory categories:
  - **Keyword stuffing** — repeating the target keyword unnaturally. Recovery: cut to ≤2× density, link the rest naturally.
  - **Generic listicles** — "Top 10 X you need to know" with no thesis. Recovery: turn into an opinion piece or kill the proposal.
  - **Duplicate content with existing entity pages** — e.g., a blog post that recapitulates the `/glossary/X` page without adding analysis or news hooks. Recovery: pivot the angle or link the glossary entry instead of duplicating it.
  - **Voice drift** — language that doesn't match `seo_voice.md` baseline (hyperbolic adjectives, hyped numbers, AI-sounding fillers like "in this article we will explore"). Recovery: rewrite per voice file.
  - **Hallucinated entities** — referencing a person, paper, or event not in the atlas's database without explicit primary-source citation. Recovery: fact-check; if the entity is real but not in the DB, flag for population before drafting.
  - **Forced "vs" framing on non-comparative topics** — slapping "X vs Y" on a finding that isn't comparative. Recovery: drop the framing; use the natural angle.
  - **Metadata padding** — seoTitle that exceeds 60 chars to cram a keyword, or seoDescription that abandons readability for keyword count. Recovery: cap at 60/155, prioritize click-through over keyword density.

### 5. Bucket playbooks

For each of the four buckets, write a tactical playbook. These are the "how do you handle a finding in this bucket" docs the agent reads before acting.

- [ ] `bucket_playbooks/winnable-losses.md`:
  - **Default lane**: `auto_ship` if confidence ≥ 0.8 AND impressions ≥ 100 AND target type ∈ {`blog_post`} (other entity types are SEOI-7 expansion candidates).
  - **Action**: rewrite seoTitle and seoDescription. Cap title at 60 chars, description 140-160. Keep the existing canonical entity URL; never change the slug.
  - **Confidence formula**: starts at 1.0; subtract 0.2 if any slop category hits, 0.15 if seoTitle would change >50% of original, 0.1 if the page hasn't been touched in <14 days (recency penalty — let the change settle before acting again).
  - **Hard refusals**: never auto-ship if the page has any pending blog comment moderation flag, never auto-ship within 30 days of the previous auto-ship for the same page.
- [ ] `bucket_playbooks/content-gaps.md`:
  - **Default lane**: `propose` (always — content creation never auto-ships).
  - **Action**: generate a content brief, then invoke `/AIBlogDraft` topic mode. Brief includes target keyword, suggested angle, existing entity-graph link inventory, news hooks (last 14 days from `/api/admin/articles` if relevant).
  - **Hard refusals**: don't propose if the entity already exists at `/glossary/<slug>` or `/events/<id>` and the gap is purely descriptive — fix the entity, don't write a duplicate post.
- [ ] `bucket_playbooks/trend-signals.md`:
  - **Default lane**: `propose`.
  - **Action**: generate a brief framed around "what's new in this query area in the last 14 days" and route to `/AIBlogDraft` research mode (which already scans recent articles). Or, if the query maps to an existing entity that's stale, propose an entity refresh instead.
  - **Hard refusals**: don't propose two trend posts for the same query within 30 days.
- [ ] `bucket_playbooks/decay.md`:
  - **Default lane**: `propose` for content refresh; `human_only` for redirects/kills.
  - **Action**: generate a refresh brief (what's stale, what to update, which sections to expand) for the page's editor to review. Never auto-edits.
  - **Hard refusals**: never auto-edit a published blog post body or a published milestone description. Editorial drift is a known slop vector.

### 6. Composition with existing skills

- [ ] In `SKILL.md`, document explicit composition rules:
  - For `propose` lane on content gaps and trend signals: **always invoke `/AIBlogDraft`** rather than drafting directly. Pass the content brief as `topic`. The voice file in `/AIBlogDraft` does the editorial work; `/SEOAuditAgent` does the SEO work.
  - For `human_only` lane on architectural decisions: surface to Wylie with a one-line offer to invoke `/AITechLeadReview` or `/AIUXLeadReview` for a deeper opinion before acting.
  - For pre-publish review of any auto-shipped metadata change: optionally invoke `/AISEOReview` against the proposed seoTitle/seoDescription if confidence is between 0.7 and 0.8 (the borderline lane). Below 0.7 → don't auto-ship at all; above 0.8 → auto-ship without review.
- [ ] Document what `/SEOAuditAgent` does NOT do (so future devs don't expand scope blindly):
  - Does not implement SEO infra (sitemaps, structured data, canonical tags) — that's `Sprint-SEO-1` foundation work, already shipped.
  - Does not write blog post bodies — delegates to `/AIBlogDraft`.
  - Does not score E-E-A-T — delegates to `/AISEOReview`.
  - Does not deploy code — agent execution is markdown-driven; the action endpoints in SEOI-4+ are what actually ship changes.

### 7. Hard guardrails (the auto-ship safety bar)

- [ ] In `SKILL.md` under `## Safety + anti-patterns`, document explicitly (these become the test cases the agent self-checks against in every run):
  - **Never auto-ships blog post bodies.** Auto-ship is metadata-only (seoTitle, seoDescription) — never bodyMarkdown.
  - **Never auto-ships across more than N=3 entities per week** (configurable; default 3). Cap exists to limit blast radius if the skill regresses.
  - **Never auto-ships without an audit-log entry** (SEOI-4 enforces this server-side too).
  - **Always surfaces "weird" findings to a human** — definition: any finding where confidence < 0.6, or any finding that hits a slop category, or any finding where the bucket score is in the top 3 but the suggested action is "unclear". These go straight to `human_only` regardless of bucket.
  - **Always reads the voice file before producing language.** If `seo_voice.md` is unreadable or empty, downgrade every action to `propose` (no auto-ship).
  - **Pause switch.** If `SSM /ai-timeline/prod/seo-agent-paused == "true"`, agent runs but only produces the digest; takes no action. SEOI-5/SEOI-7 wire this into the live agent.

### 8. Dry-run validation

This sprint's "tests" are manual dry-runs against real data. No automated test suite — the skill is markdown.

- [ ] Pull this week's findings from each bucket: 5 from each, capped to a list with a healthy mix of confidence levels:
  ```bash
  for b in winnable_loss content_gap trend_signal decay; do
    curl -sS "https://letaiexplainai.com/api/admin/seo/insights?bucket=$b&limit=5" \
      -H "Authorization: Bearer $TOKEN" > /tmp/findings-$b.json
  done
  ```
- [ ] Manually invoke the skill in a Claude Code session: paste the findings, walk Phases 1-5, capture the agent's classification + artifact for each finding.
- [ ] Review with Wylie: for each of the 20 findings, was the lane correct? Was the artifact (rewrite text, content brief, human-only note) high-quality? Would you ship it?
- [ ] **Invoke `/AISEOReview` on the 5 winnable-loss artifacts** (the proposed seoTitle/seoDescription rewrites). Pass the dry-run output as input and ask: "Do these proposed metadata rewrites pass the technical-SEO bar — keyword placement, length (≤60 / 140-160 chars), click-through value, no keyword stuffing, structured-data implications? Flag anything that would underperform vs the original metadata." This is the SEO-quality gate that AISlopReviewer / AITechLeadReview / AIUXLeadReview don't cover. If `/AISEOReview` rejects ≥2 of 5, treat it as a skill-output regression and tighten `winnable-losses.md` playbook before SEOI-4 ships.
- [ ] **Invoke `/AISEOReview` on 2-3 content-gap briefs** from the dry-run. Ask: "Do these proposed angles have a thesis (vs a recap)? Is the target keyword winnable on SERP given LAEA's E-E-A-T posture? Are the entity-graph link inventories deep enough to support first-mention internal linking? Would you greenlight `/AIBlogDraft` to draft from these briefs?" Output of this gates SEOI-6's Brief generator service threshold tuning.
- [ ] Iterate: if any finding is misclassified, any artifact would be rejected, or `/AISEOReview` flags SEO-quality issues, update the relevant playbook or `slop_categories.md`. Re-run the dry-run.
- [ ] Capture the final dry-run + Wylie's review + `/AISEOReview` notes in a one-time `dry-run-2026-04-30.md` doc inside the skill folder so future sprints can see what good output looked like at launch.

### 9. Documentation + commit

- [ ] Update `.claude/CLAUDE.md` Quick Commands or a new "Skills" section to mention `/SEOAuditAgent` as part of the SEO workflow.
- [ ] Add a brief entry in `.claude/rules/backend.md` linking to the skill (since SEOI-4+ wire it into Lambda routes).
- [ ] Commit:
  ```
  feat(seoi-3): SEOAuditAgent skill — slop-prevention layer for SEO automation
  ```

### 10. Tests

This sprint has no automated tests (it's markdown). Validation is the dry-run in Task 8 plus:

- [ ] Lint markdown: `npx markdownlint-cli2 .claude/skills/SEOAuditAgent/**/*.md` (or whatever the project uses; if no markdown linter is wired, skip this — flag for SEOI-7 polish)
- [ ] Re-read every file in the skill folder one last time before considering it shipped — typos, inconsistencies, broken intra-skill links

### 11. Deploy

This sprint has no Lambda or frontend deploy. Deploy = git push.

- [ ] `git add .claude/skills/SEOAuditAgent/`
- [ ] `git commit -m "feat(seoi-3): SEOAuditAgent skill"`
- [ ] `git push`
- [ ] Verify the skill is discoverable in a fresh Claude Code session: type `/SEOAuditAgent` and confirm it loads

### Browser Validation

N/A — this sprint has no UI surface. SEOI-2 already shipped the `/admin/seo-insights` page that the agent reads from.

### Backend Validation

N/A — this sprint adds no API endpoints. The agent reads from SEOI-1/SEOI-2 endpoints already validated there.

---

## Definition of Done

- [ ] All tasks above checked
- [ ] `.claude/skills/SEOAuditAgent/` exists with: `SKILL.md`, `seo_voice.md`, `slop_categories.md`, and 4 bucket playbooks
- [ ] Manual dry-run against ≥20 real findings completed; Wylie has reviewed and approved the output quality
- [ ] `dry-run-2026-04-30.md` (or dated equivalent) captured in the skill folder as a baseline reference
- [ ] Skill is invocable: typing `/SEOAuditAgent` in Claude Code lists the skill and runs without error
- [ ] CLAUDE.md mentions the skill
- [ ] `seo_voice.md` baseline section is fleshed out (Entries section legitimately empty — no actions shipped yet)
- [ ] Sprint file timestamp updated

---

## Files Touched (expected)

```
.claude/skills/SEOAuditAgent/SKILL.md                          (new)
.claude/skills/SEOAuditAgent/seo_voice.md                      (new)
.claude/skills/SEOAuditAgent/slop_categories.md                (new)
.claude/skills/SEOAuditAgent/bucket_playbooks/winnable-losses.md  (new)
.claude/skills/SEOAuditAgent/bucket_playbooks/content-gaps.md     (new)
.claude/skills/SEOAuditAgent/bucket_playbooks/trend-signals.md    (new)
.claude/skills/SEOAuditAgent/bucket_playbooks/decay.md            (new)
.claude/skills/SEOAuditAgent/dry-run-2026-04-30.md             (new — baseline reference)
.claude/CLAUDE.md                                              (modify — mention skill)
.claude/rules/backend.md                                       (modify — link to skill from SEO section)
```

---

## Blocked — PM decision needed

1. **Confidence threshold for auto-ship.** Default plan in `winnable-losses.md`: confidence ≥ 0.8. This is a guess — calibrate after SEOI-5 has 4 weeks of measured data. **Ship with 0.8 default, plan to revisit in SEOI-7.**
2. **Voice file seed.** The `seo_voice.md` baseline section needs Wylie's input for a few rules that aren't inferrable from existing voice files (e.g., do we ever rewrite an old blog post's seoTitle, or only newer posts? Hard cutoff date?). **Decision needed before Task 3 ships.**
3. **Markdown linter.** Project has no markdown linter wired today. Adding `markdownlint-cli2` is ~5 minutes but adds a dep. Default plan: skip in this sprint, add in SEOI-7. **Default OK unless Wylie wants it now.**
4. **Dry-run requires live findings + Wylie review.** The repo scaffolding is ready, but the first real pass through `/admin/seo-insights` cannot happen until SEOI-1/2 are deployed with data and Wylie can judge the outputs.

---

## Tech Lead Review (2026-04-30)

Verification against actual codebase. See `PLAN-SEO-Insights-Pilot.md` "Tech Lead Review" section for cross-cutting findings.

### Critical

(None.)

### Moderate

- **M1. `dry-run-2026-04-30.md` is a new convention inside the skill folder.** Existing skill folders (e.g. `.claude/skills/AIBlogDraft/`) contain `SKILL.md` and a single voice file (`blog_voice.md`). No skill folder currently has a dated dry-run reference. Acceptable but worth flagging — recommend either: (a) keeping the dry-run as a top-level entry in `seo_voice.md` baseline section instead of a separate file, or (b) committing it as a clearly-labeled reference (the plan's current approach) and documenting in the skill's SKILL.md that it's frozen-in-time, not a living doc. Either works; pick one and stay consistent.
- **M2. Existing `seoContentGenerator.ts` service is unrelated** — confirmed at `server/src/services/seoContentGenerator.ts` (Sprint SEO-4: generates Explained/WhoInvented page content). The new `/SEOAuditAgent` skill is purely markdown and doesn't touch services this sprint. SEOI-4 will sit alongside the existing service in `services/seo/` namespace — no conflict.
- **M3. Composition references to `/AIBlogDraft`, `/AISEOReview`, `/AITechLeadReview`, `/AIUXLeadReview` are valid.** Verified at `.claude/skills/AIBlogDraft/SKILL.md`, `.claude/skills/AISEOReview/SKILL.md`, etc. — all four target skills exist on disk.

### Minor

- **Mi1. Markdown linter deferral to SEOI-7 is sensible.** Confirmed: project has no markdown linter today (no `.markdownlint.json`, no `markdownlint-cli2` in `package.json`).
- **Mi2. Skill discovery test.** The DoD says "typing `/SEOAuditAgent` in Claude Code lists the skill and runs without error." Skills are discovered from `.claude/skills/<name>/SKILL.md` with valid frontmatter. The plan's frontmatter template (`name`, `description`) is correct. Note: the `description` triggers when the skill is auto-loaded based on conversation context — make sure it includes recognizable trigger phrases ("SEO audit", "GSC findings", "weekly SEO digest").

### What's verified correct

- Skill folder location `.claude/skills/SEOAuditAgent/` matches existing skill convention ✓
- Voice file pattern mirrors `blog_voice.md` ✓
- No code or test changes needed in this sprint (markdown-only) ✓
- Phase discipline (Phase 0-5) matches `/AIBlogDraft` precedent ✓
- Slop categories list is comprehensive and project-specific ✓
- Composition with existing skills correctly identified ✓

### Effort impact

No code patches. The `dry-run-2026-04-30.md` convention question (M1) is a 5-min decision before implementing Task 8.

---

## Slop Findings (AISlopReviewer — 2026-04-30)

This is the cleanest sprint of the seven from a slop perspective — markdown-only deliverables, no service layer touched, and the skill structure mirrors the proven `/AIBlogDraft` pattern.

### P0

(None.)

### P1

(None.)

### P2

(None.)

### P3

- **P3-S1. `dry-run-2026-04-30.md` filename convention is new.** Cross-referenced from TLR M1. Recommend: keep the dry-run as a top-level entry in `seo_voice.md` baseline section instead of a separate file (matches `/AIBlogDraft` precedent — single voice file per skill). Or commit as a stable reference doc and document its frozen-in-time status in SKILL.md. Either choice is fine; the slop concern is just that two skills ending up with different artifact-naming conventions creates drift. Category 2 (Inconsistency / drift).

### Slop Avoided (this sprint embodies the right pattern — call out specifically)

- **Skill structure mirrors `/AIBlogDraft`.** 5 phases, voice file, slop categories file, bucket playbooks, safety + anti-patterns. Future skill authors should use this sprint + the AIBlogDraft skill as the joint template — both projects respect the same 5-phase + voice-file + safety-section discipline.
- **Slop categories are project-specific and grounded in real failure modes.** `slop_categories.md` lists 7 categories (keyword stuffing, generic listicles, duplicate-with-existing-entity, voice drift, hallucinated entities, forced "vs" framing, metadata padding). Each maps to a concrete failure mode visible in `blog_voice.md` history. **Not over-engineered** — every category has a recovery action documented.
- **3-layer slop guard (skill pre-flight + server-side guardrails + post-ship drift detector) is appropriately paranoid, not redundant.** Each layer catches different failure stages: pre-shape (skill), pre-write (server), post-write (drift). Plan correctly enforces all three independently.
- **Composition with sibling skills documented explicitly.** `/AIBlogDraft` for content drafting, `/AISEOReview` for borderline-confidence review, `/AITechLeadReview` and `/AIUXLeadReview` for human-only escalations. No reinventing of those skills' checklists.
- **Hard refusals defined in code, not just policy.** "Never auto-ships blog post bodies," "max 3/week blast radius," "always reads voice file before producing language" — these are guardrails the service layer enforces in SEOI-4 (`metadataRewriter.ts`), not just guidelines in markdown. Defense in depth.
- **No backwards-compat shims.** Skill is fresh — no legacy fallback paths.
- **Dry-run validation against real findings** before agent automation runs. Treats human approval as the calibration mechanism — exactly the right discipline for a slop-prevention skill.
- **No `mcp__claude-in-chrome__*`, no `VITE_*` secrets, no IaC-bypass** — sprint is markdown-only so most rules don't apply, but where they could (the SKILL.md description), they're respected.
