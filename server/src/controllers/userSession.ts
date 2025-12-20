/**
 * User Session Controller
 *
 * API endpoints for user session management and data migration.
 * Handles anonymous user sessions with device-based identification.
 *
 * Sprint 38 - User Data Migration
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/error';
import * as userSessionService from '../services/userSession';

// =============================================================================
// Validation Schemas
// =============================================================================

/**
 * Schema for creating/getting a session
 */
const GetOrCreateSessionSchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
});

/**
 * Schema for flashcard data in migration
 */
const FlashcardMigrationSchema = z.object({
  sourceType: z.string(),
  sourceId: z.string(),
  packIds: z.array(z.string()).optional(),
  easeFactor: z.number().optional(),
  interval: z.number().optional(),
  repetitions: z.number().optional(),
  nextReviewDate: z.string().nullable().optional(),
  lastReviewedAt: z.string().nullable().optional(),
});

/**
 * Schema for pack data in migration
 */
const PackMigrationSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  isDefault: z.boolean().optional(),
});

/**
 * Schema for stats data in migration
 */
const StatsMigrationSchema = z.object({
  totalCards: z.number().optional(),
  cardsDueToday: z.number().optional(),
  cardsReviewedToday: z.number().optional(),
  currentStreak: z.number().optional(),
  longestStreak: z.number().optional(),
  masteredCards: z.number().optional(),
  lastStudyDate: z.string().nullable().optional(),
});

/**
 * Schema for streak history in migration
 */
const StreakHistoryMigrationSchema = z.object({
  currentStreak: z.number().optional(),
  longestStreak: z.number().optional(),
  lastStudyDate: z.string().nullable().optional(),
  achievements: z.array(z.string()).optional(),
});

/**
 * Schema for profile data in migration
 */
const ProfileMigrationSchema = z.object({
  audienceType: z.string().optional(),
  expertiseLevel: z.string().optional(),
  interests: z.array(z.string()).optional(),
  completedOnboarding: z.boolean().optional(),
});

/**
 * Schema for localStorage migration request
 */
const MigrateLocalStorageSchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
  data: z.object({
    flashcards: z.array(FlashcardMigrationSchema).optional(),
    packs: z.array(PackMigrationSchema).optional(),
    stats: StatsMigrationSchema.optional(),
    streakHistory: StreakHistoryMigrationSchema.optional(),
    profile: ProfileMigrationSchema.optional(),
  }),
});

/**
 * Schema for profile update
 */
const UpdateProfileSchema = z.object({
  audienceType: z.enum(['everyday', 'professional', 'leader', 'developer']).optional(),
  expertiseLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  interests: z.array(z.string()).optional(),
  completedOnboarding: z.boolean().optional(),
});

// =============================================================================
// Controllers
// =============================================================================

/**
 * POST /api/user/session
 * Get or create a user session by device ID.
 * Returns session with stats, profile, and streak data.
 */
export async function getOrCreateSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedData = GetOrCreateSessionSchema.parse(req.body);

    const session = await userSessionService.getOrCreateSession(validatedData.deviceId);

    res.json(session);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0]?.message ?? 'Invalid request data'));
      return;
    }
    next(error);
  }
}

/**
 * POST /api/user/migrate
 * Migrate localStorage data to database.
 * Called once when user first connects with existing localStorage data.
 */
export async function migrateLocalStorageData(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedData = MigrateLocalStorageSchema.parse(req.body);

    const { sessionId, results } = await userSessionService.migrateLocalStorageData(
      validatedData.deviceId,
      validatedData.data
    );

    res.json({
      message: 'Migration complete',
      sessionId,
      results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0]?.message ?? 'Invalid migration data'));
      return;
    }
    next(error);
  }
}

/**
 * GET /api/user/:sessionId/profile
 * Get user profile by session ID.
 */
export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId } = req.params;

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const profile = await userSessionService.getProfile(sessionId);

    if (!profile) {
      res.json({
        audienceType: null,
        expertiseLevel: null,
        interests: [],
        completedOnboarding: false,
      });
      return;
    }

    res.json({
      audienceType: profile.audienceType,
      expertiseLevel: profile.expertiseLevel,
      interests: profile.interests,
      completedOnboarding: profile.completedOnboarding,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/user/:sessionId/profile
 * Update user profile.
 */
export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId } = req.params;
    const validatedData = UpdateProfileSchema.parse(req.body);

    // Validate session exists
    const exists = await userSessionService.sessionExists(sessionId);
    if (!exists) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    const profile = await userSessionService.updateProfile(sessionId, validatedData);

    res.json({
      audienceType: profile.audienceType,
      expertiseLevel: profile.expertiseLevel,
      interests: JSON.parse(profile.interests) as string[],
      completedOnboarding: profile.completedOnboarding,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0]?.message ?? 'Invalid profile data'));
      return;
    }
    next(error);
  }
}

/**
 * GET /api/user/:sessionId
 * Get full session data including stats, profile, and streak history.
 */
export async function getSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId } = req.params;

    const session = await userSessionService.getSessionById(sessionId);

    if (!session) {
      throw ApiError.notFound(`Session ${sessionId} not found`);
    }

    res.json({
      sessionId: session.id,
      deviceId: session.deviceId,
      createdAt: session.createdAt.toISOString(),
      lastActiveAt: session.lastActiveAt.toISOString(),
      stats: session.stats
        ? {
            totalCards: session.stats.totalCards,
            cardsDueToday: session.stats.cardsDueToday,
            cardsReviewedToday: session.stats.cardsReviewedToday,
            currentStreak: session.stats.currentStreak,
            longestStreak: session.stats.longestStreak,
            masteredCards: session.stats.masteredCards,
            lastStudyDate: session.stats.lastStudyDate?.toISOString() ?? null,
          }
        : null,
      profile: session.profile
        ? {
            audienceType: session.profile.audienceType,
            expertiseLevel: session.profile.expertiseLevel,
            interests: JSON.parse(session.profile.interests) as string[],
            completedOnboarding: session.profile.completedOnboarding,
          }
        : null,
      streakHistory: session.streakHistory
        ? {
            currentStreak: session.streakHistory.currentStreak,
            longestStreak: session.streakHistory.longestStreak,
            lastStudyDate: session.streakHistory.lastStudyDate?.toISOString() ?? null,
            achievements: JSON.parse(session.streakHistory.achievements) as string[],
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
}
