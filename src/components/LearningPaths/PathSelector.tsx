import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useLearningPaths } from '../../hooks/useContent';
import { usePathProgress } from '../../hooks/usePathProgress';
import type { LearningPath } from '../../types/learningPath';
import type { AudienceType } from '../../types/userProfile';
import { PathCard } from './PathCard';
import {
  getPathsByAudience,
  getAudienceRecommendationReason,
} from '../../services/pathRecommendation';

interface PathSelectorProps {
  /** Callback when a path is selected */
  onSelectPath: (path: LearningPath) => void;
  /** Optional filter by difficulty */
  filterDifficulty?: LearningPath['difficulty'];
  /** Optional className */
  className?: string;
  /** Show only in-progress paths */
  showInProgressOnly?: boolean;
  /** Audience type for filtering recommendations (Sprint 19) */
  audienceFilter?: AudienceType;
  /** Show recommendations section based on audience (Sprint 19) */
  showRecommendations?: boolean;
}

/**
 * Path Selector Component
 *
 * Displays a grid of learning path cards with progress indicators.
 * Allows users to browse and select paths, with visual feedback on
 * their progress through each path.
 *
 * Sprint 19: Now supports audience-based filtering and recommendations.
 */
export function PathSelector({
  onSelectPath,
  filterDifficulty,
  className = '',
  showInProgressOnly = false,
  audienceFilter,
  showRecommendations = false,
}: PathSelectorProps) {
  const { data: paths, isLoading } = useLearningPaths();
  const {
    getCompletionPercentage,
    isPathCompleted,
    isPathStarted,
  } = usePathProgress();

  // State for "Not what you're looking for?" toggle (Sprint 19)
  const [showOtherPaths, setShowOtherPaths] = useState(false);

  // Get audience-based path groupings (Sprint 19)
  const audienceGroupedPaths = useMemo(() => {
    if (!showRecommendations || !audienceFilter) {
      return { recommended: [], other: paths };
    }
    return getPathsByAudience(audienceFilter);
  }, [showRecommendations, audienceFilter, paths]);

  // Filter and sort paths
  const filteredPaths = useMemo(() => {
    let result = [...paths];

    // Filter by difficulty if specified
    if (filterDifficulty) {
      result = result.filter((path) => path.difficulty === filterDifficulty);
    }

    // Filter to in-progress only if specified
    if (showInProgressOnly) {
      result = result.filter((path) => isPathStarted(path.id) && !isPathCompleted(path.id));
    }

    // Sort: in-progress first, then by difficulty, then alphabetically
    result.sort((a, b) => {
      const aStarted = isPathStarted(a.id);
      const bStarted = isPathStarted(b.id);
      const aCompleted = isPathCompleted(a.id);
      const bCompleted = isPathCompleted(b.id);

      // In-progress (not completed) first
      if (aStarted && !aCompleted && (!bStarted || bCompleted)) return -1;
      if (bStarted && !bCompleted && (!aStarted || aCompleted)) return 1;

      // Then not started
      if (!aStarted && !aCompleted && bCompleted) return -1;
      if (!bStarted && !bCompleted && aCompleted) return 1;

      // Completed last
      if (aCompleted && !bCompleted) return 1;
      if (bCompleted && !aCompleted) return -1;

      // Within same group, sort by difficulty
      const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
      const diffDiff = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
      if (diffDiff !== 0) return diffDiff;

      // Finally alphabetically
      return a.title.localeCompare(b.title);
    });

    return result;
  }, [paths, filterDifficulty, showInProgressOnly, isPathStarted, isPathCompleted]);

  // Get in-progress paths for the "Continue Learning" section
  const inProgressPaths = useMemo(() => {
    return paths.filter((path) => isPathStarted(path.id) && !isPathCompleted(path.id));
  }, [paths, isPathStarted, isPathCompleted]);

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-48"
          />
        ))}
      </div>
    );
  }

  if (filteredPaths.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">
          {showInProgressOnly
            ? 'No paths in progress. Start a new path to begin learning!'
            : 'No learning paths available.'}
        </p>
      </div>
    );
  }

  return (
    <div className={className} data-testid="path-selector">
      {/* Continue Learning Section */}
      {!showInProgressOnly && inProgressPaths.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Continue Learning
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inProgressPaths.map((path) => (
              <PathCard
                key={path.id}
                path={path}
                completionPercentage={getCompletionPercentage(path.id, path.milestoneIds.length)}
                isCompleted={false}
                onClick={() => onSelectPath(path)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recommended for You Section (Sprint 19) */}
      {showRecommendations && audienceGroupedPaths.recommended.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recommended for You
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {audienceGroupedPaths.recommended
              .filter((path) => !inProgressPaths.some((p) => p.id === path.id))
              .map((path) => (
                <div key={path.id} className="relative">
                  <PathCard
                    path={path}
                    completionPercentage={getCompletionPercentage(path.id, path.milestoneIds.length)}
                    isCompleted={isPathCompleted(path.id)}
                    onClick={() => onSelectPath(path)}
                  />
                  {/* Recommendation reason badge */}
                  {audienceFilter && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
                      {getAudienceRecommendationReason(path.id, audienceFilter)}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Not what you're looking for? Toggle (Sprint 19) */}
      {showRecommendations && audienceGroupedPaths.other.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowOtherPaths(!showOtherPaths)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            aria-expanded={showOtherPaths}
            data-testid="show-other-paths-toggle"
          >
            {showOtherPaths ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span>
              {showOtherPaths
                ? 'Hide other paths'
                : `Not what you're looking for? See ${audienceGroupedPaths.other.length} more paths`}
            </span>
          </button>
        </div>
      )}

      {/* Other Paths Section (collapsed by default when recommendations shown) */}
      {showRecommendations && showOtherPaths && audienceGroupedPaths.other.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Explore Other Paths
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {audienceGroupedPaths.other
              .filter((path) => !inProgressPaths.some((p) => p.id === path.id))
              .map((path) => (
                <PathCard
                  key={path.id}
                  path={path}
                  completionPercentage={getCompletionPercentage(path.id, path.milestoneIds.length)}
                  isCompleted={isPathCompleted(path.id)}
                  onClick={() => onSelectPath(path)}
                />
              ))}
          </div>
        </div>
      )}

      {/* All Paths Section (when recommendations not shown) */}
      {!showRecommendations && (
        <div>
          {!showInProgressOnly && inProgressPaths.length > 0 && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              All Learning Paths
            </h3>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPaths
              .filter((path) => showInProgressOnly || !inProgressPaths.includes(path))
              .map((path) => (
                <PathCard
                  key={path.id}
                  path={path}
                  completionPercentage={getCompletionPercentage(path.id, path.milestoneIds.length)}
                  isCompleted={isPathCompleted(path.id)}
                  onClick={() => onSelectPath(path)}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PathSelector;
