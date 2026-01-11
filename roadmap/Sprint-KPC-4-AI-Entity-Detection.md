# Sprint KPC-4: AI Entity Detection & Auto-Linking

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-11 by Claude - Entity extraction, matching, and linking services complete

## Overview

Integrate AI-powered entity detection into the news ingestion pipeline. Automatically detect people and organizations mentioned in articles, link them to existing records, and update "Currently Doing" sections when career or research changes are detected.

**Goals:**
1. Auto-detect people and organizations in ingested articles
2. Match detected entities to existing Person/Organization records
3. Create draft records for new entities
4. Auto-update "Currently Doing" when changes are detected
5. Human review workflow for new entities and updates

**Prerequisites:** Sprint KPC-1, KPC-2, KPC-3 completed

---

## Tasks

### 1. Entity Detection in Article Analysis

#### 1.1 Update Article Analyzer

- [x] Update `server/src/services/ingestion/articleAnalyzer.ts`:
  - Add entity extraction to the analysis prompt
  - Extract: person names, organization names, roles, context

- [x] Create entity extraction prompt:
  ```typescript
  const ENTITY_EXTRACTION_PROMPT = `
  Analyze this article and extract all mentioned AI-related people and organizations.

  For each PERSON, provide:
  - name: Full name as written
  - role: Their role/title if mentioned (e.g., "CEO", "Research Scientist")
  - organization: Their organization if mentioned
  - context: The sentence where they appear
  - mentionType: "subject" (main focus), "quoted" (quoted in article), or "mentioned"
  - isCareerChange: true if the article describes a job change, new role, or career update

  For each ORGANIZATION, provide:
  - name: Full organization name
  - type: company, research_lab, university, nonprofit, or government
  - context: The sentence where they appear
  - mentionType: "subject" (main focus), "announcement" (making announcement), or "mentioned"
  - isNewDevelopment: true if article describes new project, product, or focus area

  Return JSON:
  {
    "persons": [...],
    "organizations": [...]
  }
  `;
  ```

#### 1.2 Create Entity Extraction Types

- [x] Create `server/src/services/ingestion/entityExtraction.ts` (moved to ingestion folder):
  ```typescript
  export interface ExtractedPerson {
    name: string;
    role?: string;
    organization?: string;
    context: string;
    mentionType: 'subject' | 'quoted' | 'mentioned';
    isCareerChange: boolean;
  }

  export interface ExtractedOrganization {
    name: string;
    type: 'company' | 'research_lab' | 'university' | 'nonprofit' | 'government';
    context: string;
    mentionType: 'subject' | 'announcement' | 'mentioned';
    isNewDevelopment: boolean;
  }

  export interface EntityExtractionResult {
    persons: ExtractedPerson[];
    organizations: ExtractedOrganization[];
  }
  ```

#### 1.3 Integrate into Analysis Pipeline

- [x] Update `analyzeArticle()` function:
  - Call entity extraction after Stage 4 (Key Figure Extraction)
  - Store extracted persons as PersonDraft records
  - Skip known persons and duplicates
  - Organizations logged (storage deferred to future sprint)

---

### 2. Entity Resolution (Matching to Existing Records)

#### 2.1 Create Entity Matcher Service

- [x] Create `server/src/services/entityMatcher.ts`:

```typescript
export interface MatchResult {
  extractedName: string;
  matchedRecord: Person | Organization | null;
  confidence: number;  // 0-1
  matchType: 'exact' | 'alias' | 'fuzzy' | 'none';
  suggestedAction: 'link' | 'create_draft' | 'review';
}

export async function matchPerson(extracted: ExtractedPerson): Promise<MatchResult> {
  // 1. Exact name match
  const exactMatch = await prisma.person.findFirst({
    where: { canonicalName: { equals: extracted.name, mode: 'insensitive' } }
  });
  if (exactMatch) return { confidence: 1.0, matchType: 'exact', ... };

  // 2. Alias match
  const persons = await prisma.person.findMany();
  for (const person of persons) {
    const aliases = JSON.parse(person.aliases || '[]');
    if (aliases.some(a => a.toLowerCase() === extracted.name.toLowerCase())) {
      return { confidence: 0.95, matchType: 'alias', ... };
    }
  }

  // 3. Fuzzy match (Levenshtein distance)
  const fuzzyMatches = persons
    .map(p => ({ person: p, score: similarityScore(extracted.name, p.canonicalName) }))
    .filter(m => m.score > 0.85)
    .sort((a, b) => b.score - a.score);

  if (fuzzyMatches.length > 0) {
    return {
      confidence: fuzzyMatches[0].score,
      matchType: 'fuzzy',
      matchedRecord: fuzzyMatches[0].person,
      suggestedAction: fuzzyMatches[0].score > 0.95 ? 'link' : 'review'
    };
  }

  // 4. No match - suggest creating draft
  return { confidence: 0, matchType: 'none', suggestedAction: 'create_draft' };
}

export async function matchOrganization(extracted: ExtractedOrganization): Promise<MatchResult> {
  // Similar logic for organizations
}
```

#### 2.2 Create String Similarity Utility

- [x] Jaro-Winkler similarity implemented in `entityMatcher.ts`
  - Jaro-Winkler algorithm (better for name matching than Levenshtein)
  - Normalized similarity score (0-1)
  - Handle common org variations (Inc., Corp., LLC, etc.)

---

### 3. Auto-Linking Workflow

#### 3.1 Create Entity Linker Service

- [x] Create `server/src/services/entityLinker.ts`:

```typescript
export async function processExtractedEntities(
  articleId: string,
  entities: EntityExtractionResult,
  targetEventId?: string  // If publishing to CurrentEvent
): Promise<LinkingResult> {
  const results = {
    personsLinked: 0,
    personsNeedReview: 0,
    orgsLinked: 0,
    orgsNeedReview: 0,
  };

  for (const person of entities.persons) {
    const match = await matchPerson(person);

    if (match.suggestedAction === 'link' && match.matchedRecord) {
      // Auto-link with high confidence
      if (targetEventId) {
        await createPersonMention(targetEventId, match.matchedRecord.id, person.mentionType);
      }
      results.personsLinked++;

      // Check for career change
      if (person.isCareerChange) {
        await queueCurrentlyDoingUpdate(match.matchedRecord.id, person, articleId);
      }
    } else if (match.suggestedAction === 'create_draft') {
      // Create PersonDraft for review
      await createPersonDraft(articleId, person);
      results.personsNeedReview++;
    } else {
      // Queue for manual review
      await createEntityReviewItem(articleId, 'person', person, match);
      results.personsNeedReview++;
    }
  }

  // Similar for organizations...

  return results;
}
```

#### 3.2 Update Publishing Flow

- [ ] Update `server/src/services/publishing/newsPublisher.ts`:
  - After creating CurrentEvent, call `processExtractedEntities()`
  - Link detected entities to the new event
  - Log linking results

---

### 4. "Currently Doing" Auto-Updates

#### 4.1 Create Currently Doing Update Service

- [ ] Create `server/src/services/currentlyDoingUpdater.ts`:

```typescript
export interface CurrentlyDoingUpdate {
  personId: string;
  newText: string;
  sourceArticleId: string;
  sourceEventId?: string;
  changeType: 'career' | 'research' | 'announcement';
  confidence: number;
}

export async function detectCurrentlyDoingChange(
  person: Person,
  extractedInfo: ExtractedPerson,
  articleContent: string
): Promise<CurrentlyDoingUpdate | null> {
  // Use AI to determine if this warrants an update
  const prompt = `
  Current "Currently Doing" for ${person.canonicalName}:
  "${person.currentlyDoing || 'Not set'}"

  New information from article:
  - Role: ${extractedInfo.role}
  - Organization: ${extractedInfo.organization}
  - Context: ${extractedInfo.context}

  Article excerpt: ${articleContent.substring(0, 1000)}

  Should we update their "Currently Doing" section?
  If yes, what should the new text be?

  Return JSON:
  {
    "shouldUpdate": boolean,
    "newText": string | null,
    "changeType": "career" | "research" | "announcement",
    "confidence": number (0-1),
    "reason": string
  }
  `;

  const response = await callClaude(prompt);
  // Parse and return update if warranted
}

export async function applyCurrentlyDoingUpdate(
  update: CurrentlyDoingUpdate,
  autoApply: boolean = false
): Promise<void> {
  if (autoApply && update.confidence > 0.9) {
    // High confidence - auto-apply
    await prisma.person.update({
      where: { id: update.personId },
      data: {
        currentlyDoing: update.newText,
        currentlyDoingUpdatedAt: new Date(),
      }
    });
  } else {
    // Queue for review
    await prisma.currentlyDoingDraft.create({
      data: {
        personId: update.personId,
        proposedText: update.newText,
        sourceArticleId: update.sourceArticleId,
        changeType: update.changeType,
        confidence: update.confidence,
        status: 'pending',
      }
    });
  }
}
```

#### 4.2 Create CurrentlyDoingDraft Model

- [x] Already exists in Prisma schema (Sprint KPC-1):
  ```prisma
  model CurrentlyDoingDraft {
    id              String   @id @default(cuid())
    personId        String
    person          Person   @relation(fields: [personId], references: [id])
    proposedText    String
    sourceArticleId String?
    sourceEventId   String?
    changeType      String   // career, research, announcement
    confidence      Float
    status          String   @default("pending")  // pending, approved, rejected
    reviewNotes     String?
    createdAt       DateTime @default(now())
    reviewedAt      DateTime?

    @@index([personId])
    @@index([status])
  }
  ```

#### 4.3 Similar for Organization Current Focus

- [ ] Create `currentFocusUpdater.ts` for organizations
- [ ] Create `CurrentFocusDraft` model

---

### 5. Entity Draft Review Queue

#### 5.1 Create Entity Review Models

- [ ] Update PersonDraft (existing KeyFigureDraft) with additional fields:
  ```prisma
  // Add to existing KeyFigureDraft/PersonDraft:
  detectedRole        String?
  detectedOrganization String?
  mentionContext      String?
  confidence          Float?
  ```

- [ ] Create OrganizationDraft model:
  ```prisma
  model OrganizationDraft {
    id              String   @id @default(cuid())
    articleId       String
    article         IngestedArticle @relation(...)
    extractedName   String
    suggestedType   String?
    context         String
    matchedOrgId    String?
    matchedOrg      Organization? @relation(...)
    matchConfidence Float?
    status          String   @default("pending")
    reviewNotes     String?
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt

    @@index([status])
    @@index([articleId])
  }
  ```

#### 5.2 Create Entity Review Admin Pages

- [x] Create `src/pages/admin/PersonDraftsPage.tsx`:
  - List pending person drafts
  - Show matched candidates with confidence
  - Actions: Approve (create new), Merge (link to existing), Reject
  - Bulk actions for high-confidence matches

- [ ] Create `src/pages/admin/OrgDraftsPage.tsx`:
  - Similar to PersonDraftsPage
  - Show organization type, context

- [ ] Create `src/pages/admin/CurrentlyDoingReviewPage.tsx`:
  - List pending "Currently Doing" updates
  - Show before/after comparison
  - Show source article
  - Actions: Approve, Edit & Approve, Reject

#### 5.3 Create Review API Endpoints

- [x] `GET /api/admin/person-drafts` - list person drafts
- [x] `GET /api/admin/person-drafts/stats` - draft statistics
- [x] `POST /api/admin/person-drafts/:id/approve` - create person
- [x] `POST /api/admin/person-drafts/:id/merge` - merge with existing
- [x] `POST /api/admin/person-drafts/:id/reject` - reject draft
- [x] `POST /api/admin/person-drafts/batch-reject` - batch reject
- [ ] Similar endpoints for org drafts and currently-doing updates

---

### 6. Confidence Thresholds & Settings

#### 6.1 Create Configuration

- [ ] Add to PipelineSettings or create EntityDetectionSettings:
  ```prisma
  model EntityDetectionSettings {
    id                          String  @id @default("default")
    autoLinkPersonThreshold     Float   @default(0.95)
    autoLinkOrgThreshold        Float   @default(0.95)
    autoUpdateCurrentlyDoing    Boolean @default(false)
    currentlyDoingThreshold     Float   @default(0.9)
    createDraftThreshold        Float   @default(0.5)  // Below this, don't even create draft
    updatedAt                   DateTime @updatedAt
  }
  ```

#### 6.2 Admin Settings Page

- [ ] Add "Entity Detection" section to admin settings:
  - Auto-link confidence thresholds
  - Auto-update toggle
  - Currently Doing threshold

---

### 7. Integration with Existing Pipeline

#### 7.1 Update Ingestion Job

- [ ] Update `server/src/jobs/ingestionJob.ts`:
  - Add entity extraction step after article analysis
  - Process extracted entities for matching
  - Create drafts/links as appropriate
  - Log entity detection metrics

#### 7.2 Update Content Generation

- [ ] Update `server/src/services/ingestion/contentGenerator.ts`:
  - If generating news event, include entity detection
  - Pass entities to publisher for auto-linking

---

### 8. Monitoring & Metrics

#### 8.1 Add Entity Detection Metrics

- [ ] Track and display in admin dashboard:
  - Entities detected per day
  - Auto-linked vs. needs review ratio
  - "Currently Doing" updates applied
  - False positive rate (from rejections)

---

## Acceptance Criteria

- [ ] Articles automatically have entities extracted during analysis
- [ ] High-confidence entities are auto-linked to existing records
- [ ] Low-confidence matches create drafts for review
- [ ] New entities create drafts for review
- [ ] Career changes trigger "Currently Doing" update proposals
- [ ] Admin can review and approve/reject entity drafts
- [ ] Admin can review and approve/reject "Currently Doing" updates
- [ ] Confidence thresholds are configurable
- [ ] Entity detection metrics visible in dashboard

---

## Testing Checklist

- [ ] Ingest article mentioning known person → auto-linked
- [ ] Ingest article mentioning new person → draft created
- [ ] Ingest article about career change → "Currently Doing" update proposed
- [ ] Approve person draft → person created and linked
- [ ] Merge person draft → existing person linked
- [ ] Reject person draft → draft removed
- [ ] Approve "Currently Doing" update → person updated
- [ ] Adjust confidence threshold → verify behavior changes

---

## Validation with Claude Chrome

Before marking complete:
- [ ] Trigger ingestion and verify entity extraction in logs
- [ ] Check entity drafts page shows new drafts
- [ ] Approve a draft and verify person created
- [ ] Check "Currently Doing" review page
- [ ] Verify metrics in admin dashboard

---

## Notes for Future Developers

### Entity Extraction Prompt Tuning
The entity extraction prompt may need tuning based on article types:
- Tech news: Focus on executives, product announcements
- Research papers: Focus on authors, institutions
- Opinion pieces: Focus on quoted experts

Consider article source type when setting extraction parameters.

### Career Change Detection
Career changes are detected when:
- Article headline mentions job change ("X joins Y", "X named CEO")
- Role/org differs from current record
- Explicit mention of departure/arrival

### Confidence Score Meaning
- 1.0: Exact match on canonical name
- 0.95: Alias match
- 0.85-0.95: Strong fuzzy match (likely same person)
- 0.70-0.85: Possible match (needs review)
- <0.70: Probably different person

### Performance Considerations
- Entity matching queries can be slow with many records
- Consider caching common matches
- Batch entity processing during off-peak hours
- Index aliases column if searching frequently

---

## Completed Work Summary (2026-01-11)

### Files Created
- `server/src/services/ingestion/entityExtraction.ts` - Entity extraction types, prompts, validation, and Claude API call
- `server/src/services/entityMatcher.ts` - Person and organization matching with Jaro-Winkler similarity
- `server/src/services/entityLinker.ts` - Entity linking workflow with career change detection

### Files Modified
- `server/src/services/ingestion/articleAnalyzer.ts` - Added Stage 5: Entity Extraction
  - Calls `extractEntities()` for milestone-worthy or high-relevance articles
  - Creates PersonDraft records for extracted persons
  - Logs organizations (storage deferred to future sprint)
  - Skips known persons and duplicates

### Key Implementation Details
1. **Entity Extraction (Stage 5)** - Uses Claude Haiku for cost-efficient extraction
2. **Person Matching** - Exact canonical, exact alias, and fuzzy matching (0.95 threshold for auto-link)
3. **Organization Matching** - Handles common suffixes (Inc., Corp., LLC), fuzzy matching
4. **Career Change Detection** - Detects job changes and queues CurrentlyDoingDraft for review
5. **Deduplication** - Checks existing drafts and published persons before creating new drafts

### Remaining Work
- ~~Admin UI for reviewing PersonDraft records (Section 5)~~ - COMPLETE
- OrganizationDraft model and UI
- CurrentlyDoingReviewPage for career change updates
- Pipeline metrics and dashboard (Section 8)

### Admin UI Work (2026-01-11)
- Created `server/src/controllers/personDrafts.ts` - Full CRUD for PersonDraft review
- Created `server/src/routes/personDrafts.ts` - API routes at `/api/admin/person-drafts`
- Added personDraftsApi to `src/services/api.ts` - Frontend API client
- Created `src/pages/admin/PersonDraftsPage.tsx` - Review UI with tabs, batch reject, merge modal
- Added route in `src/App.tsx` at `/admin/person-drafts`
- Added navigation in `src/components/admin/AdminLayout.tsx`
