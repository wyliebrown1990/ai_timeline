# Multi-Source Ingestion Development Plan

> **Single Source of Truth**: All sprint progress tracked in individual sprint docs.
> Do NOT create separate status documents.

## Overview

Extend the ai_timeline ingestion pipeline to support multiple source types beyond RSS feeds. This enables ingestion from websites that block standard scraping (via Playwright) and YouTube channels/videos (via transcript extraction).

## Goals

1. **Unified Source Model** - Single `NewsSource` entity that handles RSS, web scraping, and YouTube
2. **Fetcher Abstraction** - Registry pattern allowing pluggable fetcher implementations
3. **YouTube Integration** - Channel monitoring and transcript-based content analysis
4. **Playwright Scraping** - Headless browser for sites that block Jina Reader
5. **Admin UX** - Seamless source management regardless of type

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FetcherRegistry                          │
│  ┌───────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ RssFetcher │  │ PlaywrightFetcher │  │  YouTubeFetcher  │  │
│  │ (existing) │  │     (new)         │  │     (new)        │  │
│  └───────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    FetchedArticle[] (unified format)
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Existing AI Pipeline        │
              │  Screening → Generation →     │
              │  Review Queue → Publish       │
              └───────────────────────────────┘
```

## Sprint Overview

| Sprint | Focus | Key Deliverables |
|--------|-------|------------------|
| 1 | Foundation | Schema migration, FetcherRegistry, RSS refactor |
| 2 | YouTube | YouTubeFetcher, transcript extraction, admin UI |
| 3 | Playwright | Docker service, PlaywrightFetcher, web scraper UI |
| 4 | Polish | Health monitoring, bulk import, error handling |

## Technical Decisions

### Source Type Storage
- `sourceType` enum: `rss`, `web_scraper`, `youtube_channel`, `youtube_playlist`
- `config` JSON column for type-specific settings
- Backwards compatible: existing RSS sources get `sourceType: "rss"`

### YouTube Implementation
- YouTube Data API v3 for video metadata (free tier: 10k units/day)
- `youtube-transcript` npm package for transcript extraction
- Transcripts become article `content` for AI analysis

### Playwright Implementation
- Start with local Docker container (`mcr.microsoft.com/playwright`)
- Expose via local API service on port 3002
- Upgrade path to Browserless.io if scaling needed

### Admin UI Strategy
- Extend existing SourcesPage with type selector
- Type-specific config forms (conditional rendering)
- "Test Connection" validation before save
- Unified source list with type badges

## Dependencies

```json
{
  "youtube-transcript": "^1.2.1",
  "googleapis": "^140.0.0",
  "playwright": "^1.48.0"
}
```

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| YouTube API quota limits | Cache video metadata, batch requests |
| Playwright resource usage | Rate limit scraping, optional enable |
| Transcript unavailable | Fallback to video description, mark as limited |
| Breaking existing RSS | Migration script, thorough testing |

## Success Criteria

- [ ] Can add YouTube channel as source and ingest new videos automatically
- [ ] Can scrape sites that block Jina Reader using Playwright
- [ ] Existing RSS sources continue working unchanged
- [ ] Admin can manage all source types from unified UI
- [ ] Source health visible at a glance
