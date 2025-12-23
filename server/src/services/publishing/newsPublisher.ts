/**
 * News Event Publisher Service
 *
 * Publishes approved news event drafts to the CurrentEvent database table.
 * Updated in Sprint 39 to use database instead of static JSON file.
 */

import { prisma } from '../../db';
import type { NewsEventDraft } from '../ingestion/contentGenerator';

/**
 * Generate a unique ID for a news event
 */
function generateEventId(headline: string): string {
  // Create a slug from headline
  const slug = headline
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);

  return `ce-${slug}-${Date.now().toString(36)}`;
}

/**
 * Calculate expiration date (default 6 months from publish date)
 */
function calculateExpiresAt(publishedDate: string): Date {
  const date = new Date(publishedDate);
  date.setMonth(date.getMonth() + 6);
  return date;
}

/**
 * Publish a news event draft to the CurrentEvent database table
 * Returns the created event ID
 */
export async function publishNewsEvent(draftData: NewsEventDraft): Promise<string> {
  // Validate required fields
  if (!draftData.headline || !draftData.summary || !draftData.sourceUrl) {
    throw new Error('Missing required fields: headline, summary, or sourceUrl');
  }

  // Check for duplicate headlines
  const existingEvent = await prisma.currentEvent.findFirst({
    where: {
      headline: {
        equals: draftData.headline,
        mode: 'insensitive',
      },
    },
  });

  if (existingEvent) {
    throw new Error(`Event with similar headline already exists: ${existingEvent.id}`);
  }

  // Generate unique ID
  const id = generateEventId(draftData.headline);

  // Create the event in the database
  const newEvent = await prisma.currentEvent.create({
    data: {
      id,
      headline: draftData.headline,
      summary: draftData.summary,
      sourceUrl: draftData.sourceUrl,
      sourcePublisher: draftData.sourcePublisher,
      publishedDate: new Date(draftData.publishedDate),
      prerequisiteMilestoneIds: JSON.stringify(draftData.prerequisiteMilestoneIds || []),
      connectionExplanation: draftData.connectionExplanation || '',
      featured: draftData.featured || false,
      expiresAt: calculateExpiresAt(draftData.publishedDate),
      isPublished: true,
    },
  });

  console.log(`Published news event: ${newEvent.id} - ${draftData.headline}`);

  return newEvent.id;
}

/**
 * Validate news event draft data without publishing
 */
export function validateNewsEventDraft(draftData: NewsEventDraft): boolean {
  if (!draftData.headline) throw new Error('Headline is required');
  if (!draftData.summary) throw new Error('Summary is required');
  if (!draftData.sourceUrl) throw new Error('Source URL is required');
  if (!draftData.sourcePublisher) throw new Error('Source publisher is required');
  if (!draftData.publishedDate) throw new Error('Published date is required');

  if (draftData.headline.length < 10 || draftData.headline.length > 200) {
    throw new Error(`Headline must be 10-200 characters (currently ${draftData.headline.length})`);
  }

  if (draftData.summary.length < 50 || draftData.summary.length > 500) {
    throw new Error(`Summary must be 50-500 characters (currently ${draftData.summary.length})`);
  }

  const date = new Date(draftData.publishedDate);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${draftData.publishedDate}`);
  }

  return true;
}

/**
 * Get all current events from database
 */
export async function getAllEvents() {
  return prisma.currentEvent.findMany({
    where: {
      isPublished: true,
    },
    orderBy: {
      publishedDate: 'desc',
    },
  });
}

/**
 * Remove expired events (cleanup utility)
 */
export async function removeExpiredEvents(): Promise<number> {
  const now = new Date();

  const result = await prisma.currentEvent.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });

  if (result.count > 0) {
    console.log(`Removed ${result.count} expired events`);
  }

  return result.count;
}
