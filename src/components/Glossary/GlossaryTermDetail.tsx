import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  BookOpen,
  Briefcase,
  MessageSquare,
  Lightbulb,
  Link2,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { useGlossary } from '../../hooks';
import { GLOSSARY_CATEGORY_LABELS } from '../../types/glossary';
import type { GlossaryEntry } from '../../types/glossary';

interface GlossaryTermDetailProps {
  /** The term to display */
  term: GlossaryEntry;
  /** Callback when panel is closed */
  onClose: () => void;
  /** Callback when a related term is selected */
  onSelectTerm: (id: string) => void;
}

/**
 * Slide-in panel component displaying full glossary term details
 * Includes cross-linking to related terms and milestones
 */
export function GlossaryTermDetail({
  term,
  onClose,
  onSelectTerm,
}: GlossaryTermDetailProps) {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { data: allTerms } = useGlossary();

  // Get related terms
  const relatedTerms = allTerms.filter((t) => term.relatedTermIds.includes(t.id));

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  // Set up keyboard listener and focus management
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    // Prevent body scroll while panel is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Navigate to milestone
  const handleMilestoneClick = (milestoneId: string) => {
    onClose();
    navigate(`/timeline?milestone=${milestoneId}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="glossary-term-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        data-testid="glossary-term-detail"
        className="relative w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Glossary
            </span>
          </div>

          <button
            ref={closeButtonRef}
            onClick={onClose}
            data-testid="glossary-detail-close-btn"
            className="rounded-full p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            aria-label="Close detail view"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Category badge */}
          <div className="mb-4">
            <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/50 px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-300">
              {GLOSSARY_CATEGORY_LABELS[term.category]}
            </span>
          </div>

          {/* Term title */}
          <h2
            id="glossary-term-title"
            data-testid="glossary-term-title"
            className="text-2xl font-bold text-gray-900 dark:text-white mb-4"
          >
            {term.term}
          </h2>

          {/* Short definition - highlighted */}
          <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-blue-800 dark:text-blue-200 font-medium">
              {term.shortDefinition}
            </p>
          </div>

          {/* Full definition */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 text-gray-600 dark:text-gray-400">
              <BookOpen className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <span className="font-medium">Full Definition</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed pl-7">
              {term.fullDefinition}
            </p>
          </div>

          {/* Business context */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 text-gray-600 dark:text-gray-400">
              <Briefcase className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <span className="font-medium">Business Context</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed pl-7">
              {term.businessContext}
            </p>
          </div>

          {/* In meeting example */}
          {term.inMeetingExample && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2 text-gray-600 dark:text-gray-400">
                <MessageSquare className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                <span className="font-medium">In a Meeting</span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed pl-7 italic">
                "{term.inMeetingExample}"
              </p>
            </div>
          )}

          {/* Real-world example */}
          {term.example && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2 text-gray-600 dark:text-gray-400">
                <Lightbulb className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                <span className="font-medium">Example</span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed pl-7">
                {term.example}
              </p>
            </div>
          )}

          {/* Related terms */}
          {relatedTerms.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 text-gray-600 dark:text-gray-400">
                <Link2 className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                <span className="font-medium">Related Terms</span>
              </div>
              <div className="flex flex-wrap gap-2 pl-7">
                {relatedTerms.map((relatedTerm) => (
                  <button
                    key={relatedTerm.id}
                    onClick={() => onSelectTerm(relatedTerm.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    {relatedTerm.term}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Related milestones */}
          {term.relatedMilestoneIds.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 text-gray-600 dark:text-gray-400">
                <Clock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                <span className="font-medium">Related Timeline Events</span>
              </div>
              <div className="space-y-2 pl-7">
                {term.relatedMilestoneIds.map((milestoneId) => (
                  <button
                    key={milestoneId}
                    onClick={() => handleMilestoneClick(milestoneId)}
                    className="flex items-center gap-2 w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-left"
                  >
                    <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {milestoneId.replace(/_/g, ' ').replace(/^E\d{4}\s/, '')}
                    </span>
                    <ArrowRight className="h-4 w-4 ml-auto text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GlossaryTermDetail;
