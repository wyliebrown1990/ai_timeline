# Data Models

PostgreSQL via Prisma ORM. Schema: `prisma/schema.prisma`

## Core Entities

### Person (formerly KeyFigure)
AI researchers, executives, founders.

```prisma
model Person {
  id              String   @id  // kebab-case slug
  canonicalName   String   @unique
  slug            String   @unique
  aliases         String   @default("[]")  // JSON array

  // Biography sections
  shortBio        String
  fullBio         String?
  background      String?      // Education, early life
  careerHistory   String?      // Career narrative
  contributions   String?      // Major AI contributions
  philosophy      String?      // Approach, perspectives
  currentlyDoing  String?      // Auto-updated from news

  // Classification
  role            String       // researcher, executive, founder, engineer
  focusAreas      String   @default("[]")

  // Current affiliation
  currentOrgId    String?
  currentRole     String?

  // Links
  imageUrl        String?
  wikipediaUrl    String?
  linkedInUrl     String?
  twitterHandle   String?

  // Relations
  affiliations    Affiliation[]
  milestoneLinks  MilestoneContributor[]
}
```

### Organization
Companies, labs, universities.

```prisma
model Organization {
  id               String   @id  // kebab-case slug
  name             String   @unique
  slug             String   @unique
  type             String       // company, research_lab, university, nonprofit

  shortDescription String
  mission          String?
  history          String?
  currentFocus     String?      // Auto-updated from news

  focusAreas       String   @default("[]")
  products         String   @default("[]")

  logoUrl          String?
  websiteUrl       String?
  foundedYear      Int?
  headquarters     String?

  // Relations
  affiliations     Affiliation[]
  milestones       Milestone[]
}
```

### Affiliation
Person-Organization career history.

```prisma
model Affiliation {
  id            String    @id @default(cuid())
  personId      String
  orgId         String
  role          String    // Job title
  startDate     DateTime?
  endDate       DateTime? // null = current
  isCurrent     Boolean   @default(false)
}
```

### Milestone
Timeline events.

```prisma
model Milestone {
  id              String    @id  // E2025_GPT5 format
  title           String
  description     String
  date            DateTime
  category        String    // MODEL_RELEASE, RESEARCH, PRODUCT, etc.
  significance    Int       // 1-4
  organization    String?   // Legacy string
  organizationId  String?   // FK to Organization
  contributors    String    @default("[]")  // Legacy JSON
  sourceUrl       String?
  tags            String    @default("[]")

  // AI-generated content
  tldr            String?
  simpleExplanation String?
  technicalDepth  String?
  businessImpact  String?

  // Relations
  linkedContributors MilestoneContributor[]
}
```

### MilestoneContributor
Links Person to Milestone.

```prisma
model MilestoneContributor {
  id               String    @id @default(cuid())
  milestoneId      String
  personId         String
  contributionType String?   // lead, co_author, advisor, founder, mentioned
}
```

## News Ingestion

### NewsSource
```prisma
model NewsSource {
  sourceType      SourceType  // rss, youtube_channel, youtube_playlist, web_scraper
  config          Json        // Type-specific config
  isActive        Boolean
  lastCheckedAt   DateTime?
  consecutiveFailures Int @default(0)
}

enum SourceType {
  rss
  youtube_channel
  youtube_playlist
  web_scraper
}
```

### IngestedArticle
```prisma
model IngestedArticle {
  analysisStatus  String  // pending, screening, screened, generating, complete, error
  relevanceScore  Float?  // 0-1
  isMilestoneWorthy Boolean
  reviewStatus    String  // pending, approved, rejected
}
```

### ContentDraft
AI-generated content pending review.

```prisma
model ContentDraft {
  contentType     String  // milestone, glossary_term, news_event
  draftData       Json
  status          String  // pending, published, rejected
}
```

### PersonDraft
AI-detected persons from articles.

```prisma
model PersonDraft {
  normalizedName  String
  suggestedBio    String?
  suggestedOrg    String?
  suggestedRole   String?
  confidence      Float?
  matchedPersonId String?  // If fuzzy-matched to existing
  status          String   // pending, approved, merged, rejected
}
```

## ID Conventions

| Entity | Pattern | Example |
|--------|---------|---------|
| Milestone | `E{YEAR}_{NAME}` | `E2025_GPT5` |
| Person | kebab-case | `sam-altman` |
| Organization | kebab-case | `openai` |
| GlossaryTerm | kebab-case | `transformer` |
