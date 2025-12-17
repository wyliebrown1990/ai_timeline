/**
 * SearchBar component with keyboard shortcuts and loading state
 */

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

export interface SearchBarRef {
  focus: () => void;
}

export const SearchBar = forwardRef<SearchBarRef, SearchBarProps>(function SearchBar(
  { value, onChange, placeholder = 'Search milestones...', isLoading = false },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Expose focus method via ref
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Focus search on "/" key (when not in an input)
      if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes((event.target as Element).tagName)) {
        event.preventDefault();
        inputRef.current?.focus();
      }

      // Focus search on Cmd/Ctrl + K
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }

      // Clear search on Escape
      if (event.key === 'Escape' && document.activeElement === inputRef.current) {
        onChange('');
        inputRef.current?.blur();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onChange]);

  return (
    <div className="relative w-full max-w-md" data-testid="search-bar">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        {isLoading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        ) : (
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        )}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
        placeholder={placeholder}
        data-testid="search-input"
        aria-label="Search milestones"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Clear search"
          data-testid="search-clear"
        >
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
      <div className="absolute inset-y-0 right-0 hidden items-center pr-3 md:flex">
        {!value && (
          <kbd className="hidden rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 sm:inline-block">
            /
          </kbd>
        )}
      </div>
    </div>
  );
});
