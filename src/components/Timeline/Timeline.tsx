import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTimelineDensity, type DisplayMode } from '../../hooks/useTimelineDensity';
import type { MilestoneResponse } from '../../types/milestone';
import {
  calculateMilestonePosition,
  calculateTimeRange,
  generateYearMarkers,
  groupMilestonesByYear,
} from '../../utils/timelineUtils';
import { MilestoneCard } from './MilestoneCard';
import { MilestoneCardSkeleton } from './MilestoneCardSkeleton';
import { MilestoneCluster } from './MilestoneCluster';
import { MilestoneDot } from './MilestoneDot';
import { MilestonePill } from './MilestonePill';

interface TimelineProps {
  /** Array of milestones to display */
  milestones: MilestoneResponse[];
  /** Timeline orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Grouping mode for milestones */
  groupBy?: 'year' | 'decade' | 'category';
  /** Whether to show year markers */
  showYearMarkers?: boolean;
  /** Interval for year markers */
  yearMarkerInterval?: number;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Callback when a milestone is selected */
  onMilestoneSelect?: (id: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Force a specific display mode (overrides automatic density) */
  forceDisplayMode?: DisplayMode;
  /** Whether to use adaptive spacing for dense periods */
  useAdaptiveSpacing?: boolean;
}

/**
 * Main timeline component with horizontal scrolling, year markers,
 * semantic zoom based on density, and adaptive spacing
 */
export function Timeline({
  milestones,
  orientation = 'horizontal',
  showYearMarkers = true,
  yearMarkerInterval = 5,
  isLoading = false,
  onMilestoneSelect,
  className = '',
  forceDisplayMode,
  useAdaptiveSpacing = true,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate density information
  const {
    densityByYear,
    getDisplayMode,
    getSpacingMultiplier,
  } = useTimelineDensity(milestones, { isMobile });

  // Calculate time range from milestones
  const timeRange = useMemo(() => {
    const dates = milestones.map((m) => new Date(m.date));
    return calculateTimeRange(dates, 2);
  }, [milestones]);

  // Generate year markers
  const yearMarkers = useMemo(() => {
    if (!showYearMarkers) return [];
    return generateYearMarkers(
      timeRange[0].getFullYear(),
      timeRange[1].getFullYear(),
      yearMarkerInterval
    );
  }, [timeRange, showYearMarkers, yearMarkerInterval]);

  // Group milestones by year
  const yearGroups = useMemo(() => groupMilestonesByYear(milestones), [milestones]);

  // Calculate adaptive virtual width based on density
  const virtualWidth = useMemo(() => {
    if (!useAdaptiveSpacing) {
      return Math.max(containerWidth, milestones.length * 150);
    }

    // Calculate width based on density - give more space to dense periods
    let totalWidth = 0;
    const baseWidthPerYear = containerWidth > 0 ? containerWidth / 10 : 150;

    densityByYear.forEach((segment) => {
      const multiplier = getSpacingMultiplier(segment.year);
      totalWidth += baseWidthPerYear * multiplier;
    });

    // Ensure minimum width
    return Math.max(containerWidth, totalWidth, milestones.length * 80);
  }, [containerWidth, milestones.length, densityByYear, getSpacingMultiplier, useAdaptiveSpacing]);

  // Calculate adaptive position based on density-aware spacing
  const calculateAdaptivePosition = useCallback(
    (date: Date): number => {
      if (!useAdaptiveSpacing || densityByYear.length === 0) {
        return calculateMilestonePosition(date, timeRange, virtualWidth);
      }

      const targetYear = date.getFullYear();
      let accumulatedWidth = 0;
      const baseWidthPerYear = containerWidth > 0 ? containerWidth / 10 : 150;

      // Sum up widths for years before the target
      for (const segment of densityByYear) {
        if (segment.year >= targetYear) break;
        accumulatedWidth += baseWidthPerYear * getSpacingMultiplier(segment.year);
      }

      // Add partial year offset
      const yearProgress = (date.getMonth() + date.getDate() / 31) / 12;
      const currentYearWidth = baseWidthPerYear * getSpacingMultiplier(targetYear);
      accumulatedWidth += yearProgress * currentYearWidth;

      return accumulatedWidth;
    },
    [containerWidth, densityByYear, getSpacingMultiplier, timeRange, virtualWidth, useAdaptiveSpacing]
  );

  // Group milestones by year for clustering
  const milestonesByYear = useMemo(() => {
    const groups = new Map<number, MilestoneResponse[]>();
    milestones.forEach((m) => {
      const year = new Date(m.date).getFullYear();
      const existing = groups.get(year) || [];
      existing.push(m);
      groups.set(year, existing);
    });
    return groups;
  }, [milestones]);

  // Calculate milestone positions with display mode
  const positions = useMemo(() => {
    return milestones.map((milestone, index) => {
      const date = new Date(milestone.date);
      const year = date.getFullYear();
      const yearIndices = yearGroups.get(year) || [index];
      const indexInYear = yearIndices.indexOf(index);
      const milestonesInYear = milestonesByYear.get(year) || [];

      // Get display mode (forced or automatic)
      const displayMode = forceDisplayMode || getDisplayMode(milestone);

      // Calculate position
      const x = useAdaptiveSpacing
        ? calculateAdaptivePosition(date)
        : calculateMilestonePosition(date, timeRange, virtualWidth);

      // Calculate vertical stagger based on display mode
      let y = 0;
      if (displayMode === 'card' || displayMode === 'compact') {
        // Full cards alternate above/below
        const isAbove = indexInYear % 2 === 0;
        const level = Math.floor(indexInYear / 2);
        y = isAbove ? -(60 + level * 120) : (60 + level * 120);
      } else if (displayMode === 'pill') {
        // Pills stack more tightly
        const isAbove = indexInYear % 2 === 0;
        const level = Math.floor(indexInYear / 2);
        y = isAbove ? -(40 + level * 50) : (40 + level * 50);
      } else {
        // Dots and clusters don't need much stagger
        y = indexInYear % 2 === 0 ? -20 : 20;
      }

      return {
        x,
        y,
        milestone,
        displayMode,
        isFirstInYear: indexInYear === 0,
        milestonesInYear,
      };
    });
  }, [
    milestones,
    timeRange,
    virtualWidth,
    yearGroups,
    milestonesByYear,
    forceDisplayMode,
    getDisplayMode,
    useAdaptiveSpacing,
    calculateAdaptivePosition,
  ]);

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Update scroll button states
  const updateScrollButtons = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateScrollButtons);
      updateScrollButtons();
      return () => scrollContainer.removeEventListener('scroll', updateScrollButtons);
    }
  }, [updateScrollButtons]);

  // Scroll handlers
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = containerWidth * 0.8;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Handle milestone selection
  const handleSelect = (id: string) => {
    setSelectedId(id);
    onMilestoneSelect?.(id);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      scroll('left');
    } else if (e.key === 'ArrowRight') {
      scroll('right');
    }
  };

  // Render milestone based on display mode
  const renderMilestone = (
    milestone: MilestoneResponse,
    displayMode: DisplayMode,
    isFirstInYear: boolean,
    milestonesInYear: MilestoneResponse[]
  ) => {
    const isSelected = selectedId === milestone.id;

    // For clusters, only render once per year (first milestone)
    if (displayMode === 'cluster') {
      if (!isFirstInYear) return null;
      const year = new Date(milestone.date).getFullYear();
      return (
        <MilestoneCluster
          milestones={milestonesInYear}
          year={year}
          onMilestoneSelect={handleSelect}
        />
      );
    }

    // For dots
    if (displayMode === 'dot') {
      return (
        <MilestoneDot
          milestone={milestone}
          onClick={() => handleSelect(milestone.id)}
          isSelected={isSelected}
          size={isMobile ? 'lg' : 'md'}
        />
      );
    }

    // For pills
    if (displayMode === 'pill') {
      return (
        <MilestonePill
          milestone={milestone}
          onClick={() => handleSelect(milestone.id)}
          isSelected={isSelected}
          showPreview={!isMobile}
        />
      );
    }

    // For compact cards
    if (displayMode === 'compact') {
      return (
        <MilestoneCard
          milestone={milestone}
          onSelect={handleSelect}
          variant="compact"
          className="w-48"
        />
      );
    }

    // Default: full cards
    return (
      <MilestoneCard
        milestone={milestone}
        onSelect={handleSelect}
        className="w-72"
      />
    );
  };

  // Get width class based on display mode
  const getWidthForMode = (displayMode: DisplayMode): string => {
    switch (displayMode) {
      case 'dot':
        return 'w-auto';
      case 'pill':
        return 'w-auto';
      case 'cluster':
        return 'w-auto';
      case 'compact':
        return 'w-48';
      default:
        return 'w-72';
    }
  };

  // Group milestones by year for mobile view
  const milestonesGroupedByYear = useMemo(() => {
    const groups: { year: number; milestones: MilestoneResponse[] }[] = [];
    const yearMap = new Map<number, MilestoneResponse[]>();

    milestones.forEach((m) => {
      const year = new Date(m.date).getFullYear();
      const existing = yearMap.get(year) || [];
      existing.push(m);
      yearMap.set(year, existing);
    });

    // Sort years descending (most recent first) for mobile
    Array.from(yearMap.entries())
      .sort((a, b) => b[0] - a[0])
      .forEach(([year, ms]) => {
        groups.push({ year, milestones: ms });
      });

    return groups;
  }, [milestones]);

  // Mobile-optimized vertical layout
  if (isMobile || orientation === 'vertical') {
    return (
      <div
        ref={containerRef}
        data-testid="timeline-container"
        className={`relative ${className}`}
      >
        {isLoading ? (
          <div className="space-y-4 px-4">
            {Array.from({ length: 5 }, (_, i) => (
              <MilestoneCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-6 px-4 pb-8">
            {milestonesGroupedByYear.map(({ year, milestones: yearMilestones }) => (
              <div key={year} className="space-y-3">
                {/* Year header */}
                <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-gray-900/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-700">
                  <h3 className="text-lg font-bold text-white">{year}</h3>
                  <span className="text-sm text-gray-400">{yearMilestones.length} milestone{yearMilestones.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Milestones for this year */}
                <div className="space-y-3">
                  {yearMilestones.map((milestone) => (
                    <button
                      key={milestone.id}
                      onClick={() => handleSelect(milestone.id)}
                      className={`
                        w-full text-left rounded-lg border p-4
                        transition-all duration-200 active:scale-[0.98]
                        ${selectedId === milestone.id
                          ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        }
                      `}
                    >
                      {/* Category indicator + Title */}
                      <div className="flex items-start gap-3">
                        <div className={`
                          mt-1 h-3 w-3 rounded-full flex-shrink-0
                          ${milestone.category === 'research' ? 'bg-blue-500' : ''}
                          ${milestone.category === 'model_release' ? 'bg-green-500' : ''}
                          ${milestone.category === 'breakthrough' ? 'bg-yellow-500' : ''}
                          ${milestone.category === 'product' ? 'bg-purple-500' : ''}
                          ${milestone.category === 'regulation' ? 'bg-red-500' : ''}
                          ${milestone.category === 'industry' ? 'bg-orange-500' : ''}
                        `} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white text-base leading-tight">
                            {milestone.title}
                          </h4>
                          <p className="mt-1 text-sm text-gray-400 line-clamp-2">
                            {milestone.description}
                          </p>
                          {/* Meta info */}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {milestone.organization && (
                              <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded">
                                {milestone.organization}
                              </span>
                            )}
                            <span className="text-xs text-gray-500 capitalize bg-gray-700/50 px-2 py-0.5 rounded">
                              {milestone.category.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Horizontal orientation (default)
  return (
    <div
      ref={containerRef}
      data-testid="timeline-container"
      className={`relative ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="AI Timeline"
    >
      {/* Scroll buttons */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white dark:bg-gray-800 p-2 shadow-lg transition-all hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-xl"
          aria-label="Scroll timeline left"
        >
          <ChevronLeft className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white dark:bg-gray-800 p-2 shadow-lg transition-all hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-xl"
          aria-label="Scroll timeline right"
        >
          <ChevronRight className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </button>
      )}

      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        data-testid="timeline-content"
        className="overflow-x-auto overflow-y-visible scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div
          className="relative min-h-[400px] py-32"
          style={{ width: `${virtualWidth}px` }}
        >
          {isLoading ? (
            <div className="flex gap-4 p-8">
              {Array.from({ length: 5 }, (_, i) => (
                <MilestoneCardSkeleton key={i} className="w-72 flex-shrink-0" />
              ))}
            </div>
          ) : (
            <>
              {/* Timeline axis */}
              <div className="absolute left-0 right-0 top-1/2 h-1 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />

              {/* Year markers */}
              {yearMarkers.map((year) => {
                const x = useAdaptiveSpacing
                  ? calculateAdaptivePosition(new Date(year, 6, 1)) // Mid-year
                  : calculateMilestonePosition(new Date(year, 0, 1), timeRange, virtualWidth);
                return (
                  <div
                    key={year}
                    data-testid={`year-marker-${year}`}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${x}px` }}
                  >
                    {/* Marker line */}
                    <div className="h-8 w-0.5 bg-gray-300 dark:bg-gray-600" />
                    {/* Year label */}
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-medium text-gray-500 dark:text-gray-400">
                      {year}
                    </span>
                  </div>
                );
              })}

              {/* Milestone items */}
              {positions.map(({ x, y, milestone, displayMode, isFirstInYear, milestonesInYear }) => {
                // Skip non-first milestones in clustered years
                if (displayMode === 'cluster' && !isFirstInYear) {
                  return null;
                }

                const widthClass = getWidthForMode(displayMode);

                return (
                  <div
                    key={milestone.id}
                    data-testid={`milestone-item-${milestone.id}`}
                    data-display-mode={displayMode}
                    className={`absolute transition-all duration-300 ease-out ${widthClass}`}
                    style={{
                      left: `${x}px`,
                      top: `calc(50% + ${y}px)`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    {/* Connector line for cards and compact cards */}
                    {(displayMode === 'card' || displayMode === 'compact') && (
                      <>
                        <div
                          className="absolute left-1/2 w-0.5 bg-gray-300 dark:bg-gray-600 -translate-x-1/2"
                          style={{
                            top: y < 0 ? 'auto' : '-8px',
                            bottom: y < 0 ? '-8px' : 'auto',
                            height: `${Math.abs(y) - 40}px`,
                          }}
                        />
                        <div
                          className="absolute left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-gray-400 dark:bg-gray-500 ring-2 ring-white dark:ring-gray-800"
                          style={{
                            top: y < 0 ? 'auto' : '-12px',
                            bottom: y < 0 ? '-12px' : 'auto',
                          }}
                        />
                      </>
                    )}

                    {renderMilestone(milestone, displayMode, isFirstInYear, milestonesInYear)}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Scroll hint gradient */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white dark:from-gray-900 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent" />
    </div>
  );
}

export default Timeline;
