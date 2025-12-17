/**
 * Central export point for all application types
 *
 * This file re-exports all type definitions for the AI Timeline application.
 * Import types from '@/types' or 'src/types' for consistent usage.
 */

// Core milestone types and schemas
export * from './milestone';

// Filter types for search and filtering
export * from './filters';

// Sprint 8.5: New content types for AI Fluency Platform

// Learning paths - curated sequences through AI history
export * from './learningPath';

// Glossary entries - term definitions with business context
export * from './glossary';

// Checkpoints - knowledge checks with multiple question types
export * from './checkpoint';

// Current events - news connected to timeline milestones
export * from './currentEvent';

// User profiles - preferences and learning context
export * from './userProfile';
