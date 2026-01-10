/**
 * Scraper Presets - Pre-configured selectors for common news sites
 *
 * These presets help users quickly set up web scraper sources
 * without having to figure out the correct CSS selectors.
 */

import type { WebScraperConfig } from '../ingestion/fetchers/types';

/**
 * Partial config for presets (doesn't require targetUrl)
 */
type PresetConfig = Omit<WebScraperConfig, 'targetUrl'>;

/**
 * Scraper presets by domain
 */
export const SCRAPER_PRESETS: Record<string, PresetConfig> = {
  // Tech news sites
  'techcrunch.com': {
    articleLinkSelector: 'a.post-block__title__link, a[data-ga-category="Article"]',
    articleLinkPattern: '/\\d{4}/\\d{2}/\\d{2}/',
    contentSelector: 'article .article-content',
    waitForSelector: 'article',
  },

  'theverge.com': {
    articleLinkSelector: 'a[data-analytics-link="article"]',
    articleLinkPattern: '/\\d{4}/\\d{1,2}/\\d{1,2}/',
    contentSelector: '.duet--article--article-body-component',
    waitForSelector: 'article',
  },

  'arstechnica.com': {
    articleLinkSelector: '.article a, .listing a',
    articleLinkPattern: '/\\d{4}/\\d{2}/',
    contentSelector: '.article-content',
    waitForSelector: '.article-content',
  },

  'wired.com': {
    articleLinkSelector: 'a[data-testid="GenericCard"], a.summary-item__hed-link',
    articleLinkPattern: '/story/',
    contentSelector: 'article .body__inner-container',
    waitForSelector: 'article',
  },

  // AI/ML focused sites
  'artificialintelligence-news.com': {
    articleLinkSelector: 'article a, .post-title a',
    articleLinkPattern: '/\\d{4}/\\d{2}/',
    contentSelector: '.entry-content, .post-content',
    waitForSelector: '.entry-content',
  },

  'venturebeat.com': {
    articleLinkSelector: 'a.article-title, .ArticleListing a',
    articleLinkPattern: '/\\d{4}/\\d{2}/\\d{2}/',
    contentSelector: '.article-content',
    waitForSelector: '.article-content',
  },

  'thenextweb.com': {
    articleLinkSelector: 'a[href*="/news/"], a[href*="/neural/"]',
    articleLinkPattern: '/(news|neural)/',
    contentSelector: 'article .post-body',
    waitForSelector: 'article',
  },

  // Business/finance sites
  'reuters.com': {
    articleLinkSelector: 'a[data-testid="Heading"], a[href*="/technology/"]',
    articleLinkPattern: '/(technology|business|markets)/',
    contentSelector: 'article [data-testid="ArticleBody"]',
    waitForSelector: 'article',
  },

  'bloomberg.com': {
    articleLinkSelector: 'a[data-component="headline"]',
    articleLinkPattern: '/news/articles/',
    contentSelector: 'article .body-content',
    waitForSelector: 'article',
  },

  // Newsletters/blogs that might not have RSS
  'stratechery.com': {
    articleLinkSelector: 'a[href*="/article/"]',
    articleLinkPattern: '/article/',
    contentSelector: '.entry-content',
    waitForSelector: '.entry-content',
  },

  'bensbites.co': {
    articleLinkSelector: 'a.post-preview-title',
    articleLinkPattern: '/p/',
    contentSelector: '.post-content',
    waitForSelector: '.post-content',
  },

  // Research/academic
  'arxiv.org': {
    articleLinkSelector: 'a[href*="/abs/"]',
    articleLinkPattern: '/abs/\\d+\\.\\d+',
    contentSelector: '#abs',
    waitForSelector: '#abs',
  },
};

/**
 * Get preset for a URL
 * Extracts domain and looks up preset
 */
export function getPresetForUrl(url: string): PresetConfig | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return SCRAPER_PRESETS[hostname] || null;
  } catch {
    return null;
  }
}

/**
 * Get all available presets
 */
export function getAllPresets(): Array<{ domain: string; config: PresetConfig }> {
  return Object.entries(SCRAPER_PRESETS).map(([domain, config]) => ({
    domain,
    config,
  }));
}

/**
 * Check if a preset exists for a domain
 */
export function hasPreset(url: string): boolean {
  return getPresetForUrl(url) !== null;
}
