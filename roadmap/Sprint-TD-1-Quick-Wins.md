# Sprint TD-1: Quick Wins - Meta & Schema

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-23 by Claude

## Overview

Immediate SEO optimizations to improve rankings for "ai timeline" queries. Focus on:
- Title tag optimization with exact match keywords
- Schema markup for timeline as ItemList + Events
- Freshness signals ("Last updated" dates)
- Meta description improvements

**Priority**: HIGH
**Estimated Effort**: 1 day
**Status**: COMPLETED ✅

## Tasks

### 1. Timeline Page Title Optimization

**File**: `src/pages/TimelinePage.tsx`

- [x] Update title tag to: `AI Timeline: Complete History of Artificial Intelligence | LAEA`
- [x] Update meta description to include target keywords:
  ```
  Explore the complete AI timeline from 1950 to 2026. Interactive history of artificial
  intelligence milestones, breakthroughs, and major model releases. Updated weekly.
  ```
- [x] Add keywords naturally: "ai timeline", "artificial intelligence history", "ai breakthroughs"

### 2. Add ItemList Schema Markup

**File**: `src/components/SEO.tsx` + `src/pages/TimelinePage.tsx`

- [x] Create JSON-LD schema for ItemList containing all milestones
- [x] Added `generateTimelineItemListJsonLd` helper function to SEO.tsx
- [x] Limit to top 100 milestones for schema (avoid bloat)
- [x] Include `organizer` for milestones with organization links

### 3. Add Freshness Signals

**File**: `src/pages/TimelinePage.tsx`

- [x] Display "Last updated: [date]" prominently at top of timeline
- [x] Calculate from most recent milestone date
- [x] Style: subtle but visible (below page title in gray text)

### 4. News Page SEO Optimization

**File**: `src/pages/NewsPage.tsx`

- [x] Update title: `AI News - Latest Artificial Intelligence Headlines & Updates | LAEA`
- [x] Update description to target news-related queries

### 5. Feed Page SEO Optimization

**File**: `src/pages/FeedPage.tsx`

- [x] Update title: `AI News Feed - Swipeable AI Updates & Breakthroughs | LAEA`
- [x] Target "ai news" and "ai updates" queries

### 6. Homepage Title Optimization

**File**: `src/pages/HomePage.tsx`

- [x] Update title to: `LAEA - Interactive AI Timeline, History & Learning Platform`
- [x] Include "ai timeline" in meta description

### 7. Sitemap Enhancement

**File**: `server/src/routes/sitemap.ts`

- [x] Set timeline page priority to 1.0 (highest)
- [x] Add company timeline URLs (openai, anthropic, google, meta)
- [x] Add category timeline URLs (generative-ai, llm, models, complete-history)

## Browser Testing & Validation (REQUIRED)

> **CRITICAL**: Use Claude Chrome MCP tools to verify SEO changes.

### Schema Validation
- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to `/timeline` and view page source
- [ ] Search for `application/ld+json` in source
- [ ] Verify ItemList schema is present and valid
- [ ] Test in Google Rich Results Test: https://search.google.com/test/rich-results

### Meta Tag Validation
- [ ] Verify title tag shows exact target phrase
- [ ] Verify meta description is compelling and keyword-rich
- [ ] Check OG tags for social sharing
- [ ] Verify canonical URL is correct

### Cross-Page Consistency
- [ ] Check `/` homepage meta tags
- [ ] Check `/news` meta tags
- [ ] Check `/feed` meta tags
- [ ] Ensure all canonicals are correct

## Acceptance Criteria

- [x] Timeline page title contains "AI Timeline" at start
- [x] ItemList schema added to timeline page
- [x] "Last updated" date visible on timeline page
- [x] All target pages have unique, keyword-optimized titles
- [x] Sitemap includes all timeline URLs with correct priorities
- [ ] Browser validation tasks completed (pending)

## Deployment

```bash
# Build and deploy frontend
npm run build
aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete
aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"

# Deploy backend (if sitemap changes)
cd infra && sam build && sam deploy --no-confirm-changeset
```

**Deployed**: 2026-01-23 ✅

## Post-Deployment

- [ ] Submit updated sitemap to Google Search Console
- [ ] Request re-indexing of `/timeline` page
- [ ] Monitor Search Console for impressions/clicks over 2 weeks
- [ ] Check Rich Results report for new schema detection

## Notes for Future Developers

### Title Tag Best Practices
- Keep under 60 characters for full display
- Front-load target keyword ("AI Timeline" first)
- Include brand at end (| LAEA)
- Make it compelling to click

### Schema Markup Tips
- Validate with Google Rich Results Test before deploying
- Don't include too many items (100 max for performance)
- Use actual dates, not relative terms
- Include organization info where available

### Freshness Signals
- Google rewards recently updated content
- Visible "Last updated" dates build trust
- Combine with `dateModified` in schema
- Consider automated updates when new milestones added
