/**
 * Error Tracker Service
 *
 * Tracks pipeline errors with retry support for transient failures.
 * Sprint 32.11 - Error Handling & Alerts
 */

import { prisma } from '../db';

/**
 * Error types for categorization
 */
export type ErrorType = 'fetch' | 'analysis' | 'duplicate_detection';

/**
 * Options for tracking an error
 */
interface TrackErrorOptions {
  errorType: ErrorType;
  sourceId?: string;
  articleId?: string;
  message: string;
  stackTrace?: string;
  maxRetries?: number;
}

/**
 * Error tracking result
 */
interface ErrorTrackResult {
  errorId: string;
  retryCount: number;
  shouldRetry: boolean;
  maxRetries: number;
}

/**
 * Track a new error or increment retry count for existing error
 */
export async function trackError(options: TrackErrorOptions): Promise<ErrorTrackResult> {
  const { errorType, sourceId, articleId, message, stackTrace, maxRetries = 3 } = options;

  // Check for existing unresolved error of same type/source/article
  const existingError = await prisma.ingestionError.findFirst({
    where: {
      errorType,
      sourceId: sourceId || null,
      articleId: articleId || null,
      resolved: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existingError) {
    // Increment retry count
    const updated = await prisma.ingestionError.update({
      where: { id: existingError.id },
      data: {
        retryCount: existingError.retryCount + 1,
        message, // Update with latest error message
        stackTrace,
        updatedAt: new Date(),
      },
    });

    return {
      errorId: updated.id,
      retryCount: updated.retryCount,
      shouldRetry: updated.retryCount < updated.maxRetries,
      maxRetries: updated.maxRetries,
    };
  }

  // Create new error record
  const newError = await prisma.ingestionError.create({
    data: {
      errorType,
      sourceId,
      articleId,
      message,
      stackTrace,
      maxRetries,
      retryCount: 0,
    },
  });

  return {
    errorId: newError.id,
    retryCount: 0,
    shouldRetry: true,
    maxRetries,
  };
}

/**
 * Mark an error as resolved
 */
export async function resolveError(errorId: string): Promise<void> {
  await prisma.ingestionError.update({
    where: { id: errorId },
    data: {
      resolved: true,
      resolvedAt: new Date(),
    },
  });
}

/**
 * Resolve all errors for a source
 */
export async function resolveSourceErrors(sourceId: string): Promise<number> {
  const result = await prisma.ingestionError.updateMany({
    where: {
      sourceId,
      resolved: false,
    },
    data: {
      resolved: true,
      resolvedAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Resolve all errors for an article
 */
export async function resolveArticleErrors(articleId: string): Promise<number> {
  const result = await prisma.ingestionError.updateMany({
    where: {
      articleId,
      resolved: false,
    },
    data: {
      resolved: true,
      resolvedAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Get error statistics
 */
export async function getErrorStats(): Promise<{
  total: number;
  unresolved: number;
  byType: Record<string, number>;
  recentErrors: Array<{
    id: string;
    errorType: string;
    message: string;
    retryCount: number;
    createdAt: Date;
  }>;
}> {
  const [total, unresolved, byType, recentErrors] = await Promise.all([
    prisma.ingestionError.count(),
    prisma.ingestionError.count({ where: { resolved: false } }),
    prisma.ingestionError.groupBy({
      by: ['errorType'],
      where: { resolved: false },
      _count: true,
    }),
    prisma.ingestionError.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        errorType: true,
        message: true,
        retryCount: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    total,
    unresolved,
    byType: Object.fromEntries(byType.map((e) => [e.errorType, e._count])),
    recentErrors,
  };
}

/**
 * Clear all resolved errors older than specified days
 */
export async function clearOldErrors(olderThanDays: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await prisma.ingestionError.deleteMany({
    where: {
      resolved: true,
      resolvedAt: { lt: cutoffDate },
    },
  });

  return result.count;
}

/**
 * Clear all unresolved errors (admin action)
 */
export async function clearAllUnresolved(): Promise<number> {
  const result = await prisma.ingestionError.updateMany({
    where: { resolved: false },
    data: {
      resolved: true,
      resolvedAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Retry wrapper with exponential backoff
 * Executes a function with automatic retry on failure
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    errorType: ErrorType;
    sourceId?: string;
    articleId?: string;
    maxRetries?: number;
    initialDelayMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
  }
): Promise<T> {
  const { maxRetries = 3, initialDelayMs = 1000, onRetry } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();

      // If we had previous errors, resolve them on success
      if (attempt > 0 && (options.sourceId || options.articleId)) {
        if (options.sourceId) {
          await resolveSourceErrors(options.sourceId);
        }
        if (options.articleId) {
          await resolveArticleErrors(options.articleId);
        }
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Track the error
      const trackResult = await trackError({
        errorType: options.errorType,
        sourceId: options.sourceId,
        articleId: options.articleId,
        message: lastError.message,
        stackTrace: lastError.stack,
        maxRetries,
      });

      console.log(
        `[ErrorTracker] ${options.errorType} error (attempt ${attempt + 1}/${maxRetries + 1}): ${lastError.message}`
      );

      // Don't retry if we've exceeded max retries
      if (!trackResult.shouldRetry || attempt >= maxRetries) {
        console.log(`[ErrorTracker] Max retries exceeded for ${options.errorType}`);
        throw lastError;
      }

      // Notify callback if provided
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      // Exponential backoff
      const delayMs = initialDelayMs * Math.pow(2, attempt);
      console.log(`[ErrorTracker] Retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
}
