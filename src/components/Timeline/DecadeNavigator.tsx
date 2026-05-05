import type { FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface DecadeNavigatorProps {
  /** Currently visible/active decade */
  activeDecade?: number;
  /** Callback when decade is clicked */
  onDecadeSelect: (startYear: number) => void;
  /** Callback when a specific year is entered */
  onYearJump?: (year: number) => void;
  /** Available decades based on data */
  availableDecades?: number[];
  /** Milestone counts per decade */
  milestoneCounts?: Record<number, number>;
  /** Whether the navigator should be sticky */
  sticky?: boolean;
  /** Min year for validation */
  minYear?: number;
  /** Max year for validation */
  maxYear?: number;
}

const ALL_DECADES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

/**
 * DecadeNavigator - Horizontal scrollable decade navigation bar
 * Sprint TD-5: UX & Search Intent Matching
 */
export function DecadeNavigator({
  activeDecade,
  onDecadeSelect,
  onYearJump,
  availableDecades = ALL_DECADES,
  milestoneCounts,
  sticky = true,
  minYear = 1940,
  maxYear = 2030,
}: DecadeNavigatorProps) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [yearInput, setYearInput] = useState('');
  const [yearError, setYearError] = useState<string | null>(null);

  // Handle year input submission
  const handleYearSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    setYearError(null);

    const year = parseInt(yearInput, 10);
    if (isNaN(year)) {
      setYearError('Enter a valid year');
      return;
    }
    if (year < minYear || year > maxYear) {
      setYearError(`Year must be ${minYear}-${maxYear}`);
      return;
    }

    // Use onYearJump if provided, otherwise fall back to decade select
    if (onYearJump) {
      onYearJump(year);
    } else {
      const decade = Math.floor(year / 10) * 10;
      onDecadeSelect(decade);
    }
    setYearInput('');
  }, [yearInput, minYear, maxYear, onYearJump, onDecadeSelect]);

  // Check scroll state
  const checkScrollState = useCallback((container: HTMLElement | null) => {
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  }, []);

  // Scroll handlers
  const scrollLeft = useCallback(() => {
    const container = document.getElementById('decade-nav-container');
    if (container) {
      container.scrollBy({ left: -200, behavior: 'smooth' });
    }
  }, []);

  const scrollRight = useCallback(() => {
    const container = document.getElementById('decade-nav-container');
    if (container) {
      container.scrollBy({ left: 200, behavior: 'smooth' });
    }
  }, []);

  // Set up scroll listener
  useEffect(() => {
    const container = document.getElementById('decade-nav-container');
    if (!container) return;

    const handleScroll = () => checkScrollState(container);
    container.addEventListener('scroll', handleScroll);
    checkScrollState(container);

    // Also check on resize
    const resizeObserver = new ResizeObserver(() => checkScrollState(container));
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [checkScrollState]);

  const getDecadeLabel = (year: number) => `${year}s`;

  return (
    <div
      className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${
        sticky ? 'sticky top-0 z-30' : ''
      }`}
    >
      <div className="container-main">
        <div className="relative flex items-center py-2">
          {/* Left scroll button */}
          {canScrollLeft && (
            <button
              onClick={scrollLeft}
              className="absolute left-0 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </button>
          )}

          {/* Decade buttons container */}
          <div
            id="decade-nav-container"
            className="flex gap-2 overflow-x-auto scrollbar-hide px-1 py-1 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {availableDecades.map((decade) => {
              const isActive = activeDecade === decade;
              const count = milestoneCounts?.[decade];

              return (
                <button
                  key={decade}
                  onClick={() => onDecadeSelect(decade)}
                  className={`
                    flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all
                    ${
                      isActive
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }
                  `}
                  aria-pressed={isActive}
                  aria-label={`Jump to ${getDecadeLabel(decade)}${count ? ` (${count} milestones)` : ''}`}
                >
                  <span>{getDecadeLabel(decade)}</span>
                  {count !== undefined && (
                    <span
                      className={`ml-1.5 text-xs ${
                        isActive ? 'text-orange-100' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right scroll button */}
          {canScrollRight && (
            <button
              onClick={scrollRight}
              className="absolute right-0 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </button>
          )}

          {/* Jump to year input */}
          <form onSubmit={handleYearSubmit} className="ml-4 flex-shrink-0 hidden sm:flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={yearInput}
                onChange={(e) => {
                  setYearInput(e.target.value);
                  setYearError(null);
                }}
                placeholder="Year"
                className={`w-20 rounded-lg border px-3 py-1.5 text-sm ${
                  yearError
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-orange-500 focus:ring-orange-500 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                aria-label="Jump to year"
                aria-describedby={yearError ? 'year-error' : undefined}
              />
              {yearError && (
                <div
                  id="year-error"
                  className="absolute top-full left-0 mt-1 whitespace-nowrap text-xs text-red-500 dark:text-red-400"
                >
                  {yearError}
                </div>
              )}
            </div>
            <button
              type="submit"
              className="flex h-8 items-center justify-center rounded-lg bg-orange-500 px-3 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
              aria-label="Go to year"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default DecadeNavigator;
