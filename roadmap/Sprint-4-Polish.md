# Sprint 4: Polish & Monitoring

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-10 by Beans-bot

## Overview

Finalize the multi-source ingestion system with health monitoring, bulk operations, and improved error handling. This sprint focuses on operational excellence and admin UX refinements.

## Prerequisites

- [ ] Sprint 1-3 complete (all source types working)
- [ ] At least 2-3 sources of each type configured for testing

## Tasks

### 1. Source Health Dashboard

Add a dedicated view for monitoring source health.

- [ ] Create `src/pages/admin/SourceHealthPage.tsx`:
  ```tsx
  // Display for each source:
  - Source name and type (with icon)
  - Status: Healthy / Warning / Error / Disabled
  - Last successful fetch (relative time)
  - Consecutive failures count
  - Articles ingested (last 24h / 7d / 30d)
  - Last error message (if any)
  ```
- [ ] Add health status indicators:
  - **Healthy**: Last fetch < 2x check frequency, 0 failures
  - **Warning**: Last fetch > 2x check frequency OR 1-3 failures
  - **Error**: 4+ consecutive failures
  - **Disabled**: `isActive = false`
- [ ] Add "Fetch Now" button per source
- [ ] Add "View Errors" link to error log
- [ ] Add route: `/admin/sources/health`
- [ ] Add link from main SourcesPage

### 2. Source Statistics Tracking

Track and display ingestion metrics.

- [ ] Add to `NewsSource` schema:
  ```prisma
  articlesIngested24h  Int @default(0)
  articlesIngested7d   Int @default(0)
  articlesIngested30d  Int @default(0)
  totalArticlesIngested Int @default(0)
  lastErrorAt          DateTime?
  lastErrorMessage     String?
  ```
- [ ] Create migration for new fields
- [ ] Update ingestion job to increment counters
- [ ] Add daily job to roll over 24h → 7d → 30d counts
- [ ] Add `GET /api/admin/sources/stats` endpoint

### 3. Bulk Source Import

Allow importing multiple sources at once.

- [ ] Create `src/pages/admin/ImportSourcesPage.tsx`
- [ ] Support JSON import format:
  ```json
  [
    {
      "name": "The Neuron",
      "sourceType": "rss",
      "config": { "feedUrl": "https://...", "checkFrequency": 1440 }
    },
    {
      "name": "Lex Fridman",
      "sourceType": "youtube_channel",
      "config": { "channelId": "UCSHZKyawb77ixDdsGog4iWA" }
    }
  ]
  ```
- [ ] Add validation before import (check required fields, test connections)
- [ ] Show preview of sources to import
- [ ] Add "Export Sources" for backup
- [ ] Add `POST /api/admin/sources/bulk-import` endpoint
- [ ] Add `GET /api/admin/sources/export` endpoint
- [ ] Add route: `/admin/sources/import`

### 4. Enhanced Error Tracking

Improve error visibility and recovery.

- [ ] Extend `IngestionError` schema:
  ```prisma
  model IngestionError {
    // ... existing fields
    sourceId      String?
    sourceType    SourceType?
    errorCategory String    // fetch_failed, parse_failed, timeout, blocked, etc.
    isResolved    Boolean @default(false)
    resolvedAt    DateTime?
    resolvedBy    String?   // admin username
  }
  ```
- [ ] Create error categories enum:
  - `fetch_failed` - Network/HTTP error
  - `parse_failed` - Content parsing error
  - `timeout` - Request timeout
  - `blocked` - Bot detection / 403
  - `quota_exceeded` - API quota (YouTube)
  - `transcript_unavailable` - YouTube specific
  - `selector_mismatch` - CSS selector not found
- [ ] Create `src/pages/admin/ErrorLogPage.tsx`:
  - Filter by source, category, date range
  - Mark errors as resolved
  - Bulk resolve/dismiss
- [ ] Add error count badge to sidebar nav
- [ ] Add route: `/admin/errors`

### 5. Retry Improvements

Smarter retry behavior per source type.

- [ ] Configure retry strategies per source type:
  ```typescript
  const RETRY_STRATEGIES: Record<SourceType, RetryConfig> = {
    rss: { maxRetries: 3, backoffMs: [1000, 5000, 30000] },
    youtube_channel: { maxRetries: 2, backoffMs: [2000, 10000] },
    web_scraper: { maxRetries: 2, backoffMs: [5000, 30000] },
  };
  ```
- [ ] Add "retry immediately" button on failed sources
- [ ] Auto-disable after N consecutive failures (configurable)
- [ ] Send alert (console log initially) when source disabled
- [ ] Add "re-enable" button for disabled sources

### 6. Admin Dashboard Enhancements

Improve the main admin dashboard with ingestion stats.

- [ ] Add "Ingestion Overview" section to `AdminDashboard.tsx`:
  - Total sources (by type)
  - Sources needing attention (warnings/errors)
  - Articles ingested today
  - Pipeline status (running/paused)
- [ ] Add quick actions:
  - "Fetch All Sources"
  - "View Error Log"
  - "Source Health"
- [ ] Add mini-chart: Articles ingested over last 7 days
- [ ] Add recent activity feed (last 10 ingestion events)

### 7. Source Type Icons & Polish

Consistent visual treatment for source types.

- [ ] Create source type icons:
  - RSS: Standard RSS icon
  - YouTube: YouTube play button
  - Web Scraper: Browser/globe icon
- [ ] Add to source list, health page, error log
- [ ] Add source type filter to SourcesPage
- [ ] Add source type filter to IngestedArticlesPage
- [ ] Show source type badge on article detail page

### 8. Documentation

Document the multi-source system.

- [ ] Update `.claude/rules/news-ingestion.md` with:
  - New source types and their configs
  - FetcherRegistry architecture
  - How to add a new fetcher
  - Playwright setup instructions
  - YouTube API setup instructions
- [ ] Add inline code comments to key files
- [ ] Update CLAUDE.md with new npm scripts

## Acceptance Criteria

- [ ] Source health page shows status of all sources
- [ ] Can bulk import sources from JSON
- [ ] Error log shows categorized errors with filters
- [ ] Admin dashboard shows ingestion overview
- [ ] Source type icons display consistently
- [ ] Documentation updated for new features
- [ ] All source types work reliably in production

## Files to Create/Modify

**New Files:**
- `src/pages/admin/SourceHealthPage.tsx`
- `src/pages/admin/ImportSourcesPage.tsx`
- `src/pages/admin/ErrorLogPage.tsx`
- `src/components/admin/SourceTypeIcon.tsx`
- `src/components/admin/IngestionOverview.tsx`

**Modified Files:**
- `prisma/schema.prisma` (new fields)
- `src/pages/admin/AdminDashboard.tsx`
- `src/pages/admin/SourcesPage.tsx`
- `src/pages/admin/IngestedArticlesPage.tsx`
- `server/src/controllers/sources.ts`
- `server/src/services/ingestion/ingestionJob.ts`
- `.claude/rules/news-ingestion.md`
- `.claude/CLAUDE.md`

## Testing Checklist

- [ ] Source health page loads and shows correct statuses
- [ ] Bulk import validates and creates sources
- [ ] Error log filters work correctly
- [ ] Dashboard stats are accurate
- [ ] Source type icons render for all types
- [ ] Retry strategies work per source type
- [ ] Documentation is accurate and complete

## Notes for Future Developers

1. **Statistics Rollover**: The daily job that rolls 24h → 7d → 30d counts should run at midnight UTC. Use EventBridge scheduler.

2. **Error Resolution**: Marking an error as "resolved" doesn't retry the failed article automatically. It just clears the error from the active list. The article can be manually re-analyzed if needed.

3. **Bulk Import Limits**: Limit bulk imports to 50 sources at once to prevent timeout. Large imports should be split.

4. **Health Check Frequency**: The health page queries all sources on load. Consider caching or background health updates for 20+ sources.

5. **Future Enhancements** (not in this sprint):
   - Email/Slack alerts for source failures
   - Automatic source discovery (suggest sources based on content)
   - Source quality scoring (relevance of articles)
   - Scheduled source enable/disable (e.g., pause during weekends)

## Completion Checklist

When this sprint is complete:

- [ ] All 4 sprints merged to main
- [ ] Production deployment successful
- [ ] All source types tested in production
- [ ] Documentation reviewed and accurate
- [ ] No critical errors in error log
- [ ] At least 3 sources of each type configured and working
