/**
 * Fetcher Types - Multi-source ingestion type definitions
 *
 * Defines the common interface for all fetchers (RSS, YouTube, Playwright)
 * and type-specific configuration schemas.
 */

import type { SourceType } from '@prisma/client';

/**
 * Article fetched from any source (RSS, YouTube, web scraper)
 * This is the unified format that all fetchers must return.
 */
export interface FetchedArticle {
  externalUrl: string;
  title: string;
  content: string;
  publishedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Result from testing a source connection
 */
export interface TestConnectionResult {
  success: boolean;
  message: string;
  sampleArticles?: FetchedArticle[];
  sourceInfo?: {
    name?: string;
    description?: string;
    itemCount?: number;
  };
}

/**
 * NewsSource with typed config for fetcher use
 */
export interface FetcherSource {
  id: string;
  name: string;
  url: string;
  sourceType: SourceType;
  config: SourceConfig;
  feedUrl?: string | null; // Deprecated, for backwards compatibility
}

/**
 * RSS source configuration
 */
export interface RssConfig {
  feedUrl: string;
  checkFrequency?: number;
}

/**
 * Web scraper source configuration
 */
export interface WebScraperConfig {
  targetUrl: string;
  articleLinkSelector?: string;
  articleLinkPattern?: string;
  contentSelector?: string;
  waitForSelector?: string;
  maxArticlesPerFetch?: number;
}

/**
 * YouTube channel source configuration
 */
export interface YouTubeChannelConfig {
  channelId: string;
  transcriptLanguage?: string;
  includeShorts?: boolean;
  /** Maximum videos to fetch per sync (default: 20, max: 100) */
  maxVideos?: number;
  /** Only fetch videos published within this many days (default: no limit on first fetch, 7 days for recurring) */
  historyDays?: number;
}

/**
 * YouTube playlist source configuration
 */
export interface YouTubePlaylistConfig {
  playlistId: string;
  transcriptLanguage?: string;
}

/**
 * Single URL submission configuration (one-time, no daily sync)
 */
export interface SingleUrlConfig {
  contentSelector?: string; // Optional CSS selector for content extraction
  usePlaywright?: boolean; // Whether Playwright was used for scraping
}

/**
 * Single YouTube video configuration (one-time, no daily sync)
 */
export interface YouTubeVideoConfig {
  videoId: string;
  transcriptLanguage?: string;
}

/**
 * Union type for all source configurations
 */
export type SourceConfig =
  | RssConfig
  | WebScraperConfig
  | YouTubeChannelConfig
  | YouTubePlaylistConfig
  | SingleUrlConfig
  | YouTubeVideoConfig;

/**
 * Type guard for RSS config
 */
export function isRssConfig(config: unknown): config is RssConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'feedUrl' in config &&
    typeof (config as RssConfig).feedUrl === 'string'
  );
}

/**
 * Type guard for web scraper config
 */
export function isWebScraperConfig(config: unknown): config is WebScraperConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'targetUrl' in config &&
    typeof (config as WebScraperConfig).targetUrl === 'string'
  );
}

/**
 * Type guard for YouTube channel config
 */
export function isYouTubeChannelConfig(config: unknown): config is YouTubeChannelConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'channelId' in config &&
    typeof (config as YouTubeChannelConfig).channelId === 'string'
  );
}

/**
 * Type guard for YouTube playlist config
 */
export function isYouTubePlaylistConfig(config: unknown): config is YouTubePlaylistConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'playlistId' in config &&
    typeof (config as YouTubePlaylistConfig).playlistId === 'string'
  );
}

/**
 * Type guard for single URL config
 */
export function isSingleUrlConfig(config: unknown): config is SingleUrlConfig {
  // SingleUrlConfig has optional fields, so we accept any object without known config keys
  return (
    typeof config === 'object' &&
    config !== null &&
    !('feedUrl' in config) &&
    !('targetUrl' in config) &&
    !('channelId' in config) &&
    !('playlistId' in config) &&
    !('videoId' in config)
  );
}

/**
 * Type guard for YouTube video config
 */
export function isYouTubeVideoConfig(config: unknown): config is YouTubeVideoConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'videoId' in config &&
    typeof (config as YouTubeVideoConfig).videoId === 'string'
  );
}

/**
 * One-time source types that are excluded from daily sync
 */
export const ONE_TIME_SOURCE_TYPES = ['single_url', 'youtube_video'] as const;

/**
 * Check if a source type is a one-time (non-recurring) type
 */
export function isOneTimeSourceType(sourceType: string): boolean {
  return ONE_TIME_SOURCE_TYPES.includes(sourceType as (typeof ONE_TIME_SOURCE_TYPES)[number]);
}

/**
 * Fetcher interface - all source fetchers must implement this
 */
export interface Fetcher {
  /**
   * The source type this fetcher handles
   */
  readonly sourceType: SourceType;

  /**
   * Fetch articles from a source
   * @param source - The news source to fetch from
   * @returns Array of fetched articles
   */
  fetch(source: FetcherSource): Promise<FetchedArticle[]>;

  /**
   * Test connection to a source
   * @param config - The source configuration to test
   * @returns Test result with success status and sample articles
   */
  testConnection(config: SourceConfig): Promise<TestConnectionResult>;
}
