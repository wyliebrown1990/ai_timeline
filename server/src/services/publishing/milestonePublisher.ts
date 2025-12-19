/**
 * Milestone Publisher Service
 *
 * Publishes approved milestone drafts to the database.
 */

import { prisma } from '../../db';
import type { MilestoneDraft } from '../ingestion/contentGenerator';

/**
 * Publish a milestone draft to the database
 * Returns the created milestone ID
 */
export async function publishMilestone(draftData: MilestoneDraft): Promise<string> {
  // Validate required fields
  if (!draftData.title || !draftData.description || !draftData.date) {
    throw new Error('Missing required fields: title, description, or date');
  }

  // Parse date
  const date = new Date(draftData.date);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${draftData.date}`);
  }

  // Validate category
  const validCategories = ['research', 'model_release', 'breakthrough', 'product', 'regulation', 'industry'];
  if (!validCategories.includes(draftData.category)) {
    throw new Error(`Invalid category: ${draftData.category}`);
  }

  // Validate significance
  if (![1, 2, 3, 4].includes(draftData.significance)) {
    throw new Error(`Invalid significance: ${draftData.significance}`);
  }

  // Create the milestone
  const milestone = await prisma.milestone.create({
    data: {
      title: draftData.title,
      description: draftData.description,
      date,
      category: draftData.category,
      significance: draftData.significance,
      organization: draftData.organization || null,
      contributors: JSON.stringify(draftData.contributors || []),
      sourceUrl: draftData.sourceUrl || null,
      tags: JSON.stringify(draftData.tags || []),
      sources: JSON.stringify(draftData.sources || []),
    },
  });

  console.log(`Published milestone: ${milestone.id} - ${milestone.title}`);

  return milestone.id;
}

/**
 * Validate milestone draft data without publishing
 * Returns true if valid, throws error if invalid
 */
export function validateMilestoneDraft(draftData: MilestoneDraft): boolean {
  if (!draftData.title) throw new Error('Title is required');
  if (!draftData.description) throw new Error('Description is required');
  if (!draftData.date) throw new Error('Date is required');
  if (!draftData.category) throw new Error('Category is required');
  if (draftData.significance === undefined) throw new Error('Significance is required');

  const validCategories = ['research', 'model_release', 'breakthrough', 'product', 'regulation', 'industry'];
  if (!validCategories.includes(draftData.category)) {
    throw new Error(`Invalid category: ${draftData.category}. Must be one of: ${validCategories.join(', ')}`);
  }

  if (![1, 2, 3, 4].includes(draftData.significance)) {
    throw new Error(`Invalid significance: ${draftData.significance}. Must be 1, 2, 3, or 4`);
  }

  const date = new Date(draftData.date);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${draftData.date}`);
  }

  return true;
}
