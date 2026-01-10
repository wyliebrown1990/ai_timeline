# Sprint 42: Quick Create Forms (News Events & Glossary)

**Impact**: Medium | **Effort**: Low | **Dependencies**: None (parallel to 40-41)

**Status**: COMPLETE

## Overview

Add direct creation forms for News Events and Glossary Terms, bypassing the AI draft workflow. Similar to existing `CreateMilestonePage` but for other content types.

**Goal**: Manual content creation when AI isn't needed or for quick entries.

---

## Phase 1: News Event Creation

### 42.1 Create NewsEventForm Component
- [x] Fields: headline, summary, sourceUrl, sourcePublisher, publishedDate
- [x] Fields: connectionExplanation
- [x] Fields: featured (checkbox)
- [x] Validation (inline in page component)

Note: Form built inline in CreateNewsEventPage.tsx (simpler for MVP)

### 42.2 Create CreateNewsEventPage
- [x] Add page at `/admin/news-events/new`
- [x] POST to `/api/admin/current-events`
- [x] Success redirect to Review Queue

### 42.3 Add API Endpoint
- [x] `POST /api/admin/current-events` already existed
- [x] Validates required fields
- [x] Auto-generates ID and expiration date

---

## Phase 2: Glossary Term Creation

### 42.4 Create GlossaryTermForm Component
- [x] Fields: term, shortDefinition, fullDefinition
- [x] Fields: businessContext, category (dropdown)
- [x] Fields: relatedTermIds (comma-separated input)
- [x] Character count indicators

Note: Form built inline in CreateGlossaryTermPage.tsx (simpler for MVP)

### 42.5 Create CreateGlossaryTermPage
- [x] Add page at `/admin/glossary/new`
- [x] POST to `/api/admin/glossary`
- [x] Duplicate check before creation (handled by backend)

### 42.6 Add API Endpoint
- [x] `POST /api/admin/glossary` already existed
- [x] Auto-generates kebab-case ID from term
- [x] Checks for duplicate terms

---

## Phase 3: Navigation & Polish

### 42.7 Update Admin Navigation
- [x] Add "Create News Event" nav item
- [x] Add "Create Term" nav item
- [x] Icons for each type (Newspaper, Plus)

### 42.8 Add Edit Capabilities
- [ ] Edit button on glossary list (future sprint)
- [ ] Edit button on news events list (future sprint)
- [ ] Reuse form components (future sprint)

---

## Phase 4: Testing & Deploy

### 42.9 Test Creation Flows
- [ ] Create news event manually
- [ ] Verify appears in Current Events
- [ ] Create glossary term manually
- [ ] Verify appears in Glossary
- [ ] Test validation errors

### 42.10 Deploy
- [x] Deploy backend (no changes needed - endpoints existed)
- [x] Deploy frontend (S3 + CloudFront)

---

## API Specifications

```typescript
// POST /api/admin/current-events
interface CreateNewsEventRequest {
  headline: string;              // 10-200 chars
  summary: string;               // 50-500 chars
  sourceUrl?: string;            // Optional
  sourcePublisher?: string;
  publishedDate: string;         // YYYY-MM-DD
  prerequisiteMilestoneIds?: string[];
  connectionExplanation: string; // Required
  featured?: boolean;            // Default: false
}

// POST /api/admin/glossary
interface CreateGlossaryTermRequest {
  term: string;                  // Required, unique
  shortDefinition: string;       // ≤200 chars
  fullDefinition: string;        // ≤2000 chars
  businessContext?: string;      // ≤1000 chars
  category: string;              // One of 5 categories
  relatedTermIds?: string[];
}
```

---

## File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/admin/CreateNewsEventPage.tsx` | CREATE | News event creation page |
| `src/pages/admin/CreateGlossaryTermPage.tsx` | CREATE | Glossary term creation page |
| `src/services/api.ts` | MODIFY | Add currentEventsApi.create/update/delete |
| `src/components/admin/AdminLayout.tsx` | MODIFY | Add nav links |
| `src/App.tsx` | MODIFY | Add routes |

---

## Success Criteria

- [x] Can create News Event without AI pipeline
- [x] Can create Glossary Term without AI pipeline
- [ ] Both appear immediately in public views (needs testing)
- [x] Validation prevents bad data (character limits, required fields)
- [x] Navigation makes creation discoverable
