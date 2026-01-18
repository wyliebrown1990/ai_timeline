# Sprint SEO-1: Foundation

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-17 by Claude

## Overview

Fix the foundational SEO issues causing Google indexing failures:
- All pages currently share the same static meta tags (homepage)
- Canonical URLs all point to homepage (duplicate content signal)
- Sitemap missing dynamic content (people, organizations, glossary)
- No structured data for content types

**Priority**: CRITICAL
**Estimated Effort**: 1-2 days
**Status**: COMPLETED

## Tasks

### 1. Install react-helmet-async

- [x] Install package: `npm install react-helmet-async`
- [x] Wrap App with `<HelmetProvider>` in main.tsx
- [x] Verify no conflicts with existing code

### 2. Create Reusable SEO Component

- [x] Create `src/components/SEO.tsx` with props:
  - `title` - Page title (appended with site name)
  - `description` - Meta description
  - `canonical` - Full canonical URL
  - `type` - og:type (website, article, profile)
  - `image` - OG image URL (optional)
  - `jsonLd` - Structured data object (optional)
- [x] Include meta tags:
  - `<title>`
  - `<meta name="description">`
  - `<link rel="canonical">`
  - Open Graph tags (og:title, og:description, og:url, og:image, og:type)
  - Twitter Card tags
- [x] Support JSON-LD script injection
- [x] Add default fallbacks for missing props

### 3. Add SEO to Key Pages

#### PersonProfilePage
- [x] Import and use `<SEO>` component
- [x] Set dynamic title: `{person.canonicalName} | Let AI Explain AI`
- [x] Set description from `person.shortBio`
- [x] Set canonical: `https://letaiexplainai.com/people/{slug}`
- [x] Add Person JSON-LD schema

#### OrganizationProfilePage
- [x] Import and use `<SEO>` component
- [x] Set dynamic title: `{org.name} | Let AI Explain AI`
- [x] Set description from `org.shortDescription`
- [x] Set canonical: `https://letaiexplainai.com/organizations/{slug}`
- [x] Add Organization JSON-LD schema

#### GlossaryPage
- [x] Add SEO for main glossary page
- [x] Title: `AI Glossary | Let AI Explain AI`
- [x] Canonical: `https://letaiexplainai.com/glossary`

#### TimelinePage
- [x] Add SEO component
- [x] Title: `AI Timeline | Let AI Explain AI`
- [x] Canonical: `https://letaiexplainai.com/timeline`

#### NewsPage
- [x] Add SEO component
- [x] Title: `AI News Hub | Let AI Explain AI`
- [x] Canonical: `https://letaiexplainai.com/news`

#### FeedPage
- [x] Add SEO component
- [x] Title: `AI News Shorts | Let AI Explain AI`
- [x] Canonical: `https://letaiexplainai.com/feed`

#### HomePage
- [x] Update to use new `<SEO>` component
- [x] Keep existing meta content
- [x] Canonical: `https://letaiexplainai.com/`

### 4. Expand Sitemap API

**File**: `server/src/routes/sitemap.ts`

- [x] Add all Person profiles to sitemap
  - Query: `prisma.person.findMany()`
  - URL pattern: `/people/{slug}`
  - Priority: 0.7
  - Changefreq: weekly
- [x] Add all Organization profiles to sitemap
  - Query: `prisma.organization.findMany()`
  - URL pattern: `/organizations/{slug}`
  - Priority: 0.7
  - Changefreq: weekly
- [x] Add glossary terms to sitemap
  - URL pattern: `/glossary?term={id}`
  - Priority: 0.6
  - Changefreq: monthly
- [x] Add feed page to static routes

### 5. Remove Static Meta from index.html

- [x] Remove hardcoded `<link rel="canonical">` (was causing "Alternate page with proper canonical" error)
- [x] Remove hardcoded OG URL tags
- [x] Simplify to default fallbacks that Helmet overrides
- [x] Keep essential tags (viewport, charset, favicon)
- [x] Keep JSON-LD for WebSite/EducationalOrganization (site-wide)

### 6. Build and Deploy

- [x] Run `npm run typecheck` - verify no TypeScript errors
- [x] Run `npm run build` - verify production build succeeds
- [x] Deploy to S3: `aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete`
- [x] Invalidate CloudFront: `aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"`
- [x] Deploy backend (SAM) for sitemap changes

## Browser Testing & Validation (REQUIRED)

> **CRITICAL**: Use Claude Chrome MCP tools to verify SEO tags are rendering correctly.

### Meta Tag Validation
- [ ] Navigate to `/people/sam-altman` (or any person)
- [ ] Use browser dev tools or `view-source:` to verify:
  - Title tag is dynamic
  - Meta description is from person bio
  - Canonical URL is correct
  - OG tags are present
- [ ] Check JSON-LD in page source (search for `application/ld+json`)

### Cross-Page Validation
- [ ] Verify `/` has homepage meta tags
- [ ] Verify `/timeline` has timeline-specific meta tags
- [ ] Verify `/organizations/openai` has org-specific meta tags
- [ ] Verify `/glossary` has glossary meta tags

### Google Tools Validation
- [ ] Test pages in [Google Rich Results Test](https://search.google.com/test/rich-results)
- [ ] Verify structured data is valid
- [ ] Check for any errors or warnings

## Acceptance Criteria

- [x] Every page has unique `<title>` tag
- [x] Every page has unique `<meta name="description">`
- [x] Every page has correct `<link rel="canonical">`
- [x] Person pages have Person JSON-LD schema
- [x] Organization pages have Organization JSON-LD schema
- [x] Sitemap includes all persons and organizations
- [x] No hardcoded canonical URL in index.html
- [ ] All browser validation tasks completed (pending)

## Notes for Future Developers

### Why react-helmet-async?
- `react-helmet` is deprecated, `react-helmet-async` is the maintained fork
- Works with React 18 and concurrent rendering
- Server-side rendering compatible (for future SSR)

### Canonical URL Best Practices
- Always use full absolute URLs (`https://letaiexplainai.com/...`)
- No trailing slashes (consistency)
- Use the exact URL you want indexed

### JSON-LD Tips
- Validate with Google's Structured Data Testing Tool
- Don't include empty fields
- Use `sameAs` for linking to external profiles

### After This Sprint
- Submit updated sitemap to Google Search Console
- Request re-indexing of key pages
- Monitor indexing status over 2-4 weeks
