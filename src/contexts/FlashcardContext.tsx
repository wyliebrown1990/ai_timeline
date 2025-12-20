/**
 * Flashcard Context
 *
 * Provides app-wide access to flashcard state and operations.
 * Uses database API for persistence with cross-device sync.
 * Wrap the application root with FlashcardProvider to enable
 * flashcard functionality throughout the app.
 *
 * Sprint 38 - Updated to use database API
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useFlashcardApiStore, type UseFlashcardApiStoreReturn } from '../hooks/useFlashcardApiStore';
import type { UserFlashcard } from '../types/flashcard';

// =============================================================================
// Context Type with Computed Values
// =============================================================================

/**
 * Extended context type with computed values for UI convenience.
 * Note: Card and pack operations are now async (return Promises).
 */
export interface FlashcardContextType extends UseFlashcardApiStoreReturn {
  /** Total number of flashcards saved */
  totalCards: number;
  /** Number of cards due for review today */
  dueToday: number;
  /** Whether user has any saved flashcards */
  hasCards: boolean;
  /** Check if a specific source is already saved as a flashcard */
  isCardSaved: (sourceType: UserFlashcard['sourceType'], sourceId: string) => boolean;
}

// =============================================================================
// Context Creation
// =============================================================================

/**
 * Context for flashcard state - null when not within provider
 */
const FlashcardContext = createContext<FlashcardContextType | null>(null);

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Props for the provider component
 */
interface FlashcardProviderProps {
  children: ReactNode;
}

/**
 * Provider component that wraps the application to provide flashcard access.
 * Must be nested inside SessionProvider for API access.
 *
 * @example
 * ```tsx
 * // In your App or layout component
 * import { SessionProvider } from '@/contexts/SessionContext';
 * import { FlashcardProvider } from '@/contexts/FlashcardContext';
 *
 * function App() {
 *   return (
 *     <SessionProvider>
 *       <FlashcardProvider>
 *         <YourAppContent />
 *       </FlashcardProvider>
 *     </SessionProvider>
 *   );
 * }
 * ```
 */
export function FlashcardProvider({ children }: FlashcardProviderProps) {
  const store = useFlashcardApiStore();

  // Compute derived values for UI convenience
  const contextValue = useMemo<FlashcardContextType>(() => {
    return {
      ...store,
      // Computed values from stats
      totalCards: store.stats.totalCards,
      dueToday: store.stats.cardsDueToday,
      hasCards: store.cards.length > 0,
      // isCardSaved is already in store, but we include it explicitly for clarity
      isCardSaved: store.isCardSaved,
    };
  }, [store]);

  return (
    <FlashcardContext.Provider value={contextValue}>
      {children}
    </FlashcardContext.Provider>
  );
}

// =============================================================================
// Consumer Hook
// =============================================================================

/**
 * Hook to access flashcard context.
 *
 * @throws Error if used outside of FlashcardProvider
 *
 * @example
 * ```tsx
 * function AddToFlashcardsButton({ sourceType, sourceId }) {
 *   const { isCardSaved, addCard, removeCard, getCardBySource, isLoading } = useFlashcardContext();
 *
 *   const isSaved = isCardSaved(sourceType, sourceId);
 *
 *   const handleClick = async () => {
 *     if (isSaved) {
 *       const card = getCardBySource(sourceType, sourceId);
 *       if (card) await removeCard(card.id);
 *     } else {
 *       await addCard(sourceType, sourceId);
 *     }
 *   };
 *
 *   if (isLoading) return <LoadingSpinner />;
 *
 *   return (
 *     <button onClick={handleClick}>
 *       {isSaved ? 'Remove from Flashcards' : 'Add to Flashcards'}
 *     </button>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * function FlashcardStats() {
 *   const { totalCards, dueToday, hasCards, stats, isLoading } = useFlashcardContext();
 *
 *   if (isLoading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (!hasCards) {
 *     return <p>No flashcards yet. Start adding some!</p>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>{totalCards} cards total</p>
 *       <p>{dueToday} due today</p>
 *       <p>{stats.currentStreak} day streak</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFlashcardContext(): FlashcardContextType {
  const context = useContext(FlashcardContext);

  if (context === null) {
    throw new Error('useFlashcardContext must be used within a FlashcardProvider');
  }

  return context;
}

// =============================================================================
// Exports
// =============================================================================

export default FlashcardContext;
