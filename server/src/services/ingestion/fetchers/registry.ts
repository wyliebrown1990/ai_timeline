/**
 * FetcherRegistry - Central registry for all source fetchers
 *
 * Routes fetch requests to the appropriate fetcher based on source type.
 * New fetchers (YouTube, Playwright) register here to be automatically
 * used by the ingestion pipeline.
 */

import type { SourceType } from '@prisma/client';
import type { Fetcher, FetchedArticle, FetcherSource, SourceConfig, TestConnectionResult } from './types';

/**
 * Registry for source fetchers
 */
class FetcherRegistry {
  private fetchers: Map<SourceType, Fetcher> = new Map();

  /**
   * Register a fetcher for a source type
   */
  register(fetcher: Fetcher): void {
    if (this.fetchers.has(fetcher.sourceType)) {
      console.warn(`[FetcherRegistry] Overwriting existing fetcher for ${fetcher.sourceType}`);
    }
    this.fetchers.set(fetcher.sourceType, fetcher);
    console.log(`[FetcherRegistry] Registered fetcher for ${fetcher.sourceType}`);
  }

  /**
   * Get a fetcher by source type
   */
  getFetcher(type: SourceType): Fetcher | undefined {
    return this.fetchers.get(type);
  }

  /**
   * Check if a fetcher is registered for a source type
   */
  hasFetcher(type: SourceType): boolean {
    return this.fetchers.has(type);
  }

  /**
   * Get all registered source types
   */
  getRegisteredTypes(): SourceType[] {
    return Array.from(this.fetchers.keys());
  }

  /**
   * Fetch articles from a source using the appropriate fetcher
   * @throws Error if no fetcher is registered for the source type
   */
  async fetchFromSource(source: FetcherSource): Promise<FetchedArticle[]> {
    const fetcher = this.fetchers.get(source.sourceType);

    if (!fetcher) {
      throw new Error(`No fetcher registered for source type: ${source.sourceType}`);
    }

    console.log(`[FetcherRegistry] Fetching from ${source.name} (${source.sourceType})`);

    try {
      const articles = await fetcher.fetch(source);
      console.log(`[FetcherRegistry] Fetched ${articles.length} articles from ${source.name}`);
      return articles;
    } catch (error) {
      console.error(`[FetcherRegistry] Error fetching from ${source.name}:`, error);
      throw error;
    }
  }

  /**
   * Test connection for a source configuration
   * @throws Error if no fetcher is registered for the source type
   */
  async testConnection(sourceType: SourceType, config: SourceConfig): Promise<TestConnectionResult> {
    const fetcher = this.fetchers.get(sourceType);

    if (!fetcher) {
      return {
        success: false,
        message: `No fetcher registered for source type: ${sourceType}`,
      };
    }

    try {
      return await fetcher.testConnection(config);
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error testing connection',
      };
    }
  }
}

// Export singleton instance
export const fetcherRegistry = new FetcherRegistry();
