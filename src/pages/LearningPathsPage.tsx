import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useLearningPath } from '../hooks/useContent';
import { usePathProgress } from '../hooks/usePathProgress';
import { useMilestone } from '../hooks/useMilestones';
import {
  PathSelector,
  PathNavigation,
  PathCompletionSummary,
} from '../components/LearningPaths';
import { MilestoneDetail } from '../components/Timeline/MilestoneDetail';
import type { LearningPath } from '../types/learningPath';

/**
 * View states for the learning paths page
 */
type ViewState =
  | { type: 'selection' }
  | { type: 'path'; pathId: string; milestoneIndex: number }
  | { type: 'completion'; pathId: string };

/**
 * Learning Paths Page
 *
 * Main page for browsing and progressing through learning paths.
 * Supports:
 * - Path selection view (grid of available paths)
 * - Path progress view (viewing milestones within a path)
 * - Path completion view (summary and celebration)
 */
function LearningPathsPage() {
  const navigate = useNavigate();
  const { pathId } = useParams<{ pathId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get milestone index from URL params
  const milestoneIndexParam = searchParams.get('step');
  const initialMilestoneIndex = milestoneIndexParam ? parseInt(milestoneIndexParam, 10) - 1 : 0;

  // Initialize view state based on URL
  const [viewState, setViewState] = useState<ViewState>(() => {
    if (pathId) {
      return { type: 'path', pathId, milestoneIndex: Math.max(0, initialMilestoneIndex) };
    }
    return { type: 'selection' };
  });

  // Progress tracking
  const {
    markMilestoneViewed,
    getCompletionPercentage,
    completePath,
    resetPathProgress,
    getPathProgress,
    startPath,
  } = usePathProgress();

  // Get current path data
  const { data: currentPath } = useLearningPath(
    viewState.type !== 'selection' ? viewState.pathId : ''
  );

  // Get current milestone ID from path
  const currentMilestoneId =
    viewState.type === 'path' && currentPath
      ? currentPath.milestoneIds[viewState.milestoneIndex]
      : undefined;

  // Fetch the current milestone
  const { data: currentMilestone, isLoading: milestoneLoading } = useMilestone(
    currentMilestoneId || ''
  );

  // Sync URL with view state
  useEffect(() => {
    if (viewState.type === 'path' && pathId !== viewState.pathId) {
      navigate(`/learn/${viewState.pathId}?step=${viewState.milestoneIndex + 1}`, { replace: true });
    } else if (viewState.type === 'path') {
      setSearchParams({ step: String(viewState.milestoneIndex + 1) }, { replace: true });
    }
  }, [viewState, pathId, navigate, setSearchParams]);

  // Mark milestone as viewed when viewing
  useEffect(() => {
    if (viewState.type === 'path' && currentMilestoneId && currentPath) {
      markMilestoneViewed(currentPath.id, currentMilestoneId);
    }
  }, [viewState, currentMilestoneId, currentPath, markMilestoneViewed]);

  // Handle path selection
  const handleSelectPath = useCallback((path: LearningPath) => {
    startPath(path.id);
    const progress = getPathProgress(path.id);
    const startIndex = progress?.lastViewedMilestoneId
      ? path.milestoneIds.indexOf(progress.lastViewedMilestoneId)
      : 0;
    setViewState({ type: 'path', pathId: path.id, milestoneIndex: Math.max(0, startIndex) });
    navigate(`/learn/${path.id}?step=${startIndex + 1}`);
  }, [navigate, startPath, getPathProgress]);

  // Handle next milestone
  const handleNext = useCallback(() => {
    if (viewState.type !== 'path' || !currentPath) return;

    const nextIndex = viewState.milestoneIndex + 1;
    if (nextIndex >= currentPath.milestoneIds.length) {
      // Path complete!
      completePath(currentPath.id);
      setViewState({ type: 'completion', pathId: currentPath.id });
      navigate(`/learn/${currentPath.id}/complete`);
    } else {
      setViewState({ type: 'path', pathId: currentPath.id, milestoneIndex: nextIndex });
    }
  }, [viewState, currentPath, completePath, navigate]);

  // Handle previous milestone
  const handlePrevious = useCallback(() => {
    if (viewState.type !== 'path' || !currentPath) return;

    const prevIndex = Math.max(0, viewState.milestoneIndex - 1);
    setViewState({ type: 'path', pathId: currentPath.id, milestoneIndex: prevIndex });
  }, [viewState, currentPath]);

  // Handle exit path
  const handleExitPath = useCallback(() => {
    setViewState({ type: 'selection' });
    navigate('/learn');
  }, [navigate]);

  // Handle restart path
  const handleRestartPath = useCallback(() => {
    if (viewState.type === 'completion' && currentPath) {
      resetPathProgress(currentPath.id);
      startPath(currentPath.id);
      setViewState({ type: 'path', pathId: currentPath.id, milestoneIndex: 0 });
      navigate(`/learn/${currentPath.id}?step=1`);
    }
  }, [viewState, currentPath, resetPathProgress, startPath, navigate]);

  // Handle start next path
  const handleStartNextPath = useCallback((nextPathId: string) => {
    startPath(nextPathId);
    setViewState({ type: 'path', pathId: nextPathId, milestoneIndex: 0 });
    navigate(`/learn/${nextPathId}?step=1`);
  }, [startPath, navigate]);

  // Handle close milestone detail (in path context, go to next)
  const handleCloseMilestoneDetail = useCallback(() => {
    // When viewing in path context, closing goes back to path selection
    handleExitPath();
  }, [handleExitPath]);

  // Render based on view state
  return (
    <div className="animate-fade-in min-h-screen">
      {/* Path Selection View */}
      {viewState.type === 'selection' && (
        <>
          {/* Header */}
          <section className="bg-gradient-to-b from-indigo-50 to-white dark:from-gray-800 dark:to-gray-900 py-12">
            <div className="container-main">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Learning Paths
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Curated journeys through AI history
                  </p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
                Choose a guided path to explore AI milestones in context. Each path is designed
                to build your understanding progressively, from foundational concepts to recent
                breakthroughs.
              </p>
            </div>
          </section>

          {/* Path Grid */}
          <section className="py-8 dark:bg-gray-900">
            <div className="container-main">
              <PathSelector onSelectPath={handleSelectPath} />
            </div>
          </section>
        </>
      )}

      {/* Path Progress View */}
      {viewState.type === 'path' && currentPath && currentMilestone && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-100 dark:bg-gray-900">
          {/* Path Navigation Header */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="container-main">
              <PathNavigation
                path={currentPath}
                currentIndex={viewState.milestoneIndex}
                completionPercentage={getCompletionPercentage(
                  currentPath.id,
                  currentPath.milestoneIds.length
                )}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onExitPath={handleExitPath}
                isLastMilestone={viewState.milestoneIndex === currentPath.milestoneIds.length - 1}
                currentMilestoneViewed={true}
              />
            </div>
          </div>

          {/* Milestone Detail */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 min-h-full shadow-xl">
              {milestoneLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
                </div>
              ) : (
                <MilestoneDetail
                  milestone={currentMilestone}
                  onClose={handleCloseMilestoneDetail}
                  onNext={
                    viewState.milestoneIndex < currentPath.milestoneIds.length - 1
                      ? handleNext
                      : undefined
                  }
                  onPrevious={viewState.milestoneIndex > 0 ? handlePrevious : undefined}
                  hasNext={viewState.milestoneIndex < currentPath.milestoneIds.length - 1}
                  hasPrevious={viewState.milestoneIndex > 0}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Path Completion View */}
      {viewState.type === 'completion' && currentPath && (
        <section className="py-12 dark:bg-gray-900 min-h-screen">
          <div className="container-main max-w-xl">
            <button
              onClick={handleExitPath}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Learning Paths
            </button>
            <PathCompletionSummary
              path={currentPath}
              timeSpentSeconds={getPathProgress(currentPath.id)?.timeSpentSeconds || 0}
              onStartNextPath={handleStartNextPath}
              onRestartPath={handleRestartPath}
              onBackToPathSelection={handleExitPath}
            />
          </div>
        </section>
      )}
    </div>
  );
}

export default LearningPathsPage;
