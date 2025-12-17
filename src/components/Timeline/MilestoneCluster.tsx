import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { MilestoneResponse } from '../../types/milestone';
import { MilestoneCategory } from '../../types/milestone';
import { categoryBgClasses } from '../../utils/timelineUtils';
import { MilestonePill } from './MilestonePill';

interface MilestoneClusterProps {
  /** Array of milestones in this cluster */
  milestones: MilestoneResponse[];
  /** Year this cluster represents */
  year: number;
  /** Callback when a milestone in the cluster is selected */
  onMilestoneSelect?: (id: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Initial expanded state */
  defaultExpanded?: boolean;
}

/**
 * A cluster component that groups multiple milestones together.
 * Shows stacked category dots and count, expands to show all milestones.
 */
export function MilestoneCluster({
  milestones,
  year,
  onMilestoneSelect,
  className = '',
  defaultExpanded = false,
}: MilestoneClusterProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Group milestones by category for the dot stack
  const categoryGroups = milestones.reduce(
    (acc, m) => {
      const category = m.category as MilestoneCategory;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    },
    {} as Record<MilestoneCategory, number>
  );

  // Get unique categories sorted by count
  const sortedCategories = Object.entries(categoryGroups)
    .sort(([, a], [, b]) => b - a)
    .map(([cat]) => cat as MilestoneCategory);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div
      data-testid={`milestone-cluster-${year}`}
      className={`relative ${className}`}
    >
      {/* Collapsed cluster view */}
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`
          group flex items-center gap-2
          rounded-xl border bg-white
          px-3 py-2
          transition-all duration-200
          hover:shadow-lg hover:-translate-y-0.5
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          ${isExpanded ? 'shadow-lg ring-2 ring-blue-500' : 'border-gray-200 shadow-md'}
        `.trim()}
        aria-expanded={isExpanded}
        aria-label={`${milestones.length} milestones in ${year}. Click to ${isExpanded ? 'collapse' : 'expand'}`}
      >
        {/* Stacked category dots */}
        <div className="flex -space-x-1">
          {sortedCategories.slice(0, 5).map((category, index) => {
            const bgColor = categoryBgClasses[category] || 'bg-gray-500';
            return (
              <div
                key={category}
                className={`
                  h-4 w-4 rounded-full border-2 border-white
                  ${bgColor}
                  transition-transform duration-200 group-hover:scale-110
                `}
                style={{ zIndex: 5 - index }}
                title={`${categoryGroups[category]} ${category.replace('_', ' ')}`}
              />
            );
          })}
          {sortedCategories.length > 5 && (
            <div className="h-4 w-4 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center">
              <span className="text-[8px] font-bold text-gray-600">
                +{sortedCategories.length - 5}
              </span>
            </div>
          )}
        </div>

        {/* Count and year */}
        <div className="flex flex-col items-start">
          <span className="text-sm font-bold text-gray-900">
            {milestones.length}
          </span>
          <span className="text-[10px] text-gray-500 -mt-0.5">
            in {year}
          </span>
        </div>

        {/* Expand/collapse icon */}
        <div className="text-gray-400 group-hover:text-gray-600 transition-colors ml-1">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* Expanded list */}
      {isExpanded && (
        <div
          className="
            absolute top-full left-0 mt-2
            z-50
            animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200
          "
        >
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-3 min-w-[280px] max-w-[320px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
              <h4 className="font-semibold text-sm text-gray-900">
                {year} Milestones
              </h4>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {milestones.length} items
              </span>
            </div>

            {/* Milestone list */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {milestones.map((milestone) => (
                <MilestonePill
                  key={milestone.id}
                  milestone={milestone}
                  onClick={() => onMilestoneSelect?.(milestone.id)}
                  showPreview={false}
                  className="w-full"
                />
              ))}
            </div>

            {/* Footer hint */}
            <p className="text-[10px] text-gray-400 mt-3 pt-2 border-t border-gray-100 text-center">
              Click a milestone to view details
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MilestoneCluster;
