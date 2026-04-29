# Sprint PD-1: Backend Paywall Detection — schema, heuristic, API propagation

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-04-29 by Claude (initial draft)

---

## Session Start Workflow (MANDATORY)

Before touching any code:

1. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` and `.claude/rules/backend.md`, `.claude/rules/data-models.md`, `.claude/rules/news-ingestion.md`.
2. Re-read the parent PLAN (`roadmap/Paywall-Detection/PLAN-Paywall-Detection.md`) **Developer Workflow (MANDATORY)** section.
3. Confirm the `## Blocked — PM decision needed` item below is resolved (Wylie has approved swapping `urlScraper`'s reject-on-paywall behavior to persist-with-flag). If not, ask before coding.
4. Pick the next unchecked `[ ]` task below. Exactly one.
5. For every code block: `npm run typecheck` → `npm run lint` → write/update tests → `npm test` → backend curl + CloudWatch check → commit → `[ ] → [x]`.
6. Use `/Browser` (agent-browser) for UI validation — there's no UI in this sprint, but admin pages WILL break if the DTO shape changes; spot-check `/admin/articles` after deploy.
7. No backwards compatibility unless Wylie explicitly asked.
8. Stop only when the Definition of Done below is met, or when you need a PM decision from Wylie.

---

## Overview

Add paywall detection to the ingestion pipeline. Schema migration adds `isPaywalled` + `paywallReason` to `IngestedArticle` and `CurrentEvent`. A new pure heuristic module evaluates URL + content + HTTP status and stamps a reason. The existing `urlScraper.ts` paywall short-circuit changes from "reject the scrape" to "persist with flag" (PM decision required — see footer). Every existing endpoint that returns articles or news events adds the two fields to its response shape.

**Priority**: MEDIUM
**Depends on**: None — schema + heuristic are self-contained
**Blocks**: PD-2 (extension forwards new fields to `/api/admin/articles/submit`) and PD-3 (frontend reads new fields)
**Estimated Effort**: ~1 day → **revised to ~1.25 days** after Tech Lead Review (one new task: wire `newsEvents` into `getBySlugWithRelations`)
**Status**: Shipped to prod 2026-04-29

---

## Tech Lead Review (2026-04-29)

Verified every claim against the codebase. The plan's overall structure is correct; four findings reshape Task 4 (CurrentEvent publish path), expand Task 5.2 (organization service is the surprise), and tighten the `urlScraper` behavior change.

### Critical (resolved by tasks below)

- **C1 — Task 4 ("propagate flag into CurrentEvent at publish time") is under-specified. The actual publish path is `server/src/services/publishing/newsPublisher.ts:49 publishNewsEvent(draftData)`** — verified via `grep -rn "publishNewsEvent\|currentEvent.create"`. The function takes a `NewsEventDraft` (the JSON shape, not a `ContentDraft` row), so it has no access to `articleId` today. Two callers need updating:
  - `server/src/controllers/review.ts:319` — has `draft` in scope (line 308), so `draft.articleId` is reachable
  - `server/src/services/ingestion/articleAnalyzer.ts:105` — has `draft` in scope (line 95)

  **Required fix**: change `publishNewsEvent` signature to:
  ```ts
  export async function publishNewsEvent(
    draftData: NewsEventDraft,
    options: PublishOptions & { sourceArticleId?: string } = {}
  ): Promise<string>
  ```
  Inside, if `sourceArticleId` is provided, fetch the source article (`prisma.ingestedArticle.findUnique({ where: { id }, select: { isPaywalled: true, paywallReason: true } })`) and copy `isPaywalled` + `paywallReason` onto the `currentEvent.create` data block. Both callers pass `draft.articleId` through. The third creation path (`server/src/services/currentEvents.ts:155 create`) is the manual admin-create endpoint and has no source article — it correctly defaults to `isPaywalled: false`; mention this in the task to avoid re-scoping it later.

- **C2 — Task 5.2 must also WIRE the organization `newsEvents` fetch, not just extend a `select`.** Verified: `server/src/services/organizations.ts:164 getBySlugWithRelations` returns `{ organization, people, milestones }` — **no newsEvents**. The frontend `OrganizationProfilePage.tsx:532` already references `org.newsEvents` (gated on optional), so the org news section is silently dead today. The `NewsEventOrgMention` model exists (`prisma/schema.prisma:619`) — data is reachable. PD-1 must:
  1. Add a `newsEventMentions` fetch in `getBySlugWithRelations` mirroring `persons.ts:277-302`:
     ```ts
     const newsEventMentions = await prisma.newsEventOrgMention.findMany({
       where: { organizationId: organization.id },
       include: { event: { select: { id: true, headline: true, publishedDate: true, isPaywalled: true, paywallReason: true } } },
       orderBy: { event: { publishedDate: 'desc' } },
       take: 20,
     });
     const newsEvents = newsEventMentions.map((nem) => ({
       id: nem.event.id, title: nem.event.headline, date: nem.event.publishedDate,
       mentionType: nem.mentionType, isPaywalled: nem.event.isPaywalled, paywallReason: nem.event.paywallReason,
     }));
     ```
  2. Add `newsEvents` to the `getBySlugWithRelations` return type and update `controllers/organizations.ts:164` to surface it on the API response.
  3. Update `OrganizationWithRelations.newsEvents` shape in `src/services/api.ts:3594` to include the two new fields.
  Without this, PD-3's task 2.5 (badge on org profile news block) is a no-op against a section that never renders.

### Moderate (resolved by tasks below)

- **M1 — `publishNewsEvent` exact line numbers + signature change should replace the vague "find via grep" instruction in Task 4.** Re-write Task 4's bullet list as: "(a) Edit `server/src/services/publishing/newsPublisher.ts:49`; add `sourceArticleId?: string` to options. (b) When provided, fetch source article + propagate `isPaywalled`, `paywallReason` onto `currentEvent.create`. (c) Update `controllers/review.ts:319` and `services/ingestion/articleAnalyzer.ts:105` to pass `draft.articleId` through. (d) Manual `currentEvents.ts:155 create` path: leaves default `false` — no change needed."

- **M2 — Removing `'paywall'` patterns from `FAILURE_PATTERNS` has a deliberate side effect on `BlockedDomain`.** Verified at `server/src/controllers/articles.ts:612-628`: when `result.failureType` is set, the controller upserts the hostname into `BlockedDomain` with that failureType. Today, paywalled domains land in `BlockedDomain` with `failureType: 'paywall'`. After PD-1's Task 3.1, they no longer will (because `failureType` won't be set for paywalled scrapes). This is **semantically correct** — paywalled domains aren't "blocked" — but it's a behavior change worth documenting. Suggested addition to Task 3.1: a comment + a note in `## Blocked — PM decision needed` confirming we're OK letting paywalled hostnames stop appearing in `BlockedDomain`. Existing rows can stay as historical record; no migration needed.

- **M3 — `persons.ts` line numbers in Task 5.2 are slightly off.** Plan says "line 282" for the `select`. Verified: the `include` block runs lines 280-289 and the `select: { id: true, headline: true, publishedDate: true }` is at line 283-287; the `newsEvents` map is at line 297-302. Plan's "line 282" is approximate (correct enough for a developer to find), but line numbers will drift as PD-1 lands changes. Replace approximate line refs with the function name (`getBySlugWithRelations` → `newsEventMentions` block).

- **M4 — `articleAnalyzer.ts:105 publishNewsEvent(draftData as any)` uses `as any` cast** (verified). When PD-1 changes the signature, drop the `as any` and pass `draft.articleId` explicitly. Worth fixing the type debt while we're touching the line.

### Verified ✓ (no change needed)

- `urlScraper.ts:43-46` paywall patterns match plan exactly. Single caller of `scrapeUrl` at `articles.ts:608` (verified via grep). Removing the four entries is contained — no other consumer breaks.

---

## UX Lead Review (2026-04-29)

PD-1 is backend-only — no UI rendering. Review is brief.

### Verified ✓

- No new UI surfaces in this sprint. The admin endpoints PD-1 extends (`GET /api/admin/articles`, `/api/admin/review/queue`, `/api/persons/:slug`, `/api/organizations/:slug`, feed/news endpoints) only add fields to existing JSON shapes — no new pages, components, or interaction patterns. UX impact is zero until PD-3 reads the new fields.
- The decision to denormalize `isPaywalled` onto `CurrentEvent` (rather than computing it on-the-fly via the source article) is a **UX win** — keeps the read path on every news-event endpoint cheap and avoids a join hop on every Feed page-load. Nothing to change.
- PD-1's expanded Task 5.2 (wire `newsEvents` into `getBySlugWithRelations` for organizations — see Tech Lead Review C2) unblocks the org profile news block on the frontend, which today silently never renders. Real UX win as a side effect — orgs will start showing news mentions whether or not they're paywalled.
- `ContentDraft.articleId` FK at `prisma/schema.prisma:130-131` ✓.
- `IngestedArticle` (schema:81-125) and `CurrentEvent` (schema:337-383) do not yet have `isPaywalled` / `paywallReason` — migration is greenfield.
- `NewsEventOrgMention` model exists at `schema:619` (this is what unblocks C2 above).
- `persons.ts:277-302` is the canonical pattern Task 5.2 should mirror for the org service. Field names verified: `event.id`, `event.headline`, `event.publishedDate` are the source columns; the API maps them to `id`, `title`, `date`.
- `submitArticle` controller (`articles.ts:286`) is the right insertion point for PD-2's extension-flag forwarding.
- `articleAnalyzer.ts` does call `publishNewsEvent` from inside the analysis loop (line 105) — confirms Task 4 covers both the manual review-approve path AND the auto-analyze path.
- No `mcp__claude-in-chrome__*` references anywhere in the sprint. agent-browser remains the only UI tool — consistent with project-global CLAUDE.md.

---

## Prerequisites

- [ ] Local `DATABASE_URL` exported (or running against a local Postgres) so `prisma migrate dev` works
- [ ] Read `prisma/schema.prisma:81-125` (`IngestedArticle`) and `prisma/schema.prisma:337-383` (`CurrentEvent`) end-to-end
- [ ] Read `server/src/services/scraper/urlScraper.ts` end-to-end — note the existing `FAILURE_PATTERNS` paywall entries (lines 43-47) and the `wordCount < 50` empty check (line 64). Today these short-circuit to `success: false`; this sprint changes that
- [ ] Read `server/src/controllers/articles.ts` `scrapeArticleUrl` (≈ line 595) and `submitArticle` (≈ line 286) — these are the two ingestion entry points that will write the new flag
- [ ] Read `server/src/services/persons.ts` `newsEvents` mapping (line 297) and the equivalent in `server/src/services/organizationService.ts` if present — these are where `CurrentEvent.isPaywalled` propagates into person/org profile responses
- [ ] Confirm SSM `DATABASE_URL` and the prisma migrate-deploy flow per `.claude/CLAUDE.md`

---

## Tasks

### 1. Schema + migration

#### 1.1 Add fields to `IngestedArticle`

- [ ] Edit `prisma/schema.prisma`. Add after the duplicate-detection block (~ line 108):
  ```prisma
  // Paywall detection (Sprint PD-1)
  isPaywalled       Boolean   @default(false)
  paywallReason     String?
  paywallDetectedAt DateTime?
  ```
- [ ] Add `@@index([isPaywalled])` alongside the existing indexes
- [ ] Generate migration: `npx prisma migrate dev --name add_paywall_fields_to_ingested_article`
- [ ] Commit migration SQL alongside this checkbox flip

#### 1.2 Add fields to `CurrentEvent` (denormalized for cheap read path)

- [ ] In the same `prisma/schema.prisma`, add to `CurrentEvent` (after `tldr` line 371):
  ```prisma
  // Paywall propagation (denormalized from source IngestedArticle when news_event is published)
  isPaywalled    Boolean @default(false)
  paywallReason  String?
  ```
- [ ] Generate migration in the same migrate-dev command (Prisma will emit one combined SQL file). Confirm both `ALTER TABLE` statements land in the same migration file.
- [ ] Run `npx prisma generate` so the typed client reflects the new fields

### 2. Detection heuristic module (pure, testable)

#### 2.1 Create `server/src/services/scraper/paywallDetection.ts`

- [ ] New file. Exports a single pure function:
  ```ts
  export type PaywallReason =
    | 'extension_overlay'
    | 'extension_short_content'
    | 'known_domain'
    | 'short_content'
    | 'paywall_phrase'
    | 'http_402'
    | 'http_403';

  export interface PaywallSignals {
    isPaywalled: boolean;
    reason: PaywallReason | null;
  }

  export function evaluatePaywallSignals(input: {
    url: string;
    content?: string | null;
    title?: string | null;
    httpStatus?: number;
    wordCount?: number;
    extensionFlag?: PaywallReason | null; // optional caller-provided override
  }): PaywallSignals;
  ```
- [ ] Constants block at the top of the file (these are tunable — they live here so we can iterate in one place):
  ```ts
  export const KNOWN_PAYWALLED_HOSTNAMES = new Set([
    'nytimes.com',
    'wsj.com',
    'ft.com',
    'bloomberg.com',
    'theinformation.com',
    'washingtonpost.com',
    'theatlantic.com',
    'newyorker.com',
  ]);

  export const PAYWALL_PHRASES = [
    /subscribe to continue/i,
    /subscription required/i,
    /sign in to read/i,
    /log in to read/i,
    /create.*account.*to continue/i,
    /to continue reading/i,
    /members? only/i,
    /subscribers? only/i,
  ];

  export const SHORT_CONTENT_THRESHOLD = 200; // words — only fires WITH another signal
  ```
- [ ] Resolution logic (bias toward false negatives — explicit AND-of-signals for the weak ones):
  1. If `extensionFlag` is provided → `{ isPaywalled: true, reason: extensionFlag }`
  2. Else if `httpStatus === 402` → `{ true, 'http_402' }`
  3. Else if `httpStatus === 403` → `{ true, 'http_403' }`
  4. Else if any `PAYWALL_PHRASES` matches `title + content` → `{ true, 'paywall_phrase' }`
  5. Else if hostname (lowercase, strip leading `www.`) is in `KNOWN_PAYWALLED_HOSTNAMES` AND `wordCount < SHORT_CONTENT_THRESHOLD` → `{ true, 'known_domain' }`
  6. Else if hostname is in `KNOWN_PAYWALLED_HOSTNAMES` (alone, without short content) → `{ true, 'known_domain' }` (this is the strongest single signal we trust)
  7. Else if `wordCount` is provided AND `wordCount < SHORT_CONTENT_THRESHOLD` AND no other signal → DO NOT flag (false-positive risk too high alone)
  8. Otherwise → `{ false, null }`

  > Decision: step 6 (known domain alone fires) — this is the bias point worth flagging. Document in code comment: "We trust the known-paywalled domain list because we curate it; if a domain is on it and the article slipped through, the badge is still appropriate."

#### 2.2 Tests for the heuristic

- [ ] New file `tests/unit/server/paywallDetection.test.ts`. Cover at minimum:
  - Extension flag wins over everything else
  - HTTP 402 → flagged with `http_402`
  - HTTP 403 → flagged with `http_403`
  - Phrase match in title → flagged with `paywall_phrase`
  - Phrase match in content → flagged with `paywall_phrase`
  - Known domain (`nytimes.com`) with normal content → flagged with `known_domain`
  - Known domain with `www.` prefix → still flagged
  - Short content (`wordCount: 50`) on an unknown domain → NOT flagged
  - Long content on an unknown domain with no phrases → NOT flagged
  - Empty input (`url` only) → NOT flagged (must not throw)
- [ ] `npm test -- --testPathPatterns=paywallDetection` — all pass

### 3. Wire heuristic into `urlScraper`

#### 3.1 Replace the `failureType: 'paywall'` short-circuit with persist-with-flag

- [ ] **Behavior change** (PM decision required — see footer). In `server/src/services/scraper/urlScraper.ts`:
  - Keep `FAILURE_PATTERNS` for CAPTCHA, forbidden, blocked, empty (those are real fetch failures)
  - REMOVE the four paywall entries from `FAILURE_PATTERNS` — paywall detection now lives in `paywallDetection.ts`
  - After a successful scrape (or after content is extracted but before returning), call `evaluatePaywallSignals(...)` and add its result to the `ScrapedContent` return shape:
    ```ts
    export interface ScrapedContent {
      // … existing fields …
      isPaywalled?: boolean;
      paywallReason?: PaywallReason | null;
    }
    ```
  - Important: the scraper still returns `success: true` for paywalled content. The controller decides what to do with it.

#### 3.2 Update controller to persist the flag

- [ ] In `server/src/controllers/articles.ts`:
  - `scrapeArticleUrl` (~ line 595): when `submitForAnalysis` is true and we `prisma.ingestedArticle.create(...)`, include `isPaywalled`, `paywallReason`, `paywallDetectedAt: result.isPaywalled ? new Date() : null`
  - `submitArticle` (~ line 286): accept `isPaywalled` + `paywallReason` from the request body (extension will send these in PD-2). Server-side, ALSO compute its own heuristic from the submitted content, and OR the two: persisted `isPaywalled = clientFlag || serverFlag`. Reason: prefer the client (extension) reason if it fired; else use server reason.
  - Don't break existing callers — both fields are optional on the request body.

#### 3.3 Update RSS / pipeline path

- [ ] In `server/src/services/ingestion/articleAnalyzer.ts` (or whichever stage runs first after a fetcher writes an `IngestedArticle`): if the article was created without paywall fields set, run `evaluatePaywallSignals(...)` against `article.content` + `article.externalUrl` and update the row. Skip the update if `isPaywalled` is already true.
- [ ] Confirm `RssFetcher.ts`, `PlaywrightFetcher.ts`, and `YouTubeFetcher.ts` either pass content through `articleAnalyzer` (existing behavior) or, if they `prisma.ingestedArticle.create` directly, include the heuristic call. Grep for `ingestedArticle.create` in `server/src/services/ingestion/` to confirm coverage.

### 4. Propagate flag into `CurrentEvent` at publish time

- [ ] In the publish path (find via `grep -rn "currentEvent.create\|CurrentEvent\.create" server/src/`), when a `news_event` `ContentDraft` is approved and a `CurrentEvent` is created:
  - Look up the source `IngestedArticle` (already linked via `ContentDraft.articleId`)
  - Copy `isPaywalled` + `paywallReason` onto the new `CurrentEvent`
- [ ] Spot-check: confirm `contentGenerator.ts` writes the source URL onto the draft. The eventual `CurrentEvent.sourceUrl` should match `IngestedArticle.externalUrl` for the article whose flag we copy.

### 5. Update API responses (DTOs)

The new fields exist on the DB but won't appear in any API response until each controller / service explicitly selects + returns them. List of touch points:

#### 5.1 Admin endpoints

- [ ] `GET /api/admin/articles` — `IngestedArticle` list. Add `isPaywalled` + `paywallReason` to the `select` and the response shape used by `IngestedArticlesPage` (`src/pages/admin/IngestedArticlesPage.tsx`).
- [ ] `GET /api/admin/articles/:id` — same.
- [ ] `GET /api/admin/review/queue` — each draft's source-article info needs the flag (so the review queue can show paywalled drafts at a glance).

#### 5.2 Public endpoints surfacing news on profile pages

- [ ] `server/src/services/persons.ts` line 220 — extend the `newsEvents` shape to include `isPaywalled` + `paywallReason`. Update the prisma `select` on line ~ 282 (`event: { select: { id, headline, publishedDate, isPaywalled, paywallReason } }`).
- [ ] Equivalent change in the organizations service for `OrganizationWithRelations.newsEvents`.
- [ ] Update the TypeScript shapes that the frontend consumes (`src/types/person.ts`, `src/types/organization.ts`, and the API client interfaces in `src/services/api.ts` — `PersonWithRelations`, `OrganizationWithRelations`).

#### 5.3 Feed / news endpoints

- [ ] `GET /api/news/feed` and `GET /api/current-events/:id` (or whatever the actual route is — verify via `grep -rn "current-events\|/news/feed" server/src/routes`). Add `isPaywalled` + `paywallReason` to the `CurrentEvent` selects + response DTO.
- [ ] Update the feed item type used by `src/components/Feed/FeedCard.tsx` and `src/components/CurrentEvents/NewsContextModal.tsx`.

### 6. Backend Validation

```markdown
- [ ] Local: `npm run dev` (api server). curl an admin articles list; confirm new fields appear (default `false`/`null` for old rows).
- [ ] Submit a paywalled URL via `/api/admin/articles/scrape` (e.g. an NYT article URL — the scraper will hit a paywall page server-side); confirm the row is persisted with `isPaywalled: true` AND a `paywallReason` like `paywall_phrase` or `known_domain`.
- [ ] Run a manual RSS fetch (`POST /api/admin/sources/:id/fetch` for an existing RSS source) — confirm articles flow through `articleAnalyzer` and land with the heuristic applied.
- [ ] Approve a `news_event` draft whose source article has `isPaywalled: true`. Confirm the resulting `CurrentEvent` row also has `isPaywalled: true`.
- [ ] After deploy: `aws logs tail /aws/lambda/ai-timeline-api-prod --since 10m` while running the curls — zero new error patterns.
```

### 7. Deploy

- [ ] Backend deploy (must run migration before Lambda re-deploy, or the new code will reference columns that don't exist yet):
  ```bash
  export DATABASE_URL=$(aws ssm get-parameter --name "/ai-timeline/prod/database-url" --with-decryption --query "Parameter.Value" --output text)
  npx prisma migrate deploy
  cd infra && sam build && sam deploy --no-confirm-changeset
  ```
- [ ] Smoke test prod: `curl -s "https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod/api/admin/articles?limit=3" -H "Authorization: Bearer $TOKEN" | jq '.[0] | {isPaywalled, paywallReason}'` — fields appear (initially `false` / `null`)
- [ ] Submit one known-paywalled URL via the admin CMS and confirm the persisted row has `isPaywalled: true`

---

## Definition of Done

- [ ] All tasks above checked
- [ ] Prisma migration applied locally + on prod (`SELECT * FROM "_prisma_migrations" WHERE migration_name LIKE '%paywall%'` returns the row)
- [ ] `evaluatePaywallSignals` covered by unit tests; all green
- [ ] `urlScraper` + both controller paths persist the flag; documented in code comments
- [ ] Person and organization profile API responses include `isPaywalled` + `paywallReason` on `newsEvents[]`
- [ ] Admin articles list and detail responses include the fields
- [ ] CurrentEvent feed endpoint responses include the fields
- [ ] `npm run typecheck` + `npm run lint` (scoped if full-suite OOMs) + targeted `npm test` all green
- [ ] CloudWatch clean for 10 minutes after deploy under normal traffic
- [ ] Sprint file timestamp updated and committed

---

## Files Touched (expected)

```
prisma/schema.prisma                                            (modify — add fields to IngestedArticle + CurrentEvent)
prisma/migrations/<ts>_add_paywall_fields_to_ingested_article/  (new — auto-generated)

server/src/services/scraper/paywallDetection.ts                 (new — heuristic + constants)
server/src/services/scraper/urlScraper.ts                       (modify — remove paywall short-circuit, return signals)
server/src/services/ingestion/articleAnalyzer.ts                (modify — call evaluatePaywallSignals if not yet flagged)
server/src/controllers/articles.ts                              (modify — persist fields in scrapeArticleUrl + submitArticle)
server/src/services/persons.ts                                  (modify — extend newsEvents shape)
server/src/services/organizationService.ts                      (modify — same as persons)
server/src/services/<currentEventPublish>.ts                    (modify — copy flag from source article at publish)
server/src/controllers/{adminArticles,review,currentEvents}.ts  (modify — return new fields)

src/services/api.ts                                             (modify — type updates: PersonWithRelations.newsEvents, OrganizationWithRelations.newsEvents, CurrentEvent shapes, IngestedArticleListItem)
src/types/{person,organization,currentEvent}.ts                 (modify — add fields to Zod schemas if present)

tests/unit/server/paywallDetection.test.ts                      (new)
```

No frontend rendering changes in PD-1 — types update only. Badges land in PD-3.

---

## Blocked — PM decision needed

1. **Behavior change in `urlScraper`.** Today, a scrape that hits a paywall returns `success: false` + `failureType: 'paywall'` and the controller refuses to persist anything. PD-1's plan: change this to "persist the article with `isPaywalled: true` + scraped (partial) content". Pros: we get a real row that downstream pipeline + admin review can act on. Cons: paywalled rows pollute the queue with low-content articles that will never be milestone-worthy — the LLM screening stage will likely reject them, but we still spend tokens. Confirm: **proceed with persist-with-flag**, or keep the reject path and rely on extension submissions for paywalled-source coverage?

2. **Scope of backfill.** Existing `IngestedArticle` rows default to `isPaywalled: false`. Do we re-evaluate the heuristic against stored content for every existing row at deploy time (one-shot script), or do we accept that older articles aren't badged and only flag forward? Recommend: skip backfill in PD-1, optionally schedule it as a follow-up if the audit shows it matters.

3. **Threshold tuning visibility.** Should we expose `KNOWN_PAYWALLED_HOSTNAMES` and `PAYWALL_PHRASES` in `PipelineSettings` (admin-editable JSON) so non-engineers can tweak without a deploy? Recommend: keep in code for v1; revisit if Wylie ends up editing them more than monthly.
