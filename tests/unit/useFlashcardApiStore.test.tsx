/**
 * useFlashcardApiStore Hook Tests
 *
 * Sprint 38 - User Data Migration
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFlashcardApiStore } from '../../src/hooks/useFlashcardApiStore';
import { SessionProvider } from '../../src/contexts/SessionContext';

// =============================================================================
// Mocks
// =============================================================================

// Mock sessionContext
const mockSessionId = 'test-session-123';
jest.mock('../../src/contexts/SessionContext', () => ({
  ...jest.requireActual('../../src/contexts/SessionContext'),
  useSession: () => ({
    sessionId: mockSessionId,
    isReady: true,
    isLoading: false,
    error: null,
    retry: jest.fn(),
  }),
}));

// Mock API
const mockGetFlashcards = jest.fn();
const mockGetPacks = jest.fn();
const mockAddFlashcard = jest.fn();
const mockRemoveFlashcard = jest.fn();
const mockReviewFlashcard = jest.fn();
const mockCreatePack = jest.fn();
const mockDeletePack = jest.fn();
const mockUpdatePack = jest.fn();
const mockUpdateFlashcardPacks = jest.fn();

jest.mock('../../src/services/api', () => ({
  userFlashcardsApi: {
    getFlashcards: (...args: unknown[]) => mockGetFlashcards(...args),
    getPacks: (...args: unknown[]) => mockGetPacks(...args),
    addFlashcard: (...args: unknown[]) => mockAddFlashcard(...args),
    removeFlashcard: (...args: unknown[]) => mockRemoveFlashcard(...args),
    reviewFlashcard: (...args: unknown[]) => mockReviewFlashcard(...args),
    createPack: (...args: unknown[]) => mockCreatePack(...args),
    deletePack: (...args: unknown[]) => mockDeletePack(...args),
    updatePack: (...args: unknown[]) => mockUpdatePack(...args),
    updateFlashcardPacks: (...args: unknown[]) => mockUpdateFlashcardPacks(...args),
  },
}));

// Mock flashcard stats
jest.mock('../../src/lib/flashcardStats', () => ({
  loadReviewHistory: () => [],
  saveReviewHistory: jest.fn(),
  recordReviewInHistory: jest.fn((history) => history),
  loadStreakHistory: () => ({
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
    achievements: [],
  }),
  saveStreakHistory: jest.fn(),
  updateStreakAfterReview: jest.fn((streak) => streak),
  addStudyTimeToHistory: jest.fn((history) => history),
}));

// =============================================================================
// Test Data
// =============================================================================

const mockFlashcardResponse = {
  id: 'card-1',
  sourceType: 'milestone',
  sourceId: 'E2017_TRANSFORMER',
  packIds: ['pack-1'],
  easeFactor: 2.5,
  interval: 1,
  repetitions: 0,
  nextReviewDate: null,
  lastReviewedAt: null,
  createdAt: '2025-01-01T00:00:00Z',
};

const mockPackResponse = {
  id: 'pack-1',
  name: 'All Cards',
  description: null,
  color: '#3B82F6',
  isDefault: true,
  cardCount: 1,
  createdAt: '2025-01-01T00:00:00Z',
};

// =============================================================================
// Tests
// =============================================================================

describe('useFlashcardApiStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mock responses
    mockGetFlashcards.mockResolvedValue({ data: [mockFlashcardResponse] });
    mockGetPacks.mockResolvedValue({ data: [mockPackResponse] });
  });

  describe('initialization', () => {
    it('fetches cards and packs on mount when session is ready', async () => {
      const { result } = renderHook(() => useFlashcardApiStore());

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(mockGetFlashcards).toHaveBeenCalledWith(mockSessionId);
      expect(mockGetPacks).toHaveBeenCalledWith(mockSessionId);
      expect(result.current.cards.length).toBe(1);
      expect(result.current.packs.length).toBe(1);
    });

    it('calculates stats from loaded cards', async () => {
      const { result } = renderHook(() => useFlashcardApiStore());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.stats.totalCards).toBe(1);
    });
  });

  describe('addCard', () => {
    it('adds a new card via API and updates local state', async () => {
      const newCard = {
        ...mockFlashcardResponse,
        id: 'card-2',
        sourceId: 'E2020_GPT3',
      };
      mockAddFlashcard.mockResolvedValueOnce(newCard);

      const { result } = renderHook(() => useFlashcardApiStore());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let addedCard: unknown;
      await act(async () => {
        addedCard = await result.current.addCard('milestone', 'E2020_GPT3');
      });

      expect(mockAddFlashcard).toHaveBeenCalledWith(
        mockSessionId,
        'milestone',
        'E2020_GPT3',
        undefined
      );
      expect(addedCard).toBeDefined();
      expect(result.current.cards.length).toBe(2);
    });

    it('returns null if card already exists', async () => {
      const { result } = renderHook(() => useFlashcardApiStore());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let addedCard: unknown;
      await act(async () => {
        // Try to add the same card that was loaded initially
        addedCard = await result.current.addCard('milestone', 'E2017_TRANSFORMER');
      });

      expect(addedCard).toBeNull();
      expect(mockAddFlashcard).not.toHaveBeenCalled();
    });
  });

  describe('removeCard', () => {
    it('removes a card via API and updates local state', async () => {
      mockRemoveFlashcard.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useFlashcardApiStore());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.cards.length).toBe(1);

      await act(async () => {
        await result.current.removeCard('card-1');
      });

      expect(mockRemoveFlashcard).toHaveBeenCalledWith(mockSessionId, 'card-1');
      expect(result.current.cards.length).toBe(0);
    });
  });

  describe('recordReview', () => {
    it('reviews a card via API and updates local state', async () => {
      const reviewResult = {
        id: 'card-1',
        easeFactor: 2.6,
        interval: 1,
        repetitions: 1,
        nextReviewDate: '2025-01-02T00:00:00Z',
        isMastered: false,
      };
      mockReviewFlashcard.mockResolvedValueOnce(reviewResult);

      const { result } = renderHook(() => useFlashcardApiStore());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.recordReview('card-1', 4);
      });

      expect(mockReviewFlashcard).toHaveBeenCalledWith(mockSessionId, 'card-1', 4);
      expect(result.current.cards[0].easeFactor).toBe(2.6);
      expect(result.current.cards[0].interval).toBe(1);
    });
  });

  describe('pack operations', () => {
    it('creates a new pack via API', async () => {
      const newPack = {
        id: 'pack-2',
        name: 'My Pack',
        description: 'Test pack',
        color: '#10B981',
        isDefault: false,
        cardCount: 0,
        createdAt: '2025-01-01T00:00:00Z',
      };
      mockCreatePack.mockResolvedValueOnce(newPack);

      const { result } = renderHook(() => useFlashcardApiStore());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let createdPack: unknown;
      await act(async () => {
        createdPack = await result.current.createPack('My Pack', 'Test pack', '#10B981');
      });

      expect(mockCreatePack).toHaveBeenCalledWith(
        mockSessionId,
        'My Pack',
        'Test pack',
        '#10B981'
      );
      expect(createdPack).toBeDefined();
      expect(result.current.packs.length).toBe(2);
    });

    it('deletes a pack via API', async () => {
      // Add a non-default pack first
      mockGetPacks.mockResolvedValueOnce({
        data: [
          mockPackResponse,
          {
            id: 'pack-2',
            name: 'Custom Pack',
            description: null,
            color: '#10B981',
            isDefault: false,
            cardCount: 0,
            createdAt: '2025-01-01T00:00:00Z',
          },
        ],
      });
      mockDeletePack.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useFlashcardApiStore());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.packs.length).toBe(2);

      await act(async () => {
        await result.current.deletePack('pack-2');
      });

      expect(mockDeletePack).toHaveBeenCalledWith(mockSessionId, 'pack-2');
      expect(result.current.packs.length).toBe(1);
    });

    it('does not delete default packs', async () => {
      const { result } = renderHook(() => useFlashcardApiStore());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.deletePack('pack-1'); // Default pack
      });

      // Should not call API for default packs
      expect(mockDeletePack).not.toHaveBeenCalled();
    });
  });

  describe('isCardSaved', () => {
    it('returns true if card exists', async () => {
      const { result } = renderHook(() => useFlashcardApiStore());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.isCardSaved('milestone', 'E2017_TRANSFORMER')).toBe(true);
    });

    it('returns false if card does not exist', async () => {
      const { result } = renderHook(() => useFlashcardApiStore());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.isCardSaved('milestone', 'NONEXISTENT')).toBe(false);
    });
  });

  describe('getDueCards', () => {
    it('filters cards that are due for review', async () => {
      // Add a card that's due
      mockGetFlashcards.mockResolvedValueOnce({
        data: [
          {
            ...mockFlashcardResponse,
            nextReviewDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
          },
        ],
      });

      const { result } = renderHook(() => useFlashcardApiStore());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      const dueCards = result.current.getDueCards();
      expect(dueCards.length).toBe(1);
    });
  });

  describe('error handling', () => {
    it('sets error state when API fails', async () => {
      mockGetFlashcards.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useFlashcardApiStore());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
      // Error message is preserved from the original error
      expect(result.current.error?.message).toBe('Network error');
      expect(result.current.isInitialized).toBe(false);
    });
  });
});
