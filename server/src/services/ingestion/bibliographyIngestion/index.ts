/**
 * Bibliography Ingestion Module
 * Sprint Bib-1: Automated ingestion from "A Brief History of Intelligence" bibliography
 *
 * Exports all bibliography ingestion functionality
 */

// Types
export * from './types';

// Parser
export { parseBibliography, parseBibliographyFromText } from './bibliographyParser';

// Filter
export { filterToAIML, quickKeywordFilter, getCategoryStats } from './aimlFilter';

// Deduplication
export {
  checkDuplicate,
  checkDuplicates,
  getDuplicateStats,
  clearMilestonesCache,
} from './bibliographyDeduplicator';

// Metadata fetching
export { fetchSourceMetadata, fetchMetadataForEntries } from './sourceMetadataFetcher';

// Milestone generation
export {
  generateMilestoneData,
  generateMilestonesForEntries,
  estimateDate,
} from './milestoneGenerator';

// Category assignment
export {
  assignCategory,
  assignCategories,
  getCategoryDistribution,
} from './categoryAssigner';

// Publishing
export {
  publishMilestone,
  publishMilestones,
  getPublishingStats,
} from './bibliographyPublisher';

// Orchestrator
export {
  ingestBibliography,
  generateMarkdownReport,
  testIngestion,
} from './bibliographyIngestionOrchestrator';
