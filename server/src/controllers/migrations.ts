/**
 * Database Migrations Controller
 *
 * Admin-only endpoints for running database migrations in production.
 * Since RDS is in a VPC, migrations must run from within Lambda.
 *
 * Sprint 36 - Flashcard Database Migration
 * Sprint 37 - Learning Paths, Checkpoints, Current Events Migration
 */

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { ApiError } from '../middleware/error';

/**
 * Migration: Add Flashcard System Tables
 * Creates Flashcard, PrebuiltDeck, and PrebuiltDeckCard tables
 */
const MIGRATION_0002_FLASHCARD_SYSTEM = `
-- Check if Flashcard table exists, skip if already created
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Flashcard') THEN
        -- Flashcard table for individual study cards
        CREATE TABLE "Flashcard" (
            "id" TEXT NOT NULL,
            "term" TEXT NOT NULL,
            "definition" TEXT NOT NULL,
            "category" TEXT NOT NULL,
            "relatedMilestoneIds" TEXT NOT NULL DEFAULT '[]',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "Flashcard_pkey" PRIMARY KEY ("id")
        );

        -- Indexes for Flashcard
        CREATE INDEX "Flashcard_category_idx" ON "Flashcard"("category");
        CREATE INDEX "Flashcard_term_idx" ON "Flashcard"("term");

        RAISE NOTICE 'Created Flashcard table';
    ELSE
        RAISE NOTICE 'Flashcard table already exists, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'PrebuiltDeck') THEN
        -- PrebuiltDeck table for curated card collections
        CREATE TABLE "PrebuiltDeck" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "description" TEXT NOT NULL,
            "difficulty" TEXT NOT NULL,
            "cardCount" INTEGER NOT NULL,
            "estimatedMinutes" INTEGER NOT NULL,
            "previewCardIds" TEXT NOT NULL DEFAULT '[]',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "PrebuiltDeck_pkey" PRIMARY KEY ("id")
        );

        -- Unique constraint on deck name
        CREATE UNIQUE INDEX "PrebuiltDeck_name_key" ON "PrebuiltDeck"("name");

        -- Indexes for PrebuiltDeck
        CREATE INDEX "PrebuiltDeck_difficulty_idx" ON "PrebuiltDeck"("difficulty");

        RAISE NOTICE 'Created PrebuiltDeck table';
    ELSE
        RAISE NOTICE 'PrebuiltDeck table already exists, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'PrebuiltDeckCard') THEN
        -- PrebuiltDeckCard table for card-deck relationships
        CREATE TABLE "PrebuiltDeckCard" (
            "id" TEXT NOT NULL,
            "deckId" TEXT NOT NULL,
            "cardId" TEXT NOT NULL,
            "sourceType" TEXT NOT NULL,
            "sourceId" TEXT NOT NULL,
            "customTerm" TEXT,
            "customDefinition" TEXT,
            "sortOrder" INTEGER NOT NULL DEFAULT 0,
            CONSTRAINT "PrebuiltDeckCard_pkey" PRIMARY KEY ("id")
        );

        -- Unique constraint on deck-card combination
        CREATE UNIQUE INDEX "PrebuiltDeckCard_deckId_cardId_key" ON "PrebuiltDeckCard"("deckId", "cardId");

        -- Indexes for PrebuiltDeckCard
        CREATE INDEX "PrebuiltDeckCard_deckId_idx" ON "PrebuiltDeckCard"("deckId");
        CREATE INDEX "PrebuiltDeckCard_sourceType_idx" ON "PrebuiltDeckCard"("sourceType");

        -- Foreign key constraint
        ALTER TABLE "PrebuiltDeckCard" ADD CONSTRAINT "PrebuiltDeckCard_deckId_fkey"
            FOREIGN KEY ("deckId") REFERENCES "PrebuiltDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

        RAISE NOTICE 'Created PrebuiltDeckCard table';
    ELSE
        RAISE NOTICE 'PrebuiltDeckCard table already exists, skipping';
    END IF;
END $$;
`;

/**
 * Migration: Add Learning Paths, Checkpoints, Current Events Tables
 * Sprint 37 - Learning path system for structured AI education
 */
const MIGRATION_0003_LEARNING_PATHS = `
-- LearningPath table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'LearningPath') THEN
        CREATE TABLE "LearningPath" (
            "id" TEXT NOT NULL,
            "slug" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "description" TEXT NOT NULL,
            "targetAudience" TEXT NOT NULL,
            "milestoneIds" TEXT NOT NULL DEFAULT '[]',
            "estimatedMinutes" INTEGER NOT NULL,
            "difficulty" TEXT NOT NULL,
            "suggestedNextPathIds" TEXT NOT NULL DEFAULT '[]',
            "keyTakeaways" TEXT NOT NULL DEFAULT '[]',
            "conceptsCovered" TEXT NOT NULL DEFAULT '[]',
            "icon" TEXT,
            "sortOrder" INTEGER NOT NULL DEFAULT 0,
            "isPublished" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
        );
        CREATE UNIQUE INDEX "LearningPath_slug_key" ON "LearningPath"("slug");
        CREATE INDEX "LearningPath_slug_idx" ON "LearningPath"("slug");
        CREATE INDEX "LearningPath_difficulty_idx" ON "LearningPath"("difficulty");
        CREATE INDEX "LearningPath_isPublished_idx" ON "LearningPath"("isPublished");
        RAISE NOTICE 'Created LearningPath table';
    ELSE
        RAISE NOTICE 'LearningPath table already exists, skipping';
    END IF;
END $$;

-- Checkpoint table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Checkpoint') THEN
        CREATE TABLE "Checkpoint" (
            "id" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "pathId" TEXT NOT NULL,
            "afterMilestoneId" TEXT NOT NULL,
            "questions" TEXT NOT NULL,
            "sortOrder" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "Checkpoint_pkey" PRIMARY KEY ("id")
        );
        CREATE INDEX "Checkpoint_pathId_idx" ON "Checkpoint"("pathId");
        CREATE INDEX "Checkpoint_afterMilestoneId_idx" ON "Checkpoint"("afterMilestoneId");
        ALTER TABLE "Checkpoint" ADD CONSTRAINT "Checkpoint_pathId_fkey"
            FOREIGN KEY ("pathId") REFERENCES "LearningPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created Checkpoint table';
    ELSE
        RAISE NOTICE 'Checkpoint table already exists, skipping';
    END IF;
END $$;

-- CurrentEvent table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'CurrentEvent') THEN
        CREATE TABLE "CurrentEvent" (
            "id" TEXT NOT NULL,
            "headline" TEXT NOT NULL,
            "summary" TEXT NOT NULL,
            "sourceUrl" TEXT,
            "sourcePublisher" TEXT,
            "publishedDate" TIMESTAMP(3) NOT NULL,
            "prerequisiteMilestoneIds" TEXT NOT NULL DEFAULT '[]',
            "connectionExplanation" TEXT NOT NULL,
            "featured" BOOLEAN NOT NULL DEFAULT false,
            "expiresAt" TIMESTAMP(3),
            "isPublished" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "CurrentEvent_pkey" PRIMARY KEY ("id")
        );
        CREATE INDEX "CurrentEvent_featured_idx" ON "CurrentEvent"("featured");
        CREATE INDEX "CurrentEvent_publishedDate_idx" ON "CurrentEvent"("publishedDate");
        CREATE INDEX "CurrentEvent_isPublished_idx" ON "CurrentEvent"("isPublished");
        CREATE INDEX "CurrentEvent_expiresAt_idx" ON "CurrentEvent"("expiresAt");
        RAISE NOTICE 'Created CurrentEvent table';
    ELSE
        RAISE NOTICE 'CurrentEvent table already exists, skipping';
    END IF;
END $$;
`;

/**
 * Migration: Add User Data Tables
 * Sprint 38 - User Data Migration (localStorage to Database)
 * Creates UserSession, UserFlashcard, UserFlashcardPack, UserStudyStats,
 * UserStudySession, UserDailyRecord, UserStreakHistory, UserProfile,
 * UserPathProgress, UserCheckpointProgress tables
 */
const MIGRATION_0004_USER_DATA = `
-- UserSession table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'UserSession') THEN
        CREATE TABLE "UserSession" (
            "id" TEXT NOT NULL,
            "deviceId" TEXT NOT NULL,
            "userId" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
        );
        CREATE UNIQUE INDEX "UserSession_deviceId_key" ON "UserSession"("deviceId");
        CREATE INDEX "UserSession_deviceId_idx" ON "UserSession"("deviceId");
        CREATE INDEX "UserSession_lastActiveAt_idx" ON "UserSession"("lastActiveAt");
        RAISE NOTICE 'Created UserSession table';
    ELSE
        RAISE NOTICE 'UserSession table already exists, skipping';
    END IF;
END $$;

-- UserFlashcard table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'UserFlashcard') THEN
        CREATE TABLE "UserFlashcard" (
            "id" TEXT NOT NULL,
            "sessionId" TEXT NOT NULL,
            "sourceType" TEXT NOT NULL,
            "sourceId" TEXT NOT NULL,
            "packIds" TEXT NOT NULL DEFAULT '[]',
            "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
            "interval" INTEGER NOT NULL DEFAULT 0,
            "repetitions" INTEGER NOT NULL DEFAULT 0,
            "nextReviewDate" TIMESTAMP(3),
            "lastReviewedAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "UserFlashcard_pkey" PRIMARY KEY ("id")
        );
        CREATE UNIQUE INDEX "UserFlashcard_sessionId_sourceType_sourceId_key" ON "UserFlashcard"("sessionId", "sourceType", "sourceId");
        CREATE INDEX "UserFlashcard_sessionId_idx" ON "UserFlashcard"("sessionId");
        CREATE INDEX "UserFlashcard_nextReviewDate_idx" ON "UserFlashcard"("nextReviewDate");
        ALTER TABLE "UserFlashcard" ADD CONSTRAINT "UserFlashcard_sessionId_fkey"
            FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created UserFlashcard table';
    ELSE
        RAISE NOTICE 'UserFlashcard table already exists, skipping';
    END IF;
END $$;

-- UserFlashcardPack table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'UserFlashcardPack') THEN
        CREATE TABLE "UserFlashcardPack" (
            "id" TEXT NOT NULL,
            "sessionId" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "description" TEXT,
            "color" TEXT NOT NULL DEFAULT '#3B82F6',
            "isDefault" BOOLEAN NOT NULL DEFAULT false,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "UserFlashcardPack_pkey" PRIMARY KEY ("id")
        );
        CREATE INDEX "UserFlashcardPack_sessionId_idx" ON "UserFlashcardPack"("sessionId");
        ALTER TABLE "UserFlashcardPack" ADD CONSTRAINT "UserFlashcardPack_sessionId_fkey"
            FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created UserFlashcardPack table';
    ELSE
        RAISE NOTICE 'UserFlashcardPack table already exists, skipping';
    END IF;
END $$;

-- UserStudyStats table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'UserStudyStats') THEN
        CREATE TABLE "UserStudyStats" (
            "id" TEXT NOT NULL,
            "sessionId" TEXT NOT NULL,
            "totalCards" INTEGER NOT NULL DEFAULT 0,
            "cardsDueToday" INTEGER NOT NULL DEFAULT 0,
            "cardsReviewedToday" INTEGER NOT NULL DEFAULT 0,
            "currentStreak" INTEGER NOT NULL DEFAULT 0,
            "longestStreak" INTEGER NOT NULL DEFAULT 0,
            "masteredCards" INTEGER NOT NULL DEFAULT 0,
            "lastStudyDate" TIMESTAMP(3),
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "UserStudyStats_pkey" PRIMARY KEY ("id")
        );
        CREATE UNIQUE INDEX "UserStudyStats_sessionId_key" ON "UserStudyStats"("sessionId");
        ALTER TABLE "UserStudyStats" ADD CONSTRAINT "UserStudyStats_sessionId_fkey"
            FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created UserStudyStats table';
    ELSE
        RAISE NOTICE 'UserStudyStats table already exists, skipping';
    END IF;
END $$;

-- UserStudySession table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'UserStudySession') THEN
        CREATE TABLE "UserStudySession" (
            "id" TEXT NOT NULL,
            "sessionId" TEXT NOT NULL,
            "packId" TEXT,
            "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "completedAt" TIMESTAMP(3),
            "cardsReviewed" INTEGER NOT NULL DEFAULT 0,
            "cardsCorrect" INTEGER NOT NULL DEFAULT 0,
            "cardsToReview" INTEGER NOT NULL DEFAULT 0,
            CONSTRAINT "UserStudySession_pkey" PRIMARY KEY ("id")
        );
        CREATE INDEX "UserStudySession_sessionId_idx" ON "UserStudySession"("sessionId");
        CREATE INDEX "UserStudySession_startedAt_idx" ON "UserStudySession"("startedAt");
        ALTER TABLE "UserStudySession" ADD CONSTRAINT "UserStudySession_sessionId_fkey"
            FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created UserStudySession table';
    ELSE
        RAISE NOTICE 'UserStudySession table already exists, skipping';
    END IF;
END $$;

-- UserDailyRecord table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'UserDailyRecord') THEN
        CREATE TABLE "UserDailyRecord" (
            "id" TEXT NOT NULL,
            "sessionId" TEXT NOT NULL,
            "date" TIMESTAMP(3) NOT NULL,
            "totalReviews" INTEGER NOT NULL DEFAULT 0,
            "againCount" INTEGER NOT NULL DEFAULT 0,
            "hardCount" INTEGER NOT NULL DEFAULT 0,
            "goodCount" INTEGER NOT NULL DEFAULT 0,
            "easyCount" INTEGER NOT NULL DEFAULT 0,
            "minutesStudied" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "uniqueCardsReviewed" TEXT NOT NULL DEFAULT '[]',
            CONSTRAINT "UserDailyRecord_pkey" PRIMARY KEY ("id")
        );
        CREATE UNIQUE INDEX "UserDailyRecord_sessionId_date_key" ON "UserDailyRecord"("sessionId", "date");
        CREATE INDEX "UserDailyRecord_sessionId_idx" ON "UserDailyRecord"("sessionId");
        CREATE INDEX "UserDailyRecord_date_idx" ON "UserDailyRecord"("date");
        ALTER TABLE "UserDailyRecord" ADD CONSTRAINT "UserDailyRecord_sessionId_fkey"
            FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created UserDailyRecord table';
    ELSE
        RAISE NOTICE 'UserDailyRecord table already exists, skipping';
    END IF;
END $$;

-- UserStreakHistory table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'UserStreakHistory') THEN
        CREATE TABLE "UserStreakHistory" (
            "id" TEXT NOT NULL,
            "sessionId" TEXT NOT NULL,
            "currentStreak" INTEGER NOT NULL DEFAULT 0,
            "longestStreak" INTEGER NOT NULL DEFAULT 0,
            "lastStudyDate" TIMESTAMP(3),
            "achievements" TEXT NOT NULL DEFAULT '[]',
            "initializedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "UserStreakHistory_pkey" PRIMARY KEY ("id")
        );
        CREATE UNIQUE INDEX "UserStreakHistory_sessionId_key" ON "UserStreakHistory"("sessionId");
        ALTER TABLE "UserStreakHistory" ADD CONSTRAINT "UserStreakHistory_sessionId_fkey"
            FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created UserStreakHistory table';
    ELSE
        RAISE NOTICE 'UserStreakHistory table already exists, skipping';
    END IF;
END $$;

-- UserProfile table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'UserProfile') THEN
        CREATE TABLE "UserProfile" (
            "id" TEXT NOT NULL,
            "sessionId" TEXT NOT NULL,
            "audienceType" TEXT,
            "expertiseLevel" TEXT,
            "interests" TEXT NOT NULL DEFAULT '[]',
            "completedOnboarding" BOOLEAN NOT NULL DEFAULT false,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
        );
        CREATE UNIQUE INDEX "UserProfile_sessionId_key" ON "UserProfile"("sessionId");
        ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_sessionId_fkey"
            FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created UserProfile table';
    ELSE
        RAISE NOTICE 'UserProfile table already exists, skipping';
    END IF;
END $$;

-- UserPathProgress table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'UserPathProgress') THEN
        CREATE TABLE "UserPathProgress" (
            "id" TEXT NOT NULL,
            "sessionId" TEXT NOT NULL,
            "pathSlug" TEXT NOT NULL,
            "completedMilestoneIds" TEXT NOT NULL DEFAULT '[]',
            "currentMilestoneId" TEXT,
            "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "completedAt" TIMESTAMP(3),
            CONSTRAINT "UserPathProgress_pkey" PRIMARY KEY ("id")
        );
        CREATE UNIQUE INDEX "UserPathProgress_sessionId_pathSlug_key" ON "UserPathProgress"("sessionId", "pathSlug");
        CREATE INDEX "UserPathProgress_sessionId_idx" ON "UserPathProgress"("sessionId");
        ALTER TABLE "UserPathProgress" ADD CONSTRAINT "UserPathProgress_sessionId_fkey"
            FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created UserPathProgress table';
    ELSE
        RAISE NOTICE 'UserPathProgress table already exists, skipping';
    END IF;
END $$;

-- UserCheckpointProgress table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'UserCheckpointProgress') THEN
        CREATE TABLE "UserCheckpointProgress" (
            "id" TEXT NOT NULL,
            "sessionId" TEXT NOT NULL,
            "checkpointId" TEXT NOT NULL,
            "completed" BOOLEAN NOT NULL DEFAULT false,
            "score" INTEGER,
            "attempts" INTEGER NOT NULL DEFAULT 0,
            "lastAttemptAt" TIMESTAMP(3),
            "answers" TEXT NOT NULL DEFAULT '[]',
            CONSTRAINT "UserCheckpointProgress_pkey" PRIMARY KEY ("id")
        );
        CREATE UNIQUE INDEX "UserCheckpointProgress_sessionId_checkpointId_key" ON "UserCheckpointProgress"("sessionId", "checkpointId");
        CREATE INDEX "UserCheckpointProgress_sessionId_idx" ON "UserCheckpointProgress"("sessionId");
        ALTER TABLE "UserCheckpointProgress" ADD CONSTRAINT "UserCheckpointProgress_sessionId_fkey"
            FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created UserCheckpointProgress table';
    ELSE
        RAISE NOTICE 'UserCheckpointProgress table already exists, skipping';
    END IF;
END $$;
`;

/**
 * POST /api/admin/migrations/run
 * Run pending database migrations (admin only)
 */
export async function runMigrations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!prisma) {
      throw ApiError.internal('Database not available');
    }

    const { migration } = req.body;

    const availableMigrations = ['0002_flashcard_system', '0003_learning_paths', '0004_user_data'];

    if (!availableMigrations.includes(migration)) {
      throw ApiError.badRequest(
        `Invalid migration. Available: ${availableMigrations.join(', ')}`
      );
    }

    console.log(`[Migrations] Running migration: ${migration}`);

    // Run the appropriate migration SQL
    if (migration === '0002_flashcard_system') {
      await prisma.$executeRawUnsafe(MIGRATION_0002_FLASHCARD_SYSTEM);
      console.log('[Migrations] Migration 0002_flashcard_system completed successfully');
      res.json({
        success: true,
        message: 'Migration 0002_flashcard_system completed successfully',
        tables: ['Flashcard', 'PrebuiltDeck', 'PrebuiltDeckCard'],
      });
    } else if (migration === '0003_learning_paths') {
      await prisma.$executeRawUnsafe(MIGRATION_0003_LEARNING_PATHS);
      console.log('[Migrations] Migration 0003_learning_paths completed successfully');
      res.json({
        success: true,
        message: 'Migration 0003_learning_paths completed successfully',
        tables: ['LearningPath', 'Checkpoint', 'CurrentEvent'],
      });
    } else if (migration === '0004_user_data') {
      await prisma.$executeRawUnsafe(MIGRATION_0004_USER_DATA);
      console.log('[Migrations] Migration 0004_user_data completed successfully');
      res.json({
        success: true,
        message: 'Migration 0004_user_data completed successfully',
        tables: [
          'UserSession',
          'UserFlashcard',
          'UserFlashcardPack',
          'UserStudyStats',
          'UserStudySession',
          'UserDailyRecord',
          'UserStreakHistory',
          'UserProfile',
          'UserPathProgress',
          'UserCheckpointProgress',
        ],
      });
    }
  } catch (error) {
    console.error('[Migrations] Migration failed:', error);
    next(error);
  }
}

/**
 * GET /api/admin/migrations/status
 * Check migration status by verifying tables exist
 */
export async function getMigrationStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!prisma) {
      throw ApiError.internal('Database not available');
    }

    // Check which tables exist
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN (
        'Flashcard', 'PrebuiltDeck', 'PrebuiltDeckCard', 'Milestone', 'GlossaryTerm',
        'LearningPath', 'Checkpoint', 'CurrentEvent',
        'UserSession', 'UserFlashcard', 'UserFlashcardPack', 'UserStudyStats',
        'UserStudySession', 'UserDailyRecord', 'UserStreakHistory', 'UserProfile',
        'UserPathProgress', 'UserCheckpointProgress'
      )
      ORDER BY tablename
    `;

    const existingTables = tables.map((t) => t.tablename);

    // Get counts for each table
    const counts: Record<string, number> = {};
    for (const table of existingTables) {
      try {
        const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*) as count FROM "${table}"`
        );
        counts[table] = Number(result[0].count);
      } catch {
        counts[table] = -1; // Error reading table
      }
    }

    res.json({
      existingTables,
      counts,
      migrations: {
        '0001_init_postgresql': existingTables.includes('Milestone'),
        '0002_flashcard_system': existingTables.includes('Flashcard'),
        '0003_learning_paths': existingTables.includes('LearningPath'),
        '0004_user_data': existingTables.includes('UserSession'),
      },
    });
  } catch (error) {
    next(error);
  }
}
