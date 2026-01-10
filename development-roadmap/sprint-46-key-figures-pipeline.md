# Sprint 46: Key Figures - Pipeline Integration

**Impact**: High | **Effort**: High | **Dependencies**: Sprint 45 (API & Admin CRUD)

**Status**: DEPLOYED (2025-12-23)

## Overview

Integrate Key Figures extraction into the news ingestion pipeline. Articles are analyzed by LLM to extract mentioned figures, matched against existing records, and new figures are queued for review.

**Goal**: Automatically extract and link key figures from ingested articles with intelligent deduplication.

---

## Phase 1: LLM Extraction Service

### 46.1 Create Key Figure Extractor Service
- [x] Create `server/src/services/ingestion/keyFigureExtractor.ts`
- [x] Implement `extractKeyFigures(article: IngestedArticle): Promise<ExtractedFigure[]>`
- [x] Call Claude API with extraction prompt
- [x] Parse and validate LLM response
- [x] Return structured figure data

```typescript
interface ExtractedFigure {
  name: string;           // Raw name from article
  role: string;           // researcher, executive, founder, etc.
  organization?: string;  // Mentioned affiliation
  context: string;        // Sentence where mentioned
  contribution?: string;  // What they did in this article
}
```

### 46.2 Design Extraction Prompt
- [x] Create system prompt for figure extraction
- [x] Extract ONLY relevant figures (not journalists, commentators)
- [x] Include role classification
- [x] Extract context sentence for each mention
- [x] Request JSON array output

```
System: You extract key figures from AI news articles.

Extract ONLY:
- Researchers and scientists who made contributions
- Executives and founders of AI companies
- Engineers who built significant systems
- Policy makers involved in AI regulation

DO NOT extract:
- Journalists or article authors
- Unnamed sources ("a researcher said...")
- Historical figures not central to the article

For each figure, provide:
{
  "name": "Full name exactly as written",
  "role": "researcher|executive|founder|engineer|policy_maker|other",
  "organization": "Affiliation if mentioned, null otherwise",
  "context": "The exact sentence where they are mentioned",
  "contribution": "What they did/said relevant to this article"
}

Return a JSON array. If no key figures found, return [].
```

### 46.3 Add Response Parsing and Validation
- [x] Parse JSON from LLM response
- [x] Handle malformed JSON (use repair function from glossaryExtractor)
- [x] Validate each extracted figure has required fields
- [x] Filter out invalid entries with logging
- [x] Handle empty response gracefully

### 46.4 Configure Token Limits and Model
- [x] Use Claude Haiku for cost efficiency (fast extraction)
- [x] Set max_tokens: 2000 (sufficient for 10-15 figures)
- [x] Add timeout handling
- [x] Log extraction metrics

---

## Phase 2: Matching Integration

### 46.5 Process Extracted Figures
- [x] For each extracted figure, call `keyFigureMatcher.findMatch()`
- [x] Handle match results by type:
  - **exact_canonical**: Link directly
  - **exact_alias**: Link directly, log alias usage
  - **fuzzy (≥0.95)**: Auto-link with high confidence
  - **fuzzy (0.80-0.95)**: Create draft with match suggestion
  - **none**: Create new draft for review

### 46.6 Create or Link Figures
- [x] Implement `processExtractedFigure(figure, article, matchResult)`
- [x] If matched: Create MilestoneContributor record (if milestone exists)
- [x] If matched: Optionally add extracted name as new alias
- [x] If not matched: Create KeyFigureDraft record

### 46.7 Handle Multiple Mentions
- [x] Track figures already processed for this article
- [x] Don't create duplicate drafts for same figure
- [x] Aggregate context from multiple mentions

---

## Phase 3: Pipeline Integration

### 46.8 Update Article Analyzer
- [x] Modify `server/src/services/ingestion/articleAnalyzer.ts`
- [x] Add key figure extraction step after glossary extraction
- [x] Only extract for milestone-worthy OR high-relevance (≥0.6) articles
- [x] Store extracted figure IDs in analysis metadata

```typescript
// In analyzeArticle():
// ... existing screening and content generation ...

// Extract key figures (new step)
if (screening.isMilestoneWorthy || screening.relevanceScore >= 0.6) {
  const extractedFigures = await extractKeyFigures(article);
  await processExtractedFigures(extractedFigures, article);
}
```

### 46.9 Update Content Draft Creation
- [x] When creating milestone drafts, include extracted keyFigureIds
- [x] Store in draftData as `keyFigureIds: string[]`
- [x] Link on publish (handled in Phase 4)

### 46.10 Add Pipeline Logging
- [x] Log figures extracted per article
- [x] Log match results (matched vs new draft)
- [x] Track extraction errors separately
- [x] Add to pipeline dashboard metrics

---

## Phase 4: Draft Review Queue

### 46.11 Create Key Figure Drafts API
- [x] `GET /api/admin/key-figure-drafts` - List pending drafts
- [x] `GET /api/admin/key-figure-drafts/:id` - Get single draft
- [x] `POST /api/admin/key-figure-drafts/:id/approve` - Create new figure
- [x] `POST /api/admin/key-figure-drafts/:id/reject` - Reject draft
- [x] `POST /api/admin/key-figure-drafts/:id/merge` - Merge with existing

### 46.12 Implement Approve Action
- [x] Create new KeyFigure from draft data
- [x] Generate ID from normalized name
- [x] Set status to 'published'
- [x] Link to source article
- [x] Mark draft as 'approved'
- [x] Auto-link to milestones from same article

### 46.13 Implement Reject Action
- [x] Mark draft as 'rejected'
- [x] Store rejection reason
- [x] Don't create KeyFigure record

### 46.14 Implement Merge Action
- [x] Accept target keyFigureId to merge with
- [x] Add extracted name as alias to target figure
- [x] Create MilestoneContributor links
- [x] Mark draft as 'merged'
- [x] Link draft to merged figure

---

## Phase 5: Admin Review UI

### 46.15 Create KeyFigureDraftsPage
- [x] Create `src/pages/admin/KeyFigureDraftsPage.tsx`
- [x] Display pending drafts in cards/list
- [x] Show: Extracted name, context, source article, suggested matches
- [x] Filter by status: pending, approved, rejected, merged

### 46.16 Create Draft Review Card Component
- [x] Show extracted name prominently
- [x] Show context sentence (where mentioned)
- [x] Show suggested match with confidence %
- [x] Show suggested organization and role
- [x] Link to source article

### 46.17 Implement Review Actions UI
- [x] "Create as New" button → approve draft
- [x] "Merge with Existing" dropdown → select figure, confirm
- [x] "Reject" button → optional reason, confirm
- [x] Show success/error feedback

### 46.18 Add Batch Operations
- [x] Select multiple drafts
- [x] Batch reject (for spam/irrelevant)
- [x] Batch approve (if all are valid new figures)

### 46.19 Add Navigation
- [x] Add "Review Figures" to admin sidebar
- [x] Show badge with pending count
- [x] Add route: `/admin/key-figures/review`

---

## Phase 6: Merge Tool

### 46.20 Create Merge Figures Page
- [x] Create `src/pages/admin/MergeKeyFiguresPage.tsx`
- [x] Select 2+ figures to merge
- [x] Choose primary (canonical) record
- [x] Preview merged result
- [x] Confirm and execute merge

### 46.21 Implement Merge API
- [x] `POST /api/admin/key-figures/merge`
- [x] Accept: primaryId, secondaryIds[]
- [x] Combine aliases from all records
- [x] Reassign MilestoneContributor records
- [x] Delete secondary records
- [x] Return merged figure

```typescript
interface MergeRequest {
  primaryId: string;      // Keep this record
  secondaryIds: string[]; // Merge into primary, then delete
}
```

### 46.22 Add Merge UI to List Page
- [x] Checkbox selection on key figures list
- [x] "Merge Selected" button (disabled unless 2+ selected)
- [x] Navigate to merge page with selected IDs

---

## Phase 7: Auto-Alias Learning

### 46.23 Track Name Variations
- [x] When LLM extracts name that fuzzy-matches existing
- [x] Store extracted variant as new alias (if approved)
- [x] Improves future matching accuracy
- [x] Added AUTO_ALIAS_THRESHOLD (0.98) for automatic alias addition
- [x] Track aliasAdded in ProcessedFigureResult and ProcessingResult

### 46.24 Alias Suggestion on Match
- [x] When exact alias match found, no action needed
- [x] When fuzzy match auto-linked, prompt to add alias
- [x] Admin can confirm alias addition in review
- [x] Enhanced merge modal to show alias will be added
- [x] Enhanced suggested match display to show alias learning benefit

---

## Phase 8: Testing & Deployment

### 46.25 Test Extraction
- [x] Test with articles mentioning multiple figures
- [x] Test with articles mentioning no figures
- [x] Test JSON parsing and validation
- [x] Test error handling

### 46.26 Test Matching Pipeline
- [x] Test exact canonical match
- [x] Test alias match
- [x] Test fuzzy match with auto-link
- [x] Test fuzzy match with draft creation
- [x] Test no-match draft creation

### 46.27 Test Review Workflow
- [x] Approve draft creates new figure
- [x] Reject draft marks as rejected
- [x] Merge draft adds alias and links
- [x] Batch operations work correctly

### 46.28 Test Merge Tool
- [x] Merge combines aliases
- [x] Merge reassigns milestone links
- [x] Merge deletes secondary records
- [x] Cannot merge with self

### 46.29 Deploy
- [x] Deploy backend with new extraction service
- [x] Deploy frontend with review UI
- [ ] Monitor extraction in production
- [ ] Review and process initial drafts

---

## Pipeline Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Article Analysis Pipeline                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  IngestedArticle                                                │
│        ↓                                                        │
│  [screening.ts] ─────────────────────────────────────────────   │
│        ↓                                                        │
│  [contentGenerator.ts] → Milestone/NewsEvent drafts             │
│        ↓                                                        │
│  [glossaryExtractor.ts] → GlossaryTerm drafts                   │
│        ↓                                                        │
│  [keyFigureExtractor.ts] ← NEW                                  │
│        │                                                        │
│        ├── LLM extracts figures from article                    │
│        │                                                        │
│        ↓                                                        │
│  For each extracted figure:                                     │
│        │                                                        │
│        ├── Normalize name                                       │
│        ├── Match against existing KeyFigures                    │
│        │                                                        │
│        ├─► MATCH (≥0.95) ──► Link to milestone                  │
│        │                      Add alias if new variant          │
│        │                                                        │
│        ├─► FUZZY (0.80-0.95) ──► Create KeyFigureDraft         │
│        │                          Include match suggestion      │
│        │                                                        │
│        └─► NO MATCH ──► Create KeyFigureDraft                   │
│                         Status: pending                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Admin Review Queue                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  KeyFigureDraft (pending)                                       │
│        │                                                        │
│        ├─► [Approve] ──► Create KeyFigure                       │
│        │                  Link to milestones                    │
│        │                                                        │
│        ├─► [Merge] ──► Add alias to existing figure            │
│        │                Link to milestones                      │
│        │                                                        │
│        └─► [Reject] ──► Mark rejected, no action               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `server/src/services/ingestion/keyFigureExtractor.ts` | CREATE | LLM extraction service |
| `server/src/services/ingestion/articleAnalyzer.ts` | MODIFY | Add extraction step |
| `server/src/controllers/keyFigureDrafts.ts` | CREATE | Draft review endpoints |
| `server/src/routes/keyFigures.ts` | MODIFY | Add draft routes |
| `server/src/controllers/keyFigures.ts` | MODIFY | Add merge endpoint |
| `src/services/api.ts` | MODIFY | Add draft and merge methods |
| `src/pages/admin/KeyFigureDraftsPage.tsx` | CREATE | Review queue page |
| `src/pages/admin/MergeKeyFiguresPage.tsx` | CREATE | Merge tool page |
| `src/components/admin/KeyFigureDraftCard.tsx` | CREATE | Draft review card |
| `src/components/admin/AdminLayout.tsx` | MODIFY | Add review nav link |
| `src/App.tsx` | MODIFY | Add review and merge routes |

---

## Success Criteria

- [x] LLM successfully extracts key figures from articles
- [x] Exact matches link directly without creating drafts
- [x] Fuzzy matches (≥0.95) auto-link with alias suggestion
- [x] Lower confidence matches create drafts for review
- [x] Admin can approve drafts → creates new figure
- [x] Admin can merge drafts → adds alias to existing
- [x] Admin can reject drafts → marks rejected
- [x] Merge tool combines 2+ figures correctly
- [x] Pipeline extraction runs without blocking analysis

---

## Next Sprint

**Sprint 47**: Key Figures - Frontend Display & Migration
- Key Figures section in public glossary
- Figure cards on milestone detail pages
- Hover cards with Portal rendering
- Backfill existing Milestone.contributors to KeyFigure records
