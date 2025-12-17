import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, RotateCcw, X, Sparkles } from 'lucide-react';
import { useOnboarding } from '../components/Onboarding';
import { useLearningPath, useCheckpointsForPath } from '../hooks/useContent';
import { usePathProgress } from '../hooks/usePathProgress';
import { useCheckpointProgress } from '../hooks/useCheckpointProgress';
import { useMilestone } from '../hooks/useMilestones';
import {
  PathSelector,
  PathNavigation,
  PathCompletionSummary,
} from '../components/LearningPaths';
import { MilestoneDetail } from '../components/Timeline/MilestoneDetail';
import { CheckpointView } from '../components/Checkpoints';
import type { LearningPath } from '../types/learningPath';
import type { Checkpoint } from '../types/checkpoint';

/**
 * View states for the learning paths page
 */
type ViewState =
  | { type: 'selection' }
  | { type: 'path'; pathId: string; milestoneIndex: number }
  | { type: 'checkpoint'; pathId: string; milestoneIndex: number; checkpoint: Checkpoint }
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
  const { openOnboarding } = useOnboarding();

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
    resetAllProgress: resetAllPathProgress,
  } = usePathProgress();

  // Checkpoint progress tracking
  const {
    isCheckpointCompleted,
    getPathCheckpointStats,
    completeCheckpoint,
    resetAllProgress: resetAllCheckpointProgress,
  } = useCheckpointProgress();

  // State for reset confirmation dialog
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Get current path data
  const currentPathId = viewState.type !== 'selection' ? viewState.pathId : '';
  const { data: currentPath } = useLearningPath(currentPathId);

  // Get checkpoints for the current path
  const { data: pathCheckpoints } = useCheckpointsForPath(currentPathId);

  // Debug: Log when checkpoints are loaded
  useEffect(() => {
    console.log('[Checkpoint Debug] Path changed, currentPathId:', currentPathId);
    console.log('[Checkpoint Debug] pathCheckpoints loaded:', pathCheckpoints);
  }, [currentPathId, pathCheckpoints]);

  // Get current milestone ID from path
  const currentMilestoneId =
    (viewState.type === 'path' || viewState.type === 'checkpoint') && currentPath
      ? currentPath.milestoneIds[viewState.milestoneIndex]
      : undefined;

  // Find checkpoint that should appear after a given milestone
  const getCheckpointForMilestone = useCallback(
    (milestoneId: string): Checkpoint | undefined => {
      if (!pathCheckpoints) return undefined;
      return pathCheckpoints.find(
        (cp) => cp.afterMilestoneId === milestoneId && !isCheckpointCompleted(cp.id)
      );
    },
    [pathCheckpoints, isCheckpointCompleted]
  );

  // Fetch the current milestone
  const { data: currentMilestone, isLoading: milestoneLoading, error: milestoneError } = useMilestone(
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

  // Handle next milestone (checks for checkpoints first)
  const handleNext = useCallback(() => {
    if (viewState.type !== 'path' || !currentPath || !currentMilestoneId) return;

    // Debug logging
    console.log('[Checkpoint Debug] currentMilestoneId:', currentMilestoneId);
    console.log('[Checkpoint Debug] pathCheckpoints:', pathCheckpoints);
    console.log('[Checkpoint Debug] currentPathId:', currentPathId);

    // Check if there's a checkpoint after this milestone
    const checkpoint = getCheckpointForMilestone(currentMilestoneId);
    console.log('[Checkpoint Debug] found checkpoint:', checkpoint);
    if (checkpoint) {
      // Show checkpoint before moving to next milestone
      setViewState({
        type: 'checkpoint',
        pathId: currentPath.id,
        milestoneIndex: viewState.milestoneIndex,
        checkpoint,
      });
      return;
    }

    // No checkpoint, proceed to next milestone
    const nextIndex = viewState.milestoneIndex + 1;
    if (nextIndex >= currentPath.milestoneIds.length) {
      // Path complete!
      completePath(currentPath.id);
      setViewState({ type: 'completion', pathId: currentPath.id });
      navigate(`/learn/${currentPath.id}/complete`);
    } else {
      setViewState({ type: 'path', pathId: currentPath.id, milestoneIndex: nextIndex });
    }
  }, [viewState, currentPath, currentMilestoneId, currentPathId, pathCheckpoints, getCheckpointForMilestone, completePath, navigate]);

  // Handle checkpoint completion - move to next milestone
  const handleCheckpointComplete = useCallback(
    (_results: { questionId: string; isCorrect: boolean }[], _score: number) => {
      if (viewState.type !== 'checkpoint' || !currentPath) return;

      // Mark checkpoint as completed so it won't show again
      completeCheckpoint(viewState.checkpoint.id, viewState.checkpoint.questions.length);

      // Move to next milestone after checkpoint
      const nextIndex = viewState.milestoneIndex + 1;
      if (nextIndex >= currentPath.milestoneIds.length) {
        // Path complete!
        completePath(currentPath.id);
        setViewState({ type: 'completion', pathId: currentPath.id });
        navigate(`/learn/${currentPath.id}/complete`);
      } else {
        setViewState({ type: 'path', pathId: currentPath.id, milestoneIndex: nextIndex });
      }
    },
    [viewState, currentPath, completePath, completeCheckpoint, navigate]
  );

  // Handle checkpoint skip - move to next milestone without completing
  const handleCheckpointSkip = useCallback(() => {
    if (viewState.type !== 'checkpoint' || !currentPath) return;

    // Mark checkpoint as completed (skipped) so it won't show again
    completeCheckpoint(viewState.checkpoint.id, viewState.checkpoint.questions.length);

    // Move to next milestone
    const nextIndex = viewState.milestoneIndex + 1;
    if (nextIndex >= currentPath.milestoneIds.length) {
      completePath(currentPath.id);
      setViewState({ type: 'completion', pathId: currentPath.id });
      navigate(`/learn/${currentPath.id}/complete`);
    } else {
      setViewState({ type: 'path', pathId: currentPath.id, milestoneIndex: nextIndex });
    }
  }, [viewState, currentPath, completePath, completeCheckpoint, navigate]);

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

  // Handle reset all progress
  const handleResetAllProgress = useCallback(() => {
    resetAllPathProgress();
    resetAllCheckpointProgress();
    setShowResetConfirm(false);
    // Reload the page to reflect the reset state
    window.location.reload();
  }, [resetAllPathProgress, resetAllCheckpointProgress]);

  // Debug: Log render state
  useEffect(() => {
    console.log('[Render Debug] viewState:', viewState);
    console.log('[Render Debug] currentPath:', currentPath?.id);
    console.log('[Render Debug] currentMilestoneId:', currentMilestoneId);
    console.log('[Render Debug] currentMilestone:', currentMilestone?.id);
    console.log('[Render Debug] milestoneLoading:', milestoneLoading);
    console.log('[Render Debug] milestoneError:', milestoneError);
  }, [viewState, currentPath, currentMilestoneId, currentMilestone, milestoneLoading, milestoneError]);

  // Render based on view state
  return (
    <div className="animate-fade-in min-h-screen">
      {/* Debug: Show error state when path view but no content */}
      {viewState.type === 'path' && !currentPath && (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <div className="text-red-500 text-lg font-medium mb-2">Error: Path not found</div>
          <div className="text-gray-500 text-sm mb-4">Path ID: {viewState.pathId}</div>
          <button
            onClick={handleExitPath}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Back to Learning Paths
          </button>
        </div>
      )}

      {viewState.type === 'path' && currentPath && !currentMilestone && !milestoneLoading && (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <div className="text-red-500 text-lg font-medium mb-2">Error: Milestone not found</div>
          <div className="text-gray-500 text-sm mb-2">Milestone ID: {currentMilestoneId}</div>
          <div className="text-gray-500 text-sm mb-2">Index: {viewState.milestoneIndex} of {currentPath.milestoneIds.length}</div>
          {milestoneError && (
            <div className="text-red-400 text-sm mb-2">API Error: {milestoneError}</div>
          )}
          <div className="text-gray-400 text-xs mb-4 max-w-md text-center">
            Path milestones: {currentPath.milestoneIds.join(', ')}
          </div>
          <button
            onClick={handleExitPath}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Back to Learning Paths
          </button>
        </div>
      )}

      {/* Path Selection View */}
      {viewState.type === 'selection' && (
        <>
          {/* Header */}
          <section className="bg-gradient-to-b from-orange-50 to-white dark:from-gray-800 dark:to-gray-900 py-12">
            <div className="container-main">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-orange-600 dark:text-orange-400" />
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
                <button
                  onClick={openOnboarding}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  title="Get personalized learning recommendations"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Personalize</span>
                </button>
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

              {/* Reset Progress Section */}
              <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Progress Management
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Reset your progress to start fresh on all learning paths
                    </p>
                  </div>
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset All Progress
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Reset Confirmation Modal */}
          {showResetConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Reset All Progress?
                  </h3>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  This will permanently clear all your learning progress, including:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 mb-6 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    All completed milestones across all paths
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    All checkpoint quiz answers and scores
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    Time spent tracking data
                  </li>
                </ul>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetAllProgress}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Yes, Reset Everything
                  </button>
                </div>
              </div>
            </div>
          )}
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
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
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
                  embedded
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkpoint View */}
      {viewState.type === 'checkpoint' && currentPath && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-100 dark:bg-gray-900">
          {/* Checkpoint Header */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="container-main">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExitPath}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      {currentPath.title}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Knowledge Check
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Checkpoint Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 min-h-full shadow-xl p-6">
              <CheckpointView
                checkpoint={viewState.checkpoint}
                onComplete={handleCheckpointComplete}
                onSkip={handleCheckpointSkip}
                allowSkip={true}
              />
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

            {/* Checkpoint Stats */}
            {(() => {
              const stats = getPathCheckpointStats(currentPath.id);
              if (stats.totalCheckpoints === 0) return null;
              return (
                <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    Knowledge Checkpoints
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="text-gray-900 dark:text-white">
                      <span className="font-bold">{stats.completedCheckpoints}</span>
                      <span className="text-gray-500 dark:text-gray-400"> of {stats.totalCheckpoints} completed</span>
                    </div>
                    {stats.completedCheckpoints > 0 && (
                      <div className="text-right">
                        <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {stats.averageScore}%
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">avg score</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </section>
      )}
    </div>
  );
}

export default LearningPathsPage;
