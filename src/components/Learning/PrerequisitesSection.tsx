import { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { PrerequisiteChip } from './PrerequisiteChip';
import { PrerequisiteChain } from './PrerequisiteChain';
import { DifficultyBadge } from './DifficultyBadge';
import { QuickCatchUp } from './QuickCatchUp';
import type { GlossaryEntry } from '../../types/glossary';

interface PrerequisiteNode {
  id: string;
  term: string;
  shortDefinition: string;
  difficulty: number;
  conceptType: string;
  depth: number;
}

interface PrerequisitesSectionProps {
  /** The term being displayed */
  term: GlossaryEntry;
  /** All glossary terms for lookup */
  allTerms: GlossaryEntry[];
  /** IDs of terms the user has learned/viewed */
  learnedTermIds?: string[];
  /** Callback when a prerequisite term is clicked */
  onSelectTerm: (id: string) => void;
  /** Callback when a concept is marked as seen */
  onMarkSeen?: (termId: string) => void;
  /** Whether to show the full chain or just direct prerequisites */
  showFullChain?: boolean;
  /** API base URL for fetching prerequisite chain */
  apiBaseUrl?: string;
}

/**
 * Section component displaying "What should I know first?" prerequisites
 * Shows direct prerequisites with option to expand full learning path
 */
export function PrerequisitesSection({
  term,
  allTerms,
  learnedTermIds = [],
  onSelectTerm,
  onMarkSeen,
  showFullChain = false,
  apiBaseUrl = '/api',
}: PrerequisitesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [prerequisiteChain, setPrerequisiteChain] = useState<PrerequisiteNode[]>([]);
  const [isLoadingChain, setIsLoadingChain] = useState(false);
  const [isQuickCatchUpOpen, setIsQuickCatchUpOpen] = useState(false);

  // Get direct prerequisites from term data
  const directPrerequisites = allTerms.filter((t) =>
    term.prerequisiteIds?.includes(t.id)
  );

  // Check if all prerequisites are completed
  const learnedSet = new Set(learnedTermIds);
  const allPrereqsCompleted = directPrerequisites.every((p) => learnedSet.has(p.id));
  const completedCount = directPrerequisites.filter((p) => learnedSet.has(p.id)).length;

  // Load full prerequisite chain when expanded
  useEffect(() => {
    if (isExpanded && showFullChain && prerequisiteChain.length === 0) {
      setIsLoadingChain(true);
      fetch(`${apiBaseUrl}/glossary/${term.id}/prerequisites/chain`)
        .then((res) => res.json())
        .then((data) => {
          setPrerequisiteChain(data.data || []);
          setIsLoadingChain(false);
        })
        .catch(() => {
          setIsLoadingChain(false);
        });
    }
  }, [isExpanded, showFullChain, term.id, apiBaseUrl, prerequisiteChain.length]);

  // Don't render if no prerequisites
  if (directPrerequisites.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <BookOpen className="h-5 w-5 text-amber-500" />
          <span className="font-medium">What should I know first?</span>
        </div>

        {/* Progress indicator and catch-up button */}
        <div className="flex items-center gap-3">
          {allPrereqsCompleted ? (
            <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Ready to learn
            </span>
          ) : (
            <>
              <span className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                {completedCount}/{directPrerequisites.length} prerequisites
              </span>
              {onMarkSeen && (
                <button
                  onClick={() => setIsQuickCatchUpOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                  data-testid="catch-me-up-button"
                >
                  <Zap className="h-3 w-3" />
                  Catch me up
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Difficulty badge */}
      <div className="flex items-center gap-2 mb-3 pl-7">
        <span className="text-sm text-gray-500 dark:text-gray-400">Difficulty:</span>
        <DifficultyBadge difficulty={term.difficulty} size="sm" />
      </div>

      {/* Prerequisites list */}
      <div className="space-y-2 pl-7">
        {directPrerequisites.map((prereq) => (
          <PrerequisiteChip
            key={prereq.id}
            term={prereq}
            onClick={onSelectTerm}
            isCompleted={learnedSet.has(prereq.id)}
            showDefinition
          />
        ))}
      </div>

      {/* Expand/collapse for full chain */}
      {showFullChain && directPrerequisites.length > 0 && (
        <div className="mt-3 pl-7">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide full learning path
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show full learning path
              </>
            )}
          </button>

          {/* Full chain display using PrerequisiteChain component */}
          {isExpanded && (
            <div className="mt-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              {isLoadingChain ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Loading learning path...
                </div>
              ) : prerequisiteChain.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  No additional prerequisites in the chain.
                </div>
              ) : (
                <PrerequisiteChain
                  chain={prerequisiteChain
                    .map((node) => allTerms.find((t) => t.id === node.id))
                    .filter((t): t is GlossaryEntry => t !== undefined)}
                  currentTerm={term}
                  seenConceptIds={learnedTermIds}
                  onSelectConcept={onSelectTerm}
                  defaultExpanded={true}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Catch-Up Modal */}
      {onMarkSeen && (
        <QuickCatchUp
          isOpen={isQuickCatchUpOpen}
          prerequisites={directPrerequisites}
          onClose={() => setIsQuickCatchUpOpen(false)}
          onMarkSeen={onMarkSeen}
          onLearnMore={(id) => {
            setIsQuickCatchUpOpen(false);
            onSelectTerm(id);
          }}
          seenConceptIds={learnedTermIds}
          targetTerm={term}
        />
      )}
    </div>
  );
}

export default PrerequisitesSection;
