# Learning Paths Development Plan

> **Created**: 2026-01-16
> **Status**: Planning Complete - Awaiting Implementation
> **Scope**: 10 themed learning journeys through AI history

## Overview

Learning Paths are curated educational journeys that guide users through related milestones, glossary terms, and key figures. Each path tells a coherent story, reinforced with quizzes that test understanding through multiple modalities.

## The 10 Learning Paths

| # | Path Name | Core Theme | Milestones | Est. Duration |
|---|-----------|------------|------------|---------------|
| 1 | **The Reward Revolution** | Reinforcement learning from Pavlov to RLHF | 12 | 45 min |
| 2 | **Simple Minds, Profound Lessons** | Intelligence in simple organisms | 8 | 30 min |
| 3 | **From Neurons to Networks** | Neural architecture evolution | 14 | 50 min |
| 4 | **The Attention Economy** | Transformers & attention mechanisms | 12 | 45 min |
| 5 | **Understanding Other Minds** | Theory of mind & machine consciousness | 8 | 35 min |
| 6 | **Games AI Plays** | Game-playing AI breakthroughs | 10 | 40 min |
| 7 | **The Vision Quest** | Computer vision evolution | 13 | 45 min |
| 8 | **Intelligence Before Brains** | Evolution of cognition | 9 | 35 min |
| 9 | **The Alignment Problem** | AI safety & governance | 11 | 40 min |
| 10 | **The Neuromodulator Code** | Brain chemistry & computation | 10 | 40 min |

## Quiz Types

Each learning path includes 4 quiz modalities:

1. **Multiple Choice** - Test conceptual understanding
2. **Timeline Ordering** - Drag events into chronological sequence
3. **Matching** - Connect concepts to definitions/researchers/papers
4. **Fill-in-the-Blank** - Complete key statements with missing terms

## Sprint Documents

Each learning path has a dedicated sprint document:

- `Sprint-LP1-Reward-Revolution.md`
- `Sprint-LP2-Simple-Minds.md`
- `Sprint-LP3-Neurons-Networks.md`
- `Sprint-LP4-Attention-Economy.md`
- `Sprint-LP5-Other-Minds.md`
- `Sprint-LP6-Games-AI-Plays.md`
- `Sprint-LP7-Vision-Quest.md`
- `Sprint-LP8-Intelligence-Before-Brains.md`
- `Sprint-LP9-Alignment-Problem.md`
- `Sprint-LP10-Neuromodulator-Code.md`

## Technical Implementation

### Database Schema (extends existing)

```prisma
model LearningPath {
  id            String   @id @default(cuid())
  slug          String   @unique  // "reward-revolution"
  title         String            // "The Reward Revolution"
  description   String
  estimatedMins Int
  sequence      Int               // Display order
  imageUrl      String?
  createdAt     DateTime @default(now())

  steps         LearningPathStep[]
  quizzes       LearningPathQuiz[]
  userProgress  UserLearningProgress[]
}

model LearningPathStep {
  id             String       @id @default(cuid())
  pathId         String
  sequence       Int
  contentType    String       // milestone, glossary, person
  contentId      String
  narrativeText  String?      // Optional connecting narrative

  path           LearningPath @relation(fields: [pathId], references: [id])
}

model LearningPathQuiz {
  id           String       @id @default(cuid())
  pathId       String
  quizType     String       // multiple_choice, timeline_order, matching, fill_blank
  question     String
  options      Json         // Type-specific quiz data
  correctAnswer Json
  explanation  String?
  sequence     Int

  path         LearningPath @relation(fields: [pathId], references: [id])
}

model UserLearningProgress {
  id               String       @id @default(cuid())
  userId           String
  pathId           String
  currentStep      Int          @default(0)
  completedSteps   Json         @default("[]")
  quizScores       Json         @default("{}")
  startedAt        DateTime     @default(now())
  completedAt      DateTime?

  path             LearningPath @relation(fields: [pathId], references: [id])

  @@unique([userId, pathId])
}
```

### API Endpoints

```
GET  /api/learning-paths                    # List all paths
GET  /api/learning-paths/:slug              # Get path with steps
GET  /api/learning-paths/:slug/quiz/:seq    # Get quiz question
POST /api/learning-paths/:slug/quiz/:seq    # Submit quiz answer
GET  /api/learning-paths/:slug/progress     # User progress
POST /api/learning-paths/:slug/step/:seq    # Mark step complete
```

### UI Components

1. **Learning Paths Index** (`/learn`) - Grid of available paths
2. **Path Detail** (`/learn/:slug`) - Path overview with progress
3. **Step View** - Content display with navigation
4. **Quiz Components** - Type-specific quiz UIs
5. **Progress Tracker** - Visual progress indicator

## Implementation Phases

### Phase 1: Data Model & API
- [ ] Database schema migration
- [ ] CRUD API endpoints
- [ ] Admin interface for path management

### Phase 2: Seed Data
- [ ] Create all 10 learning paths in database
- [ ] Populate path steps from sprint documents
- [ ] Create all quiz questions

### Phase 3: Frontend
- [ ] Learning paths index page
- [ ] Path detail and step views
- [ ] Quiz components (4 types)
- [ ] Progress tracking UI

### Phase 4: User Progress
- [ ] Progress persistence
- [ ] Completion certificates
- [ ] Gamification elements

## Cross-Path Validation

After implementing all paths, ensure:
- [ ] No duplicate milestones used as "primary" in multiple paths
- [ ] Each path has diverse quiz types (min 2 of each type)
- [ ] Glossary terms are contextually relevant
- [ ] Key figures appear in paths related to their work
- [ ] Timeline spans vary across paths (not all modern AI)
- [ ] Difficulty progression within each path

## Browser Validation Requirements

All sprint documents include browser validation tasks using Claude Chrome MCP tools:
- Navigate to learning path pages
- Test quiz interactions
- Verify progress tracking
- Check responsive design
- Validate API responses

See individual sprint documents for detailed browser testing checklists.
