/**
 * DeckLibrary Component Tests
 *
 * Tests for the prebuilt deck library including:
 * - Deck grid display with all prebuilt decks
 * - Difficulty badges
 * - Card count and time estimates
 * - Preview modal functionality
 * - Add deck functionality
 * - Already-added deck detection
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DeckLibrary } from '../../../../src/components/Flashcards/DeckLibrary';
import { useFlashcardContext } from '../../../../src/contexts/FlashcardContext';
import { useGlossary } from '../../../../src/hooks/useContent';
import { useMilestones } from '../../../../src/hooks/useMilestones';
import { PREBUILT_DECKS } from '../../../../src/content/prebuiltDecks';

// Mock dependencies
jest.mock('../../../../src/contexts/FlashcardContext', () => ({
  useFlashcardContext: jest.fn(),
}));

jest.mock('../../../../src/hooks/useContent', () => ({
  useGlossary: jest.fn(),
}));

jest.mock('../../../../src/hooks/useMilestones', () => ({
  useMilestones: jest.fn(),
}));

const mockUseFlashcardContext = useFlashcardContext as jest.MockedFunction<
  typeof useFlashcardContext
>;
const mockUseGlossary = useGlossary as jest.MockedFunction<typeof useGlossary>;
const mockUseMilestones = useMilestones as jest.MockedFunction<typeof useMilestones>;

// =============================================================================
// Test Setup
// =============================================================================

// Mock glossary data
const mockGlossaryTerms = [
  {
    id: 'machine-learning',
    term: 'Machine Learning',
    shortDefinition: 'AI that improves automatically through experience and data',
    fullDefinition: 'AI that improves automatically through experience and data...',
    category: 'core',
    businessContext: 'Used in...',
  },
  {
    id: 'transformer',
    term: 'Transformer',
    shortDefinition: 'Architecture that processes sequences in parallel using attention',
    fullDefinition: 'Architecture that processes sequences in parallel...',
    category: 'architecture',
    businessContext: 'Powers modern LLMs...',
  },
  {
    id: 'llm',
    term: 'Large Language Model',
    shortDefinition: 'AI trained on vast text to understand and generate language',
    fullDefinition: 'AI trained on vast text...',
    category: 'core',
    businessContext: 'Powers chatbots...',
  },
];

// Mock milestone data
const mockMilestones = [
  {
    id: 'E2017_TRANSFORMER',
    title: 'Transformer Architecture',
    description: 'Introduced the Transformer architecture',
    date: '2017-06-12',
    organization: 'Google',
    category: 'paper',
  },
  {
    id: 'E2020_GPT3',
    title: 'GPT-3',
    description: 'OpenAI released GPT-3 with 175B parameters',
    date: '2020-06-11',
    organization: 'OpenAI',
    category: 'model_release',
  },
];

// Mock pack data
const mockPacks = [
  {
    id: 'pack-1',
    name: 'All Cards',
    color: '#3B82F6',
    isDefault: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

// Default mock context value
const createMockContext = (overrides = {}) => ({
  cards: [],
  packs: mockPacks,
  stats: {
    totalCards: 0,
    cardsDueToday: 0,
    cardsReviewedToday: 0,
    currentStreak: 0,
    longestStreak: 0,
    masteredCards: 0,
    lastStudyDate: null,
  },
  totalCards: 0,
  dueToday: 0,
  hasCards: false,
  isCardSaved: jest.fn(() => false),
  addCard: jest.fn(() => ({
    id: 'new-card-id',
    sourceType: 'concept' as const,
    sourceId: 'test',
    packIds: ['pack-1'],
    createdAt: new Date().toISOString(),
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: new Date().toISOString(),
    lastReviewedAt: null,
  })),
  removeCard: jest.fn(),
  getCardBySource: jest.fn(),
  getCardById: jest.fn(),
  getDueCards: jest.fn(() => []),
  getCardsByPack: jest.fn(() => []),
  recordReview: jest.fn(),
  createPack: jest.fn(() => ({
    id: 'new-pack-id',
    name: 'AI Essentials',
    color: '#3B82F6',
    isDefault: false,
    createdAt: new Date().toISOString(),
  })),
  deletePack: jest.fn(),
  renamePack: jest.fn(),
  moveCardToPack: jest.fn(),
  removeCardFromPack: jest.fn(),
  getDefaultPack: jest.fn(),
  resetAll: jest.fn(),
  reviewHistory: [],
  streakHistory: {
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
    achievements: [],
  },
  addStudyTime: jest.fn(),
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
  mockUseGlossary.mockReturnValue({
    data: mockGlossaryTerms,
    isLoading: false,
    error: null,
  });
  mockUseMilestones.mockReturnValue({
    data: mockMilestones,
    isLoading: false,
    error: null,
    hasNextPage: false,
    fetchNextPage: jest.fn(),
  });
});

// =============================================================================
// Tests
// =============================================================================

describe('DeckLibrary', () => {
  describe('Header', () => {
    it('should display Deck Library title', () => {
      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: /deck library/i })).toBeInTheDocument();
    });

    it('should display description text', () => {
      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      expect(screen.getByText(/curated flashcard decks/i)).toBeInTheDocument();
    });
  });

  describe('Deck Grid', () => {
    it('should display all prebuilt decks', () => {
      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      // Check that all prebuilt decks are displayed
      for (const deck of PREBUILT_DECKS) {
        expect(screen.getByText(deck.name)).toBeInTheDocument();
      }
    });

    it('should display deck card count', () => {
      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      // AI Essentials has 15 cards
      expect(screen.getByText(/15 cards/)).toBeInTheDocument();
    });

    it('should display estimated time', () => {
      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      // Should show estimated minutes
      expect(screen.getByText(/~8 min/)).toBeInTheDocument();
    });

    it('should have data-testid attributes for deck cards', () => {
      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      expect(screen.getByTestId('deck-card-ai-essentials')).toBeInTheDocument();
      expect(screen.getByTestId('deck-card-transformer-era')).toBeInTheDocument();
    });
  });

  describe('Difficulty Badges', () => {
    it('should display Beginner badge for beginner decks', () => {
      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      // AI Essentials is beginner difficulty
      expect(screen.getAllByText('Beginner').length).toBeGreaterThan(0);
    });

    it('should display Intermediate badge for intermediate decks', () => {
      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      // Transformer Era is intermediate difficulty
      expect(screen.getAllByText('Intermediate').length).toBeGreaterThan(0);
    });
  });

  describe('Preview Button', () => {
    it('should display Preview button for each deck', () => {
      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      expect(previewButtons.length).toBe(PREBUILT_DECKS.length);
    });

    it('should have data-testid for preview buttons', () => {
      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      expect(screen.getByTestId('preview-deck-ai-essentials')).toBeInTheDocument();
    });
  });

  describe('Add Deck Button', () => {
    it('should display Add Deck button for each deck when not added', () => {
      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      const addButtons = screen.getAllByRole('button', { name: /add deck/i });
      expect(addButtons.length).toBe(PREBUILT_DECKS.length);
    });

    it('should show Added indicator when deck has been added', () => {
      // Mock that a pack exists with the deck name (indicating it's been added)
      mockUseFlashcardContext.mockReturnValue(
        createMockContext({
          packs: [
            ...mockPacks,
            {
              id: 'ai-essentials-pack',
              name: 'AI Essentials',
              color: '#3B82F6',
              isDefault: false,
              createdAt: '2024-01-01T00:00:00.000Z',
            },
          ],
        })
      );

      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      // Should show "Added" for AI Essentials
      expect(screen.getByTestId('deck-added-ai-essentials')).toBeInTheDocument();
    });
  });

  describe('Preview Modal', () => {
    it('should open preview modal when Preview button is clicked', async () => {
      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      const previewButton = screen.getByTestId('preview-deck-ai-essentials');
      fireEvent.click(previewButton);

      // Modal should be visible
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should display deck name in modal header', async () => {
      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      const previewButton = screen.getByTestId('preview-deck-ai-essentials');
      fireEvent.click(previewButton);

      await waitFor(() => {
        // Modal title should contain deck name - use getAllBy since both card and modal have the name
        const headings = screen.getAllByRole('heading', { name: /ai essentials/i });
        // Should have at least 2 (one in grid, one in modal)
        expect(headings.length).toBeGreaterThanOrEqual(2);
        // Check the modal title specifically by ID
        expect(screen.getByText('Preview: 3 sample cards')).toBeInTheDocument();
      });
    });

    it('should display "3 sample cards" text in modal', async () => {
      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      const previewButton = screen.getByTestId('preview-deck-ai-essentials');
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText(/3 sample cards/i)).toBeInTheDocument();
      });
    });

    it('should close modal when close button is clicked', async () => {
      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      // Open modal
      const previewButton = screen.getByTestId('preview-deck-ai-essentials');
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByRole('button', { name: /close preview/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should have a backdrop overlay in the modal', async () => {
      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      // Open modal
      const previewButton = screen.getByTestId('preview-deck-ai-essentials');
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Verify backdrop exists by checking for the backdrop-blur class
      const backdrop = document.querySelector('.backdrop-blur-sm');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('Add Deck Functionality', () => {
    it('should call createPack when Add Deck is clicked', async () => {
      const mockContext = createMockContext();
      mockUseFlashcardContext.mockReturnValue(mockContext);

      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      const addButton = screen.getByTestId('add-deck-button-ai-essentials');
      fireEvent.click(addButton);

      expect(mockContext.createPack).toHaveBeenCalled();
    });

    it('should call addCard for each card in the deck', async () => {
      const mockContext = createMockContext();
      mockUseFlashcardContext.mockReturnValue(mockContext);

      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      const addButton = screen.getByTestId('add-deck-button-ai-essentials');
      fireEvent.click(addButton);

      // Should call addCard multiple times (one for each non-custom card)
      expect(mockContext.addCard).toHaveBeenCalled();
    });

    it('should call onDeckAdded callback with result object when provided', async () => {
      const onDeckAdded = jest.fn();
      const mockContext = createMockContext();
      mockUseFlashcardContext.mockReturnValue(mockContext);

      render(
        <TestWrapper>
          <DeckLibrary onDeckAdded={onDeckAdded} />
        </TestWrapper>
      );

      const addButton = screen.getByTestId('add-deck-button-ai-essentials');
      fireEvent.click(addButton);

      // Should be called with a result object containing deckId, deckName, etc.
      expect(onDeckAdded).toHaveBeenCalledWith(
        expect.objectContaining({
          deckId: 'ai-essentials',
          deckName: 'AI Essentials',
          newCardsAdded: expect.any(Number),
          existingCardsLinked: expect.any(Number),
          skippedCards: expect.any(Number),
          totalCards: expect.any(Number),
        })
      );
    });

    it('should show confirmation modal after adding deck', async () => {
      const mockContext = createMockContext();
      mockUseFlashcardContext.mockReturnValue(mockContext);

      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      const addButton = screen.getByTestId('add-deck-button-ai-essentials');
      fireEvent.click(addButton);

      // Confirmation modal should appear
      await waitFor(() => {
        expect(screen.getByText(/deck added successfully/i)).toBeInTheDocument();
      });
    });

    it('should close confirmation modal when Got it button is clicked', async () => {
      const mockContext = createMockContext();
      mockUseFlashcardContext.mockReturnValue(mockContext);

      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      // Add a deck
      const addButton = screen.getByTestId('add-deck-button-ai-essentials');
      fireEvent.click(addButton);

      // Wait for confirmation modal
      await waitFor(() => {
        expect(screen.getByText(/deck added successfully/i)).toBeInTheDocument();
      });

      // Close the modal
      const closeButton = screen.getByTestId('confirmation-close-button');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/deck added successfully/i)).not.toBeInTheDocument();
      });
    });

    it('should link existing cards to new pack using moveCardToPack via preview modal', async () => {
      // Create a mock context where a card already exists
      const existingCard = {
        id: 'existing-card-1',
        sourceType: 'concept' as const,
        sourceId: 'machine-learning', // This is in our mock glossary
        packIds: ['pack-1'],
        createdAt: new Date().toISOString(),
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReviewDate: new Date().toISOString(),
        lastReviewedAt: null,
      };

      const mockContext = createMockContext({
        cards: [existingCard],
      });
      mockUseFlashcardContext.mockReturnValue(mockContext);

      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      // Open preview modal first
      const previewButton = screen.getByTestId('preview-deck-ai-essentials');
      fireEvent.click(previewButton);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click "Add All X Cards to New Pack" which will create a pack and link existing cards
      const addAllButton = screen.getByTestId('add-all-deck-ai-essentials');
      fireEvent.click(addAllButton);

      // moveCardToPack should be called for the existing card
      expect(mockContext.moveCardToPack).toHaveBeenCalledWith('existing-card-1', 'new-pack-id');
    });
  });

  describe('Partial Deck Add', () => {
    it('should show existing cards count indicator when some cards exist', () => {
      // Create a mock context where a card already exists
      const existingCard = {
        id: 'existing-card-1',
        sourceType: 'concept' as const,
        sourceId: 'machine-learning',
        packIds: ['pack-1'],
        createdAt: new Date().toISOString(),
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReviewDate: new Date().toISOString(),
        lastReviewedAt: null,
      };

      mockUseFlashcardContext.mockReturnValue(
        createMockContext({
          cards: [existingCard],
        })
      );

      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      // Should show indicator that some cards already exist
      expect(screen.getByText(/1 of 15 cards already in collection/i)).toBeInTheDocument();
    });

    it('should show "Add Missing" button for partially added decks', () => {
      const existingCard = {
        id: 'existing-card-1',
        sourceType: 'concept' as const,
        sourceId: 'machine-learning',
        packIds: ['pack-1'],
        createdAt: new Date().toISOString(),
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReviewDate: new Date().toISOString(),
        lastReviewedAt: null,
      };

      mockUseFlashcardContext.mockReturnValue(
        createMockContext({
          cards: [existingCard],
        })
      );

      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      // Should show "Add Missing" button
      expect(screen.getByRole('button', { name: /add missing/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible grid for deck cards', () => {
      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      expect(screen.getByTestId('deck-library-grid')).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      render(
        <TestWrapper>
          <DeckLibrary />
        </TestWrapper>
      );

      const heading = screen.getByRole('heading', { name: /deck library/i });
      expect(heading.tagName).toBe('H2');
    });
  });

  describe('Custom Styling', () => {
    it('should accept custom className', () => {
      render(
        <TestWrapper>
          <DeckLibrary className="custom-class" />
        </TestWrapper>
      );

      // The outer container should have the custom class
      const container = screen.getByTestId('deck-library-grid').parentElement;
      expect(container).toHaveClass('custom-class');
    });
  });
});
