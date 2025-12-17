/**
 * Context Path Utilities
 *
 * Utilities for generating and managing context paths from current events.
 * A context path is a mini learning journey through prerequisite milestones
 * that helps users understand current AI news through historical context.
 */

import type { CurrentEvent } from '../types/currentEvent';

/**
 * Represents a generated context path
 */
export interface ContextPath {
  /** ID of the source news event */
  newsEventId: string;
  /** Headline of the news event */
  newsHeadline: string;
  /** IDs of milestones to navigate through (chronologically ordered) */
  milestoneIds: string[];
  /** Estimated reading time in minutes */
  estimatedMinutes: number;
  /** Title of the context path */
  title: string;
  /** Timestamp when the path was created */
  createdAt: string;
}

/** Key for storing context path in session storage */
const CONTEXT_PATH_KEY = 'ai_timeline_context_path';

/** Estimated minutes per milestone for reading time calculation */
const MINUTES_PER_MILESTONE = 3;

/**
 * Generate a context path from a current event and its prerequisite milestones
 *
 * @param event - The current event to generate context for
 * @param milestoneIds - Ordered milestone IDs (should be chronologically sorted)
 * @returns A ContextPath object
 */
export function generateContextPath(
  event: CurrentEvent,
  milestoneIds: string[]
): ContextPath {
  return {
    newsEventId: event.id,
    newsHeadline: event.headline,
    milestoneIds,
    estimatedMinutes: milestoneIds.length * MINUTES_PER_MILESTONE,
    title: `Understanding: ${event.headline}`,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Save a context path to session storage
 *
 * @param contextPath - The context path to save
 */
export function saveContextPath(contextPath: ContextPath): void {
  try {
    sessionStorage.setItem(CONTEXT_PATH_KEY, JSON.stringify(contextPath));
  } catch (error) {
    // Session storage might be unavailable or full
    console.warn('Failed to save context path to session storage:', error);
  }
}

/**
 * Load a context path from session storage
 *
 * @returns The saved context path, or null if none exists
 */
export function loadContextPath(): ContextPath | null {
  try {
    const stored = sessionStorage.getItem(CONTEXT_PATH_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as ContextPath;
  } catch (error) {
    console.warn('Failed to load context path from session storage:', error);
    return null;
  }
}

/**
 * Clear the saved context path from session storage
 */
export function clearContextPath(): void {
  try {
    sessionStorage.removeItem(CONTEXT_PATH_KEY);
  } catch (error) {
    console.warn('Failed to clear context path from session storage:', error);
  }
}

/**
 * Check if there is an active context path
 *
 * @returns True if a context path is saved
 */
export function hasActiveContextPath(): boolean {
  try {
    return sessionStorage.getItem(CONTEXT_PATH_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Calculate the estimated reading time for a list of milestones
 *
 * @param milestoneCount - Number of milestones
 * @returns Estimated time in minutes
 */
export function calculateEstimatedTime(milestoneCount: number): number {
  return milestoneCount * MINUTES_PER_MILESTONE;
}
