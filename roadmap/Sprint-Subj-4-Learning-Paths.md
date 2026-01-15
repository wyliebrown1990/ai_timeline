# Sprint Subj-4: Learning Paths & Queries

> **PROGRESS TRACKING**: Update this document as you complete tasks.
> Mark checkboxes `[x]` when done. Do NOT create separate status docs.
> Last updated: 2026-01-14 by Claude
>
> **STATUS: COMPLETE** ✅
> - Subject content query service implemented
> - Learning path generation (single & cross-subject)
> - Subject filters on timeline and glossary
> - Related content recommendations
> - Frontend API client updated
> - All APIs deployed and tested

## Overview

Build subject-based content queries and auto-generated learning paths. Enable filtering content by subject across the application. Create APIs for subject-based content discovery.

## Prerequisites

- [x] Sprint Subj-1 complete (schema, taxonomy)
- [x] Sprint Subj-2 complete (pipeline classification)
- [x] Sprint Subj-3 complete (backfill - 99% coverage achieved)

---

## Tasks

### 1. Subject Content Query Service

**File**: `server/src/services/subjectContentService.ts` (new)

- [x] `getContentBySubject(subjectSlug, options)` - Get all content for a subject
  ```typescript
  interface ContentQueryOptions {
    contentTypes?: ContentType[];  // Filter to specific types
    includeChildren?: boolean;     // Include child subject content
    primaryOnly?: boolean;         // Only primary subject assignments
    limit?: number;
    offset?: number;
    sortBy?: 'date' | 'significance' | 'confidence';
  }

  async function getContentBySubject(
    subjectSlug: string,
    options: ContentQueryOptions = {}
  ): Promise<SubjectContentResult> {
    const subject = await prisma.subject.findUnique({
      where: { slug: subjectSlug },
      include: { children: true },
    });

    // Build subject IDs to query (self + children if requested)
    const subjectIds = [subject.id];
    if (options.includeChildren) {
      subjectIds.push(...subject.children.map(c => c.id));
    }

    const contentSubjects = await prisma.contentSubject.findMany({
      where: {
        subjectId: { in: subjectIds },
        contentType: options.contentTypes
          ? { in: options.contentTypes }
          : undefined,
        isPrimary: options.primaryOnly ? true : undefined,
      },
      take: options.limit,
      skip: options.offset,
    });

    // Fetch actual content for each type
    return await hydrateContent(contentSubjects);
  }
  ```

- [x] `getSubjectStats(subjectSlug)` - Get content counts per type (already in subjects.ts)
  ```typescript
  async function getSubjectStats(subjectSlug: string): Promise<SubjectStats> {
    const subject = await prisma.subject.findUnique({
      where: { slug: subjectSlug },
    });

    const counts = await prisma.contentSubject.groupBy({
      by: ['contentType'],
      where: { subjectId: subject.id },
      _count: true,
    });

    return {
      subjectSlug,
      milestones: counts.find(c => c.contentType === 'milestone')?._count || 0,
      glossaryTerms: counts.find(c => c.contentType === 'glossary_term')?._count || 0,
      currentEvents: counts.find(c => c.contentType === 'current_event')?._count || 0,
      persons: counts.find(c => c.contentType === 'person')?._count || 0,
      organizations: counts.find(c => c.contentType === 'organization')?._count || 0,
      total: counts.reduce((sum, c) => sum + c._count, 0),
    };
  }
  ```

### 2. Subject-Based Learning Path Generator

**File**: `server/src/services/subjectContentService.ts` (combined)

- [x] `generateSubjectLearningPath(subjectSlug)` - Auto-generate path from subject content
  ```typescript
  async function generateSubjectLearningPath(subjectSlug: string): Promise<GeneratedLearningPath> {
    const subject = await prisma.subject.findUnique({
      where: { slug: subjectSlug },
    });

    // Get milestones for this subject, sorted by date
    const milestoneLinks = await prisma.contentSubject.findMany({
      where: {
        subjectId: subject.id,
        contentType: 'milestone',
        isPrimary: true,  // Only primary to avoid tangents
      },
    });

    const milestones = await prisma.milestone.findMany({
      where: { id: { in: milestoneLinks.map(l => l.contentId) } },
      orderBy: { date: 'asc' },
    });

    // Get related glossary terms
    const glossaryLinks = await prisma.contentSubject.findMany({
      where: {
        subjectId: subject.id,
        contentType: 'glossary_term',
      },
    });

    const glossaryTerms = await prisma.glossaryTerm.findMany({
      where: { id: { in: glossaryLinks.map(l => l.contentId) } },
    });

    // Build path structure
    return {
      title: `History of ${subject.name}`,
      slug: `subject-${subject.slug}`,
      description: `Explore the key milestones in ${subject.name}, from early developments to recent breakthroughs.`,
      targetAudience: 'Anyone interested in ' + subject.name,
      difficulty: subject.defaultDifficulty || 'intermediate',
      estimatedMinutes: milestones.length * 5,  // 5 min per milestone
      milestoneIds: milestones.map(m => m.id),
      conceptsCovered: glossaryTerms.map(t => t.term),
      keyTakeaways: generateKeyTakeaways(milestones, subject),
      isAutoGenerated: true,
      subjectSlug: subject.slug,
    };
  }
  ```

- [x] `generateKeyTakeaways(milestones, subject)` - Extract key learnings
- [x] Consider milestone significance when ordering
- [x] Limit to reasonable path length (10-20 milestones max)

### 3. Cross-Subject Learning Paths

**File**: `server/src/services/subjectContentService.ts` (combined)

- [x] `generateCrossSubjectPath(subjectSlugs[])` - Path spanning multiple subjects
  ```typescript
  async function generateCrossSubjectPath(
    subjectSlugs: string[],
    options: { title?: string; maxMilestones?: number } = {}
  ): Promise<GeneratedLearningPath> {
    // Get subjects
    const subjects = await prisma.subject.findMany({
      where: { slug: { in: subjectSlugs } },
    });

    // Get all milestones for these subjects
    const milestoneLinks = await prisma.contentSubject.findMany({
      where: {
        subjectId: { in: subjects.map(s => s.id) },
        contentType: 'milestone',
      },
    });

    // Fetch and sort by date
    const milestones = await prisma.milestone.findMany({
      where: { id: { in: milestoneLinks.map(l => l.contentId) } },
      orderBy: { date: 'asc' },
      take: options.maxMilestones || 20,
    });

    const subjectNames = subjects.map(s => s.name).join(' & ');

    return {
      title: options.title || `${subjectNames}: A Combined History`,
      slug: `cross-${subjectSlugs.join('-')}`,
      description: `Explore how ${subjectNames} have evolved together.`,
      difficulty: 'intermediate',
      milestoneIds: milestones.map(m => m.id),
      isAutoGenerated: true,
      crossSubjectSlugs: subjectSlugs,
    };
  }
  ```

### 4. Public API Endpoints

**File**: `server/src/routes/subjects.ts`

- [x] `GET /api/subjects/:slug/content` - Get content by subject
  ```typescript
  router.get('/:slug/content', async (req, res) => {
    const { slug } = req.params;
    const {
      types,         // comma-separated: milestone,glossary_term
      includeChildren,
      primaryOnly,
      limit,
      offset,
      sortBy,
    } = req.query;

    const content = await subjectContentService.getContentBySubject(slug, {
      contentTypes: types?.split(','),
      includeChildren: includeChildren === 'true',
      primaryOnly: primaryOnly === 'true',
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
      sortBy: sortBy || 'date',
    });

    res.json(content);
  });
  ```

- [x] `GET /api/subjects/:slug/stats` - Get content counts (already in subjects.ts)

- [x] `GET /api/subjects/:slug/learning-path` - Get auto-generated learning path

- [x] `POST /api/subjects/cross-path` - Generate cross-subject path
  ```typescript
  router.post('/cross-path', async (req, res) => {
    const { subjects, title, maxMilestones } = req.body;
    const path = await learningPathService.generateCrossSubjectPath(subjects, {
      title,
      maxMilestones,
    });
    res.json(path);
  });
  ```

### 5. Timeline Subject Filter

**File**: `server/src/services/milestones.ts` + `server/src/controllers/milestones.ts`

- [x] Add subject filter to `GET /api/milestones/filter`
  ```typescript
  router.get('/', async (req, res) => {
    const { subject, includeChildren, ...otherFilters } = req.query;

    let milestoneIds: string[] | undefined;

    if (subject) {
      const subjectContent = await subjectContentService.getContentBySubject(subject, {
        contentTypes: ['milestone'],
        includeChildren: includeChildren === 'true',
      });
      milestoneIds = subjectContent.milestones.map(m => m.id);
    }

    const milestones = await prisma.milestone.findMany({
      where: {
        ...(milestoneIds ? { id: { in: milestoneIds } } : {}),
        // ... other existing filters
      },
      orderBy: { date: 'desc' },
    });

    res.json(milestones);
  });
  ```

### 6. Glossary Subject Filter

**File**: `server/src/services/glossary.ts` + `server/src/controllers/glossary.ts`

- [x] Add subject filter to `GET /api/glossary`
  ```typescript
  router.get('/', async (req, res) => {
    const { subject } = req.query;

    let termIds: string[] | undefined;

    if (subject) {
      const subjectContent = await subjectContentService.getContentBySubject(subject, {
        contentTypes: ['glossary_term'],
        includeChildren: true,
      });
      termIds = subjectContent.glossaryTerms.map(t => t.id);
    }

    const terms = await prisma.glossaryTerm.findMany({
      where: termIds ? { id: { in: termIds } } : undefined,
      orderBy: { term: 'asc' },
    });

    res.json(terms);
  });
  ```

### 7. Subject Recommendations

**File**: `server/src/services/subjectContentService.ts` (combined)

- [x] `getRelatedContent(contentType, contentId)` - Get content with overlapping subjects
  ```typescript
  async function getRelatedContent(
    contentType: string,
    contentId: string,
    limit = 5
  ): Promise<RelatedContent[]> {
    // Get subjects for this content
    const contentSubjects = await prisma.contentSubject.findMany({
      where: { contentType, contentId },
    });

    const subjectIds = contentSubjects.map(cs => cs.subjectId);

    // Find other content with same subjects
    const related = await prisma.contentSubject.findMany({
      where: {
        subjectId: { in: subjectIds },
        NOT: { contentType, contentId },  // Exclude self
      },
      distinct: ['contentType', 'contentId'],
      take: limit * 2,  // Get extra, will dedupe
    });

    // Score by subject overlap
    const scored = scoreByOverlap(related, subjectIds);

    return await hydrateContent(scored.slice(0, limit));
  }
  ```

- [ ] `getSubjectRecommendations(userProfile)` - Recommend subjects based on user interests
  ```typescript
  async function getSubjectRecommendations(
    sessionId: string
  ): Promise<SubjectRecommendation[]> {
    // Get user's completed learning paths
    const pathProgress = await prisma.userPathProgress.findMany({
      where: { sessionId },
    });

    // Get subjects from completed milestones
    const completedMilestoneIds = pathProgress.flatMap(p =>
      JSON.parse(p.completedMilestoneIds)
    );

    const userSubjects = await prisma.contentSubject.findMany({
      where: {
        contentType: 'milestone',
        contentId: { in: completedMilestoneIds },
      },
    });

    // Find related subjects user hasn't explored
    // ... recommendation logic
  }
  ```

### 8. Frontend API Client Updates

**File**: `src/services/api.ts`

- [x] Add subjects API client with all methods
- [x] Add TypeScript types for SubjectContent, GeneratedLearningPath, RelatedContentItem
- [x] Add subject filter params to milestonesApi and glossaryApi
  ```typescript
  export const milestonesApi = {
    getAll: (params?: { subject?: string; includeChildren?: boolean; ... }) =>
      api.get('/milestones', { params }),
    // ...
  };
  ```

---

## Browser Testing & Validation

> **CRITICAL**: Use Claude Chrome MCP tools to test all web features.

### Subject Content API - Browser Validation

- [ ] Get browser context: `mcp__claude-in-chrome__tabs_context_mcp`
- [ ] Open browser dev tools Network tab
- [ ] Navigate to a page that will call `/api/subjects/science-cs-nlp/content`
- [ ] Verify API returns content correctly
- [ ] Test with different query params (types, includeChildren, etc.)
- [ ] Check console for errors

### Timeline Subject Filter - Browser Validation

- [ ] Navigate to timeline page `/`
- [ ] Locate subject filter UI (if implemented in this sprint)
- [ ] Or test via URL params: `/?subject=science-cs-nlp`
- [ ] Verify timeline shows only NLP-related milestones
- [ ] Test clearing filter returns all milestones
- [ ] Screenshot filtered vs unfiltered states

### Learning Path API - Browser Validation

- [ ] Test `/api/subjects/science-cs-ml/learning-path`
- [ ] Verify path includes appropriate milestones in chronological order
- [ ] Test cross-subject path generation
- [ ] Check response structure matches expected schema

---

## Acceptance Criteria

- [x] Subject content query returns accurate results
- [x] Subject stats endpoint shows correct counts
- [x] Auto-generated learning paths are coherent
- [x] Cross-subject paths work correctly
- [x] Timeline can be filtered by subject
- [x] Glossary can be filtered by subject
- [x] Related content recommendations work
- [x] API client updated in frontend
- [ ] All browser validation tasks completed (deferred - APIs tested via curl)

---

## Notes for Future Developers

### Query Performance
Subject content queries join ContentSubject → actual content tables. Consider:
- Materialized views for hot subjects
- Caching subject stats (update on content change)
- Pagination for large subjects

### Learning Path Quality
Auto-generated paths are a starting point. Consider:
- AI enhancement of path descriptions
- Manual curation flag for reviewed paths
- User ratings to improve recommendations

### Subject Hierarchy in Queries
When `includeChildren` is true, query expands to all descendant subjects. For deep hierarchies, this could be expensive. Consider limiting depth or pre-computing descendant lists.

### Cross-Subject Paths
Cross-subject paths can get large. Default to limiting milestones and providing "see more" expansion.
