/**
 * News Quiz Controller (Sprint LEarn-2)
 *
 * Handles API endpoints for the weekly AI news quiz feature.
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/error';
import * as newsQuizGenerator from '../services/newsQuizGenerator';

// =============================================================================
// Public Endpoints
// =============================================================================

/**
 * GET /api/news-quiz/current
 * Get the current week's quiz
 */
export async function getCurrentQuiz(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { prisma } = await import('../db');
    if (!prisma) throw ApiError.internal('Database not available');

    const result = await newsQuizGenerator.getCurrentQuiz(prisma);

    if (!result.quiz) {
      res.json({
        data: null,
        message: 'No quiz available for this week yet',
        weekStart: result.weekStart,
        weekEnd: result.weekEnd,
      });
      return;
    }

    // Return quiz without correct answers for the public endpoint
    const questionsWithoutAnswers = result.quiz.questions.map((q, index) => ({
      index,
      newsEventId: q.newsEventId,
      newsHeadline: q.newsHeadline,
      questionType: q.questionType,
      question: q.question,
      options: q.options,
      relatedConceptId: q.relatedConceptId,
      relatedConceptName: q.relatedConceptName,
      sourceUrl: q.sourceUrl,
      sourcePublisher: q.sourcePublisher,
      sourcePublishedDate: q.sourcePublishedDate,
      sourceSummary: q.sourceSummary,
      sourceWhyItMatters: q.sourceWhyItMatters,
      sourceConnectionExplanation: q.sourceConnectionExplanation,
      hostedArticlePath: q.hostedArticlePath,
      prerequisiteMilestoneTitles: q.prerequisiteMilestoneTitles,
      relatedMilestoneTitles: q.relatedMilestoneTitles,
    }));

    res.json({
      data: {
        id: result.quiz.id,
        weekOf: result.quiz.weekOf,
        questionCount: result.quiz.questions.length,
        questions: questionsWithoutAnswers,
      },
      weekStart: result.weekStart,
      weekEnd: result.weekEnd,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/news-quiz/history
 * Get past quizzes
 */
export async function getQuizHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    // Optional: per-row best-score join when caller is identified by sessionId.
    // Anonymous session IDs are not auth-grade — treat as click-tracking, not authentication.
    const sessionId = typeof req.query.sessionId === 'string' && req.query.sessionId.length > 0
      ? req.query.sessionId
      : undefined;

    const { prisma } = await import('../db');
    if (!prisma) throw ApiError.internal('Database not available');

    const history = await newsQuizGenerator.getQuizHistory(prisma, limit, sessionId);

    res.json({
      data: history,
      total: history.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/news-quiz/:id
 * Get a specific quiz by ID (without answers)
 */
export async function getQuizById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const { prisma } = await import('../db');
    if (!prisma) throw ApiError.internal('Database not available');

    const quiz = await prisma.newsQuiz.findUnique({
      where: { id },
    });

    if (!quiz) {
      throw ApiError.notFound(`Quiz not found: ${id}`);
    }

    // Security invariant: never return correctAnswer or explanation in the public response.
    const questions = quiz.questions as newsQuizGenerator.NewsQuizQuestion[];
    const questionsWithoutAnswers = questions.map((q, index) => ({
      index,
      newsEventId: q.newsEventId,
      newsHeadline: q.newsHeadline,
      questionType: q.questionType,
      question: q.question,
      options: q.options,
      relatedConceptId: q.relatedConceptId,
      relatedConceptName: q.relatedConceptName,
      sourceUrl: q.sourceUrl,
      sourcePublisher: q.sourcePublisher,
      sourcePublishedDate: q.sourcePublishedDate,
      sourceSummary: q.sourceSummary,
      sourceWhyItMatters: q.sourceWhyItMatters,
      sourceConnectionExplanation: q.sourceConnectionExplanation,
      hostedArticlePath: q.hostedArticlePath,
      prerequisiteMilestoneTitles: q.prerequisiteMilestoneTitles,
      relatedMilestoneTitles: q.relatedMilestoneTitles,
    }));

    // Pre-compute coverage window so frontend doesn't re-derive it.
    const weekEnd = quiz.weekOf;
    const weekStart = new Date(weekEnd);
    weekStart.setUTCDate(weekStart.getUTCDate() - 7);

    res.json({
      data: {
        id: quiz.id,
        weekOf: quiz.weekOf,
        weekStart,
        weekEnd,
        questionCount: questions.length,
        questions: questionsWithoutAnswers,
        createdAt: quiz.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/news-quiz/:id/submit
 * Submit quiz answers and get score
 */
export async function submitQuiz(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const schema = z.object({
      sessionId: z.string().min(1),
      answers: z.array(
        z.object({
          questionIndex: z.number().int().min(0),
          selectedAnswer: z.number().int().min(0).max(3),
        })
      ),
    });

    const { sessionId, answers } = schema.parse(req.body);

    const { prisma } = await import('../db');
    if (!prisma) throw ApiError.internal('Database not available');

    // Verify session exists
    const session = await prisma.userSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw ApiError.badRequest(`Invalid session: ${sessionId}`);
    }

    const result = await newsQuizGenerator.submitQuizAttempt(
      prisma,
      sessionId,
      id,
      answers
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/news-quiz/user-history
 * Get current user's quiz history
 */
export async function getUserHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionId = req.query.sessionId as string;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    if (!sessionId) {
      throw ApiError.badRequest('sessionId is required');
    }

    const { prisma } = await import('../db');
    if (!prisma) throw ApiError.internal('Database not available');

    const history = await newsQuizGenerator.getUserQuizHistory(prisma, sessionId, limit);

    res.json({
      data: history,
      total: history.length,
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// Admin Endpoints
// =============================================================================

/**
 * POST /api/admin/news-quiz/generate
 * Generate a new weekly quiz (admin only)
 */
export async function generateQuiz(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const schema = z.object({
      questionCount: z.number().int().min(3).max(15).optional().default(5),
      daysBack: z.number().int().min(1).max(30).optional().default(7),
      forceRegenerate: z.boolean().optional().default(false),
      requiredEventIds: z.array(z.string()).optional(),
    });

    const options = schema.parse(req.body);

    const { prisma } = await import('../db');
    if (!prisma) throw ApiError.internal('Database not available');

    const quiz = await newsQuizGenerator.generateWeeklyQuiz(prisma, options);

    res.json({
      success: true,
      message: `Generated quiz for week of ${quiz.weekOf.toISOString().split('T')[0]}`,
      data: {
        weekOf: quiz.weekOf,
        questionCount: quiz.questions.length,
        questions: quiz.questions,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/news-quiz/:id
 * Delete a quiz (admin only)
 */
export async function deleteQuiz(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const { prisma } = await import('../db');
    if (!prisma) throw ApiError.internal('Database not available');

    // Check if quiz exists
    const quiz = await prisma.newsQuiz.findUnique({
      where: { id },
    });

    if (!quiz) {
      throw ApiError.notFound(`Quiz not found: ${id}`);
    }

    // Delete the quiz (cascades to attempts)
    await prisma.newsQuiz.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: `Deleted quiz ${id}`,
    });
  } catch (error) {
    next(error);
  }
}
