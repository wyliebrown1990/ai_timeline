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
import { findMatch, suggestAliases } from '../services/keyFigureMatcher';
import { normalizeName } from '../lib/nameNormalizer';

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
/**
 * Migration: Make IngestedArticle.sourceId optional
 * Sprint 40 - Manual Article Submission (allows articles without a NewsSource)
 */
const MIGRATION_0005_OPTIONAL_SOURCE = `
-- Make sourceId optional in IngestedArticle table
DO $$
BEGIN
    -- Check if column is already nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'IngestedArticle'
        AND column_name = 'sourceId'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "IngestedArticle" ALTER COLUMN "sourceId" DROP NOT NULL;
        RAISE NOTICE 'Made sourceId nullable in IngestedArticle table';
    ELSE
        RAISE NOTICE 'sourceId is already nullable in IngestedArticle table, skipping';
    END IF;
END $$;
`;

/**
 * Migration: Add Key Figures System Tables
 * Sprint 44 - Key Figures Data Foundation
 * Creates KeyFigure, MilestoneContributor, KeyFigureDraft tables
 */
const MIGRATION_0006_KEY_FIGURES = `
-- KeyFigure table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'KeyFigure') THEN
        CREATE TABLE "KeyFigure" (
            "id" TEXT NOT NULL,
            "canonicalName" TEXT NOT NULL,
            "aliases" TEXT NOT NULL DEFAULT '[]',
            "shortBio" TEXT NOT NULL,
            "fullBio" TEXT,
            "primaryOrg" TEXT,
            "previousOrgs" TEXT NOT NULL DEFAULT '[]',
            "role" TEXT NOT NULL,
            "notableFor" TEXT NOT NULL,
            "imageUrl" TEXT,
            "wikipediaUrl" TEXT,
            "linkedInUrl" TEXT,
            "twitterHandle" TEXT,
            "status" TEXT NOT NULL DEFAULT 'published',
            "sourceArticleId" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "KeyFigure_pkey" PRIMARY KEY ("id")
        );
        CREATE UNIQUE INDEX "KeyFigure_canonicalName_key" ON "KeyFigure"("canonicalName");
        CREATE INDEX "KeyFigure_canonicalName_idx" ON "KeyFigure"("canonicalName");
        CREATE INDEX "KeyFigure_role_idx" ON "KeyFigure"("role");
        CREATE INDEX "KeyFigure_status_idx" ON "KeyFigure"("status");
        RAISE NOTICE 'Created KeyFigure table';
    ELSE
        RAISE NOTICE 'KeyFigure table already exists, skipping';
    END IF;
END $$;

-- MilestoneContributor junction table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'MilestoneContributor') THEN
        CREATE TABLE "MilestoneContributor" (
            "id" TEXT NOT NULL,
            "milestoneId" TEXT NOT NULL,
            "keyFigureId" TEXT NOT NULL,
            "contributionType" TEXT,
            CONSTRAINT "MilestoneContributor_pkey" PRIMARY KEY ("id")
        );
        CREATE UNIQUE INDEX "MilestoneContributor_milestoneId_keyFigureId_key" ON "MilestoneContributor"("milestoneId", "keyFigureId");
        CREATE INDEX "MilestoneContributor_milestoneId_idx" ON "MilestoneContributor"("milestoneId");
        CREATE INDEX "MilestoneContributor_keyFigureId_idx" ON "MilestoneContributor"("keyFigureId");
        ALTER TABLE "MilestoneContributor" ADD CONSTRAINT "MilestoneContributor_milestoneId_fkey"
            FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "MilestoneContributor" ADD CONSTRAINT "MilestoneContributor_keyFigureId_fkey"
            FOREIGN KEY ("keyFigureId") REFERENCES "KeyFigure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created MilestoneContributor table';
    ELSE
        RAISE NOTICE 'MilestoneContributor table already exists, skipping';
    END IF;
END $$;

-- KeyFigureDraft table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'KeyFigureDraft') THEN
        CREATE TABLE "KeyFigureDraft" (
            "id" TEXT NOT NULL,
            "articleId" TEXT NOT NULL,
            "extractedName" TEXT NOT NULL,
            "normalizedName" TEXT NOT NULL,
            "context" TEXT NOT NULL,
            "suggestedBio" TEXT,
            "suggestedOrg" TEXT,
            "suggestedRole" TEXT,
            "matchedFigureId" TEXT,
            "matchConfidence" DOUBLE PRECISION,
            "status" TEXT NOT NULL DEFAULT 'pending',
            "reviewNotes" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "KeyFigureDraft_pkey" PRIMARY KEY ("id")
        );
        CREATE INDEX "KeyFigureDraft_status_idx" ON "KeyFigureDraft"("status");
        CREATE INDEX "KeyFigureDraft_articleId_idx" ON "KeyFigureDraft"("articleId");
        CREATE INDEX "KeyFigureDraft_matchedFigureId_idx" ON "KeyFigureDraft"("matchedFigureId");
        ALTER TABLE "KeyFigureDraft" ADD CONSTRAINT "KeyFigureDraft_articleId_fkey"
            FOREIGN KEY ("articleId") REFERENCES "IngestedArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "KeyFigureDraft" ADD CONSTRAINT "KeyFigureDraft_matchedFigureId_fkey"
            FOREIGN KEY ("matchedFigureId") REFERENCES "KeyFigure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE 'Created KeyFigureDraft table';
    ELSE
        RAISE NOTICE 'KeyFigureDraft table already exists, skipping';
    END IF;
END $$;
`;

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

    const availableMigrations = ['0002_flashcard_system', '0003_learning_paths', '0004_user_data', '0005_optional_source', '0006_key_figures'];

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
    } else if (migration === '0005_optional_source') {
      await prisma.$executeRawUnsafe(MIGRATION_0005_OPTIONAL_SOURCE);
      console.log('[Migrations] Migration 0005_optional_source completed successfully');
      res.json({
        success: true,
        message: 'Migration 0005_optional_source completed successfully - sourceId is now optional in IngestedArticle',
        changes: ['IngestedArticle.sourceId is now nullable'],
      });
    } else if (migration === '0006_key_figures') {
      await prisma.$executeRawUnsafe(MIGRATION_0006_KEY_FIGURES);
      console.log('[Migrations] Migration 0006_key_figures completed successfully');
      res.json({
        success: true,
        message: 'Migration 0006_key_figures completed successfully',
        tables: ['KeyFigure', 'MilestoneContributor', 'KeyFigureDraft'],
      });
    }
  } catch (error) {
    console.error('[Migrations] Migration failed:', error);
    next(error);
  }
}

/**
 * POST /api/admin/migrations/seed-key-figures
 * Seed foundational AI key figures into the database
 * Sprint 44 - Key Figures Data Foundation
 */
export async function seedKeyFigures(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!prisma) {
      throw ApiError.internal('Database not available');
    }

    console.log('[Migrations] Starting key figures seed...');

    const KEY_FIGURES = [
      // Pioneers
      { id: 'alan-turing', canonicalName: 'Alan Turing', aliases: ['A. Turing', 'A.M. Turing'], shortBio: 'British mathematician and computer scientist, considered the father of theoretical computer science and artificial intelligence.', primaryOrg: 'University of Manchester', previousOrgs: ['Bletchley Park', 'National Physical Laboratory'], role: 'researcher', notableFor: 'Turing machine, Turing test, breaking the Enigma code', wikipediaUrl: 'https://en.wikipedia.org/wiki/Alan_Turing' },
      { id: 'claude-shannon', canonicalName: 'Claude Shannon', aliases: ['Claude E. Shannon', 'C. Shannon'], shortBio: 'American mathematician known as the "father of information theory" and a pioneer in digital circuit design.', primaryOrg: 'Bell Labs', previousOrgs: ['MIT'], role: 'researcher', notableFor: 'Information theory, Boolean logic for circuits, chess-playing computer', wikipediaUrl: 'https://en.wikipedia.org/wiki/Claude_Shannon' },
      { id: 'john-mccarthy', canonicalName: 'John McCarthy', aliases: ['J. McCarthy'], shortBio: 'American computer scientist who coined the term "artificial intelligence" and invented Lisp.', primaryOrg: 'Stanford University', previousOrgs: ['MIT', 'Dartmouth College'], role: 'researcher', notableFor: 'Coining "artificial intelligence", Lisp programming language, time-sharing systems', wikipediaUrl: 'https://en.wikipedia.org/wiki/John_McCarthy_(computer_scientist)' },
      { id: 'marvin-minsky', canonicalName: 'Marvin Minsky', aliases: ['Marvin Lee Minsky', 'M. Minsky'], shortBio: 'American cognitive scientist and co-founder of the MIT AI Lab, a pioneer in artificial intelligence.', primaryOrg: 'MIT', previousOrgs: ['Harvard University'], role: 'researcher', notableFor: 'Co-founding MIT AI Lab, neural networks research, "Society of Mind" theory', wikipediaUrl: 'https://en.wikipedia.org/wiki/Marvin_Minsky' },
      // Deep Learning Pioneers
      { id: 'geoffrey-hinton', canonicalName: 'Geoffrey Hinton', aliases: ['Geoff Hinton', 'G. Hinton', 'Geoffrey E. Hinton'], shortBio: 'British-Canadian cognitive psychologist and computer scientist, known as a "Godfather of AI" for deep learning work.', primaryOrg: 'University of Toronto', previousOrgs: ['Google Brain', 'Carnegie Mellon University'], role: 'researcher', notableFor: 'Backpropagation, Boltzmann machines, deep learning, capsule networks', wikipediaUrl: 'https://en.wikipedia.org/wiki/Geoffrey_Hinton' },
      { id: 'yann-lecun', canonicalName: 'Yann LeCun', aliases: ['Y. LeCun'], shortBio: 'French-American computer scientist, VP and Chief AI Scientist at Meta, pioneer of convolutional neural networks.', primaryOrg: 'Meta AI', previousOrgs: ['Bell Labs', 'NYU'], role: 'researcher', notableFor: 'Convolutional neural networks (CNNs), LeNet, self-supervised learning', wikipediaUrl: 'https://en.wikipedia.org/wiki/Yann_LeCun' },
      { id: 'yoshua-bengio', canonicalName: 'Yoshua Bengio', aliases: ['Y. Bengio'], shortBio: 'Canadian computer scientist known for work on deep learning and neural networks, co-recipient of 2018 Turing Award.', primaryOrg: 'Mila - Quebec AI Institute', previousOrgs: ['Université de Montréal'], role: 'researcher', notableFor: 'Deep learning, attention mechanisms, generative adversarial networks research', wikipediaUrl: 'https://en.wikipedia.org/wiki/Yoshua_Bengio' },
      // Modern Researchers
      { id: 'fei-fei-li', canonicalName: 'Fei-Fei Li', aliases: ['Feifei Li', 'F. Li'], shortBio: 'Chinese-American computer scientist known for creating ImageNet, pioneering work in computer vision.', primaryOrg: 'Stanford University', previousOrgs: ['Google Cloud AI'], role: 'researcher', notableFor: 'ImageNet dataset, computer vision research, AI ethics advocacy', wikipediaUrl: 'https://en.wikipedia.org/wiki/Fei-Fei_Li' },
      { id: 'andrej-karpathy', canonicalName: 'Andrej Karpathy', aliases: ['A. Karpathy'], shortBio: 'Slovak-Canadian AI researcher, former Director of AI at Tesla, known for AI education and research.', primaryOrg: 'Independent', previousOrgs: ['Tesla', 'OpenAI', 'Stanford University'], role: 'researcher', notableFor: 'Tesla Autopilot, neural network tutorials, ImageNet research', wikipediaUrl: 'https://en.wikipedia.org/wiki/Andrej_Karpathy' },
      { id: 'ilya-sutskever', canonicalName: 'Ilya Sutskever', aliases: ['I. Sutskever'], shortBio: 'Israeli-Canadian computer scientist, co-founder of OpenAI, pioneer in deep learning and sequence-to-sequence models.', primaryOrg: 'Safe Superintelligence Inc.', previousOrgs: ['OpenAI', 'Google Brain'], role: 'researcher', notableFor: 'AlexNet, sequence-to-sequence learning, GPT models co-creation', wikipediaUrl: 'https://en.wikipedia.org/wiki/Ilya_Sutskever' },
      { id: 'andrew-ng', canonicalName: 'Andrew Ng', aliases: ['A. Ng', 'Andrew Y. Ng'], shortBio: 'British-American computer scientist, co-founder of Coursera, known for democratizing AI education.', primaryOrg: 'Stanford University', previousOrgs: ['Google Brain', 'Baidu'], role: 'researcher', notableFor: 'Google Brain, Coursera, DeepLearning.AI, AI education', wikipediaUrl: 'https://en.wikipedia.org/wiki/Andrew_Ng' },
      // OpenAI
      { id: 'sam-altman', canonicalName: 'Sam Altman', aliases: ['Samuel Altman', 'S. Altman'], shortBio: 'American entrepreneur, CEO of OpenAI, leading the development and deployment of GPT models.', primaryOrg: 'OpenAI', previousOrgs: ['Y Combinator', 'Loopt'], role: 'executive', notableFor: 'Leading OpenAI, ChatGPT launch, AGI development advocacy', wikipediaUrl: 'https://en.wikipedia.org/wiki/Sam_Altman' },
      { id: 'greg-brockman', canonicalName: 'Greg Brockman', aliases: ['Gregory Brockman', 'G. Brockman'], shortBio: 'American entrepreneur, President of OpenAI, co-founder who helped build the organization from the ground up.', primaryOrg: 'OpenAI', previousOrgs: ['Stripe'], role: 'founder', notableFor: 'Co-founding OpenAI, building OpenAI engineering team', wikipediaUrl: 'https://en.wikipedia.org/wiki/Greg_Brockman' },
      // Anthropic
      { id: 'dario-amodei', canonicalName: 'Dario Amodei', aliases: ['D. Amodei'], shortBio: 'American AI researcher, CEO and co-founder of Anthropic, focused on AI safety research.', primaryOrg: 'Anthropic', previousOrgs: ['OpenAI'], role: 'founder', notableFor: 'Founding Anthropic, Claude AI, constitutional AI, AI safety research', wikipediaUrl: 'https://en.wikipedia.org/wiki/Dario_Amodei' },
      { id: 'daniela-amodei', canonicalName: 'Daniela Amodei', aliases: ['D. Amodei'], shortBio: 'American businesswoman, President and co-founder of Anthropic, leading business operations.', primaryOrg: 'Anthropic', previousOrgs: ['OpenAI', 'Stripe'], role: 'founder', notableFor: 'Co-founding Anthropic, scaling AI safety company', wikipediaUrl: 'https://en.wikipedia.org/wiki/Daniela_Amodei' },
      // DeepMind
      { id: 'demis-hassabis', canonicalName: 'Demis Hassabis', aliases: ['D. Hassabis'], shortBio: 'British AI researcher and entrepreneur, CEO of Google DeepMind, creator of AlphaGo and AlphaFold.', primaryOrg: 'Google DeepMind', previousOrgs: ['Elixir Studios'], role: 'founder', notableFor: 'Founding DeepMind, AlphaGo, AlphaFold, Nobel Prize 2024', wikipediaUrl: 'https://en.wikipedia.org/wiki/Demis_Hassabis' },
      { id: 'shane-legg', canonicalName: 'Shane Legg', aliases: ['S. Legg'], shortBio: 'New Zealand AI researcher, co-founder of DeepMind, focused on artificial general intelligence.', primaryOrg: 'Google DeepMind', previousOrgs: ['IDSIA'], role: 'founder', notableFor: 'Co-founding DeepMind, AGI research', wikipediaUrl: 'https://en.wikipedia.org/wiki/Shane_Legg' },
      // Industry Leaders
      { id: 'jensen-huang', canonicalName: 'Jensen Huang', aliases: ['Jen-Hsun Huang'], shortBio: 'Taiwanese-American businessman, CEO of NVIDIA, driving GPU computing for AI.', primaryOrg: 'NVIDIA', previousOrgs: ['LSI Logic', 'AMD'], role: 'executive', notableFor: 'Building NVIDIA into AI computing leader, CUDA platform', wikipediaUrl: 'https://en.wikipedia.org/wiki/Jensen_Huang' },
      { id: 'satya-nadella', canonicalName: 'Satya Nadella', aliases: ['S. Nadella'], shortBio: 'Indian-American business executive, CEO of Microsoft, leading enterprise AI adoption.', primaryOrg: 'Microsoft', previousOrgs: ['Sun Microsystems'], role: 'executive', notableFor: 'Microsoft-OpenAI partnership, Azure AI, Copilot products', wikipediaUrl: 'https://en.wikipedia.org/wiki/Satya_Nadella' },
      { id: 'sundar-pichai', canonicalName: 'Sundar Pichai', aliases: ['Pichai Sundararajan', 'S. Pichai'], shortBio: 'Indian-American business executive, CEO of Google and Alphabet, overseeing Google AI.', primaryOrg: 'Alphabet/Google', previousOrgs: ['McKinsey', 'Applied Materials'], role: 'executive', notableFor: 'Leading Google AI initiatives, Gemini, Google DeepMind merger', wikipediaUrl: 'https://en.wikipedia.org/wiki/Sundar_Pichai' },
      { id: 'ashish-vaswani', canonicalName: 'Ashish Vaswani', aliases: ['A. Vaswani'], shortBio: 'Indian-American AI researcher, lead author of the Transformer paper that revolutionized NLP.', primaryOrg: 'Essential AI', previousOrgs: ['Google Brain'], role: 'researcher', notableFor: '"Attention Is All You Need" paper, Transformer architecture', wikipediaUrl: 'https://en.wikipedia.org/wiki/Ashish_Vaswani' },
      { id: 'mark-zuckerberg', canonicalName: 'Mark Zuckerberg', aliases: ['Mark E. Zuckerberg', 'Zuck'], shortBio: 'American technology entrepreneur, CEO of Meta, driving open-source AI with Llama models.', primaryOrg: 'Meta', previousOrgs: [], role: 'founder', notableFor: 'Meta AI, Llama open-source models, metaverse vision', wikipediaUrl: 'https://en.wikipedia.org/wiki/Mark_Zuckerberg' },
    ];

    let created = 0;
    let updated = 0;

    for (const figure of KEY_FIGURES) {
      const existing = await prisma.keyFigure.findUnique({
        where: { id: figure.id },
      });

      if (existing) {
        await prisma.keyFigure.update({
          where: { id: figure.id },
          data: {
            canonicalName: figure.canonicalName,
            aliases: JSON.stringify(figure.aliases),
            shortBio: figure.shortBio,
            primaryOrg: figure.primaryOrg,
            previousOrgs: JSON.stringify(figure.previousOrgs),
            role: figure.role,
            notableFor: figure.notableFor,
            wikipediaUrl: figure.wikipediaUrl,
            status: 'published',
          },
        });
        updated++;
      } else {
        await prisma.keyFigure.create({
          data: {
            id: figure.id,
            canonicalName: figure.canonicalName,
            aliases: JSON.stringify(figure.aliases),
            shortBio: figure.shortBio,
            primaryOrg: figure.primaryOrg,
            previousOrgs: JSON.stringify(figure.previousOrgs),
            role: figure.role,
            notableFor: figure.notableFor,
            wikipediaUrl: figure.wikipediaUrl,
            status: 'published',
          },
        });
        created++;
      }
    }

    console.log(`[Migrations] Key figures seed complete: ${created} created, ${updated} updated`);

    const count = await prisma.keyFigure.count();

    res.json({
      success: true,
      message: `Key figures seed completed: ${created} created, ${updated} updated`,
      totalFigures: count,
    });
  } catch (error) {
    console.error('[Migrations] Key figures seed failed:', error);
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
        'UserPathProgress', 'UserCheckpointProgress',
        'KeyFigure', 'MilestoneContributor', 'KeyFigureDraft'
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

    // Check if sourceId is nullable in IngestedArticle
    let sourceIdNullable = false;
    try {
      const columnInfo = await prisma.$queryRaw<Array<{ is_nullable: string }>>`
        SELECT is_nullable FROM information_schema.columns
        WHERE table_name = 'IngestedArticle'
        AND column_name = 'sourceId'
      `;
      sourceIdNullable = columnInfo.length > 0 && columnInfo[0].is_nullable === 'YES';
    } catch {
      // Table might not exist yet
    }

    res.json({
      existingTables,
      counts,
      migrations: {
        '0001_init_postgresql': existingTables.includes('Milestone'),
        '0002_flashcard_system': existingTables.includes('Flashcard'),
        '0003_learning_paths': existingTables.includes('LearningPath'),
        '0004_user_data': existingTables.includes('UserSession'),
        '0005_optional_source': sourceIdNullable,
        '0006_key_figures': existingTables.includes('KeyFigure'),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/migrations/contributors
 * Migrate existing milestone contributors to KeyFigure/MilestoneContributor
 * Sprint 47 - Key Figures Data Migration
 *
 * This migration:
 * 1. Reads all milestones with non-empty contributors JSON array
 * 2. For each contributor name:
 *    - Matches against existing KeyFigures using fuzzy matching
 *    - Creates new KeyFigure (status: draft) if no match found
 *    - Creates MilestoneContributor link
 * 3. Skips duplicates (idempotent - can run multiple times safely)
 */
export async function migrateContributors(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!prisma) {
      throw ApiError.internal('Database not available');
    }

    console.log('[Migrations] Starting contributors migration...');

    // Get all milestones with non-empty contributors
    const milestones = await prisma.milestone.findMany({
      where: {
        contributors: {
          not: '[]',
        },
      },
      select: {
        id: true,
        title: true,
        contributors: true,
      },
    });

    console.log(`[Migrations] Found ${milestones.length} milestones with contributors`);

    const stats = {
      totalMilestones: milestones.length,
      totalContributors: 0,
      matched: 0,
      created: 0,
      linked: 0,
      skippedDuplicates: 0,
      errors: 0,
      details: [] as Array<{
        milestone: string;
        contributor: string;
        action: 'matched' | 'created' | 'skipped' | 'error';
        keyFigureId?: string;
        error?: string;
      }>,
    };

    for (const milestone of milestones) {
      let contributors: string[] = [];
      try {
        contributors = JSON.parse(milestone.contributors);
      } catch {
        console.error(`[Migrations] Failed to parse contributors for ${milestone.id}`);
        continue;
      }

      if (!Array.isArray(contributors)) continue;

      for (const name of contributors) {
        if (!name || typeof name !== 'string' || name.trim().length === 0) continue;

        stats.totalContributors++;
        const trimmedName = name.trim();

        try {
          // Try to match against existing key figures
          const matchResult = await findMatch(trimmedName);

          let keyFigureId: string;

          if (matchResult.matched && matchResult.keyFigure) {
            // Found a match
            keyFigureId = matchResult.keyFigure.id;
            stats.matched++;
            stats.details.push({
              milestone: milestone.title,
              contributor: trimmedName,
              action: 'matched',
              keyFigureId,
            });
          } else {
            // No match - create new key figure with draft status
            const normalized = normalizeName(trimmedName);
            const aliases = suggestAliases(trimmedName);

            // Check if this ID already exists
            const existing = await prisma.keyFigure.findUnique({
              where: { id: normalized.id },
            });

            if (existing) {
              // Use existing figure
              keyFigureId = existing.id;
              stats.matched++;
              stats.details.push({
                milestone: milestone.title,
                contributor: trimmedName,
                action: 'matched',
                keyFigureId,
              });
            } else {
              // Create new draft figure
              const newFigure = await prisma.keyFigure.create({
                data: {
                  id: normalized.id,
                  canonicalName: normalized.canonical,
                  aliases: JSON.stringify(aliases),
                  shortBio: `Contributor to AI milestone: ${milestone.title}`,
                  role: 'researcher', // Default role
                  notableFor: `Contributed to ${milestone.title}`,
                  status: 'draft', // Needs admin review
                },
              });
              keyFigureId = newFigure.id;
              stats.created++;
              stats.details.push({
                milestone: milestone.title,
                contributor: trimmedName,
                action: 'created',
                keyFigureId,
              });
            }
          }

          // Create MilestoneContributor link (skip if already exists)
          const existingLink = await prisma.milestoneContributor.findUnique({
            where: {
              milestoneId_keyFigureId: {
                milestoneId: milestone.id,
                keyFigureId,
              },
            },
          });

          if (existingLink) {
            stats.skippedDuplicates++;
          } else {
            await prisma.milestoneContributor.create({
              data: {
                milestoneId: milestone.id,
                keyFigureId,
                contributionType: 'mentioned', // Default type
              },
            });
            stats.linked++;
          }
        } catch (error) {
          console.error(`[Migrations] Error processing contributor "${trimmedName}":`, error);
          stats.errors++;
          stats.details.push({
            milestone: milestone.title,
            contributor: trimmedName,
            action: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    // Get final counts
    const keyFigureCount = await prisma.keyFigure.count();
    const linkCount = await prisma.milestoneContributor.count();
    const draftCount = await prisma.keyFigure.count({
      where: { status: 'draft' },
    });

    console.log(`[Migrations] Contributors migration complete:
      - Total contributors processed: ${stats.totalContributors}
      - Matched to existing figures: ${stats.matched}
      - Created new draft figures: ${stats.created}
      - Links created: ${stats.linked}
      - Duplicate links skipped: ${stats.skippedDuplicates}
      - Errors: ${stats.errors}`);

    res.json({
      success: true,
      message: 'Contributors migration completed',
      stats: {
        ...stats,
        details: stats.details.slice(0, 50), // Only return first 50 details
      },
      totals: {
        keyFigures: keyFigureCount,
        draftFigures: draftCount,
        milestoneLinks: linkCount,
      },
    });
  } catch (error) {
    console.error('[Migrations] Contributors migration failed:', error);
    next(error);
  }
}
