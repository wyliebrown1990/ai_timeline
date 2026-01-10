# Sprint 41: URL Scraper Integration

**Impact**: High | **Effort**: Low-Medium | **Dependencies**: Sprint 40 (Manual submission)

**Status**: COMPLETE

## Overview

Add URL scraping capability so admin can just paste a URL and the system fetches the article content automatically. Uses Jina Reader API for reliable content extraction.

**Goal**: One-click article import from any URL.

---

## Phase 1: Jina Reader Integration

### 41.1 Create Scraper Service
- [x] Add `server/src/services/scraper/urlScraper.ts`
- [x] Use Jina Reader API: `https://r.jina.ai/{url}`
- [x] Parse markdown response
- [x] Extract title from first H1 or page title
- [x] Handle errors gracefully

### 41.2 Add Scrape Endpoint
- [x] Add `POST /api/admin/articles/scrape` endpoint
- [x] Accept: `url` (required)
- [x] Return: `title`, `content`, `success`
- [x] On success, optionally auto-submit for analysis

---

## Phase 2: Frontend Integration

### 41.3 Update SubmitArticlePage
- [x] Add "Fetch from URL" button next to Source URL field
- [x] When clicked, call scrape endpoint
- [x] Auto-populate title and content fields
- [x] Show loading spinner during fetch
- [x] Show error message if scrape fails

### 41.4 Add Checkbox for Auto-Submit
- [x] "Fetch and analyze immediately" option
- [x] When checked, scraping triggers full pipeline

---

## Phase 3: Testing & Deploy

### 41.5 Test Various URLs
- [x] Test with basic URLs (example.com - works)
- [ ] Test with news sites (TechCrunch, Wired - may be blocked by Jina)
- [ ] Test with blog posts
- [x] Test with protected content (OpenAI.com - returns 403, expected)
- [ ] Verify content quality

### 41.6 Deploy
- [x] Deploy backend
- [x] Deploy frontend
- [x] Verify in production

---

## API Specification

```typescript
// POST /api/admin/articles/scrape
interface ScrapeUrlRequest {
  url: string;
  submitForAnalysis?: boolean; // Default: false
}

interface ScrapeUrlResponse {
  success: boolean;
  title?: string;
  content?: string;
  wordCount?: number;
  error?: string;
  // If submitForAnalysis was true:
  articleId?: string;
  drafts?: Array<{ id: string; contentType: string }>;
}
```

---

## Jina Reader API

Free tier, no API key required for basic usage:

```bash
curl https://r.jina.ai/https://example.com/article
```

Returns clean markdown with:
- Title extracted
- Main content
- Images as markdown links
- Code blocks preserved

---

## File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `server/src/services/scraper/urlScraper.ts` | CREATE | Jina integration |
| `server/src/controllers/articles.ts` | MODIFY | Add scrapeArticleUrl function |
| `server/src/routes/articles.ts` | MODIFY | Add scrape endpoint route |
| `src/services/api.ts` | MODIFY | Add scrape API method |
| `src/pages/admin/SubmitArticlePage.tsx` | MODIFY | Add fetch button + Fetch & Analyze |

---

## Success Criteria

- [x] Admin can paste URL and click "Fetch"
- [x] Content auto-populates in form
- [x] Can then submit for AI analysis
- [ ] Works with major news sites (needs testing)
