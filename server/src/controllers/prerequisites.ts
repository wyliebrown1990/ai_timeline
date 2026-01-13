import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/error';
import * as prerequisiteService from '../services/prerequisites';
import * as aiSuggestionsService from '../services/aiPrerequisiteSuggestions';

/**
 * Zod schema for updating prerequisites
 */
const UpdatePrerequisitesSchema = z.object({
  prerequisiteIds: z.array(z.string()),
});

/**
 * Zod schema for updating difficulty
 */
const UpdateDifficultySchema = z.object({
  difficulty: z.number().min(1).max(5),
  conceptType: z.enum(['foundational', 'intermediate', 'advanced']),
});

/**
 * Zod schema for checking readiness
 */
const CheckReadinessSchema = z.object({
  knownTermIds: z.array(z.string()),
});

/**
 * GET /api/glossary/:id/prerequisites
 * Get direct prerequisites for a glossary term
 */
export async function getPrerequisites(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const prerequisites = await prerequisiteService.getPrerequisites(id);

    res.json({
      data: prerequisites.map(transformTermBasic),
      total: prerequisites.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/glossary/:id/prerequisites/chain
 * Get the full prerequisite chain (recursive) for a term
 */
export async function getPrerequisiteChain(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const maxDepth = parseInt(req.query.maxDepth as string, 10) || 5;

    const chain = await prerequisiteService.getPrerequisiteChain(id, maxDepth);

    res.json({
      data: chain,
      total: chain.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/glossary/:id/learning-sequence
 * Get an optimal learning sequence for a target term
 */
export async function getLearningSequence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const sequence = await prerequisiteService.buildLearningSequence(id);

    res.json({
      data: sequence,
      total: sequence.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/glossary/:id/dependents
 * Get all terms that depend on a given term
 */
export async function getDependents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const dependents = await prerequisiteService.getDependents(id);

    res.json({
      data: dependents.map(transformTermBasic),
      total: dependents.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/glossary/:id/check-readiness
 * Check if a user is ready to learn a concept
 */
export async function checkReadiness(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { knownTermIds } = CheckReadinessSchema.parse(req.body);

    const result = await prerequisiteService.isReadyToLearn(id, knownTermIds);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/glossary/foundational
 * Get foundational terms (no prerequisites, good starting points)
 */
export async function getFoundationalTerms(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const terms = await prerequisiteService.getFoundationalTerms(limit);

    res.json({
      data: terms.map(transformTermBasic),
      total: terms.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/glossary/suggested-next
 * Get suggested next concepts based on current knowledge
 */
export async function getSuggestedNext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { knownTermIds } = CheckReadinessSchema.parse(req.body);
    const limit = parseInt(req.query.limit as string, 10) || 5;

    const suggestions = await prerequisiteService.getSuggestedNextConcepts(knownTermIds, limit);

    res.json({
      data: suggestions.map(transformTermBasic),
      total: suggestions.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/milestones/:id/prerequisites
 * Get prerequisite concepts for a milestone
 */
export async function getMilestonePrerequisites(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const prerequisites = await prerequisiteService.getMilestonePrerequisites(id);

    res.json({
      data: prerequisites.map(transformTermBasic),
      total: prerequisites.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/milestones/:id/prerequisites/full
 * Get all prerequisites needed to understand a milestone (including nested)
 */
export async function getFullMilestonePrerequisites(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const prerequisites = await prerequisiteService.getFullMilestonePrerequisites(id);

    res.json({
      data: prerequisites,
      total: prerequisites.length,
    });
  } catch (error) {
    next(error);
  }
}

// Admin endpoints

/**
 * PUT /api/admin/glossary/:id/prerequisites
 * Update prerequisites for a glossary term
 */
export async function updatePrerequisites(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { prerequisiteIds } = UpdatePrerequisitesSchema.parse(req.body);

    const term = await prerequisiteService.updatePrerequisites(id, prerequisiteIds);

    if (!term) {
      throw ApiError.notFound(`Glossary term with ID ${id} not found`);
    }

    res.json({
      message: 'Prerequisites updated successfully',
      term: transformTermBasic(term),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Circular dependency')) {
      next(ApiError.badRequest(error.message));
    } else {
      next(error);
    }
  }
}

/**
 * PUT /api/admin/glossary/:id/difficulty
 * Update difficulty and concept type for a term
 */
export async function updateDifficulty(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { difficulty, conceptType } = UpdateDifficultySchema.parse(req.body);

    const term = await prerequisiteService.updateDifficulty(id, difficulty, conceptType);

    if (!term) {
      throw ApiError.notFound(`Glossary term with ID ${id} not found`);
    }

    res.json({
      message: 'Difficulty updated successfully',
      term: transformTermBasic(term),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/milestones/:id/prerequisites
 * Update prerequisite concepts for a milestone
 */
export async function updateMilestonePrerequisites(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { prerequisiteIds } = UpdatePrerequisitesSchema.parse(req.body);

    const milestone = await prerequisiteService.updateMilestonePrerequisites(id, prerequisiteIds);

    if (!milestone) {
      throw ApiError.notFound(`Milestone with ID ${id} not found`);
    }

    res.json({
      message: 'Milestone prerequisites updated successfully',
      milestoneId: milestone.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Helper to transform term to basic API format
 */
function transformTermBasic(term: {
  id: string;
  term: string;
  shortDefinition: string;
  difficulty: number;
  conceptType: string;
  prerequisiteIds?: string;
  category?: string;
}) {
  return {
    id: term.id,
    term: term.term,
    shortDefinition: term.shortDefinition,
    difficulty: term.difficulty,
    conceptType: term.conceptType,
    category: term.category,
    prerequisiteIds: term.prerequisiteIds ? JSON.parse(term.prerequisiteIds) : [],
  };
}

// =============================================================================
// AI-Assisted Prerequisite Suggestions (Sprint LEarn-1, Section 8)
// =============================================================================

/**
 * Zod schema for bulk suggestions request
 */
const BulkSuggestSchema = z.object({
  termIds: z.array(z.string()).min(1).max(20),
});

/**
 * POST /api/admin/glossary/:id/suggest-prerequisites
 * Get AI-powered prerequisite suggestions for a glossary term
 */
export async function suggestPrerequisites(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Import prisma dynamically to avoid circular deps
    const { prisma } = await import('../db');
    if (!prisma) {
      throw ApiError.internal('Database not available');
    }

    const result = await aiSuggestionsService.suggestPrerequisites(id, prisma);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      next(ApiError.notFound(error.message));
    } else {
      next(error);
    }
  }
}

/**
 * POST /api/admin/glossary/bulk-suggest-prerequisites
 * Get AI-powered prerequisite suggestions for multiple terms
 */
export async function bulkSuggestPrerequisites(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { termIds } = BulkSuggestSchema.parse(req.body);

    // Import prisma dynamically to avoid circular deps
    const { prisma } = await import('../db');
    if (!prisma) {
      throw ApiError.internal('Database not available');
    }

    const results = await aiSuggestionsService.bulkSuggestPrerequisites(termIds, prisma);

    res.json({
      success: true,
      data: results,
      processed: results.length,
      requested: termIds.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/glossary/:id/apply-suggestions
 * Apply AI suggestions to a glossary term
 */
export async function applySuggestions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const ApplySuggestionsSchema = z.object({
      prerequisiteIds: z.array(z.string()),
      difficulty: z.number().min(1).max(5).optional(),
    });
    const { prerequisiteIds, difficulty } = ApplySuggestionsSchema.parse(req.body);

    // Update prerequisites
    const term = await prerequisiteService.updatePrerequisites(id, prerequisiteIds);
    if (!term) {
      throw ApiError.notFound(`Glossary term with ID ${id} not found`);
    }

    // Optionally update difficulty
    if (difficulty !== undefined) {
      await prerequisiteService.updateDifficulty(id, difficulty, term.conceptType);
    }

    res.json({
      success: true,
      message: 'Suggestions applied successfully',
      term: transformTermBasic(term),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Circular dependency')) {
      next(ApiError.badRequest(error.message));
    } else {
      next(error);
    }
  }
}
