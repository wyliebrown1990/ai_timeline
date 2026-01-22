/**
 * FeedContextSection Component
 *
 * Displays historical context for a feed card including:
 * - "The Context You Need" section with related milestones
 * - Compact mini-timeline for quick scanning
 * - Lazy-loaded to avoid initial render cost
 */

import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  ChevronDown,
  ChevronUp,
  Clock,
  ArrowRight,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { currentEventsApi, type RelatedMilestone } from '../../services/api';
import { cn } from '../../lib/utils';
import { newsInteractionApi } from '../../services/feedApi';

interface FeedContextSectionProps {
  eventId: string;
  isActive: boolean;
  sessionId?: string;
}

function FeedContextSectionComponent({
  eventId,
  isActive: _isActive,
  sessionId,
}: FeedContextSectionProps) {
  // Note: isActive can be used for future optimizations (e.g., pause loading when not visible)
  void _isActive;
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [whyItMatters, setWhyItMatters] = useState<string | null>(null);
  const [relatedMilestones, setRelatedMilestones] = useState<RelatedMilestone[]>([]);
  const [hasFetched, setHasFetched] = useState(false);

  // Lazy fetch context data only when expanded
  useEffect(() => {
    if (isExpanded && !hasFetched) {
      async function fetchContext() {
        setIsLoading(true);
        console.log('[FeedContextSection] Fetching context for:', eventId);
        try {
          const response = await currentEventsApi.getEventContext(eventId);
          console.log('[FeedContextSection] Response:', response);
          setWhyItMatters(response.data.whyItMatters);
          setRelatedMilestones(response.data.relatedMilestones || []);

          // Track engagement
          if (sessionId) {
            newsInteractionApi.recordEngagement(eventId, sessionId, 'read_context');
          }
        } catch (err) {
          console.error('[FeedContextSection] Failed to fetch context:', err);
        } finally {
          setIsLoading(false);
          setHasFetched(true);
        }
      }

      fetchContext();
    }
  }, [isExpanded, hasFetched, eventId, sessionId]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleMilestoneClick = (milestoneId: string) => {
    navigate(`/?milestone=${milestoneId}`);
  };

  const handleStartContextPath = () => {
    // Navigate to timeline with first milestone
    const firstMilestone = relatedMilestones[0];
    if (firstMilestone) {
      navigate(`/timeline?milestone=${firstMilestone.id}&context=${eventId}`);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const estimatedMinutes = relatedMilestones.length * 3;

  return (
    <div
      className={cn(
        'bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4',
        'transition-all duration-200'
      )}
    >
      {/* Header / Toggle Button */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-blue-400">
            The context you need
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-blue-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-blue-400" />
        )}
      </button>

      {/* Collapsed Preview */}
      {!isExpanded && (
        <p className="px-3 pb-3 text-sm text-gray-400 line-clamp-1">
          Understand the history behind this news
        </p>
      )}

      {/* Expanded Content */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-3 pb-3 space-y-4">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center gap-2 text-blue-400 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading historical context...</span>
            </div>
          )}

          {/* Why It Matters (from context API) */}
          {!isLoading && whyItMatters && (
            <div className="text-sm text-gray-300 leading-relaxed">
              {whyItMatters}
            </div>
          )}

          {/* Related Milestones */}
          {!isLoading && relatedMilestones.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Key Milestones
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  ~{estimatedMinutes} min read
                </span>
              </div>

              {/* Mini Timeline */}
              <div className="relative pl-4 border-l-2 border-blue-500/30 space-y-2">
                {relatedMilestones.slice(0, 4).map((milestone) => (
                  <button
                    key={milestone.id}
                    onClick={() => handleMilestoneClick(milestone.id)}
                    className="block text-left w-full group relative"
                  >
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        'absolute left-0 -translate-x-[calc(50%+8px)] w-2.5 h-2.5 rounded-full',
                        'bg-blue-400 border-2 border-gray-950',
                        'group-hover:scale-125 transition-transform'
                      )}
                    />

                    <div className="flex items-start gap-2 py-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-blue-400/70 mb-0.5">
                          <span>{formatDate(milestone.date)}</span>
                          <span className="px-1.5 py-0.5 bg-blue-500/20 rounded text-[10px] uppercase">
                            {milestone.category.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-200 font-medium group-hover:text-blue-300 transition-colors line-clamp-2">
                          {milestone.title}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Start Context Path Button */}
              {relatedMilestones.length > 0 && (
                <button
                  onClick={handleStartContextPath}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-blue-300 bg-blue-500/20 rounded-lg hover:bg-blue-500/30 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  Start Context Path
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && hasFetched && relatedMilestones.length === 0 && !whyItMatters && (
            <p className="text-sm text-gray-500 py-2">
              No historical context available for this event.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export const FeedContextSection = memo(FeedContextSectionComponent);

export default FeedContextSection;
