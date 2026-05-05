/**
 * RssFetcher - Fetcher implementation for RSS feeds
 *
 * Handles fetching articles from RSS/Atom feeds using rss-parser.
 * Supports standard feeds as well as newsletter feeds like Beehiiv
 * that put full content in content:encoded.
 */

import Parser from 'rss-parser';
import { withRetry } from '../../errorTracker';
import type { Fetcher, FetchedArticle, FetcherSource, SourceConfig, TestConnectionResult } from './types';
import { isRssConfig } from './types';

/**
 * RSS Parser instance with custom fields for newsletter support
 */
const parser = new Parser({
  customFields: {
    item: ['content:encoded', 'contentSnippet'],
  },
  timeout: 30000, // 30 second timeout
});

/**
 * RssFetcher - Fetches articles from RSS feeds
 */
export class RssFetcher implements Fetcher {
  readonly sourceType = 'rss' as const;

  /**
   * Fetch articles from an RSS feed source
   */
  async fetch(source: FetcherSource): Promise<FetchedArticle[]> {
    const feedUrl = this.getFeedUrl(source);

    if (!feedUrl) {
      throw new Error(`No feed URL configured for RSS source: ${source.name}`);
    }

    return withRetry(() => this.fetchInternal(feedUrl), {
      errorType: 'fetch',
      sourceId: source.id,
      maxRetries: 3,
      initialDelayMs: 2000,
      onRetry: (attempt, error) => {
        console.log(`[RssFetcher] Retry ${attempt} for ${source.name}: ${error.message}`);
      },
    });
  }

  /**
   * Test connection to an RSS feed
   */
  async testConnection(config: SourceConfig): Promise<TestConnectionResult> {
    if (!isRssConfig(config)) {
      return {
        success: false,
        message: 'Invalid RSS configuration: missing feedUrl',
      };
    }

    try {
      const feed = await parser.parseURL(config.feedUrl);
      const sampleArticles = feed.items.slice(0, 3).map((item) => ({
        externalUrl: item.link || '',
        title: this.cleanTitle(item.title || 'Untitled'),
        content: this.extractContent(item).substring(0, 500) + '...',
        publishedAt: this.parseDate(item.pubDate || item.isoDate),
      }));

      return {
        success: true,
        message: `Successfully connected to RSS feed: ${feed.title || 'Unknown Feed'}`,
        sampleArticles,
        sourceInfo: {
          name: feed.title || undefined,
          description: feed.description || undefined,
          itemCount: feed.items?.length || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch RSS feed',
      };
    }
  }

  /**
   * Get feed URL from source (check config first, fallback to deprecated feedUrl field)
   */
  private getFeedUrl(source: FetcherSource): string | null {
    // Prefer config.feedUrl (new way)
    if (isRssConfig(source.config)) {
      return source.config.feedUrl;
    }

    // Fallback to deprecated feedUrl field for backwards compatibility
    if (source.feedUrl) {
      return source.feedUrl;
    }

    return null;
  }

  /**
   * Internal fetch without retry logic
   */
  private async fetchInternal(feedUrl: string): Promise<FetchedArticle[]> {
    const feed = await parser.parseURL(feedUrl);

    return feed.items
      .filter((item) => item.link && item.title)
      .map((item) => ({
        externalUrl: item.link!,
        title: this.cleanTitle(item.title || 'Untitled'),
        content: this.extractContent(item),
        publishedAt: this.parseDate(item.pubDate || item.isoDate),
      }));
  }

  /**
   * Clean emoji prefixes and whitespace from title
   */
  private cleanTitle(title: string): string {
    return title
      .replace(/^[\u{1F300}-\u{1F9FF}]\s*/gu, '') // Remove leading emoji
      .trim();
  }

  /**
   * Extract best available content from RSS item
   */
  private extractContent(item: Parser.Item & { 'content:encoded'?: string }): string {
    // Prefer content:encoded (full article) over content (often just description/teaser)
    const content = item['content:encoded'] || item.content || item.contentSnippet || item.summary || '';

    return this.stripHtml(content).trim();
  }

  /**
   * Strip HTML tags and embedded styles/scripts from string
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Parse date string to Date object
   */
  private parseDate(dateString: string | undefined): Date {
    if (!dateString) {
      return new Date();
    }

    const parsed = new Date(dateString);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
}

// Export singleton instance
export const rssFetcher = new RssFetcher();
