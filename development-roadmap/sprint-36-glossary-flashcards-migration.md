# Sprint 36: Glossary Frontend + Flashcards Database Migration

**Impact**: High | **Effort**: Medium | **Dependencies**: Sprint 35 (Milestones Migration)

## Overview

This sprint completes the glossary migration by updating the frontend to use the database API (the backend API already exists), and creates the database infrastructure for flashcards (study cards) with full CRUD API support.

**Glossary Status**: Backend API exists (`/api/glossary`), but frontend still uses static JSON in places.
**Flashcards Status**: Currently static JSON only, needs full database migration.

---

## Current State Analysis

### Glossary

| Component | Current | Target |
|-----------|---------|--------|
| Database model | ✅ `GlossaryTerm` exists | No change |
| Backend API | ✅ `/api/glossary` exists | No change |
| Frontend data source | Mixed (static + API) | API only |
| Static file | `src/content/glossary/terms.json` | Deprecated |

### Flashcards

| Component | Current | Target |
|-----------|---------|--------|
| Database model | ❌ None | New `Flashcard` model |
| Backend API | ❌ None | Full CRUD API |
| Frontend data source | Static JSON | API |
| Static file | `src/content/checkpoints/flashcards.json` | Deprecated |

---

## Phase 1: Complete Glossary Frontend Migration

### 36.1 Audit Glossary Usage in Frontend
- [x] Search for all imports of glossary from `@/content`
- [x] Document all components using static glossary data

**Found 7 components using static glossary data:**
- `GlossaryPage.tsx` - useGlossary()
- `GlossaryTermDetail.tsx` - useGlossary()
- `GlossaryTerm.tsx` - useGlossaryTerm()
- `PathFlashcardsModal.tsx` - useGlossary()
- `StudySession.tsx` - useGlossary()
- `PackManager.tsx` - useGlossary()
- `DeckLibrary.tsx` - useGlossary()

```bash
# Find all glossary imports
grep -r "from '@/content'" src/ | grep -i glossary
grep -r "getGlossaryTerm" src/
grep -r "getGlossaryTerms" src/
grep -r "searchGlossaryTerms" src/
```

### 36.2 Seed Glossary Database from Static JSON
- [ ] Create glossary seed script

```typescript
// scripts/seed-glossary.ts
import { PrismaClient } from '@prisma/client';
import glossaryTerms from '../src/content/glossary/terms.json';

const prisma = new PrismaClient();

interface StaticGlossaryEntry {
  id: string;
  term: string;
  shortDefinition: string;
  fullDefinition: string;
  businessContext: string;
  inMeetingExample?: string;
  example?: string;
  relatedTermIds: string[];
  relatedMilestoneIds: string[];
  category: string;
}

async function seedGlossary() {
  console.log('Seeding glossary terms...');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const entry of glossaryTerms as StaticGlossaryEntry[]) {
    // Check if term exists by unique term name
    const existing = await prisma.glossaryTerm.findUnique({
      where: { term: entry.term },
    });

    const termData = {
      term: entry.term,
      shortDefinition: entry.shortDefinition,
      fullDefinition: entry.fullDefinition,
      businessContext: entry.businessContext || null,
      inMeetingExample: entry.inMeetingExample || null,
      example: entry.example || null,
      category: entry.category,
      relatedTermIds: JSON.stringify(entry.relatedTermIds || []),
      relatedMilestoneIds: JSON.stringify(entry.relatedMilestoneIds || []),
    };

    if (existing) {
      // Update if content changed
      await prisma.glossaryTerm.update({
        where: { term: entry.term },
        data: termData,
      });
      updated++;
    } else {
      await prisma.glossaryTerm.create({
        data: termData,
      });
      created++;
    }
  }

  console.log(`\nGlossary seed complete:`);
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Total terms: ${glossaryTerms.length}`);
}

seedGlossary()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [x] Add to package.json: `"db:seed:glossary": "npx tsx scripts/migrateGlossary.ts"` (uses existing script)
- [x] Created `scripts/seedGlossaryToProduction.ts` - Seeds via admin API (bypasses VPC restrictions)
- [x] Run on production database ✅ (101 terms seeded successfully)

### 36.3 Update Frontend Glossary API Client
- [x] Verify `src/services/api.ts` glossaryApi uses dynamic API
- [x] The glossary API already exists - just need to ensure frontend uses it

```typescript
// src/services/api.ts - Already exists, verify it's used everywhere
export const glossaryApi = {
  async getAll(params?: {
    category?: GlossaryCategory;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<GlossaryTerm>> {
    // This should NOT have a static fallback
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const queryString = searchParams.toString();
    const url = `${DYNAMIC_API_BASE}/glossary${queryString ? `?${queryString}` : ''}`;

    return fetchJson<PaginatedResponse<GlossaryTerm>>(url);
  },
  // ... other methods
};
```

### 36.4 Create Glossary React Query Hooks
- [x] Create hooks for glossary data fetching

**Implementation Note:** Created `src/hooks/useGlossaryApi.ts` using useState/useEffect pattern (no React Query dependency needed). Exports: `useGlossary`, `useGlossaryTerm`, `useGlossaryTerms`, `useGlossaryByCategory`, `useGlossarySearch`. Includes caching with 5-minute TTL.

```typescript
// src/hooks/useGlossary.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { glossaryApi, GlossaryTerm, GlossaryCategory } from '@/services/api';

export function useGlossaryTerms(params?: {
  category?: GlossaryCategory;
  search?: string;
}) {
  return useQuery({
    queryKey: ['glossary', 'terms', params],
    queryFn: () => glossaryApi.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useGlossaryTerm(id: string) {
  return useQuery({
    queryKey: ['glossary', 'term', id],
    queryFn: () => glossaryApi.getById(id),
    enabled: !!id,
  });
}

export function useGlossaryTermByName(termName: string) {
  return useQuery({
    queryKey: ['glossary', 'byName', termName],
    queryFn: () => glossaryApi.getByName(termName),
    enabled: !!termName,
  });
}

export function useGlossarySearch(query: string, limit?: number) {
  return useQuery({
    queryKey: ['glossary', 'search', query, limit],
    queryFn: () => glossaryApi.search(query, limit),
    enabled: query.length >= 2,
  });
}
```

### 36.5 Update GlossaryPage to Use API
- [x] Refactor `src/pages/GlossaryPage.tsx` to use React Query hooks
- [x] Remove any static imports from `@/content`

**Updated imports in:** GlossaryPage.tsx now imports `useGlossary` from `../hooks` instead of `../hooks/useContent`

### 36.6 Update Glossary Tooltips/Hover Cards
- [x] Find all components that show glossary definitions
- [x] Update to fetch from API or use pre-fetched data

**Updated components:**
- `GlossaryTermDetail.tsx` - updated import to use API hooks
- `GlossaryTerm.tsx` - updated import to use API hooks
- `PathFlashcardsModal.tsx` - updated import
- `StudySession.tsx` - updated import
- `PackManager.tsx` - updated import
- `DeckLibrary.tsx` - updated import

---

## Phase 2: Create Flashcard Database Model

### 36.7 Update Prisma Schema with Flashcard Model
- [x] Add Flashcard model to `prisma/schema.prisma`

**Added models:** `Flashcard`, `PrebuiltDeck`, `PrebuiltDeckCard` with proper indexes and relations.

```prisma
/// Flashcard for study/review system
model Flashcard {
  id                  String   @id @default(cuid())
  term                String
  definition          String
  category            String   // model_architecture, technical_term, core_concept, etc.
  relatedMilestoneIds String   @default("[]") // JSON array
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([category])
  @@index([term])
}

/// Prebuilt flashcard deck
model PrebuiltDeck {
  id               String   @id @default(cuid())
  name             String   @unique
  description      String
  difficulty       String   // beginner, intermediate, advanced
  cardCount        Int
  estimatedMinutes Int
  previewCardIds   String   @default("[]") // JSON array of card IDs for preview
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

/// Card membership in a prebuilt deck
model PrebuiltDeckCard {
  id         String @id @default(cuid())
  deckId     String
  cardId     String
  sourceType String // milestone, concept, custom, flashcard
  sourceId   String // ID of source (milestone ID, concept ID, or flashcard ID)
  // Custom content (only used when sourceType is 'custom')
  customTerm       String?
  customDefinition String?
  sortOrder  Int    @default(0)

  @@unique([deckId, cardId])
  @@index([deckId])
}
```

### 36.8 Generate and Run Migration
- [x] Create migration file: `prisma/migrations/0002_add_flashcard_system/migration.sql`
- [x] Created admin migration endpoint: `POST /api/admin/migrations/run`
- [x] Run migration on production database ✅

**Migration verified on production:**
- Flashcard table: created
- PrebuiltDeck table: created
- PrebuiltDeckCard table: created
- All API endpoints responding correctly

---

## Phase 3: Create Flashcard API

### 36.9 Create Flashcard Controller
- [x] Create `server/src/services/flashcard.ts` - Database service with CRUD operations
- [x] Create `server/src/controllers/flashcard.ts` - API endpoints with validation

```typescript
// server/src/controllers/flashcards.ts
import { Request, Response } from 'express';
import { prisma } from '../db';

/**
 * Get all flashcards with optional filtering
 */
export async function getAllFlashcards(req: Request, res: Response) {
  try {
    const { category, search, page = 1, limit = 100 } = req.query;

    const where: Record<string, unknown> = {};

    if (category) {
      where.category = category as string;
    }

    if (search) {
      where.OR = [
        { term: { contains: search as string, mode: 'insensitive' } },
        { definition: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [flashcards, total] = await Promise.all([
      prisma.flashcard.findMany({
        where,
        orderBy: { term: 'asc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.flashcard.count({ where }),
    ]);

    // Parse JSON fields
    const formattedFlashcards = flashcards.map((fc) => ({
      ...fc,
      relatedMilestoneIds: JSON.parse(fc.relatedMilestoneIds || '[]'),
    }));

    return res.json({
      data: formattedFlashcards,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error getting flashcards:', error);
    return res.status(500).json({ error: 'Failed to get flashcards' });
  }
}

/**
 * Get a single flashcard by ID
 */
export async function getFlashcardById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const flashcard = await prisma.flashcard.findUnique({
      where: { id },
    });

    if (!flashcard) {
      return res.status(404).json({ error: 'Flashcard not found' });
    }

    return res.json({
      ...flashcard,
      relatedMilestoneIds: JSON.parse(flashcard.relatedMilestoneIds || '[]'),
    });
  } catch (error) {
    console.error('Error getting flashcard:', error);
    return res.status(500).json({ error: 'Failed to get flashcard' });
  }
}

/**
 * Get flashcards by category
 */
export async function getFlashcardsByCategory(req: Request, res: Response) {
  try {
    const { category } = req.params;

    const flashcards = await prisma.flashcard.findMany({
      where: { category },
      orderBy: { term: 'asc' },
    });

    const formattedFlashcards = flashcards.map((fc) => ({
      ...fc,
      relatedMilestoneIds: JSON.parse(fc.relatedMilestoneIds || '[]'),
    }));

    return res.json({ data: formattedFlashcards });
  } catch (error) {
    console.error('Error getting flashcards by category:', error);
    return res.status(500).json({ error: 'Failed to get flashcards' });
  }
}

/**
 * Get all unique categories
 */
export async function getFlashcardCategories(req: Request, res: Response) {
  try {
    const categories = await prisma.flashcard.groupBy({
      by: ['category'],
      _count: true,
    });

    return res.json({
      data: categories.map((c) => ({
        category: c.category,
        count: c._count,
      })),
    });
  } catch (error) {
    console.error('Error getting flashcard categories:', error);
    return res.status(500).json({ error: 'Failed to get categories' });
  }
}

/**
 * Create a new flashcard (admin only)
 */
export async function createFlashcard(req: Request, res: Response) {
  try {
    const { term, definition, category, relatedMilestoneIds = [] } = req.body;

    if (!term || !definition || !category) {
      return res.status(400).json({ error: 'term, definition, and category are required' });
    }

    const flashcard = await prisma.flashcard.create({
      data: {
        term,
        definition,
        category,
        relatedMilestoneIds: JSON.stringify(relatedMilestoneIds),
      },
    });

    return res.status(201).json({
      ...flashcard,
      relatedMilestoneIds,
    });
  } catch (error) {
    console.error('Error creating flashcard:', error);
    return res.status(500).json({ error: 'Failed to create flashcard' });
  }
}

/**
 * Update a flashcard (admin only)
 */
export async function updateFlashcard(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { term, definition, category, relatedMilestoneIds } = req.body;

    const existing = await prisma.flashcard.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Flashcard not found' });
    }

    const flashcard = await prisma.flashcard.update({
      where: { id },
      data: {
        ...(term && { term }),
        ...(definition && { definition }),
        ...(category && { category }),
        ...(relatedMilestoneIds && { relatedMilestoneIds: JSON.stringify(relatedMilestoneIds) }),
      },
    });

    return res.json({
      ...flashcard,
      relatedMilestoneIds: JSON.parse(flashcard.relatedMilestoneIds || '[]'),
    });
  } catch (error) {
    console.error('Error updating flashcard:', error);
    return res.status(500).json({ error: 'Failed to update flashcard' });
  }
}

/**
 * Delete a flashcard (admin only)
 */
export async function deleteFlashcard(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.flashcard.delete({ where: { id } });

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting flashcard:', error);
    return res.status(500).json({ error: 'Failed to delete flashcard' });
  }
}

/**
 * Bulk create flashcards (for migration)
 */
export async function bulkCreateFlashcards(req: Request, res: Response) {
  try {
    const { flashcards } = req.body;

    if (!Array.isArray(flashcards)) {
      return res.status(400).json({ error: 'flashcards must be an array' });
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const fc of flashcards) {
      try {
        // Check for duplicate by term
        const existing = await prisma.flashcard.findFirst({
          where: { term: fc.term },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.flashcard.create({
          data: {
            term: fc.term,
            definition: fc.definition,
            category: fc.category,
            relatedMilestoneIds: JSON.stringify(fc.relatedMilestoneIds || []),
          },
        });
        created++;
      } catch (err) {
        errors.push(`Failed to create "${fc.term}": ${err}`);
      }
    }

    return res.json({
      message: 'Bulk create complete',
      created,
      skipped,
      errors,
    });
  } catch (error) {
    console.error('Error bulk creating flashcards:', error);
    return res.status(500).json({ error: 'Failed to bulk create flashcards' });
  }
}
```

### 36.10 Create Flashcard Routes
- [x] Create `server/src/routes/flashcard.ts` - Public and admin routes for flashcards and decks

```typescript
// server/src/routes/flashcards.ts
import { Router } from 'express';
import * as flashcardsController from '../controllers/flashcards';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', flashcardsController.getAllFlashcards);
router.get('/categories', flashcardsController.getFlashcardCategories);
router.get('/category/:category', flashcardsController.getFlashcardsByCategory);
router.get('/:id', flashcardsController.getFlashcardById);

export default router;

// Admin routes (mounted separately on /api/admin/flashcards)
export const adminRouter = Router();

adminRouter.post('/bulk', requireAdmin, flashcardsController.bulkCreateFlashcards);
adminRouter.post('/', requireAdmin, flashcardsController.createFlashcard);
adminRouter.put('/:id', requireAdmin, flashcardsController.updateFlashcard);
adminRouter.delete('/:id', requireAdmin, flashcardsController.deleteFlashcard);
```

### 36.11 Register Routes in App
- [x] Update `server/src/index.ts` to include flashcard and deck routes

**Registered routes:**
- `/api/flashcards` - Public flashcard API
- `/api/decks` - Public deck API
- `/api/admin/flashcards` - Admin flashcard management
- `/api/admin/decks` - Admin deck management

```typescript
import flashcardsRouter, { adminRouter as flashcardsAdminRouter } from './routes/flashcards';

// Public routes
app.use('/api/flashcards', flashcardsRouter);

// Admin routes
app.use('/api/admin/flashcards', flashcardsAdminRouter);
```

---

## Phase 4: Create Prebuilt Deck API

### 36.12 Create Prebuilt Deck Controller
- [x] Deck controller included in `server/src/controllers/flashcard.ts`

**Note:** Deck functionality was combined with flashcard controller/service for cleaner organization.

```typescript
// server/src/controllers/prebuiltDecks.ts
import { Request, Response } from 'express';
import { prisma } from '../db';

/**
 * Get all prebuilt decks
 */
export async function getAllDecks(req: Request, res: Response) {
  try {
    const { difficulty } = req.query;

    const where: Record<string, unknown> = {};
    if (difficulty) {
      where.difficulty = difficulty as string;
    }

    const decks = await prisma.prebuiltDeck.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    const formattedDecks = decks.map((deck) => ({
      ...deck,
      previewCardIds: JSON.parse(deck.previewCardIds || '[]'),
    }));

    return res.json({ data: formattedDecks });
  } catch (error) {
    console.error('Error getting prebuilt decks:', error);
    return res.status(500).json({ error: 'Failed to get decks' });
  }
}

/**
 * Get a single deck with its cards
 */
export async function getDeckById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const deck = await prisma.prebuiltDeck.findUnique({
      where: { id },
    });

    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    // Get deck cards
    const deckCards = await prisma.prebuiltDeckCard.findMany({
      where: { deckId: id },
      orderBy: { sortOrder: 'asc' },
    });

    // Resolve card content based on source type
    const cards = await Promise.all(
      deckCards.map(async (dc) => {
        if (dc.sourceType === 'custom') {
          return {
            id: dc.cardId,
            sourceType: 'custom',
            term: dc.customTerm,
            definition: dc.customDefinition,
          };
        } else if (dc.sourceType === 'flashcard') {
          const flashcard = await prisma.flashcard.findUnique({
            where: { id: dc.sourceId },
          });
          return flashcard ? {
            id: dc.cardId,
            sourceType: 'flashcard',
            sourceId: dc.sourceId,
            term: flashcard.term,
            definition: flashcard.definition,
          } : null;
        } else if (dc.sourceType === 'milestone') {
          const milestone = await prisma.milestone.findUnique({
            where: { id: dc.sourceId },
          });
          return milestone ? {
            id: dc.cardId,
            sourceType: 'milestone',
            sourceId: dc.sourceId,
            term: milestone.title,
            definition: milestone.description,
          } : null;
        } else if (dc.sourceType === 'concept') {
          // Concepts come from glossary terms
          const term = await prisma.glossaryTerm.findFirst({
            where: { id: dc.sourceId },
          });
          return term ? {
            id: dc.cardId,
            sourceType: 'concept',
            sourceId: dc.sourceId,
            term: term.term,
            definition: term.shortDefinition,
          } : null;
        }
        return null;
      })
    );

    return res.json({
      ...deck,
      previewCardIds: JSON.parse(deck.previewCardIds || '[]'),
      cards: cards.filter(Boolean),
    });
  } catch (error) {
    console.error('Error getting deck:', error);
    return res.status(500).json({ error: 'Failed to get deck' });
  }
}

// ... Add admin CRUD methods
```

### 36.13 Create Prebuilt Deck Routes
- [x] Deck routes included in `server/src/routes/flashcard.ts` (`deckRouter`, `adminDeckRouter`)

---

## Phase 5: Seed Flashcard Data

### 36.14 Create Flashcard Seed Script
- [x] Created `scripts/seedFlashcardsToProduction.ts` - Seeds via admin API
- [x] Run on production database ✅ (39 flashcards seeded successfully)

```typescript
// scripts/seed-flashcards.ts
import { PrismaClient } from '@prisma/client';
import flashcardsData from '../src/content/checkpoints/flashcards.json';

const prisma = new PrismaClient();

interface StaticFlashcard {
  id: string;
  term: string;
  definition: string;
  category: string;
  relatedMilestoneIds: string[];
}

async function seedFlashcards() {
  console.log('Seeding flashcards...');

  let created = 0;
  let skipped = 0;

  for (const card of flashcardsData as StaticFlashcard[]) {
    // Check for existing by term
    const existing = await prisma.flashcard.findFirst({
      where: { term: card.term },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.flashcard.create({
      data: {
        term: card.term,
        definition: card.definition,
        category: card.category,
        relatedMilestoneIds: JSON.stringify(card.relatedMilestoneIds || []),
      },
    });
    created++;
  }

  console.log(`\nFlashcard seed complete:`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped (existing): ${skipped}`);
}

seedFlashcards()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### 36.15 Create Prebuilt Deck Seed Script
- [x] Created `scripts/seedDecksToProduction.ts` - Seeds decks and deck cards via admin API
- [x] Run on production database ✅ (5 decks with 67 cards seeded successfully)

**Decks seeded:**
- AI Essentials (beginner, 15 cards)
- AI Vocabulary (beginner, 20 cards)
- Key Figures in AI (beginner, 10 cards)
- LLM Revolution (intermediate, 10 cards)
- Transformer Era (intermediate, 12 cards)

### 36.16 Run Seed Scripts
- [x] Created seed scripts that use admin API (bypasses VPC restrictions)
- [x] Run on production ✅

---

## Phase 6: Update Frontend

### 36.17 Create Flashcard API Client
- [x] Added to `src/services/api.ts`:
  - `flashcardsApi` - CRUD operations for flashcards
  - `decksApi` - CRUD operations for prebuilt decks
  - Types: `Flashcard`, `PrebuiltDeck`, `PrebuiltDeckCard`, etc.

```typescript
// Add to src/services/api.ts

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  category: string;
  relatedMilestoneIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PrebuiltDeck {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  cardCount: number;
  estimatedMinutes: number;
  previewCardIds: string[];
}

export const flashcardsApi = {
  async getAll(params?: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Flashcard>> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const queryString = searchParams.toString();
    return fetchJson<PaginatedResponse<Flashcard>>(
      `${DYNAMIC_API_BASE}/flashcards${queryString ? `?${queryString}` : ''}`
    );
  },

  async getById(id: string): Promise<Flashcard> {
    return fetchJson<Flashcard>(`${DYNAMIC_API_BASE}/flashcards/${id}`);
  },

  async getByCategory(category: string): Promise<{ data: Flashcard[] }> {
    return fetchJson<{ data: Flashcard[] }>(
      `${DYNAMIC_API_BASE}/flashcards/category/${category}`
    );
  },

  async getCategories(): Promise<{ data: { category: string; count: number }[] }> {
    return fetchJson<{ data: { category: string; count: number }[] }>(
      `${DYNAMIC_API_BASE}/flashcards/categories`
    );
  },
};

export const prebuiltDecksApi = {
  async getAll(difficulty?: string): Promise<{ data: PrebuiltDeck[] }> {
    const params = difficulty ? `?difficulty=${difficulty}` : '';
    return fetchJson<{ data: PrebuiltDeck[] }>(
      `${DYNAMIC_API_BASE}/prebuilt-decks${params}`
    );
  },

  async getById(id: string): Promise<PrebuiltDeck & { cards: unknown[] }> {
    return fetchJson<PrebuiltDeck & { cards: unknown[] }>(
      `${DYNAMIC_API_BASE}/prebuilt-decks/${id}`
    );
  },
};
```

### 36.18 Update Study Components
- [x] Update `DeckLibrary.tsx` to use `usePrebuiltDecks` API hook
- [x] Update `EmptyState.tsx` to use `usePrebuiltDecks` API hook
- [x] Updated `usePrebuiltDecks` to fetch decks with cards for full functionality
- [x] Removed static imports from `content/prebuiltDecks.ts`

### 36.19 Create React Hooks for Flashcards
- [x] Created `src/hooks/useFlashcardsApi.ts` using useState/useEffect pattern (no React Query)
  - `useFlashcards`, `useFlashcard`, `useFlashcardsByCategory`
  - `usePrebuiltDecks`, `usePrebuiltDeck`, `usePrebuiltDecksByDifficulty`
  - Includes caching with 5-minute TTL
- [x] Exported from `src/hooks/index.ts`

```typescript
// src/hooks/useFlashcards.ts
import { useQuery } from '@tanstack/react-query';
import { flashcardsApi, prebuiltDecksApi } from '@/services/api';

export function useFlashcards(params?: { category?: string; search?: string }) {
  return useQuery({
    queryKey: ['flashcards', params],
    queryFn: () => flashcardsApi.getAll(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFlashcard(id: string) {
  return useQuery({
    queryKey: ['flashcard', id],
    queryFn: () => flashcardsApi.getById(id),
    enabled: !!id,
  });
}

export function useFlashcardCategories() {
  return useQuery({
    queryKey: ['flashcards', 'categories'],
    queryFn: () => flashcardsApi.getCategories(),
    staleTime: 10 * 60 * 1000,
  });
}

export function usePrebuiltDecks(difficulty?: string) {
  return useQuery({
    queryKey: ['prebuiltDecks', difficulty],
    queryFn: () => prebuiltDecksApi.getAll(difficulty),
    staleTime: 10 * 60 * 1000,
  });
}

export function usePrebuiltDeck(id: string) {
  return useQuery({
    queryKey: ['prebuiltDeck', id],
    queryFn: () => prebuiltDecksApi.getById(id),
    enabled: !!id,
  });
}
```

---

## Phase 7: Deploy & Test (Production Only)

**Note**: Skip local testing. Deploy directly to AWS and test on production.

### 36.20 Deploy to Production
- [x] Build and deploy Lambda: Backend already deployed in Phase 4
- [x] Build and deploy frontend: `npm run build && aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete`
- [x] Invalidate CloudFront: `aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"`
- [x] Run seed/migration scripts via admin API endpoints (completed in Phase 5)

### 36.21 Verify on Production
- [x] Test GlossaryPage loads from API ✅ (101 terms)
- [x] Test glossary search and category filtering ✅
- [x] Test Flashcards API ✅ (39 cards)
- [x] Test Decks API ✅ (5 decks)
- [x] Frontend deployed with new API clients and hooks
- [x] Study components updated to use database API
- [x] DeckLibrary fetches decks from API ✅
- [x] EmptyState fetches featured deck from API ✅

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `prisma/schema.prisma` | MODIFY | Add Flashcard, PrebuiltDeck, PrebuiltDeckCard models |
| `scripts/seed-glossary.ts` | NEW | Glossary seed script |
| `scripts/seed-flashcards.ts` | NEW | Flashcard seed script |
| `scripts/seed-prebuilt-decks.ts` | NEW | Prebuilt deck seed script |
| `server/src/controllers/flashcards.ts` | NEW | Flashcard controller |
| `server/src/controllers/prebuiltDecks.ts` | NEW | Prebuilt deck controller |
| `server/src/routes/flashcards.ts` | NEW | Flashcard routes |
| `server/src/routes/prebuiltDecks.ts` | NEW | Prebuilt deck routes |
| `server/src/app.ts` | MODIFY | Register new routes |
| `src/services/api.ts` | MODIFY | Add flashcard/deck API clients |
| `src/hooks/useFlashcards.ts` | NEW | React Query hooks |
| `src/hooks/useGlossary.ts` | NEW | React Query hooks |
| `src/pages/GlossaryPage.tsx` | MODIFY | Use API instead of static |
| `src/pages/StudyPage.tsx` | MODIFY | Use API instead of static |
| `package.json` | MODIFY | Add seed scripts |

---

## Success Criteria

- [ ] Glossary page fetches from database API
- [ ] Glossary tooltips work with API data
- [ ] Flashcard database model created and migrated
- [ ] Flashcard API returns all cards
- [ ] Prebuilt decks load from database
- [ ] All existing flashcard content seeded to database
- [ ] Study functionality works with API data
- [ ] Admin can create/edit/delete flashcards
- [ ] No regressions in study experience

---

## Rollback Plan

1. **Glossary issues**: Frontend has no static fallback planned; restore static imports if critical
2. **Flashcard API errors**: Keep static `getFlashcards()` function available temporarily
3. **Database issues**: Prisma migrations can be rolled back with `prisma migrate reset`

---

## Notes

- Flashcard content is relatively small (~11KB), so seeding is fast
- The prebuilt deck seed is more complex due to card references
- Consider caching API responses for better performance
- User-created flashcards (localStorage) are migrated in Sprint 38
