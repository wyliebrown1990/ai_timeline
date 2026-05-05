import { AlertCircle, Clock, LayoutGrid, Workflow, Sparkles, Star } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SEO, generateTimelineItemListJsonLd } from '../components/SEO';
import {
  BackToTopButton,
  CategoryFilterBar,
  CompanyQuickFilters,
  DecadeNavigator,
  KeyboardShortcutsHelp,
  MilestoneDetail,
  RecentAdditions,
  Timeline,
  TimelineMinimap,
  TimelineNavigation,
  TimelineSkeleton,
  TimelineStats,
  VirtualizedMilestoneList,
  ZoomControls,
  zoomConfig,
} from '../components/Timeline';
import type { ZoomLevel } from '../components/Timeline';
import type { MilestoneCategory } from '../types/milestone';
import { SearchBar, SearchResults } from '../components/Search';
import { FilterPanel } from '../components/Filters';
import { useOnboarding } from '../components/Onboarding';
import { ContextPathBanner } from '../components/CurrentEvents';
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
      className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-red-200 bg-red-50 p-8 dark:border-red-800 dark:bg-red-900/20"
    >
      <AlertCircle className="h-12 w-12 text-red-500" />
      <h2 className="mt-4 text-lg font-semibold text-red-700 dark:text-red-300">Error Loading Data</h2>
      <p className="mt-2 text-center text-red-600 dark:text-red-400">{message}</p>
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
      className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 dark:border-gray-700 dark:bg-gray-800"
    >
      <Clock className="h-12 w-12 text-gray-400" />
      <h2 className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-200">No Milestones Found</h2>
      <p className="mt-2 text-center text-gray-500 dark:text-gray-400">
        There are no AI milestones to display at this time.
      </p>
    </div>
  );
}

/**
 * Timeline page component displaying AI milestones
 * Anthropic Warm theme - elegant, minimal design
 */
function TimelinePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openOnboarding } = useOnboarding();

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
    setSubject,
    toggleCategory,
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

  // UI state with localStorage persistence
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeline-view-mode');
      if (saved === 'list' || saved === 'timeline') return saved;
    }
    return 'timeline';
  });
  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem('timeline-view-mode', mode);
  }, []);
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
    urlParam: 'milestone',
  });

  // Calculate time range for navigation
  const timeRange = useMemo(() => {
    if (!milestones || milestones.length === 0) {
      return [new Date(1940, 0, 1), new Date()] as [Date, Date];
    }
    const dates = milestones.map((m) => new Date(m.date));
    return calculateTimeRange(dates, 2);
  }, [milestones]);

  // Calculate milestone counts per decade for DecadeNavigator
  const milestoneCounts = useMemo(() => {
    if (!milestones) return {};
    const counts: Record<number, number> = {};
    milestones.forEach((m) => {
      const year = new Date(m.date).getFullYear();
      const decade = Math.floor(year / 10) * 10;
      counts[decade] = (counts[decade] || 0) + 1;
    });
    return counts;
  }, [milestones]);

  // Calculate milestone counts per category for CategoryFilterBar
  const categoryCounts = useMemo(() => {
    if (!milestones) return {} as Record<MilestoneCategory, number>;
    const counts = {} as Record<MilestoneCategory, number>;
    milestones.forEach((m) => {
      const category = m.category as MilestoneCategory;
      counts[category] = (counts[category] || 0) + 1;
    });
    return counts;
  }, [milestones]);

  // Track active decade based on visible content
  const [activeDecade, setActiveDecade] = useState<number>(2020);

  // Visible range (simplified - in a real app this would track scroll position)
  const visibleRange = useMemo(() => {
    const now = new Date();
    const yearsVisible = zoomConfig[zoomLevel].yearsPerScreen;
    const start = new Date(now.getFullYear() - yearsVisible / 2, 0, 1);
    const end = new Date(now.getFullYear() + yearsVisible / 2, 11, 31);
    return [start, end] as [Date, Date];
  }, [zoomLevel]);

  // Track if initial scroll has happened
  const hasScrolledToDefault = useRef(false);

  // Jump to year handler with URL sync
  const handleJumpToYear = useCallback((year: number, smooth = true, updateUrl = true) => {
    if (timelineRef.current) {
      const scrollContainer = timelineRef.current.querySelector('.overflow-x-auto');
      if (scrollContainer) {
        // Calculate approximate scroll position based on year
        const totalWidth = scrollContainer.scrollWidth;
        const yearRatio = (year - timeRange[0].getFullYear()) /
          (timeRange[1].getFullYear() - timeRange[0].getFullYear());
        const targetScroll = totalWidth * yearRatio - scrollContainer.clientWidth / 2;
        scrollContainer.scrollTo({ left: Math.max(0, targetScroll), behavior: smooth ? 'smooth' : 'instant' });
      }
    }
    // Update URL with year param
    if (updateUrl) {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set('year', year.toString());
        return newParams;
      }, { replace: true });
    }
    // Update active decade
    setActiveDecade(Math.floor(year / 10) * 10);
  }, [timeRange, setSearchParams]);

  // Handle decade navigation
  const handleDecadeSelect = useCallback((decade: number) => {
    handleJumpToYear(decade + 5); // Jump to middle of decade
  }, [handleJumpToYear]);

  // Scroll to URL year or default (2017) on initial load
  useEffect(() => {
    if (!isLoading && milestones && milestones.length > 0 && !hasScrolledToDefault.current && viewMode === 'timeline') {
      // Small delay to ensure the timeline has rendered
      const timer = setTimeout(() => {
        const urlYear = searchParams.get('year');
        const targetYear = urlYear ? parseInt(urlYear, 10) : 2017;
        handleJumpToYear(targetYear, false, !urlYear); // Don't update URL if already from URL
        hasScrolledToDefault.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, milestones, viewMode, handleJumpToYear, searchParams]);

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

  // Calculate the most recent milestone date for freshness signal
  const lastUpdatedDate = useMemo(() => {
    if (!milestones || milestones.length === 0) return null;
    const sortedByDate = [...milestones].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sortedByDate[0] ? new Date(sortedByDate[0].date) : null;
  }, [milestones]);

  // Generate ItemList schema for timeline milestones
  const timelineSchema = useMemo(() => {
    if (!milestones || milestones.length === 0) return null;
    return generateTimelineItemListJsonLd(
      milestones.map((m) => ({
        id: m.id,
        title: m.title,
        date: m.date,
        description: m.description,
        organization: m.organization,
      })),
      'AI Timeline - Complete History of Artificial Intelligence',
      'Comprehensive interactive timeline covering 250+ milestones in artificial intelligence history from the 1940s to present day. Track major model releases, research breakthroughs, and industry developments.'
    );
  }, [milestones]);

  return (
    <>
      <SEO
        title="AI Timeline: Complete History of Artificial Intelligence"
        description="Explore the complete AI timeline from 1950 to 2026. Interactive history of artificial intelligence milestones, major model releases, and breakthroughs. Updated weekly with the latest AI developments."
        canonical="https://letaiexplainai.com/timeline"
        jsonLd={timelineSchema || undefined}
      />
      <div className="animate-fade-in">
        {/* Context Path Banner (shown when navigating from a current event) */}
      <ContextPathBanner
        currentMilestoneId={selectedId ?? undefined}
        onNavigate={select}
      />

      {/* Stats Bar - Above the fold for authority */}
      <TimelineStats
        milestoneCount={filterTotal || 250}
        organizationCount={50}
        figureCount={100}
        yearRange="1943-2026"
        isLoading={isLoading}
      />

      {/* Decade Navigator - Sticky navigation with year jump */}
      <DecadeNavigator
        activeDecade={activeDecade}
        onDecadeSelect={handleDecadeSelect}
        onYearJump={handleJumpToYear}
        milestoneCounts={milestoneCounts}
        sticky={true}
        minYear={1940}
        maxYear={2030}
      />

      {/* Page Header */}
      <section className="border-b border-gray-200 bg-white py-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="container-main">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">AI Timeline</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                The most comprehensive interactive AI timeline, from the Dartmouth Conference (1956) to today's frontier models. Updated weekly.
                {filterTotal > 0 && hasActiveFilters && (
                  <span className="ml-1 text-orange-600 dark:text-orange-400">
                    ({filterTotal} result{filterTotal !== 1 ? 's' : ''})
                  </span>
                )}
              </p>
              {/* Freshness signal for SEO and user trust */}
              {lastUpdatedDate && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Last updated: {lastUpdatedDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setViewMode('timeline')}
                  className={`inline-flex items-center gap-1.5 rounded-l-lg px-3 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'timeline'
                      ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
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
                  className={`inline-flex items-center gap-1.5 rounded-r-lg border-l border-gray-300 px-3 py-2 text-sm font-medium transition-colors dark:border-gray-600 ${
                    viewMode === 'list'
                      ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
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
                    onSuggestionClick={(term) => {
                      setSearchQuery(term);
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
                  onSubjectChange={setSubject}
                  onReset={resetFilters}
                  activeFilterCount={activeFilterCount}
                  availableTags={tagsData?.data ?? []}
                  isLoadingTags={isTagsLoading}
                  isOpen={isFilterOpen}
                  onToggle={() => setIsFilterOpen(!isFilterOpen)}
                />
              </div>

              {/* Major only toggle - Sprint TD-5 density control */}
              <button
                onClick={() => {
                  const isMajorOnly = filters.significanceLevels.length === 2 &&
                    filters.significanceLevels.includes(3) &&
                    filters.significanceLevels.includes(4);
                  if (isMajorOnly) {
                    setSignificanceLevels([]); // Show all
                  } else {
                    setSignificanceLevels([3, 4]); // Major only
                  }
                }}
                className={`group inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  filters.significanceLevels.length === 2 &&
                  filters.significanceLevels.includes(3) &&
                  filters.significanceLevels.includes(4)
                    ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
                title="Show only major milestones (significance 3-4)"
              >
                <Star className={`h-4 w-4 ${
                  filters.significanceLevels.length === 2 &&
                  filters.significanceLevels.includes(3) &&
                  filters.significanceLevels.includes(4)
                    ? 'fill-amber-400 text-amber-500'
                    : ''
                }`} />
                <span className="hidden sm:inline">Major Only</span>
              </button>

              {/* Personalize button */}
              <button
                onClick={openOnboarding}
                className="group inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                title="Get personalized learning recommendations"
              >
                <Sparkles className="h-4 w-4 transition-colors group-hover:fill-orange-400 group-hover:text-orange-500" />
                <span className="hidden sm:inline">Personalize</span>
              </button>
            </div>
          </div>

          {/* Company quick filters */}
          <div className="mt-4">
            <CompanyQuickFilters />
          </div>

          {/* Category filter bar with counts */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <CategoryFilterBar
              activeCategories={filters.categories}
              onToggleCategory={toggleCategory}
              onClearAll={resetFilters}
              categoryCounts={categoryCounts}
              totalCount={filterTotal}
            />

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

      {/* Recent Additions - Sprint TD-5 */}
      {!isLoading && !hasActiveFilters && milestones && milestones.length > 0 && (
        <section className="py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="container-main">
            <RecentAdditions
              milestones={milestones}
              limit={5}
              onSelect={select}
              collapsible={true}
              defaultCollapsed={false}
            />
          </div>
        </section>
      )}

      {/* Timeline Content */}
      <section className="py-8 bg-gray-50 dark:bg-gray-900">
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

          {/* List view - Sprint TD-5: Virtualized for performance */}
          {!isLoading && !error && milestones && milestones.length > 0 && viewMode === 'list' && (
            <VirtualizedMilestoneList
              milestones={milestones}
              selectedId={selectedId}
              onSelect={select}
              columns={3}
              height={Math.min(800, window.innerHeight - 200)}
              virtualizationThreshold={50}
            />
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

      {/* Back to Top FAB for mobile */}
      <BackToTopButton threshold={400} mobileOnly={true} />
    </div>
    </>
  );
}

export default TimelinePage;
