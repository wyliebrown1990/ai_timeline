import Parser from 'rss-parser';
import { withRetry } from '../errorTracker';

/**
 * Fetched article from RSS feed
 */
export interface FetchedArticle {
  externalUrl: string;
  title: string;
  content: string;
  publishedAt: Date;
}

/**
 * RSS Parser instance
 */
const parser = new Parser({
  customFields: {
    item: ['content:encoded', 'contentSnippet'],
  },
  timeout: 30000, // 30 second timeout
});

/**
 * Fetch articles from an RSS feed (internal, no retry)
 */
async function fetchFromRSSInternal(feedUrl: string): Promise<FetchedArticle[]> {
  const feed = await parser.parseURL(feedUrl);

  return feed.items
    .filter((item) => item.link && item.title)
    .map((item) => ({
      externalUrl: item.link!,
      title: cleanTitle(item.title || 'Untitled'),
      content: extractContent(item),
      publishedAt: parseDate(item.pubDate || item.isoDate),
    }));
}

/**
 * Fetch articles from an RSS feed with retry logic
 * @param feedUrl - The RSS feed URL to fetch
 * @param sourceId - Optional source ID for error tracking
 */
export async function fetchFromRSS(
  feedUrl: string,
  sourceId?: string
): Promise<FetchedArticle[]> {
  return withRetry(() => fetchFromRSSInternal(feedUrl), {
    errorType: 'fetch',
    sourceId,
    maxRetries: 3,
    initialDelayMs: 2000,
    onRetry: (attempt, error) => {
      console.log(`[RSS] Retry ${attempt} for ${feedUrl}: ${error.message}`);
    },
  });
}

/**
 * Clean emoji prefixes and whitespace from title
 */
function cleanTitle(title: string): string {
  // Remove common emoji prefixes used by newsletters
  return title
    .replace(/^[\u{1F300}-\u{1F9FF}]\s*/gu, '') // Remove leading emoji
    .trim();
}

/**
 * Extract best available content from RSS item
 */
function extractContent(item: Parser.Item & { 'content:encoded'?: string }): string {
  // Prefer full content, then encoded content, then snippet, then summary
  const content =
    item.content ||
    item['content:encoded'] ||
    item.contentSnippet ||
    item.summary ||
    '';

  // Strip HTML tags for cleaner storage
  return stripHtml(content).trim();
}

/**
 * Strip HTML tags from string
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse date string to Date object
 */
function parseDate(dateString: string | undefined): Date {
  if (!dateString) {
    return new Date();
  }

  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Fetch and validate a feed URL
 * Returns feed info if valid, throws if invalid
 * No retry - validation should fail fast
 */
export async function validateFeedUrl(feedUrl: string): Promise<{
  title: string;
  itemCount: number;
}> {
  const feed = await parser.parseURL(feedUrl);

  return {
    title: feed.title || 'Unknown Feed',
    itemCount: feed.items?.length || 0,
  };
}
