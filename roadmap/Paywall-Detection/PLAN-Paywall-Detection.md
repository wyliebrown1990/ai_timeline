# Paywall Detection — Development Plan

> **Project**: Detect paywalled news articles at ingestion time (Chrome extension submit + server-side scrape) and surface a "Paywalled" badge on every UI surface that references the article. Build the badge so users learn to trust it — bias toward false negatives over false positives.
> **Code Prefix**: `PD`
> **Start Date**: 2026-04-29
> **Product Manager**: Wylie
> **Status**: Planning — ready to execute Sprint PD-1

---

## Vision

Right now, when a reader follows a "source" link from a news event card, a person profile, or a feed card and lands on a paywall, that's a dead end with no warning. The reader churns. Paywall friction is one of the strongest negative signals on outbound traffic, and we already have the data to predict it: the Chrome extension can read the live, authenticated DOM at submit time, and the server-side scraper already detects several paywall phrases as a `failureType`. We just don't persist that signal — `urlScraper` rejects scrapes outright today instead of letting paywalled articles through with a flag.

Surfacing a small "Paywalled" badge wherever an article is referenced does two things: warns the reader before they click out, and lets the editor (Wylie) review the content quality of these sources at a glance from `/admin/articles` and `/admin/review`.

## Success Metrics

- ≥80% of articles from known-paywalled domains (`nytimes.com`, `wsj.com`, `ft.com`, `bloomberg.com`, `theinformation.com`, `washingtonpost.com`, `theatlantic.com`, `newyorker.com`) carry `isPaywalled: true` after PD-1 ships.
- False-positive rate ≤5% on a manually-audited sample of 50 non-paywalled articles ingested in the week after launch.
- Badge appears on every UI surface that references articles or news events: admin articles list, admin review queue, person profile "Recent News", organization profile "Recent News", feed news cards, news context modal.

---

## Developer Workflow (MANDATORY — read before every work session)

This workflow is enforced on every sprint. Ignoring it = broken ship. Mirrors `roadmap/Entity-Preview-Cards/PLAN-Entity-Preview-Cards.md`.

1. **Read `.claude/` first.** `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md` + the relevant `.claude/rules/*.md` files (`backend.md`, `data-models.md`, `news-ingestion.md` for backend/pipeline work; `frontend.md` for UI badges). Never skip.
2. **Orient inside `/roadmap/Paywall-Detection/`.** Open this PLAN and the current sprint file. Pick exactly one unchecked `[ ]` task.
3. **Write elegant code in small blocks.** Minimum code to satisfy the task. Short *why* comments only. No speculative abstractions.
4. **After every code block, before moving on**:
   - `npm run typecheck` (zero errors)
   - `npm run lint` (zero errors)
   - Write/update tests covering what changed
   - `npm test` (all pass — at minimum the targeted suite)
5. **Update the sprint file.** `[ ] → [x]` on the task just completed. Commit code + checkbox together.
6. **QA front-to-back.** UI: verify local (`localhost:5173`) and prod (`letaiexplainai.com`) with `/Browser` (agent-browser). Backend: `curl` prod endpoint + `aws logs tail /aws/lambda/ai-timeline-api-prod --since 10m` for the changed routes. Pipeline: trigger an ingestion run end-to-end (RSS or extension submit) and check the persisted `isPaywalled` flag.
7. **Deploy early, deploy often.** Each sprint has a Deploy section. Don't let more than one sprint accumulate unshipped.
8. **No backwards compatibility** unless Wylie explicitly requested it. The existing `urlScraper.ts` paywall short-circuit is a candidate for change — see the PM-decision item in PD-1.
9. **Stop conditions**: DoD met, or PM decision needed. For PM decisions, write the question under `## Blocked — PM decision needed` in the relevant sprint and ping Wylie.
10. **Browser validation via `/Browser` only** — never use `mcp__claude-in-chrome__*` (project-global rule).

---

## Technical Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Detection (extension) | Live-DOM check inside `extension/src/content/content.ts` after Readability extracts text | Most accurate — sees the rendered, authenticated page exactly as the reader would. Sets `isPaywalled: true` + `paywallReason: 'extension_overlay'` (or `'extension_short_content'`, etc.) and passes to `/api/admin/articles/submit`. |
| Detection (server scrape) | Extend existing `server/src/services/scraper/urlScraper.ts` paywall heuristics + a tunable constants file `server/src/services/scraper/paywallDetection.ts` | We already detect 4 paywall phrases there but treat them as fatal failures (`failureType: 'paywall'` → reject). New behavior: persist the article with `isPaywalled: true` + reason, instead of rejecting outright. Also add the known-paywalled-hostname allowlist + word-count threshold check. |
| Detection (RSS / pipeline) | Hook into `server/src/services/ingestion/articleAnalyzer.ts` so RSS-fetched articles also run through the paywall heuristic before screening | Keeps the rule in one place: any path that creates an `IngestedArticle` ends up running through the same `evaluatePaywallSignals(text, url)` pure function. |
| Schema | Add `isPaywalled: Boolean @default(false)` and `paywallReason: String?` to `IngestedArticle`. Mirror onto `CurrentEvent` (`isPaywalled`, `paywallReason`) so renderers don't need a join | `CurrentEvent` has `sourceUrl` but no FK to `IngestedArticle`, so denormalizing the flag at content-generation time is the cheapest read path. |
| Backend API | Existing endpoints — return the new fields | `/api/persons/:slug`, `/api/organizations/:slug`, `/api/admin/articles`, `/api/admin/review/queue`, feed/news endpoints all need to include `isPaywalled` (and ideally `paywallReason`) in their response. |
| Frontend badge | New shared `<PaywallBadge />` component in `src/components/ui/PaywallBadge.tsx` | One component, reused across all six surfaces. Tooltip on hover surfacing `paywallReason` for admins (hidden for end users). |

## Data Model Summary

**Schema changes (one Prisma migration covers both):**

```prisma
model IngestedArticle {
  // … existing fields …

  // Paywall detection (Sprint PD-1)
  isPaywalled        Boolean   @default(false)
  paywallReason      String?   // 'extension_overlay' | 'extension_short_content' |
                               // 'known_domain' | 'short_content' | 'paywall_phrase' | 'http_402' | 'http_403'
  paywallDetectedAt  DateTime?

  @@index([isPaywalled])
}

model CurrentEvent {
  // … existing fields …

  // Paywall propagation (denormalized from source IngestedArticle at draft-publish time)
  isPaywalled    Boolean @default(false)
  paywallReason  String?
}
```

`paywallReason` stays a free-form string (not an enum) so we can iterate on heuristics without schema churn. Document the canonical values in `server/src/services/scraper/paywallDetection.ts`.

## API Surface Summary

```
# No new routes.
# Existing endpoints add `isPaywalled` + `paywallReason` to their JSON shape:

GET /api/admin/articles              # IngestedArticle list — for admin queue
GET /api/admin/articles/:id          # IngestedArticle detail
GET /api/admin/review/queue          # ContentDraft list — needs source article paywall flag
GET /api/persons/:slug               # PersonWithRelations.newsEvents[].isPaywalled
GET /api/organizations/:slug         # OrganizationWithRelations.newsEvents[].isPaywalled
GET /api/news/feed                   # CurrentEvent feed — adds isPaywalled
GET /api/current-events/:id          # CurrentEvent detail — adds isPaywalled
```

The Chrome extension's `POST /api/admin/articles/submit` accepts two new optional fields in the body:

```json
{
  "sourceUrl": "...",
  "title": "...",
  "content": "...",
  "isPaywalled": true,
  "paywallReason": "extension_overlay"
}
```

Server still runs its own heuristic over the submitted content; if either source flags paywalled, the persisted record is `isPaywalled: true` (OR-of-signals).

## Frontend Routes Summary

No new routes. Badge component renders inside existing pages:

```
/admin/articles                 # IngestedArticlesPage — badge in row chip strip
/admin/review                   # ReviewQueuePage — badge per draft
/admin/articles/:id             # ArticleDetailPage — badge in header
/people/:slug                   # PersonProfilePage — Recent News block
/organizations/:slug            # OrganizationProfilePage — Recent News block
/news (feed)                    # FeedCard — chip near sourcePublisher
/news?event=:id                 # NewsContextModal — chip near source link
```

## Sprint Overview

| Sprint | Focus | Key Deliverables | Estimated Effort |
|--------|-------|------------------|------------------|
| **PD-1** | Backend: schema + detection + API propagation | Prisma migration, `paywallDetection.ts` heuristic module, urlScraper change (no longer rejects paywalled — persists with flag), articleAnalyzer hook, controller updates, DTO/types updates so all listed endpoints return `isPaywalled` + `paywallReason`. Backend deployed. | ~1 day |
| **PD-2** | Chrome extension: live-DOM detection + submit | `extension/src/content/content.ts` returns paywall signals from the live page, `extension/src/popup/lib/submit.ts` forwards them, `extension/src/lib/api.ts` adds the fields to the `submit` payload. Extension built + sideloaded + tested against a real paywalled article (NYT or WSJ). | ~½ day |
| **PD-3** | Frontend: shared badge component + 6 UI surfaces | `<PaywallBadge />` shared component, integrated into all six surfaces listed above. Lighthouse parity. agent-browser QA pass. Frontend deployed. | ~1 day |

**Total estimated effort**: 2–2.5 days end to end. PD-1 must land before PD-2 (extension API changes need the backend ready) and PD-3 (badges read fields that don't exist yet). PD-2 and PD-3 can run in parallel after PD-1 is deployed.

---

## Prevalence / Integration Strategy

The whole point is the badge is everywhere. PD-3 hits the six core surfaces above; if we discover other places articles surface (e.g. admin search results, email digests, blog post citations), they're a follow-up sprint, not a PD-3 expansion — keep the first sprint shippable.

`<PaywallBadge />` deliberately lives in `src/components/ui/` (not `Blog/` or `News/`) so it's a leaf UI primitive any feature can adopt.

## Risks & Open Questions

- **Heuristic false positives.** `wordCount < 200` will mislabel some legitimately-short news posts (link blogs, breaking-news one-liners). Mitigation: bias toward "AND" signals — require known-paywalled domain AND short content, OR a paywall phrase in the body, OR an HTTP 402/403. Don't fire on `wordCount < 200` alone.
- **Behavior change in `urlScraper`.** Today it returns `success: false` + `failureType: 'paywall'` and the controller refuses to persist. PD-1 changes this to "persist with flag". This is a deliberate behavior change and needs Wylie sign-off (see PD-1's `## Blocked — PM decision needed`).
- **Stale flag.** Once `IngestedArticle.isPaywalled` is set, it's never unset. If a publisher drops their paywall later, the badge stays. Acceptable for v1 — flag drift is rare on the timescales we care about.
- **`CurrentEvent` denormalization.** The flag has to be set when the news_event draft is published. Need to wire it through `contentGenerator.ts` and the publish path so newly-generated current events inherit the source article's flag.
- **Backfill.** Existing `IngestedArticle` rows default to `isPaywalled: false`. We can run a one-shot backfill script to re-evaluate the heuristic against stored content, but it's out of scope for PD-1; document as an optional cleanup task in PD-3 or a follow-up.

---

## Definition of Done (whole initiative)

- [ ] PD-1, PD-2, PD-3 DoDs all green
- [ ] Submitting a known-paywalled article (e.g. an NYT story) via the Chrome extension persists `isPaywalled: true` with reason `extension_overlay` (or similar)
- [ ] An RSS-fetched article from `bloomberg.com` lands with `isPaywalled: true` and reason `known_domain`
- [ ] The admin articles list, review queue, person profile news block, organization profile news block, feed card, and news context modal all render the `<PaywallBadge />` for paywalled rows
- [ ] False-positive rate ≤5% on a manual audit of 50 non-paywalled articles ingested post-launch
- [ ] CloudWatch clean — no new error patterns from the heuristic or DTO changes
- [ ] Sprint files in `roadmap/Paywall-Detection/` updated and committed

---

## Reviews scheduled before implementation

Before coding PD-1:

- [x] `/AITechLeadReview` on PD-1 (2026-04-29) — see `## Tech Lead Review` in each sprint file. Net effect: PD-1 grows by one task (org `newsEvents` wiring) and `publishNewsEvent` signature change is now spec'd; PD-3 grows by one task (JSON-LD `isAccessibleForFree`).

Before coding PD-3:

- [x] `/AIUXLeadReview` on PD-3 (2026-04-29) — see `## UX Lead Review` in each sprint file. Net effect: PD-3 grows by two tasks (FeedCard badge style switches to `rounded-full + opacity` to match the personalization-chip family there; mobile-icon-only variant), and the JSON-LD `isAccessibleForFree` recommendation from the Tech Lead Review is **revised** (Schema.org semantics actually argue against marking the LAEA page as paywalled).

---

## Tech Lead Review (2026-04-29)

Verified every claim against the codebase. Two cross-cutting issues that touch multiple sprints get called out at the PLAN level; per-sprint findings live in each sprint's own `## Tech Lead Review` section.

### Critical (cross-cutting — affects scope of PD-1 + PD-3)

- **PLAN-C1 — Organization profile "Recent News" is dead code today.** PLAN lines 117 and 124 list `/organizations/:slug` as a surface that needs the badge, and PD-3 task 2.5 wires it up. But `server/src/services/organizations.ts:164` `getBySlugWithRelations` returns `{ organization, people, milestones }` — **no `newsEvents`**. The frontend type `OrganizationWithRelations.newsEvents` (`src/services/api.ts:3594`) is `optional`, and `OrganizationProfilePage.tsx:532` gates on `org.newsEvents && org.newsEvents.length > 0`, so the section silently never renders. The `NewsEventOrgMention` model **does exist** (`prisma/schema.prisma:619`), so the data is reachable; it's just unwired. Two options:
  1. **(Recommended)** Expand PD-1 task 5.2 to also wire `newsEvents` into `getBySlugWithRelations` (mirror persons.ts:277-302). This is ~20 lines of additional service code and unlocks the org news surface for the badge.
  2. Drop `/organizations/:slug` from the six-surface list and document org-news as a follow-up sprint after the underlying wiring lands.
  Either way, the current PD-3 task 2.5 will be a no-op without this change.

### Moderate (cross-cutting)

- **PLAN-M1 — JSON-LD `NewsArticle` schema needs `isAccessibleForFree`.** `src/pages/NewsDetailPage.tsx:25 generateNewsArticleJsonLd` emits Schema.org `NewsArticle` markup for every news event. Google's [Subscription and paywalled content](https://developers.google.com/search/docs/appearance/structured-data/paywalled-content) docs require `isAccessibleForFree: false` (and ideally a `hasPart: { @type: 'WebPageElement', isAccessibleForFree: false, cssSelector: '...' }` element) on paywalled articles, otherwise crawlers can interpret short paywalled snippets as cloaking and demote ranking. Adds one task to PD-3 (see PD-3 review). Cheap, high-leverage SEO signal — bake into v1.

### Verified ✓ (no change needed at PLAN level)

- `ContentDraft.articleId` FK exists (`prisma/schema.prisma:130-131`) — denormalization-via-publish-path is feasible.
- `IngestedArticle` and `CurrentEvent` models do not currently have `isPaywalled` / `paywallReason` fields — schema migration is greenfield.
- `NewsEventPersonMention` (schema:601) and `NewsEventOrgMention` (schema:619) both exist; person side is wired into the API, org side is the gap above.
- `urlScraper.ts:43-46` has exactly the four paywall `FAILURE_PATTERNS` the plan describes; only one caller (`articles.ts:608` in `scrapeArticleUrl`) — behavior change blast radius is contained.
- `BlockedDomain` upsert at `articles.ts:615` triggers when `failureType` is set. Removing 'paywall' from `FAILURE_PATTERNS` means paywalled hostnames stop being marked as `blocked` — semantically correct (they're paywalled, not blocked) but worth calling out as a deliberate side-effect.
- Six-surface scope is correctly bounded; sitemap, OG tags, blog cross-refs, search, email digests are explicitly out of scope per PLAN line 140-142.

---

## UX Lead Review (2026-04-29)

Audited every UI surface PD-3 touches against the actual chip / badge conventions in the codebase. Two cross-cutting findings live here; per-sprint specifics live in each sprint's `## UX Lead Review` section.

### Critical (cross-cutting)

- **PLAN-UX-C1 — Two distinct chip families exist in the codebase; PaywallBadge must pick the right one per surface, not use one style everywhere.** Verified:
  - **Admin family** (`/admin/articles` Duplicate / Milestone / Status chips at `IngestedArticlesPage.tsx:683-702`): `inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded` + flat color backgrounds (`bg-orange-100 text-orange-800`, `bg-purple-100 text-purple-800`). **No `dark:` variants today.** Lucide icons (`Copy`, `Star`, `Clock`, `CheckCircle`, etc. at `h-3 w-3`).
  - **Feed/personalization family** (`FeedCardHeader.tsx:48-66`): `inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full` + opacity-tint backgrounds (`bg-purple-500/10 text-purple-400`, `bg-emerald-500/10`, `bg-amber-500/10`). **`rounded-full`, not `rounded`.** Different chip shape. Different color saturation.
  
  PD-3's current spec describes one badge style (admin family) used everywhere. That will look out of place on the FeedCard, which is the most visible public surface and uses the rounded-full family. **Required**: `<PaywallBadge />` must support both shapes via a `variant: 'admin' | 'feed'` prop (or default to admin and accept a `className` override on the FeedCard insertion). PD-3 review specifies exact classes per surface.

### Moderate (cross-cutting)

- **PLAN-UX-M1 — JSON-LD `isAccessibleForFree` recommendation from Tech Lead Review M1 is semantically wrong for this project.** Schema.org's `isAccessibleForFree` describes the page hosting the JSON-LD — i.e. is THIS NewsArticle (LAEA's `/news/:id` page) free to read? **It is.** The paywall lives on the *source* article, not on LAEA's summary page. Marking LAEA's pages as `isAccessibleForFree: false` would tell Google the LAEA URL is paywalled (it isn't), pushing it into the paywall-treatment search appearance — a misrepresentation that violates Google's structured-data guidelines.
  
  **Revised recommendation**: drop the JSON-LD task from PD-3. Instead, surface paywall awareness via:
  1. The visible badge on the LAEA news event page (covered by PD-3 task 2.7) — enough for users.
  2. (Optional follow-up) A small `<meta name="ai-source-paywalled" content="true">` custom meta tag for our own analytics, if useful.
  
  Tech Lead Review M1 should be marked superseded by this finding.

### Minor

- **PLAN-UX-Mi1 — Long-term opportunity:** the codebase has three different chip systems (admin flat, Feed rounded-full opacity, SubjectBadge inline-style). A shared `<Badge>` primitive in `src/components/ui/` would eliminate this inconsistency over time. **Out of scope for PD-3** — PaywallBadge ships as a one-off component. Flag as a follow-up sprint candidate after PD-3 lands.

### Verified ✓

- Six-surface scope is the right set; the agent-browser QA section in PD-3 covers all of them in both themes.
- No animation in PaywallBadge spec; matches existing badge precedent (no chip in the repo animates). `prefers-reduced-motion` is therefore moot for this component.
- Existing admin chips lack `dark:` variants but the rest of the admin pages render fine in dark mode (gray-800 cards behind orange-100 chips reads OK because the chip text-800 on bg-100 has enough contrast against either page bg). Adding `dark:` variants to PaywallBadge is a quality improvement without forcing a retrofit of the other admin chips.
