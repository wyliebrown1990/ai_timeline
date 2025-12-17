import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import {
  loadContextPath,
  clearContextPath,
  type ContextPath,
} from '../../utils/contextPathUtils';

/**
 * Props for ContextPathBanner component
 */
interface ContextPathBannerProps {
  /** Currently selected milestone ID */
  currentMilestoneId?: string;
  /** Optional callback when navigation occurs */
  onNavigate?: (milestoneId: string) => void;
}

/**
 * ContextPathBanner Component
 *
 * Displays a banner at the top of the timeline when the user is navigating
 * through a context path from a current event. Shows:
 * - The news headline being explored
 * - Progress through the milestones
 * - Navigation controls to move between milestones
 * - Option to exit the context path
 */
export function ContextPathBanner({
  currentMilestoneId,
  onNavigate,
}: ContextPathBannerProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [contextPath, setContextPath] = useState<ContextPath | null>(null);

  // Check if we're in context mode from URL parameter
  const contextEventId = searchParams.get('context');

  // Load context path on mount or when context param changes
  useEffect(() => {
    if (contextEventId) {
      const loadedPath = loadContextPath();
      if (loadedPath && loadedPath.newsEventId === contextEventId) {
        setContextPath(loadedPath);
      }
    } else {
      setContextPath(null);
    }
  }, [contextEventId]);

  // Find current position in the path
  const currentIndex = contextPath?.milestoneIds.indexOf(currentMilestoneId || '') ?? -1;
  const totalMilestones = contextPath?.milestoneIds.length ?? 0;
  const isInPath = currentIndex >= 0;

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (!contextPath || currentIndex <= 0) return;
    const prevId = contextPath.milestoneIds[currentIndex - 1];
    if (prevId) {
      onNavigate?.(prevId);
      navigate(`/timeline?milestone=${prevId}&context=${contextPath.newsEventId}`);
    }
  }, [contextPath, currentIndex, navigate, onNavigate]);

  const handleNext = useCallback(() => {
    if (!contextPath || currentIndex >= totalMilestones - 1) return;
    const nextId = contextPath.milestoneIds[currentIndex + 1];
    if (nextId) {
      onNavigate?.(nextId);
      navigate(`/timeline?milestone=${nextId}&context=${contextPath.newsEventId}`);
    }
  }, [contextPath, currentIndex, totalMilestones, navigate, onNavigate]);

  const handleExit = useCallback(() => {
    clearContextPath();
    setContextPath(null);
    // Stay on timeline but remove context param
    navigate('/timeline' + (currentMilestoneId ? `?milestone=${currentMilestoneId}` : ''));
  }, [navigate, currentMilestoneId]);

  // Don't render if no active context path
  if (!contextPath || !contextEventId) {
    return null;
  }

  return (
    <div
      className="sticky top-0 z-30 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
      data-testid="context-path-banner"
    >
      <div className="container-main py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left side: Icon and headline */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Newspaper className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white/80 font-medium">Understanding the News</p>
              <p className="text-sm font-semibold truncate">
                {contextPath.newsHeadline}
              </p>
            </div>
          </div>

          {/* Center: Progress and navigation */}
          <div className="flex items-center gap-2">
            {/* Previous button */}
            <button
              onClick={handlePrevious}
              disabled={!isInPath || currentIndex <= 0}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous milestone"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Progress indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-lg">
              <span className="text-sm font-medium">
                {isInPath ? currentIndex + 1 : '—'}
              </span>
              <span className="text-white/60">/</span>
              <span className="text-sm text-white/80">{totalMilestones}</span>
            </div>

            {/* Next button */}
            <button
              onClick={handleNext}
              disabled={!isInPath || currentIndex >= totalMilestones - 1}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next milestone"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right side: Close button */}
          <button
            onClick={handleExit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Exit context path"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/80 rounded-full transition-all duration-300"
            style={{
              width: isInPath
                ? `${((currentIndex + 1) / totalMilestones) * 100}%`
                : '0%',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default ContextPathBanner;
