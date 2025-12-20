# Sprint 38: User Data Migration (localStorage to Database)

**Impact**: High | **Effort**: High | **Dependencies**: Sprint 36 (Flashcards), Sprint 37 (Learning Paths)

## Overview

Migrate user-generated data from localStorage to the database. This enables:
- Cross-device sync for user progress
- Data persistence beyond browser storage
- Analytics on user learning patterns
- Future features like user accounts and social features

**Current State**: All user data stored in localStorage (browser-specific, easily lost)
**Target State**: User data stored in database with optional anonymous sessions

---

## Current User Data in localStorage

| Storage Key | Data Type | Purpose |
|-------------|-----------|---------|
| `ai-timeline-flashcards` | UserFlashcard[] | User's saved flashcards with SM-2 spaced repetition data |
| `ai-timeline-flashcard-packs` | FlashcardPack[] | Custom flashcard deck organization |
| `ai-timeline-flashcard-stats` | FlashcardStats | Aggregate study statistics |
| `ai-timeline-flashcard-sessions` | FlashcardReviewSession[] | Study session history |
| `ai-timeline-flashcard-history` | DailyReviewRecord[] | Daily review activity (90 days) |
| `ai-timeline-flashcard-streak` | StreakHistory | Streak tracking data |
| `ai-timeline-user-profile` | UserProfile | Onboarding preferences, expertise level |
| `ai-timeline-checkpoint-progress` | CheckpointProgress | Quiz completion state per learning path |
| `ai-timeline-learning-progress` | LearningProgress | Milestone completion state per learning path |

---

## Phase 1: Database Schema for User Data

### 38.1 Design User Session Model
- [ ] Users can be anonymous (session-based) or authenticated (future)
- [ ] Anonymous sessions use a device fingerprint or generated UUID

```prisma
/// User session - can be anonymous or authenticated
model UserSession {
  id              String    @id @default(cuid())
  deviceId        String    @unique // Browser fingerprint or generated UUID
  userId          String?   // Optional link to future User model
  createdAt       DateTime  @default(now())
  lastActiveAt    DateTime  @default(now())

  // Relations
  flashcards      UserFlashcard[]
  packs           UserFlashcardPack[]
  stats           UserStudyStats?
  sessions        UserStudySession[]
  dailyRecords    UserDailyRecord[]
  streakHistory   UserStreakHistory?
  profile         UserProfile?
  pathProgress    UserPathProgress[]
  checkpointProgress UserCheckpointProgress[]

  @@index([deviceId])
  @@index([lastActiveAt])
}

/// User's saved flashcard with SM-2 spaced repetition data
model UserFlashcard {
  id              String      @id @default(cuid())
  sessionId       String
  session         UserSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  sourceType      String      // milestone, concept, flashcard
  sourceId        String      // ID of source content
  packIds         String      @default("[]") // JSON array of pack IDs

  // SM-2 spaced repetition fields
  easeFactor      Float       @default(2.5)
  interval        Int         @default(0) // Days until next review
  repetitions     Int         @default(0) // Consecutive correct answers
  nextReviewDate  DateTime?
  lastReviewedAt  DateTime?

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@unique([sessionId, sourceType, sourceId])
  @@index([sessionId])
  @@index([nextReviewDate])
}

/// User's custom flashcard pack
model UserFlashcardPack {
  id          String      @id @default(cuid())
  sessionId   String
  session     UserSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  name        String
  description String?
  color       String      @default("#3B82F6")
  isDefault   Boolean     @default(false)

  createdAt   DateTime    @default(now())

  @@index([sessionId])
}

/// Aggregate study statistics
model UserStudyStats {
  id                  String      @id @default(cuid())
  sessionId           String      @unique
  session             UserSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  totalCards          Int         @default(0)
  cardsDueToday       Int         @default(0)
  cardsReviewedToday  Int         @default(0)
  currentStreak       Int         @default(0)
  longestStreak       Int         @default(0)
  masteredCards       Int         @default(0)
  lastStudyDate       DateTime?

  updatedAt           DateTime    @updatedAt
}

/// Individual study session record
model UserStudySession {
  id              String      @id @default(cuid())
  sessionId       String
  session         UserSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  packId          String?     // null = all due cards
  startedAt       DateTime    @default(now())
  completedAt     DateTime?
  cardsReviewed   Int         @default(0)
  cardsCorrect    Int         @default(0)
  cardsToReview   Int         @default(0) // "Review Again" count

  @@index([sessionId])
  @@index([startedAt])
}

/// Daily review activity record (for charts)
model UserDailyRecord {
  id                  String      @id @default(cuid())
  sessionId           String
  session             UserSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  date                DateTime    // Date only (YYYY-MM-DD)
  totalReviews        Int         @default(0)
  againCount          Int         @default(0)
  hardCount           Int         @default(0)
  goodCount           Int         @default(0)
  easyCount           Int         @default(0)
  minutesStudied      Float       @default(0)
  uniqueCardsReviewed String      @default("[]") // JSON array of card IDs

  @@unique([sessionId, date])
  @@index([sessionId])
  @@index([date])
}

/// Streak history and achievements
model UserStreakHistory {
  id              String      @id @default(cuid())
  sessionId       String      @unique
  session         UserSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  currentStreak   Int         @default(0)
  longestStreak   Int         @default(0)
  lastStudyDate   DateTime?
  achievements    String      @default("[]") // JSON array of achievements

  initializedAt   DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

/// User profile and preferences
model UserProfile {
  id              String      @id @default(cuid())
  sessionId       String      @unique
  session         UserSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  audienceType    String?     // everyday, professional, leader, developer
  expertiseLevel  String?     // beginner, intermediate, advanced
  interests       String      @default("[]") // JSON array
  completedOnboarding Boolean @default(false)

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

/// Learning path progress
model UserPathProgress {
  id              String      @id @default(cuid())
  sessionId       String
  session         UserSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  pathSlug        String      // Learning path slug
  completedMilestoneIds String @default("[]") // JSON array
  currentMilestoneId    String?
  startedAt       DateTime    @default(now())
  completedAt     DateTime?

  @@unique([sessionId, pathSlug])
  @@index([sessionId])
}

/// Checkpoint quiz progress
model UserCheckpointProgress {
  id              String      @id @default(cuid())
  sessionId       String
  session         UserSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  checkpointId    String
  completed       Boolean     @default(false)
  score           Int?        // Percentage score
  attempts        Int         @default(0)
  lastAttemptAt   DateTime?
  answers         String      @default("[]") // JSON array of answer records

  @@unique([sessionId, checkpointId])
  @@index([sessionId])
}
```

### 38.2 Run Database Migration
- [ ] Run migration: `npx prisma migrate dev --name add_user_data_models`
- [ ] Verify tables created
- [ ] Run migration on production

---

## Phase 2: User Session Management

### 38.3 Create Device ID Generation Utility
- [ ] Create `src/lib/deviceId.ts`

```typescript
// src/lib/deviceId.ts
const DEVICE_ID_KEY = 'ai-timeline-device-id';

/**
 * Get or generate a unique device ID for this browser
 * Uses a combination of browser fingerprinting and random UUID
 */
export function getDeviceId(): string {
  // Check localStorage first
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (deviceId) {
    return deviceId;
  }

  // Generate new device ID
  deviceId = generateDeviceId();
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

function generateDeviceId(): string {
  // Combine crypto.randomUUID with some browser fingerprinting for uniqueness
  const random = crypto.randomUUID();
  const timestamp = Date.now().toString(36);
  const screen = `${window.screen.width}x${window.screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Create a hash-like string
  const fingerprint = btoa(`${screen}-${timezone}`).slice(0, 8);

  return `${fingerprint}-${random}-${timestamp}`;
}

/**
 * Clear device ID (for testing or user request)
 */
export function clearDeviceId(): void {
  localStorage.removeItem(DEVICE_ID_KEY);
}
```

### 38.4 Create User Session API
- [ ] Create `server/src/controllers/userSession.ts`

```typescript
// server/src/controllers/userSession.ts
import { Request, Response } from 'express';
import { prisma } from '../db';

/**
 * Get or create a user session by device ID
 */
export async function getOrCreateSession(req: Request, res: Response) {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    // Try to find existing session
    let session = await prisma.userSession.findUnique({
      where: { deviceId },
      include: {
        stats: true,
        profile: true,
        streakHistory: true,
      },
    });

    if (session) {
      // Update last active
      session = await prisma.userSession.update({
        where: { id: session.id },
        data: { lastActiveAt: new Date() },
        include: {
          stats: true,
          profile: true,
          streakHistory: true,
        },
      });
    } else {
      // Create new session with default stats
      session = await prisma.userSession.create({
        data: {
          deviceId,
          stats: {
            create: {},
          },
          streakHistory: {
            create: {},
          },
          profile: {
            create: {},
          },
        },
        include: {
          stats: true,
          profile: true,
          streakHistory: true,
        },
      });
    }

    return res.json({
      sessionId: session.id,
      deviceId: session.deviceId,
      createdAt: session.createdAt,
      stats: session.stats,
      profile: session.profile,
      streakHistory: session.streakHistory,
    });
  } catch (error) {
    console.error('Error getting/creating session:', error);
    return res.status(500).json({ error: 'Failed to get session' });
  }
}

/**
 * Migrate localStorage data to database
 * Called once when user first connects with existing localStorage data
 */
export async function migrateLocalStorageData(req: Request, res: Response) {
  try {
    const { deviceId, data } = req.body;

    if (!deviceId || !data) {
      return res.status(400).json({ error: 'deviceId and data are required' });
    }

    // Get or create session
    let session = await prisma.userSession.findUnique({
      where: { deviceId },
    });

    if (!session) {
      session = await prisma.userSession.create({
        data: { deviceId },
      });
    }

    const results = {
      flashcards: 0,
      packs: 0,
      sessions: 0,
      dailyRecords: 0,
    };

    // Migrate flashcards
    if (data.flashcards && Array.isArray(data.flashcards)) {
      for (const card of data.flashcards) {
        try {
          await prisma.userFlashcard.upsert({
            where: {
              sessionId_sourceType_sourceId: {
                sessionId: session.id,
                sourceType: card.sourceType,
                sourceId: card.sourceId,
              },
            },
            update: {
              packIds: JSON.stringify(card.packIds || []),
              easeFactor: card.easeFactor || 2.5,
              interval: card.interval || 0,
              repetitions: card.repetitions || 0,
              nextReviewDate: card.nextReviewDate ? new Date(card.nextReviewDate) : null,
              lastReviewedAt: card.lastReviewedAt ? new Date(card.lastReviewedAt) : null,
            },
            create: {
              sessionId: session.id,
              sourceType: card.sourceType,
              sourceId: card.sourceId,
              packIds: JSON.stringify(card.packIds || []),
              easeFactor: card.easeFactor || 2.5,
              interval: card.interval || 0,
              repetitions: card.repetitions || 0,
              nextReviewDate: card.nextReviewDate ? new Date(card.nextReviewDate) : null,
              lastReviewedAt: card.lastReviewedAt ? new Date(card.lastReviewedAt) : null,
            },
          });
          results.flashcards++;
        } catch (err) {
          console.error('Error migrating flashcard:', err);
        }
      }
    }

    // Migrate packs
    if (data.packs && Array.isArray(data.packs)) {
      for (const pack of data.packs) {
        try {
          // Skip default packs
          if (pack.isDefault) continue;

          await prisma.userFlashcardPack.create({
            data: {
              sessionId: session.id,
              name: pack.name,
              description: pack.description,
              color: pack.color || '#3B82F6',
              isDefault: false,
            },
          });
          results.packs++;
        } catch (err) {
          console.error('Error migrating pack:', err);
        }
      }
    }

    // Migrate stats
    if (data.stats) {
      await prisma.userStudyStats.upsert({
        where: { sessionId: session.id },
        update: {
          totalCards: data.stats.totalCards || 0,
          cardsDueToday: data.stats.cardsDueToday || 0,
          cardsReviewedToday: data.stats.cardsReviewedToday || 0,
          currentStreak: data.stats.currentStreak || 0,
          longestStreak: data.stats.longestStreak || 0,
          masteredCards: data.stats.masteredCards || 0,
          lastStudyDate: data.stats.lastStudyDate ? new Date(data.stats.lastStudyDate) : null,
        },
        create: {
          sessionId: session.id,
          totalCards: data.stats.totalCards || 0,
          cardsDueToday: data.stats.cardsDueToday || 0,
          cardsReviewedToday: data.stats.cardsReviewedToday || 0,
          currentStreak: data.stats.currentStreak || 0,
          longestStreak: data.stats.longestStreak || 0,
          masteredCards: data.stats.masteredCards || 0,
          lastStudyDate: data.stats.lastStudyDate ? new Date(data.stats.lastStudyDate) : null,
        },
      });
    }

    // Migrate streak history
    if (data.streakHistory) {
      await prisma.userStreakHistory.upsert({
        where: { sessionId: session.id },
        update: {
          currentStreak: data.streakHistory.currentStreak || 0,
          longestStreak: data.streakHistory.longestStreak || 0,
          lastStudyDate: data.streakHistory.lastStudyDate
            ? new Date(data.streakHistory.lastStudyDate)
            : null,
          achievements: JSON.stringify(data.streakHistory.achievements || []),
        },
        create: {
          sessionId: session.id,
          currentStreak: data.streakHistory.currentStreak || 0,
          longestStreak: data.streakHistory.longestStreak || 0,
          lastStudyDate: data.streakHistory.lastStudyDate
            ? new Date(data.streakHistory.lastStudyDate)
            : null,
          achievements: JSON.stringify(data.streakHistory.achievements || []),
        },
      });
    }

    // Migrate profile
    if (data.profile) {
      await prisma.userProfile.upsert({
        where: { sessionId: session.id },
        update: {
          audienceType: data.profile.audienceType,
          expertiseLevel: data.profile.expertiseLevel,
          interests: JSON.stringify(data.profile.interests || []),
          completedOnboarding: data.profile.completedOnboarding || false,
        },
        create: {
          sessionId: session.id,
          audienceType: data.profile.audienceType,
          expertiseLevel: data.profile.expertiseLevel,
          interests: JSON.stringify(data.profile.interests || []),
          completedOnboarding: data.profile.completedOnboarding || false,
        },
      });
    }

    return res.json({
      message: 'Migration complete',
      sessionId: session.id,
      results,
    });
  } catch (error) {
    console.error('Error migrating localStorage data:', error);
    return res.status(500).json({ error: 'Failed to migrate data' });
  }
}
```

### 38.5 Create User Session Routes
- [ ] Create `server/src/routes/userSession.ts`

```typescript
// server/src/routes/userSession.ts
import { Router } from 'express';
import * as userSessionController from '../controllers/userSession';

const router = Router();

router.post('/session', userSessionController.getOrCreateSession);
router.post('/migrate', userSessionController.migrateLocalStorageData);

export default router;
```

---

## Phase 3: User Flashcard API

### 38.6 Create User Flashcard Controller
- [ ] Create `server/src/controllers/userFlashcards.ts`

```typescript
// server/src/controllers/userFlashcards.ts
import { Request, Response } from 'express';
import { prisma } from '../db';

/**
 * Get all user flashcards for a session
 */
export async function getUserFlashcards(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const { packId } = req.query;

    const session = await prisma.userSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const flashcards = await prisma.userFlashcard.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by pack if specified
    let filtered = flashcards;
    if (packId) {
      filtered = flashcards.filter((fc) => {
        const packs = JSON.parse(fc.packIds || '[]');
        return packs.includes(packId);
      });
    }

    const formattedCards = filtered.map((fc) => ({
      id: fc.id,
      sourceType: fc.sourceType,
      sourceId: fc.sourceId,
      packIds: JSON.parse(fc.packIds || '[]'),
      easeFactor: fc.easeFactor,
      interval: fc.interval,
      repetitions: fc.repetitions,
      nextReviewDate: fc.nextReviewDate?.toISOString() || null,
      lastReviewedAt: fc.lastReviewedAt?.toISOString() || null,
      createdAt: fc.createdAt.toISOString(),
    }));

    return res.json({ data: formattedCards });
  } catch (error) {
    console.error('Error getting user flashcards:', error);
    return res.status(500).json({ error: 'Failed to get flashcards' });
  }
}

/**
 * Get cards due for review
 */
export async function getDueCards(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;

    const dueCards = await prisma.userFlashcard.findMany({
      where: {
        sessionId,
        OR: [
          { nextReviewDate: null },
          { nextReviewDate: { lte: new Date() } },
        ],
      },
      orderBy: { nextReviewDate: 'asc' },
    });

    const formattedCards = dueCards.map((fc) => ({
      id: fc.id,
      sourceType: fc.sourceType,
      sourceId: fc.sourceId,
      packIds: JSON.parse(fc.packIds || '[]'),
      easeFactor: fc.easeFactor,
      interval: fc.interval,
      repetitions: fc.repetitions,
      nextReviewDate: fc.nextReviewDate?.toISOString() || null,
      lastReviewedAt: fc.lastReviewedAt?.toISOString() || null,
    }));

    return res.json({ data: formattedCards });
  } catch (error) {
    console.error('Error getting due cards:', error);
    return res.status(500).json({ error: 'Failed to get due cards' });
  }
}

/**
 * Add a flashcard to user's collection
 */
export async function addFlashcard(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const { sourceType, sourceId, packIds = [] } = req.body;

    if (!sourceType || !sourceId) {
      return res.status(400).json({ error: 'sourceType and sourceId are required' });
    }

    // Check if already exists
    const existing = await prisma.userFlashcard.findUnique({
      where: {
        sessionId_sourceType_sourceId: {
          sessionId,
          sourceType,
          sourceId,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'Flashcard already exists' });
    }

    const flashcard = await prisma.userFlashcard.create({
      data: {
        sessionId,
        sourceType,
        sourceId,
        packIds: JSON.stringify(packIds),
        nextReviewDate: new Date(), // Due immediately
      },
    });

    // Update stats
    await prisma.userStudyStats.update({
      where: { sessionId },
      data: {
        totalCards: { increment: 1 },
        cardsDueToday: { increment: 1 },
      },
    });

    return res.status(201).json({
      id: flashcard.id,
      sourceType: flashcard.sourceType,
      sourceId: flashcard.sourceId,
      packIds,
    });
  } catch (error) {
    console.error('Error adding flashcard:', error);
    return res.status(500).json({ error: 'Failed to add flashcard' });
  }
}

/**
 * Review a flashcard (SM-2 algorithm)
 */
export async function reviewFlashcard(req: Request, res: Response) {
  try {
    const { sessionId, cardId } = req.params;
    const { quality } = req.body; // 0-5 rating

    if (quality === undefined || quality < 0 || quality > 5) {
      return res.status(400).json({ error: 'quality must be 0-5' });
    }

    const flashcard = await prisma.userFlashcard.findFirst({
      where: { id: cardId, sessionId },
    });

    if (!flashcard) {
      return res.status(404).json({ error: 'Flashcard not found' });
    }

    // SM-2 algorithm
    let newEaseFactor = flashcard.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEaseFactor = Math.max(1.3, Math.min(3.0, newEaseFactor));

    let newInterval: number;
    let newRepetitions: number;

    if (quality < 3) {
      // Failed
      newRepetitions = 0;
      newInterval = 0;
    } else {
      // Success
      newRepetitions = flashcard.repetitions + 1;
      if (newRepetitions === 1) {
        newInterval = 1;
      } else if (newRepetitions === 2) {
        newInterval = 6;
      } else {
        newInterval = Math.round(flashcard.interval * newEaseFactor);
      }
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    const updated = await prisma.userFlashcard.update({
      where: { id: cardId },
      data: {
        easeFactor: newEaseFactor,
        interval: newInterval,
        repetitions: newRepetitions,
        nextReviewDate,
        lastReviewedAt: new Date(),
      },
    });

    // Update stats
    const isMastered = newInterval > 21;
    await prisma.userStudyStats.update({
      where: { sessionId },
      data: {
        cardsReviewedToday: { increment: 1 },
        lastStudyDate: new Date(),
        ...(isMastered && { masteredCards: { increment: 1 } }),
      },
    });

    return res.json({
      id: updated.id,
      easeFactor: updated.easeFactor,
      interval: updated.interval,
      repetitions: updated.repetitions,
      nextReviewDate: updated.nextReviewDate?.toISOString(),
    });
  } catch (error) {
    console.error('Error reviewing flashcard:', error);
    return res.status(500).json({ error: 'Failed to review flashcard' });
  }
}

/**
 * Remove a flashcard
 */
export async function removeFlashcard(req: Request, res: Response) {
  try {
    const { sessionId, cardId } = req.params;

    await prisma.userFlashcard.delete({
      where: { id: cardId },
    });

    // Update stats
    await prisma.userStudyStats.update({
      where: { sessionId },
      data: {
        totalCards: { decrement: 1 },
      },
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Error removing flashcard:', error);
    return res.status(500).json({ error: 'Failed to remove flashcard' });
  }
}
```

### 38.7 Create User Flashcard Routes
- [ ] Create `server/src/routes/userFlashcards.ts`

---

## Phase 4: Update Frontend Hooks

### 38.8 Create Session Context
- [ ] Create `src/contexts/SessionContext.tsx`

```typescript
// src/contexts/SessionContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDeviceId } from '@/lib/deviceId';
import { userSessionApi } from '@/services/api';

interface SessionContextType {
  sessionId: string | null;
  isLoading: boolean;
  error: Error | null;
}

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function initSession() {
      try {
        const deviceId = getDeviceId();
        const session = await userSessionApi.getOrCreateSession(deviceId);
        setSessionId(session.sessionId);

        // Check if we need to migrate localStorage data
        const migrated = localStorage.getItem('ai-timeline-data-migrated');
        if (!migrated) {
          await migrateLocalStorageData(deviceId);
          localStorage.setItem('ai-timeline-data-migrated', 'true');
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    initSession();
  }, []);

  return (
    <SessionContext.Provider value={{ sessionId, isLoading, error }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}

async function migrateLocalStorageData(deviceId: string) {
  // Collect all localStorage data
  const data = {
    flashcards: JSON.parse(localStorage.getItem('ai-timeline-flashcards') || '[]'),
    packs: JSON.parse(localStorage.getItem('ai-timeline-flashcard-packs') || '[]'),
    stats: JSON.parse(localStorage.getItem('ai-timeline-flashcard-stats') || '{}'),
    streakHistory: JSON.parse(localStorage.getItem('ai-timeline-flashcard-streak') || '{}'),
    profile: JSON.parse(localStorage.getItem('ai-timeline-user-profile') || '{}'),
  };

  // Only migrate if there's data
  if (data.flashcards.length > 0 || Object.keys(data.stats).length > 0) {
    await userSessionApi.migrateLocalStorageData(deviceId, data);
  }
}
```

### 38.9 Update Flashcard Hooks to Use API
- [ ] Refactor `src/hooks/useFlashcardContext.tsx` to use API

```typescript
// Replace localStorage operations with API calls
// Example:

// Before
function addCard(sourceType: string, sourceId: string) {
  const cards = JSON.parse(localStorage.getItem('ai-timeline-flashcards') || '[]');
  cards.push({ sourceType, sourceId, ... });
  localStorage.setItem('ai-timeline-flashcards', JSON.stringify(cards));
}

// After
async function addCard(sourceType: string, sourceId: string) {
  await userFlashcardsApi.addFlashcard(sessionId, sourceType, sourceId);
  // React Query will invalidate and refetch
}
```

### 38.10 Update Study Components
- [ ] Update all study-related components to use API hooks
- [ ] Handle loading states during API calls
- [ ] Add offline fallback (optional)

---

## Phase 5: Learning Progress API

### 38.11 Create Path Progress Controller
- [ ] Create `server/src/controllers/userProgress.ts`

```typescript
// Endpoints for learning path and checkpoint progress
export async function getPathProgress(req: Request, res: Response) { ... }
export async function updatePathProgress(req: Request, res: Response) { ... }
export async function getCheckpointProgress(req: Request, res: Response) { ... }
export async function submitCheckpoint(req: Request, res: Response) { ... }
```

### 38.12 Create Progress Routes
- [ ] Create `server/src/routes/userProgress.ts`

---

## Phase 6: Deploy & Test (Production Only)

**Note**: Skip local testing. Deploy directly to AWS and test on production.

### 38.13 Deploy to Production
- [ ] Build and deploy Lambda: `cd infra && sam build && sam deploy --no-confirm-changeset`
- [ ] Build and deploy frontend: `npm run build && aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete`
- [ ] Invalidate CloudFront: `aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"`
- [ ] Run database migrations via admin API endpoints

### 38.14 Verify on Production
- [ ] Test with existing localStorage data migrates correctly
- [ ] Test that app works with fresh session (no localStorage)
- [ ] Test cross-device sync (login on different browser)
- [ ] Monitor CloudWatch for errors

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `prisma/schema.prisma` | MODIFY | Add user data models |
| `src/lib/deviceId.ts` | NEW | Device ID generation |
| `src/contexts/SessionContext.tsx` | NEW | Session management |
| `server/src/controllers/userSession.ts` | NEW | Session controller |
| `server/src/controllers/userFlashcards.ts` | NEW | User flashcards controller |
| `server/src/controllers/userProgress.ts` | NEW | Progress controller |
| `server/src/routes/userSession.ts` | NEW | Session routes |
| `server/src/routes/userFlashcards.ts` | NEW | User flashcards routes |
| `server/src/routes/userProgress.ts` | NEW | Progress routes |
| `src/services/api.ts` | MODIFY | Add user API clients |
| `src/hooks/useFlashcardContext.tsx` | REWRITE | Use API instead of localStorage |
| `src/App.tsx` | MODIFY | Add SessionProvider |
| `package.json` | MODIFY | Add dependencies |

---

## Success Criteria

- [ ] User sessions persist across page refreshes
- [ ] Existing localStorage data migrates automatically
- [ ] New flashcard additions save to database
- [ ] SM-2 review data persists correctly
- [ ] Study statistics track correctly
- [ ] Streak calculations work with database
- [ ] Cross-device sync works (same device ID)
- [ ] No regression in study experience
- [ ] App works for new users with no localStorage

---

## Rollback Plan

1. **API errors**: Keep localStorage as fallback
2. **Migration fails**: Allow re-migration attempt
3. **Performance issues**: Add caching layer

---

## Future Enhancements (Not This Sprint)

- [ ] User authentication (email/password, OAuth)
- [ ] Account linking (merge anonymous sessions)
- [ ] Social features (share decks, leaderboards)
- [ ] Export/import user data
- [ ] GDPR data deletion
