import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/error';
import * as sourcesService from '../services/sources';
import {
  fetcherRegistry,
  isRssConfig,
  isWebScraperConfig,
  isYouTubeChannelConfig,
  isYouTubePlaylistConfig,
  type FetcherSource,
  type SourceConfig,
} from '../services/ingestion/fetchers';
import type { SourceType } from '@prisma/client';

/**
 * Valid source types
 */
const SourceTypeEnum = z.enum(['rss', 'web_scraper', 'youtube_channel', 'youtube_playlist']);

/**
 * Zod schema for RSS config
 */
const RssConfigSchema = z.object({
  feedUrl: z.string().url(),
  checkFrequency: z.number().int().min(1).max(10080).optional(),
});

/**
 * Zod schema for web scraper config
 */
const WebScraperConfigSchema = z.object({
  targetUrl: z.string().url(),
  articleLinkSelector: z.string().optional(),
  articleLinkPattern: z.string().optional(),
  contentSelector: z.string().optional(),
  waitForSelector: z.string().optional(),
  maxArticlesPerFetch: z.number().int().min(1).max(50).optional(),
});

/**
 * Zod schema for YouTube channel config
 */
const YouTubeChannelConfigSchema = z.object({
  channelId: z.string().min(1),
  transcriptLanguage: z.string().optional(),
  includeShorts: z.boolean().optional(),
});

/**
 * Zod schema for YouTube playlist config
 */
const YouTubePlaylistConfigSchema = z.object({
  playlistId: z.string().min(1),
  transcriptLanguage: z.string().optional(),
});

/**
 * Zod schema for creating a news source
 */
const CreateSourceSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  sourceType: SourceTypeEnum.optional().default('rss'),
  config: z.record(z.string(), z.unknown()).optional().default({}),
  // Deprecated: for backwards compatibility with RSS sources
  feedUrl: z.string().url().optional(),
  isActive: z.boolean().optional().default(true),
  checkFrequency: z.number().int().min(1).max(10080).optional().default(60),
});

/**
 * Zod schema for updating a news source
 */
const UpdateSourceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
  sourceType: SourceTypeEnum.optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  feedUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  checkFrequency: z.number().int().min(1).max(10080).optional(),
});

/**
 * Zod schema for testing a source connection
 */
const TestConnectionSchema = z.object({
  sourceType: SourceTypeEnum,
  config: z.record(z.string(), z.unknown()),
});

/**
 * Validate config matches the source type
 */
function validateSourceConfig(sourceType: SourceType, config: Record<string, unknown>): void {
  switch (sourceType) {
    case 'rss':
      RssConfigSchema.parse(config);
      break;
    case 'web_scraper':
      WebScraperConfigSchema.parse(config);
      break;
    case 'youtube_channel':
      YouTubeChannelConfigSchema.parse(config);
      break;
    case 'youtube_playlist':
      YouTubePlaylistConfigSchema.parse(config);
      break;
    default:
      throw new Error(`Unknown source type: ${sourceType}`);
  }
}

/**
 * Compute health status for a source
 */
function computeHealthStatus(source: {
  isActive: boolean;
  lastSuccessAt: Date | null;
  consecutiveFailures: number;
  checkFrequency: number;
}): 'healthy' | 'warning' | 'error' | 'disabled' {
  if (!source.isActive) return 'disabled';

  if (source.consecutiveFailures >= 4) return 'error';
  if (source.consecutiveFailures >= 1) return 'warning';

  if (source.lastSuccessAt) {
    const hoursSinceSuccess = (Date.now() - source.lastSuccessAt.getTime()) / (1000 * 60 * 60);
    const expectedInterval = (source.checkFrequency / 60) * 2; // 2x check frequency in hours
    if (hoursSinceSuccess > expectedInterval) return 'warning';
  }

  return 'healthy';
}

/**
 * GET /api/admin/sources
 * Retrieve all news sources with article counts and health status
 */
export async function getAllSources(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sources = await sourcesService.getAllWithArticleCounts();

    res.json({
      data: sources.map((source) => ({
        ...source,
        articleCount: source._count.articles,
        healthStatus: computeHealthStatus(source),
        _count: undefined,
      })),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/sources/:id
 * Retrieve a single source by ID
 */
export async function getSourceById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const source = await sourcesService.getWithArticleCount(id);

    if (!source) {
      throw ApiError.notFound(`Source with ID ${id} not found`);
    }

    res.json({
      ...source,
      articleCount: source._count.articles,
      _count: undefined,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/sources
 * Create a new news source
 */
export async function createSource(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedData = CreateSourceSchema.parse(req.body);
    const sourceType = validatedData.sourceType as SourceType;

    // Build config object - handle backwards compatibility for RSS
    let config = validatedData.config as Record<string, unknown>;
    if (sourceType === 'rss') {
      // If feedUrl provided at top level (old API), move to config
      if (validatedData.feedUrl && !config.feedUrl) {
        config = { ...config, feedUrl: validatedData.feedUrl };
      }
    }

    // Validate config for the source type
    try {
      validateSourceConfig(sourceType, config);
    } catch (error) {
      throw ApiError.badRequest(
        `Invalid config for ${sourceType}: ${error instanceof Error ? error.message : 'validation failed'}`
      );
    }

    // Test connection before saving
    const testResult = await fetcherRegistry.testConnection(sourceType, config as SourceConfig);
    if (!testResult.success) {
      throw ApiError.badRequest(`Unable to connect to source: ${testResult.message}`);
    }

    const source = await sourcesService.create({
      name: validatedData.name,
      url: validatedData.url,
      sourceType,
      config,
      feedUrl: sourceType === 'rss' ? (config as { feedUrl: string }).feedUrl : undefined,
      isActive: validatedData.isActive,
      checkFrequency: validatedData.checkFrequency,
    });
    res.status(201).json(source);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/sources/test
 * Test connection to a source without saving
 */
export async function testSourceConnection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedData = TestConnectionSchema.parse(req.body);
    const sourceType = validatedData.sourceType as SourceType;
    const config = validatedData.config as Record<string, unknown>;

    // Validate config for the source type
    try {
      validateSourceConfig(sourceType, config);
    } catch (error) {
      throw ApiError.badRequest(
        `Invalid config for ${sourceType}: ${error instanceof Error ? error.message : 'validation failed'}`
      );
    }

    // Check if fetcher is available
    if (!fetcherRegistry.hasFetcher(sourceType)) {
      res.json({
        success: false,
        message: `No fetcher available for source type: ${sourceType}. This source type may not be implemented yet.`,
      });
      return;
    }

    const result = await fetcherRegistry.testConnection(sourceType, config as SourceConfig);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/sources/:id
 * Update an existing source
 */
export async function updateSource(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const validatedData = UpdateSourceSchema.parse(req.body);

    // Get current source to check source type
    const existingSource = await sourcesService.getById(id);
    if (!existingSource) {
      throw ApiError.notFound(`Source with ID ${id} not found`);
    }

    const sourceType = (validatedData.sourceType ?? existingSource.sourceType) as SourceType;

    // If config is being updated, validate it
    if (validatedData.config) {
      try {
        validateSourceConfig(sourceType, validatedData.config as Record<string, unknown>);
      } catch (error) {
        throw ApiError.badRequest(
          `Invalid config for ${sourceType}: ${error instanceof Error ? error.message : 'validation failed'}`
        );
      }

      // Test connection with new config
      const testResult = await fetcherRegistry.testConnection(
        sourceType,
        validatedData.config as SourceConfig
      );
      if (!testResult.success) {
        throw ApiError.badRequest(`Unable to connect with new config: ${testResult.message}`);
      }
    }

    const source = await sourcesService.update(id, validatedData);

    if (!source) {
      throw ApiError.notFound(`Source with ID ${id} not found`);
    }

    res.json(source);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/sources/:id
 * Delete a source by ID
 */
export async function deleteSource(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await sourcesService.remove(id);

    if (!deleted) {
      throw ApiError.notFound(`Source with ID ${id} not found`);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/sources/:id/fetch
 * Manually trigger article fetching for a single source
 */
export async function fetchSourceArticles(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const source = await sourcesService.getById(id);

    if (!source) {
      throw ApiError.notFound(`Source with ID ${id} not found`);
    }

    // Check if fetcher is available for this source type
    if (!fetcherRegistry.hasFetcher(source.sourceType)) {
      throw ApiError.badRequest(
        `No fetcher available for source type: ${source.sourceType}. This source type may not be implemented yet.`
      );
    }

    // Cast to FetcherSource for registry
    const fetcherSource: FetcherSource = {
      id: source.id,
      name: source.name,
      url: source.url,
      sourceType: source.sourceType,
      config: source.config as SourceConfig,
      feedUrl: source.feedUrl,
    };

    // Fetch articles using the registry
    const fetchedArticles = await fetcherRegistry.fetchFromSource(fetcherSource);

    // Prepare articles for bulk insert (only include database fields, exclude metadata)
    const articlesToCreate = fetchedArticles.map((article) => ({
      sourceId: source.id,
      externalUrl: article.externalUrl,
      title: article.title,
      content: article.content,
      publishedAt: article.publishedAt,
    }));

    // Bulk create, skipping duplicates
    const { created, skipped } = await sourcesService.createArticlesBulk(articlesToCreate);

    // Update timestamps
    await sourcesService.updateLastChecked(source.id);
    await sourcesService.markFetchSuccess(source.id);

    res.json({
      message: `Fetched articles from ${source.name}`,
      sourceType: source.sourceType,
      created,
      skipped,
      total: fetchedArticles.length,
    });
  } catch (error) {
    // Mark fetch failure
    try {
      const { id } = req.params;
      await sourcesService.markFetchFailure(id);
    } catch {
      // Ignore error tracking failure
    }
    next(error);
  }
}

/**
 * POST /api/admin/ingestion/fetch-all
 * Manually trigger article fetching for all active sources
 */
export async function fetchAllSources(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sources = await sourcesService.getAll();
    const activeSources = sources.filter((s) => s.isActive);

    const results: {
      sourceId: string;
      sourceName: string;
      sourceType: string;
      created: number;
      skipped: number;
      error?: string;
    }[] = [];

    for (const source of activeSources) {
      // Skip sources without available fetchers
      if (!fetcherRegistry.hasFetcher(source.sourceType)) {
        results.push({
          sourceId: source.id,
          sourceName: source.name,
          sourceType: source.sourceType,
          created: 0,
          skipped: 0,
          error: `No fetcher available for source type: ${source.sourceType}`,
        });
        continue;
      }

      try {
        // Cast to FetcherSource
        const fetcherSource: FetcherSource = {
          id: source.id,
          name: source.name,
          url: source.url,
          sourceType: source.sourceType,
          config: source.config as SourceConfig,
          feedUrl: source.feedUrl,
        };

        // Fetch using the registry
        const fetchedArticles = await fetcherRegistry.fetchFromSource(fetcherSource);

        const articlesToCreate = fetchedArticles.map((article) => ({
          sourceId: source.id,
          ...article,
        }));

        const { created, skipped } = await sourcesService.createArticlesBulk(articlesToCreate);
        await sourcesService.updateLastChecked(source.id);
        await sourcesService.markFetchSuccess(source.id);

        results.push({
          sourceId: source.id,
          sourceName: source.name,
          sourceType: source.sourceType,
          created,
          skipped,
        });
      } catch (err) {
        await sourcesService.markFetchFailure(source.id);
        results.push({
          sourceId: source.id,
          sourceName: source.name,
          sourceType: source.sourceType,
          created: 0,
          skipped: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

    res.json({
      message: `Fetched articles from ${activeSources.length} sources`,
      totalCreated,
      totalSkipped,
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/articles
 * Retrieve all ingested articles with pagination and filtering
 */
export async function getAllArticles(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const sourceId = req.query.sourceId as string | undefined;
    const analysisStatus = req.query.analysisStatus as string | undefined;
    const reviewStatus = req.query.reviewStatus as string | undefined;

    const { articles, total } = await sourcesService.getAllArticles({
      skip,
      limit,
      sourceId,
      analysisStatus,
      reviewStatus,
    });

    res.json({
      data: articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/articles/:id
 * Retrieve a single article by ID
 */
export async function getArticleById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const article = await sourcesService.getArticleById(id);

    if (!article) {
      throw ApiError.notFound(`Article with ID ${id} not found`);
    }

    res.json(article);
  } catch (error) {
    next(error);
  }
}
