# Data Models & Schemas

Database: PostgreSQL via Prisma ORM. Schema in `prisma/schema.prisma`.

## Core Tables

### Milestone
Timeline events (both seeded and AI-generated).

```prisma
model Milestone {
  id                    String    @id
  title                 String
  description           String
  date                  DateTime
  category              String    // MODEL_RELEASE, RESEARCH, PRODUCT, etc.
  significance          Int       // 1-4 (MINOR to GROUNDBREAKING)
  era                   String?
  organization          String?
  contributors          String    @default("[]")  // JSON array
  sourceUrl             String?
  imageUrl              String?
  tags                  String    @default("[]")  // JSON array
  sources               String    @default("[]")  // JSON array
  // AI-generated content fields
  tldr                  String?
  simpleExplanation     String?
  technicalDepth        String?
  businessImpact        String?
  whyItMattersToday     String?
  historicalContext     String?
  commonMisconceptions  String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}
```

### GlossaryTerm
AI terminology definitions.

```prisma
model GlossaryTerm {
  id                  String   @id
  term                String   @unique
  shortDefinition     String
  fullDefinition      String
  businessContext     String?
  example             String?
  inMeetingExample    String?
  category            String   // technical, business_term, model_type, etc.
  relatedTermIds      String   @default("[]")
  relatedMilestoneIds String   @default("[]")
  sourceArticleId     String?  // Link to originating article
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

## News Ingestion Tables

### NewsSource
RSS feed configurations.

```prisma
model NewsSource {
  id             String    @id @default(cuid())
  name           String
  url            String    @unique
  feedUrl        String
  isActive       Boolean   @default(true)
  checkFrequency Int       @default(60)  // minutes
  lastCheckedAt  DateTime?
  createdAt      DateTime  @default(now())
  articles       IngestedArticle[]
}
```

### IngestedArticle
Raw articles with analysis status.

```prisma
model IngestedArticle {
  id                String    @id @default(cuid())
  sourceId          String
  externalUrl       String    @unique
  title             String
  content           String
  publishedAt       DateTime
  ingestedAt        DateTime  @default(now())
  // Analysis
  analysisStatus    String    @default("pending")  // pending|screening|screened|generating|complete|error
  analyzedAt        DateTime?
  relevanceScore    Float?    // 0-1
  isMilestoneWorthy Boolean   @default(false)
  milestoneRationale String?
  analysisError     String?
  // Review
  reviewStatus      String    @default("pending")
  // Duplicate detection
  isDuplicate       Boolean   @default(false)
  duplicateOfId     String?
  duplicateScore    Float?
  duplicateReason   String?
  // Relations
  source            NewsSource @relation(fields: [sourceId], references: [id])
  drafts            ContentDraft[]
}
```

### ContentDraft
AI-generated content pending review.

```prisma
model ContentDraft {
  id               String    @id @default(cuid())
  articleId        String
  contentType      String    // milestone | glossary_term | news_event
  draftData        Json      // Type-specific content
  isValid          Boolean   @default(false)
  validationErrors String?
  status           String    @default("pending")  // pending|published|rejected
  rejectionReason  String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  publishedAt      DateTime?
  publishedId      String?   // ID of created Milestone/GlossaryTerm
  article          IngestedArticle @relation(fields: [articleId], references: [id])
}
```

### PipelineSettings
Global pipeline configuration.

```prisma
model PipelineSettings {
  id               String    @id @default("default")
  ingestionPaused  Boolean   @default(false)
  analysisPaused   Boolean   @default(false)
  lastIngestionRun DateTime?
  lastAnalysisRun  DateTime?
  updatedAt        DateTime  @updatedAt
}
```

## Enums (TypeScript)

```typescript
// src/types/milestone.ts
export enum MilestoneCategory {
  MODEL_RELEASE = 'MODEL_RELEASE',
  RESEARCH = 'RESEARCH',
  PRODUCT = 'PRODUCT',
  INDUSTRY = 'INDUSTRY',
  REGULATION = 'REGULATION',
  BREAKTHROUGH = 'BREAKTHROUGH',
}

export enum SignificanceLevel {
  MINOR = 1,
  MODERATE = 2,
  MAJOR = 3,
  GROUNDBREAKING = 4,
}
```

## Draft Data Schemas

### Milestone Draft
```typescript
{
  id: string,           // E2025_CHATGPT_3B format
  title: string,
  description: string,
  date: string,         // ISO date
  category: MilestoneCategory,
  significance: 1 | 2 | 3 | 4,
  organization?: string,
  sourceUrl: string,
  tags: string[],
}
```

### Glossary Term Draft
```typescript
{
  id: string,           // kebab-case
  term: string,
  shortDefinition: string,
  fullDefinition: string,
  category: string,
  businessContext?: string,
  relatedTermIds: string[],
}
```

## ID Conventions

| Entity | Pattern | Example |
|--------|---------|---------|
| Milestone | `E{YEAR}_{NAME}` | `E2025_CHATGPT_3B` |
| GlossaryTerm | kebab-case | `transformer-architecture` |
| NewsSource | cuid | `clx1234...` |
| IngestedArticle | cuid | `clx5678...` |
| ContentDraft | cuid | `clx9012...` |
