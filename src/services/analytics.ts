/**
 * Analytics Service (Sprint 19)
 *
 * Provides tracking for audience-related events and user interactions.
 * This is a client-side service that logs events and can be extended
 * to integrate with analytics providers (Google Analytics, Mixpanel, etc.).
 */

import type { AudienceType } from '../types/userProfile';
import type { ContentLayer } from '../contexts/ContentLayerContext';
import type { ExplanationTab } from '../components/Timeline/LayeredExplanationTabs';

// =============================================================================
// Types
// =============================================================================

/**
 * Analytics event types for audience targeting
 */
export type AnalyticsEventType =
  | 'audience_selected'
  | 'content_layer_changed'
  | 'explanation_tab_changed'
  | 'path_started'
  | 'path_completed'
  | 'milestone_viewed'
  | 'drop_off';

/**
 * Base event properties shared by all events
 */
interface BaseEventProps {
  timestamp: string;
  sessionId?: string;
  userId?: string;
}

/**
 * Audience selection event
 */
export interface AudienceSelectedEvent extends BaseEventProps {
  type: 'audience_selected';
  audienceType: AudienceType;
  source: 'onboarding' | 'settings';
}

/**
 * Content layer change event
 */
export interface ContentLayerChangedEvent extends BaseEventProps {
  type: 'content_layer_changed';
  fromLayer?: ContentLayer;
  toLayer: ContentLayer;
  audienceType?: AudienceType;
}

/**
 * Explanation tab change event
 */
export interface ExplanationTabChangedEvent extends BaseEventProps {
  type: 'explanation_tab_changed';
  milestoneId: string;
  fromTab?: ExplanationTab;
  toTab: ExplanationTab;
  audienceType?: AudienceType;
}

/**
 * Path started event
 */
export interface PathStartedEvent extends BaseEventProps {
  type: 'path_started';
  pathId: string;
  audienceType?: AudienceType;
}

/**
 * Path completed event
 */
export interface PathCompletedEvent extends BaseEventProps {
  type: 'path_completed';
  pathId: string;
  audienceType?: AudienceType;
  timeSpentSeconds: number;
  milestonesViewed: number;
}

/**
 * Milestone viewed event
 */
export interface MilestoneViewedEvent extends BaseEventProps {
  type: 'milestone_viewed';
  milestoneId: string;
  pathId?: string;
  audienceType?: AudienceType;
  contentLayer?: ContentLayer;
}

/**
 * Drop-off event (user left without completing)
 */
export interface DropOffEvent extends BaseEventProps {
  type: 'drop_off';
  pathId: string;
  lastMilestoneId?: string;
  audienceType?: AudienceType;
  completionPercentage: number;
}

/**
 * Union type of all analytics events
 */
export type AnalyticsEvent =
  | AudienceSelectedEvent
  | ContentLayerChangedEvent
  | ExplanationTabChangedEvent
  | PathStartedEvent
  | PathCompletedEvent
  | MilestoneViewedEvent
  | DropOffEvent;

// =============================================================================
// Storage
// =============================================================================

const STORAGE_KEY = 'ai-timeline-analytics';
const MAX_STORED_EVENTS = 100;

/**
 * Get session ID (generate if not exists)
 */
function getSessionId(): string {
  const sessionKey = 'ai-timeline-session-id';
  let sessionId = sessionStorage.getItem(sessionKey);

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(sessionKey, sessionId);
  }

  return sessionId;
}

/**
 * Load stored events from localStorage
 */
function loadStoredEvents(): AnalyticsEvent[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save events to localStorage
 */
function saveEvents(events: AnalyticsEvent[]): void {
  if (typeof window === 'undefined') return;

  try {
    // Keep only the last MAX_STORED_EVENTS
    const trimmedEvents = events.slice(-MAX_STORED_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedEvents));
  } catch (error) {
    console.error('Failed to save analytics events:', error);
  }
}

// =============================================================================
// Analytics Functions
// =============================================================================

/**
 * Internal function to record an event
 */
function recordEvent(event: AnalyticsEvent): void {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', event.type, event);
  }

  // Store the event
  const events = loadStoredEvents();
  events.push(event);
  saveEvents(events);

  // Here you would typically send to your analytics provider
  // sendToAnalyticsProvider(event);
}

/**
 * Create base event properties
 */
function createBaseProps(): BaseEventProps {
  return {
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
  };
}

/**
 * Track audience type selection
 */
export function trackAudienceSelected(
  audienceType: AudienceType,
  source: 'onboarding' | 'settings' = 'onboarding'
): void {
  const event: AudienceSelectedEvent = {
    ...createBaseProps(),
    type: 'audience_selected',
    audienceType,
    source,
  };
  recordEvent(event);
}

/**
 * Track content layer change
 */
export function trackContentLayerChanged(
  toLayer: ContentLayer,
  fromLayer?: ContentLayer,
  audienceType?: AudienceType
): void {
  const event: ContentLayerChangedEvent = {
    ...createBaseProps(),
    type: 'content_layer_changed',
    toLayer,
    fromLayer,
    audienceType,
  };
  recordEvent(event);
}

/**
 * Track explanation tab change
 */
export function trackExplanationTabChanged(
  milestoneId: string,
  toTab: ExplanationTab,
  fromTab?: ExplanationTab,
  audienceType?: AudienceType
): void {
  const event: ExplanationTabChangedEvent = {
    ...createBaseProps(),
    type: 'explanation_tab_changed',
    milestoneId,
    toTab,
    fromTab,
    audienceType,
  };
  recordEvent(event);
}

/**
 * Track path started
 */
export function trackPathStarted(pathId: string, audienceType?: AudienceType): void {
  const event: PathStartedEvent = {
    ...createBaseProps(),
    type: 'path_started',
    pathId,
    audienceType,
  };
  recordEvent(event);
}

/**
 * Track path completed
 */
export function trackPathCompleted(
  pathId: string,
  timeSpentSeconds: number,
  milestonesViewed: number,
  audienceType?: AudienceType
): void {
  const event: PathCompletedEvent = {
    ...createBaseProps(),
    type: 'path_completed',
    pathId,
    timeSpentSeconds,
    milestonesViewed,
    audienceType,
  };
  recordEvent(event);
}

/**
 * Track milestone viewed
 */
export function trackMilestoneViewed(
  milestoneId: string,
  pathId?: string,
  audienceType?: AudienceType,
  contentLayer?: ContentLayer
): void {
  const event: MilestoneViewedEvent = {
    ...createBaseProps(),
    type: 'milestone_viewed',
    milestoneId,
    pathId,
    audienceType,
    contentLayer,
  };
  recordEvent(event);
}

/**
 * Track drop-off
 */
export function trackDropOff(
  pathId: string,
  completionPercentage: number,
  lastMilestoneId?: string,
  audienceType?: AudienceType
): void {
  const event: DropOffEvent = {
    ...createBaseProps(),
    type: 'drop_off',
    pathId,
    completionPercentage,
    lastMilestoneId,
    audienceType,
  };
  recordEvent(event);
}

// =============================================================================
// Analytics Query Functions (for dashboard)
// =============================================================================

/**
 * Get all stored analytics events
 */
export function getAllEvents(): AnalyticsEvent[] {
  return loadStoredEvents();
}

/**
 * Get events by type
 */
export function getEventsByType<T extends AnalyticsEvent>(
  eventType: AnalyticsEventType
): T[] {
  return loadStoredEvents().filter((e) => e.type === eventType) as T[];
}

/**
 * Get audience distribution statistics
 */
export function getAudienceDistribution(): Record<AudienceType, number> {
  const events = getEventsByType<AudienceSelectedEvent>('audience_selected');
  const distribution: Record<AudienceType, number> = {
    everyday: 0,
    leader: 0,
    technical: 0,
    general: 0,
  };

  for (const event of events) {
    distribution[event.audienceType]++;
  }

  return distribution;
}

/**
 * Get path completion rates by audience
 */
export function getPathCompletionByAudience(): Record<
  AudienceType,
  { started: number; completed: number; completionRate: number }
> {
  const startEvents = getEventsByType<PathStartedEvent>('path_started');
  const completeEvents = getEventsByType<PathCompletedEvent>('path_completed');

  const stats: Record<AudienceType, { started: number; completed: number; completionRate: number }> = {
    everyday: { started: 0, completed: 0, completionRate: 0 },
    leader: { started: 0, completed: 0, completionRate: 0 },
    technical: { started: 0, completed: 0, completionRate: 0 },
    general: { started: 0, completed: 0, completionRate: 0 },
  };

  for (const event of startEvents) {
    if (event.audienceType) {
      stats[event.audienceType].started++;
    }
  }

  for (const event of completeEvents) {
    if (event.audienceType) {
      stats[event.audienceType].completed++;
    }
  }

  // Calculate completion rates
  for (const audience of Object.keys(stats) as AudienceType[]) {
    const { started, completed } = stats[audience];
    stats[audience].completionRate = started > 0 ? (completed / started) * 100 : 0;
  }

  return stats;
}

/**
 * Get drop-off points by audience
 */
export function getDropOffPointsByAudience(): Record<
  AudienceType,
  { avgCompletionPercentage: number; count: number }
> {
  const dropOffEvents = getEventsByType<DropOffEvent>('drop_off');

  const stats: Record<AudienceType, { totalPercentage: number; count: number }> = {
    everyday: { totalPercentage: 0, count: 0 },
    leader: { totalPercentage: 0, count: 0 },
    technical: { totalPercentage: 0, count: 0 },
    general: { totalPercentage: 0, count: 0 },
  };

  for (const event of dropOffEvents) {
    if (event.audienceType) {
      stats[event.audienceType].totalPercentage += event.completionPercentage;
      stats[event.audienceType].count++;
    }
  }

  // Calculate averages
  const result: Record<AudienceType, { avgCompletionPercentage: number; count: number }> = {
    everyday: { avgCompletionPercentage: 0, count: 0 },
    leader: { avgCompletionPercentage: 0, count: 0 },
    technical: { avgCompletionPercentage: 0, count: 0 },
    general: { avgCompletionPercentage: 0, count: 0 },
  };

  for (const audience of Object.keys(stats) as AudienceType[]) {
    const { totalPercentage, count } = stats[audience];
    result[audience] = {
      avgCompletionPercentage: count > 0 ? totalPercentage / count : 0,
      count,
    };
  }

  return result;
}

/**
 * Clear all stored analytics events
 */
export function clearAnalytics(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
