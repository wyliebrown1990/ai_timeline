import { AlertCircle, Clock, LayoutGrid, Workflow } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CategoryLegend,
  KeyboardShortcutsHelp,
  MilestoneCard,
  MilestoneDetail,
  Timeline,
  TimelineMinimap,
  TimelineNavigation,
  TimelineSkeleton,
  ZoomControls,
  zoomConfig,
} from '../components/Timeline';
import type { ZoomLevel } from '../components/Timeline';
import { SearchBar, SearchResults } from '../components/Search';
import { FilterPanel } from '../components/Filters';
import { useSearch } from '../hooks/useSearch';
import { useFilters, useTags } from '../hooks/useFilters';
import { useTimelineSelection } from '../hooks/useTimelineSelection';
import { calculateTimeRange } from '../utils/timelineUtils';

/** View mode for displaying milestones */
type ViewMode = 'timeline' | 'list';

/**
 * Error state component for displaying API errors
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      data-testid="error-message"
      className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-red-200 bg-red-50 p-8"
    >
      <AlertCircle className="h-12 w-12 text-red-500" />
      <h2 className="mt-4 text-lg font-semibold text-red-700">Error Loading Data</h2>
      <p className="mt-2 text-center text-red-600">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
      >
        Try Again
      </button>
    </div>
  );
}

/**
 * Empty state component when no milestones exist
 */
function EmptyState() {
  return (
    <div
      data-testid="empty-state"
      className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8"
    >
      <Clock className="h-12 w-12 text-gray-400" />
      <h2 className="mt-4 text-lg font-semibold text-gray-700">No Milestones Found</h2>
      <p className="mt-2 text-center text-gray-500">
        There are no AI milestones to display at this time.
      </p>
    </div>
  );
}

/**
 * Timeline page component displaying AI milestones
 * Features horizontal timeline view, category filtering, zoom controls, and responsive design
 */
function TimelinePage() {
  const navigate = useNavigate();

  // Search state
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    isLoading: isSearchLoading,
    isSearching,
    total: searchTotal,
    clearSearch,
  } = useSearch();

  // Filter state with URL sync
  const {
    filters,
    setCategories,
    setSignificanceLevels,
    setDateRange,
    setDatePreset,
    setTags,
    resetFilters,
    activeFilterCount,
    hasActiveFilters,
    milestones,
    isLoading: isFilterLoading,
    error: filterError,
    total: filterTotal,
  } = useFilters();

  // Available tags for filter
  const { data: tagsData, isLoading: isTagsLoading } = useTags();

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('year');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Combined loading and error states
  const isLoading = isFilterLoading;
  const error = filterError?.message ?? null;

  // Simple refetch by resetting filters (triggers re-fetch)
  const refetch = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  // Selection state with URL sync
  const {
    selectedId,
    selectedMilestone,
    select,
    deselect,
    selectNext,
    selectPrevious,
    hasNext,
    hasPrevious,
  } = useTimelineSelection({
    milestones: milestones || [],
    syncWithUrl: true,
  });

  // Calculate time range for navigation
  const timeRange = useMemo(() => {
    if (!milestones || milestones.length === 0) {
      return [new Date(1940, 0, 1), new Date()] as [Date, Date];
    }
    const dates = milestones.map((m) => new Date(m.date));
    return calculateTimeRange(dates, 2);
  }, [milestones]);

  // Visible range (simplified - in a real app this would track scroll position)
  const visibleRange = useMemo(() => {
    const now = new Date();
    const yearsVisible = zoomConfig[zoomLevel].yearsPerScreen;
    const start = new Date(now.getFullYear() - yearsVisible / 2, 0, 1);
    const end = new Date(now.getFullYear() + yearsVisible / 2, 11, 31);
    return [start, end] as [Date, Date];
  }, [zoomLevel]);

  // Jump to year handler
  const handleJumpToYear = useCallback((year: number) => {
    if (timelineRef.current) {
      const scrollContainer = timelineRef.current.querySelector('.overflow-x-auto');
      if (scrollContainer) {
        // Calculate approximate scroll position based on year
        const totalWidth = scrollContainer.scrollWidth;
        const yearRatio = (year - timeRange[0].getFullYear()) /
          (timeRange[1].getFullYear() - timeRange[0].getFullYear());
        const targetScroll = totalWidth * yearRatio - scrollContainer.clientWidth / 2;
        scrollContainer.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
      }
    }
  }, [timeRange]);

  // Jump to earliest milestone
  const handleJumpToEarliest = useCallback(() => {
    if (milestones && milestones.length > 0) {
      const earliest = milestones.reduce((min, m) =>
        new Date(m.date) < new Date(min.date) ? m : min
      );
      handleJumpToYear(new Date(earliest.date).getFullYear());
    }
  }, [milestones, handleJumpToYear]);

  // Jump to latest milestone
  const handleJumpToLatest = useCallback(() => {
    if (milestones && milestones.length > 0) {
      const latest = milestones.reduce((max, m) =>
        new Date(m.date) > new Date(max.date) ? m : max
      );
      handleJumpToYear(new Date(latest.date).getFullYear());
    }
  }, [milestones, handleJumpToYear]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case '?':
          e.preventDefault();
          setShowKeyboardHelp(true);
          break;
        case '+':
        case '=':
          e.preventDefault();
          if (zoomLevel !== 'month') {
            const levels: ZoomLevel[] = ['decade', 'year', 'month'];
            const currentIdx = levels.indexOf(zoomLevel);
            const nextLevel = levels[currentIdx + 1];
            if (currentIdx < levels.length - 1 && nextLevel) {
              setZoomLevel(nextLevel);
            }
          }
          break;
        case '-':
          e.preventDefault();
          if (zoomLevel !== 'decade') {
            const levels: ZoomLevel[] = ['decade', 'year', 'month'];
            const currentIdx = levels.indexOf(zoomLevel);
            const prevLevel = levels[currentIdx - 1];
            if (currentIdx > 0 && prevLevel) {
              setZoomLevel(prevLevel);
            }
          }
          break;
        case 'Home':
          e.preventDefault();
          handleJumpToEarliest();
          break;
        case 'End':
          e.preventDefault();
          handleJumpToLatest();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomLevel, handleJumpToEarliest, handleJumpToLatest]);

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <section className="border-b border-gray-200 bg-white py-8">
        <div className="container-main">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">AI Timeline</h1>
              <p className="mt-1 text-gray-600">
                Explore the history of artificial intelligence from 1940s to present
                {filterTotal > 0 && (
                  <span>
                    {' '}({filterTotal} milestone{filterTotal !== 1 ? 's' : ''}
                    {hasActiveFilters && ' filtered'})
                  </span>
                )}
              </p>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex rounded-lg border border-gray-300 bg-white">
                <button
                  type="button"
                  onClick={() => setViewMode('timeline')}
                  className={`inline-flex items-center gap-1.5 rounded-l-lg px-3 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'timeline'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label="Timeline view"
                  aria-pressed={viewMode === 'timeline'}
                >
                  <Workflow className="h-4 w-4" />
                  <span className="hidden sm:inline">Timeline</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`inline-flex items-center gap-1.5 rounded-r-lg border-l border-gray-300 px-3 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>

              {/* Search bar */}
              <div className="relative">
                <SearchBar
                  value={searchQuery}
                  onChange={(value) => {
                    setSearchQuery(value);
                    setShowSearchResults(!!value);
                  }}
                  isLoading={isSearchLoading || isSearching}
                  placeholder="Search milestones..."
                />
                {showSearchResults && searchQuery && (
                  <SearchResults
                    results={searchResults}
                    query={searchQuery}
                    isLoading={isSearchLoading}
                    total={searchTotal}
                    onResultClick={(id) => {
                      clearSearch();
                      setShowSearchResults(false);
                      navigate(`/timeline?milestone=${id}`);
                      select(id);
                    }}
                    onClose={() => {
                      setShowSearchResults(false);
                    }}
                  />
                )}
              </div>

              {/* Filter panel */}
              <div className="relative">
                <FilterPanel
                  filters={filters}
                  onCategoriesChange={setCategories}
                  onSignificanceChange={setSignificanceLevels}
                  onDateRangeChange={setDateRange}
                  onDatePresetSelect={setDatePreset}
                  onTagsChange={setTags}
                  onReset={resetFilters}
                  activeFilterCount={activeFilterCount}
                  availableTags={tagsData?.data ?? []}
                  isLoadingTags={isTagsLoading}
                  isOpen={isFilterOpen}
                  onToggle={() => setIsFilterOpen(!isFilterOpen)}
                />
              </div>
            </div>
          </div>

          {/* Category legend and controls */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <CategoryLegend size="sm" className="justify-start" />

            {viewMode === 'timeline' && (
              <div className="flex items-center gap-4">
                <ZoomControls
                  currentZoom={zoomLevel}
                  onZoomChange={setZoomLevel}
                />
                {milestones && milestones.length > 0 && (
                  <TimelineNavigation
                    milestones={milestones}
                    onJumpToYear={handleJumpToYear}
                    onJumpToEarliest={handleJumpToEarliest}
                    onJumpToLatest={handleJumpToLatest}
                  />
                )}
              </div>
            )}
          </div>

          {/* Minimap */}
          {viewMode === 'timeline' && milestones && milestones.length > 0 && (
            <div className="mt-4 flex justify-center">
              <TimelineMinimap
                milestones={milestones}
                visibleRange={visibleRange}
                totalRange={timeRange}
                onNavigate={(date) => handleJumpToYear(date.getFullYear())}
              />
            </div>
          )}
        </div>
      </section>

      {/* Timeline Content */}
      <section className="py-8">
        <div
          ref={timelineRef}
          className={viewMode === 'timeline' ? 'px-4' : 'container-main'}
        >
          {/* Loading state */}
          {isLoading && (
            <div data-testid="loading-state">
              {viewMode === 'timeline' ? (
                <div className="flex items-center justify-center min-h-[500px]">
                  <TimelineSkeleton count={5} className="flex-row gap-4 overflow-hidden" />
                </div>
              ) : (
                <TimelineSkeleton count={6} />
              )}
            </div>
          )}

          {/* Error state */}
          {error && <ErrorState message={error} onRetry={refetch} />}

          {/* Empty state */}
          {!isLoading && !error && milestones && milestones.length === 0 && <EmptyState />}

          {/* Timeline view */}
          {!isLoading && !error && milestones && milestones.length > 0 && viewMode === 'timeline' && (
            <Timeline
              milestones={milestones}
              orientation="horizontal"
              showYearMarkers={true}
              yearMarkerInterval={zoomLevel === 'decade' ? 10 : zoomLevel === 'year' ? 5 : 1}
              onMilestoneSelect={select}
            />
          )}

          {/* List view */}
          {!isLoading && !error && milestones && milestones.length > 0 && viewMode === 'list' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {milestones.map((milestone) => (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  isExpanded={milestone.id === selectedId}
                  onSelect={select}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Milestone Detail Panel */}
      {selectedMilestone && (
        <MilestoneDetail
          milestone={selectedMilestone}
          onClose={deselect}
          onNext={hasNext ? selectNext : undefined}
          onPrevious={hasPrevious ? selectPrevious : undefined}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
        />
      )}

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />
    </div>
  );
}

export default TimelinePage;
