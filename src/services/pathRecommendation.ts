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
} from '../types/userProfile';
import type { LearningPath } from '../types/learningPath';
import { getLearningPaths } from '../content';

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
  executive: ['ai-for-business', 'chatgpt-story', 'ai-governance'],
  product_manager: ['chatgpt-story', 'ai-for-business', 'ai-image-generation'],
  marketing_sales: ['chatgpt-story', 'ai-for-business'],
  operations_hr: ['ai-for-business', 'ai-governance'],
  developer: ['ai-fundamentals', 'chatgpt-story', 'ai-image-generation'],
  student: ['ai-fundamentals', 'chatgpt-story', 'ai-governance'],
  curious: ['chatgpt-story', 'ai-fundamentals'],
};

/**
 * Map learning goals to recommended path IDs
 * Ordered by relevance (most relevant first)
 */
const goalPathMapping: Record<LearningGoal, string[]> = {
  discuss_at_work: ['chatgpt-story', 'ai-for-business'],
  evaluate_tools: ['ai-for-business', 'chatgpt-story'],
  hype_vs_real: ['ai-fundamentals', 'ai-governance'],
  industry_impact: ['ai-for-business', 'ai-governance'],
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
  'chatgpt-story': {
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
    build_with_ai: 'Explore creative AI applications',
    default: 'Discover how AI creates visual content',
  },
  'ai-governance': {
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
  const allPaths = getLearningPaths();
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
  return getLearningPaths().find((p) => p.id === pathId);
}

/**
 * Get all available paths (for "Explore all paths" option)
 */
export function getAllPaths(): LearningPath[] {
  return getLearningPaths();
}
