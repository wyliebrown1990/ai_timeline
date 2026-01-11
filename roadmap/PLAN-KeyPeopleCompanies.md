# Key People & Companies Feature

> **Master Development Plan**
> A comprehensive system for profiling AI leaders and organizations with full cross-linking across the platform.

## Vision

Transform the existing KeyFigure system into a robust **People & Organizations** feature where:
- Every person and organization has a rich, structured profile
- All content (Milestones, News Events) is bidirectionally linked to relevant people/orgs
- "Currently Doing" sections auto-update when news detects career or research focus changes
- Users can deeply explore the AI ecosystem through people and institutions

## Current State

| Entity | Status | Notes |
|--------|--------|-------|
| KeyFigure | Exists | Basic bio fields, linked to Milestones via MilestoneContributor |
| Organization | Missing | Only string references in Milestone.organization and KeyFigure.primaryOrg |
| Affiliation | Missing | No structured career history tracking |
| News Event Links | Missing | CurrentEvent has no person/org linking |
| Profile Pages | Missing | Only modal view exists for KeyFigure |

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ENTITIES                                │
├─────────────────────────────────────────────────────────────────┤
│  Person (evolved KeyFigure)    Organization (new)               │
│  ├── Structured bio sections   ├── Type (company/academic/etc)  │
│  ├── Currently Doing (auto)    ├── Mission & History            │
│  ├── External links            ├── Current Focus (auto)         │
│  └── Career timeline           └── Leadership roster            │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│      Affiliation        │   │    Cross-Links          │
│  (Person ↔ Org)         │   │                         │
│  ├── Role               │   │  Milestone → Person[]   │
│  ├── Start/End dates    │   │  Milestone → Org        │
│  └── isCurrent flag     │   │  NewsEvent → Person[]   │
└─────────────────────────┘   │  NewsEvent → Org[]      │
                              └─────────────────────────┘
```

## Sprint Overview

| Sprint | Focus | Key Deliverables |
|--------|-------|------------------|
| **KPC-1** | Schema & Migration | Person/Org/Affiliation models, migrate KeyFigure data |
| **KPC-2** | Profile Pages | Person detail page, Organization detail page |
| **KPC-3** | Cross-Linking | Update Milestone/News to use real relationships |
| **KPC-4** | AI Entity Detection | Auto-detect people/orgs in news, update "Currently Doing" |
| **KPC-5** | Discovery & Navigation | Browse pages, search, filters, nav updates |
| **KPC-6** | Polish & Visualization | Career timelines, relationship graphs, refinements |

## Data Model Summary

### Person (replaces KeyFigure)
```prisma
model Person {
  id                String   @id  // kebab-case slug
  canonicalName     String   @unique
  slug              String   @unique
  aliases           String   @default("[]")

  // Structured biography sections
  shortBio          String   // 1-2 sentences
  background        String?  // Education, early life
  careerHistory     String?  // Career narrative
  contributions     String?  // Major AI contributions
  philosophy        String?  // Approach, beliefs, perspectives
  currentlyDoing    String?  // Auto-updated from news
  currentlyDoingUpdatedAt DateTime?

  // Classification
  role              String   // researcher, executive, founder, etc.
  focusAreas        String   @default("[]")  // JSON: ["LLMs", "Safety"]

  // Media
  imageUrl          String?

  // External links
  wikipediaUrl      String?
  linkedInUrl       String?
  twitterHandle     String?
  personalWebsite   String?
  googleScholarUrl  String?

  // Current affiliation (denormalized for quick access)
  currentOrgId      String?
  currentOrg        Organization? @relation("CurrentEmployees")
  currentRole       String?

  // Relationships
  affiliations      Affiliation[]
  milestoneLinks    MilestoneContributor[]
  newsEventMentions NewsEventPersonMention[]

  // Metadata
  status            String   @default("published")
  sourceArticleId   String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### Organization (new)
```prisma
model Organization {
  id                String   @id  // kebab-case slug
  name              String   @unique
  slug              String   @unique

  // Classification
  type              String   // company, research_lab, university, nonprofit, government

  // Content
  shortDescription  String   // 1-2 sentences
  mission           String?  // Mission statement
  history           String?  // Founding story, evolution
  currentFocus      String?  // Auto-updated from news
  currentFocusUpdatedAt DateTime?

  // Key areas
  focusAreas        String   @default("[]")  // JSON: ["LLMs", "Robotics"]
  products          String   @default("[]")  // JSON: notable products/projects

  // Media
  logoUrl           String?

  // External links
  websiteUrl        String?
  wikipediaUrl      String?
  linkedInUrl       String?

  // Details
  foundedYear       Int?
  headquarters      String?

  // Relationships
  currentEmployees  Person[] @relation("CurrentEmployees")
  affiliations      Affiliation[]
  milestones        Milestone[]
  newsEventMentions NewsEventOrgMention[]

  // Metadata
  status            String   @default("published")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### Affiliation (new)
```prisma
model Affiliation {
  id            String    @id @default(cuid())
  personId      String
  person        Person    @relation(fields: [personId], references: [id])
  orgId         String
  organization  Organization @relation(fields: [orgId], references: [id])

  role          String    // Job title or role
  startDate     DateTime?
  endDate       DateTime? // null = current
  isCurrent     Boolean   @default(false)

  @@unique([personId, orgId, role])
  @@index([personId])
  @@index([orgId])
}
```

## Success Metrics

- [ ] All existing KeyFigure data migrated to Person
- [ ] 100+ Organizations created from existing milestone/article data
- [ ] Bidirectional linking working (click person on milestone → person page → see all their milestones)
- [ ] "Currently Doing" updates automatically when relevant news is published
- [ ] Browse pages functional with filtering
- [ ] Navigation updated with People & Organizations sections

## Dependencies

- Existing KeyFigure model and data
- Existing Milestone.contributors and Milestone.organization strings
- News ingestion pipeline (for auto entity detection)
- Claude API (for entity extraction and "Currently Doing" updates)

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing KeyFigure functionality | Gradual migration with backwards compatibility |
| Entity resolution errors (wrong person matched) | Confidence scoring + human review queue |
| Performance with many relations | Proper indexing, pagination, lazy loading |
| Data quality from auto-extraction | Review workflow for new entities |
