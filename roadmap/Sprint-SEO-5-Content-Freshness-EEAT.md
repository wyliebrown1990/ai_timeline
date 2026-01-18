# Sprint SEO-5: Content Freshness & E-E-A-T

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-18 by Claude

## Overview

Establish expertise, experience, authoritativeness, and trustworthiness (E-E-A-T) signals while keeping content fresh.

**Why This Matters**:
- Google's Quality Raters use E-E-A-T to evaluate content
- Fresh content signals relevance and accuracy
- Author bylines build trust and expertise signals
- Citations to authoritative sources improve credibility
- Backlinko reports 70% traffic boost from updating content

**Priority**: MEDIUM
**Estimated Effort**: Ongoing (initial setup: 2-3 days)

## Tasks

### 1. Add "Last Updated" Display to All Content Pages

**Files to Update**:
- `PersonProfilePage.tsx`
- `OrganizationProfilePage.tsx`
- `GlossaryTermDetail.tsx` (or `GlossaryTermPage.tsx`)
- `MilestoneDetail.tsx`

- [x] Display `updatedAt` date prominently near title
- [x] Format as "Last updated: January 17, 2026"
- [x] Add schema.org `dateModified` to JSON-LD

**Completed 2026-01-18**: Added "Last Updated" display to PersonProfilePage, OrganizationProfilePage, GlossaryTermPage, ExplainedPage, EventPage, WhoInventedPage. Added `dateModified` to JSON-LD schemas.

**UI Component**:
```tsx
function LastUpdated({ date }: { date: Date }) {
  return (
    <p className="text-sm text-gray-500 flex items-center gap-1">
      <Clock className="w-4 h-4" />
      Last updated: {formatDate(date)}
    </p>
  );
}
```

### 2. Add Author/Source Attribution

**For AI-Generated Content (Glossary, Quick Answers)**:
- [x] Display "Content verified by Let AI Explain AI editorial team"
- [x] Add link to "About Us" page explaining editorial process
- [x] Create `/about` page with editorial guidelines

**For News/Current Events**:
- [ ] Display source publication
- [ ] Link to original source
- [ ] Show publication date vs. our updated date

**Completed 2026-01-18**: Added "Content verified by Let AI Explain AI editorial team" with link to /about on all content pages (PersonProfilePage, OrganizationProfilePage, GlossaryTermPage, ExplainedPage, EventPage, WhoInventedPage).

### 3. Create "About Us" Page with E-E-A-T Signals

**Route**: `/about`

- [x] Create `AboutPage.tsx`
- [x] Include:
  - Mission statement
  - Editorial process
  - Content verification methodology
  - Team credentials (if applicable)
  - Contact information
- [x] Add Organization schema JSON-LD

**Completed 2026-01-18**: Created AboutPage.tsx with mission, editorial process (4-step: Research, Content Creation, Verification, Updates), AI transparency disclosure, contact section, and Organization JSON-LD schema.

### 4. Add Citations to Primary Sources

**For Person Profiles**:
- [x] Add `sources` field to Person model (JSON array of URLs) - *Using existing external link fields (wikipediaUrl, linkedInUrl, googleScholarUrl, personalWebsite)*
- [x] Display "Sources" section with links to:
  - Wikipedia
  - Official company bio
  - Major publications/papers
  - Interviews
  - *Note: External links already displayed in ExternalLinksRow component*

**For Glossary Terms**:
- [ ] Add `sources` field to GlossaryTerm model
- [ ] Link to original papers (arXiv, etc.)
- [ ] Link to authoritative explanations

**For Milestones**:
- [x] Ensure `sourceUrl` is always populated - *sourceUrl field exists*
- [ ] Add multiple sources where available

**Partial completion 2026-01-18**: Person profiles already have external links displayed (Wikipedia, LinkedIn, Google Scholar, personal website). Additional sources field would require schema migration.

### 5. Implement Content Freshness Automation

**Currently Doing Updates**:
- [ ] Create scheduled job to check for stale "Currently Doing" sections
- [ ] Flag persons/orgs not updated in 30+ days
- [ ] Admin dashboard widget showing stale content

**News Integration**:
- [ ] When news mentions a person, prompt to update "Currently Doing"
- [ ] Auto-suggest updates based on ingested articles

### 6. Add Expert Quotes to Key Content

**For Glossary Terms**:
- [ ] Add `expertQuotes` field (array of { quote, source, author })
- [ ] Display relevant quotes from experts
- [ ] Example: Transformer page quotes Vaswani paper abstract

**For Person Profiles**:
- [ ] Add notable quotes from the person
- [ ] Source each quote

### 7. Create Content Update Calendar

**Admin Feature**:
- [ ] Dashboard showing all content by last update date
- [ ] Filter by content type (persons, orgs, glossary, milestones)
- [ ] Priority queue based on:
  - Traffic to page
  - Time since last update
  - Recent news mentions
- [ ] Set update reminders/schedule

### 8. Add Schema.org Author/Publisher Information

**Update SEO Component**:
- [x] Add `author` to article pages
- [x] Add `publisher` (Let AI Explain AI) to all pages
- [x] Add `datePublished` and `dateModified`

**Completed 2026-01-18**: Added author/publisher JSON-LD to ExplainedPage, WhoInventedPage, EventPage. Added datePublished and dateModified to all Article schemas. EventPage uses recordedIn for publisher context.

```json
{
  "@type": "Article",
  "author": {
    "@type": "Organization",
    "name": "Let AI Explain AI",
    "url": "https://letaiexplainai.com"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Let AI Explain AI",
    "logo": {
      "@type": "ImageObject",
      "url": "https://letaiexplainai.com/logo.png"
    }
  },
  "datePublished": "2025-01-01",
  "dateModified": "2026-01-17"
}
```

## Browser Testing & Validation (REQUIRED)

### Last Updated Display
- [x] Navigate to person profile, verify "Last updated" shows
- [x] Navigate to glossary term, verify date shows
- [x] Verify dates are accurate

### About Page
- [x] Navigate to `/about`
- [x] Verify editorial process is explained
- [x] Check Organization schema in source

### Citations/Sources
- [x] Navigate to person profile with sources
- [x] Verify sources section displays
- [x] Verify links work

## Acceptance Criteria

- [x] All content pages show "Last updated" date
- [x] About page exists with E-E-A-T signals
- [x] Person profiles have sources/citations (via external links)
- [ ] Glossary terms have sources/citations (needs schema migration)
- [ ] Expert quotes display on relevant pages (future task)
- [ ] Content update dashboard exists in admin (future task)
- [x] Schema.org includes author/publisher info

## Notes for Future Developers

### E-E-A-T Guidelines
- **Experience**: Show first-hand experience (harder for AI-generated content)
- **Expertise**: Demonstrate deep knowledge (detailed, accurate content)
- **Authoritativeness**: Be recognized as authoritative (citations, backlinks)
- **Trustworthiness**: Be transparent, accurate, cite sources

### Content Freshness Strategy
- High-traffic pages: Update monthly
- Medium-traffic: Update quarterly
- Low-traffic: Update annually
- News-related: Update within 24-48 hours of relevant news

### Source Quality
- Prefer primary sources (papers, official announcements)
- Wikipedia is acceptable as secondary source
- News articles should be from reputable outlets
- Avoid circular citations (other aggregator sites)

## Ongoing Maintenance

This sprint establishes processes that require ongoing maintenance:

| Task | Frequency |
|------|-----------|
| Update "Currently Doing" sections | When news breaks |
| Review stale content dashboard | Weekly |
| Update high-traffic pages | Monthly |
| Add new sources/citations | As found |
| Verify all external links work | Quarterly |
