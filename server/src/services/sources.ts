import { prisma } from '../db';
import type { NewsSource, IngestedArticle } from '@prisma/client';

/**
 * Pagination options for list queries
 */
interface PaginationOptions {
  skip: number;
  limit: number;
}

/**
 * Create source DTO
 */
export interface CreateSourceDto {
  name: string;
  url: string;
  feedUrl: string;
  isActive?: boolean;
  checkFrequency?: number;
}

/**
 * Update source DTO
 */
export interface UpdateSourceDto {
  name?: string;
  url?: string;
  feedUrl?: string;
  isActive?: boolean;
  checkFrequency?: number;
}

/**
 * Get all news sources
 */
export async function getAll(): Promise<NewsSource[]> {
  if (!prisma) throw new Error('Database not available');

  return prisma.newsSource.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get a single source by ID
 */
export async function getById(id: string): Promise<NewsSource | null> {
  if (!prisma) throw new Error('Database not available');

  return prisma.newsSource.findUnique({
    where: { id },
  });
}

/**
 * Create a new news source
 */
export async function create(data: CreateSourceDto): Promise<NewsSource> {
  if (!prisma) throw new Error('Database not available');

  return prisma.newsSource.create({
    data: {
      name: data.name,
      url: data.url,
      feedUrl: data.feedUrl,
      isActive: data.isActive ?? true,
      checkFrequency: data.checkFrequency ?? 60,
    },
  });
}

/**
 * Update an existing source
 */
export async function update(id: string, data: UpdateSourceDto): Promise<NewsSource | null> {
  if (!prisma) throw new Error('Database not available');

  try {
    return await prisma.newsSource.update({
      where: { id },
      data,
    });
  } catch {
    return null;
  }
}

/**
 * Delete a source by ID
 */
export async function remove(id: string): Promise<boolean> {
  if (!prisma) throw new Error('Database not available');

  try {
    await prisma.newsSource.delete({
      where: { id },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Update last checked timestamp
 */
export async function updateLastChecked(id: string): Promise<void> {
  if (!prisma) throw new Error('Database not available');

  await prisma.newsSource.update({
    where: { id },
    data: { lastCheckedAt: new Date() },
  });
}

/**
 * Get source with article count
 */
export async function getWithArticleCount(id: string): Promise<(NewsSource & { _count: { articles: number } }) | null> {
  if (!prisma) throw new Error('Database not available');

  return prisma.newsSource.findUnique({
    where: { id },
    include: {
      _count: {
        select: { articles: true },
      },
    },
  });
}

/**
 * Get all sources with article counts
 */
export async function getAllWithArticleCounts(): Promise<(NewsSource & { _count: { articles: number } })[]> {
  if (!prisma) throw new Error('Database not available');

  return prisma.newsSource.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { articles: true },
      },
    },
  });
}

/**
 * Get articles for a source with pagination
 */
export async function getArticles(
  sourceId: string,
  options: PaginationOptions
): Promise<{ articles: IngestedArticle[]; total: number }> {
  if (!prisma) throw new Error('Database not available');

  const [articles, total] = await Promise.all([
    prisma.ingestedArticle.findMany({
      where: { sourceId },
      skip: options.skip,
      take: options.limit,
      orderBy: { publishedAt: 'desc' },
    }),
    prisma.ingestedArticle.count({
      where: { sourceId },
    }),
  ]);

  return { articles, total };
}

/**
 * Get all articles with pagination and filtering
 */
export async function getAllArticles(
  options: PaginationOptions & {
    sourceId?: string;
    analysisStatus?: string;
    reviewStatus?: string;
  }
): Promise<{ articles: (IngestedArticle & { source: NewsSource })[]; total: number }> {
  if (!prisma) throw new Error('Database not available');

  const where: Record<string, unknown> = {};

  if (options.sourceId) {
    where.sourceId = options.sourceId;
  }
  if (options.analysisStatus) {
    where.analysisStatus = options.analysisStatus;
  }
  if (options.reviewStatus) {
    where.reviewStatus = options.reviewStatus;
  }

  const [articles, total] = await Promise.all([
    prisma.ingestedArticle.findMany({
      where,
      skip: options.skip,
      take: options.limit,
      orderBy: { publishedAt: 'desc' },
      include: { source: true },
    }),
    prisma.ingestedArticle.count({ where }),
  ]);

  return { articles, total };
}

/**
 * Get a single article by ID
 */
export async function getArticleById(id: string): Promise<(IngestedArticle & { source: NewsSource }) | null> {
  if (!prisma) throw new Error('Database not available');

  return prisma.ingestedArticle.findUnique({
    where: { id },
    include: { source: true },
  });
}

/**
 * Check if article already exists by URL
 */
export async function articleExists(externalUrl: string): Promise<boolean> {
  if (!prisma) throw new Error('Database not available');

  const article = await prisma.ingestedArticle.findUnique({
    where: { externalUrl },
    select: { id: true },
  });

  return article !== null;
}

/**
 * Create a new ingested article
 */
export async function createArticle(data: {
  sourceId: string;
  externalUrl: string;
  title: string;
  content: string;
  publishedAt: Date;
}): Promise<IngestedArticle> {
  if (!prisma) throw new Error('Database not available');

  return prisma.ingestedArticle.create({
    data,
  });
}

/**
 * Bulk create articles (skipping duplicates)
 */
export async function createArticlesBulk(
  articles: {
    sourceId: string;
    externalUrl: string;
    title: string;
    content: string;
    publishedAt: Date;
  }[]
): Promise<{ created: number; skipped: number }> {
  if (!prisma) throw new Error('Database not available');

  let created = 0;
  let skipped = 0;

  for (const article of articles) {
    const exists = await articleExists(article.externalUrl);
    if (exists) {
      skipped++;
      continue;
    }

    try {
      await createArticle(article);
      created++;
    } catch {
      // Handle unique constraint violation
      skipped++;
    }
  }

  return { created, skipped };
}
