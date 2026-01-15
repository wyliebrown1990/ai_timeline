/**
 * SubjectFilter component for filtering content by subject taxonomy
 * Sprint Subj-5 - UI & Discovery
 */

import { useState, useEffect } from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { subjectsApi, type Subject } from '../../services/api';
import { DEFAULT_DOMAIN_COLORS } from '../../types/subject';

/**
 * Get color for a subject (uses subject color or domain default)
 */
function getSubjectColorFromApi(subject: Subject): string {
  if (subject.color) return subject.color;
  // Extract domain slug from the subject's domainSlug field or from the slug itself
  const domainSlug = subject.domainSlug || subject.slug.split('-')[0];
  return DEFAULT_DOMAIN_COLORS[domainSlug as keyof typeof DEFAULT_DOMAIN_COLORS] || '#6B7280';
}

interface SubjectFilterProps {
  selected: string | null;
  onChange: (subjectSlug: string | null) => void;
}

export function SubjectFilter({ selected, onChange }: SubjectFilterProps) {
  const [tree, setTree] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

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

  const handleSelect = (slug: string) => {
    if (selected === slug) {
      onChange(null);
    } else {
      onChange(slug);
    }
  };

  const handleClear = () => {
    onChange(null);
  };

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
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Subject</h3>
        {selected && (
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
                <button
                  type="button"
                  onClick={() => handleSelect(domain.slug)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    selected === domain.slug
                      ? 'font-medium'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                  style={
                    selected === domain.slug
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
                  {domain.children.map((category) => (
                    <div key={category.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(category.slug)}
                        className={`w-full rounded-md px-2 py-1 text-left text-sm transition-colors ${
                          selected === category.slug
                            ? 'font-medium'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                        }`}
                        style={
                          selected === category.slug
                            ? { backgroundColor: `${color}20`, color }
                            : undefined
                        }
                      >
                        {category.name}
                      </button>

                      {/* Subcategories */}
                      {category.children && category.children.length > 0 && (
                        <div className="ml-3 mt-0.5 space-y-0.5">
                          {category.children.map((subcategory) => (
                            <button
                              key={subcategory.id}
                              type="button"
                              onClick={() => handleSelect(subcategory.slug)}
                              className={`w-full rounded px-2 py-0.5 text-left text-xs transition-colors ${
                                selected === subcategory.slug
                                  ? 'font-medium'
                                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-700'
                              }`}
                              style={
                                selected === subcategory.slug
                                  ? { backgroundColor: `${color}20`, color }
                                  : undefined
                              }
                            >
                              {subcategory.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
