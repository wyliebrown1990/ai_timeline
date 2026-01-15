/**
 * Bibliography Ingestion Types
 * Sprint Bib-1: Automated ingestion from "A Brief History of Intelligence" bibliography
 */

/**
 * Parsed bibliography entry from the webpage
 */
export interface BibliographyEntry {
  title: string;
  authors: string[];
  year: number;
  sourceUrl?: string;
  type: 'book' | 'paper' | 'article' | 'conference' | 'thesis' | 'report' | 'other';
  doi?: string;
  journal?: string;
  publisher?: string;
  rawCitation: string; // Original citation text for reference
}

/**
 * Result of parsing the bibliography page
 */
export interface ParsedBibliography {
  entries: BibliographyEntry[];
  parseErrors: string[];
  totalFound: number;
  sourceUrl: string;
  parsedAt: Date;
}

/**
 * Result of AI/ML classification
 */
export interface ClassificationResult {
  entry: BibliographyEntry;
  isAIML: boolean;
  confidence: number;
  reasoning: string;
  suggestedCategory: MilestoneCategory;
  suggestedSignificance: 1 | 2 | 3 | 4;
}

/**
 * Milestone categories (matching existing system)
 */
export type MilestoneCategory =
  | 'research'
  | 'model_release'
  | 'breakthrough'
  | 'product'
  | 'regulation'
  | 'industry';

/**
 * Result of duplicate checking
 */
export interface DuplicateCheckResult {
  entry: BibliographyEntry;
  isDuplicate: boolean;
  matchedMilestoneId?: string;
  matchedTitle?: string;
  similarityScore: number;
  matchMethod?: 'title' | 'author_year' | 'doi';
}

/**
 * Scraped metadata from source URL
 */
export interface ScrapedMetadata {
  success: boolean;
  actualDate?: Date;
  abstract?: string;
  organization?: string;
  additionalAuthors?: string[];
  citations?: number;
  pdfUrl?: string;
  venue?: string; // Conference or journal name
  error?: string;
}

/**
 * Generated milestone data (when scraping fails)
 */
export interface GeneratedMilestoneData {
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  category: MilestoneCategory;
  significance: 1 | 2 | 3 | 4;
  era: string;
  organization?: string;
  contributors: string[];
  tags: string[];
  tldr: string;
  simpleExplanation: string;
  businessImpact: string;
  historicalContext?: string;
  technicalDepth?: string;
  dateIsApproximate: boolean;
}

/**
 * Result of processing a single entry
 */
export interface ProcessingResult {
  entry: BibliographyEntry;
  status: 'created' | 'skipped_duplicate' | 'skipped_not_aiml' | 'error';
  milestoneId?: string;
  scrapingSucceeded: boolean;
  llmGenerated: boolean;
  error?: string;
}

/**
 * Full ingestion report
 */
export interface IngestionReport {
  sourceUrl: string;
  startedAt: Date;
  completedAt: Date;
  totalEntriesParsed: number;
  aimlFiltered: number;
  duplicatesSkipped: number;
  scrapingSucceeded: number;
  scrapingFailed: number;
  llmGenerated: number;
  milestonesCreated: number;
  errors: Array<{ entry: string; error: string }>;
  processingTimeMs: number;
  createdMilestoneIds: string[];
}

/**
 * Orchestrator options
 */
export interface IngestionOptions {
  sourceUrl: string;
  dryRun?: boolean;
  batchSize?: number;
  maxEntries?: number;
  skipScraping?: boolean;
  onProgress?: (progress: IngestionProgress) => void;
}

/**
 * Progress callback data
 */
export interface IngestionProgress {
  phase: 'parsing' | 'filtering' | 'deduplicating' | 'processing' | 'complete';
  current: number;
  total: number;
  currentEntry?: string;
  message: string;
}
