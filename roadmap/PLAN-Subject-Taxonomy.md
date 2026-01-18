# Subject Taxonomy & Content Enrichment System

> **Project Overview**: Implement a hierarchical subject taxonomy to tag all content by domain/category/subcategory, enabling subject-based learning paths, content discovery, and pipeline enrichment.

## Goals

1. Create a structured 3-level taxonomy (Domain > Category > Subcategory)
2. Tag ALL content types consistently (milestones, glossary, events, persons, orgs)
3. Auto-classify incoming content during pipeline ingestion
4. Enable subject-based learning paths and content discovery
5. Migrate/backfill existing content with subject tags

## Current State vs. Target

| Current | Target |
|---------|--------|
| Fixed category enums (RESEARCH, MODEL_RELEASE) | Hierarchical subject taxonomy |
| Free-form tags (inconsistent) | Structured, searchable subjects |
| No cross-content subject links | Polymorphic ContentSubject junction |
| Manual learning paths only | Auto-generated subject learning paths |
| No subject filtering | Filter timeline/content by subject |

## Taxonomy Structure

```
Domain (L0)          Category (L1)              Subcategory (L2)
─────────────────────────────────────────────────────────────────
Science              Biology                    Genetics, Neurobiology
                     Neuroscience               Cognitive Sci, BCIs
                     Computer Science           ML, NLP, Vision, Robotics

Business             Technology                 Software, Semiconductors
                     Finance                    Fintech, Trading
                     Operations                 Supply Chain, Automation

Industry             Healthcare                 Diagnostics, Drug Discovery
                     Automotive                 Autonomous Vehicles
                     Media & Entertainment      Content Gen, Gaming

Policy               Regulation                 AI Safety Laws, Privacy
                     Ethics                     Alignment, Bias/Fairness
                     Geopolitics                US-China, Export Controls

Research             Academic                   Papers, Conferences
                     Corporate R&D              Labs, Partnerships
                     Open Source                Models, Frameworks
```

## Sprint Overview

| Sprint | Focus | Key Deliverables | Status |
|--------|-------|------------------|--------|
| **Subj-1** | Data Model & Seed Taxonomy | Prisma schema, seed data, admin CRUD | ✅ COMPLETE |
| **Subj-2** | Pipeline Integration | Stage 1.5 classification, propagation to drafts | ⏳ Partial (classifier exists) |
| **Subj-3** | Content Backfill | Migration script, existing content tagging | ✅ COMPLETE (99%+ coverage) |
| **Subj-4** | Learning Paths & Queries | Subject-based paths, API endpoints, filtering | ✅ COMPLETE |
| **Subj-5** | UI & Discovery | Subject badges, navigation, recommendations | ❌ Not started |

### Coverage Stats (2026-01-18)
- **Overall: 100%** (552/554 content items classified)
- Milestones: 99% (298/300)
- Glossary Terms: 100% (163/163)
- Current Events: 100% (76/76)
- Persons: 100% (14/14)
- Organizations: 100% (1/1)

### Top Subjects by Content Count
1. Papers & Preprints (269)
2. Machine Learning (210)
3. Software (116)
4. Natural Language Processing (24)
5. Computer Vision (11)

## Database Schema Additions

```prisma
/// Hierarchical subject taxonomy node
model Subject {
  id          String   @id @default(cuid())
  slug        String   @unique           // "science-cs-nlp"
  name        String                     // "Natural Language Processing"
  description String?

  // Hierarchy
  level       Int                        // 0=domain, 1=category, 2=subcategory
  parentId    String?
  parent      Subject?  @relation("SubjectHierarchy", fields: [parentId], references: [id])
  children    Subject[] @relation("SubjectHierarchy")

  // Denormalized for fast queries
  path        String                     // "Science > Computer Science > NLP"
  domainSlug  String                     // "science" (for domain filtering)

  // Learning metadata
  defaultDifficulty  String?             // beginner, intermediate, advanced
  learningObjectives String @default("[]") // JSON array

  // UI
  color       String?
  icon        String?

  // Relations
  contentSubjects ContentSubject[]
  synonyms        SubjectSynonym[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([level])
  @@index([domainSlug])
  @@index([parentId])
}

/// Alternative names that map to a subject
model SubjectSynonym {
  id        String  @id @default(cuid())
  subjectId String
  subject   Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  term      String  @unique  // "LLMs" → science-cs-nlp

  @@index([subjectId])
}

/// Polymorphic junction linking any content to subjects
model ContentSubject {
  id          String   @id @default(cuid())

  // Polymorphic target (like Comment system)
  contentType String   // milestone, glossary_term, current_event, person, organization
  contentId   String

  // Subject reference
  subjectId   String
  subject     Subject  @relation(fields: [subjectId], references: [id], onDelete: Cascade)

  // Classification metadata
  isPrimary   Boolean  @default(false)   // One primary subject per content
  confidence  Float?                     // AI classification confidence (0-1)
  source      String   @default("auto")  // auto, manual, migration

  createdAt   DateTime @default(now())

  @@unique([contentType, contentId, subjectId])
  @@index([contentType, contentId])
  @@index([subjectId])
  @@index([isPrimary, subjectId])
}

// Add to IngestedArticle model:
model IngestedArticle {
  // ... existing fields ...

  // Subject classification results (Stage 1.5)
  classifiedSubjects    Json?      // Array of {subjectId, confidence, isPrimary}
  subjectClassifiedAt   DateTime?
}
```

## API Endpoints

### Public
```
GET  /api/subjects/tree              # Full taxonomy tree
GET  /api/subjects/:slug             # Single subject with children
GET  /api/subjects/:slug/content     # Content tagged with subject
GET  /api/subjects/:slug/learning-path  # Auto-generated learning path
GET  /api/timeline?subject=:slug     # Filter timeline by subject
```

### Admin
```
GET    /api/admin/subjects           # List all subjects
POST   /api/admin/subjects           # Create subject
PUT    /api/admin/subjects/:id       # Update subject
DELETE /api/admin/subjects/:id       # Delete subject (cascade or reassign)

GET    /api/admin/subjects/synonyms  # List synonyms
POST   /api/admin/subjects/synonyms  # Create synonym
DELETE /api/admin/subjects/synonyms/:id

POST   /api/admin/subjects/backfill  # Trigger backfill job
GET    /api/admin/subjects/backfill/status  # Check backfill progress

GET    /api/admin/content/:type/:id/subjects  # Get subjects for content
PUT    /api/admin/content/:type/:id/subjects  # Update subjects for content
```

## Sprint Documents

- [Sprint Subj-1: Data Model & Seed Taxonomy](./Sprint-Subj-1-Data-Model.md)
- [Sprint Subj-2: Pipeline Integration](./Sprint-Subj-2-Pipeline.md)
- [Sprint Subj-3: Content Backfill](./Sprint-Subj-3-Backfill.md)
- [Sprint Subj-4: Learning Paths & Queries](./Sprint-Subj-4-Learning-Paths.md)
- [Sprint Subj-5: UI & Discovery](./Sprint-Subj-5-UI-Discovery.md)

## Success Metrics

- All new content auto-classified with subjects (target: 100%)
- Existing content backfilled (target: 100%)
- Subject classification accuracy (target: >90% agreement with manual review)
- Subject-based learning paths generated (target: 1 per L2 subcategory)
- Timeline filter adoption (track usage analytics)

## Cost Analysis

| Component | Cost | Notes |
|-----------|------|-------|
| Schema migrations | FREE | Prisma |
| Classification (Haiku) | ~$0.001/article | Stage 1.5 |
| Backfill (batch) | ~$5-10 one-time | Existing content |
| API/UI development | FREE | Internal |
