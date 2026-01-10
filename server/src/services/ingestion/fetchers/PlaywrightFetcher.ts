/**
 * PlaywrightFetcher - Fetcher implementation for websites that block standard scraping
 *
 * Uses the Playwright Docker service to render JavaScript and bypass
 * basic bot detection. Falls back to Jina Reader if Playwright unavailable.
 */

import { playwrightClient } from '../../scraper/playwrightClient';
import { SCRAPER_PRESETS, getPresetForUrl } from '../../scraper/presets';
import type {
  Fetcher,
  FetchedArticle,
  FetcherSource,
  SourceConfig,
  TestConnectionResult,
  WebScraperConfig,
} from './types';
import { isWebScraperConfig } from './types';

/**
 * PlaywrightFetcher - Fetches articles using headless browser
 */
export class PlaywrightFetcher implements Fetcher {
  readonly sourceType = 'web_scraper' as const;

  /**
   * Fetch articles from a web scraper source
   */
  async fetch(source: FetcherSource): Promise<FetchedArticle[]> {
    const config = source.config;

    if (!isWebScraperConfig(config)) {
      throw new Error('Invalid web scraper configuration');
    }

    // Check if Playwright service is available
    const isAvailable = await playwrightClient.isAvailable();
    if (!isAvailable) {
      console.warn('[PlaywrightFetcher] Playwright service unavailable, cannot fetch');
      throw new Error('Playwright scraper service is not running. Start it with: docker-compose up playwright -d');
    }

    // Apply preset overrides if available
    const preset = getPresetForUrl(config.targetUrl);
    const effectiveConfig = { ...preset, ...config };

    // Step 1: Get article links from index page
    const linkSelector = effectiveConfig.articleLinkSelector || 'a[href]';
    const linksResult = await playwrightClient.getArticleLinks(
      effectiveConfig.targetUrl,
      linkSelector,
      effectiveConfig.articleLinkPattern,
      effectiveConfig.maxArticlesPerFetch || 10
    );

    if (!linksResult.success) {
      throw new Error(`Failed to get article links: ${linksResult.error}`);
    }

    console.log(`[PlaywrightFetcher] Found ${linksResult.links.length} article links from ${source.name}`);

    // Step 2: Scrape each article
    const articles: FetchedArticle[] = [];

    for (const link of linksResult.links) {
      try {
        const scraped = await playwrightClient.scrapeWithRetry(link.url, {
          contentSelector: effectiveConfig.contentSelector,
          waitForSelector: effectiveConfig.waitForSelector,
        });

        if (scraped.success && scraped.content) {
          articles.push({
            externalUrl: link.url,
            title: scraped.title || link.title || 'Untitled',
            content: scraped.content,
            publishedAt: new Date(), // Web scraper doesn't get publish date easily
            metadata: {
              wordCount: scraped.wordCount,
              source: 'playwright',
            },
          });
        } else {
          console.warn(`[PlaywrightFetcher] Failed to scrape ${link.url}: ${scraped.error}`);
        }
      } catch (error) {
        console.warn(`[PlaywrightFetcher] Error scraping ${link.url}:`, error);
      }

      // Small delay between requests to be polite
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`[PlaywrightFetcher] Successfully scraped ${articles.length} articles`);
    return articles;
  }

  /**
   * Test connection to a web scraper source
   */
  async testConnection(config: SourceConfig): Promise<TestConnectionResult> {
    if (!isWebScraperConfig(config)) {
      return {
        success: false,
        message: 'Invalid web scraper configuration: missing targetUrl',
      };
    }

    // Check if Playwright service is available
    const isAvailable = await playwrightClient.isAvailable();
    if (!isAvailable) {
      return {
        success: false,
        message: 'Playwright scraper service is not running. Start it with: docker-compose up playwright -d',
      };
    }

    // Get service health
    const health = await playwrightClient.getHealth();

    try {
      // Apply preset if available
      const preset = getPresetForUrl(config.targetUrl);
      const effectiveConfig = { ...preset, ...config };

      // Try to get article links
      const linkSelector = effectiveConfig.articleLinkSelector || 'a[href]';
      const linksResult = await playwrightClient.getArticleLinks(
        effectiveConfig.targetUrl,
        linkSelector,
        effectiveConfig.articleLinkPattern,
        5
      );

      if (!linksResult.success) {
        return {
          success: false,
          message: `Failed to scrape index page: ${linksResult.error}`,
        };
      }

      // Try to scrape first article as sample
      let sampleArticles: FetchedArticle[] = [];
      if (linksResult.links.length > 0) {
        const firstLink = linksResult.links[0];
        const scraped = await playwrightClient.scrapeArticle(firstLink.url, {
          contentSelector: effectiveConfig.contentSelector,
          waitForSelector: effectiveConfig.waitForSelector,
        });

        if (scraped.success && scraped.content) {
          sampleArticles = [
            {
              externalUrl: firstLink.url,
              title: scraped.title || firstLink.title,
              content: scraped.content.substring(0, 500) + '...',
              publishedAt: new Date(),
            },
          ];
        }
      }

      const presetUsed = preset ? `Using preset for ${new URL(config.targetUrl).hostname}` : '';

      return {
        success: true,
        message: `Found ${linksResult.totalFound || linksResult.links.length} article links. ${presetUsed}`.trim(),
        sampleArticles,
        sourceInfo: {
          itemCount: linksResult.totalFound || linksResult.links.length,
          description: health
            ? `Playwright service: ${health.activeRequests} active, ${health.queueLength} queued`
            : undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to test connection',
      };
    }
  }
}

// Export singleton
export const playwrightFetcher = new PlaywrightFetcher();
