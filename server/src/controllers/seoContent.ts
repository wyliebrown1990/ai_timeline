/**
 * SEO Content Generation Controller
 * Sprint SEO-4 Task 8 - Admin Tools for Content Generation
 *
 * Handles admin API endpoints for bulk content generation.
 */

import type { Request, Response } from 'express';
import * as seoContentGenerator from '../services/seoContentGenerator';

/**
 * Get generation statistics
 */
export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await seoContentGenerator.getGenerationStats();
    res.json(stats);
  } catch (error) {
    console.error('[SEOContent] Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get generation stats' });
  }
}

/**
 * Get terms needing generation
 */
export async function getTermsNeedingGeneration(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const terms = await seoContentGenerator.getTermsNeedingGeneration(limit);
    res.json({ terms, total: terms.length });
  } catch (error) {
    console.error('[SEOContent] Error getting terms:', error);
    res.status(500).json({ error: 'Failed to get terms' });
  }
}

/**
 * Generate Explained content for a single term
 */
export async function generateExplained(req: Request, res: Response): Promise<void> {
  try {
    const { termId } = req.params;

    if (!termId) {
      res.status(400).json({ error: 'Term ID is required' });
      return;
    }

    const result = await seoContentGenerator.generateExplainedContent(termId);

    if (result.success) {
      res.json({ success: true, term: result.term });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('[SEOContent] Error generating Explained content:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
}

/**
 * Generate Who Invented content for a single term
 */
export async function generateWhoInvented(req: Request, res: Response): Promise<void> {
  try {
    const { termId } = req.params;

    if (!termId) {
      res.status(400).json({ error: 'Term ID is required' });
      return;
    }

    const result = await seoContentGenerator.generateWhoInventedContent(termId);

    if (result.success) {
      res.json({ success: true, term: result.term });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('[SEOContent] Error generating Who Invented content:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
}

/**
 * Bulk generate Explained content
 */
export async function bulkGenerateExplained(req: Request, res: Response): Promise<void> {
  try {
    const { termIds } = req.body;

    if (!Array.isArray(termIds) || termIds.length === 0) {
      res.status(400).json({ error: 'termIds array is required' });
      return;
    }

    if (termIds.length > 20) {
      res.status(400).json({ error: 'Maximum 20 terms per batch' });
      return;
    }

    const result = await seoContentGenerator.bulkGenerateExplainedContent(termIds);
    res.json(result);
  } catch (error) {
    console.error('[SEOContent] Error bulk generating Explained content:', error);
    res.status(500).json({ error: 'Failed to bulk generate content' });
  }
}

/**
 * Bulk generate Who Invented content
 */
export async function bulkGenerateWhoInvented(req: Request, res: Response): Promise<void> {
  try {
    const { termIds } = req.body;

    if (!Array.isArray(termIds) || termIds.length === 0) {
      res.status(400).json({ error: 'termIds array is required' });
      return;
    }

    if (termIds.length > 20) {
      res.status(400).json({ error: 'Maximum 20 terms per batch' });
      return;
    }

    const result = await seoContentGenerator.bulkGenerateWhoInventedContent(termIds);
    res.json(result);
  } catch (error) {
    console.error('[SEOContent] Error bulk generating Who Invented content:', error);
    res.status(500).json({ error: 'Failed to bulk generate content' });
  }
}

/**
 * Get a term's generated content
 */
export async function getTermContent(req: Request, res: Response): Promise<void> {
  try {
    const { termId } = req.params;

    if (!termId) {
      res.status(400).json({ error: 'Term ID is required' });
      return;
    }

    const content = await seoContentGenerator.getTermContent(termId);

    if (!content) {
      res.status(404).json({ error: 'Term not found' });
      return;
    }

    res.json(content);
  } catch (error) {
    console.error('[SEOContent] Error getting term content:', error);
    res.status(500).json({ error: 'Failed to get term content' });
  }
}

/**
 * Update a term's generated content
 */
export async function updateTermContent(req: Request, res: Response): Promise<void> {
  try {
    const { termId } = req.params;
    const { historySection, howItWorksSection, faqItems, whoInventedQuickAnswer } = req.body;

    if (!termId) {
      res.status(400).json({ error: 'Term ID is required' });
      return;
    }

    await seoContentGenerator.updateTermContent(termId, {
      historySection,
      howItWorksSection,
      faqItems,
      whoInventedQuickAnswer,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[SEOContent] Error updating term content:', error);
    res.status(500).json({ error: 'Failed to update term content' });
  }
}

/**
 * Reset a term's status to pending
 */
export async function resetTermStatus(req: Request, res: Response): Promise<void> {
  try {
    const { termId } = req.params;

    if (!termId) {
      res.status(400).json({ error: 'Term ID is required' });
      return;
    }

    await seoContentGenerator.resetTermStatus(termId);
    res.json({ success: true });
  } catch (error) {
    console.error('[SEOContent] Error resetting term status:', error);
    res.status(500).json({ error: 'Failed to reset term status' });
  }
}
