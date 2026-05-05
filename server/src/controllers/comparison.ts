/**
 * Comparison Controller
 * Sprint SEO-4 Task 1 - Comparison Pages Infrastructure
 *
 * Handles API requests for comparison pages.
 */

import type { Request, Response } from 'express';
import type {
  ComparisonEntityType} from '../services/comparison';
import {
  getComparison,
  getComparisonPairs
} from '../services/comparison';

/**
 * Valid entity types for comparison
 */
const VALID_TYPES: ComparisonEntityType[] = ['organization', 'person', 'term'];

/**
 * GET /api/compare/:type/:slugA/:slugB
 * Get comparison data for two entities of the same type
 */
export async function getComparisonData(req: Request, res: Response) {
  try {
    const { type, slugA, slugB } = req.params;

    // Validate entity type
    if (!VALID_TYPES.includes(type as ComparisonEntityType)) {
      return res.status(400).json({
        error: 'Invalid comparison type',
        validTypes: VALID_TYPES,
      });
    }

    // Validate slugs
    if (!slugA || !slugB) {
      return res.status(400).json({
        error: 'Both slugA and slugB are required',
      });
    }

    // Prevent comparing entity with itself
    if (slugA === slugB) {
      return res.status(400).json({
        error: 'Cannot compare an entity with itself',
      });
    }

    const comparison = await getComparison(
      type as ComparisonEntityType,
      slugA,
      slugB
    );

    if (!comparison) {
      return res.status(404).json({
        error: 'One or both entities not found',
        type,
        slugA,
        slugB,
      });
    }

    // Add URL-friendly comparison identifier
    const comparisonSlug = `${slugA}-vs-${slugB}`;

    return res.json({
      ...comparison,
      comparisonSlug,
      canonicalUrl: `https://letaiexplainai.com/compare/${type}/${comparisonSlug}`,
    });
  } catch (error) {
    console.error('[ComparisonController] Error getting comparison:', error);
    return res.status(500).json({ error: 'Failed to get comparison data' });
  }
}

/**
 * GET /api/compare/:type
 * Get all valid comparison pairs for a type (for hub pages and sitemap)
 */
export async function getComparisonList(req: Request, res: Response) {
  try {
    const { type } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    // Validate entity type
    if (!VALID_TYPES.includes(type as ComparisonEntityType)) {
      return res.status(400).json({
        error: 'Invalid comparison type',
        validTypes: VALID_TYPES,
      });
    }

    const pairs = await getComparisonPairs(type as ComparisonEntityType, limit);

    return res.json({
      type,
      count: pairs.length,
      comparisons: pairs.map((p) => ({
        slugA: p.slugA,
        slugB: p.slugB,
        nameA: p.nameA,
        nameB: p.nameB,
        comparisonSlug: `${p.slugA}-vs-${p.slugB}`,
        url: `/compare/${type}/${p.slugA}-vs-${p.slugB}`,
      })),
    });
  } catch (error) {
    console.error('[ComparisonController] Error getting comparison list:', error);
    return res.status(500).json({ error: 'Failed to get comparison list' });
  }
}

/**
 * GET /api/compare
 * Get overview of all comparison types (for main hub page)
 */
export async function getComparisonOverview(_req: Request, res: Response) {
  try {
    const [organizations, persons, terms] = await Promise.all([
      getComparisonPairs('organization', 5),
      getComparisonPairs('person', 5),
      getComparisonPairs('term', 5),
    ]);

    return res.json({
      types: [
        {
          type: 'organization',
          label: 'Organizations',
          description: 'Compare AI companies, research labs, and institutions',
          sampleComparisons: organizations.map((p) => ({
            nameA: p.nameA,
            nameB: p.nameB,
            url: `/compare/organization/${p.slugA}-vs-${p.slugB}`,
          })),
        },
        {
          type: 'person',
          label: 'People',
          description: 'Compare AI researchers, executives, and thought leaders',
          sampleComparisons: persons.map((p) => ({
            nameA: p.nameA,
            nameB: p.nameB,
            url: `/compare/person/${p.slugA}-vs-${p.slugB}`,
          })),
        },
        {
          type: 'term',
          label: 'Concepts',
          description: 'Compare AI concepts, techniques, and technologies',
          sampleComparisons: terms.map((p) => ({
            nameA: p.nameA,
            nameB: p.nameB,
            url: `/compare/term/${p.slugA}-vs-${p.slugB}`,
          })),
        },
      ],
    });
  } catch (error) {
    console.error('[ComparisonController] Error getting comparison overview:', error);
    return res.status(500).json({ error: 'Failed to get comparison overview' });
  }
}
