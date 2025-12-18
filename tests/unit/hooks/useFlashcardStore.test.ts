import { renderHook, act } from '@testing-library/react';
import { useFlashcardStore } from '../../../src/hooks/useFlashcardStore';
import { FLASHCARD_STORAGE_KEYS } from '../../../src/types/flashcard';
import { flushPendingWrites, resetStorageCheck } from '../../../src/lib/storage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock crypto.randomUUID
const mockUUIDs: string[] = [];
const uuidState = { index: 0 };

function resetMockUUIDs(uuids: string[]) {
  mockUUIDs.length = 0;
  mockUUIDs.push(...uuids);
  uuidState.index = 0;
}

Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => {
      const uuid = mockUUIDs[uuidState.index] || `mock-uuid-${uuidState.index}`;
      uuidState.index++;
      return uuid;
    },
  },
});

describe('useFlashcardStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    resetStorageCheck(); // Reset storage availability check between tests
    // Provide enough UUIDs for multiple operations
    resetMockUUIDs([
      'pack-all-cards-uuid',
      'pack-recently-added-uuid',
      'card-1-uuid',
      'card-2-uuid',
      'card-3-uuid',
      'card-4-uuid',
      'card-5-uuid',
      'custom-pack-uuid-1',
      'custom-pack-uuid-2',
      'custom-pack-uuid-3',
    ]);
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe('initial state', () => {
    it('should start with empty cards array', () => {
      const { result } = renderHook(() => useFlashcardStore());
      expect(result.current.cards).toEqual([]);
    });

    it('should initialize with default packs (All Cards, Recently Added)', () => {
      const { result } = renderHook(() => useFlashcardStore());

      expect(result.current.packs).toHaveLength(2);
      expect(result.current.packs[0].name).toBe('All Cards');
      expect(result.current.packs[0].isDefault).toBe(true);
      expect(result.current.packs[1].name).toBe('Recently Added');
      expect(result.current.packs[1].isDefault).toBe(true);
    });

    it('should start with initial stats', () => {
      const { result } = renderHook(() => useFlashcardStore());

      expect(result.current.stats.totalCards).toBe(0);
      expect(result.current.stats.cardsDueToday).toBe(0);
      expect(result.current.stats.currentStreak).toBe(0);
    });
  });

  // ==========================================================================
  // addCard Tests
  // ==========================================================================

  describe('addCard', () => {
    it('should add a milestone card', () => {
      const { result } = renderHook(() => useFlashcardStore());

      let newCard: ReturnType<typeof result.current.addCard>;
      act(() => {
        newCard = result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      expect(newCard).not.toBeNull();
      expect(result.current.cards).toHaveLength(1);
      expect(result.current.cards[0].sourceType).toBe('milestone');
      expect(result.current.cards[0].sourceId).toBe('E2017_TRANSFORMER');
    });

    it('should add a concept card', () => {
      const { result } = renderHook(() => useFlashcardStore());

      act(() => {
        result.current.addCard('concept', 'C_SELF_ATTENTION');
      });

      expect(result.current.cards).toHaveLength(1);
      expect(result.current.cards[0].sourceType).toBe('concept');
      expect(result.current.cards[0].sourceId).toBe('C_SELF_ATTENTION');
    });

    it('should automatically add card to default packs', () => {
      const { result } = renderHook(() => useFlashcardStore());

      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      const card = result.current.cards[0];
      const allCardsPack = result.current.packs.find((p) => p.name === 'All Cards');
      const recentlyAddedPack = result.current.packs.find((p) => p.name === 'Recently Added');

      expect(card.packIds).toContain(allCardsPack?.id);
      expect(card.packIds).toContain(recentlyAddedPack?.id);
    });

    it('should return null for duplicate card (same source)', () => {
      const { result } = renderHook(() => useFlashcardStore());

      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      let duplicate: ReturnType<typeof result.current.addCard>;
      act(() => {
        duplicate = result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      expect(duplicate).toBeNull();
      expect(result.current.cards).toHaveLength(1);
    });

    it('should initialize card with default SM-2 values', () => {
      const { result } = renderHook(() => useFlashcardStore());

      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      const card = result.current.cards[0];
      expect(card.easeFactor).toBe(2.5);
      expect(card.interval).toBe(0);
      expect(card.repetitions).toBe(0);
    });

    it('should update stats after adding card', () => {
      const { result } = renderHook(() => useFlashcardStore());

      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      expect(result.current.stats.totalCards).toBe(1);
      expect(result.current.stats.cardsDueToday).toBe(1); // New cards are due immediately
    });

    it('should persist to localStorage', () => {
      const { result } = renderHook(() => useFlashcardStore());

      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      // Flush debounced writes before checking localStorage
      flushPendingWrites();

      const stored = JSON.parse(localStorageMock.getItem(FLASHCARD_STORAGE_KEYS.CARDS) || '{}');
      expect(stored.cards).toHaveLength(1);
      expect(stored.cards[0].sourceId).toBe('E2017_TRANSFORMER');
    });
  });

  // ==========================================================================
  // removeCard Tests
  // ==========================================================================

  describe('removeCard', () => {
    it('should remove a card by id', () => {
      const { result } = renderHook(() => useFlashcardStore());

      let card: ReturnType<typeof result.current.addCard>;
      act(() => {
        card = result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      expect(result.current.cards).toHaveLength(1);

      act(() => {
        result.current.removeCard(card!.id);
      });

      expect(result.current.cards).toHaveLength(0);
    });

    it('should update stats after removing card', () => {
      const { result } = renderHook(() => useFlashcardStore());

      let card: ReturnType<typeof result.current.addCard>;
      act(() => {
        card = result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      expect(result.current.stats.totalCards).toBe(1);

      act(() => {
        result.current.removeCard(card!.id);
      });

      expect(result.current.stats.totalCards).toBe(0);
    });

    it('should not crash when removing non-existent card', () => {
      const { result } = renderHook(() => useFlashcardStore());

      expect(() => {
        act(() => {
          result.current.removeCard('non-existent-id');
        });
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // getCardBySource Tests
  // ==========================================================================

  describe('getCardBySource', () => {
    it('should find card by source type and id', () => {
      const { result } = renderHook(() => useFlashcardStore());

      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      const found = result.current.getCardBySource('milestone', 'E2017_TRANSFORMER');
      expect(found).toBeDefined();
      expect(found?.sourceId).toBe('E2017_TRANSFORMER');
    });

    it('should return undefined for non-existent source', () => {
      const { result } = renderHook(() => useFlashcardStore());

      const found = result.current.getCardBySource('milestone', 'NON_EXISTENT');
      expect(found).toBeUndefined();
    });

    it('should distinguish between source types', () => {
      const { result } = renderHook(() => useFlashcardStore());

      act(() => {
        result.current.addCard('milestone', 'TEST_ID');
      });

      const milestoneCard = result.current.getCardBySource('milestone', 'TEST_ID');
      const conceptCard = result.current.getCardBySource('concept', 'TEST_ID');

      expect(milestoneCard).toBeDefined();
      expect(conceptCard).toBeUndefined();
    });
  });

  // ==========================================================================
  // isCardSaved Tests
  // ==========================================================================

  describe('isCardSaved', () => {
    it('should return true for saved cards', () => {
      const { result } = renderHook(() => useFlashcardStore());

      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      expect(result.current.isCardSaved('milestone', 'E2017_TRANSFORMER')).toBe(true);
    });

    it('should return false for unsaved cards', () => {
      const { result } = renderHook(() => useFlashcardStore());

      expect(result.current.isCardSaved('milestone', 'E2017_TRANSFORMER')).toBe(false);
    });
  });

  // ==========================================================================
  // getDueCards Tests
  // ==========================================================================

  describe('getDueCards', () => {
    it('should return all due cards when no packId specified', () => {
      const { result } = renderHook(() => useFlashcardStore());

      // Add cards in separate act() blocks to ensure state updates
      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      act(() => {
        result.current.addCard('milestone', 'E2020_GPT3');
      });

      const dueCards = result.current.getDueCards();
      expect(dueCards).toHaveLength(2); // New cards are due immediately
    });

    it('should filter by pack when packId is specified', () => {
      const { result } = renderHook(() => useFlashcardStore());

      // Add cards
      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      // Create custom pack
      let customPack: ReturnType<typeof result.current.createPack>;
      act(() => {
        customPack = result.current.createPack('My Pack');
      });

      // Move card to custom pack
      act(() => {
        result.current.moveCardToPack(result.current.cards[0].id, customPack.id);
      });

      const dueInPack = result.current.getDueCards(customPack.id);
      expect(dueInPack).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Pack Operations Tests
  // ==========================================================================

  describe('createPack', () => {
    it('should create a new pack', () => {
      const { result } = renderHook(() => useFlashcardStore());

      let newPack: ReturnType<typeof result.current.createPack>;
      act(() => {
        newPack = result.current.createPack('My Custom Pack', 'A description');
      });

      expect(newPack.name).toBe('My Custom Pack');
      expect(newPack.description).toBe('A description');
      expect(newPack.isDefault).toBe(false);
      expect(result.current.packs).toHaveLength(3); // 2 default + 1 custom
    });

    it('should assign a color to new pack', () => {
      const { result } = renderHook(() => useFlashcardStore());

      let newPack: ReturnType<typeof result.current.createPack>;
      act(() => {
        newPack = result.current.createPack('My Pack');
      });

      expect(newPack.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should allow custom color', () => {
      const { result } = renderHook(() => useFlashcardStore());

      let newPack: ReturnType<typeof result.current.createPack>;
      act(() => {
        newPack = result.current.createPack('My Pack', undefined, '#FF0000');
      });

      expect(newPack.color).toBe('#FF0000');
    });
  });

  describe('deletePack', () => {
    it('should delete a custom pack', () => {
      const { result } = renderHook(() => useFlashcardStore());

      let customPack: ReturnType<typeof result.current.createPack>;
      act(() => {
        customPack = result.current.createPack('My Pack');
      });

      expect(result.current.packs).toHaveLength(3);

      act(() => {
        result.current.deletePack(customPack.id);
      });

      expect(result.current.packs).toHaveLength(2);
    });

    it('should not delete default packs', () => {
      const { result } = renderHook(() => useFlashcardStore());

      const defaultPack = result.current.packs[0];
      expect(defaultPack.isDefault).toBe(true);

      act(() => {
        result.current.deletePack(defaultPack.id);
      });

      expect(result.current.packs).toHaveLength(2); // Still has both default packs
    });

    it('should remove pack from all cards when deleted', () => {
      const { result } = renderHook(() => useFlashcardStore());

      // Create pack and add card to it
      let customPack: ReturnType<typeof result.current.createPack>;
      act(() => {
        customPack = result.current.createPack('My Pack');
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      act(() => {
        result.current.moveCardToPack(result.current.cards[0].id, customPack.id);
      });

      expect(result.current.cards[0].packIds).toContain(customPack.id);

      act(() => {
        result.current.deletePack(customPack.id);
      });

      expect(result.current.cards[0].packIds).not.toContain(customPack.id);
    });
  });

  describe('renamePack', () => {
    it('should rename a custom pack', () => {
      const { result } = renderHook(() => useFlashcardStore());

      let customPack: ReturnType<typeof result.current.createPack>;
      act(() => {
        customPack = result.current.createPack('Old Name');
      });

      act(() => {
        result.current.renamePack(customPack.id, 'New Name');
      });

      const renamedPack = result.current.packs.find((p) => p.id === customPack.id);
      expect(renamedPack?.name).toBe('New Name');
    });

    it('should not rename default packs', () => {
      const { result } = renderHook(() => useFlashcardStore());

      const defaultPack = result.current.packs[0];

      act(() => {
        result.current.renamePack(defaultPack.id, 'Renamed');
      });

      expect(result.current.packs[0].name).toBe('All Cards'); // Unchanged
    });
  });

  describe('moveCardToPack', () => {
    it('should add pack to card packIds', () => {
      const { result } = renderHook(() => useFlashcardStore());

      let customPack: ReturnType<typeof result.current.createPack>;
      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
        customPack = result.current.createPack('My Pack');
      });

      act(() => {
        result.current.moveCardToPack(result.current.cards[0].id, customPack.id);
      });

      expect(result.current.cards[0].packIds).toContain(customPack.id);
    });

    it('should not duplicate if already in pack', () => {
      const { result } = renderHook(() => useFlashcardStore());

      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      const allCardsPack = result.current.packs.find((p) => p.name === 'All Cards');
      const initialPackCount = result.current.cards[0].packIds.length;

      act(() => {
        result.current.moveCardToPack(result.current.cards[0].id, allCardsPack!.id);
      });

      expect(result.current.cards[0].packIds.length).toBe(initialPackCount);
    });
  });

  describe('removeCardFromPack', () => {
    it('should remove card from custom pack', () => {
      const { result } = renderHook(() => useFlashcardStore());

      let customPack: ReturnType<typeof result.current.createPack>;
      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
        customPack = result.current.createPack('My Pack');
      });

      act(() => {
        result.current.moveCardToPack(result.current.cards[0].id, customPack.id);
      });

      expect(result.current.cards[0].packIds).toContain(customPack.id);

      act(() => {
        result.current.removeCardFromPack(result.current.cards[0].id, customPack.id);
      });

      expect(result.current.cards[0].packIds).not.toContain(customPack.id);
    });

    it('should not remove card from default packs', () => {
      const { result } = renderHook(() => useFlashcardStore());

      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      const allCardsPack = result.current.packs.find((p) => p.name === 'All Cards');

      act(() => {
        result.current.removeCardFromPack(result.current.cards[0].id, allCardsPack!.id);
      });

      // Should still be in the pack
      expect(result.current.cards[0].packIds).toContain(allCardsPack!.id);
    });
  });

  // ==========================================================================
  // recordReview Tests
  // ==========================================================================

  describe('recordReview', () => {
    it('should update card SM-2 values on successful review', () => {
      const { result } = renderHook(() => useFlashcardStore());

      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      const cardId = result.current.cards[0].id;

      act(() => {
        result.current.recordReview(cardId, 4); // Good recall
      });

      const updatedCard = result.current.cards[0];
      expect(updatedCard.repetitions).toBe(1);
      expect(updatedCard.interval).toBe(1); // First success = 1 day
      expect(updatedCard.lastReviewedAt).toBeDefined();
    });

    it('should reset repetitions on failed review', () => {
      const { result } = renderHook(() => useFlashcardStore());

      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      const cardId = result.current.cards[0].id;

      // First do a successful review
      act(() => {
        result.current.recordReview(cardId, 4);
      });

      expect(result.current.cards[0].repetitions).toBe(1);

      // Then fail
      act(() => {
        result.current.recordReview(cardId, 2); // Failed
      });

      expect(result.current.cards[0].repetitions).toBe(0);
      expect(result.current.cards[0].interval).toBe(0);
    });

    it('should update stats on review', () => {
      const { result } = renderHook(() => useFlashcardStore());

      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      const initialReviewed = result.current.stats.cardsReviewedToday;

      act(() => {
        result.current.recordReview(result.current.cards[0].id, 4);
      });

      expect(result.current.stats.cardsReviewedToday).toBe(initialReviewed + 1);
      expect(result.current.stats.lastStudyDate).toBeDefined();
    });
  });

  // ==========================================================================
  // resetAll Tests
  // ==========================================================================

  describe('resetAll', () => {
    it('should clear all cards and reset to defaults', () => {
      const { result } = renderHook(() => useFlashcardStore());

      // Add some data
      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
        result.current.createPack('My Pack');
      });

      expect(result.current.cards).toHaveLength(1);
      expect(result.current.packs.length).toBeGreaterThan(2);

      act(() => {
        result.current.resetAll();
      });

      expect(result.current.cards).toHaveLength(0);
      expect(result.current.packs).toHaveLength(2); // Only default packs
      expect(result.current.stats.totalCards).toBe(0);
    });
  });

  // ==========================================================================
  // Persistence Tests
  // ==========================================================================

  describe('persistence', () => {
    it('should persist cards to localStorage on add', () => {
      const { result } = renderHook(() => useFlashcardStore());

      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      // Flush debounced writes before checking localStorage
      flushPendingWrites();

      // Verify localStorage was updated
      const stored = JSON.parse(localStorageMock.getItem(FLASHCARD_STORAGE_KEYS.CARDS) || '{}');
      expect(stored.cards).toHaveLength(1);
      expect(stored.cards[0].sourceId).toBe('E2017_TRANSFORMER');
      expect(stored.schemaVersion).toBe(1);
    });

    it('should persist packs to localStorage on create', () => {
      const { result } = renderHook(() => useFlashcardStore());

      act(() => {
        result.current.createPack('Test Pack', 'Description', '#FF0000');
      });

      // Flush debounced writes before checking localStorage
      flushPendingWrites();

      const stored = JSON.parse(localStorageMock.getItem(FLASHCARD_STORAGE_KEYS.PACKS) || '{}');
      expect(stored.packs).toHaveLength(3); // 2 default + 1 custom
      expect(stored.packs.find((p: { name: string }) => p.name === 'Test Pack')).toBeDefined();
    });

    it('should persist stats to localStorage after operations', () => {
      const { result } = renderHook(() => useFlashcardStore());

      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      // Flush debounced writes before checking localStorage
      flushPendingWrites();

      const stored = JSON.parse(localStorageMock.getItem(FLASHCARD_STORAGE_KEYS.STATS) || '{}');
      expect(stored.totalCards).toBe(1);
    });

    it('should not lose data when adding multiple cards', () => {
      const { result } = renderHook(() => useFlashcardStore());

      // Add first card
      act(() => {
        result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      // Add second card
      act(() => {
        result.current.addCard('concept', 'C_ATTENTION');
      });

      // Flush debounced writes before checking localStorage
      flushPendingWrites();

      // Both should be persisted in localStorage
      const stored = JSON.parse(localStorageMock.getItem(FLASHCARD_STORAGE_KEYS.CARDS) || '{}');
      expect(stored.cards).toHaveLength(2);
      expect(stored.cards.map((c: { sourceId: string }) => c.sourceId)).toContain('E2017_TRANSFORMER');
      expect(stored.cards.map((c: { sourceId: string }) => c.sourceId)).toContain('C_ATTENTION');

      // State should also have both
      expect(result.current.cards).toHaveLength(2);
    });
  });
});
