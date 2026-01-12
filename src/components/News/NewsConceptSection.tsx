/**
 * NewsConceptSection Component (Sprint LEarn-2)
 *
 * Displays concepts mentioned in a news article, grouped by
 * "Key Topics" vs "Also Mentioned".
 * Integrates with FlashcardContext for one-click add to flashcards.
 */

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ConceptChip } from '../Learning/ConceptChip';
import { currentEventsApi, type LinkedConcept } from '../../services/api';
import { useFlashcardContext } from '../../contexts/FlashcardContext';

interface NewsConceptSectionProps {
  eventId: string;
}

export function NewsConceptSection({ eventId }: NewsConceptSectionProps) {
  const [concepts, setConcepts] = useState<LinkedConcept[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingConceptId, setAddingConceptId] = useState<string | null>(null);

  // Access flashcard context for saving concepts
  const { addCard, isCardSaved } = useFlashcardContext();

  useEffect(() => {
    async function fetchConcepts() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await currentEventsApi.getEventConcepts(eventId);
        setConcepts(response.data);
      } catch (err) {
        console.error('[NewsConceptSection] Failed to fetch concepts:', err);
        setError('Failed to load concepts');
      } finally {
        setIsLoading(false);
      }
    }

    fetchConcepts();
  }, [eventId]);

  /**
   * Handle adding a concept to flashcards.
   * Uses the 'concept' sourceType with the glossary term ID.
   */
  const handleAddToFlashcards = useCallback(
    async (concept: LinkedConcept) => {
      // Check if already saved
      if (isCardSaved('concept', concept.id)) {
        toast.success(`"${concept.term}" is already in your flashcards!`);
        return;
      }

      setAddingConceptId(concept.id);

      try {
        await addCard('concept', concept.id);
        toast.success(`Added "${concept.term}" to your flashcards!`, {
          icon: '📚',
          duration: 3000,
        });
      } catch (err) {
        console.error('[NewsConceptSection] Failed to add flashcard:', err);
        toast.error('Failed to add to flashcards. Please try again.');
      } finally {
        setAddingConceptId(null);
      }
    },
    [addCard, isCardSaved]
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading concepts...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 dark:text-red-400 py-2">{error}</div>
    );
  }

  if (concepts.length === 0) {
    return (
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm py-4">
        <BookOpen className="h-4 w-4" />
        No technical concepts detected in this article.
      </div>
    );
  }

  const keyTopics = concepts.filter((c) => c.isKeyTopic);
  const mentioned = concepts.filter((c) => !c.isKeyTopic);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-medium text-gray-900 dark:text-white">
          Concepts in this Article
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          ({concepts.length})
        </span>
      </div>

      {/* Key Topics */}
      {keyTopics.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Key Topics
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {keyTopics.map((concept) => (
              <ConceptChip
                key={concept.id}
                concept={concept}
                isKeyTopic
                onAddToFlashcards={handleAddToFlashcards}
                isSavedToFlashcards={isCardSaved('concept', concept.id)}
                isAddingToFlashcards={addingConceptId === concept.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Also Mentioned */}
      {mentioned.length > 0 && (
        <div>
          {keyTopics.length > 0 && (
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
              Also Mentioned
            </span>
          )}
          <div className="flex flex-wrap gap-2">
            {mentioned.map((concept) => (
              <ConceptChip
                key={concept.id}
                concept={concept}
                onAddToFlashcards={handleAddToFlashcards}
                isSavedToFlashcards={isCardSaved('concept', concept.id)}
                isAddingToFlashcards={addingConceptId === concept.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NewsConceptSection;
