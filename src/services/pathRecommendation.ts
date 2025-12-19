/**
 * Path Recommendation Engine
 *
 * Maps user role and goals to recommended learning paths,
 * filters by time commitment, and generates personalized
 * learning plans.
 */

import type {
  UserRole,
  LearningGoal,
  TimeCommitment,
  AudienceType,
} from '../types/userProfile';
import type { LearningPath } from '../types/learningPath';
import { loadLearningPaths } from '../content/asyncLoaders';

// Cached paths for synchronous access after initial load
let cachedPaths: LearningPath[] | null = null;

/**
 * Get paths synchronously from cache, or return empty array if not loaded
 * Call loadPathsAsync() first to populate the cache
 */
function getCachedPaths(): LearningPath[] {
  return cachedPaths || [];
}

/**
 * Load paths asynchronously and cache them
 */
export async function loadPathsAsync(): Promise<LearningPath[]> {
  if (cachedPaths) return cachedPaths;
  cachedPaths = await loadLearningPaths();
  return cachedPaths;
}

// =============================================================================
// Types
// =============================================================================

/**
 * Recommendation result for a single path
 */
export interface PathRecommendation {
  pathId: string;
  relevanceScore: number; // 0-100
  reason: string; // Why this path matches their goals
}

/**
 * Complete personalized learning plan
 */
export interface PersonalizedPlan {
  recommendedPaths: PathRecommendation[];
  estimatedTotalMinutes: number;
  suggestedStartPath: string;
}

// =============================================================================
// Path Mappings
// =============================================================================

/**
 * Map roles to recommended path IDs
 * Ordered by relevance (most relevant first)
 */
const rolePathMapping: Record<UserRole, string[]> = {
  everyday_user: ['ai-for-everyday-life', 'chatgpt-story', 'pop-culture'],
  culture_enthusiast: ['pop-culture', 'chatgpt-story', 'ai-governance'],
  executive: ['ai-for-leaders', 'ai-for-business', 'ai-governance'],
  product_manager: ['chatgpt-story', 'ai-for-business', 'ai-image-generation'],
  marketing_sales: ['chatgpt-story', 'ai-for-business'],
  operations_hr: ['ai-for-business', 'ai-governance'],
  developer: ['ai-fundamentals', 'chatgpt-story', 'ai-image-generation'],
  student: ['ai-fundamentals', 'chatgpt-story', 'ai-governance'],
  curious: ['chatgpt-story', 'ai-fundamentals', 'pop-culture'],
};

/**
 * Map learning goals to recommended path IDs
 * Ordered by relevance (most relevant first)
 */
const goalPathMapping: Record<LearningGoal, string[]> = {
  stay_informed: ['ai-for-everyday-life', 'chatgpt-story', 'pop-culture'],
  protect_family: ['ai-for-everyday-life'],
  cultural_impact: ['pop-culture', 'ai-governance', 'chatgpt-story'],
  hype_vs_real: ['ai-fundamentals', 'ai-governance', 'ai-for-everyday-life'],
  discuss_at_work: ['chatgpt-story', 'ai-for-business', 'ai-for-leaders'],
  evaluate_tools: ['ai-for-business', 'ai-for-leaders', 'chatgpt-story'],
  industry_impact: ['ai-for-business', 'ai-governance', 'ai-for-leaders'],
  build_with_ai: ['ai-fundamentals', 'chatgpt-story', 'ai-image-generation'],
  career_transition: ['ai-fundamentals', 'chatgpt-story', 'ai-governance'],
};

/**
 * Maximum time in minutes for each commitment level
 */
const timeFilterMinutes: Record<TimeCommitment, number> = {
  quick: 35, // ~30-35 minute single path
  standard: 75, // ~1 hour total
  deep: 999, // No limit - comprehensive
};

/**
 * Reason templates for recommendations
 */
const reasonTemplates: Record<string, Record<string, string>> = {
  'ai-for-everyday-life': {
    stay_informed: 'Plain English explanations of what AI can and cannot do',
    protect_family: 'Learn to spot AI scams and protect yourself',
    hype_vs_real: 'Cut through the hype with practical, no-jargon explanations',
    default: 'AI explained in plain English for everyday life',
  },
  'pop-culture': {
    stay_informed: 'The headlines and drama that shaped AI\'s rise',
    cultural_impact: 'From viral moments to labor strikes - AI\'s cultural story',
    default: 'The drama, headlines, and controversies behind AI',
  },
  'ai-for-leaders': {
    discuss_at_work: 'Strategic AI knowledge for executive conversations',
    evaluate_tools: 'Framework for evaluating AI investments',
    industry_impact: 'How AI transforms industries and creates opportunity',
    default: 'Strategic AI briefings for business leaders',
  },
  'chatgpt-story': {
    stay_informed: 'Understand the technology everyone is talking about',
    discuss_at_work: 'Gives you talking points for AI conversations at work',
    evaluate_tools: 'Understand what powers modern AI assistants',
    build_with_ai: 'Learn the foundations of language models',
    career_transition: 'Essential knowledge for any AI-related role',
    default: 'The most accessible introduction to modern AI',
  },
  'ai-fundamentals': {
    hype_vs_real: 'Build a foundation to separate hype from real capabilities',
    build_with_ai: 'Understand the technical building blocks of AI',
    career_transition: 'Solid foundation for technical AI roles',
    default: 'Understand the building blocks of artificial intelligence',
  },
  'ai-for-business': {
    discuss_at_work: 'Strategic AI knowledge for business contexts',
    evaluate_tools: 'Learn to evaluate AI for your organization',
    industry_impact: 'Understand how AI transforms business',
    default: 'Perfect for business decision-makers',
  },
  'ai-image-generation': {
    cultural_impact: 'How AI is transforming art and creativity',
    build_with_ai: 'Explore creative AI applications',
    default: 'Discover how AI creates visual content',
  },
  'ai-governance': {
    cultural_impact: 'The ethics debates and policy battles shaping AI',
    hype_vs_real: 'Learn about AI safety and realistic expectations',
    industry_impact: 'Understand AI regulation and compliance',
    career_transition: 'Essential for AI policy and ethics roles',
    default: 'Navigate AI governance and regulation',
  },
};

// =============================================================================
// Recommendation Functions
// =============================================================================

/**
 * Get a reason string for why a path is recommended based on goals
 */
function getReasonForPath(pathId: string, goals: LearningGoal[]): string {
  const pathReasons = reasonTemplates[pathId];
  if (!pathReasons) {
    return 'Recommended for your learning journey';
  }

  // Find first matching goal reason
  for (const goal of goals) {
    if (pathReasons[goal]) {
      return pathReasons[goal];
    }
  }

  return pathReasons.default || 'Recommended for your learning journey';
}

/**
 * Calculate relevance score for a path based on role and goals
 * Returns score from 0-100
 */
function calculateRelevanceScore(
  pathId: string,
  role: UserRole,
  goals: LearningGoal[]
): number {
  let score = 0;

  // Role-based scoring (up to 40 points)
  const rolePathsArray = rolePathMapping[role] || [];
  const roleIndex = rolePathsArray.indexOf(pathId);
  if (roleIndex !== -1) {
    // First path gets 40 points, second gets 30, third gets 20
    score += Math.max(40 - roleIndex * 10, 10);
  }

  // Goal-based scoring (up to 60 points)
  // Each matching goal adds points, weighted by position
  for (const goal of goals) {
    const goalPathsArray = goalPathMapping[goal] || [];
    const goalIndex = goalPathsArray.indexOf(pathId);
    if (goalIndex !== -1) {
      // First path gets 20 points, second gets 15, third gets 10
      score += Math.max(20 - goalIndex * 5, 5);
    }
  }

  return Math.min(score, 100);
}

/**
 * Generate personalized path recommendations
 */
export function generateRecommendations(
  role: UserRole,
  goals: LearningGoal[],
  timeCommitment: TimeCommitment
): PersonalizedPlan {
  const allPaths = getCachedPaths();
  const maxMinutes = timeFilterMinutes[timeCommitment];

  // Score all paths
  const scoredPaths: PathRecommendation[] = allPaths
    .map((path) => ({
      pathId: path.id,
      relevanceScore: calculateRelevanceScore(path.id, role, goals),
      reason: getReasonForPath(path.id, goals),
      estimatedMinutes: path.estimatedMinutes,
    }))
    .filter((p) => p.relevanceScore > 0) // Only include relevant paths
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Select paths that fit within time budget
  const selectedPaths: PathRecommendation[] = [];
  let totalMinutes = 0;

  for (const scoredPath of scoredPaths) {
    const pathData = allPaths.find((p) => p.id === scoredPath.pathId);
    if (!pathData) continue;

    // For 'quick' commitment, only include the top 1 path
    if (timeCommitment === 'quick' && selectedPaths.length >= 1) {
      break;
    }

    // For 'standard', include up to 2 paths within time limit
    if (timeCommitment === 'standard' && selectedPaths.length >= 2) {
      break;
    }

    // Check if adding this path exceeds time budget (for non-deep)
    if (
      timeCommitment !== 'deep' &&
      totalMinutes + pathData.estimatedMinutes > maxMinutes
    ) {
      continue;
    }

    selectedPaths.push({
      pathId: scoredPath.pathId,
      relevanceScore: scoredPath.relevanceScore,
      reason: scoredPath.reason,
    });
    totalMinutes += pathData.estimatedMinutes;
  }

  // Ensure at least one path is recommended
  if (selectedPaths.length === 0) {
    const fallback = scoredPaths[0];
    if (fallback) {
      const pathData = allPaths.find((p) => p.id === fallback.pathId);
      selectedPaths.push({
        pathId: fallback.pathId,
        relevanceScore: fallback.relevanceScore,
        reason: fallback.reason,
      });
      totalMinutes = pathData?.estimatedMinutes || 0;
    }
  }

  return {
    recommendedPaths: selectedPaths,
    estimatedTotalMinutes: totalMinutes,
    suggestedStartPath: selectedPaths[0]?.pathId || 'chatgpt-story',
  };
}

/**
 * Get path details for a recommendation
 */
export function getPathDetails(pathId: string): LearningPath | undefined {
  return getCachedPaths().find((p) => p.id === pathId);
}

/**
 * Get all available paths (for "Explore all paths" option)
 */
export function getAllPaths(): LearningPath[] {
  return getCachedPaths();
}

// =============================================================================
// Audience-Based Path Filtering (Sprint 19)
// =============================================================================

/**
 * Map audience types to recommended path IDs
 * Paths listed are "highly recommended" for this audience
 */
const audienceRecommendedPaths: Record<AudienceType, string[]> = {
  everyday: ['ai-for-everyday-life', 'pop-culture', 'chatgpt-story'],
  leader: ['ai-for-leaders', 'ai-for-business', 'ai-governance'],
  technical: ['ai-fundamentals', 'chatgpt-story', 'ai-image-generation'],
  general: ['chatgpt-story', 'ai-fundamentals', 'pop-culture'],
};

/**
 * Map audience types to paths that are NOT recommended (deprioritized)
 * These paths are shown lower or behind a toggle
 */
const audienceNotRecommendedPaths: Record<AudienceType, string[]> = {
  everyday: ['ai-fundamentals'], // Too technical for everyday users
  leader: ['ai-for-everyday-life'], // Too basic for leaders
  technical: ['ai-for-everyday-life', 'pop-culture'], // Too basic for technical users
  general: [], // General audience sees all paths equally
};

/**
 * Check if a path is recommended for a specific audience type
 */
export function isPathRecommendedForAudience(
  pathId: string,
  audienceType: AudienceType | undefined
): boolean {
  if (!audienceType || audienceType === 'general') return true;
  return audienceRecommendedPaths[audienceType]?.includes(pathId) ?? false;
}

/**
 * Check if a path should be deprioritized for a specific audience type
 */
export function isPathDeprioritizedForAudience(
  pathId: string,
  audienceType: AudienceType | undefined
): boolean {
  if (!audienceType || audienceType === 'general') return false;
  return audienceNotRecommendedPaths[audienceType]?.includes(pathId) ?? false;
}

/**
 * Get paths filtered and sorted by audience type
 * Returns: { recommended: LearningPath[], other: LearningPath[] }
 */
export function getPathsByAudience(
  audienceType: AudienceType | undefined
): { recommended: LearningPath[]; other: LearningPath[] } {
  const allPaths = getCachedPaths();

  if (!audienceType || audienceType === 'general') {
    // For general audience, recommend popular paths
    const popularPaths = ['chatgpt-story', 'ai-fundamentals', 'pop-culture'];
    const recommended = allPaths.filter((p) => popularPaths.includes(p.id));
    const other = allPaths.filter((p) => !popularPaths.includes(p.id));
    return { recommended, other };
  }

  const recommendedIds = audienceRecommendedPaths[audienceType] || [];
  const deprioritizedIds = audienceNotRecommendedPaths[audienceType] || [];

  // Recommended paths in order
  const recommended = recommendedIds
    .map((id) => allPaths.find((p) => p.id === id))
    .filter((p): p is LearningPath => p !== undefined);

  // Other paths (not recommended and not deprioritized) sorted by difficulty
  const otherNotDeprioritized = allPaths
    .filter((p) => !recommendedIds.includes(p.id) && !deprioritizedIds.includes(p.id))
    .sort((a, b) => {
      const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    });

  // Deprioritized paths at the end
  const deprioritized = deprioritizedIds
    .map((id) => allPaths.find((p) => p.id === id))
    .filter((p): p is LearningPath => p !== undefined);

  return {
    recommended,
    other: [...otherNotDeprioritized, ...deprioritized],
  };
}

/**
 * Get a descriptive reason why a path is recommended for an audience
 */
export function getAudienceRecommendationReason(
  pathId: string,
  audienceType: AudienceType
): string {
  const reasons: Record<AudienceType, Record<string, string>> = {
    everyday: {
      'ai-for-everyday-life': 'Perfect for understanding AI in plain English',
      'pop-culture': 'The stories and headlines you\'ve heard about',
      'chatgpt-story': 'Learn about the AI assistant everyone is talking about',
    },
    leader: {
      'ai-for-leaders': 'Strategic AI knowledge for decision-makers',
      'ai-for-business': 'How AI transforms business operations',
      'ai-governance': 'Navigate AI regulation and compliance',
    },
    technical: {
      'ai-fundamentals': 'Deep dive into how AI systems work',
      'chatgpt-story': 'Understand the technology behind language models',
      'ai-image-generation': 'Explore creative AI implementations',
    },
    general: {
      'chatgpt-story': 'The most popular introduction to modern AI',
      'ai-fundamentals': 'Build a solid foundation in AI concepts',
      'pop-culture': 'AI\'s impact on society and culture',
    },
  };

  return reasons[audienceType]?.[pathId] || 'Recommended for your learning journey';
}
