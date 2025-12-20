-- Sprint 38: Add User Data Models for localStorage to Database Migration
-- Creates tables for user sessions, flashcard progress, study stats, and learning progress

-- ============================================================================
-- UserSession: Core user session tracking (anonymous or authenticated)
-- ============================================================================
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on deviceId (one session per device)
CREATE UNIQUE INDEX "UserSession_deviceId_key" ON "UserSession"("deviceId");

-- Indexes for UserSession
CREATE INDEX "UserSession_deviceId_idx" ON "UserSession"("deviceId");
CREATE INDEX "UserSession_lastActiveAt_idx" ON "UserSession"("lastActiveAt");

-- ============================================================================
-- UserFlashcard: User's saved flashcards with SM-2 spaced repetition data
-- ============================================================================
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFlashcard_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on session + source (one card per source per session)
CREATE UNIQUE INDEX "UserFlashcard_sessionId_sourceType_sourceId_key" ON "UserFlashcard"("sessionId", "sourceType", "sourceId");

-- Indexes for UserFlashcard
CREATE INDEX "UserFlashcard_sessionId_idx" ON "UserFlashcard"("sessionId");
CREATE INDEX "UserFlashcard_nextReviewDate_idx" ON "UserFlashcard"("nextReviewDate");

-- Foreign key constraint for UserFlashcard -> UserSession
ALTER TABLE "UserFlashcard" ADD CONSTRAINT "UserFlashcard_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- UserFlashcardPack: User's custom flashcard packs/decks
-- ============================================================================
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

-- Indexes for UserFlashcardPack
CREATE INDEX "UserFlashcardPack_sessionId_idx" ON "UserFlashcardPack"("sessionId");

-- Foreign key constraint for UserFlashcardPack -> UserSession
ALTER TABLE "UserFlashcardPack" ADD CONSTRAINT "UserFlashcardPack_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- UserStudyStats: Aggregate study statistics
-- ============================================================================
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStudyStats_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on sessionId (one stats record per session)
CREATE UNIQUE INDEX "UserStudyStats_sessionId_key" ON "UserStudyStats"("sessionId");

-- Foreign key constraint for UserStudyStats -> UserSession
ALTER TABLE "UserStudyStats" ADD CONSTRAINT "UserStudyStats_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- UserStudySession: Individual study session records
-- ============================================================================
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

-- Indexes for UserStudySession
CREATE INDEX "UserStudySession_sessionId_idx" ON "UserStudySession"("sessionId");
CREATE INDEX "UserStudySession_startedAt_idx" ON "UserStudySession"("startedAt");

-- Foreign key constraint for UserStudySession -> UserSession
ALTER TABLE "UserStudySession" ADD CONSTRAINT "UserStudySession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- UserDailyRecord: Daily review activity records for charts
-- ============================================================================
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

-- Unique constraint on session + date (one record per day per session)
CREATE UNIQUE INDEX "UserDailyRecord_sessionId_date_key" ON "UserDailyRecord"("sessionId", "date");

-- Indexes for UserDailyRecord
CREATE INDEX "UserDailyRecord_sessionId_idx" ON "UserDailyRecord"("sessionId");
CREATE INDEX "UserDailyRecord_date_idx" ON "UserDailyRecord"("date");

-- Foreign key constraint for UserDailyRecord -> UserSession
ALTER TABLE "UserDailyRecord" ADD CONSTRAINT "UserDailyRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- UserStreakHistory: Streak tracking and achievements
-- ============================================================================
CREATE TABLE "UserStreakHistory" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastStudyDate" TIMESTAMP(3),
    "achievements" TEXT NOT NULL DEFAULT '[]',
    "initializedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStreakHistory_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on sessionId (one streak history per session)
CREATE UNIQUE INDEX "UserStreakHistory_sessionId_key" ON "UserStreakHistory"("sessionId");

-- Foreign key constraint for UserStreakHistory -> UserSession
ALTER TABLE "UserStreakHistory" ADD CONSTRAINT "UserStreakHistory_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- UserProfile: User preferences from onboarding
-- ============================================================================
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "audienceType" TEXT,
    "expertiseLevel" TEXT,
    "interests" TEXT NOT NULL DEFAULT '[]',
    "completedOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on sessionId (one profile per session)
CREATE UNIQUE INDEX "UserProfile_sessionId_key" ON "UserProfile"("sessionId");

-- Foreign key constraint for UserProfile -> UserSession
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- UserPathProgress: Learning path progress tracking
-- ============================================================================
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

-- Unique constraint on session + path (one progress record per path per session)
CREATE UNIQUE INDEX "UserPathProgress_sessionId_pathSlug_key" ON "UserPathProgress"("sessionId", "pathSlug");

-- Indexes for UserPathProgress
CREATE INDEX "UserPathProgress_sessionId_idx" ON "UserPathProgress"("sessionId");

-- Foreign key constraint for UserPathProgress -> UserSession
ALTER TABLE "UserPathProgress" ADD CONSTRAINT "UserPathProgress_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- UserCheckpointProgress: Checkpoint quiz progress tracking
-- ============================================================================
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

-- Unique constraint on session + checkpoint (one progress record per checkpoint per session)
CREATE UNIQUE INDEX "UserCheckpointProgress_sessionId_checkpointId_key" ON "UserCheckpointProgress"("sessionId", "checkpointId");

-- Indexes for UserCheckpointProgress
CREATE INDEX "UserCheckpointProgress_sessionId_idx" ON "UserCheckpointProgress"("sessionId");

-- Foreign key constraint for UserCheckpointProgress -> UserSession
ALTER TABLE "UserCheckpointProgress" ADD CONSTRAINT "UserCheckpointProgress_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
