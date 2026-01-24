import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { milestonesApi } from '../services/api';
import type { MilestoneResponse, MilestoneCategory } from '../types/milestone';

/**
 * EmbedTimelinePage - Minimal timeline for embedding via iframe
 * Sprint TD-4: Linkable Assets - Embeddable Widget
 *
 * URL params:
 * - theme: 'light' | 'dark' (default: light)
 * - limit: number (default: 10, max: 50)
 * - category: MilestoneCategory filter
 * - org: organization filter
 * - startYear: filter from year
 * - endYear: filter to year
 */
function EmbedTimelinePage() {
  const [searchParams] = useSearchParams();
  const [milestones, setMilestones] = useState<MilestoneResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse params
  const theme = searchParams.get('theme') || 'light';
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
  const category = searchParams.get('category') as MilestoneCategory | null;
  const org = searchParams.get('org');
  const startYear = searchParams.get('startYear');
  const endYear = searchParams.get('endYear');

  useEffect(() => {
    async function fetchMilestones() {
      setIsLoading(true);
      setError(null);

      try {
        // Build filter params
        const params: Record<string, string> = { limit: limit.toString() };
        if (category) params.categories = category;
        if (org) params.organization = org;
        if (startYear) params.dateStart = `${startYear}-01-01`;
        if (endYear) params.dateEnd = `${endYear}-12-31`;

        const response = Object.keys(params).length > 1
          ? await milestonesApi.getFiltered(params)
          : await milestonesApi.getAll({ limit });

        setMilestones(response.data.slice(0, limit));
      } catch (err) {
        setError('Failed to load timeline');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMilestones();
  }, [limit, category, org, startYear, endYear]);

  // Theme classes
  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-gray-900' : 'bg-white';
  const textClass = isDark ? 'text-gray-100' : 'text-gray-900';
  const mutedClass = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';
  const cardBgClass = isDark ? 'bg-gray-800' : 'bg-gray-50';

  // Category colors
  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      MODEL_RELEASE: isDark ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700',
      RESEARCH: isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700',
      BREAKTHROUGH: isDark ? 'bg-amber-900 text-amber-300' : 'bg-amber-100 text-amber-700',
      PRODUCT: isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700',
      REGULATION: isDark ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700',
      INDUSTRY: isDark ? 'bg-teal-900 text-teal-300' : 'bg-teal-100 text-teal-700',
    };
    return colors[cat] || (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} p-4`}>
      {/* Timeline */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-8">{error}</div>
      ) : (
        <div className="space-y-3">
          {milestones.map((milestone) => (
            <a
              key={milestone.id}
              href={`https://letaiexplainai.com/timeline?milestone=${milestone.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`block rounded-lg border ${borderClass} ${cardBgClass} p-3 transition-all hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                {/* Date */}
                <div className={`shrink-0 text-xs ${mutedClass} w-16`}>
                  {formatDate(milestone.date)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(milestone.category)}`}>
                      {milestone.category.replace('_', ' ')}
                    </span>
                    {milestone.organization && (
                      <span className={`text-xs ${mutedClass}`}>{milestone.organization}</span>
                    )}
                  </div>
                  <h3 className={`font-medium mt-1 ${textClass} text-sm leading-tight`}>
                    {milestone.title}
                  </h3>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className={`mt-4 pt-3 border-t ${borderClass} text-center`}>
        <a
          href="https://letaiexplainai.com/timeline"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600"
        >
          <span>Powered by</span>
          <span className="font-semibold">Let AI Explain AI</span>
        </a>
      </div>
    </div>
  );
}

export default EmbedTimelinePage;
