/**
 * RelatedBySubject Component
 * Sprint Subj-5 - UI & Discovery
 *
 * Shows content that shares subjects with the current item
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronRight } from 'lucide-react';
import { subjectsApi, type RelatedContentItem } from '../services/api';

interface RelatedBySubjectProps {
  /** Type of the current content */
  contentType: 'milestone' | 'glossary_term' | 'current_event' | 'person' | 'organization';
  /** ID of the current content */
  contentId: string;
  /** Maximum items to show */
  limit?: number;
  /** Content types to exclude from results */
  excludeTypes?: string[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get the display label and URL for a content item
 */
function getContentMeta(item: RelatedContentItem): { label: string; url: string; color: string } {
  switch (item.contentType) {
    case 'milestone':
      return {
        label: 'Timeline',
        url: `/timeline?milestone=${item.contentId}`,
        color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
      };
    case 'glossary_term':
      return {
        label: 'Concept',
        url: `/glossary/${item.contentId}`,
        color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
      };
    case 'current_event':
      return {
        label: 'News',
        url: `/news/${item.contentId}`,
        color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
      };
    case 'person':
      return {
        label: 'Person',
        url: `/people/${item.contentId}`,
        color: 'text-green-600 bg-green-50 dark:bg-green-900/20',
      };
    case 'organization':
      return {
        label: 'Organization',
        url: `/organizations/${item.contentId}`,
        color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20',
      };
    default:
      return {
        label: item.contentType,
        url: '#',
        color: 'text-gray-600 bg-gray-50 dark:bg-gray-900/20',
      };
  }
}

export function RelatedBySubject({
  contentType,
  contentId,
  limit = 5,
  excludeTypes = [],
  className = '',
}: RelatedBySubjectProps) {
  const [items, setItems] = useState<RelatedContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRelated() {
      setIsLoading(true);
      try {
        const results = await subjectsApi.getRelatedContent(contentType, contentId, limit + excludeTypes.length);
        // Filter out excluded types and limit results
        const filtered = results
          .filter((item) => !excludeTypes.includes(item.contentType))
          .slice(0, limit);
        setItems(filtered);
      } catch (err) {
        console.error('Failed to fetch related content:', err);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRelated();
  }, [contentType, contentId, limit, excludeTypes]);

  // Don't render if loading or no results
  if (isLoading || items.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-orange-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Related by Subject
        </h3>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const meta = getContentMeta(item);
          return (
            <Link
              key={`${item.contentType}-${item.contentId}`}
              to={meta.url}
              className="group flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 transition-colors"
            >
              <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}>
                {meta.label}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2">
                  {item.title}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-orange-500 shrink-0 mt-0.5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default RelatedBySubject;
