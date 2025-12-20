-- Sprint 37: Add Learning Paths, Checkpoints, and Current Events
-- Creates tables for learning paths, checkpoints (quizzes), and current events

-- LearningPath table for curated milestone sequences
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

-- Checkpoint table for quizzes within learning paths
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

-- CurrentEvent table for AI news connected to milestones
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

-- Unique constraint on LearningPath slug
CREATE UNIQUE INDEX "LearningPath_slug_key" ON "LearningPath"("slug");

-- Indexes for LearningPath
CREATE INDEX "LearningPath_slug_idx" ON "LearningPath"("slug");
CREATE INDEX "LearningPath_difficulty_idx" ON "LearningPath"("difficulty");
CREATE INDEX "LearningPath_isPublished_idx" ON "LearningPath"("isPublished");

-- Indexes for Checkpoint
CREATE INDEX "Checkpoint_pathId_idx" ON "Checkpoint"("pathId");
CREATE INDEX "Checkpoint_afterMilestoneId_idx" ON "Checkpoint"("afterMilestoneId");

-- Indexes for CurrentEvent
CREATE INDEX "CurrentEvent_featured_idx" ON "CurrentEvent"("featured");
CREATE INDEX "CurrentEvent_publishedDate_idx" ON "CurrentEvent"("publishedDate");
CREATE INDEX "CurrentEvent_isPublished_idx" ON "CurrentEvent"("isPublished");
CREATE INDEX "CurrentEvent_expiresAt_idx" ON "CurrentEvent"("expiresAt");

-- Foreign key constraint for Checkpoint -> LearningPath
ALTER TABLE "Checkpoint" ADD CONSTRAINT "Checkpoint_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "LearningPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;
