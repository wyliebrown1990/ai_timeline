/**
 * RecentAdditions Component
 * Sprint TD-5: Shows recently added milestones for quick discovery
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ChevronRight, ChevronDown, Sparkles } from 'lucide-react';
import type { MilestoneWithLayeredContent } from '../../types/milestone';

interface RecentAdditionsProps {
  /** List of milestones sorted by creation date (newest first) */
  milestones: MilestoneWithLayeredContent[];
  /** Maximum number to show */
  limit?: number;
  /** Callback when a milestone is clicked */
  onSelect?: (id: string) => void;
  /** Whether the section is collapsible */
  collapsible?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
}

/**
 * Format relative time for display
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${diffDays >= 60 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Format milestone date for display
 */
function formatMilestoneDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  });
}

export function RecentAdditions({
  milestones,
  limit = 5,
  onSelect,
  collapsible = true,
  defaultCollapsed = false,
}: RecentAdditionsProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Sort by createdAt and take the most recent
  const recentMilestones = [...milestones]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  if (recentMilestones.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 border border-orange-200 dark:border-orange-800/50 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
        className={`w-full flex items-center justify-between px-4 py-3 ${
          collapsible ? 'cursor-pointer hover:bg-orange-100/50 dark:hover:bg-orange-900/20' : ''
        } transition-colors`}
        disabled={!collapsible}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-orange-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            Recently Added
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full">
            {recentMilestones.length} new
          </span>
        </div>
        {collapsible && (
          isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )
        )}
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4">
          <div className="space-y-2">
            {recentMilestones.map((milestone) => (
              <button
                key={milestone.id}
                onClick={() => onSelect?.(milestone.id)}
                className="w-full flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-orange-100 dark:border-orange-800/30 hover:border-orange-300 dark:hover:border-orange-600 transition-colors text-left group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-1">
                    {milestone.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatMilestoneDate(milestone.date)}
                    </span>
                    {milestone.organization && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <span>{milestone.organization}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                    {formatRelativeTime(milestone.createdAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* View all link */}
          <Link
            to="/timeline?sort=newest"
            className="mt-3 flex items-center justify-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium"
          >
            View all recent additions
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default RecentAdditions;
