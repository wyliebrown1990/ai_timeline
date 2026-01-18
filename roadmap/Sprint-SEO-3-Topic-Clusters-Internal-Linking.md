# Sprint SEO-3: Topic Clusters & Internal Linking

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-18 by Claude (Tasks 1-7 completed - dedicated URLs + related terms + key figures + person/org key concepts + milestone cross-links + era landing pages)

## Overview

Build topical authority through content clusters and comprehensive internal linking.

**Why This Matters**:
- Search engines prioritize topic authority over individual keyword rankings
- Internal links distribute "link equity" and help crawlers discover content
- Topic clusters signal expertise on a subject area
- Better UX keeps users engaged longer (positive ranking signal)

**Priority**: HIGH
**Estimated Effort**: 3-5 days

## Tasks

### 1. Create Dedicated Glossary Term URLs

**Current State**: `/glossary?term=transformer`
**Target State**: `/glossary/transformer`

#### Backend Changes

- [x] Create new route: `GET /api/glossary/slug/:slug`
- [x] Add `slug` field to GlossaryTerm model
- [x] Create migration via admin endpoint: `/api/admin/glossary/run-slug-migration`
- [x] Backfill slugs for existing terms (163 terms) via `/api/admin/glossary/backfill-slugs`
- [x] Update sitemap to use new URL pattern

#### Frontend Changes

- [x] Add route in App.tsx: `/glossary/:slug`
- [x] Create `GlossaryTermPage.tsx` dedicated page component
- [x] Add SEO component with term-specific meta tags (DefinedTerm + FAQ schema)
- [x] Add canonical URL: `https://letaiexplainai.com/glossary/{slug}`
- [x] Keep `/glossary` as main glossary page (pillar)
- [ ] Redirect old `?term=` URLs to new format (deferred)

### 2. Add "Related Terms" Section to Glossary Terms

**Files**: `src/pages/GlossaryTermPage.tsx`, `src/components/Glossary/GlossaryTermDetail.tsx`

- [x] Query related terms (same category, or manually linked)
- [x] Display as linked chips/cards
- [x] Limit to 8 related terms
- [x] Add schema.org `relatedLink` to DefinedTerm schema

**UI Example**:
```tsx
<section className="mt-8">
  <h3 className="text-lg font-semibold mb-3">Related Concepts</h3>
  <div className="flex flex-wrap gap-2">
    {relatedTerms.map(term => (
      <Link
        key={term.id}
        to={`/glossary/${term.slug}`}
        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full"
      >
        {term.term}
      </Link>
    ))}
  </div>
</section>
```

### 3. Add "Key Figures" Section to Glossary Terms

**Data Model**: Create `GlossaryTermPerson` join table

- [x] Create Prisma model linking GlossaryTerm to Person
- [x] Add `contributionNote` field (e.g., "Invented", "Pioneered", "Popularized")
- [x] Run migration via `/api/admin/glossary/run-key-figures-migration`
- [x] Create API endpoint to fetch linked persons: `GET /api/glossary/:id/key-figures`
- [x] Add admin endpoints to manage links: `POST/PUT/DELETE /api/admin/glossary/:id/key-figures`
- [ ] Add admin UI to link persons to terms (deferred - can use API directly)

**Display on Glossary Term Page**:
```tsx
<section className="mt-8">
  <h3 className="text-lg font-semibold mb-3">Key Figures</h3>
  <div className="space-y-2">
    {keyFigures.map(({ person, contributionNote }) => (
      <Link
        key={person.id}
        to={`/people/${person.slug}`}
        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded"
      >
        <img src={person.imageUrl} className="w-10 h-10 rounded-full" />
        <div>
          <div className="font-medium">{person.canonicalName}</div>
          <div className="text-sm text-gray-500">{contributionNote}</div>
        </div>
      </Link>
    ))}
  </div>
</section>
```

### 4. Add "Key Concepts" Section to Person Profiles

**File**: `src/pages/PersonProfilePage.tsx`

- [x] Create API endpoint: `GET /api/persons/:slug/key-concepts`
- [x] Query glossary terms linked to this person via `GlossaryTermPerson`
- [x] Display as linked section with contribution note
- [x] Links navigate to glossary term page

**Example for Geoffrey Hinton**:
- Backpropagation (Co-developer)
- Deep Learning (Pioneer)
- Boltzmann Machines (Inventor)

### 5. Add "Key Concepts" Section to Organization Profiles

**File**: `src/pages/OrganizationProfilePage.tsx`

**Data Model**: Create `GlossaryTermOrganization` join table

- [x] Create Prisma model linking GlossaryTerm to Organization
- [x] Add `contributionNote` field (e.g., "Developed", "Pioneered", "Commercialized")
- [x] Run migration via `/api/admin/glossary/run-org-key-concepts-migration`
- [x] Create API endpoint: `GET /api/organizations/:slug/key-concepts`
- [x] Add admin endpoints to manage links: `POST/PUT/DELETE /api/admin/glossary/:id/org-links`
- [x] Display Key Concepts section on Organization profile page
- [ ] Add admin UI to link organizations to terms (deferred - can use API directly)

### 6. Cross-Link Milestones to Related Entities

**File**: `src/components/Timeline/MilestoneDetail.tsx`

- [x] Display linked persons (already exists via MilestoneContributor)
- [x] Add linked glossary terms section (displays as chips with link to term page)
- [x] Create `MilestoneGlossaryTerm` join table with `relevanceNote` field
- [x] Ensure bidirectional linking (milestone shows terms, term shows milestones)

**Implementation Details**:
- Created `MilestoneGlossaryTerm` Prisma model with `milestoneId`, `glossaryTermId`, `relevanceNote`, `createdAt`
- API endpoints:
  - `GET /api/milestones/:id/linked-terms` - Get linked glossary terms for a milestone
  - `POST /api/admin/milestones/:id/linked-terms` - Add a glossary term link (admin)
  - `DELETE /api/admin/milestones/:id/linked-terms/:termId` - Remove a link (admin)
  - `GET /api/glossary/:id/linked-milestones` - Get linked milestones for a term
- Migration endpoint: `/api/admin/glossary/run-milestone-term-migration`
- MilestoneDetail displays "Related Terms" section with clickable chips
- GlossaryTermPage displays "Related Timeline Events" section with rich milestone data (title, date, category, relevance note)

### 7. Create Era/Decade Landing Pages

**New Pages**:
- [x] `/timeline/1950s` - Foundations of AI
- [x] `/timeline/1960s` - Early AI & ELIZA
- [x] `/timeline/1970s` - First AI Winter
- [x] `/timeline/1980s` - Expert Systems
- [x] `/timeline/1990s` - Machine Learning Rise
- [x] `/timeline/2000s` - Big Data Era
- [x] `/timeline/2010s` - Deep Learning Revolution
- [x] `/timeline/2020s` - Large Language Models

**Each Era Page Includes**:
- [x] Overview of the era (title, tagline, multi-paragraph description)
- [x] Key milestones (top 10 by significance, with links to full list)
- [x] Key figures active in that era (from MilestoneContributor links)
- [x] Key concepts/terms that emerged (from MilestoneGlossaryTerm links)
- [x] Link to full timeline with date filter
- [x] Era navigation (prev/next decade)

**Implementation Details**:
- Frontend config: `src/config/eras.ts` with full era metadata (title, tagline, description, themes, SEO meta)
- Backend API: `GET /api/eras/:slug` returns milestones, keyFigures, keyTerms, and stats
- Service: `server/src/services/eras.ts` aggregates data from date range queries
- Component: `src/pages/EraPage.tsx` with SEO schema (Article + DefinedTerm)
- Route: `/timeline/:slug` catches era pages (1950s, 1960s, etc.)
- Sitemap: Updated to include all era URLs

### 8. Update Sitemap with New URLs

- [x] Add all glossary term dedicated URLs (using slug when available)
- [x] Add era landing pages (all 8 decades)
- [ ] Verify no broken links

## Browser Testing & Validation (REQUIRED)

### Glossary Term Page Validation
- [ ] Navigate to `/glossary/transformer` (or new dedicated URL)
- [ ] Verify Related Terms section displays
- [ ] Verify Key Figures section displays
- [ ] Click links and verify navigation works
- [ ] Check for console errors

### Person Profile Cross-Links
- [ ] Navigate to a person profile with linked concepts
- [ ] Verify Key Concepts section displays
- [ ] Click through to glossary term
- [ ] Verify glossary term links back to person

### Era Page Validation
- [ ] Navigate to `/timeline/2020s`
- [ ] Verify milestones display correctly
- [ ] Verify links to people and concepts work
- [ ] Check SEO meta tags are set

## Acceptance Criteria

- [x] Glossary terms have dedicated URLs (`/glossary/:slug`) - 163 terms with slugs
- [x] Each glossary term shows Related Terms (up to 8, combining manual links + same category)
- [x] Glossary terms show Key Figures who contributed (via `GlossaryTermPerson` join table)
- [x] Person profiles show Key Concepts they're associated with (via same `GlossaryTermPerson` join table)
- [x] Organization profiles show Key Concepts (via `GlossaryTermOrganization` join table)
- [x] Era landing pages exist for each decade (1950s-2020s)
- [x] All cross-links are bidirectional (milestones ↔ terms, persons ↔ terms, orgs ↔ terms)
- [x] Sitemap updated with new URLs (glossary slugs + era pages)
- [ ] No broken internal links

## Notes for Future Developers

### Topic Cluster Best Practices
- Pillar page (e.g., `/glossary`) should link to all cluster pages
- Each cluster page links back to pillar
- Cluster pages link to each other where relevant
- Use consistent anchor text for internal links

### Link Equity Distribution
- Most important pages should have most internal links
- Use descriptive anchor text (not "click here")
- Avoid orphan pages (pages with no internal links)

### Schema.org for Related Content
Consider adding:
- `mentions` for entities mentioned in content
- `about` for the main topic
- `relatedLink` for related pages
