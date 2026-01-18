/**
 * Era Controller
 * Sprint SEO-3 Task 7 - Era/Decade Landing Pages
 *
 * Handles API requests for era landing page data.
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/error';
import * as erasService from '../services/eras';

/**
 * Era configuration - must match frontend config
 * Keeping it here to validate slugs and provide date ranges
 */
const ERA_CONFIGS: Record<
  string,
  { startDate: string; endDate: string; title: string }
> = {
  '1950s': {
    startDate: '1950-01-01',
    endDate: '1959-12-31',
    title: 'The 1950s: Foundations of AI',
  },
  '1960s': {
    startDate: '1960-01-01',
    endDate: '1969-12-31',
    title: 'The 1960s: Early AI & ELIZA',
  },
  '1970s': {
    startDate: '1970-01-01',
    endDate: '1979-12-31',
    title: 'The 1970s: First AI Winter',
  },
  '1980s': {
    startDate: '1980-01-01',
    endDate: '1989-12-31',
    title: 'The 1980s: Expert Systems',
  },
  '1990s': {
    startDate: '1990-01-01',
    endDate: '1999-12-31',
    title: 'The 1990s: Machine Learning Rise',
  },
  '2000s': {
    startDate: '2000-01-01',
    endDate: '2009-12-31',
    title: 'The 2000s: Big Data Era',
  },
  '2010s': {
    startDate: '2010-01-01',
    endDate: '2019-12-31',
    title: 'The 2010s: Deep Learning Revolution',
  },
  '2020s': {
    startDate: '2020-01-01',
    endDate: '2029-12-31',
    title: 'The 2020s: Large Language Models',
  },
};

/**
 * GET /api/eras
 * Get list of all available eras
 */
export async function getAllEras(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const eras = Object.entries(ERA_CONFIGS).map(([slug, config]) => ({
      slug,
      title: config.title,
      startDate: config.startDate,
      endDate: config.endDate,
    }));

    res.json({ data: eras });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/eras/:slug
 * Get era page data including milestones, key figures, and key terms
 */
export async function getEraBySlug(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { slug } = req.params;

    // Validate era slug
    const eraConfig = ERA_CONFIGS[slug];
    if (!eraConfig) {
      throw ApiError.notFound(
        `Era '${slug}' not found. Valid eras: ${Object.keys(ERA_CONFIGS).join(', ')}`
      );
    }

    // Parse optional limit params
    const milestoneLimit = Math.min(
      50,
      Math.max(1, parseInt(req.query.milestoneLimit as string) || 20)
    );
    const figureLimit = Math.min(
      30,
      Math.max(1, parseInt(req.query.figureLimit as string) || 12)
    );
    const termLimit = Math.min(
      30,
      Math.max(1, parseInt(req.query.termLimit as string) || 15)
    );

    const startDate = new Date(eraConfig.startDate);
    const endDate = new Date(eraConfig.endDate);

    const data = await erasService.getEraPageData(startDate, endDate, {
      milestoneLimit,
      figureLimit,
      termLimit,
    });

    res.json({
      slug,
      title: eraConfig.title,
      startDate: eraConfig.startDate,
      endDate: eraConfig.endDate,
      ...data,
    });
  } catch (error) {
    next(error);
  }
}
