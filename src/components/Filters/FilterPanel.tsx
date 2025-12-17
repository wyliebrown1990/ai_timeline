/**
 * FilterPanel component - combines all filter controls
 */

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, FunnelIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { CategoryFilter } from './CategoryFilter';
import { DateRangeFilter } from './DateRangeFilter';
import { SignificanceFilter } from './SignificanceFilter';
import { TagFilter } from './TagFilter';
import { useIsMobile } from '../../hooks/useMediaQuery';
import type { TimelineFilters, DatePreset } from '../../types/filters';
import type { MilestoneCategory, SignificanceLevel } from '../../types/milestone';

interface FilterPanelProps {
  filters: TimelineFilters;
  onCategoriesChange: (categories: MilestoneCategory[]) => void;
  onSignificanceChange: (levels: SignificanceLevel[]) => void;
  onDateRangeChange: (start: Date | null, end: Date | null) => void;
  onDatePresetSelect: (preset: DatePreset) => void;
  onTagsChange: (tags: string[]) => void;
  onReset: () => void;
  activeFilterCount: number;
  availableTags: { tag: string; count: number }[];
  isLoadingTags?: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export function FilterPanel({
  filters,
  onCategoriesChange,
  onSignificanceChange,
  onDateRangeChange,
  onDatePresetSelect,
  onTagsChange,
  onReset,
  activeFilterCount,
  availableTags,
  isLoadingTags,
  isOpen,
  onToggle,
}: FilterPanelProps) {
  const isMobile = useIsMobile();

  return (
    <>
      {/* Filter toggle button */}
      <button
        type="button"
        onClick={onToggle}
        className="relative inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        data-testid="filter-toggle"
        aria-label={isOpen ? 'Close filters' : 'Open filters'}
      >
        <FunnelIcon className="h-5 w-5" />
        <span className="hidden sm:inline">Filters</span>
        {activeFilterCount > 0 && (
          <span
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white"
            data-testid="active-filter-count"
          >
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Desktop filter panel */}
      <div className="hidden lg:block">
        <Transition
          show={isOpen}
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          <div
            className="absolute right-0 top-full z-40 mt-2 w-80 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
            data-testid="filter-panel"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <h2 className="font-medium text-gray-900 dark:text-gray-100">Filters</h2>
              </div>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={onReset}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    data-testid="clear-all-filters"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={onToggle}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700"
                  aria-label="Close filters"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="max-h-[60vh] space-y-6 overflow-y-auto p-4">
              <CategoryFilter selected={filters.categories} onChange={onCategoriesChange} />
              <hr className="border-gray-200 dark:border-gray-700" />
              <DateRangeFilter
                start={filters.dateRange.start}
                end={filters.dateRange.end}
                onStartChange={(start) => onDateRangeChange(start, filters.dateRange.end)}
                onEndChange={(end) => onDateRangeChange(filters.dateRange.start, end)}
                onPresetSelect={onDatePresetSelect}
              />
              <hr className="border-gray-200 dark:border-gray-700" />
              <SignificanceFilter
                selected={filters.significanceLevels}
                onChange={onSignificanceChange}
              />
              <hr className="border-gray-200 dark:border-gray-700" />
              <TagFilter
                selected={filters.tags}
                onChange={onTagsChange}
                availableTags={availableTags}
                isLoading={isLoadingTags}
              />
            </div>
          </div>
        </Transition>
      </div>

      {/* Mobile filter drawer - only render on mobile to prevent blocking desktop clicks */}
      {isMobile && (
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onToggle}>
          <Transition.Child
            as={Fragment}
            enter="ease-in-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in-out duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-300"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-300"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <Dialog.Panel
                    className="pointer-events-auto w-screen max-w-sm"
                    data-testid="filter-panel"
                  >
                    <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl dark:bg-gray-800">
                      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-gray-700">
                        <Dialog.Title className="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-gray-100">
                          <AdjustmentsHorizontalIcon className="h-5 w-5" />
                          Filters
                        </Dialog.Title>
                        <button
                          type="button"
                          onClick={onToggle}
                          className="rounded-md p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        >
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="flex-1 space-y-6 overflow-y-auto p-4">
                        <CategoryFilter
                          selected={filters.categories}
                          onChange={onCategoriesChange}
                        />
                        <hr className="border-gray-200 dark:border-gray-700" />
                        <DateRangeFilter
                          start={filters.dateRange.start}
                          end={filters.dateRange.end}
                          onStartChange={(start) =>
                            onDateRangeChange(start, filters.dateRange.end)
                          }
                          onEndChange={(end) =>
                            onDateRangeChange(filters.dateRange.start, end)
                          }
                          onPresetSelect={onDatePresetSelect}
                        />
                        <hr className="border-gray-200 dark:border-gray-700" />
                        <SignificanceFilter
                          selected={filters.significanceLevels}
                          onChange={onSignificanceChange}
                        />
                        <hr className="border-gray-200 dark:border-gray-700" />
                        <TagFilter
                          selected={filters.tags}
                          onChange={onTagsChange}
                          availableTags={availableTags}
                          isLoading={isLoadingTags}
                        />
                      </div>
                      {activeFilterCount > 0 && (
                        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                          <button
                            type="button"
                            onClick={onReset}
                            className="w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                            data-testid="clear-all-filters"
                          >
                            Clear all filters ({activeFilterCount})
                          </button>
                        </div>
                      )}
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
      )}
    </>
  );
}
