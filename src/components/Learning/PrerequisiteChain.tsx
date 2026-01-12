import { useState } from 'react';
import { ChevronRight, CheckCircle2, Circle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { DifficultyBadge } from './DifficultyBadge';
import type { GlossaryEntry } from '../../types/glossary';

interface PrerequisiteChainProps {
  /** The chain of concepts from foundational to target */
  chain: GlossaryEntry[];
  /** The current/target term (shown at the end) */
  currentTerm: GlossaryEntry;
  /** IDs of concepts the user has seen */
  seenConceptIds?: string[];
  /** Callback when a concept in the chain is clicked */
  onSelectConcept: (id: string) => void;
  /** Whether to show expanded details by default */
  defaultExpanded?: boolean;
  /** Orientation of the chain */
  orientation?: 'horizontal' | 'vertical';
}

interface ChainNodeProps {
  term: GlossaryEntry;
  isSeen: boolean;
  isCurrent: boolean;
  isLast: boolean;
  onClick: () => void;
  showDetails: boolean;
  orientation: 'horizontal' | 'vertical';
}

function ChainNode({
  term,
  isSeen,
  isCurrent,
  isLast,
  onClick,
  showDetails,
  orientation,
}: ChainNodeProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={`flex ${isHorizontal ? 'flex-row items-center' : 'flex-col'}`}
    >
      {/* Node */}
      <button
        onClick={onClick}
        className={`
          group relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all
          ${isCurrent
            ? 'bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-500 dark:border-blue-400'
            : isSeen
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
              : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
          }
        `}
      >
        {/* Status icon */}
        <div className="flex-shrink-0">
          {isCurrent ? (
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
              <BookOpen className="w-3 h-3 text-white" />
            </div>
          ) : isSeen ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          )}
        </div>

        {/* Term name */}
        <div className="flex flex-col items-start min-w-0">
          <span
            className={`
              text-sm font-medium truncate max-w-[120px]
              ${isCurrent
                ? 'text-blue-700 dark:text-blue-300'
                : isSeen
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-gray-700 dark:text-gray-300'
              }
            `}
          >
            {term.term}
          </span>
          {showDetails && (
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
              {term.category}
            </span>
          )}
        </div>

        {/* Difficulty badge on hover */}
        {term.difficulty && (
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DifficultyBadge difficulty={term.difficulty} size="sm" />
          </div>
        )}
      </button>

      {/* Arrow connector */}
      {!isLast && (
        <div
          className={`
            flex items-center justify-center text-gray-300 dark:text-gray-600
            ${isHorizontal ? 'px-1' : 'py-1 rotate-90'}
          `}
        >
          <ChevronRight className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}

/**
 * Visual chain showing the learning path from foundational concepts to target
 * Displays: Concept A → Concept B → ... → Current Concept
 */
export function PrerequisiteChain({
  chain,
  currentTerm,
  seenConceptIds = [],
  onSelectConcept,
  defaultExpanded = false,
  orientation = 'horizontal',
}: PrerequisiteChainProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showDetails, setShowDetails] = useState(false);

  const seenSet = new Set(seenConceptIds);

  // Calculate progress
  const seenCount = chain.filter((t) => seenSet.has(t.id)).length;
  const totalCount = chain.length;
  const progressPercent = totalCount > 0 ? Math.round((seenCount / totalCount) * 100) : 100;

  // For collapsed view, show first, last prerequisite, and current
  const collapsedChain: GlossaryEntry[] = chain.length > 3
    ? [chain[0], chain[chain.length - 1]].filter((t): t is GlossaryEntry => t !== undefined)
    : chain;

  const displayChain: GlossaryEntry[] = isExpanded ? chain : collapsedChain;
  const hasMoreItems = chain.length > 3;

  if (chain.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Learning Path
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {seenCount}/{totalCount} complete
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
          {hasMoreItems && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Show all ({chain.length})
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Chain visualization */}
      <div
        className={`
          flex flex-wrap gap-1
          ${orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col'}
        `}
      >
        {displayChain.map((term, index) => (
          <ChainNode
            key={term.id}
            term={term}
            isSeen={seenSet.has(term.id)}
            isCurrent={false}
            isLast={index === displayChain.length - 1 && !hasMoreItems}
            onClick={() => onSelectConcept(term.id)}
            showDetails={showDetails}
            orientation={orientation}
          />
        ))}

        {/* Ellipsis for collapsed view */}
        {hasMoreItems && !isExpanded && (
          <>
            <div className="flex items-center px-2 text-gray-400 dark:text-gray-500">
              <span className="text-sm">...</span>
            </div>
            <div className="flex items-center text-gray-300 dark:text-gray-600">
              <ChevronRight className="w-5 h-5" />
            </div>
          </>
        )}

        {/* Arrow to current term */}
        {displayChain.length > 0 && (
          <div className="flex items-center text-gray-300 dark:text-gray-600">
            <ChevronRight className="w-5 h-5" />
          </div>
        )}

        {/* Current term (target) */}
        <ChainNode
          term={currentTerm}
          isSeen={seenSet.has(currentTerm.id)}
          isCurrent={true}
          isLast={true}
          onClick={() => onSelectConcept(currentTerm.id)}
          showDetails={showDetails}
          orientation={orientation}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-2">
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1">
          <Circle className="w-3 h-3 text-gray-400" />
          <span>Not seen</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center">
            <BookOpen className="w-2 h-2 text-white" />
          </div>
          <span>Current</span>
        </div>
      </div>
    </div>
  );
}

export default PrerequisiteChain;
