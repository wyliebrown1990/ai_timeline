import { z } from 'zod';

/**
 * Current Event Types
 *
 * Current events are curated news items that connect recent AI developments
 * to historical milestones in the timeline. They help users understand how
 * current news relates to foundational concepts they've learned.
 */

/**
 * CurrentEvent schema
 * Links recent AI news to prerequisite milestones for context
 */
export const CurrentEventSchema = z.object({
  // Unique identifier for the event
  id: z.string().min(1),

  // News headline (10-200 characters)
  headline: z.string().min(10).max(200),

  // Summary of the news item (50-500 characters)
  summary: z.string().min(50).max(500),

  // URL to the original news source
  sourceUrl: z.string().url().optional(),

  // Publisher name (e.g., "TechCrunch", "The Verge")
  sourcePublisher: z.string().optional(),

  // Date the news was published (ISO date string)
  publishedDate: z.string().min(1),

  // Milestone IDs that provide context for understanding this event (2-6 milestones)
  prerequisiteMilestoneIds: z.array(z.string()).min(2).max(6),

  // Explanation of how this event connects to the prerequisite milestones
  connectionExplanation: z.string().min(1),

  // Whether this event should be featured prominently
  featured: z.boolean().default(false),

  // Optional expiration date after which the event is considered stale
  expiresAt: z.string().optional(),
});

export type CurrentEvent = z.infer<typeof CurrentEventSchema>;

/**
 * Schema for an array of current events
 */
export const CurrentEventArraySchema = z.array(CurrentEventSchema);

/**
 * Validate a single current event
 */
export function validateCurrentEvent(data: unknown): CurrentEvent {
  return CurrentEventSchema.parse(data);
}

/**
 * Safely validate a current event
 */
export function safeParseCurrentEvent(data: unknown) {
  return CurrentEventSchema.safeParse(data);
}

/**
 * Check if a current event has expired
 * @param event - The current event to check
 * @param referenceDate - The date to compare against (defaults to now)
 */
export function isEventExpired(
  event: CurrentEvent,
  referenceDate: Date = new Date()
): boolean {
  if (!event.expiresAt) {
    return false;
  }
  const expirationDate = new Date(event.expiresAt);
  return expirationDate < referenceDate;
}

/**
 * Filter out expired events from a list
 * @param events - Array of current events
 * @param referenceDate - The date to compare against (defaults to now)
 */
export function filterActiveEvents(
  events: CurrentEvent[],
  referenceDate: Date = new Date()
): CurrentEvent[] {
  return events.filter((event) => !isEventExpired(event, referenceDate));
}

/**
 * Get featured events from a list
 * @param events - Array of current events
 * @param includeExpired - Whether to include expired events (defaults to false)
 */
export function getFeaturedEvents(
  events: CurrentEvent[],
  includeExpired: boolean = false
): CurrentEvent[] {
  const filteredEvents = includeExpired ? events : filterActiveEvents(events);
  return filteredEvents.filter((event) => event.featured);
}
