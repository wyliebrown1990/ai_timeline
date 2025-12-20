-- Sprint 36: Add Flashcard System
-- Creates tables for flashcards, prebuilt decks, and deck card mappings

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

-- Unique constraint on deck name
CREATE UNIQUE INDEX "PrebuiltDeck_name_key" ON "PrebuiltDeck"("name");

-- Indexes for Flashcard
CREATE INDEX "Flashcard_category_idx" ON "Flashcard"("category");
CREATE INDEX "Flashcard_term_idx" ON "Flashcard"("term");

-- Indexes for PrebuiltDeck
CREATE INDEX "PrebuiltDeck_difficulty_idx" ON "PrebuiltDeck"("difficulty");

-- Indexes for PrebuiltDeckCard
CREATE INDEX "PrebuiltDeckCard_deckId_idx" ON "PrebuiltDeckCard"("deckId");
CREATE INDEX "PrebuiltDeckCard_sourceType_idx" ON "PrebuiltDeckCard"("sourceType");

-- Foreign key constraint
ALTER TABLE "PrebuiltDeckCard" ADD CONSTRAINT "PrebuiltDeckCard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "PrebuiltDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
