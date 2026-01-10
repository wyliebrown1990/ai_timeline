# Sprint 1: Foundation

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-10 by Beans-bot

## Overview

Establish the foundational architecture for multi-source ingestion. This sprint focuses on schema changes, the FetcherRegistry abstraction, and refactoring existing RSS code to fit the new pattern.

## Tasks

### 1. Database Schema Migration

Extend `NewsSource` to support multiple source types.

- [x] Add `sourceType` enum to Prisma schema
  ```prisma
  enum SourceType {
    rss
    web_scraper
    youtube_channel
    youtube_playlist
  }
  ```
- [x] Add `sourceType` field to `NewsSource` model (default: `rss`)
- [x] Add `config` Json field for type-specific settings
- [x] Add `lastSuccessAt` DateTime field for health tracking
- [x] Add `consecutiveFailures` Int field (default: 0)
- [x] Create migration: `npx prisma migrate dev --name add-source-types`
- [x] Write data migration script to set existing sources to `sourceType: "rss"`
- [ ] Update `NewsSource` Zod schema in `src/types/` (frontend types not updated yet)

**Config Schema by Type:**
```typescript
// RSS
{ feedUrl: string, checkFrequency: number }

// Web Scraper
{ targetUrl: string, articleLinkPattern?: string, contentSelector?: string, waitForSelector?: string, usesPlaywright: boolean }

// YouTube Channel
{ channelId: string, transcriptLanguage?: string, includeShorts?: boolean }

// YouTube Playlist
{ playlistId: string, transcriptLanguage?: string }
```

### 2. FetcherRegistry Architecture

Create the abstraction layer for pluggable fetchers.

- [x] Create `server/src/services/ingestion/fetchers/` directory
- [x] Define `Fetcher` interface:
  ```typescript
  // server/src/services/ingestion/fetchers/types.ts
  interface Fetcher {
    type: SourceType;
    fetch(source: NewsSource): Promise<FetchedArticle[]>;
    testConnection(config: SourceConfig): Promise<TestResult>;
  }

  interface FetchedArticle {
    externalUrl: string;
    title: string;
    content: string;
    publishedAt: Date;
    metadata?: Record<string, unknown>;
  }

  interface TestResult {
    success: boolean;
    message: string;
    sampleArticles?: FetchedArticle[];
  }
  ```
- [x] Create `FetcherRegistry` class:
  ```typescript
  // server/src/services/ingestion/fetchers/registry.ts
  class FetcherRegistry {
    private fetchers: Map<SourceType, Fetcher>;
    register(fetcher: Fetcher): void;
    getFetcher(type: SourceType): Fetcher;
    fetchFromSource(source: NewsSource): Promise<FetchedArticle[]>;
  }
  ```
- [x] Export registry singleton from `server/src/services/ingestion/fetchers/index.ts`

### 3. Refactor RssFetcher

Move existing RSS logic into the new fetcher pattern.

- [x] Create `server/src/services/ingestion/fetchers/RssFetcher.ts`
- [x] Extract logic from `rssFetcher.ts` into class implementing `Fetcher`
- [x] Implement `testConnection()` method (fetch feed, return first 3 articles)
- [x] Read `feedUrl` from `source.config` instead of `source.feedUrl`
- [x] Register `RssFetcher` with `FetcherRegistry`
- [x] Update `ingestionJob.ts` to use `FetcherRegistry.fetchFromSource()`
- [ ] Delete or deprecate old `rssFetcher.ts` file (keeping for backwards compatibility)
- [x] Verify existing RSS ingestion still works via manual test ✅ Tested with TechCrunch

### 4. Update API Layer

Modify source endpoints to handle new schema.

- [x] Update `POST /api/admin/sources` to accept `sourceType` and `config`
- [x] Update `PUT /api/admin/sources/:id` for new fields
- [x] Add `POST /api/admin/sources/test` endpoint for connection testing
- [x] Update `sources.ts` controller with validation per source type
- [x] Update `GET /api/admin/sources` to include new fields in response

### 5. Type Safety

Ensure end-to-end type safety for source configurations.

- [x] Create discriminated union type for source configs:
  ```typescript
  type SourceConfig =
    | { type: 'rss'; feedUrl: string; checkFrequency: number }
    | { type: 'web_scraper'; targetUrl: string; ... }
    | { type: 'youtube_channel'; channelId: string; ... }
    | { type: 'youtube_playlist'; playlistId: string; ... }
  ```
- [x] Add Zod schemas for each config type
- [x] Create config validator utility function
- [ ] Update frontend `api.ts` service types (not done yet)

## Acceptance Criteria

- [x] Database migration runs successfully on local and production
- [x] Existing RSS sources continue to ingest without changes
- [x] FetcherRegistry correctly routes to RssFetcher for RSS sources
- [x] `testConnection` endpoint returns sample articles for RSS sources ✅ Tested 2026-01-10
- [x] All TypeScript compiles with no errors
- [ ] Ingestion Lambda still works after refactor (not tested in Lambda yet)

## Files to Create/Modify

**New Files:**
- [x] `server/src/services/ingestion/fetchers/types.ts`
- [x] `server/src/services/ingestion/fetchers/registry.ts`
- [x] `server/src/services/ingestion/fetchers/RssFetcher.ts`
- [x] `server/src/services/ingestion/fetchers/index.ts`
- [x] `prisma/migrations/0007_add_source_types/migration.sql`

**Modified Files:**
- [x] `prisma/schema.prisma`
- [x] `server/src/services/ingestion/ingestionJob.ts`
- [x] `server/src/controllers/sources.ts`
- [x] `server/src/routes/admin/sources.ts`
- [ ] `src/types/sources.ts` (or similar) - frontend not updated
- [ ] `src/services/api.ts` - frontend not updated

## Testing Checklist

- [x] Run `npm run typecheck` - passes
- [x] Run `npm run dev:server` - starts without errors
- [ ] Manually trigger ingestion job - fetches from The Neuron (Neuron RSS has XML issues)
- [x] Call `POST /api/admin/sources/test` with RSS config - returns articles ✅
- [ ] Create new RSS source via API - saves correctly (not tested)
- [ ] Run Playwright E2E tests if applicable

## Notes for Future Developers

1. **Backwards Compatibility**: The `feedUrl` field on `NewsSource` is now deprecated. Read from `config.feedUrl` instead. Keep the old field for migration purposes.

2. **Registry Pattern**: New fetchers (YouTube, Playwright) will be added in Sprints 2-3. They just need to implement the `Fetcher` interface and register with `FetcherRegistry`.

3. **Config Validation**: Always validate config against the Zod schema before saving. Invalid configs should fail at API layer, not at fetch time.

4. **Error Tracking**: Use existing `consecutiveFailures` field. Increment on fetch failure, reset to 0 on success. Sources with >5 failures could be auto-disabled (future enhancement).

5. **Zod v4 Note**: Fixed `z.record(z.unknown())` to `z.record(z.string(), z.unknown())` for Zod v4 compatibility.
