/**
 * Admin Spam Filter Routes
 * Sprint Spam-1 - Rate Limiting & Basic Protections
 *
 * Routes for managing spam filters (blocked domains, keywords, regex patterns).
 * Mounted at /api/admin/spam-filters
 */

import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { ApiError } from '../middleware/error';
import * as contentFilter from '../services/contentFilter';

const router = Router();

// All routes require admin auth
router.use(requireAuth);

// Validation schemas
const createFilterSchema = z.object({
  filterType: z.enum(['blocked_domain', 'blocked_keyword', 'regex']),
  pattern: z.string().min(1).max(500),
  action: z.enum(['block', 'flag_review']),
});

const updateFilterSchema = z.object({
  pattern: z.string().min(1).max(500).optional(),
  action: z.enum(['block', 'flag_review']).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/admin/spam-filters
 * List all spam filters
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = await contentFilter.getAllFilters();
    res.json({ filters, total: filters.length });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/spam-filters
 * Create a new spam filter
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createFilterSchema.parse(req.body);
    const filter = await contentFilter.createFilter(data);
    res.status(201).json(filter);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest('Invalid filter data', error.errors));
    } else if (error instanceof Error) {
      next(ApiError.badRequest(error.message));
    } else {
      next(error);
    }
  }
});

/**
 * PUT /api/admin/spam-filters/:id
 * Update a spam filter
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filterId = req.params.id;
    const data = updateFilterSchema.parse(req.body);

    if (Object.keys(data).length === 0) {
      throw new Error('No fields to update');
    }

    const filter = await contentFilter.updateFilter(filterId, data);
    res.json(filter);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest('Invalid filter data', error.errors));
    } else if (error instanceof Error) {
      if (error.message === 'Filter not found') {
        next(ApiError.notFound('Filter not found'));
      } else {
        next(ApiError.badRequest(error.message));
      }
    } else {
      next(error);
    }
  }
});

/**
 * DELETE /api/admin/spam-filters/:id
 * Delete a spam filter
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filterId = req.params.id;
    await contentFilter.deleteFilter(filterId);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      next(ApiError.notFound('Filter not found'));
    } else {
      next(error);
    }
  }
});

/**
 * POST /api/admin/spam-filters/:id/toggle
 * Toggle a filter's active status
 */
router.post('/:id/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filterId = req.params.id;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      throw new Error('isActive must be a boolean');
    }

    const filter = await contentFilter.updateFilter(filterId, { isActive });
    res.json(filter);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Filter not found') {
        next(ApiError.notFound('Filter not found'));
      } else {
        next(ApiError.badRequest(error.message));
      }
    } else {
      next(error);
    }
  }
});

export default router;
