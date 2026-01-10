/**
 * Fetchers Index - Export all fetcher-related types and the registry
 *
 * This module initializes all fetchers and registers them with the registry.
 * Import from here to get access to the configured fetcherRegistry.
 */

// Export types
export type {
  Fetcher,
  FetchedArticle,
  FetcherSource,
  RssConfig,
  WebScraperConfig,
  YouTubeChannelConfig,
  YouTubePlaylistConfig,
  SingleUrlConfig,
  YouTubeVideoConfig,
  SourceConfig,
  TestConnectionResult,
} from './types';

export {
  isRssConfig,
  isWebScraperConfig,
  isYouTubeChannelConfig,
  isYouTubePlaylistConfig,
  isSingleUrlConfig,
  isYouTubeVideoConfig,
  isOneTimeSourceType,
  ONE_TIME_SOURCE_TYPES,
} from './types';

// Export registry
export { fetcherRegistry } from './registry';

// Import fetchers
import { rssFetcher } from './RssFetcher';
import { youtubeFetcher } from './YouTubeFetcher';
import { playwrightFetcher } from './PlaywrightFetcher';
import { fetcherRegistry } from './registry';

// Register all fetchers
fetcherRegistry.register(rssFetcher);

// Register YouTube fetcher for both channel and playlist types
fetcherRegistry.register(youtubeFetcher);
fetcherRegistry.register({
  ...youtubeFetcher,
  sourceType: 'youtube_playlist' as const,
});

// Register Playwright fetcher for web scraping
fetcherRegistry.register(playwrightFetcher);

console.log('[Fetchers] Initialized with types:', fetcherRegistry.getRegisteredTypes());
