/**
 * TagFilter component for filtering milestones by tags
 */

import { useState, useMemo } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface TagFilterProps {
  selected: string[];
  onChange: (tags: string[]) => void;
  availableTags: { tag: string; count: number }[];
  isLoading?: boolean;
}

export function TagFilter({ selected, onChange, availableTags, isLoading }: TagFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter available tags by search query
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableTags.slice(0, 20); // Show top 20 by default
    }
    return availableTags.filter((t) =>
      t.tag.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableTags, searchQuery]);

  const handleToggle = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  const handleRemove = (tag: string) => {
    onChange(selected.filter((t) => t !== tag));
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Tags</h3>

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                className="rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800"
                aria-label={`Remove ${tag}`}
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search tags..."
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
        data-testid="tag-filter-input"
      />

      {/* Available tags */}
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          </div>
        ) : filteredTags.length === 0 ? (
          <p className="py-2 text-center text-xs text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No matching tags' : 'No tags available'}
          </p>
        ) : (
          filteredTags.map(({ tag, count }) => {
            const isSelected = selected.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleToggle(tag)}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
                data-testid={`tag-option-${tag}`}
              >
                <span className="truncate">{tag}</span>
                <span className="ml-2 shrink-0 text-xs text-gray-400 dark:text-gray-500">
                  {count}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
