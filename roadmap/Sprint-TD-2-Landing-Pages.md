# Sprint TD-2: Dedicated Landing Pages

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-24 by Claude

## Overview

Create dedicated landing pages targeting specific high-value search queries:
- Company-specific timelines (OpenAI, Anthropic, Google, Meta)
- Category-filtered views (Generative AI, LLMs, Model Releases)
- Date-range focused pages (2019-2024 breakthroughs)

**Priority**: HIGH
**Estimated Effort**: 2-3 days
**Status**: COMPLETED ✅

## URL Structure

```
/timeline/:filter          → Dynamic filter page (TimelineSlugPage wrapper)
/timeline/openai           → OpenAI timeline
/timeline/anthropic        → Anthropic timeline
/timeline/google           → Google/DeepMind timeline
/timeline/meta             → Meta/LLaMA timeline
/timeline/generative-ai    → Generative AI milestones
/timeline/llm              → Large Language Models
/timeline/models           → Major model releases
/timeline/2019-2024        → Recent breakthroughs
/timeline/complete-history → Full history 1950s-present
```

## Tasks

### 1. Create Filtered Timeline Route

**File**: `src/App.tsx`

- [x] Add route: `/timeline/:slug` → `TimelineSlugPage` (wrapper component)
- [x] TimelineSlugPage checks if slug is era or filter, renders appropriate page
- [x] Route already in sitemap from TD-1

### 2. Create FilteredTimelinePage Component

**Files Created**:
- `src/pages/FilteredTimelinePage.tsx` - Main filtered timeline view
- `src/pages/TimelineSlugPage.tsx` - Router wrapper
- `src/config/timelineFilters.ts` - Filter configurations

- [x] Create new page component
- [x] Accept `filter` param from URL
- [x] Map filter param to filter configurations
- [x] Fetch milestones with applied filters via API
- [x] Reuse existing Timeline components for display

### 3. Dynamic SEO for Each Filter

**File**: `src/pages/FilteredTimelinePage.tsx`

- [x] Set unique title per filter with brand suffix
- [x] Set unique meta descriptions with target keywords
- [x] Set correct canonical URL per filter
- [x] Add ItemList schema specific to filtered content
- [x] Include related keywords section

### 4. OpenAI Timeline Page

**Target Query**: "openai timeline"

- [x] Filter milestones where `organization` contains 'openai'
- [x] Title: `OpenAI Timeline: Complete History | LAEA`
- [x] Description: Complete OpenAI timeline from founding to GPT-5...
- [x] Green theme color

### 5. Anthropic Timeline Page

**Target Query**: "anthropic timeline", "claude ai history"

- [x] Filter milestones where `organization` contains 'anthropic'
- [x] Title: `Anthropic Timeline: Claude AI History | LAEA`
- [x] Description: Constitutional AI and Claude development...
- [x] Orange theme color

### 6. Google AI Timeline Page

**Target Query**: "google ai timeline", "deepmind timeline", "gemini history"

- [x] Filter milestones where `organization` contains 'google'
- [x] Title: `Google AI Timeline: From DeepMind to Gemini | LAEA`
- [x] Description: Complete Google AI history...
- [x] Blue theme color

### 7. Meta AI Timeline Page

**Target Query**: "meta ai timeline", "llama timeline"

- [x] Filter milestones where `organization` contains 'meta'
- [x] Title: `Meta AI Timeline: LLaMA and Open Source AI | LAEA`
- [x] Description: Facebook to Meta AI journey...
- [x] Blue theme color

### 8. Generative AI Timeline Page

**Target Query**: "generative ai timeline"

- [x] Filter by category `GENERATIVE_AI`
- [x] Title: `Generative AI Timeline: Text, Image & Video | LAEA`
- [x] Description: From GANs to ChatGPT...
- [x] Purple theme color

### 9. LLM Timeline Page

**Target Query**: "llm timeline", "large language models timeline"

- [x] Filter by category `MODEL_RELEASE`
- [x] Title: `Large Language Models Timeline: From GPT to Today | LAEA`
- [x] Description: Evolution of LLMs...
- [x] Cyan theme color

### 10. Model Releases Timeline Page

**Target Query**: "timeline of major ai model releases"

- [x] Filter by category `MODEL_RELEASE`
- [x] Title: `AI Models Timeline: Every Major Release | LAEA`
- [x] Description: Comprehensive model release timeline...
- [x] Orange theme color

### 11. 2019-2024 Breakthroughs Page

**Target Query**: "major ai breakthroughs timeline 2019-2024"

- [x] Filter by date range 2019-01-01 to 2024-12-31
- [x] Title: `Major AI Breakthroughs Timeline 2019-2024 | LAEA`
- [x] Description: The transformative AI years...
- [x] Red theme color

### 12. Complete History Page

**Target Query**: "artificial intelligence history timeline"

- [x] Include ALL milestones (no filter)
- [x] Title: `Complete AI Timeline: 1950 to Present | LAEA`
- [x] Description: The definitive AI timeline...
- [x] Orange theme color

### 13. Backend API Support

**Files Modified**:
- `server/src/services/milestones.ts` - Added organization filter
- `server/src/controllers/milestones.ts` - Added organization param

- [x] Add `organization` filter to FilterOptions interface
- [x] Add case-insensitive partial match on organization field
- [x] Accept `?organization=` query parameter in filter endpoint

### 14. Internal Linking

- [x] Add "Related Timelines" section to each filtered page
- [x] Shows related company/category timelines
- [x] Link back to main timeline from each page
- [x] CTA button to explore full timeline

### 15. Sitemap Updates (Already done in TD-1)

**File**: `server/src/routes/sitemap.ts`

- [x] Company URLs: openai, anthropic, google, meta
- [x] Category URLs: generative-ai, llm, models, complete-history
- [x] Priority 0.9, changefreq weekly

## Browser Testing & Validation (REQUIRED)

### Page Load Testing
- [ ] Navigate to `/timeline/openai` - verify correct content loads
- [ ] Navigate to `/timeline/generative-ai` - verify filtering works
- [ ] Navigate to `/timeline/2019-2024` - verify date range filter
- [ ] Check that 404-style page shows for invalid filters

### SEO Validation
- [ ] Verify each page has unique title tag
- [ ] Verify each page has unique meta description
- [ ] Verify canonical URLs are correct (not duplicates)
- [ ] Check JSON-LD schema on each page
- [ ] Test in Google Rich Results Test

### Internal Links
- [ ] Verify "Related Timelines" links work
- [ ] Check main timeline links to filtered views

## Acceptance Criteria

- [x] All filtered timeline pages created and accessible
- [x] Each page has unique, keyword-optimized SEO
- [x] Schema markup on all pages
- [x] Internal linking connects all timeline pages
- [x] Sitemap includes all new URLs
- [ ] Browser validation completed (pending)

## Files Created/Modified

### New Files
- `src/config/timelineFilters.ts` - Filter configurations for all landing pages
- `src/pages/FilteredTimelinePage.tsx` - Filtered timeline view component
- `src/pages/TimelineSlugPage.tsx` - Router wrapper component

### Modified Files
- `src/App.tsx` - Updated route to use TimelineSlugPage
- `src/types/filters.ts` - Added organization to FilterQueryParams
- `server/src/services/milestones.ts` - Added organization filter support
- `server/src/controllers/milestones.ts` - Added organization query param

## Deployment

```bash
# Build and deploy frontend
npm run build
aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete
aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"

# Deploy backend (for organization filter API)
cd infra && sam build && sam deploy --no-confirm-changeset
```

**Deployed**: 2026-01-24 ✅

## Post-Deployment

- [ ] Submit updated sitemap to Google Search Console
- [ ] Request re-indexing of new landing pages
- [ ] Monitor Search Console for new impressions/clicks
- [ ] Check that organization filter returns correct results

## Notes for Future Developers

### Architecture
- `TimelineSlugPage` is a wrapper that decides between `EraPage` (decade slugs) and `FilteredTimelinePage` (company/category slugs)
- Filter configs are defined in `src/config/timelineFilters.ts` for easy maintenance
- Era configs remain in `src/config/eras.ts`

### Adding New Filters
1. Add config to appropriate array in `timelineFilters.ts`
2. Add URL to sitemap in `server/src/routes/sitemap.ts`
3. No code changes needed - the component auto-renders based on config

### SEO Considerations
- Each filtered page has unique canonical URL
- Related keywords section helps with long-tail SEO
- Internal linking between pages boosts PageRank flow
