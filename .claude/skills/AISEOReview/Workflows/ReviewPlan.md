# ReviewPlan Workflow (AISEOReview)

Review a roadmap sprint plan in the AI Timeline Atlas repo from an SEO perspective. Verify every SEO-relevant claim, identify gaps across technical SEO, on-page SEO, structured data, internal linking, performance, and Answer Engine Optimization. Update the plan document with findings, and report a concise summary.

---

## Prerequisites

- A sprint plan or PLAN document must exist under `/Users/wyliebrown/ai_timeline/roadmap/`.
- You have read access to `.claude/CLAUDE.md`, `.claude/rules/*.md`, and prior SEO sprints (`Sprint-SEO-1-Foundation.md` through `Sprint-SEO-7-Glossary-URL-Canonicalization.md`).
- You can `Read` `src/components/SEO.tsx`, `server/src/routes/sitemap.ts`, and `public/robots.txt` to verify existing infra claims.

---

## Steps

### Step 1: Read the Plan and SEO Context

1. Read the sprint plan the user specified.
2. Read the parent `PLAN-[Initiative].md` in the same `/roadmap/` directory.
3. Read `/Users/wyliebrown/ai_timeline/.claude/CLAUDE.md`.
4. Read the most-relevant prior SEO sprints so you understand what already shipped:
   - Always: `PLAN-SEO-Improvements.md`, `PLAN-SEO-Timeline-Domination.md`
   - Skim `Sprint-SEO-1-Foundation.md` (meta/canonical/sitemap baseline)
   - Skim `Sprint-SEO-2-Answer-Engine-Optimization.md` (FAQ/AEO)
   - Skim `Sprint-SEO-3-Topic-Clusters-Internal-Linking.md` (internal linking)
   - Skim `Sprint-SEO-4-Programmatic-SEO.md` (hub-spoke patterns)
   - Skim `Sprint-SEO-5-Content-Freshness-EEAT.md` (E-E-A-T)
5. Read these code references to ground truth the verification:
   - `src/components/SEO.tsx` — what helpers already exist
   - `server/src/routes/sitemap.ts` — current sitemap sources
   - `public/robots.txt` — crawl rules

**Understand before you investigate.** Note every SEO-relevant claim in the plan: proposed URL patterns, meta tag shapes, schema types, canonical logic, sitemap changes, internal link insertions, image handling, performance-affecting dependencies.

---

### Step 2: Parallel SEO Verification

Run through every category below. For open-ended searches (e.g. "is there an existing breadcrumb component?"), launch an Explore agent (`subagent_type: Explore`, thoroughness: `very thorough`) in parallel.

---

#### A. URL Structure & Information Architecture

- [ ] Every new URL pattern uses kebab-case, lowercase slugs (no camelCase, no underscores).
- [ ] URLs are short, descriptive, keyword-rich. No long query strings for indexable pages.
- [ ] Query strings are reserved for filters/pagination only — never for primary content (lesson from SEO-7).
- [ ] Hub pages exist above programmatic/individual pages (hub-spoke topology from SEO-4).
- [ ] No conflict with existing URL patterns in `src/App.tsx`.
- [ ] Pagination uses `/page/2` or `?page=2` consistently with rest of site; `<link rel="canonical">` on each paginated page points to page 1 OR self (pick one and be consistent).
- [ ] Faceted navigation (filters) has a canonicalization strategy: canonical to base, or allow index for valuable facets only.
- [ ] Trailing slash handling matches the rest of the site.

#### B. Title Tags & Meta Descriptions

- [ ] Every indexable page type in the plan specifies a dynamic `<title>` — not static.
- [ ] Title format: primary keyword early, brand at end. Template: `Primary Keyword — Secondary Context | LAEA`.
- [ ] Title length ≤60 characters (most pixels visible in SERP).
- [ ] Meta description length: 140–160 characters; action-oriented; includes primary keyword.
- [ ] Each page type has a distinct title/description template — no boilerplate duplication.
- [ ] Uses the existing `<SEO>` wrapper component in `src/components/SEO.tsx` — does not roll its own `<Helmet>`.
- [ ] Open Graph title/description match (or intentionally differ from) search meta.
- [ ] Twitter Card `summary_large_image` declared.

#### C. Heading Hierarchy

- [ ] Exactly one `<h1>` per page, matching or closely related to the page's primary keyword.
- [ ] Logical H2/H3 structure, no skipped levels.
- [ ] H2s are scannable and question-based where appropriate (People Also Ask targeting).
- [ ] No styling-driven heading choices (don't use `<h3>` just because it's smaller — use CSS).

#### D. Structured Data (JSON-LD schemas)

For every new content type in the plan:

- [ ] Appropriate schema type chosen from schema.org (Article / BlogPosting / NewsArticle / Person / Organization / FAQPage / HowTo / Event / Product / VideoObject / Podcast / BreadcrumbList / WebSite / CollectionPage / ItemList / Review).
- [ ] All required properties for that type are present (verify with `https://validator.schema.org/`).
- [ ] All recommended properties for rich-result eligibility are present (verify with Google's rich results docs).
- [ ] Reuses existing helpers in `src/components/SEO.tsx` (`PersonJsonLd`, `OrganizationJsonLd`, `FaqJsonLd`) rather than creating parallel patterns.
- [ ] FAQ schema only used where the literal Q&A text appears visibly on the page.
- [ ] BreadcrumbList JSON-LD accompanies every visual breadcrumb.
- [ ] `@id` and `url` are absolute URLs, not relative.
- [ ] `datePublished` and `dateModified` are ISO 8601.
- [ ] `author` on Article-family schemas is `Person` (not string) with `url` pointing to an author page — required for E-E-A-T.
- [ ] `publisher` on Article-family schemas is the LAEA Organization object with logo URL.
- [ ] `mainEntityOfPage` is set.
- [ ] Plan includes a task to **validate with Google Rich Results Test** before marking done.

#### E. Canonical URLs & Indexation

- [ ] Every indexable page sets `<link rel="canonical">` explicitly.
- [ ] Canonical URLs are absolute (`https://letaiexplainai.com/...`), never relative.
- [ ] Paginated and filtered variants have a defined canonical strategy.
- [ ] `noindex` is only used with explicit justification (e.g. duplicate pages, thin content, internal search results).
- [ ] No `?utm_*` or tracking parameters in canonical URLs.
- [ ] Print / amp / mobile variants (if any) reference canonical.
- [ ] Duplicate-content risk (same content accessible via multiple URLs) is addressed with a single canonical.

#### F. Sitemap & Robots

- [ ] Every new public URL type is added to `server/src/routes/sitemap.ts`.
- [ ] `lastmod` is populated from content's `updatedAt`.
- [ ] `changefreq` and `priority` are set with intent (high-priority landing pages > programmatic long-tail > tag archives).
- [ ] Admin routes are never added to the sitemap.
- [ ] `public/robots.txt` updates (if any) are explicit and justified.
- [ ] Plan includes a task to **ping Google after sitemap changes**: `curl "https://www.google.com/ping?sitemap=https://letaiexplainai.com/sitemap.xml"`.

#### G. Internal Linking

- [ ] New content type is linked FROM at least one existing crawlable page (no orphans).
- [ ] New content type links TO related entities (people/orgs/milestones/glossary/subjects) using descriptive anchor text.
- [ ] Anchor text includes the target page's primary keyword — no "click here" / "read more".
- [ ] Internal link depth: every indexable page reachable within ≤3 clicks from the homepage.
- [ ] Topic cluster integration: if the content fits an existing cluster (AI history, companies, researchers, concepts), it's cross-linked to the relevant hub.
- [ ] Automatic entity-mention linking (e.g. `[[Entity Name]]` shortcodes) is specified where applicable.
- [ ] Related-content sections are specified on each page (reuse existing related-content patterns from SEO-3).

#### H. Content Depth & Search Intent

- [ ] Every page type has a defined primary search intent (informational / navigational / transactional / commercial investigation).
- [ ] Content length is appropriate for intent: informational queries usually want 1500+ words; navigational can be shorter.
- [ ] Content answers the primary question directly in the first 150 words (for AI Overview citability).
- [ ] Page targets specific keywords — plan should name the target keyword or keyword family.
- [ ] Semantic richness: related entities mentioned, LSI-style coverage implied.
- [ ] Skim-friendly formatting: short paragraphs, lists, tables, bolded key phrases.
- [ ] Featured snippet targeting: concise definitions, numbered steps, or comparison tables where relevant.
- [ ] "People Also Ask" style Q&A blocks for relevant queries.

#### I. Answer Engine Optimization (AEO) / LLM Citability

- [ ] Content contains clear, standalone factual claims that an LLM can quote verbatim.
- [ ] Key facts appear early on the page (most LLMs only ingest the first ~2000 tokens of a page).
- [ ] Entities are explicitly declared (organization, date, person) rather than implied.
- [ ] Statistics and numbers are stated cleanly with citation-ready formatting.
- [ ] FAQ blocks use precise, answerable questions (not open-ended opinion prompts).
- [ ] If the plan touches published content, it should define an LLM citability signal: entity declarations, structured data, plus a clear `Summary` / `Key facts` block.
- [ ] Consider `llms.txt` at project root (emerging standard for LLM content discovery) — flag if project should add one.

#### J. E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)

- [ ] Author byline on every content page, with link to an author profile page.
- [ ] Author profile includes credentials, bio, and links to external presence (LinkedIn, Twitter, scholarly profile).
- [ ] Published date + last modified date shown visibly AND in schema.
- [ ] Citations to authoritative sources (papers, official announcements, primary documents) for factual claims.
- [ ] External links open in new tab where appropriate, with `rel="noopener"`; use `rel="nofollow"` only for UGC or sponsored content.
- [ ] Content signals experience (first-hand analysis, original commentary) where applicable.
- [ ] About page, contact page, and privacy policy exist and are linked from footer.

#### K. Images (alt text, formats, performance)

- [ ] Every `<img>` has a meaningful `alt` attribute (descriptive, not keyword-stuffed; empty `alt=""` only for decorative images).
- [ ] Image filenames are descriptive (`sam-altman-portrait.jpg` not `IMG_1234.jpg`).
- [ ] Next-gen formats used (WebP / AVIF) with JPEG fallback via `<picture>` if older browsers required.
- [ ] Responsive images via `srcset` + `sizes` for hero / above-fold images.
- [ ] `loading="lazy"` on below-fold images; `fetchpriority="high"` on the LCP image.
- [ ] Dimensions (`width` / `height` attributes) set on every `<img>` to prevent CLS.
- [ ] OG/Twitter images meet 1200×630 spec.
- [ ] Image sitemap or ImageObject JSON-LD considered for image-heavy pages.

#### L. Core Web Vitals & Performance

- [ ] Target thresholds: LCP <2.5s, CLS <0.1, INP <200ms at the 75th percentile.
- [ ] Heavy libraries (markdown renderers, chart libs, editors) have a performance budget — justify or lazy-load.
- [ ] Above-the-fold content renders without client-side JS waterfalls.
- [ ] Fonts are self-hosted or use `font-display: swap`.
- [ ] Third-party scripts are audited (analytics, ads, embeds).
- [ ] Plan includes a task to **run PageSpeed Insights on prod after deploy** and record the result.
- [ ] Plan includes a task to check CrUX data in GSC for the new page type once live.

#### M. Mobile & Responsive

- [ ] Every new page type is responsive down to 375px.
- [ ] Tap targets ≥48×48px.
- [ ] Text readable without zoom (≥16px body).
- [ ] Plan includes a task to run **Mobile-Friendly Test** on prod after deploy.
- [ ] Viewport meta tag is correct (inherited from layout — verify).

#### N. Open Graph & Social

- [ ] Every page type sets `og:title`, `og:description`, `og:type`, `og:url`, `og:image`, `og:site_name`.
- [ ] Twitter Card: `summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`.
- [ ] OG images are dynamic per page, 1200×630, on-brand, readable at thumbnail size.
- [ ] If the project generates OG images at publish-time, plan includes a task to verify social previews in Twitter / LinkedIn / Slack / iMessage.

#### O. Redirects & Link Equity

- [ ] If the plan renames, moves, or removes existing URLs, there's a 301 redirect task.
- [ ] Legacy URL formats (e.g. `?term=id`) have a redirect strategy — precedent set in SEO-7.
- [ ] No redirect chains (A → B → C). Every redirect resolves to the canonical URL in one hop.
- [ ] No redirect loops.
- [ ] Redirect implementation is documented (CloudFront function, Express middleware, or client-side).

#### P. Crawlability & SPA Risks

- [ ] This is a **React SPA hosted on S3+CloudFront**. For any high-priority public page the plan introduces, verify whether content is crawlable without JS execution.
- [ ] If content is client-rendered, the plan should either:
  - Accept the tradeoff (Googlebot executes JS; acceptable for low-priority long-tail)
  - Add prerendering / SSR for high-priority pages (flag as a task)
- [ ] Plan includes a task to verify with Google's URL Inspection tool in GSC that the rendered HTML contains the key content.
- [ ] No `robots` meta `noindex` accidentally inherited from a parent layout.

#### Q. International / hreflang

- Usually N/A for this project (English-only). Flag only if the plan introduces localization.

#### R. Measurement & Search Console

- [ ] Plan includes a task to verify the new URLs appear in Google Search Console within 14 days.
- [ ] Plan includes a task to submit new URLs via **URL Inspection → Request Indexing** for the top 3–5 URLs.
- [ ] Plan includes a task to submit updated sitemap in GSC.
- [ ] Plan includes a task to monitor CTR, impressions, and average position for the new page type in GSC over 30 days.
- [ ] Key user flows are analytics-tracked (the project may use GA4 or similar — verify).

#### S. Content Freshness

- [ ] Published date AND last-modified date are both tracked and displayed.
- [ ] Plan defines a content-refresh cadence for the page type (e.g. "re-evaluate top posts quarterly").
- [ ] `dateModified` in JSON-LD is updated whenever content materially changes.
- [ ] For news-like content: `datePublished` reflects true first publication (not backdated).

#### T. Security, Privacy, & Trust Signals

- [ ] HTTPS enforced (it is — verify no mixed content in proposed pages).
- [ ] No hardcoded HTTP links.
- [ ] Privacy policy link reachable from every page (footer).
- [ ] Cookie consent handled (if required by the project).
- [ ] Contact info visible (E-E-A-T trust signal).

#### U. Taxonomy & Topic Signals

- [ ] New content integrates with existing **Subject taxonomy** (per `.claude/rules/subject-taxonomy.md`) — does not reinvent categorization.
- [ ] Tag systems (if added) are justified alongside subjects — don't duplicate unless there's a clear authoring/retrieval reason.
- [ ] Tag archives have descriptive intro copy (not just a list of posts) to avoid "thin content" flags.

#### V. Programmatic SEO quality gates

If the plan proposes programmatic pages (bulk-generated templates):

- [ ] Each variant has materially different content (not just swapped entity name).
- [ ] Each page has unique title + description + H1.
- [ ] Thin-content floor: ≥300 words unique + structured data.
- [ ] Low-quality variants are pre-pruned before launch (not every permutation deserves a page).
- [ ] Plan includes a task to check GSC for "Discovered — currently not indexed" and "Crawled — currently not indexed" at the 30-day mark.

#### W. Backlink-worthy Assets

- [ ] Does the plan include any linkable asset? (data export, interactive tool, original research, curated list)
- [ ] If yes, is outreach planned via `Sprint-TD-6-Outreach-Link-Building.md` or equivalent?
- [ ] Linkable assets are given dedicated URLs, not buried as sections.

#### X. QA Sections in the Plan

Every sprint that ships SEO-relevant output MUST contain these tasks (add if missing):

- [ ] **Google Rich Results Test**: paste every new schema-emitting URL, zero errors + zero warnings.
- [ ] **Mobile-Friendly Test**: pass on ≥2 representative new URLs.
- [ ] **PageSpeed Insights**: record LCP/CLS/INP scores on mobile + desktop for ≥2 representative URLs.
- [ ] **GSC URL Inspection**: verify rendered HTML contains target content for ≥2 representative URLs.
- [ ] **GSC Sitemap Submission**: confirm sitemap re-fetched after deploy.
- [ ] **Rank tracking baseline**: note current impressions/position for target keyword (if tracked).

---

### Step 3: Compile Findings

Organize findings most-to-least severe. Show the user before mutating the plan.

#### Critical Issues
Problems that will prevent indexing, cause duplicate content, block rich results, or violate project SEO rules:
- Missing or wrong canonical URLs
- Missing JSON-LD on a content type eligible for rich results
- Admin route in sitemap
- Reliance on client-rendered meta tags for a high-priority page with no SSR plan
- FAQ schema without visible Q&A on the page
- Duplicate `<h1>` tags
- URL pattern conflict with an existing route
- Missing 301 redirect for a moved/renamed URL
- Duplicated infrastructure (new sitemap file instead of extending `sitemap.ts`; new Helmet setup instead of reusing `SEO.tsx`)

#### Moderate Issues
Gaps that reduce ranking potential but won't break indexing:
- Generic titles / descriptions without keyword targeting
- Missing breadcrumb JSON-LD
- Missing author byline / E-E-A-T signals
- Internal link orphans
- Missing alt text strategy
- Missing OG image plan
- Missing Rich Results Test / PageSpeed Insights QA tasks
- Missing sitemap ping
- No stated search intent / target keyword
- No freshness cadence

#### Minor Issues
Polish:
- Inconsistent trailing slashes
- Title slightly too long
- Anchor text could be more descriptive
- `changefreq` / `priority` values could be more intentional
- Missing llms.txt (if project has adopted it)

#### Assumptions to Verify
- Assumes a page type will be auto-included in the sitemap — verify extension task exists
- Assumes Google will execute JS for a given page type
- Assumes the author page exists for byline linking

**Present the full report to the user before updating the plan.**

---

### Step 4: Update the Sprint Plan

Apply findings directly to the sprint document.

**Corrections:**
- Fix wrong values inline (schema type names, field names, URL patterns, title templates).
- Replace any plan references to reinvented infra with pointers to `src/components/SEO.tsx`, `server/src/routes/sitemap.ts`, etc.

**New tasks:**
- Add as `[ ]` checkboxes under the appropriate section of the sprint.
- Prefer inserting into the existing sprint sections (e.g. a new SEO task goes under the relevant page section, not in a new "SEO" silo at the bottom).
- If the sprint has no SEO-specific section, add one titled `### N. SEO & AEO` (using the next available numeric prefix).
- Match the specificity of existing tasks — include file paths, schema type names, validator URLs, exact GSC steps.

**Prerequisites:**
- Gate every "mark [x] done" on the validation tasks (Rich Results Test, Mobile-Friendly, PSI) passing.

**Missing sections:**
- If the sprint omits **SEO QA / Validation** tasks, add them.
- If the sprint omits **GSC follow-up** tasks, add them.
- If canonical/sitemap/schema work is implied but not explicit, add explicit tasks.

**Timestamp:**
- Update the "Last updated: YYYY-MM-DD by Claude (AISEOReview — brief note of what changed)" line at the top.

**DO NOT:**
- Reorganize or reformat the plan's existing structure.
- Remove or rewrite tasks that are correct.
- Add speculative tasks for keywords the project hasn't prioritized.
- Change the plan's voice or tone.

---

### Step 5: Update the Parent `PLAN-[Initiative].md`

If findings have cross-sprint impact, update the PLAN doc:
- New SEO risks under a `## SEO Risks` or existing risks section
- New success metrics (e.g. "50% of new URLs indexed within 30 days")
- Updated Definition of Done to include GSC indexing verification
- Cross-sprint SEO dependencies (e.g. Sprint X needs Sprint Y's author pages to exist first)

---

### Step 6: Report Summary

After updating, provide a concise summary:

```
## AI SEO Review Summary

**Files updated:**
- roadmap/Sprint-[Prefix]-N-*.md — [N corrections, M new tasks]
- roadmap/PLAN-[Initiative].md — [what changed]

**Critical fixes:** [bulleted list]
**New SEO tasks added:** [bulleted list with section names or task numbers]
**Top organic-traffic risk:** [the single biggest thing that will hurt rankings if not addressed]
**Top AEO/LLM-citability risk:** [the single biggest thing that will hurt AI-engine visibility]

**Status:** Plan is SEO-ready / needs PM decision on [X].
```

Keep the summary under 30 lines. Detail lives in the updated plan.

---

## Verification Checklist (Use This Every Time)

Every review must cover these categories. Skipping any = incomplete review.

- [ ] **URL structure** — kebab-case, no query strings for indexable content, no conflicts
- [ ] **Titles & meta** — dynamic per page, length limits, keyword-targeted, reuses `SEO.tsx`
- [ ] **Heading hierarchy** — one `<h1>`, logical H2/H3
- [ ] **JSON-LD schemas** — correct type, required fields, validates in Rich Results Test
- [ ] **Canonical URLs** — absolute, explicit, no duplicate-content traps
- [ ] **Sitemap** — all new URL types added; admin excluded; lastmod populated
- [ ] **robots.txt** — no unintended blocks/allows
- [ ] **Internal linking** — no orphans, descriptive anchors, topic-cluster integration
- [ ] **Content depth & intent** — primary intent named, length matches intent, keyword targeted
- [ ] **AEO / LLM citability** — factual claims, entity declarations, early-page answers
- [ ] **E-E-A-T** — author byline, credentials, citations, modified date
- [ ] **Image SEO** — alt, filename, format, dimensions, lazy-load
- [ ] **Core Web Vitals** — perf budget for heavy libs, PSI task present
- [ ] **Mobile** — responsive, tap targets, MFT task present
- [ ] **Open Graph / Twitter** — full meta set, OG image plan
- [ ] **Redirects** — 301 for any moves; no chains
- [ ] **SPA crawlability** — SSR/prerender strategy for high-priority pages
- [ ] **GSC measurement** — URL Inspection + sitemap submission + 30-day monitoring
- [ ] **Freshness** — published + modified dates, refresh cadence
- [ ] **Subject taxonomy** — reuse, don't reinvent
- [ ] **Programmatic quality** — uniqueness floor, thin-content pruning
- [ ] **Linkable asset** — outreach path defined if applicable
- [ ] **SEO QA sections** — Rich Results Test, MFT, PSI, GSC steps present

---

## Anti-Patterns (NEVER DO THESE)

- **Never approve client-rendered meta tags for a primary landing page without an SSR/prerender plan.**
- **Never approve duplicated SEO infra.** Reuse `SEO.tsx`, `sitemap.ts`, existing helpers.
- **Never approve JSON-LD without a Rich Results Test validation task.**
- **Never approve multiple `<h1>` tags.**
- **Never approve admin routes in the sitemap.**
- **Never approve FAQ schema without visible Q&A text.**
- **Never approve title tags >60 chars or meta descriptions >160 chars.**
- **Never approve a new page type without sitemap inclusion.**
- **Never approve removing a ranking URL without a 301 redirect task.**
- **Never approve orphan pages.**
- **Never approve "click here" anchor text.**
- **Never approve images without `alt` attributes or set `width`/`height`.**
- **Never approve a plan that omits PageSpeed Insights + Mobile-Friendly Test + Rich Results Test as QA.**
- **Never approve content without E-E-A-T signals (byline, date, citations).**
- **Never approve `noindex` without a documented reason.**
- **Never claim a `[x]` SEO task complete without GSC indexing evidence.**
