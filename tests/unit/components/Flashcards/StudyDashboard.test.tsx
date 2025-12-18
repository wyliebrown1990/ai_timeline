/**
 * StudyDashboard Component Tests
 *
 * Tests for the Study Center dashboard including:
 * - Cards due today display
 * - Streak display
 * - Packs grid
 * - Empty state
 * - Quick stats
 */

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { StudyDashboard } from '../../../../src/components/Flashcards/StudyDashboard';
import { useFlashcardContext } from '../../../../src/contexts/FlashcardContext';

// Mock the FlashcardContext
jest.mock('../../../../src/contexts/FlashcardContext', () => ({
  useFlashcardContext: jest.fn(),
}));

const mockUseFlashcardContext = useFlashcardContext as jest.MockedFunction<
  typeof useFlashcardContext
>;

// =============================================================================
// Test Setup
// =============================================================================

// Mock pack data
const mockPacks = [
  {
    id: 'pack-1',
    name: 'All Cards',
    color: '#3B82F6',
    isDefault: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'pack-2',
    name: 'Transformers',
    color: '#8B5CF6',
    isDefault: false,
    createdAt: '2024-01-02T00:00:00.000Z',
  },
];

// Mock card data
const mockCards = [
  {
    id: 'card-1',
    sourceType: 'milestone' as const,
    sourceId: 'E2017_TRANSFORMER',
    packIds: ['pack-1', 'pack-2'],
    createdAt: '2024-01-01T00:00:00.000Z',
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReviewDate: new Date(Date.now() - 86400000).toISOString(), // Due yesterday
  },
  {
    id: 'card-2',
    sourceType: 'concept' as const,
    sourceId: 'C_ATTENTION',
    packIds: ['pack-1'],
    createdAt: '2024-01-02T00:00:00.000Z',
    easeFactor: 2.5,
    interval: 7,
    repetitions: 2,
    nextReviewDate: new Date(Date.now() + 86400000 * 7).toISOString(), // Due in 7 days
  },
];

// Default mock context value
const createMockContext = (overrides = {}) => ({
  cards: mockCards,
  packs: mockPacks,
  stats: {
    totalCards: 2,
    cardsDueToday: 1,
    cardsReviewedToday: 0,
    currentStreak: 5,
    longestStreak: 10,
    masteredCards: 1,
    lastStudyDate: null,
  },
  totalCards: 2,
  dueToday: 1,
  hasCards: true,
  isCardSaved: jest.fn(() => false),
  addCard: jest.fn(),
  removeCard: jest.fn(),
  getCardBySource: jest.fn(),
  getCardById: jest.fn(),
  getDueCards: jest.fn((packId?: string) => {
    if (packId === 'pack-2') return [mockCards[0]];
    return [mockCards[0]];
  }),
  getCardsByPack: jest.fn(() => mockCards),
  recordReview: jest.fn(),
  createPack: jest.fn(),
  deletePack: jest.fn(),
  renamePack: jest.fn(),
  moveCardToPack: jest.fn(),
  removeCardFromPack: jest.fn(),
  getDefaultPack: jest.fn(),
  resetAll: jest.fn(),
  ...overrides,
});

/**
 * Wrapper component for testing with BrowserRouter
 */
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseFlashcardContext.mockReturnValue(createMockContext());
});

// =============================================================================
// Tests
// =============================================================================

describe('StudyDashboard', () => {
  describe('Header', () => {
    it('should display Study Center title', () => {
      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: /study center/i })).toBeInTheDocument();
    });

    it('should display New Pack button', () => {
      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /new pack/i })).toBeInTheDocument();
    });
  });

  describe('Cards Due Today', () => {
    it('should display due card count', () => {
      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText(/card due.*today/i)).toBeInTheDocument();
    });

    it('should display Start Studying button when cards are due', () => {
      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      const startButton = screen.getByRole('link', { name: /start studying/i });
      expect(startButton).toBeInTheDocument();
      expect(startButton).toHaveAttribute('href', '/study/session');
    });

    it('should display "All caught up" when no cards due', () => {
      mockUseFlashcardContext.mockReturnValue(
        createMockContext({ dueToday: 0 })
      );

      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    });

    it('should use plural "cards" when multiple due', () => {
      mockUseFlashcardContext.mockReturnValue(
        createMockContext({ dueToday: 5 })
      );

      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/cards due.*today/i)).toBeInTheDocument();
    });
  });

  describe('Streak Display', () => {
    it('should display current streak count', () => {
      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText(/day streak/i)).toBeInTheDocument();
    });

    it('should display best streak when longer than current', () => {
      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/best: 10 days/i)).toBeInTheDocument();
    });

    it('should not display best streak when equal to current', () => {
      mockUseFlashcardContext.mockReturnValue(
        createMockContext({
          stats: {
            totalCards: 2,
            cardsDueToday: 1,
            cardsReviewedToday: 0,
            currentStreak: 10,
            longestStreak: 10,
            masteredCards: 1,
            lastStudyDate: null,
          },
        })
      );

      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      expect(screen.queryByText(/best:/i)).not.toBeInTheDocument();
    });
  });

  describe('Packs Grid', () => {
    it('should display Your Packs heading', () => {
      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: /your packs/i })).toBeInTheDocument();
    });

    it('should display all packs', () => {
      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('All Cards')).toBeInTheDocument();
      expect(screen.getByText('Transformers')).toBeInTheDocument();
    });

    it('should display System badge for default packs', () => {
      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('should display due count badge for packs with due cards', () => {
      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      // Should show "1 due" badge
      expect(screen.getAllByText(/due/i).length).toBeGreaterThanOrEqual(1);
    });

    it('should link pack cards to pack detail page', () => {
      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      const packLinks = screen.getAllByRole('link');
      const packDetailLink = packLinks.find((link) =>
        link.getAttribute('href')?.includes('/study/packs/')
      );
      expect(packDetailLink).toBeInTheDocument();
    });
  });

  describe('Quick Stats', () => {
    it('should display total cards count', () => {
      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/2 total cards/i)).toBeInTheDocument();
    });

    it('should display mastered cards count', () => {
      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/1 cards mastered/i)).toBeInTheDocument();
    });

    it('should display reviewed today count when > 0', () => {
      mockUseFlashcardContext.mockReturnValue(
        createMockContext({
          stats: {
            totalCards: 2,
            cardsDueToday: 1,
            cardsReviewedToday: 3,
            currentStreak: 5,
            longestStreak: 10,
            masteredCards: 1,
            lastStudyDate: null,
          },
        })
      );

      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/3 reviewed today/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no cards', () => {
      mockUseFlashcardContext.mockReturnValue(
        createMockContext({
          cards: [],
          hasCards: false,
        })
      );

      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/no flashcards yet/i)).toBeInTheDocument();
    });

    it('should display explore timeline link in empty state', () => {
      mockUseFlashcardContext.mockReturnValue(
        createMockContext({
          cards: [],
          hasCards: false,
        })
      );

      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      const exploreLink = screen.getByRole('link', { name: /explore timeline/i });
      expect(exploreLink).toBeInTheDocument();
      expect(exploreLink).toHaveAttribute('href', '/timeline');
    });

    it('should not display packs grid in empty state', () => {
      mockUseFlashcardContext.mockReturnValue(
        createMockContext({
          cards: [],
          hasCards: false,
        })
      );

      render(
        <TestWrapper>
          <StudyDashboard />
        </TestWrapper>
      );

      expect(screen.queryByText(/your packs/i)).not.toBeInTheDocument();
    });
  });
});
