/**
 * Subject Controller
 * Sprint Subj-1 - Subject Taxonomy System
 *
 * Request handlers for subject taxonomy API endpoints
 */

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import * as subjectService from '../services/subjects';
import * as subjectContentService from '../services/subjectContentService';

// =============================================================================
// Public Endpoints
// =============================================================================

/**
 * GET /api/subjects/tree
 * Get the full subject taxonomy tree
 */
export async function getTree(req: Request, res: Response, next: NextFunction) {
  try {
    const tree = await subjectService.getSubjectTree();
    res.json(tree);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/subjects/:slug
 * Get a subject by slug with its children
 */
export async function getBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;
    const subject = await subjectService.getBySlug(slug);

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json(subject);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/subjects/:slug/ancestors
 * Get ancestors of a subject (parent chain)
 */
export async function getAncestors(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;
    const ancestors = await subjectService.getAncestors(slug);
    res.json(ancestors);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/subjects/:slug/stats
 * Get content statistics for a subject
 * Query params:
 *   - includeChildren: if 'true', includes counts from descendant subjects
 */
export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;
    const includeChildren = req.query.includeChildren === 'true';

    const stats = await subjectService.getSubjectStats(slug, { includeChildren });

    if (!stats) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json(stats);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/subjects/:slug/content
 * Get content tagged with this subject
 * Query params:
 *   - hydrated: if 'true', returns full content objects (default: content IDs only)
 *   - types: comma-separated content types
 *   - includeChildren: if 'true', includes child subject content
 *   - primaryOnly: if 'true', only primary subject assignments
 *   - limit, offset: pagination
 *   - sortBy: 'date', 'significance', or 'confidence'
 */
export async function getContent(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;
    const {
      hydrated,
      types,
      includeChildren,
      primaryOnly,
      limit,
      offset,
      sortBy,
    } = req.query;

    const options = {
      contentTypes: types ? String(types).split(',') as subjectService.ContentType[] : undefined,
      includeChildren: includeChildren === 'true',
      primaryOnly: primaryOnly === 'true',
      limit: limit ? parseInt(String(limit)) : 20,
      offset: offset ? parseInt(String(offset)) : 0,
      sortBy: sortBy as 'date' | 'significance' | 'confidence' | undefined,
    };

    // If hydrated, return full content objects
    if (hydrated === 'true') {
      const content = await subjectContentService.getContentBySubject(slug, options);
      return res.json(content);
    }

    // Otherwise return just content IDs (legacy behavior)
    const content = await subjectService.getSubjectContentIds(slug, options);
    res.json(content);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/subjects/:slug/learning-path
 * Get auto-generated learning path for a subject
 */
export async function getLearningPath(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;

    const path = await subjectContentService.generateSubjectLearningPath(slug);

    if (!path) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json(path);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/subjects/cross-path
 * Generate a learning path spanning multiple subjects
 * Body: { subjects: string[], title?: string, maxMilestones?: number }
 */
export async function getCrossPath(req: Request, res: Response, next: NextFunction) {
  try {
    const { subjects, title, maxMilestones } = req.body;

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: 'subjects array is required' });
    }

    const path = await subjectContentService.generateCrossSubjectPath(subjects, {
      title,
      maxMilestones,
    });

    if (!path) {
      return res.status(404).json({ error: 'No subjects found' });
    }

    res.json(path);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/subjects/:slug/related
 * Get content related to a specific piece of content (shares subjects)
 * Query params: contentType, contentId, limit
 */
export async function getRelatedContent(req: Request, res: Response, next: NextFunction) {
  try {
    const { contentType, contentId, limit } = req.query;

    if (!contentType || !contentId) {
      return res.status(400).json({ error: 'contentType and contentId are required' });
    }

    const validTypes = ['milestone', 'glossary_term', 'current_event', 'person', 'organization'];
    if (!validTypes.includes(String(contentType))) {
      return res.status(400).json({ error: `Invalid contentType. Must be one of: ${validTypes.join(', ')}` });
    }

    const related = await subjectContentService.getRelatedContent(
      String(contentType) as subjectService.ContentType,
      String(contentId),
      limit ? parseInt(String(limit)) : 5
    );

    res.json(related);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/subjects/search
 * Search subjects by term
 */
export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    // Search in subjects
    const { subjects } = await subjectService.getAll({
      search: q,
      limit: 10,
    });

    // Also check synonyms
    const { synonyms } = await subjectService.getAllSynonyms({
      search: q,
      limit: 5,
    });

    const synonymSubjects = synonyms
      .filter(s => s.subject)
      .map(s => ({
        ...s.subject!,
        matchedSynonym: s.term,
      }));

    // Combine and dedupe
    const allResults = [...subjects];
    for (const synSubject of synonymSubjects) {
      if (!allResults.some(s => s.id === synSubject.id)) {
        allResults.push(synSubject);
      }
    }

    res.json(allResults.slice(0, 10));
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// Admin Endpoints
// =============================================================================

/**
 * GET /api/admin/subjects
 * List all subjects with pagination
 */
export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const { level, domainSlug, search, limit, offset } = req.query;

    const result = await subjectService.getAll({
      level: level !== undefined ? parseInt(String(level)) : undefined,
      domainSlug: domainSlug ? String(domainSlug) : undefined,
      search: search ? String(search) : undefined,
      limit: limit ? parseInt(String(limit)) : 100,
      offset: offset ? parseInt(String(offset)) : 0,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/subjects
 * Create a new subject
 */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, slug, description, parentId, defaultDifficulty, learningObjectives, color, icon } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const subject = await subjectService.create({
      name,
      slug,
      description,
      parentId,
      defaultDifficulty,
      learningObjectives,
      color,
      icon,
    });

    res.status(201).json(subject);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof Error && error.message.includes('Maximum')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

/**
 * PUT /api/admin/subjects/:id
 * Update a subject
 */
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, description, defaultDifficulty, learningObjectives, color, icon } = req.body;

    const subject = await subjectService.update(id, {
      name,
      description,
      defaultDifficulty,
      learningObjectives,
      color,
      icon,
    });

    res.json(subject);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
}

/**
 * DELETE /api/admin/subjects/:id
 * Delete a subject
 */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reassignTo } = req.query;

    await subjectService.remove(id, reassignTo ? String(reassignTo) : undefined);

    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof Error && error.message.includes('children')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

// =============================================================================
// Synonym Endpoints
// =============================================================================

/**
 * GET /api/admin/subjects/synonyms
 * List all synonyms
 */
export async function getSynonyms(req: Request, res: Response, next: NextFunction) {
  try {
    const { subjectId, search, limit, offset } = req.query;

    const result = await subjectService.getAllSynonyms({
      subjectId: subjectId ? String(subjectId) : undefined,
      search: search ? String(search) : undefined,
      limit: limit ? parseInt(String(limit)) : 100,
      offset: offset ? parseInt(String(offset)) : 0,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/subjects/synonyms
 * Create a synonym
 */
export async function createSynonym(req: Request, res: Response, next: NextFunction) {
  try {
    const { term, subjectId } = req.body;

    if (!term || !subjectId) {
      return res.status(400).json({ error: 'term and subjectId are required' });
    }

    const synonym = await subjectService.createSynonym(term, subjectId);
    res.status(201).json(synonym);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return res.status(409).json({ error: 'Synonym already exists' });
    }
    next(error);
  }
}

/**
 * DELETE /api/admin/subjects/synonyms/:id
 * Delete a synonym
 */
export async function deleteSynonym(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    await subjectService.deleteSynonym(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// Content Subject Endpoints
// =============================================================================

/**
 * GET /api/subjects/for-content?contentType=milestone&contentId=E2023_DPO
 * Public endpoint for getting subjects assigned to content
 */
export async function getContentSubjectsPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const { contentType, contentId } = req.query;

    if (!contentType || !contentId) {
      return res.status(400).json({ error: 'contentType and contentId are required' });
    }

    const validTypes = ['milestone', 'glossary_term', 'current_event', 'person', 'organization'];
    if (!validTypes.includes(contentType as string)) {
      return res.status(400).json({ error: `Invalid content type. Must be one of: ${validTypes.join(', ')}` });
    }

    const subjects = await subjectService.getContentSubjects(
      contentType as subjectService.ContentType,
      contentId as string
    );

    res.json(subjects);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/content/:type/:id/subjects
 * Get subjects for a piece of content
 */
export async function getContentSubjects(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, id } = req.params;

    const validTypes = ['milestone', 'glossary_term', 'current_event', 'person', 'organization'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid content type. Must be one of: ${validTypes.join(', ')}` });
    }

    const subjects = await subjectService.getContentSubjects(
      type as subjectService.ContentType,
      id
    );

    res.json(subjects);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/content/:type/:id/subjects
 * Update subjects for a piece of content
 */
export async function updateContentSubjects(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, id } = req.params;
    const { subjects } = req.body;

    const validTypes = ['milestone', 'glossary_term', 'current_event', 'person', 'organization'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid content type. Must be one of: ${validTypes.join(', ')}` });
    }

    if (!Array.isArray(subjects)) {
      return res.status(400).json({ error: 'subjects must be an array' });
    }

    const result = await subjectService.setContentSubjects(
      type as subjectService.ContentType,
      id,
      subjects
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/content/:type/:id/subjects
 * Add a subject to content
 */
export async function addContentSubject(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, id } = req.params;
    const { subjectId, isPrimary, confidence, source } = req.body;

    const validTypes = ['milestone', 'glossary_term', 'current_event', 'person', 'organization'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid content type. Must be one of: ${validTypes.join(', ')}` });
    }

    if (!subjectId) {
      return res.status(400).json({ error: 'subjectId is required' });
    }

    const result = await subjectService.addContentSubject(
      type as subjectService.ContentType,
      id,
      subjectId,
      { isPrimary, confidence, source }
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/content/:type/:id/subjects/:subjectId
 * Remove a subject from content
 */
export async function removeContentSubject(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, id, subjectId } = req.params;

    const validTypes = ['milestone', 'glossary_term', 'current_event', 'person', 'organization'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid content type. Must be one of: ${validTypes.join(', ')}` });
    }

    await subjectService.removeContentSubject(
      type as subjectService.ContentType,
      id,
      subjectId
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// Backfill Endpoints
// =============================================================================

/**
 * POST /api/admin/subjects/backfill
 * Start a subject backfill job
 */
export async function startBackfill(req: Request, res: Response, next: NextFunction) {
  try {
    const { contentType, mode, batchSize } = req.body;

    const validTypes = ['all', 'milestone', 'glossary_term', 'current_event', 'person', 'organization'];
    if (contentType && !validTypes.includes(contentType)) {
      return res.status(400).json({ error: `Invalid content type. Must be one of: ${validTypes.join(', ')}` });
    }

    const validModes = ['rule', 'ai', 'both'];
    if (mode && !validModes.includes(mode)) {
      return res.status(400).json({ error: `Invalid mode. Must be one of: ${validModes.join(', ')}` });
    }

    const result = await subjectService.startBackfill({
      contentType: contentType || 'all',
      mode: mode || 'rule',
      batchSize: batchSize || 50,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/subjects/backfill/status
 * Get current backfill job status
 */
export async function getBackfillStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const status = await subjectService.getBackfillStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/subjects/coverage
 * Get classification coverage statistics
 */
export async function getCoverageStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await subjectService.getCoverageStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/subjects/migrate-content-type
 * Fix contentType mismatch: migrate 'news_event' to 'current_event' in ContentSubject
 * This fixes a bug where drafts used 'news_event' but queries expected 'current_event'
 */
export async function migrateContentType(req: Request, res: Response, next: NextFunction) {
  try {
    const { dryRun = true } = req.body;

    // Count existing mismatched records
    const wrongRecords = await prisma.contentSubject.findMany({
      where: { contentType: 'news_event' },
      select: { id: true, contentId: true, subjectId: true },
    });

    // Find which ones already have a current_event version (would cause conflict)
    const existingCorrect = await prisma.contentSubject.findMany({
      where: { contentType: 'current_event' },
      select: { contentId: true, subjectId: true },
    });
    const existingSet = new Set(existingCorrect.map(r => `${r.contentId}:${r.subjectId}`));

    const duplicates = wrongRecords.filter(r => existingSet.has(`${r.contentId}:${r.subjectId}`));
    const canMigrate = wrongRecords.filter(r => !existingSet.has(`${r.contentId}:${r.subjectId}`));

    if (dryRun) {
      return res.json({
        dryRun: true,
        message: `Found ${wrongRecords.length} records with 'news_event': ${canMigrate.length} can be migrated, ${duplicates.length} are duplicates that will be deleted`,
        total: wrongRecords.length,
        canMigrate: canMigrate.length,
        duplicates: duplicates.length,
        sampleMigrate: canMigrate.slice(0, 3),
        sampleDuplicates: duplicates.slice(0, 3),
      });
    }

    // Delete duplicates (keep the current_event version)
    let deleted = 0;
    if (duplicates.length > 0) {
      const deleteResult = await prisma.contentSubject.deleteMany({
        where: { id: { in: duplicates.map(d => d.id) } },
      });
      deleted = deleteResult.count;
    }

    // Migrate the rest
    let migrated = 0;
    if (canMigrate.length > 0) {
      const migrateResult = await prisma.contentSubject.updateMany({
        where: { id: { in: canMigrate.map(m => m.id) } },
        data: { contentType: 'current_event' },
      });
      migrated = migrateResult.count;
    }

    res.json({
      dryRun: false,
      message: `Migration complete: ${migrated} records migrated, ${deleted} duplicates removed`,
      migrated,
      deleted,
    });
  } catch (error) {
    next(error);
  }
}
