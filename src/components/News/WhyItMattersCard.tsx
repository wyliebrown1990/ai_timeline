/**
 * WhyItMattersCard Component (Sprint LEarn-2)
 *
 * Displays historical context for a news event, including
 * related milestones and AI-generated "Why this matters" explanation.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, ArrowRight, Loader2, Lightbulb, Clock } from 'lucide-react';
import { currentEventsApi, type RelatedMilestone } from '../../services/api';

interface WhyItMattersCardProps {
  eventId: string;
}

export function WhyItMattersCard({ eventId }: WhyItMattersCardProps) {
  const navigate = useNavigate();
  const [whyItMatters, setWhyItMatters] = useState<string | null>(null);
  const [relatedMilestones, setRelatedMilestones] = useState<RelatedMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContext() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await currentEventsApi.getEventContext(eventId);
        setWhyItMatters(response.data.whyItMatters);
        setRelatedMilestones(response.data.relatedMilestones);
      } catch (err) {
        console.error('[WhyItMattersCard] Failed to fetch context:', err);
        setError('Failed to load context');
      } finally {
        setIsLoading(false);
      }
    }

    fetchContext();
  }, [eventId]);

  const handleMilestoneClick = (milestoneId: string) => {
    navigate(`/?milestone=${milestoneId}`);
  };

  const handleExploreHistory = () => {
    // Navigate to timeline with filter for related milestones
    if (relatedMilestones.length > 0) {
      navigate(`/`);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading context...</span>
        </div>
      </div>
    );
  }

  if (error || (!whyItMatters && relatedMilestones.length === 0)) {
    return null; // Don't show card if no context available
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-amber-200 dark:border-amber-800 flex items-center gap-3">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
          <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Why This Matters
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Historical context for this news
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4 space-y-4">
        {/* Why it matters text */}
        {whyItMatters && (
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {whyItMatters}
          </p>
        )}

        {/* Related milestones */}
        {relatedMilestones.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Related Milestones
              </span>
            </div>

            {/* Mini timeline */}
            <div className="relative pl-4 border-l-2 border-amber-300 dark:border-amber-700 space-y-3">
              {relatedMilestones.slice(0, 3).map((milestone) => (
                <button
                  key={milestone.id}
                  onClick={() => handleMilestoneClick(milestone.id)}
                  className="block text-left w-full group"
                >
                  <div className="flex items-start gap-3">
                    {/* Timeline dot */}
                    <div className="absolute left-0 -translate-x-1/2 w-3 h-3 rounded-full bg-amber-400 dark:bg-amber-500 border-2 border-white dark:border-gray-800 group-hover:scale-125 transition-transform" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 mb-0.5">
                        <Clock className="h-3 w-3" />
                        {formatDate(milestone.date)}
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 font-medium group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors line-clamp-2">
                        {milestone.title}
                      </p>
                    </div>

                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>

            {/* Explore history button */}
            {relatedMilestones.length > 0 && (
              <button
                onClick={handleExploreHistory}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
              >
                <History className="h-4 w-4" />
                Explore the History
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default WhyItMattersCard;
