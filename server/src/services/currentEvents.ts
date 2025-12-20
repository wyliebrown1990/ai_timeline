import { prisma } from '../db';
import type { CurrentEvent } from '@prisma/client';

export interface CurrentEventDto {
  id: string;
  headline: string;
  summary: string;
  sourceUrl: string | null;
  sourcePublisher: string | null;
  publishedDate: string;
  prerequisiteMilestoneIds: string[];
  connectionExplanation: string;
  featured: boolean;
  expiresAt: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function formatEvent(event: CurrentEvent): CurrentEventDto {
  return {
    id: event.id,
    headline: event.headline,
    summary: event.summary,
    sourceUrl: event.sourceUrl,
    sourcePublisher: event.sourcePublisher,
    publishedDate: event.publishedDate.toISOString().split('T')[0],
    prerequisiteMilestoneIds: JSON.parse(event.prerequisiteMilestoneIds || '[]'),
    connectionExplanation: event.connectionExplanation,
    featured: event.featured,
    expiresAt: event.expiresAt?.toISOString().split('T')[0] || null,
    isPublished: event.isPublished,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

/**
 * Get all current events with filtering options
 */
export async function getAll(options?: {
  includeExpired?: boolean;
  featured?: boolean;
  includeUnpublished?: boolean;
}): Promise<CurrentEventDto[]> {
  const where: Record<string, unknown> = {};

  if (!options?.includeUnpublished) {
    where.isPublished = true;
  }

  // Exclude expired events by default
  if (!options?.includeExpired) {
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ];
  }

  if (options?.featured) {
    where.featured = true;
  }

  const events = await prisma.currentEvent.findMany({
    where,
    orderBy: { publishedDate: 'desc' },
  });

  return events.map(formatEvent);
}

/**
 * Get featured current events (active, not expired)
 */
export async function getFeatured(limit: number = 5): Promise<CurrentEventDto[]> {
  const events = await prisma.currentEvent.findMany({
    where: {
      isPublished: true,
      featured: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: { publishedDate: 'desc' },
    take: limit,
  });

  return events.map(formatEvent);
}

/**
 * Get events related to a specific milestone
 */
export async function getForMilestone(milestoneId: string): Promise<CurrentEventDto[]> {
  // Get all active events and filter by milestone
  const events = await prisma.currentEvent.findMany({
    where: {
      isPublished: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: { publishedDate: 'desc' },
  });

  // Filter events that reference this milestone
  const relatedEvents = events.filter((event) => {
    const milestoneIds: string[] = JSON.parse(event.prerequisiteMilestoneIds || '[]');
    return milestoneIds.includes(milestoneId);
  });

  return relatedEvents.map(formatEvent);
}

/**
 * Get a single event by ID
 */
export async function getById(id: string): Promise<CurrentEventDto | null> {
  const event = await prisma.currentEvent.findUnique({
    where: { id },
  });

  if (!event) {
    return null;
  }

  return formatEvent(event);
}

export interface CreateCurrentEventInput {
  headline: string;
  summary: string;
  sourceUrl?: string;
  sourcePublisher?: string;
  publishedDate: string;
  prerequisiteMilestoneIds?: string[];
  connectionExplanation: string;
  featured?: boolean;
  expiresAt?: string;
}

/**
 * Create a new current event
 */
export async function create(data: CreateCurrentEventInput): Promise<CurrentEventDto> {
  const event = await prisma.currentEvent.create({
    data: {
      headline: data.headline,
      summary: data.summary,
      sourceUrl: data.sourceUrl || null,
      sourcePublisher: data.sourcePublisher || null,
      publishedDate: new Date(data.publishedDate),
      prerequisiteMilestoneIds: JSON.stringify(data.prerequisiteMilestoneIds || []),
      connectionExplanation: data.connectionExplanation,
      featured: data.featured ?? false,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
  });

  return formatEvent(event);
}

export interface UpdateCurrentEventInput {
  headline?: string;
  summary?: string;
  sourceUrl?: string | null;
  sourcePublisher?: string | null;
  publishedDate?: string;
  prerequisiteMilestoneIds?: string[];
  connectionExplanation?: string;
  featured?: boolean;
  expiresAt?: string | null;
  isPublished?: boolean;
}

/**
 * Update an existing current event
 */
export async function update(id: string, data: UpdateCurrentEventInput): Promise<CurrentEventDto | null> {
  const existing = await prisma.currentEvent.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  const updateData: Record<string, unknown> = {};
  if (data.headline !== undefined) updateData.headline = data.headline;
  if (data.summary !== undefined) updateData.summary = data.summary;
  if (data.sourceUrl !== undefined) updateData.sourceUrl = data.sourceUrl;
  if (data.sourcePublisher !== undefined) updateData.sourcePublisher = data.sourcePublisher;
  if (data.publishedDate !== undefined) updateData.publishedDate = new Date(data.publishedDate);
  if (data.prerequisiteMilestoneIds !== undefined) {
    updateData.prerequisiteMilestoneIds = JSON.stringify(data.prerequisiteMilestoneIds);
  }
  if (data.connectionExplanation !== undefined) updateData.connectionExplanation = data.connectionExplanation;
  if (data.featured !== undefined) updateData.featured = data.featured;
  if (data.expiresAt !== undefined) {
    updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
  }
  if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;

  const event = await prisma.currentEvent.update({
    where: { id },
    data: updateData,
  });

  return formatEvent(event);
}

/**
 * Delete a current event
 */
export async function remove(id: string): Promise<boolean> {
  try {
    await prisma.currentEvent.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Bulk create current events (for seeding)
 */
export async function bulkCreate(events: CreateCurrentEventInput[]): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const eventData of events) {
    // Check for existing by headline (unique enough)
    const existing = await prisma.currentEvent.findFirst({
      where: { headline: eventData.headline },
    });

    if (existing) {
      console.log(`Skipping: ${eventData.headline.substring(0, 50)}...`);
      skipped++;
      continue;
    }

    await prisma.currentEvent.create({
      data: {
        headline: eventData.headline,
        summary: eventData.summary,
        sourceUrl: eventData.sourceUrl || null,
        sourcePublisher: eventData.sourcePublisher || null,
        publishedDate: new Date(eventData.publishedDate),
        prerequisiteMilestoneIds: JSON.stringify(eventData.prerequisiteMilestoneIds || []),
        connectionExplanation: eventData.connectionExplanation,
        featured: eventData.featured ?? false,
        expiresAt: eventData.expiresAt ? new Date(eventData.expiresAt) : null,
      },
    });

    console.log(`Created: ${eventData.headline.substring(0, 50)}...`);
    created++;
  }

  return { created, skipped };
}
