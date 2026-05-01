# LAEA Slop Ledger

Single-source append-only ledger of known slop in the AI Timeline Atlas codebase, tracked across sprints.

**How to use this file:**

- **Append rows.** Don't delete or rewrite history. If a finding gets fixed, mark `Status: FIXED` and link the sprint that fixed it.
- **In-scope vs out-of-scope.** Slop discovered while reviewing a sprint plan that's NOT in that sprint's scope goes here. Slop in the sprint itself goes in the sprint's `## Slop Findings` section.
- **Created by `/AISlopReviewer`.** Future runs append to this file; sprints fixing rows update the Status column.

---

## Format

```markdown
| ID | Date | Discovered During | Category | Location | Severity | Status | Note |
```

- **ID**: `LEDGER-NNN` (zero-padded, append-only)
- **Date**: `YYYY-MM-DD`
- **Discovered During**: `Plan Review: <plan-name>` or `Sprint <prefix-N>` or `Audit`
- **Category**: one of the 17 from `/AISlopReviewer` SKILL.md (e.g. `1.1 Parallel helpers`, `12 Architectural drift`)
- **Location**: file path + brief description (no line numbers — they drift)
- **Severity**: `P0` / `P1` / `P2` / `P3`
- **Status**: `OPEN` / `IN_PROGRESS` / `FIXED` / `WONTFIX`
- **Note**: one-line context. If `FIXED`, link the sprint or commit.

---

## Open

| ID | Date | Discovered During | Category | Location | Severity | Status | Note |
|---|---|---|---|---|---|---|---|
| LEDGER-001 | 2026-04-30 | Plan Review: SEO Insights Pilot | 1.5 Re-derived constants + 12 Architectural drift | `server/src/services/*.ts` (16+ services) | P3 | OPEN | Direct `new Anthropic({ apiKey })` instantiation duplicated across 16+ services (`seoContentGenerator.ts`, `newsQuizGenerator.ts`, `articleAnalyzer.ts`, `keyFigures.ts`, `glossary.ts`, `aiPrerequisiteSuggestions.ts`, `newsContextGenerator.ts`, `newsConceptLinker.ts`, etc.). `services/claude.ts` exists but is not used uniformly. NOT introduced by SEO Insights Pilot — it inherits the pattern. Future cleanup: extract a thin `claudeClient.ts` wrapper that takes API key from SSM env, returns a configured client, and centralizes model-ID constants. ~1 day refactor, blast radius = 16 imports. Cleanup-when-touched candidate; don't open a dedicated sprint until a feature naturally requires it. |
| LEDGER-002 | 2026-05-01 | Plan Review: SEO Insights Post-Pilot Track (SEOI-8 to SEOI-11) | 2 Inconsistency / drift + 1.1 Parallel helpers risk | `prisma/schema.prisma` — `SeoAgentAction`, `SeoProposal`, `SeoExperiment` (SEOI-9), `KeywordOpportunity` (SEOI-11) | P2 | OPEN | After SEOI-11 lands the schema will have FOUR overlapping shapes for "approved-or-candidate SEO action with target/source/measurement metadata." The four roles ARE genuinely distinct (auto-shipped vs draft vs scheduled-experiment vs pre-impression scout), but the schema alone doesn't communicate the taxonomy. Risk: future devs merge two by accident, fork a fifth, or duplicate functionality across them. Fix lives in `roadmap/PLAN-SEO-Insights-Pilot.md` "Slop Findings — Post-pilot expansion track" CC-P1: add the 4-row taxonomy to the PLAN's Data Model Summary section + Prisma `///` comments on each model. Mark FIXED when SEOI-9 or SEOI-11 ships and the comments + PLAN edit land. |
| LEDGER-003 | 2026-05-01 | Plan Review: SEO Insights Post-Pilot Track | 16 Process & verification gaps | Sprint planning template | P3 | OPEN | All four post-pilot sprints (SEOI-8/9/10/11) added new admin pages without explicitly committing to (a) per-route `requireAdmin` middleware in the route file or (b) `lazy(() => import(...))` registration in `src/App.tsx`. The conventions exist and are followed in shipped code (SEOI-1/2/4/6), but the *plan template* doesn't surface them as default sub-tasks. AISlopReviewer caught it in each sprint review, but the cheaper fix is updating the `/AIDevPlanning` skill's sprint template to surface "per-route requireAdmin" and "lazy admin page import" as default checklist items for any sprint that adds an admin route or page. Mark FIXED after the AIDevPlanning template lands the additions. |

---

## Fixed / Closed

(None yet.)

---

## Notes for Future Runs

- **Don't bolt out-of-scope findings onto sprints.** That violates `/AISlopReviewer`'s Core Principle 5. Instead, log here and let cleanup sprints address them in cohorts.
- **Severity calibration** mirrors `/AISlopReviewer` SKILL.md — P0/P1 are blocking, P2/P3 are advisory.
- **A pattern repeated 16+ times is rarely worth a P1.** It's already widespread, the cost of fixing now equals the cost of fixing later, and if the existing instances aren't causing bugs, the pattern is a *style* drift, not a *correctness* drift. Hence LEDGER-001 is P3.
