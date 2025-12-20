/**
 * Database Migrations Controller
 *
 * Admin-only endpoints for running database migrations in production.
 * Since RDS is in a VPC, migrations must run from within Lambda.
 *
 * Sprint 36 - Flashcard Database Migration
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

    // For now, only support the flashcard migration
    if (migration !== '0002_flashcard_system') {
      throw ApiError.badRequest(
        'Invalid migration. Available: 0002_flashcard_system'
      );
    }

    console.log('[Migrations] Running migration: 0002_flashcard_system');

    // Run the migration SQL
    await prisma.$executeRawUnsafe(MIGRATION_0002_FLASHCARD_SYSTEM);

    console.log('[Migrations] Migration completed successfully');

    res.json({
      success: true,
      message: 'Migration 0002_flashcard_system completed successfully',
      tables: ['Flashcard', 'PrebuiltDeck', 'PrebuiltDeckCard'],
    });
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
      AND tablename IN ('Flashcard', 'PrebuiltDeck', 'PrebuiltDeckCard', 'Milestone', 'GlossaryTerm')
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
      },
    });
  } catch (error) {
    next(error);
  }
}
