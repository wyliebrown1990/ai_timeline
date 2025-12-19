import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/error';
import * as sourcesService from '../services/sources';
import * as rssFetcher from '../services/ingestion/rssFetcher';

/**
 * Zod schema for creating a news source
 */
const CreateSourceSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  feedUrl: z.string().url(),
  isActive: z.boolean().optional().default(true),
  checkFrequency: z.number().int().min(1).max(1440).optional().default(60),
});

/**
 * Zod schema for updating a news source
 */
const UpdateSourceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
  feedUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  checkFrequency: z.number().int().min(1).max(1440).optional(),
});

/**
 * GET /api/admin/sources
 * Retrieve all news sources with article counts
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

    // Validate the feed URL is accessible
    try {
      await rssFetcher.validateFeedUrl(validatedData.feedUrl);
    } catch {
      throw ApiError.badRequest('Unable to fetch RSS feed from provided URL');
    }

    const source = await sourcesService.create(validatedData);
    res.status(201).json(source);
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

    // If feedUrl is being updated, validate it
    if (validatedData.feedUrl) {
      try {
        await rssFetcher.validateFeedUrl(validatedData.feedUrl);
      } catch {
        throw ApiError.badRequest('Unable to fetch RSS feed from provided URL');
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

    // Fetch articles from RSS (with retry logic and error tracking)
    const fetchedArticles = await rssFetcher.fetchFromRSS(source.feedUrl, source.id);

    // Prepare articles for bulk insert
    const articlesToCreate = fetchedArticles.map((article) => ({
      sourceId: source.id,
      ...article,
    }));

    // Bulk create, skipping duplicates
    const { created, skipped } = await sourcesService.createArticlesBulk(articlesToCreate);

    // Update last checked timestamp
    await sourcesService.updateLastChecked(source.id);

    res.json({
      message: `Fetched articles from ${source.name}`,
      created,
      skipped,
      total: fetchedArticles.length,
    });
  } catch (error) {
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
      created: number;
      skipped: number;
      error?: string;
    }[] = [];

    for (const source of activeSources) {
      try {
        // Fetch with retry logic and error tracking
        const fetchedArticles = await rssFetcher.fetchFromRSS(source.feedUrl, source.id);

        const articlesToCreate = fetchedArticles.map((article) => ({
          sourceId: source.id,
          ...article,
        }));

        const { created, skipped } = await sourcesService.createArticlesBulk(articlesToCreate);
        await sourcesService.updateLastChecked(source.id);

        results.push({
          sourceId: source.id,
          sourceName: source.name,
          created,
          skipped,
        });
      } catch (err) {
        results.push({
          sourceId: source.id,
          sourceName: source.name,
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
