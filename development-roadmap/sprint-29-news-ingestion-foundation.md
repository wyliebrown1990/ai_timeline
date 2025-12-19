# Sprint 29: News Ingestion Foundation

**Impact**: High | **Effort**: Low | **Dependencies**: Sprint 15 (Current Events), Sprint 16 (Admin Panel)

## Overview

Build the foundation for automated news ingestion: database models for tracking news sources and ingested articles, API endpoints for source management, and a basic admin UI to add/manage sources. Start with two sources: The Neuron Daily and Forward Future AI.

**Goal**: Admin can add news sources and manually trigger article fetching, with articles stored in database.

---

## Validated RSS Feeds

Both sources use Beehiiv and have working RSS feeds (validated Dec 19, 2025):

| Source | RSS Feed URL |
|--------|--------------|
| The Neuron Daily | `https://rss.beehiiv.com/feeds/N4eCstxvgX.xml` |
| Forward Future AI | `https://rss.beehiiv.com/feeds/JX3ex86lzM.xml` |

This simplifies implementation - standard RSS parsing only, no web scraping needed.

---

## Tasks

### 29.1 Database Schema - News Sources & Articles
- [x] Add `NewsSource` model to Prisma schema
- [x] Add `IngestedArticle` model to Prisma schema
- [x] Run migration (`npx prisma migrate dev`)
- [x] Verify models in Prisma Studio

```prisma
model NewsSource {
  id             String   @id @default(uuid())
  name           String
  url            String   @unique
  feedUrl        String   // Required - RSS feed URL
  isActive       Boolean  @default(true)
  checkFrequency Int      @default(60)
  lastCheckedAt  DateTime?
  createdAt      DateTime @default(now())
  articles       IngestedArticle[]
}

model IngestedArticle {
  id              String   @id @default(uuid())
  sourceId        String
  source          NewsSource @relation(fields: [sourceId], references: [id])
  externalUrl     String   @unique
  title           String
  content         String   // RSS description/content
  publishedAt     DateTime
  ingestedAt      DateTime @default(now())

  // Analysis (Sprint 30)
  analysisStatus  String   @default("pending")

  // Review (Sprint 31)
  reviewStatus    String   @default("pending")
}
```

### 29.2 News Source API Endpoints
- [x] Create `server/src/routes/sources.ts`
- [x] Create `server/src/controllers/sources.ts`
- [x] Create `server/src/services/sources.ts`
- [x] Implement endpoints:
  - `GET /api/admin/sources` - List all sources
  - `POST /api/admin/sources` - Add new source
  - `PUT /api/admin/sources/:id` - Update source
  - `DELETE /api/admin/sources/:id` - Delete source
- [x] Add `requireAdmin` middleware to all routes
- [x] Add Zod validation schemas

### 29.3 RSS Feed Fetcher Service
- [x] Create `server/src/services/ingestion/rssFetcher.ts`
- [x] Install dependency: `npm install rss-parser`
- [x] Parse RSS feed and extract articles
- [x] Extract: title, URL, published date, content/description
- [x] Deduplicate by URL (skip existing articles)

```typescript
import Parser from 'rss-parser'

interface FetchedArticle {
  externalUrl: string
  title: string
  content: string
  publishedAt: Date
}

async function fetchFromRSS(feedUrl: string): Promise<FetchedArticle[]> {
  const parser = new Parser()
  const feed = await parser.parseURL(feedUrl)

  return feed.items.map(item => ({
    externalUrl: item.link,
    title: item.title,
    content: item.contentSnippet || item.content || '',
    publishedAt: new Date(item.pubDate)
  }))
}
```

### 29.4 Manual Ingestion Endpoint
- [x] Add `POST /api/admin/sources/:id/fetch` endpoint
- [x] Fetches articles from single source's RSS feed
- [x] Stores new articles in database
- [x] Returns count of new articles added
- [x] Add `POST /api/admin/ingestion/fetch-all` for all active sources

### 29.5 Admin Source Management Page
- [x] Create `src/pages/admin/SourcesPage.tsx`
- [x] Add route `/admin/sources`
- [x] Add link to admin sidebar navigation
- [x] Display list of sources with status
- [x] Add source form (name, URL, feed URL, check frequency)
- [x] Edit/delete buttons per source
- [x] "Fetch Now" button triggers manual ingestion
- [x] Show last checked time and article count

```
┌────────────────────────────────────────────────────────────────┐
│ News Sources                                  [+ Add Source]   │
├────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ ● The Neuron Daily                              [Active]   │ │
│ │   https://theneurondaily.com                               │ │
│ │   Articles: 0    Last checked: Never                       │ │
│ │   [Edit] [Fetch Now] [Delete]                              │ │
│ └────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ ● Forward Future AI                             [Active]   │ │
│ │   https://forwardfuture.ai                                 │ │
│ │   Articles: 0    Last checked: Never                       │ │
│ │   [Edit] [Fetch Now] [Delete]                              │ │
│ └────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### 29.6 Ingested Articles List Page
- [x] Create `src/pages/admin/IngestedArticlesPage.tsx`
- [x] Add route `/admin/articles`
- [x] Add link to admin sidebar
- [x] Display paginated list of ingested articles
- [x] Filter by source, status
- [x] Show: title, source, date, status badge
- [x] Link to original article

---

## File Structure

```
server/src/
├── routes/
│   └── sources.ts              # NEW
├── controllers/
│   └── sources.ts              # NEW
├── services/
│   ├── sources.ts              # NEW - CRUD operations
│   └── ingestion/
│       └── rssFetcher.ts       # NEW - RSS parsing

src/pages/admin/
├── SourcesPage.tsx             # NEW
└── IngestedArticlesPage.tsx    # NEW

prisma/
└── schema.prisma               # UPDATE - Add models
```

---

## Success Criteria

- [x] Can add/edit/delete news sources from admin UI
- [x] Can manually trigger article fetch for a source (via RSS)
- [x] Articles are stored in database with deduplication by URL
- [x] Can view list of ingested articles
- [x] Both initial sources fetch successfully:
  - The Neuron Daily: `https://rss.beehiiv.com/feeds/N4eCstxvgX.xml`
  - Forward Future AI: `https://rss.beehiiv.com/feeds/JX3ex86lzM.xml`
- [x] No TypeScript errors

---

## Seed Data

Add initial sources on first deploy:

```typescript
// prisma/seed.ts or manual insert
const sources = [
  {
    name: 'The Neuron Daily',
    url: 'https://www.theneurondaily.com',
    feedUrl: 'https://rss.beehiiv.com/feeds/N4eCstxvgX.xml',
    isActive: true,
    checkFrequency: 60
  },
  {
    name: 'Forward Future AI',
    url: 'https://www.forwardfuture.ai',
    feedUrl: 'https://rss.beehiiv.com/feeds/JX3ex86lzM.xml',
    isActive: true,
    checkFrequency: 120
  }
]
```

---

## Notes

- Both sources use Beehiiv with standard RSS - no custom adapters needed
- Don't worry about scheduling yet (Sprint 32)
- Don't worry about AI analysis yet (Sprint 30)
- Focus on getting articles into the database reliably
- RSS feeds include content snippets - may need to fetch full article later for better AI analysis
