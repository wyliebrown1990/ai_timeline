/**
 * News Event Publisher Service
 *
 * Publishes approved news event drafts to the events.json file.
 * Note: Using JSON file storage per Sprint 31 recommendation (Option A).
 * Can migrate to database if volume increases.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { NewsEventDraft } from '../ingestion/contentGenerator';

// Current events JSON file path
const EVENTS_FILE_PATH = join(__dirname, '../../../../src/content/current-events/events.json');

export interface CurrentEvent {
  id: string;
  headline: string;
  summary: string;
  sourceUrl: string;
  sourcePublisher: string;
  publishedDate: string;
  prerequisiteMilestoneIds: string[];
  connectionExplanation: string;
  featured: boolean;
  expiresAt: string;
}

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
function calculateExpiresAt(publishedDate: string): string {
  const date = new Date(publishedDate);
  date.setMonth(date.getMonth() + 6);
  return date.toISOString().split('T')[0];
}

/**
 * Publish a news event draft to the events.json file
 * Returns the created event ID
 */
export async function publishNewsEvent(draftData: NewsEventDraft): Promise<string> {
  // Validate required fields
  if (!draftData.headline || !draftData.summary || !draftData.sourceUrl) {
    throw new Error('Missing required fields: headline, summary, or sourceUrl');
  }

  // Read existing events
  let events: CurrentEvent[] = [];
  try {
    const content = readFileSync(EVENTS_FILE_PATH, 'utf-8');
    events = JSON.parse(content);
  } catch (error) {
    console.warn('Could not read existing events, starting fresh:', error);
    events = [];
  }

  // Generate unique ID
  const id = generateEventId(draftData.headline);

  // Check for duplicate headlines
  const existingHeadline = events.find(
    (e) => e.headline.toLowerCase() === draftData.headline.toLowerCase()
  );
  if (existingHeadline) {
    throw new Error(`Event with similar headline already exists: ${existingHeadline.id}`);
  }

  // Create new event
  const newEvent: CurrentEvent = {
    id,
    headline: draftData.headline,
    summary: draftData.summary,
    sourceUrl: draftData.sourceUrl,
    sourcePublisher: draftData.sourcePublisher,
    publishedDate: draftData.publishedDate,
    prerequisiteMilestoneIds: draftData.prerequisiteMilestoneIds || [],
    connectionExplanation: draftData.connectionExplanation || '',
    featured: draftData.featured || false,
    expiresAt: calculateExpiresAt(draftData.publishedDate),
  };

  // Add to front of list (most recent first)
  events.unshift(newEvent);

  // Write back to file
  writeFileSync(EVENTS_FILE_PATH, JSON.stringify(events, null, 2) + '\n');

  console.log(`Published news event: ${id} - ${draftData.headline}`);

  return id;
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
 * Get all current events
 */
export function getAllEvents(): CurrentEvent[] {
  try {
    const content = readFileSync(EVENTS_FILE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

/**
 * Remove expired events (cleanup utility)
 */
export function removeExpiredEvents(): number {
  const events = getAllEvents();
  const now = new Date();
  const activeEvents = events.filter((e) => new Date(e.expiresAt) > now);
  const removedCount = events.length - activeEvents.length;

  if (removedCount > 0) {
    writeFileSync(EVENTS_FILE_PATH, JSON.stringify(activeEvents, null, 2) + '\n');
    console.log(`Removed ${removedCount} expired events`);
  }

  return removedCount;
}
