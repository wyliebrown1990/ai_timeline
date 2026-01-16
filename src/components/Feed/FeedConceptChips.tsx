/**
 * FeedConceptChips Component (Sprint Feed-4)
 *
 * Shows related concepts as scrollable chips on feed cards.
 * Tapping a chip shows a popover with definition and "Add to flashcards" option.
 */

import { useEffect, useState, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Plus, Sparkles } from 'lucide-react';

const API_URL = import.meta.env.VITE_DYNAMIC_API_URL || '/api';

interface Concept {
  id: string;
  term: string;
  shortDefinition: string | null;
  isKeyTopic: boolean;
}

interface FeedConceptChipsProps {
  eventId: string;
  isActive: boolean;
}

function FeedConceptChipsComponent({
  eventId,
  isActive,
}: FeedConceptChipsProps) {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch concepts when card becomes active
  useEffect(() => {
    if (!isActive) return;

    const fetchConcepts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${API_URL}/current-events/${eventId}/concepts`
        );
        if (response.ok) {
          const data = await response.json();
          // Sort: key topics first, then by term alphabetically
          const sorted = (data.data || []).sort((a: Concept, b: Concept) => {
            if (a.isKeyTopic && !b.isKeyTopic) return -1;
            if (!a.isKeyTopic && b.isKeyTopic) return 1;
            return a.term.localeCompare(b.term);
          });
          setConcepts(sorted);
        }
      } catch (error) {
        console.error('Failed to fetch concepts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConcepts();
  }, [eventId, isActive]);

  const handleChipClick = (concept: Concept, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();

    if (containerRect) {
      setPopoverPosition({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top,
      });
    }
    setSelectedConcept(concept);
  };

  const handleClosePopover = () => {
    setSelectedConcept(null);
  };

  const handleAddToFlashcards = async (conceptId: string) => {
    // TODO: Integrate with flashcard system when available
    console.log('Add to flashcards:', conceptId);
    handleClosePopover();
  };

  const handleLearnMore = (conceptId: string) => {
    window.open(`/glossary#${conceptId}`, '_blank');
    handleClosePopover();
  };

  // Don't render if no concepts
  if (isLoading || concepts.length === 0) {
    return null;
  }

  // Limit visible chips
  const visibleConcepts = concepts.slice(0, 5);
  const remainingCount = concepts.length - 5;

  return (
    <div ref={containerRef} className="relative mb-4">
      {/* Chips Container */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {visibleConcepts.map((concept) => (
          <button
            key={concept.id}
            onClick={(e) => handleChipClick(concept, e)}
            className={`
              flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium
              transition-all duration-150
              ${
                concept.isKeyTopic
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                  : 'bg-gray-800/60 text-gray-300 border border-gray-700/50 hover:bg-gray-700/60'
              }
            `}
          >
            {concept.isKeyTopic && (
              <Sparkles className="w-3 h-3 inline mr-1.5 -mt-0.5" />
            )}
            {concept.term}
          </button>
        ))}

        {remainingCount > 0 && (
          <span className="flex-shrink-0 px-3 py-1.5 text-sm text-gray-500">
            +{remainingCount} more
          </span>
        )}
      </div>

      {/* Popover */}
      <AnimatePresence>
        {selectedConcept && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={handleClosePopover}
            />

            {/* Popover Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              style={{
                position: 'absolute',
                left: Math.max(16, Math.min(popoverPosition.x - 140, 280)),
                bottom: '100%',
                marginBottom: 8,
              }}
              className="z-50 w-[280px] bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-gray-800">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  {selectedConcept.isKeyTopic && (
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  )}
                  {selectedConcept.term}
                </h4>
                <button
                  onClick={handleClosePopover}
                  className="p-1 rounded-full hover:bg-gray-800 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Definition */}
              <div className="p-3">
                <p className="text-sm text-gray-300 leading-relaxed">
                  {selectedConcept.shortDefinition ||
                    'No definition available yet.'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 p-3 pt-0">
                <button
                  onClick={() => handleAddToFlashcards(selectedConcept.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-600/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Flashcards
                </button>
                <button
                  onClick={() => handleLearnMore(selectedConcept.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-600/30 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  Learn more
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export const FeedConceptChips = memo(FeedConceptChipsComponent);

export default FeedConceptChips;
