/**
 * Playwright Client - Communicates with the Playwright Docker service
 *
 * Provides a clean API for scraping pages that block standard HTTP requests.
 * Falls back to Jina Reader if Playwright service is unavailable.
 */

/**
 * Scraped content result
 */
export interface ScrapedContent {
  success: boolean;
  title?: string;
  content?: string;
  wordCount?: number;
  url: string;
  error?: string;
}

/**
 * Scrape options
 */
export interface ScrapeOptions {
  waitForSelector?: string;
  contentSelector?: string;
  timeout?: number;
}

/**
 * Article link from index page
 */
export interface ArticleLink {
  url: string;
  title: string;
}

/**
 * Links result
 */
export interface LinksResult {
  success: boolean;
  links: ArticleLink[];
  totalFound?: number;
  error?: string;
}

/**
 * Playwright Client
 */
class PlaywrightClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl = process.env.PLAYWRIGHT_URL || 'http://localhost:3002', timeout = 60000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Check if Playwright service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get service health status
   */
  async getHealth(): Promise<{
    status: string;
    activeRequests: number;
    queueLength: number;
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  }

  /**
   * Scrape a single article
   */
  async scrapeArticle(url: string, options: ScrapeOptions = {}): Promise<ScrapedContent> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          waitForSelector: options.waitForSelector,
          contentSelector: options.contentSelector,
          timeout: options.timeout || 30000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          url,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return response.json();
    } catch (error) {
      return {
        success: false,
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get article links from an index page
   */
  async getArticleLinks(
    url: string,
    linkSelector: string,
    linkPattern?: string,
    limit = 20
  ): Promise<LinksResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/scrape-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          linkSelector,
          linkPattern,
          limit,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          links: [],
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return response.json();
    } catch (error) {
      return {
        success: false,
        links: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Scrape with retry logic
   */
  async scrapeWithRetry(
    url: string,
    options: ScrapeOptions = {},
    maxRetries = 2
  ): Promise<ScrapedContent> {
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        console.log(`[PlaywrightClient] Retry ${attempt} for ${url}`);
      }

      const result = await this.scrapeArticle(url, options);

      if (result.success) {
        return result;
      }

      lastError = result.error;

      // Don't retry on certain errors
      if (lastError?.includes('404') || lastError?.includes('403')) {
        break;
      }
    }

    return {
      success: false,
      url,
      error: lastError || 'All retries failed',
    };
  }
}

// Export singleton
export const playwrightClient = new PlaywrightClient();
