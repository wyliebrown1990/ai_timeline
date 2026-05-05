/**
 * Global Search Controller
 * Sprint 47 - Phase 7: Search Integration
 *
 * Unified search across milestones, glossary terms, and key figures.
 */

import type { Request, Response, NextFunction } from 'express';
import * as milestonesService from '../services/milestones';
import * as glossaryService from '../services/glossary';
import * as keyFiguresService from '../services/keyFigures';
import { ApiError } from '../middleware/error';

/**
 * Search result item types
 */
interface MilestoneResult {
  type: 'milestone';
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  organization?: string | null;
}

interface GlossaryResult {
  type: 'glossary';
  id: string;
  term: string;
  shortDefinition: string;
  category: string;
}

interface KeyFigureResult {
  type: 'keyFigure';
  id: string;
  canonicalName: string;
  shortBio: string;
  role: string;
  primaryOrg?: string | null;
  imageUrl?: string | null;
}

type SearchResult = MilestoneResult | GlossaryResult | KeyFigureResult;

interface SearchResponse {
  query: string;
  results: SearchResult[];
  counts: {
    milestones: number;
    glossary: number;
    keyFigures: number;
    total: number;
  };
}

/**
 * GET /api/search
 * Global search across all content types
 *
 * Query params:
 * - q: search query string (required)
 * - limit: max results per category (default 5)
 * - types: comma-separated list of types to search (default: all)
 */
export async function globalSearch(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { q, limit, types } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      throw ApiError.badRequest('Query parameter "q" must be at least 2 characters');
    }

    const query = q.trim();
    const limitNum = Math.min(parseInt(limit as string, 10) || 5, 20);
    const typeFilter = types ? (types as string).split(',').map((t) => t.trim()) : null;

    const results: SearchResult[] = [];
    const counts = { milestones: 0, glossary: 0, keyFigures: 0, total: 0 };

    // Search in parallel for performance
    const searchPromises: Promise<void>[] = [];

    // Search milestones
    if (!typeFilter || typeFilter.includes('milestone')) {
      searchPromises.push(
        milestonesService
          .search({ query, skip: 0, limit: limitNum })
          .then((searchResults) => {
            counts.milestones = searchResults.total;
            searchResults.results.slice(0, limitNum).forEach((m) => {
              results.push({
                type: 'milestone',
                id: m.id,
                title: m.title,
                description: m.description.slice(0, 150) + (m.description.length > 150 ? '...' : ''),
                date: m.date,
                category: m.category,
                organization: m.organization,
              });
            });
          })
      );
    }

    // Search glossary terms
    if (!typeFilter || typeFilter.includes('glossary')) {
      searchPromises.push(
        glossaryService.search(query, limitNum).then((terms) => {
          counts.glossary = terms.length;
          terms.forEach((t) => {
            results.push({
              type: 'glossary',
              id: t.id,
              term: t.term,
              shortDefinition: t.shortDefinition.slice(0, 150) + (t.shortDefinition.length > 150 ? '...' : ''),
              category: t.category,
            });
          });
        })
      );
    }

    // Search key figures (only published)
    if (!typeFilter || typeFilter.includes('keyFigure')) {
      searchPromises.push(
        keyFiguresService.search(query, limitNum).then((figures) => {
          counts.keyFigures = figures.length;
          figures.forEach((f) => {
            results.push({
              type: 'keyFigure',
              id: f.id,
              canonicalName: f.canonicalName,
              shortBio: f.shortBio.slice(0, 150) + (f.shortBio.length > 150 ? '...' : ''),
              role: f.role,
              primaryOrg: f.primaryOrg,
              imageUrl: f.imageUrl,
            });
          });
        })
      );
    }

    await Promise.all(searchPromises);

    counts.total = counts.milestones + counts.glossary + counts.keyFigures;

    const response: SearchResponse = {
      query,
      results,
      counts,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}
