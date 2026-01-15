/**
 * SubjectFilter component for filtering content by subject taxonomy
 * Sprint Subj-5 - UI & Discovery
 *
 * Supports both single-select and multi-select modes
 */

import { useState, useEffect, useCallback } from 'react';
import { ChevronRightIcon, CheckIcon } from '@heroicons/react/24/outline';
import { subjectsApi, type Subject } from '../../services/api';
import { DEFAULT_DOMAIN_COLORS } from '../../types/subject';

/**
 * Get color for a subject (uses subject color or domain default)
 */
function getSubjectColorFromApi(subject: Subject): string {
  if (subject.color) return subject.color;
  const domainSlug = subject.domainSlug || subject.slug.split('-')[0];
  return DEFAULT_DOMAIN_COLORS[domainSlug as keyof typeof DEFAULT_DOMAIN_COLORS] || '#6B7280';
}

/**
 * Single-select mode props
 */
interface SingleSelectProps {
  mode?: 'single';
  selected: string | null;
  onChange: (subjectSlug: string | null) => void;
}

/**
 * Multi-select mode props
 */
interface MultiSelectProps {
  mode: 'multi';
  selected: string[];
  onChange: (subjectSlugs: string[]) => void;
}

type SubjectFilterProps = SingleSelectProps | MultiSelectProps;

/**
 * Checkbox component for multi-select mode
 */
function Checkbox({
  checked,
  indeterminate,
  onChange,
  color,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
        checked || indeterminate
          ? 'border-transparent'
          : 'border-gray-300 bg-white hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800'
      }`}
      style={
        checked || indeterminate
          ? { backgroundColor: color, borderColor: color }
          : undefined
      }
    >
      {checked && <CheckIcon className="h-3 w-3 text-white" strokeWidth={3} />}
      {indeterminate && !checked && (
        <span className="block h-0.5 w-2 bg-white" />
      )}
    </button>
  );
}

export function SubjectFilter(props: SubjectFilterProps) {
  const [tree, setTree] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

  const isMultiMode = props.mode === 'multi';
  const selectedSingle = !isMultiMode ? props.selected : null;
  const selectedMulti = isMultiMode ? props.selected : [];

  useEffect(() => {
    const fetchTree = async () => {
      try {
        const data = await subjectsApi.getTree();
        setTree(data);
      } catch {
        console.error('Failed to load subject tree');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTree();
  }, []);

  const toggleDomain = (domainSlug: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domainSlug)) {
        next.delete(domainSlug);
      } else {
        next.add(domainSlug);
      }
      return next;
    });
  };

  // Single-select handler
  const handleSelectSingle = (slug: string) => {
    if (!isMultiMode) {
      const onChange = props.onChange as (slug: string | null) => void;
      if (selectedSingle === slug) {
        onChange(null);
      } else {
        onChange(slug);
      }
    }
  };

  // Multi-select handler - toggle a single subject
  const handleToggleMulti = useCallback(
    (slug: string) => {
      if (isMultiMode) {
        const onChange = props.onChange as (slugs: string[]) => void;
        if (selectedMulti.includes(slug)) {
          onChange(selectedMulti.filter((s) => s !== slug));
        } else {
          onChange([...selectedMulti, slug]);
        }
      }
    },
    [isMultiMode, selectedMulti, props]
  );

  // Multi-select handler - select all in a domain
  const handleSelectAllInDomain = useCallback(
    (domain: Subject) => {
      if (isMultiMode) {
        const onChange = props.onChange as (slugs: string[]) => void;
        const allSlugs = getAllSlugsInSubject(domain);
        const allSelected = allSlugs.every((s) => selectedMulti.includes(s));

        if (allSelected) {
          // Deselect all in this domain
          onChange(selectedMulti.filter((s) => !allSlugs.includes(s)));
        } else {
          // Select all in this domain
          const newSelection = new Set([...selectedMulti, ...allSlugs]);
          onChange(Array.from(newSelection));
        }
      }
    },
    [isMultiMode, selectedMulti, props]
  );

  // Get all slugs under a subject (including itself and all children)
  const getAllSlugsInSubject = (subject: Subject): string[] => {
    const slugs = [subject.slug];
    if (subject.children) {
      for (const child of subject.children) {
        slugs.push(...getAllSlugsInSubject(child));
      }
    }
    return slugs;
  };

  // Check if any children are selected (for indeterminate state)
  const hasSelectedChildren = (subject: Subject): boolean => {
    if (!isMultiMode) return false;
    const allSlugs = getAllSlugsInSubject(subject);
    return allSlugs.some((s) => selectedMulti.includes(s));
  };

  // Check if all children are selected
  const allChildrenSelected = (subject: Subject): boolean => {
    if (!isMultiMode) return false;
    const allSlugs = getAllSlugsInSubject(subject);
    return allSlugs.every((s) => selectedMulti.includes(s));
  };

  const handleClear = () => {
    if (isMultiMode) {
      (props.onChange as (slugs: string[]) => void)([]);
    } else {
      (props.onChange as (slug: string | null) => void)(null);
    }
  };

  const hasSelection = isMultiMode
    ? selectedMulti.length > 0
    : selectedSingle !== null;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Subject</h3>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 rounded bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Subject
          {isMultiMode && selectedMulti.length > 0 && (
            <span className="ml-1 text-xs text-gray-500">
              ({selectedMulti.length} selected)
            </span>
          )}
        </h3>
        {hasSelection && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Clear
          </button>
        )}
      </div>
      <div className="max-h-60 space-y-1 overflow-y-auto">
        {tree.map((domain) => {
          const isExpanded = expandedDomains.has(domain.slug);
          const color = getSubjectColorFromApi(domain);
          const isSelectedSingle = selectedSingle === domain.slug;
          const isSelectedMulti = selectedMulti.includes(domain.slug);
          const hasPartial = hasSelectedChildren(domain) && !allChildrenSelected(domain);
          const allSelected = allChildrenSelected(domain);

          return (
            <div key={domain.id}>
              {/* Domain row */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleDomain(domain.slug)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  <ChevronRightIcon
                    className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>

                {isMultiMode && (
                  <Checkbox
                    checked={allSelected}
                    indeterminate={hasPartial}
                    onChange={() => handleSelectAllInDomain(domain)}
                    color={color}
                  />
                )}

                <button
                  type="button"
                  onClick={() =>
                    isMultiMode
                      ? handleToggleMulti(domain.slug)
                      : handleSelectSingle(domain.slug)
                  }
                  className={`flex-1 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    isSelectedSingle || isSelectedMulti
                      ? 'font-medium'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                  style={
                    isSelectedSingle || isSelectedMulti
                      ? { backgroundColor: `${color}20`, color }
                      : undefined
                  }
                >
                  {domain.icon && <span className="mr-1.5">{domain.icon}</span>}
                  {domain.name}
                </button>
              </div>

              {/* Categories */}
              {isExpanded && domain.children && (
                <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-2 dark:border-gray-700">
                  {domain.children.map((category) => {
                    const catSelected = selectedMulti.includes(category.slug);
                    const catSelectedSingle = selectedSingle === category.slug;

                    return (
                      <div key={category.id}>
                        <div className="flex items-center gap-1">
                          {isMultiMode && (
                            <Checkbox
                              checked={catSelected}
                              onChange={() => handleToggleMulti(category.slug)}
                              color={color}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              isMultiMode
                                ? handleToggleMulti(category.slug)
                                : handleSelectSingle(category.slug)
                            }
                            className={`flex-1 rounded-md px-2 py-1 text-left text-sm transition-colors ${
                              catSelected || catSelectedSingle
                                ? 'font-medium'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                            }`}
                            style={
                              catSelected || catSelectedSingle
                                ? { backgroundColor: `${color}20`, color }
                                : undefined
                            }
                          >
                            {category.name}
                          </button>
                        </div>

                        {/* Subcategories */}
                        {category.children && category.children.length > 0 && (
                          <div className="ml-5 mt-0.5 space-y-0.5">
                            {category.children.map((subcategory) => {
                              const subSelected = selectedMulti.includes(subcategory.slug);
                              const subSelectedSingle = selectedSingle === subcategory.slug;

                              return (
                                <div key={subcategory.id} className="flex items-center gap-1">
                                  {isMultiMode && (
                                    <Checkbox
                                      checked={subSelected}
                                      onChange={() => handleToggleMulti(subcategory.slug)}
                                      color={color}
                                    />
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      isMultiMode
                                        ? handleToggleMulti(subcategory.slug)
                                        : handleSelectSingle(subcategory.slug)
                                    }
                                    className={`flex-1 rounded px-2 py-0.5 text-left text-xs transition-colors ${
                                      subSelected || subSelectedSingle
                                        ? 'font-medium'
                                        : 'text-gray-500 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-700'
                                    }`}
                                    style={
                                      subSelected || subSelectedSingle
                                        ? { backgroundColor: `${color}20`, color }
                                        : undefined
                                    }
                                  >
                                    {subcategory.name}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
