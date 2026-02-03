/**
 * Subject Service
 * Sprint Subj-1 - Subject Taxonomy System
 *
 * Service layer for managing hierarchical subject taxonomy
 */

import { prisma } from '../db';
import type { Subject, SubjectSynonym, ContentSubject } from '@prisma/client';

// =============================================================================
// Types
// =============================================================================

export type SubjectDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type ContentType = 'milestone' | 'glossary_term' | 'current_event' | 'person' | 'organization';
export type ContentSubjectSource = 'auto' | 'manual' | 'migration';

export interface SubjectWithChildren extends Subject {
  children?: SubjectWithChildren[];
  parent?: Subject | null;
}

export interface SubjectWithCounts extends Subject {
  contentCount: number;
}

export interface CreateSubjectDto {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string;
  defaultDifficulty?: SubjectDifficulty;
  learningObjectives?: string[];
  color?: string;
  icon?: string;
}

export interface UpdateSubjectDto {
  name?: string;
  description?: string | null;
  defaultDifficulty?: SubjectDifficulty | null;
  learningObjectives?: string[];
  color?: string | null;
  icon?: string | null;
}

export interface SubjectContentQuery {
  contentTypes?: ContentType[];
  includeChildren?: boolean;
  primaryOnly?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'significance' | 'confidence';
}

export interface SubjectStats {
  subjectSlug: string;
  milestones: number;
  glossaryTerms: number;
  currentEvents: number;
  persons: number;
  organizations: number;
  total: number;
}

export interface ContentSubjectInput {
  subjectId: string;
  isPrimary?: boolean;
  confidence?: number;
  source?: ContentSubjectSource;
}

// =============================================================================
// Tree Operations
// =============================================================================

/**
 * Get the full subject taxonomy tree
 * Returns domains with their categories and subcategories nested
 */
export async function getSubjectTree(): Promise<SubjectWithChildren[]> {
  if (!prisma) throw new Error('Database not available');

  // Get all domains (level 0)
  const domains = await prisma.subject.findMany({
    where: { level: 0 },
    orderBy: { name: 'asc' },
  });

  // Build tree for each domain
  const tree: SubjectWithChildren[] = [];

  for (const domain of domains) {
    const categories = await prisma.subject.findMany({
      where: { parentId: domain.id },
      orderBy: { name: 'asc' },
    });

    const domainWithChildren: SubjectWithChildren = {
      ...domain,
      children: [],
    };

    for (const category of categories) {
      const subcategories = await prisma.subject.findMany({
        where: { parentId: category.id },
        orderBy: { name: 'asc' },
      });

      domainWithChildren.children!.push({
        ...category,
        children: subcategories,
        parent: domain,
      });
    }

    tree.push(domainWithChildren);
  }

  return tree;
}

/**
 * Get a subject by slug with its children
 */
export async function getBySlug(slug: string): Promise<SubjectWithChildren | null> {
  if (!prisma) throw new Error('Database not available');

  const subject = await prisma.subject.findUnique({
    where: { slug },
  });

  if (!subject) return null;

  const children = await prisma.subject.findMany({
    where: { parentId: subject.id },
    orderBy: { name: 'asc' },
  });

  const parent = subject.parentId
    ? await prisma.subject.findUnique({ where: { id: subject.parentId } })
    : null;

  return {
    ...subject,
    children,
    parent,
  };
}

/**
 * Get a subject by ID
 */
export async function getById(id: string): Promise<Subject | null> {
  if (!prisma) throw new Error('Database not available');

  return prisma.subject.findUnique({
    where: { id },
  });
}

/**
 * Get ancestors of a subject (parent chain up to root)
 */
export async function getAncestors(slug: string): Promise<Subject[]> {
  if (!prisma) throw new Error('Database not available');

  const subject = await prisma.subject.findUnique({ where: { slug } });
  if (!subject) return [];

  const ancestors: Subject[] = [];
  let current = subject;

  while (current.parentId) {
    const parent = await prisma.subject.findUnique({ where: { id: current.parentId } });
    if (!parent) break;
    ancestors.unshift(parent);
    current = parent;
  }

  return ancestors;
}

/**
 * Get all descendants of a subject (children, grandchildren, etc.)
 */
export async function getDescendants(subjectId: string): Promise<Subject[]> {
  if (!prisma) throw new Error('Database not available');

  const descendants: Subject[] = [];
  const queue: string[] = [subjectId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = await prisma.subject.findMany({
      where: { parentId: currentId },
    });

    descendants.push(...children);
    queue.push(...children.map(c => c.id));
  }

  return descendants;
}

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Get all subjects (flat list with pagination)
 */
export async function getAll(options?: {
  level?: number;
  domainSlug?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ subjects: Subject[]; total: number }> {
  if (!prisma) throw new Error('Database not available');

  const where: Record<string, unknown> = {};

  if (options?.level !== undefined) {
    where.level = options.level;
  }

  if (options?.domainSlug) {
    where.domainSlug = options.domainSlug;
  }

  if (options?.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { description: { contains: options.search, mode: 'insensitive' } },
      { slug: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  const [subjects, total] = await Promise.all([
    prisma.subject.findMany({
      where,
      skip: options?.offset ?? 0,
      take: options?.limit ?? 100,
      orderBy: [{ level: 'asc' }, { path: 'asc' }],
    }),
    prisma.subject.count({ where }),
  ]);

  return { subjects, total };
}

/**
 * Create a new subject
 */
export async function create(data: CreateSubjectDto): Promise<Subject> {
  if (!prisma) throw new Error('Database not available');

  // Determine level and parent info
  let level = 0;
  let path = data.name;
  let domainSlug = '';

  if (data.parentId) {
    const parent = await prisma.subject.findUnique({ where: { id: data.parentId } });
    if (!parent) throw new Error('Parent subject not found');

    level = parent.level + 1;
    if (level > 2) throw new Error('Maximum subject depth is 3 levels (domain > category > subcategory)');

    path = `${parent.path} > ${data.name}`;
    domainSlug = parent.domainSlug;
  }

  // Generate slug if not provided
  const slug = data.slug || generateSlug(data.name, domainSlug, level);

  // If this is a domain (level 0), use its slug as domainSlug
  if (level === 0) {
    domainSlug = slug;
  }

  return prisma.subject.create({
    data: {
      slug,
      name: data.name,
      description: data.description || null,
      level,
      parentId: data.parentId || null,
      path,
      domainSlug,
      defaultDifficulty: data.defaultDifficulty || null,
      learningObjectives: JSON.stringify(data.learningObjectives || []),
      color: data.color || null,
      icon: data.icon || null,
    },
  });
}

/**
 * Update a subject
 */
export async function update(id: string, data: UpdateSubjectDto): Promise<Subject> {
  if (!prisma) throw new Error('Database not available');

  const existing = await prisma.subject.findUnique({ where: { id } });
  if (!existing) throw new Error('Subject not found');

  // If name changes, update path for this subject and all descendants
  if (data.name && data.name !== existing.name) {
    await updatePaths(id, existing.name, data.name);
  }

  return prisma.subject.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.defaultDifficulty !== undefined && { defaultDifficulty: data.defaultDifficulty }),
      ...(data.learningObjectives && { learningObjectives: JSON.stringify(data.learningObjectives) }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.icon !== undefined && { icon: data.icon }),
    },
  });
}

/**
 * Delete a subject
 * If reassignTo is provided, moves content assignments to that subject
 */
export async function remove(id: string, reassignTo?: string): Promise<void> {
  if (!prisma) throw new Error('Database not available');

  const subject = await prisma.subject.findUnique({ where: { id } });
  if (!subject) throw new Error('Subject not found');

  // Check for children
  const childCount = await prisma.subject.count({ where: { parentId: id } });
  if (childCount > 0) {
    throw new Error('Cannot delete subject with children. Delete children first or reassign them.');
  }

  // Reassign or delete content subjects
  if (reassignTo) {
    await prisma.contentSubject.updateMany({
      where: { subjectId: id },
      data: { subjectId: reassignTo },
    });
  } else {
    await prisma.contentSubject.deleteMany({ where: { subjectId: id } });
  }

  // Delete synonyms
  await prisma.subjectSynonym.deleteMany({ where: { subjectId: id } });

  // Delete subject
  await prisma.subject.delete({ where: { id } });
}

// =============================================================================
// Synonym Operations
// =============================================================================

/**
 * Get all synonyms
 */
export async function getAllSynonyms(options?: {
  subjectId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ synonyms: SubjectSynonym[]; total: number }> {
  if (!prisma) throw new Error('Database not available');

  const where: Record<string, unknown> = {};

  if (options?.subjectId) {
    where.subjectId = options.subjectId;
  }

  if (options?.search) {
    where.term = { contains: options.search, mode: 'insensitive' };
  }

  const [synonyms, total] = await Promise.all([
    prisma.subjectSynonym.findMany({
      where,
      skip: options?.offset ?? 0,
      take: options?.limit ?? 100,
      orderBy: { term: 'asc' },
      include: { subject: true },
    }),
    prisma.subjectSynonym.count({ where }),
  ]);

  return { synonyms, total };
}

/**
 * Create a synonym
 */
export async function createSynonym(term: string, subjectId: string): Promise<SubjectSynonym> {
  if (!prisma) throw new Error('Database not available');

  return prisma.subjectSynonym.create({
    data: { term, subjectId },
    include: { subject: true },
  });
}

/**
 * Delete a synonym
 */
export async function deleteSynonym(id: string): Promise<void> {
  if (!prisma) throw new Error('Database not available');

  await prisma.subjectSynonym.delete({ where: { id } });
}

/**
 * Find a subject by term (checks slug, name, and synonyms)
 */
export async function findByTerm(term: string): Promise<Subject | null> {
  if (!prisma) throw new Error('Database not available');

  // Check exact slug match
  const bySlug = await prisma.subject.findUnique({ where: { slug: term.toLowerCase() } });
  if (bySlug) return bySlug;

  // Check name match (case insensitive)
  const byName = await prisma.subject.findFirst({
    where: { name: { equals: term, mode: 'insensitive' } },
  });
  if (byName) return byName;

  // Check synonym match
  const synonym = await prisma.subjectSynonym.findUnique({
    where: { term },
    include: { subject: true },
  });
  if (synonym) return synonym.subject;

  // Case-insensitive synonym search
  const synonymInsensitive = await prisma.subjectSynonym.findFirst({
    where: { term: { equals: term, mode: 'insensitive' } },
    include: { subject: true },
  });
  if (synonymInsensitive) return synonymInsensitive.subject;

  return null;
}

// =============================================================================
// Content Subject Operations
// =============================================================================

/**
 * Get subjects for a piece of content
 */
export async function getContentSubjects(
  contentType: ContentType,
  contentId: string
): Promise<ContentSubject[]> {
  if (!prisma) throw new Error('Database not available');

  return prisma.contentSubject.findMany({
    where: { contentType, contentId },
    include: { subject: true },
    orderBy: [{ isPrimary: 'desc' }, { confidence: 'desc' }],
  });
}

/**
 * Set subjects for a piece of content (replaces existing)
 */
export async function setContentSubjects(
  contentType: ContentType,
  contentId: string,
  subjects: ContentSubjectInput[]
): Promise<ContentSubject[]> {
  if (!prisma) throw new Error('Database not available');

  // Delete existing
  await prisma.contentSubject.deleteMany({
    where: { contentType, contentId },
  });

  // Ensure only one primary
  const hasPrimary = subjects.some(s => s.isPrimary);
  const subjectsWithPrimary = subjects.map((s, i) => ({
    ...s,
    isPrimary: hasPrimary ? s.isPrimary : i === 0,
  }));

  // Create new
  await prisma.contentSubject.createMany({
    data: subjectsWithPrimary.map(s => ({
      contentType,
      contentId,
      subjectId: s.subjectId,
      isPrimary: s.isPrimary || false,
      confidence: s.confidence,
      source: s.source || 'manual',
    })),
  });

  return getContentSubjects(contentType, contentId);
}

/**
 * Add a subject to content (doesn't replace existing)
 */
export async function addContentSubject(
  contentType: ContentType,
  contentId: string,
  subjectId: string,
  options?: {
    isPrimary?: boolean;
    confidence?: number;
    source?: ContentSubjectSource;
  }
): Promise<ContentSubject> {
  if (!prisma) throw new Error('Database not available');

  // If setting as primary, unset other primaries
  if (options?.isPrimary) {
    await prisma.contentSubject.updateMany({
      where: { contentType, contentId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  return prisma.contentSubject.upsert({
    where: {
      contentType_contentId_subjectId: { contentType, contentId, subjectId },
    },
    create: {
      contentType,
      contentId,
      subjectId,
      isPrimary: options?.isPrimary || false,
      confidence: options?.confidence,
      source: options?.source || 'manual',
    },
    update: {
      isPrimary: options?.isPrimary,
      confidence: options?.confidence,
      source: options?.source,
    },
    include: { subject: true },
  });
}

/**
 * Remove a subject from content
 */
export async function removeContentSubject(
  contentType: ContentType,
  contentId: string,
  subjectId: string
): Promise<void> {
  if (!prisma) throw new Error('Database not available');

  await prisma.contentSubject.delete({
    where: {
      contentType_contentId_subjectId: { contentType, contentId, subjectId },
    },
  });
}

/**
 * Get content stats for a subject
 * @param includeChildren - If true, includes counts from descendant subjects
 */
export async function getSubjectStats(
  slug: string,
  options?: { includeChildren?: boolean }
): Promise<SubjectStats | null> {
  if (!prisma) throw new Error('Database not available');

  const subject = await prisma.subject.findUnique({ where: { slug } });
  if (!subject) return null;

  // Get subject IDs to query (optionally including descendants)
  let subjectIds = [subject.id];
  if (options?.includeChildren) {
    const descendants = await getDescendants(subject.id);
    subjectIds = [...subjectIds, ...descendants.map(d => d.id)];
  }

  const counts = await prisma.contentSubject.groupBy({
    by: ['contentType'],
    where: { subjectId: { in: subjectIds } },
    _count: true,
  });

  const getCount = (type: ContentType) =>
    counts.find(c => c.contentType === type)?._count || 0;

  return {
    subjectSlug: slug,
    milestones: getCount('milestone'),
    glossaryTerms: getCount('glossary_term'),
    currentEvents: getCount('current_event'),
    persons: getCount('person'),
    organizations: getCount('organization'),
    total: counts.reduce((sum, c) => sum + c._count, 0),
  };
}

/**
 * Get content IDs for a subject
 */
export async function getSubjectContentIds(
  slug: string,
  options?: SubjectContentQuery
): Promise<{ contentType: ContentType; contentId: string }[]> {
  if (!prisma) throw new Error('Database not available');

  const subject = await prisma.subject.findUnique({ where: { slug } });
  if (!subject) return [];

  // Get subject IDs to query
  let subjectIds = [subject.id];
  if (options?.includeChildren) {
    const descendants = await getDescendants(subject.id);
    subjectIds = [...subjectIds, ...descendants.map(d => d.id)];
  }

  const where: Record<string, unknown> = {
    subjectId: { in: subjectIds },
  };

  if (options?.contentTypes?.length) {
    where.contentType = { in: options.contentTypes };
  }

  if (options?.primaryOnly) {
    where.isPrimary = true;
  }

  const results = await prisma.contentSubject.findMany({
    where,
    select: { contentType: true, contentId: true },
    distinct: ['contentType', 'contentId'],
    skip: options?.offset ?? 0,
    take: options?.limit ?? 100,
    orderBy: options?.sortBy === 'confidence'
      ? { confidence: 'desc' }
      : { createdAt: 'desc' },
  });

  return results.map(r => ({
    contentType: r.contentType as ContentType,
    contentId: r.contentId,
  }));
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a slug from a name
 */
function generateSlug(name: string, domainSlug: string, level: number): string {
  const nameSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (level === 0) {
    return nameSlug;
  }

  // For categories and subcategories, prepend domain
  return `${domainSlug}-${nameSlug}`;
}

/**
 * Update paths when a subject name changes
 */
async function updatePaths(subjectId: string, oldName: string, newName: string): Promise<void> {
  if (!prisma) throw new Error('Database not available');

  // Get subject and descendants
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) return;

  const descendants = await getDescendants(subjectId);

  // Update this subject's path
  const newPath = subject.path.replace(oldName, newName);
  await prisma.subject.update({
    where: { id: subjectId },
    data: { path: newPath, name: newName },
  });

  // Update descendants' paths
  for (const desc of descendants) {
    const updatedPath = desc.path.replace(oldName, newName);
    await prisma.subject.update({
      where: { id: desc.id },
      data: { path: updatedPath },
    });
  }
}

// =============================================================================
// Backfill Functions
// =============================================================================

interface BackfillOptions {
  contentType: string;
  mode: 'rule' | 'ai' | 'both';
  batchSize: number;
}

interface BackfillResult {
  message: string;
  stats: {
    processed: number;
    created: number;
    skipped: number;
    errors: number;
  };
}

interface BackfillStatus {
  isRunning: boolean;
  currentJob: {
    contentType: string;
    mode: string;
    processed: number;
    total: number;
    percentComplete: number;
  } | null;
  lastRun: {
    contentType: string;
    mode: string;
    completedAt: string;
    stats: BackfillResult['stats'];
  } | null;
}

interface CoverageStats {
  milestone: { total: number; classified: number; unclassified: number; percentage: number };
  glossary_term: { total: number; classified: number; unclassified: number; percentage: number };
  current_event: { total: number; classified: number; unclassified: number; percentage: number };
  person: { total: number; classified: number; unclassified: number; percentage: number };
  organization: { total: number; classified: number; unclassified: number; percentage: number };
  overall: { total: number; classified: number; percentage: number };
  bySource: { auto: number; manual: number; migration: number };
  topSubjects: Array<{ slug: string; name: string; count: number }>;
}

// Simple in-memory state for backfill (can be replaced with DB-based tracking)
let backfillState: {
  isRunning: boolean;
  currentJob: BackfillStatus['currentJob'];
  lastRun: BackfillStatus['lastRun'];
} = {
  isRunning: false,
  currentJob: null,
  lastRun: null,
};

/**
 * Start a subject backfill job
 * For now, this runs synchronously (small datasets)
 * TODO: For larger datasets, implement async job queue
 */
export async function startBackfill(options: BackfillOptions): Promise<BackfillResult> {
  if (!prisma) throw new Error('Database not available');

  if (backfillState.isRunning) {
    throw new Error('A backfill job is already running');
  }

  backfillState.isRunning = true;
  backfillState.currentJob = {
    contentType: options.contentType,
    mode: options.mode,
    processed: 0,
    total: 0,
    percentComplete: 0,
  };

  const stats = { processed: 0, created: 0, skipped: 0, errors: 0 };

  try {
    const contentTypes = options.contentType === 'all'
      ? ['milestone', 'glossary_term', 'current_event', 'person', 'organization']
      : [options.contentType];

    for (const contentType of contentTypes) {
      const result = await backfillContentType(contentType as ContentType, options.mode);
      stats.processed += result.processed;
      stats.created += result.created;
      stats.skipped += result.skipped;
      stats.errors += result.errors;
    }

    backfillState.lastRun = {
      contentType: options.contentType,
      mode: options.mode,
      completedAt: new Date().toISOString(),
      stats,
    };

    return {
      message: `Backfill complete for ${options.contentType}`,
      stats,
    };
  } finally {
    backfillState.isRunning = false;
    backfillState.currentJob = null;
  }
}

/**
 * Backfill subjects for a specific content type (rule-based only for now)
 */
async function backfillContentType(
  contentType: ContentType,
  mode: string
): Promise<{ processed: number; created: number; skipped: number; errors: number }> {
  if (!prisma) throw new Error('Database not available');

  // Import migration helpers
  const {
    inferMilestoneSubjects,
    inferPersonSubjects,
    inferOrganizationSubjects,
    glossaryCategoryToSubject,
  } = await import('./migration/subjectMigration');

  const stats = { processed: 0, created: 0, skipped: 0, errors: 0 };

  // Get IDs of items that already have subjects (polymorphic query)
  const classifiedIds = await prisma.contentSubject.findMany({
    where: { contentType },
    select: { contentId: true },
    distinct: ['contentId'],
  });
  const classifiedIdSet = new Set(classifiedIds.map(c => c.contentId));

  // Get all items and filter out already classified ones
  let items: { id: string; [key: string]: unknown }[] = [];

  switch (contentType) {
    case 'milestone':
      items = await prisma.milestone.findMany({
        select: { id: true, title: true, category: true, tags: true },
      });
      break;
    case 'glossary_term':
      items = await prisma.glossaryTerm.findMany({
        select: { id: true, term: true, category: true, relatedTermIds: true },
      });
      break;
    case 'current_event':
      items = await prisma.currentEvent.findMany({
        select: { id: true, headline: true, summary: true },
      });
      break;
    case 'person':
      items = await prisma.person.findMany({
        select: { id: true, canonicalName: true, role: true, focusAreas: true },
      });
      break;
    case 'organization':
      items = await prisma.organization.findMany({
        select: { id: true, name: true, type: true, focusAreas: true },
      });
      break;
  }

  // Filter to only unclassified items
  items = items.filter(item => !classifiedIdSet.has(item.id));

  for (const item of items) {
    stats.processed++;
    let subjectSlugs: string[] = [];

    try {
      switch (contentType) {
        case 'milestone': {
          const tags = JSON.parse((item.tags as string) || '[]');
          subjectSlugs = inferMilestoneSubjects({
            category: item.category as string,
            tags,
            title: item.title as string,
          });
          break;
        }
        case 'glossary_term': {
          const category = item.category as string;
          if (category && glossaryCategoryToSubject[category]) {
            subjectSlugs = glossaryCategoryToSubject[category];
          }
          if (subjectSlugs.length === 0) {
            subjectSlugs = ['science-cs-ml'];
          }
          break;
        }
        case 'current_event': {
          // CurrentEvents don't have category/tags - default to business news
          subjectSlugs = ['business-technology-software'];
          break;
        }
        case 'person': {
          const focusAreas = JSON.parse((item.focusAreas as string) || '[]');
          subjectSlugs = inferPersonSubjects({
            role: item.role as string | undefined,
            focusAreas,
          });
          if (subjectSlugs.length === 0) {
            subjectSlugs = ['science-cs-ml'];
          }
          break;
        }
        case 'organization': {
          const focusAreas = JSON.parse((item.focusAreas as string) || '[]');
          subjectSlugs = inferOrganizationSubjects({
            type: item.type as string | undefined,
            focusAreas,
          });
          break;
        }
      }

      if (subjectSlugs.length === 0) {
        stats.skipped++;
        continue;
      }

      // Get subject IDs
      const subjects = await prisma.subject.findMany({
        where: { slug: { in: subjectSlugs } },
        select: { id: true, slug: true },
      });

      const slugToId = new Map(subjects.map(s => [s.slug, s.id]));

      // Create ContentSubject records
      for (let i = 0; i < subjectSlugs.length; i++) {
        const subjectId = slugToId.get(subjectSlugs[i]);
        if (!subjectId) continue;

        await prisma.contentSubject.upsert({
          where: {
            contentType_contentId_subjectId: {
              contentType,
              contentId: item.id,
              subjectId,
            },
          },
          update: {},
          create: {
            contentType,
            contentId: item.id,
            subjectId,
            isPrimary: i === 0,
            source: 'migration',
          },
        });
        stats.created++;
      }
    } catch (error) {
      console.error(`Error backfilling ${contentType} ${item.id}:`, error);
      stats.errors++;
    }
  }

  return stats;
}

/**
 * Get current backfill job status
 */
export async function getBackfillStatus(): Promise<BackfillStatus> {
  return {
    isRunning: backfillState.isRunning,
    currentJob: backfillState.currentJob,
    lastRun: backfillState.lastRun,
  };
}

/**
 * Get classification coverage statistics
 */
export async function getCoverageStats(): Promise<CoverageStats> {
  if (!prisma) throw new Error('Database not available');

  const getTypeStats = async (type: string, countQuery: () => Promise<number>) => {
    const total = await countQuery();
    const classified = await prisma.contentSubject.groupBy({
      by: ['contentId'],
      where: { contentType: type },
    }).then(r => r.length);

    return {
      total,
      classified,
      unclassified: total - classified,
      percentage: total > 0 ? Math.round((classified / total) * 100) : 0,
    };
  };

  const [milestone, glossary_term, current_event, person, organization] = await Promise.all([
    getTypeStats('milestone', () => prisma!.milestone.count()),
    getTypeStats('glossary_term', () => prisma!.glossaryTerm.count()),
    getTypeStats('current_event', () => prisma!.currentEvent.count()),
    getTypeStats('person', () => prisma!.person.count()),
    getTypeStats('organization', () => prisma!.organization.count()),
  ]);

  const totalContent = milestone.total + glossary_term.total + current_event.total + person.total + organization.total;
  const totalClassified = milestone.classified + glossary_term.classified + current_event.classified + person.classified + organization.classified;

  // By source
  const bySourceData = await prisma.contentSubject.groupBy({
    by: ['source'],
    _count: true,
  });

  const bySource = {
    auto: bySourceData.find(s => s.source === 'auto')?._count || 0,
    manual: bySourceData.find(s => s.source === 'manual')?._count || 0,
    migration: bySourceData.find(s => s.source === 'migration')?._count || 0,
  };

  // Top subjects
  const topSubjectsData = await prisma.contentSubject.groupBy({
    by: ['subjectId'],
    _count: true,
    orderBy: { _count: { subjectId: 'desc' } },
    take: 10,
  });

  const subjectIds = topSubjectsData.map(s => s.subjectId);
  const subjectsInfo = await prisma.subject.findMany({
    where: { id: { in: subjectIds } },
    select: { id: true, slug: true, name: true },
  });

  const subjectMap = new Map(subjectsInfo.map(s => [s.id, s]));
  const topSubjects = topSubjectsData.map(s => ({
    slug: subjectMap.get(s.subjectId)?.slug || 'unknown',
    name: subjectMap.get(s.subjectId)?.name || 'Unknown',
    count: s._count,
  }));

  return {
    milestone,
    glossary_term,
    current_event,
    person,
    organization,
    overall: {
      total: totalContent,
      classified: totalClassified,
      percentage: totalContent > 0 ? Math.round((totalClassified / totalContent) * 100) : 0,
    },
    bySource,
    topSubjects,
  };
}
