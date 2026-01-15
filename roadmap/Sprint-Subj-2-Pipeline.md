# Sprint Subj-2: Pipeline Integration

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-14 by Claude

## Overview

Integrate subject classification into the news ingestion pipeline. Add a new Stage 1.5 (after screening, before content generation) that classifies articles by subject. Propagate subjects to generated content drafts and publish them when drafts are approved.

## Prerequisites

- [x] Sprint Subj-1 complete (schema, seed data, admin UI)
- [x] Existing pipeline working (screening, content generation, entity extraction)

---

## Tasks

### 1. Subject Classification Service

**File**: `server/src/services/ingestion/subjectClassifier.ts` (new)

- [x] Create `SubjectClassifier` class
- [x] Load taxonomy into memory on init (cache for performance)
- [x] Implement `classifyArticle(article: IngestedArticle): Promise<SubjectClassification[]>`

**Classification logic**:
```typescript
interface SubjectClassification {
  subjectId: string;
  subjectSlug: string;
  confidence: number;  // 0-1
  isPrimary: boolean;
}

async function classifyArticle(article: IngestedArticle): Promise<SubjectClassification[]> {
  const prompt = buildClassificationPrompt(article, taxonomy);

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',  // Fast, cheap
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  return parseClassificationResponse(response);
}
```

- [x] Build prompt with taxonomy context
  ```typescript
  function buildClassificationPrompt(article: IngestedArticle, taxonomy: Subject[]): string {
    return `
You are classifying an AI-related article into subject categories.

TAXONOMY (hierarchical - assign at most specific applicable level):
${formatTaxonomyForPrompt(taxonomy)}

ARTICLE:
Title: ${article.title}
Content: ${article.content.slice(0, 3000)}  // Truncate for token limits
Published: ${article.publishedAt}

INSTRUCTIONS:
1. Identify 1-4 subjects that best describe this article
2. Assign confidence scores (0-1) based on how central each subject is
3. Mark exactly ONE subject as primary (highest relevance)
4. Prefer more specific subcategories over broad domains when applicable
5. Only include subjects with confidence >= 0.5

Return JSON:
{
  "subjects": [
    {"slug": "science-cs-nlp", "confidence": 0.95, "isPrimary": true},
    {"slug": "business-technology-software", "confidence": 0.7, "isPrimary": false}
  ],
  "reasoning": "Brief explanation of classification"
}
`;
  }
  ```

- [x] Parse and validate response
- [x] Handle errors gracefully (return empty array, log error)

### 2. Add Stage 1.5 to Pipeline

**File**: `server/src/services/ingestion/articleAnalyzer.ts`

- [x] Add new analysis status: `classifying` (between `screening` and `generating`)
- [x] Insert classification step after screening passes

**Modified pipeline flow**:
```typescript
async function analyzeArticle(article: IngestedArticle) {
  // Stage 1: Screening
  if (article.analysisStatus === 'pending') {
    await screenArticle(article);
    // Status: pending → screening → screened
  }

  // Stage 1.5: Subject Classification (NEW)
  if (article.analysisStatus === 'screened' && !article.classifiedSubjects) {
    await classifySubjects(article);
    // Stores classifiedSubjects JSON, sets subjectClassifiedAt
  }

  // Stage 2: Content Generation (only for milestone-worthy)
  if (article.isMilestoneWorthy && article.analysisStatus === 'screened') {
    await generateContent(article);
    // Status: screened → generating → complete
  }

  // ... remaining stages
}
```

- [x] Add `classifySubjects` function
  ```typescript
  async function classifySubjects(article: IngestedArticle) {
    const classifier = new SubjectClassifier();
    const subjects = await classifier.classifyArticle(article);

    await prisma.ingestedArticle.update({
      where: { id: article.id },
      data: {
        classifiedSubjects: subjects,
        subjectClassifiedAt: new Date(),
      },
    });
  }
  ```

- [x] Ensure classification runs even for non-milestone-worthy articles
  - All ingested content should be classified for analytics/filtering

### 3. Propagate Subjects to Content Drafts

**File**: `server/src/services/ingestion/contentGenerator.ts`

- [x] Include article's classified subjects in draft data
- [x] Add `suggestedSubjects` field to ContentDraft.draftData

**When generating milestone draft**:
```typescript
const draftData = {
  // ... existing milestone fields
  suggestedSubjects: article.classifiedSubjects,
};
```

- [x] Also add for glossary_term and news_event drafts

### 4. Publish Subjects on Draft Approval

**File**: `server/src/services/reviewService.ts` (or wherever drafts are approved)

- [x] When draft is approved and published, create ContentSubject records
- [x] Map from draft's suggestedSubjects to actual ContentSubject entries

```typescript
async function publishDraft(draft: ContentDraft) {
  // ... existing publish logic creates milestone/event/term

  const publishedId = result.id;  // ID of created entity
  const contentType = draft.contentType;  // 'milestone', 'glossary_term', etc.

  // Create ContentSubject records
  const suggestedSubjects = draft.draftData.suggestedSubjects || [];

  for (const subj of suggestedSubjects) {
    await prisma.contentSubject.create({
      data: {
        contentType,
        contentId: publishedId,
        subjectId: subj.subjectId,
        isPrimary: subj.isPrimary,
        confidence: subj.confidence,
        source: 'auto',
      },
    });
  }
}
```

- [x] Handle duplicate prevention (upsert or check existence)
- [x] Validate subjectId exists before creating

### 5. Admin Review UI - Show Suggested Subjects

**File**: `src/pages/admin/ReviewQueuePage.tsx` (or ReviewDraftModal)

- [x] Display suggested subjects on draft review cards
- [x] Show subject badges with confidence scores
- [ ] Allow admin to edit subjects before approval (deferred to Sprint Subj-5)
  - Add/remove subjects
  - Change primary subject
  - Override confidence (sets source to 'manual')

**Component**: `src/components/admin/DraftSubjectEditor.tsx` (new)

- [ ] Subject selector (searchable dropdown from taxonomy)
- [ ] Primary toggle
- [ ] Remove button
- [ ] Visual confidence indicator

### 6. Re-classify Endpoint

**File**: `server/src/routes/admin/articles.ts`

- [x] Add `POST /api/admin/articles/:id/reclassify`
- [x] Re-runs subject classification on existing article
- [x] Updates `classifiedSubjects` and `subjectClassifiedAt`
- [x] Useful for taxonomy changes or classification improvements

```typescript
router.post('/:id/reclassify', adminAuth, async (req, res) => {
  const article = await prisma.ingestedArticle.findUnique({
    where: { id: req.params.id },
  });

  if (!article) return res.status(404).json({ error: 'Article not found' });

  const classifier = new SubjectClassifier();
  const subjects = await classifier.classifyArticle(article);

  await prisma.ingestedArticle.update({
    where: { id: article.id },
    data: {
      classifiedSubjects: subjects,
      subjectClassifiedAt: new Date(),
    },
  });

  res.json({ subjects });
});
```

### 7. Pipeline Stats - Subject Metrics

**File**: `server/src/routes/admin/pipeline.ts`

- [x] Add subject classification stats to `/api/admin/pipeline/stats`
  - Articles classified
  - Classification distribution by domain
  - Average subjects per article
  - Classification errors

```typescript
const subjectStats = {
  articlesClassified: await prisma.ingestedArticle.count({
    where: { classifiedSubjects: { not: null } },
  }),
  byDomain: await getClassificationByDomain(),
  avgSubjectsPerArticle: await getAvgSubjectsPerArticle(),
  classificationErrors: await prisma.ingestionError.count({
    where: { errorType: 'subject_classification' },
  }),
};
```

### 8. Error Handling

**File**: `server/src/services/ingestion/subjectClassifier.ts`

- [x] Log classification errors to `IngestionError` table
- [x] Add new error type: `classification` (logs to IngestionError)
- [x] Implement retry logic (3 attempts with exponential backoff)
- [x] Don't block pipeline on classification failure
  - Log error, continue to next stage
  - Allow manual classification in admin

---

## Browser Testing & Validation

> **CRITICAL**: Use Claude Chrome MCP tools to test all web features.

### Pipeline Classification - Browser Validation

- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Navigate to `/admin/sources` and trigger a fetch for a test source
- [ ] Navigate to `/admin/articles` and verify new article appears
- [ ] Click article to view details - verify `classifiedSubjects` populated
- [ ] Check classification appears with confidence scores
- [ ] Navigate to `/admin/review` for milestone-worthy articles
- [ ] Verify draft shows suggested subjects
- [ ] Test editing subjects before approval
- [ ] Approve draft and verify ContentSubject records created
- [ ] Check console for errors: `mcp__claude-in-chrome__read_console_messages`
- [ ] Check network for failed API calls: `mcp__claude-in-chrome__read_network_requests`

### Re-classify Endpoint - Browser Validation

- [ ] Navigate to `/admin/articles/:id` detail page
- [ ] Click "Re-classify" button (if UI exists) or test via API
- [ ] Verify subjects update after reclassification
- [ ] Screenshot results

---

## Acceptance Criteria

- [x] Classification runs automatically after screening
- [x] All articles get classified (not just milestone-worthy)
- [x] Classification results stored in `classifiedSubjects` JSON
- [x] Drafts include suggested subjects
- [x] Approved drafts create ContentSubject records
- [x] Admin can view suggested subjects before approval (editing deferred)
- [x] Re-classify endpoint works for existing articles
- [x] Pipeline stats include subject metrics
- [x] Classification errors logged but don't block pipeline
- [ ] All browser validation tasks completed

---

## Notes for Future Developers

### Model Choice
Using Haiku for classification (fast, cheap, sufficient accuracy). If quality issues arise, can upgrade to Sonnet for complex articles.

### Token Limits
Article content is truncated to ~3000 chars to stay within token limits. Title is always included in full.

### Confidence Threshold
Only subjects with confidence >= 0.5 are included. Adjust in prompt if too restrictive.

### Classification Caching
Consider caching taxonomy in memory (refreshed periodically) to avoid DB queries per classification.

### Rate Limiting
Haiku has generous rate limits, but consider batching if processing many articles at once.

### Prompt Iteration
The classification prompt may need tuning based on real-world results. Track accuracy metrics and iterate.
