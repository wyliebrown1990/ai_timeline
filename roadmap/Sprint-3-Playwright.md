# Sprint 3: Playwright Web Scraping

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-10 by Beans-bot

## Overview

Add Playwright-based web scraping for sites that block standard HTTP requests (like Jina Reader). This enables ingestion from news sites with bot protection, JavaScript-rendered content, or anti-scraping measures.

## Prerequisites

- [x] Sprint 1 complete (FetcherRegistry in place)
- [x] Docker installed locally for development (Colima)
- [x] Decision made: Local Docker vs Browserless.io (start with Docker)

## Tasks

### 1. Playwright Docker Service

Set up a local Playwright service that exposes scraping via HTTP API.

- [x] Create `playwright-service/` directory in project root
- [x] Create `playwright-service/Dockerfile`:
  ```dockerfile
  FROM mcr.microsoft.com/playwright:v1.57.0-jammy
  WORKDIR /app
  COPY package.json .
  RUN npm install
  COPY . .
  EXPOSE 3002
  CMD ["node", "server.js"]
  ```
- [x] Create `playwright-service/server.js`:
  ```javascript
  // Express server with endpoints:
  // POST /scrape - Scrape single URL
  // POST /scrape-links - Get article links from index page
  // GET /health - Health check
  ```
- [x] Create `playwright-service/package.json` with dependencies
- [x] Add `docker-compose.yml` for easy local startup:
  ```yaml
  services:
    playwright:
      build: ./playwright-service
      ports:
        - "3002:3002"
      environment:
        - MAX_CONCURRENT=3
  ```
- [x] Add npm scripts:
  ```json
  "playwright:start": "docker-compose up playwright -d",
  "playwright:stop": "docker-compose down",
  "playwright:logs": "docker-compose logs -f playwright"
  ```

### 2. Playwright Service API

Implement the scraping endpoints in the Docker service.

- [x] `POST /scrape` endpoint:
  ```typescript
  // Request:
  {
    url: string,
    waitForSelector?: string,  // Wait for element before scraping
    contentSelector?: string,  // CSS selector for main content
    timeout?: number           // Default 30000ms
  }

  // Response:
  {
    success: boolean,
    title: string,
    content: string,        // Markdown formatted
    wordCount: number,
    error?: string
  }
  ```
- [x] `POST /scrape-links` endpoint:
  ```typescript
  // Request:
  {
    url: string,                    // Index/listing page
    linkSelector: string,           // CSS selector for article links
    linkPattern?: string,           // Regex to filter links
    limit?: number                  // Max links to return (default 20)
  }

  // Response:
  {
    success: boolean,
    links: Array<{ url: string, title: string }>,
    error?: string
  }
  ```
- [x] Add request queuing (max 3 concurrent)
- [x] Add timeout handling (kill long-running pages)
- [x] Add basic bot detection avoidance (user agent, viewport)
- [x] Return clean markdown content (strip nav, ads, footers)

### 3. Playwright Client in Backend

Create a client service to communicate with the Playwright Docker service.

- [x] Create `server/src/services/scraper/playwrightClient.ts`:
  ```typescript
  class PlaywrightClient {
    private baseUrl: string;  // http://localhost:3002

    // Check if service is available
    isAvailable(): Promise<boolean>

    // Scrape single article
    scrapeArticle(url: string, options?: ScrapeOptions): Promise<ScrapedContent>

    // Get article links from index page
    getArticleLinks(url: string, selector: string, pattern?: string): Promise<ArticleLink[]>
  }
  ```
- [x] Add retry logic with exponential backoff
- [ ] Add graceful fallback to Jina Reader if Playwright unavailable
- [x] Log scraping metrics (success rate, duration)

### 4. PlaywrightFetcher Implementation

- [x] Create `server/src/services/ingestion/fetchers/PlaywrightFetcher.ts`
- [x] Implement `Fetcher` interface
- [x] Fetch flow:
  1. Load index page via `getArticleLinks()`
  2. Filter to new articles (not already ingested)
  3. Scrape each article via `scrapeArticle()`
  4. Return as `FetchedArticle[]`
- [x] Config options:
  ```typescript
  {
    targetUrl: string,           // Index page URL
    articleLinkPattern: string,  // Regex for article URLs
    contentSelector?: string,    // CSS selector for article body
    waitForSelector?: string,    // Wait for dynamic content
    maxArticlesPerFetch: number  // Limit per run (default 10)
  }
  ```
- [x] Implement `testConnection()`:
  - Check Playwright service health
  - Fetch index page
  - Return sample article links found
- [x] Register with `FetcherRegistry`

### 5. Admin UI - Web Scraper Source

Update SourcesPage to support web scraper sources.

- [x] Create `WebScraperSourceForm` component: ✅ Integrated into SourcesPage 2026-01-10
  ```tsx
  // Fields:
  - Target URL (index/listing page)
  - Article link CSS selector
  - Article link URL pattern (regex)
  - Content CSS selector (optional)
  - Wait for selector (optional)
  - Max articles per fetch
  - Check frequency (hours)
  ```
- [ ] Add CSS selector helper/validator (deferred - nice to have)
- [x] Add "Test Connection" that shows: ✅
  - Whether Playwright service is running
  - Sample article links found
  - Preview of first article content
- [ ] Add warning if Playwright service not available (deferred)
- [x] Add "Web Scraper" option to source type selector ✅
- [x] Show scraper icon for web scraper sources ✅ Uses Globe icon

### 6. Scraping Presets

Provide pre-configured selectors for common sites.

- [x] Create `server/src/services/scraper/presets.ts`:
  ```typescript
  const SCRAPER_PRESETS: Record<string, ScraperConfig> = {
    'techcrunch.com': {
      articleLinkPattern: '/\\d{4}/\\d{2}/\\d{2}/',
      contentSelector: 'article.post-content',
      waitForSelector: 'article'
    },
    'theverge.com': {
      articleLinkPattern: '/\\d{4}/\\d{1,2}/\\d{1,2}/',
      contentSelector: '.duet--article--article-body-component',
    },
    // ... more sites
  };
  ```
- [ ] Auto-detect preset from URL in admin UI
- [ ] Show "Using preset for techcrunch.com" indicator
- [ ] Allow override of preset values

### 7. Error Handling & Fallbacks

- [ ] If Playwright unavailable, try Jina Reader as fallback
- [x] Track consecutive failures per source
- [ ] Auto-disable sources with >10 consecutive failures
- [ ] Add "Playwright required" flag to source (no fallback)
- [x] Log detailed scraping errors for debugging

## Acceptance Criteria

- [x] Playwright Docker service starts and responds to health checks ✅
- [x] Can scrape article from site that blocks Jina Reader ✅ Tested with OpenAI news
- [x] Can add web scraper source via admin UI ✅ Updated 2026-01-10
- [x] Test connection shows sample article links ✅
- [ ] Articles flow through AI pipeline normally (not tested)
- [ ] Graceful degradation when Playwright unavailable
- [x] Existing RSS and YouTube sources unaffected

## Files to Create/Modify

**New Files:**
- [x] `playwright-service/Dockerfile`
- [x] `playwright-service/server.js`
- [x] `playwright-service/package.json`
- [x] `docker-compose.yml`
- [x] `server/src/services/scraper/playwrightClient.ts`
- [x] `server/src/services/scraper/presets.ts`
- [x] `server/src/services/ingestion/fetchers/PlaywrightFetcher.ts`
- [x] `src/components/admin/WebScraperSourceForm.tsx` ✅ Integrated into SourcesPage

**Modified Files:**
- [x] `server/src/services/ingestion/fetchers/registry.ts`
- [x] `src/pages/admin/SourcesPage.tsx` ✅ Updated with multi-source support
- [x] `package.json` (npm scripts)

## Testing Checklist

- [x] Docker: Service builds and starts ✅
- [x] Docker: Health endpoint responds ✅
- [x] Integration: Scrape known blocked site successfully ✅ OpenAI news
- [x] Integration: Get article links from index page ✅ Found 96 links
- [x] E2E: Add web scraper source via UI ✅ UI updated 2026-01-10
- [ ] E2E: Trigger fetch and see articles ingested
- [ ] Fallback: Jina Reader used when Playwright down

## Notes for Future Developers

1. **Local Only (Initially)**: The Playwright service runs locally via Docker. It's not deployed to Lambda. For production scraping, run the Docker container on an EC2 instance or use Browserless.io.

2. **Resource Usage**: Playwright is memory-intensive (~500MB per browser instance). The Docker service limits concurrent scrapes to 3. Increase carefully.

3. **Bot Detection**: Some sites detect headless browsers. If scraping fails:
   - Try adding delays between actions
   - Use stealth plugins
   - Rotate user agents
   - Consider residential proxies (last resort)

4. **CSS Selector Tips**:
   - Use browser DevTools to find selectors
   - Prefer data attributes over classes (more stable)
   - Test selectors in browser console first
   - Some sites change markup frequently

5. **Upgrade Path**: If local Docker becomes limiting:
   - [Browserless.io](https://browserless.io) - Managed Playwright (~$50/mo)
   - [Apify](https://apify.com) - Scraping platform
   - Self-hosted on EC2 with Auto Scaling

6. **Legal Considerations**: Respect robots.txt and terms of service. This tool is for personal news aggregation, not commercial scraping. Don't hammer sites with requests.

7. **Playwright Version**: Updated to v1.57.0-jammy to match installed playwright package version.
