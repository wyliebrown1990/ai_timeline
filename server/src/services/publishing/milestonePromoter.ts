/**
 * Milestone Promoter Service
 *
 * Promotes a news event to a milestone by converting fields and creating the milestone record.
 * Used when an admin approves a news event and checks "Promote to Milestone".
 */

import { publishMilestone } from './milestonePublisher';

/**
 * Milestone category options
 */
export const MILESTONE_CATEGORIES = [
  'research',
  'model_release',
  'breakthrough',
  'product',
  'regulation',
  'industry',
] as const;

export type MilestoneCategory = (typeof MILESTONE_CATEGORIES)[number];

/**
 * Override options for milestone promotion
 */
export interface MilestoneOverrides {
  category?: MilestoneCategory;
  significance?: 1 | 2 | 3 | 4;
  tags?: string[];
  title?: string;
  description?: string;
}

/**
 * News event data structure (from ContentDraft.draftData)
 */
interface NewsEventData {
  headline: string;
  summary: string;
  publishedDate: string;
  sourceUrl?: string;
  organization?: string;
  prerequisiteMilestoneIds?: string[];
  connectionExplanation?: string;
  suggestedSubjects?: Array<{
    subjectId: string;
    subjectSlug: string;
    confidence: number;
    isPrimary: boolean;
  }>;
}

/**
 * Promote a news event to a milestone
 *
 * Converts news event fields to milestone fields:
 * - headline → title
 * - summary → description
 * - publishedDate → date
 *
 * @param newsEventData - The news event draft data
 * @param overrides - Optional overrides for milestone fields
 * @returns The created milestone ID
 */
export async function promoteNewsEventToMilestone(
  newsEventData: NewsEventData,
  overrides: MilestoneOverrides = {}
): Promise<string> {
  // Validate required fields
  if (!newsEventData.headline && !overrides.title) {
    throw new Error('News event headline or override title is required');
  }
  if (!newsEventData.summary && !overrides.description) {
    throw new Error('News event summary or override description is required');
  }
  if (!newsEventData.publishedDate) {
    throw new Error('News event publishedDate is required');
  }

  // Build milestone data from news event + overrides
  const milestoneData = {
    title: overrides.title || newsEventData.headline,
    description: overrides.description || newsEventData.summary,
    date: newsEventData.publishedDate,
    category: overrides.category || inferCategoryFromContent(newsEventData),
    significance: overrides.significance || 2, // Default to "Moderate"
    organization: newsEventData.organization || null,
    contributors: [], // Can be enhanced later
    sourceUrl: newsEventData.sourceUrl || null,
    tags: overrides.tags || [],
    sources: newsEventData.sourceUrl ? [newsEventData.sourceUrl] : [],
    // Layered content - can be generated separately if needed
    tldr: null,
    simpleExplanation: null,
    technicalDepth: null,
    businessImpact: null,
    whyItMattersToday: null,
    historicalContext: newsEventData.connectionExplanation || null,
    commonMisconceptions: null,
  };

  // Publish the milestone
  const milestoneId = await publishMilestone(milestoneData);

  console.log(
    `[MilestonePromoter] Promoted news event "${newsEventData.headline}" to milestone ${milestoneId}`
  );

  return milestoneId;
}

/**
 * Infer milestone category from news event content
 * Falls back to 'industry' as a safe default
 */
function inferCategoryFromContent(newsEventData: NewsEventData): MilestoneCategory {
  const text = `${newsEventData.headline} ${newsEventData.summary}`.toLowerCase();

  // Check for research-related keywords
  if (
    text.includes('paper') ||
    text.includes('study') ||
    text.includes('research') ||
    text.includes('arxiv') ||
    text.includes('published')
  ) {
    return 'research';
  }

  // Check for model release keywords
  if (
    text.includes('release') ||
    text.includes('launch') ||
    text.includes('gpt') ||
    text.includes('claude') ||
    text.includes('gemini') ||
    text.includes('llama') ||
    text.includes('model')
  ) {
    return 'model_release';
  }

  // Check for product keywords
  if (
    text.includes('product') ||
    text.includes('feature') ||
    text.includes('update') ||
    text.includes('api') ||
    text.includes('tool')
  ) {
    return 'product';
  }

  // Check for regulation keywords
  if (
    text.includes('regulation') ||
    text.includes('policy') ||
    text.includes('law') ||
    text.includes('government') ||
    text.includes('executive order')
  ) {
    return 'regulation';
  }

  // Check for breakthrough keywords
  if (
    text.includes('breakthrough') ||
    text.includes('first') ||
    text.includes('revolutionary') ||
    text.includes('groundbreaking')
  ) {
    return 'breakthrough';
  }

  // Default to industry
  return 'industry';
}
