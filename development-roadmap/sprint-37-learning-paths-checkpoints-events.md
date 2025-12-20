# Sprint 37: Learning Paths, Checkpoints & Current Events Migration

**Impact**: High | **Effort**: High | **Dependencies**: Sprint 36 (Flashcards Migration)

## Overview

Migrate the remaining content types from static JSON to database with full CRUD APIs:
- **Learning Paths**: Curated milestone sequences (10 paths, ~40KB)
- **Checkpoints**: Quiz questions for learning paths (~58KB)
- **Current Events**: AI news connected to milestones (~15KB)

These content types are interconnected - learning paths reference milestones, checkpoints reference learning paths and milestones, and current events reference milestones.

---

## Current State Analysis

| Content Type | Static File | Records | DB Model | API |
|--------------|-------------|---------|----------|-----|
| Learning Paths | `src/content/learning-paths/*.json` | 10 paths | ❌ None | ❌ None |
| Checkpoints | `src/content/checkpoints/questions.json` | ~20 checkpoints | ❌ None | ❌ None |
| Current Events | `src/content/current-events/events.json` | ~15 events | ❌ None | ❌ None |

---

## Phase 1: Database Schema Design

### 37.1 Add Learning Path Models to Prisma Schema
- [ ] Update `prisma/schema.prisma`

```prisma
/// Learning path - curated sequence of milestones
model LearningPath {
  id                   String   @id @default(cuid())
  slug                 String   @unique // URL-friendly ID (e.g., "chatgpt-story")
  title                String
  description          String
  targetAudience       String
  milestoneIds         String   @default("[]") // JSON array of milestone IDs
  estimatedMinutes     Int
  difficulty           String   // beginner, intermediate, advanced
  suggestedNextPathIds String   @default("[]") // JSON array
  keyTakeaways         String   @default("[]") // JSON array
  conceptsCovered      String   @default("[]") // JSON array
  icon                 String?  // Emoji or icon name
  sortOrder            Int      @default(0)
  isPublished          Boolean  @default(true)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  checkpoints          Checkpoint[]

  @@index([slug])
  @@index([difficulty])
  @@index([isPublished])
}

/// Checkpoint - quiz/knowledge check within a learning path
model Checkpoint {
  id                String       @id @default(cuid())
  title             String
  pathId            String
  path              LearningPath @relation(fields: [pathId], references: [id], onDelete: Cascade)
  afterMilestoneId  String       // Milestone ID this checkpoint follows
  questions         String       // JSON array of Question objects
  sortOrder         Int          @default(0)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  @@index([pathId])
  @@index([afterMilestoneId])
}

/// Current event - AI news connected to historical milestones
model CurrentEvent {
  id                      String    @id @default(cuid())
  headline                String
  summary                 String
  sourceUrl               String?
  sourcePublisher         String?
  publishedDate           DateTime
  prerequisiteMilestoneIds String   @default("[]") // JSON array
  connectionExplanation   String
  featured                Boolean   @default(false)
  expiresAt               DateTime?
  isPublished             Boolean   @default(true)
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  @@index([featured])
  @@index([publishedDate])
  @@index([isPublished])
  @@index([expiresAt])
}
```

### 37.2 Run Database Migration
- [ ] Run migration: `npx prisma migrate dev --name add_learning_paths_checkpoints_events`
- [ ] Verify tables created in local database
- [ ] Run migration on production database

---

## Phase 2: Learning Path API

### 37.3 Create Learning Path Controller
- [ ] Create `server/src/controllers/learningPaths.ts`

```typescript
// server/src/controllers/learningPaths.ts
import { Request, Response } from 'express';
import { prisma } from '../db';

/**
 * Get all learning paths
 */
export async function getAllPaths(req: Request, res: Response) {
  try {
    const { difficulty, published = 'true' } = req.query;

    const where: Record<string, unknown> = {};

    if (published === 'true') {
      where.isPublished = true;
    }

    if (difficulty) {
      where.difficulty = difficulty as string;
    }

    const paths = await prisma.learningPath.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    // Parse JSON fields
    const formattedPaths = paths.map((path) => ({
      id: path.slug, // Use slug as public ID for backwards compatibility
      ...path,
      milestoneIds: JSON.parse(path.milestoneIds || '[]'),
      suggestedNextPathIds: JSON.parse(path.suggestedNextPathIds || '[]'),
      keyTakeaways: JSON.parse(path.keyTakeaways || '[]'),
      conceptsCovered: JSON.parse(path.conceptsCovered || '[]'),
    }));

    return res.json({ data: formattedPaths });
  } catch (error) {
    console.error('Error getting learning paths:', error);
    return res.status(500).json({ error: 'Failed to get learning paths' });
  }
}

/**
 * Get a single learning path by slug
 */
export async function getPathBySlug(req: Request, res: Response) {
  try {
    const { slug } = req.params;

    const path = await prisma.learningPath.findUnique({
      where: { slug },
      include: {
        checkpoints: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!path) {
      return res.status(404).json({ error: 'Learning path not found' });
    }

    // Parse JSON fields
    const formattedPath = {
      id: path.slug,
      ...path,
      milestoneIds: JSON.parse(path.milestoneIds || '[]'),
      suggestedNextPathIds: JSON.parse(path.suggestedNextPathIds || '[]'),
      keyTakeaways: JSON.parse(path.keyTakeaways || '[]'),
      conceptsCovered: JSON.parse(path.conceptsCovered || '[]'),
      checkpoints: path.checkpoints.map((cp) => ({
        ...cp,
        questions: JSON.parse(cp.questions || '[]'),
      })),
    };

    return res.json(formattedPath);
  } catch (error) {
    console.error('Error getting learning path:', error);
    return res.status(500).json({ error: 'Failed to get learning path' });
  }
}

/**
 * Get paths by difficulty
 */
export async function getPathsByDifficulty(req: Request, res: Response) {
  try {
    const { difficulty } = req.params;

    const paths = await prisma.learningPath.findMany({
      where: {
        difficulty,
        isPublished: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    const formattedPaths = paths.map((path) => ({
      id: path.slug,
      ...path,
      milestoneIds: JSON.parse(path.milestoneIds || '[]'),
      suggestedNextPathIds: JSON.parse(path.suggestedNextPathIds || '[]'),
      keyTakeaways: JSON.parse(path.keyTakeaways || '[]'),
      conceptsCovered: JSON.parse(path.conceptsCovered || '[]'),
    }));

    return res.json({ data: formattedPaths });
  } catch (error) {
    console.error('Error getting paths by difficulty:', error);
    return res.status(500).json({ error: 'Failed to get learning paths' });
  }
}

/**
 * Create a learning path (admin only)
 */
export async function createPath(req: Request, res: Response) {
  try {
    const {
      slug,
      title,
      description,
      targetAudience,
      milestoneIds = [],
      estimatedMinutes,
      difficulty,
      suggestedNextPathIds = [],
      keyTakeaways = [],
      conceptsCovered = [],
      icon,
      sortOrder = 0,
    } = req.body;

    if (!slug || !title || !description || !targetAudience || !estimatedMinutes || !difficulty) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const path = await prisma.learningPath.create({
      data: {
        slug,
        title,
        description,
        targetAudience,
        milestoneIds: JSON.stringify(milestoneIds),
        estimatedMinutes,
        difficulty,
        suggestedNextPathIds: JSON.stringify(suggestedNextPathIds),
        keyTakeaways: JSON.stringify(keyTakeaways),
        conceptsCovered: JSON.stringify(conceptsCovered),
        icon,
        sortOrder,
      },
    });

    return res.status(201).json({
      id: path.slug,
      ...path,
      milestoneIds,
      suggestedNextPathIds,
      keyTakeaways,
      conceptsCovered,
    });
  } catch (error) {
    console.error('Error creating learning path:', error);
    return res.status(500).json({ error: 'Failed to create learning path' });
  }
}

/**
 * Update a learning path (admin only)
 */
export async function updatePath(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const updateData = req.body;

    const existing = await prisma.learningPath.findUnique({ where: { slug } });
    if (!existing) {
      return res.status(404).json({ error: 'Learning path not found' });
    }

    // Build update object
    const data: Record<string, unknown> = {};
    if (updateData.title) data.title = updateData.title;
    if (updateData.description) data.description = updateData.description;
    if (updateData.targetAudience) data.targetAudience = updateData.targetAudience;
    if (updateData.milestoneIds) data.milestoneIds = JSON.stringify(updateData.milestoneIds);
    if (updateData.estimatedMinutes) data.estimatedMinutes = updateData.estimatedMinutes;
    if (updateData.difficulty) data.difficulty = updateData.difficulty;
    if (updateData.suggestedNextPathIds) data.suggestedNextPathIds = JSON.stringify(updateData.suggestedNextPathIds);
    if (updateData.keyTakeaways) data.keyTakeaways = JSON.stringify(updateData.keyTakeaways);
    if (updateData.conceptsCovered) data.conceptsCovered = JSON.stringify(updateData.conceptsCovered);
    if (updateData.icon !== undefined) data.icon = updateData.icon;
    if (updateData.sortOrder !== undefined) data.sortOrder = updateData.sortOrder;
    if (updateData.isPublished !== undefined) data.isPublished = updateData.isPublished;

    const path = await prisma.learningPath.update({
      where: { slug },
      data,
    });

    return res.json({
      id: path.slug,
      ...path,
      milestoneIds: JSON.parse(path.milestoneIds || '[]'),
      suggestedNextPathIds: JSON.parse(path.suggestedNextPathIds || '[]'),
      keyTakeaways: JSON.parse(path.keyTakeaways || '[]'),
      conceptsCovered: JSON.parse(path.conceptsCovered || '[]'),
    });
  } catch (error) {
    console.error('Error updating learning path:', error);
    return res.status(500).json({ error: 'Failed to update learning path' });
  }
}

/**
 * Delete a learning path (admin only)
 */
export async function deletePath(req: Request, res: Response) {
  try {
    const { slug } = req.params;

    await prisma.learningPath.delete({ where: { slug } });

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting learning path:', error);
    return res.status(500).json({ error: 'Failed to delete learning path' });
  }
}
```

### 37.4 Create Learning Path Routes
- [ ] Create `server/src/routes/learningPaths.ts`

```typescript
// server/src/routes/learningPaths.ts
import { Router } from 'express';
import * as learningPathsController from '../controllers/learningPaths';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', learningPathsController.getAllPaths);
router.get('/difficulty/:difficulty', learningPathsController.getPathsByDifficulty);
router.get('/:slug', learningPathsController.getPathBySlug);

export default router;

// Admin routes
export const adminRouter = Router();

adminRouter.post('/', requireAdmin, learningPathsController.createPath);
adminRouter.put('/:slug', requireAdmin, learningPathsController.updatePath);
adminRouter.delete('/:slug', requireAdmin, learningPathsController.deletePath);
```

---

## Phase 3: Checkpoint API

### 37.5 Create Checkpoint Controller
- [ ] Create `server/src/controllers/checkpoints.ts`

```typescript
// server/src/controllers/checkpoints.ts
import { Request, Response } from 'express';
import { prisma } from '../db';

/**
 * Get checkpoints for a learning path
 */
export async function getCheckpointsForPath(req: Request, res: Response) {
  try {
    const { pathSlug } = req.params;

    const path = await prisma.learningPath.findUnique({
      where: { slug: pathSlug },
    });

    if (!path) {
      return res.status(404).json({ error: 'Learning path not found' });
    }

    const checkpoints = await prisma.checkpoint.findMany({
      where: { pathId: path.id },
      orderBy: { sortOrder: 'asc' },
    });

    const formattedCheckpoints = checkpoints.map((cp) => ({
      ...cp,
      pathId: pathSlug, // Use slug for frontend compatibility
      questions: JSON.parse(cp.questions || '[]'),
    }));

    return res.json({ data: formattedCheckpoints });
  } catch (error) {
    console.error('Error getting checkpoints:', error);
    return res.status(500).json({ error: 'Failed to get checkpoints' });
  }
}

/**
 * Get a single checkpoint by ID
 */
export async function getCheckpointById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const checkpoint = await prisma.checkpoint.findUnique({
      where: { id },
      include: { path: true },
    });

    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }

    return res.json({
      ...checkpoint,
      pathId: checkpoint.path.slug,
      questions: JSON.parse(checkpoint.questions || '[]'),
    });
  } catch (error) {
    console.error('Error getting checkpoint:', error);
    return res.status(500).json({ error: 'Failed to get checkpoint' });
  }
}

/**
 * Create a checkpoint (admin only)
 */
export async function createCheckpoint(req: Request, res: Response) {
  try {
    const { title, pathSlug, afterMilestoneId, questions = [], sortOrder = 0 } = req.body;

    if (!title || !pathSlug || !afterMilestoneId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const path = await prisma.learningPath.findUnique({
      where: { slug: pathSlug },
    });

    if (!path) {
      return res.status(404).json({ error: 'Learning path not found' });
    }

    const checkpoint = await prisma.checkpoint.create({
      data: {
        title,
        pathId: path.id,
        afterMilestoneId,
        questions: JSON.stringify(questions),
        sortOrder,
      },
    });

    return res.status(201).json({
      ...checkpoint,
      pathId: pathSlug,
      questions,
    });
  } catch (error) {
    console.error('Error creating checkpoint:', error);
    return res.status(500).json({ error: 'Failed to create checkpoint' });
  }
}

/**
 * Update a checkpoint (admin only)
 */
export async function updateCheckpoint(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { title, afterMilestoneId, questions, sortOrder } = req.body;

    const existing = await prisma.checkpoint.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }

    const data: Record<string, unknown> = {};
    if (title) data.title = title;
    if (afterMilestoneId) data.afterMilestoneId = afterMilestoneId;
    if (questions) data.questions = JSON.stringify(questions);
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const checkpoint = await prisma.checkpoint.update({
      where: { id },
      data,
      include: { path: true },
    });

    return res.json({
      ...checkpoint,
      pathId: checkpoint.path.slug,
      questions: JSON.parse(checkpoint.questions || '[]'),
    });
  } catch (error) {
    console.error('Error updating checkpoint:', error);
    return res.status(500).json({ error: 'Failed to update checkpoint' });
  }
}

/**
 * Delete a checkpoint (admin only)
 */
export async function deleteCheckpoint(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.checkpoint.delete({ where: { id } });

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting checkpoint:', error);
    return res.status(500).json({ error: 'Failed to delete checkpoint' });
  }
}
```

### 37.6 Create Checkpoint Routes
- [ ] Create `server/src/routes/checkpoints.ts`

---

## Phase 4: Current Events API

### 37.7 Create Current Events Controller
- [ ] Create `server/src/controllers/currentEvents.ts`

```typescript
// server/src/controllers/currentEvents.ts
import { Request, Response } from 'express';
import { prisma } from '../db';

/**
 * Get all current events (excluding expired by default)
 */
export async function getAllEvents(req: Request, res: Response) {
  try {
    const { includeExpired = 'false', featured } = req.query;

    const where: Record<string, unknown> = {
      isPublished: true,
    };

    // Exclude expired events by default
    if (includeExpired !== 'true') {
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];
    }

    if (featured === 'true') {
      where.featured = true;
    }

    const events = await prisma.currentEvent.findMany({
      where,
      orderBy: { publishedDate: 'desc' },
    });

    const formattedEvents = events.map((event) => ({
      ...event,
      publishedDate: event.publishedDate.toISOString().split('T')[0],
      expiresAt: event.expiresAt?.toISOString().split('T')[0] || null,
      prerequisiteMilestoneIds: JSON.parse(event.prerequisiteMilestoneIds || '[]'),
    }));

    return res.json({ data: formattedEvents });
  } catch (error) {
    console.error('Error getting current events:', error);
    return res.status(500).json({ error: 'Failed to get current events' });
  }
}

/**
 * Get featured current events
 */
export async function getFeaturedEvents(req: Request, res: Response) {
  try {
    const events = await prisma.currentEvent.findMany({
      where: {
        isPublished: true,
        featured: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { publishedDate: 'desc' },
      take: 5,
    });

    const formattedEvents = events.map((event) => ({
      ...event,
      publishedDate: event.publishedDate.toISOString().split('T')[0],
      expiresAt: event.expiresAt?.toISOString().split('T')[0] || null,
      prerequisiteMilestoneIds: JSON.parse(event.prerequisiteMilestoneIds || '[]'),
    }));

    return res.json({ data: formattedEvents });
  } catch (error) {
    console.error('Error getting featured events:', error);
    return res.status(500).json({ error: 'Failed to get featured events' });
  }
}

/**
 * Get events related to a milestone
 */
export async function getEventsForMilestone(req: Request, res: Response) {
  try {
    const { milestoneId } = req.params;

    // Get all active events and filter by milestone
    const events = await prisma.currentEvent.findMany({
      where: {
        isPublished: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { publishedDate: 'desc' },
    });

    // Filter events that reference this milestone
    const relatedEvents = events.filter((event) => {
      const milestoneIds = JSON.parse(event.prerequisiteMilestoneIds || '[]');
      return milestoneIds.includes(milestoneId);
    });

    const formattedEvents = relatedEvents.map((event) => ({
      ...event,
      publishedDate: event.publishedDate.toISOString().split('T')[0],
      expiresAt: event.expiresAt?.toISOString().split('T')[0] || null,
      prerequisiteMilestoneIds: JSON.parse(event.prerequisiteMilestoneIds || '[]'),
    }));

    return res.json({ data: formattedEvents });
  } catch (error) {
    console.error('Error getting events for milestone:', error);
    return res.status(500).json({ error: 'Failed to get events' });
  }
}

/**
 * Get a single event by ID
 */
export async function getEventById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const event = await prisma.currentEvent.findUnique({
      where: { id },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.json({
      ...event,
      publishedDate: event.publishedDate.toISOString().split('T')[0],
      expiresAt: event.expiresAt?.toISOString().split('T')[0] || null,
      prerequisiteMilestoneIds: JSON.parse(event.prerequisiteMilestoneIds || '[]'),
    });
  } catch (error) {
    console.error('Error getting event:', error);
    return res.status(500).json({ error: 'Failed to get event' });
  }
}

/**
 * Create a current event (admin only)
 */
export async function createEvent(req: Request, res: Response) {
  try {
    const {
      headline,
      summary,
      sourceUrl,
      sourcePublisher,
      publishedDate,
      prerequisiteMilestoneIds = [],
      connectionExplanation,
      featured = false,
      expiresAt,
    } = req.body;

    if (!headline || !summary || !publishedDate || !connectionExplanation) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const event = await prisma.currentEvent.create({
      data: {
        headline,
        summary,
        sourceUrl,
        sourcePublisher,
        publishedDate: new Date(publishedDate),
        prerequisiteMilestoneIds: JSON.stringify(prerequisiteMilestoneIds),
        connectionExplanation,
        featured,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return res.status(201).json({
      ...event,
      publishedDate: event.publishedDate.toISOString().split('T')[0],
      expiresAt: event.expiresAt?.toISOString().split('T')[0] || null,
      prerequisiteMilestoneIds,
    });
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ error: 'Failed to create event' });
  }
}

// ... Add update and delete methods
```

### 37.8 Create Current Events Routes
- [ ] Create `server/src/routes/currentEvents.ts`

```typescript
// server/src/routes/currentEvents.ts
import { Router } from 'express';
import * as currentEventsController from '../controllers/currentEvents';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', currentEventsController.getAllEvents);
router.get('/featured', currentEventsController.getFeaturedEvents);
router.get('/milestone/:milestoneId', currentEventsController.getEventsForMilestone);
router.get('/:id', currentEventsController.getEventById);

export default router;

// Admin routes
export const adminRouter = Router();

adminRouter.post('/', requireAdmin, currentEventsController.createEvent);
adminRouter.put('/:id', requireAdmin, currentEventsController.updateEvent);
adminRouter.delete('/:id', requireAdmin, currentEventsController.deleteEvent);
```

---

## Phase 5: Seed Data

### 37.9 Create Learning Paths Seed Script
- [ ] Create `scripts/seed-learning-paths.ts`

```typescript
// scripts/seed-learning-paths.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const LEARNING_PATHS_DIR = path.join(__dirname, '../src/content/learning-paths');

interface LearningPathJson {
  id: string;
  title: string;
  description: string;
  targetAudience: string;
  milestoneIds: string[];
  estimatedMinutes: number;
  difficulty: string;
  suggestedNextPathIds: string[];
  keyTakeaways: string[];
  conceptsCovered: string[];
  icon?: string;
}

async function seedLearningPaths() {
  console.log('Seeding learning paths...');

  const files = fs.readdirSync(LEARNING_PATHS_DIR).filter(f => f.endsWith('.json'));

  let created = 0;
  let updated = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(LEARNING_PATHS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data: LearningPathJson = JSON.parse(content);

    const existing = await prisma.learningPath.findUnique({
      where: { slug: data.id },
    });

    const pathData = {
      slug: data.id,
      title: data.title,
      description: data.description,
      targetAudience: data.targetAudience,
      milestoneIds: JSON.stringify(data.milestoneIds),
      estimatedMinutes: data.estimatedMinutes,
      difficulty: data.difficulty,
      suggestedNextPathIds: JSON.stringify(data.suggestedNextPathIds || []),
      keyTakeaways: JSON.stringify(data.keyTakeaways),
      conceptsCovered: JSON.stringify(data.conceptsCovered),
      icon: data.icon || null,
      sortOrder: i,
    };

    if (existing) {
      await prisma.learningPath.update({
        where: { slug: data.id },
        data: pathData,
      });
      updated++;
    } else {
      await prisma.learningPath.create({
        data: pathData,
      });
      created++;
    }

    console.log(`Processed: ${data.title}`);
  }

  console.log(`\nLearning paths seed complete:`);
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
}

seedLearningPaths()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### 37.10 Create Checkpoints Seed Script
- [ ] Create `scripts/seed-checkpoints.ts`

```typescript
// scripts/seed-checkpoints.ts
import { PrismaClient } from '@prisma/client';
import checkpointsData from '../src/content/checkpoints/questions.json';

const prisma = new PrismaClient();

interface CheckpointJson {
  id: string;
  title: string;
  pathId: string;
  afterMilestoneId: string;
  questions: unknown[];
}

async function seedCheckpoints() {
  console.log('Seeding checkpoints...');

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < (checkpointsData as CheckpointJson[]).length; i++) {
    const cp = (checkpointsData as CheckpointJson[])[i];

    // Find the learning path by slug
    const path = await prisma.learningPath.findUnique({
      where: { slug: cp.pathId },
    });

    if (!path) {
      console.log(`Skipping checkpoint "${cp.title}" - path "${cp.pathId}" not found`);
      skipped++;
      continue;
    }

    // Check for existing checkpoint
    const existing = await prisma.checkpoint.findFirst({
      where: {
        pathId: path.id,
        afterMilestoneId: cp.afterMilestoneId,
      },
    });

    if (existing) {
      console.log(`Skipping checkpoint "${cp.title}" - already exists`);
      skipped++;
      continue;
    }

    await prisma.checkpoint.create({
      data: {
        title: cp.title,
        pathId: path.id,
        afterMilestoneId: cp.afterMilestoneId,
        questions: JSON.stringify(cp.questions),
        sortOrder: i,
      },
    });

    console.log(`Created: ${cp.title}`);
    created++;
  }

  console.log(`\nCheckpoints seed complete:`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
}

seedCheckpoints()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### 37.11 Create Current Events Seed Script
- [ ] Create `scripts/seed-current-events.ts`

```typescript
// scripts/seed-current-events.ts
import { PrismaClient } from '@prisma/client';
import eventsData from '../src/content/current-events/events.json';

const prisma = new PrismaClient();

interface EventJson {
  id: string;
  headline: string;
  summary: string;
  sourceUrl?: string;
  sourcePublisher?: string;
  publishedDate: string;
  prerequisiteMilestoneIds: string[];
  connectionExplanation: string;
  featured: boolean;
  expiresAt?: string;
}

async function seedCurrentEvents() {
  console.log('Seeding current events...');

  let created = 0;
  let skipped = 0;

  for (const event of eventsData as EventJson[]) {
    // Check for existing by headline (unique enough)
    const existing = await prisma.currentEvent.findFirst({
      where: { headline: event.headline },
    });

    if (existing) {
      console.log(`Skipping: ${event.headline.substring(0, 50)}...`);
      skipped++;
      continue;
    }

    await prisma.currentEvent.create({
      data: {
        headline: event.headline,
        summary: event.summary,
        sourceUrl: event.sourceUrl || null,
        sourcePublisher: event.sourcePublisher || null,
        publishedDate: new Date(event.publishedDate),
        prerequisiteMilestoneIds: JSON.stringify(event.prerequisiteMilestoneIds),
        connectionExplanation: event.connectionExplanation,
        featured: event.featured,
        expiresAt: event.expiresAt ? new Date(event.expiresAt) : null,
      },
    });

    console.log(`Created: ${event.headline.substring(0, 50)}...`);
    created++;
  }

  console.log(`\nCurrent events seed complete:`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
}

seedCurrentEvents()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### 37.12 Add Scripts to package.json and Run
- [ ] Add to package.json:
```json
{
  "scripts": {
    "db:seed:learning-paths": "npx tsx scripts/seed-learning-paths.ts",
    "db:seed:checkpoints": "npx tsx scripts/seed-checkpoints.ts",
    "db:seed:current-events": "npx tsx scripts/seed-current-events.ts",
    "db:seed:all": "npm run db:seed:milestones && npm run db:seed:glossary && npm run db:seed:flashcards && npm run db:seed:learning-paths && npm run db:seed:checkpoints && npm run db:seed:current-events"
  }
}
```
- [ ] Run seeds locally
- [ ] Run seeds on production

---

## Phase 6: Update Frontend

### 37.13 Create API Clients
- [ ] Add to `src/services/api.ts`

```typescript
// Add to src/services/api.ts

export interface LearningPath {
  id: string;
  slug: string;
  title: string;
  description: string;
  targetAudience: string;
  milestoneIds: string[];
  estimatedMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  suggestedNextPathIds: string[];
  keyTakeaways: string[];
  conceptsCovered: string[];
  icon?: string;
}

export interface Checkpoint {
  id: string;
  title: string;
  pathId: string;
  afterMilestoneId: string;
  questions: Question[];
}

export interface CurrentEvent {
  id: string;
  headline: string;
  summary: string;
  sourceUrl?: string;
  sourcePublisher?: string;
  publishedDate: string;
  prerequisiteMilestoneIds: string[];
  connectionExplanation: string;
  featured: boolean;
  expiresAt?: string;
}

export const learningPathsApi = {
  async getAll(): Promise<{ data: LearningPath[] }> {
    return fetchJson<{ data: LearningPath[] }>(`${DYNAMIC_API_BASE}/learning-paths`);
  },

  async getBySlug(slug: string): Promise<LearningPath & { checkpoints: Checkpoint[] }> {
    return fetchJson<LearningPath & { checkpoints: Checkpoint[] }>(
      `${DYNAMIC_API_BASE}/learning-paths/${slug}`
    );
  },

  async getByDifficulty(difficulty: string): Promise<{ data: LearningPath[] }> {
    return fetchJson<{ data: LearningPath[] }>(
      `${DYNAMIC_API_BASE}/learning-paths/difficulty/${difficulty}`
    );
  },
};

export const checkpointsApi = {
  async getForPath(pathSlug: string): Promise<{ data: Checkpoint[] }> {
    return fetchJson<{ data: Checkpoint[] }>(
      `${DYNAMIC_API_BASE}/checkpoints/path/${pathSlug}`
    );
  },

  async getById(id: string): Promise<Checkpoint> {
    return fetchJson<Checkpoint>(`${DYNAMIC_API_BASE}/checkpoints/${id}`);
  },
};

export const currentEventsApi = {
  async getAll(includeExpired?: boolean): Promise<{ data: CurrentEvent[] }> {
    const params = includeExpired ? '?includeExpired=true' : '';
    return fetchJson<{ data: CurrentEvent[] }>(
      `${DYNAMIC_API_BASE}/current-events${params}`
    );
  },

  async getFeatured(): Promise<{ data: CurrentEvent[] }> {
    return fetchJson<{ data: CurrentEvent[] }>(
      `${DYNAMIC_API_BASE}/current-events/featured`
    );
  },

  async getForMilestone(milestoneId: string): Promise<{ data: CurrentEvent[] }> {
    return fetchJson<{ data: CurrentEvent[] }>(
      `${DYNAMIC_API_BASE}/current-events/milestone/${milestoneId}`
    );
  },

  async getById(id: string): Promise<CurrentEvent> {
    return fetchJson<CurrentEvent>(`${DYNAMIC_API_BASE}/current-events/${id}`);
  },
};
```

### 37.14 Create React Query Hooks
- [ ] Create `src/hooks/useLearningPaths.ts`
- [ ] Create `src/hooks/useCheckpoints.ts`
- [ ] Create `src/hooks/useCurrentEvents.ts`

### 37.15 Update Frontend Components
- [ ] Update `LearningPathsPage.tsx` to use API
- [ ] Update `LearningPathDetailPage.tsx` to use API
- [ ] Update checkpoint components
- [ ] Update `NewsPage.tsx` / current events components
- [ ] Remove all static imports from `@/content`

---

## Phase 7: Register Routes & Deploy

### 37.16 Register All New Routes
- [ ] Update `server/src/app.ts`

```typescript
import learningPathsRouter, { adminRouter as learningPathsAdminRouter } from './routes/learningPaths';
import checkpointsRouter, { adminRouter as checkpointsAdminRouter } from './routes/checkpoints';
import currentEventsRouter, { adminRouter as currentEventsAdminRouter } from './routes/currentEvents';

// Public routes
app.use('/api/learning-paths', learningPathsRouter);
app.use('/api/checkpoints', checkpointsRouter);
app.use('/api/current-events', currentEventsRouter);

// Admin routes
app.use('/api/admin/learning-paths', learningPathsAdminRouter);
app.use('/api/admin/checkpoints', checkpointsAdminRouter);
app.use('/api/admin/current-events', currentEventsAdminRouter);
```

### 37.17 Deploy and Test (Production Only)

**Note**: Skip local testing. Deploy directly to AWS and test on production.

- [ ] Build and deploy Lambda: `cd infra && sam build && sam deploy --no-confirm-changeset`
- [ ] Build and deploy frontend: `npm run build && aws s3 sync dist/ s3://ai-timeline-frontend-1765916222/ --delete`
- [ ] Invalidate CloudFront: `aws cloudfront create-invalidation --distribution-id E23Z9QNRPDI3HW --paths "/*"`
- [ ] Run seed/migration scripts via admin API endpoints
- [ ] Verify all functionality on production site

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `prisma/schema.prisma` | MODIFY | Add LearningPath, Checkpoint, CurrentEvent models |
| `scripts/seed-learning-paths.ts` | NEW | Learning paths seed script |
| `scripts/seed-checkpoints.ts` | NEW | Checkpoints seed script |
| `scripts/seed-current-events.ts` | NEW | Current events seed script |
| `server/src/controllers/learningPaths.ts` | NEW | Learning paths controller |
| `server/src/controllers/checkpoints.ts` | NEW | Checkpoints controller |
| `server/src/controllers/currentEvents.ts` | NEW | Current events controller |
| `server/src/routes/learningPaths.ts` | NEW | Learning paths routes |
| `server/src/routes/checkpoints.ts` | NEW | Checkpoints routes |
| `server/src/routes/currentEvents.ts` | NEW | Current events routes |
| `server/src/app.ts` | MODIFY | Register new routes |
| `src/services/api.ts` | MODIFY | Add API clients |
| `src/hooks/useLearningPaths.ts` | NEW | React Query hooks |
| `src/hooks/useCheckpoints.ts` | NEW | React Query hooks |
| `src/hooks/useCurrentEvents.ts` | NEW | React Query hooks |
| `src/pages/LearningPathsPage.tsx` | MODIFY | Use API |
| `src/pages/NewsPage.tsx` | MODIFY | Use API |
| `package.json` | MODIFY | Add seed scripts |

---

## Success Criteria

- [ ] Learning paths load from database API
- [ ] Checkpoints load with learning path data
- [ ] Current events load from database API
- [ ] Expired events are filtered by default
- [ ] Featured events endpoint works
- [ ] All existing data seeded to database
- [ ] Admin can create/edit/delete all content types
- [ ] No regressions in learning path experience
- [ ] No regressions in checkpoint quizzes
- [ ] No regressions in news/current events

---

## Rollback Plan

1. **API errors**: Keep static loader functions temporarily for fallback
2. **Missing data**: Re-run seed scripts
3. **Database issues**: Prisma migrations can be rolled back

---

## Notes

- Learning paths reference milestones by ID - ensure milestones are seeded first
- Checkpoints depend on learning paths - seed order matters
- Current events have expiration logic - ensure timezone handling is correct
- Consider caching for learning paths (they change infrequently)
