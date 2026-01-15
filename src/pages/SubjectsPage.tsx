/**
 * SubjectsPage - Subject Discovery Page
 * Sprint Subj-5 - UI & Discovery
 *
 * Grid of domain cards that expand to show categories and subcategories
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { subjectsApi, type Subject } from '../services/api';
import { DEFAULT_DOMAIN_COLORS } from '../types/subject';

/**
 * Get color for a subject (uses subject color or domain default)
 */
function getSubjectColor(subject: Subject): string {
  if (subject.color) return subject.color;
  const domainSlug = subject.domainSlug || subject.slug.split('-')[0];
  return DEFAULT_DOMAIN_COLORS[domainSlug as keyof typeof DEFAULT_DOMAIN_COLORS] || '#6B7280';
}

interface SubjectStats {
  milestones: number;
  glossaryTerms: number;
  total: number;
}

/**
 * Domain Card component
 */
function DomainCard({ domain }: { domain: Subject }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState<SubjectStats | null>(null);
  const color = getSubjectColor(domain);
  const hasChildren = domain.children && domain.children.length > 0;

  // Fetch stats when expanded
  useEffect(() => {
    if (isExpanded && !stats) {
      subjectsApi.getStats(domain.slug).then(setStats).catch(() => {});
    }
  }, [isExpanded, stats, domain.slug]);

  return (
    <div
      className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 transition-shadow hover:shadow-lg"
      style={{ borderTopColor: color, borderTopWidth: '4px' }}
    >
      {/* Domain header */}
      <button
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
        className="w-full p-6 text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${color}20` }}
            >
              {domain.icon || '📚'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {domain.name}
              </h2>
              {domain.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {domain.description}
                </p>
              )}
              {stats && stats.total > 0 && (
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {stats.milestones} milestones
                  </span>
                  {stats.glossaryTerms > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {stats.glossaryTerms} terms
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          {hasChildren && (
            <ChevronRightIcon
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          )}
        </div>
      </button>

      {/* Categories */}
      {isExpanded && domain.children && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4">
          <div className="space-y-4">
            {domain.children.map((category) => (
              <div key={category.id}>
                <Link
                  to={`/subjects/${category.slug}`}
                  className="flex items-center gap-2 text-gray-900 dark:text-white font-medium hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                >
                  {category.icon && <span>{category.icon}</span>}
                  {category.name}
                </Link>

                {/* Subcategories */}
                {category.children && category.children.length > 0 && (
                  <div className="ml-6 mt-2 flex flex-wrap gap-2">
                    {category.children.map((subcategory) => (
                      <Link
                        key={subcategory.id}
                        to={`/subjects/${subcategory.slug}`}
                        className="text-sm px-3 py-1 rounded-full transition-colors"
                        style={{
                          backgroundColor: `${color}15`,
                          color: color,
                        }}
                      >
                        {subcategory.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View all link */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-3">
        <Link
          to={`/subjects/${domain.slug}`}
          className="text-sm font-medium transition-colors hover:underline"
          style={{ color }}
        >
          View all {domain.name} content →
        </Link>
      </div>
    </div>
  );
}

/**
 * SubjectsPage component
 */
export default function SubjectsPage() {
  const [tree, setTree] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTree = async () => {
      try {
        const data = await subjectsApi.getTree();
        setTree(data);
      } catch (err) {
        console.error('Failed to load subject tree:', err);
        setError('Failed to load subjects. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTree();
  }, []);

  if (isLoading) {
    return (
      <div className="container-main py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-main py-8">
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpenIcon className="h-8 w-8 text-orange-500 dark:text-orange-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Explore by Subject
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
          Discover AI history organized by topic. Click any subject to see related milestones,
          glossary terms, and learning resources.
        </p>
      </div>

      {/* Domain grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tree.map((domain) => (
          <DomainCard key={domain.id} domain={domain} />
        ))}
      </div>

      {/* Empty state */}
      {tree.length === 0 && (
        <div className="text-center py-12">
          <BookOpenIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No subjects found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Subject taxonomy is being set up. Check back soon.
          </p>
        </div>
      )}
    </div>
  );
}
