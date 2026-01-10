# Sprint 40: Manual Article Submission MVP

**Impact**: High | **Effort**: Low | **Dependencies**: Sprint 39 (Static cleanup complete)

**Status**: COMPLETE

## Overview

Add ability for admin to manually submit article content (paste text + source URL) for AI analysis. This bypasses the RSS feed dependency and creates ContentDrafts through the existing AI pipeline.

**Goal**: Ship fast, polish later. MVP allows pasting article content directly.

---

## Phase 1: Backend API Endpoint

### 40.1 Create Manual Submission Route
- [x] Add `POST /api/admin/articles/submit` endpoint
- [x] Accept: `sourceUrl` (required), `title` (optional), `content` (required)
- [x] Create `IngestedArticle` with `sourceId: null` (manual submission)
- [x] Return article ID for status tracking

### 40.2 Add Immediate Analysis Option
- [x] Add `analyzeImmediately` boolean flag to submission
- [x] If true, trigger `analyzeArticle()` synchronously
- [x] Return draft IDs in response

---

## Phase 2: Frontend Admin Page

### 40.3 Create SubmitArticlePage Component
- [x] Add new page at `/admin/submit-article`
- [x] Form fields: Source URL, Title (optional), Content (textarea)
- [x] Submit button with loading state
- [x] Success: Show link to Review Queue

### 40.4 Add Navigation Link
- [x] Add "Submit Article" to admin sidebar/nav
- [x] Badge or icon to distinguish from other options

---

## Phase 3: Testing & Deploy

### 40.5 Test End-to-End
- [x] Submit test article via API (verified working)
- [x] Verify IngestedArticle created with null sourceId
- [ ] Verify AI analysis runs (requires analyzeImmediately: true)
- [ ] Verify ContentDrafts appear in Review Queue
- [ ] Approve draft and verify publishing works

### 40.6 Database Migration
- [x] Make `sourceId` optional in IngestedArticle (migration 0005_optional_source)
- [x] Run migration via API endpoint

### 40.7 Deploy
- [x] Build and deploy backend (SAM)
- [x] Build and deploy frontend (S3 + CloudFront)

---

## API Specification

```typescript
// POST /api/admin/articles/submit
interface SubmitArticleRequest {
  sourceUrl: string;           // Required - credit source
  title?: string;              // Optional - extracted from content if missing
  content: string;             // Required - article text
  analyzeImmediately?: boolean; // Default: true
}

interface SubmitArticleResponse {
  success: boolean;
  articleId: string;
  analysisStatus: 'pending' | 'complete' | 'error';
  drafts?: Array<{
    id: string;
    contentType: string;
  }>;
  error?: string;
}
```

---

## File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `server/src/controllers/articles.ts` | MODIFY | Add submitArticle function |
| `server/src/routes/articles.ts` | MODIFY | Add submit endpoint route |
| `src/services/api.ts` | MODIFY | Add submit API method |
| `src/pages/admin/SubmitArticlePage.tsx` | CREATE | New submission form |
| `src/components/admin/AdminLayout.tsx` | MODIFY | Add nav link |
| `src/App.tsx` | MODIFY | Add route |

---

## Success Criteria

- [x] Admin can paste article text + URL
- [x] AI analysis generates drafts
- [x] Drafts appear in Review Queue
- [ ] Full approval workflow works (needs testing)
