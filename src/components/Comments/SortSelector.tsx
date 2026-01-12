/**
 * SortSelector Component
 * Sprint LEarn-4 - Reddit-Style Comment Threads
 *
 * Dropdown to select comment sort order
 */

import { ChevronDown } from 'lucide-react';
import type { CommentSortMode } from '../../types/comment';
import { cn } from '../../lib/utils';

interface SortSelectorProps {
  value: CommentSortMode;
  onChange: (sort: CommentSortMode) => void;
  className?: string;
}

const sortOptions: { value: CommentSortMode; label: string; description: string }[] = [
  { value: 'best', label: 'Best', description: 'Top comments with recent activity' },
  { value: 'new', label: 'New', description: 'Most recent comments first' },
  { value: 'controversial', label: 'Controversial', description: 'High engagement, mixed opinions' },
];

export function SortSelector({ value, onChange, className }: SortSelectorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as CommentSortMode)}
          className={cn(
            'appearance-none cursor-pointer',
            'px-3 py-1.5 pr-8 text-sm font-medium rounded-lg',
            'bg-gray-100 dark:bg-gray-800',
            'text-gray-900 dark:text-gray-100',
            'border border-gray-200 dark:border-gray-700',
            'hover:bg-gray-200 dark:hover:bg-gray-700',
            'focus:ring-2 focus:ring-blue-500 focus:outline-none'
          )}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
      </div>
    </div>
  );
}
