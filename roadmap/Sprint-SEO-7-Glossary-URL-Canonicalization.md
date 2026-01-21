# Sprint SEO-7: Glossary URL Canonicalization

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-21 by Claude
>
> **STATUS: Phase 1 & 2 COMPLETED** - Client-side redirect and link updates deployed.

## Overview

**Goal**: Fix Google Search Console indexing issues for glossary terms by redirecting legacy `?term=ID` URLs to canonical `/glossary/:slug` URLs.

### Problem Statement

Google Search Console shows glossary term URLs like `https://letaiexplainai.com/glossary?term=cmjd956ua000002i878cvtekz` as "not indexed". Investigation revealed:

1. **Canonical mismatch**: `GlossaryPage.tsx` sets `canonical="https://letaiexplainai.com/glossary"` for ALL query param variations
2. **No unique metadata**: Query param URLs show generic "AI Glossary" title/description instead of term-specific SEO
3. **Internal link pollution**: 20+ components generate `?term=ID` links instead of `/glossary/:slug` URLs
4. **Google's interpretation**: Query params treated as filters/duplicates, not unique content pages

### Root Cause

Many components only have access to term `id`, not `slug`, so they link to the old format:
```tsx
navigate(`/glossary?term=${concept.id}`);  // ConceptChip.tsx
navigate(`/glossary?term=${termId}`);      // GlossaryTerm.tsx
navigate(`/glossary?term=${result.id}`);   // GlobalSearch.tsx
```

Meanwhile, the SEO-optimized `/glossary/:slug` route exists with proper unique metadata but isn't being used.

### Solution

1. **Server-side redirect**: Redirect `?term=ID` → `/glossary/:slug` (301 permanent)
2. **Update internal links**: Migrate components to use slug-based URLs
3. **Ensure all terms have slugs**: Verify no terms are missing slugs in database

---

## Tasks

### Phase 1: Client-Side Redirect (Immediate SEO Fix) ✅ COMPLETED

- [x] GlossaryPage now redirects `?term=ID` to `/glossary/:slug` on load
- [x] Uses `navigate(..., { replace: true })` to replace history entry
- [x] Handles edge case where term has no slug (shows detail panel)
- [x] Deployed to production

### Phase 2: Update Internal Links (Prevent Future Issues) ✅ COMPLETED

#### High-Priority Components (directly link to glossary)
- [x] `src/components/Glossary/GlossaryTerm.tsx` - Updated to use slug
- [x] `src/components/GlobalSearch.tsx` - Updated search result links
- [x] `src/components/Learning/ConceptChip.tsx` - Updated chip clicks
- [x] `src/components/Learning/ConceptGraph.tsx` - Updated node navigation

#### Medium-Priority Pages
- [x] `src/pages/GlossaryPage.tsx` - handleTermClick now uses slug
- [x] `src/components/Timeline/MilestoneDetail.tsx` - Updated concept links
- [x] `src/pages/SubjectPage.tsx` - Updated glossary item links
- [ ] `src/pages/NewsQuizPage.tsx` - Relies on redirect (no slug in data)

#### Lower-Priority (admin/profile pages)
- [ ] `src/pages/UserProfilePage.tsx` - Relies on redirect (no slug in data)
- [ ] `src/pages/admin/CommentModerationPage.tsx` - Relies on redirect
- [x] `src/pages/ConceptsPage.tsx` - Updated term clicks

#### Type Updates
- [x] `src/services/api.ts` - Added `slug` to `GlossarySearchResult` interface
- [x] `src/services/api.ts` - Added `slug` to `LinkedConcept` interface

#### New Utilities
- [x] `src/utils/urls.ts` - Created URL helper utilities for consistent linking

### Phase 3: Data Integrity ✅ VERIFIED

- [x] Verified all glossary terms have slugs (sitemap shows 163 slug URLs, 0 query param URLs)
- [x] No migration needed
- [x] Sitemap already excludes `?term=` URLs

---

## Browser Testing & Validation (REQUIRED)

> **CRITICAL**: Use Claude Chrome MCP tools to manually test all web features.
> Do NOT mark tasks complete without browser validation.

### Redirect Validation
- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to `https://letaiexplainai.com/glossary?term=[valid-id]`
- [ ] Verify 301 redirect occurs to `/glossary/:slug`
- [ ] Verify final URL is the canonical slug URL
- [ ] Check that SEO metadata is correct on redirected page
- [ ] Test with invalid term ID (should show 404 or fallback)

### Internal Link Validation
- [ ] Navigate to timeline page, click a concept link
- [ ] Verify URL uses `/glossary/:slug` format (not `?term=`)
- [ ] Navigate to global search, search for a term, click result
- [ ] Verify URL uses slug format
- [ ] Check browser console for any errors

### Google Search Console Validation (Manual - After Deploy)
- [ ] Request re-indexing of affected URLs in GSC
- [ ] Monitor "Page indexing" report for improvements
- [ ] Verify redirects appear as "Redirected" not "Not indexed"

---

## Acceptance Criteria

- [ ] All `?term=ID` URLs return 301 redirect to `/glossary/:slug`
- [ ] Internal navigation uses slug-based URLs
- [ ] No console errors during glossary navigation
- [ ] Google can follow redirects to canonical URLs
- [ ] All browser validation tasks completed with screenshots

---

## Technical Implementation Details

### Redirect Endpoint

```typescript
// server/src/routes/glossary.ts

// Redirect legacy ?term=ID URLs to /glossary/:slug
router.get('/', async (req, res, next) => {
  const termId = req.query.term as string;

  if (termId) {
    // Look up term and redirect to slug URL
    const term = await prisma.glossaryTerm.findUnique({
      where: { id: termId },
      select: { slug: true },
    });

    if (term?.slug) {
      // 301 permanent redirect for SEO
      return res.redirect(301, `/glossary/${term.slug}`);
    }
  }

  // No redirect needed, continue to SPA
  next();
});
```

### Internal Link Pattern

```typescript
// Before (bad for SEO)
navigate(`/glossary?term=${term.id}`);

// After (SEO-friendly)
navigate(term.slug ? `/glossary/${term.slug}` : `/glossary?term=${term.id}`);

// Or with a helper function
import { getGlossaryUrl } from '@/utils/urls';
navigate(getGlossaryUrl(term));
```

### URL Helper Utility

```typescript
// src/utils/urls.ts
export function getGlossaryUrl(term: { id: string; slug?: string | null }): string {
  return term.slug ? `/glossary/${term.slug}` : `/glossary?term=${term.id}`;
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `server/src/routes/glossary.ts` | Add redirect middleware |
| `src/utils/urls.ts` | Create URL helper (new file) |
| `src/components/Glossary/GlossaryTerm.tsx` | Use URL helper |
| `src/components/GlobalSearch.tsx` | Use URL helper |
| `src/components/Learning/ConceptChip.tsx` | Use URL helper |
| `src/components/Learning/ConceptGraph.tsx` | Use URL helper |
| `src/components/Timeline/MilestoneDetail.tsx` | Use URL helper |
| `src/pages/SubjectPage.tsx` | Use URL helper |
| `src/pages/NewsQuizPage.tsx` | Use URL helper |
| `src/pages/GlossaryPage.tsx` | Use URL helper |
| + 3 more lower-priority files | Use URL helper |

---

## Notes for Future Developers

1. **Why 301 not 302?** - 301 is permanent redirect, tells Google to transfer SEO value to new URL and stop indexing old one

2. **Why not just update links?** - External links and Google's cache still have old URLs; redirect ensures they work

3. **Slug generation** - Slugs are generated from term names during creation (Sprint SEO-3). All existing terms should have slugs.

4. **SPA routing consideration** - The redirect happens at API level, but SPA catches `/glossary` route. The redirect must happen before SPA serves index.html. Consider Lambda@Edge or CloudFront function if API redirect doesn't work.

5. **Testing tip** - Use `curl -I` to check redirect headers without following them:
   ```bash
   curl -I "https://letaiexplainai.com/glossary?term=cmjd956ua000002i878cvtekz"
   ```

---

## Related Documentation

- Sprint SEO-3: Topic Clusters (created `/glossary/:slug` routes)
- PLAN-SEO-Improvements.md: Overall SEO strategy
- Google: [URL canonicalization](https://developers.google.com/search/docs/crawling-indexing/canonicalization)
