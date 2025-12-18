/**
 * PathFlashcardsModal Component Tests
 *
 * Tests for the modal that allows users to create flashcards from completed learning paths.
 * Covers selection UI, card creation, duplicate handling, and accessibility.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PathFlashcardsModal } from '../../../../src/components/LearningPaths/PathFlashcardsModal';
import { useFlashcardContext } from '../../../../src/contexts/FlashcardContext';
import { useGlossary } from '../../../../src/hooks/useContent';
import { useMilestones } from '../../../../src/hooks/useMilestones';
import type { LearningPath } from '../../../../src/types/learningPath';
import type { FlashcardPack, UserFlashcard } from '../../../../src/types/flashcard';

// =============================================================================
// Mocks
// =============================================================================

jest.mock('../../../../src/contexts/FlashcardContext', () => ({
  useFlashcardContext: jest.fn(),
}));

jest.mock('../../../../src/hooks/useContent', () => ({
  useGlossary: jest.fn(),
}));

jest.mock('../../../../src/hooks/useMilestones', () => ({
  useMilestones: jest.fn(),
}));

const mockUseFlashcardContext = useFlashcardContext as jest.MockedFunction<typeof useFlashcardContext>;
const mockUseGlossary = useGlossary as jest.MockedFunction<typeof useGlossary>;
const mockUseMilestones = useMilestones as jest.MockedFunction<typeof useMilestones>;

// Mock glossary data
const mockGlossaryTerms = [
  { id: 'transformer', term: 'Transformer', shortDefinition: 'Neural network architecture using attention' },
  { id: 'attention', term: 'Attention', shortDefinition: 'Mechanism for focusing on relevant parts of input' },
  { id: 'bert', term: 'BERT', shortDefinition: 'Bidirectional Encoder Representations from Transformers' },
];

// Mock milestones data
const mockMilestones = [
  { id: 'M2017_TRANSFORMER', title: 'Attention Is All You Need', description: 'Introduced the Transformer architecture' },
  { id: 'M2018_BERT', title: 'BERT Release', description: 'Google releases BERT for NLP tasks' },
  { id: 'M2020_GPT3', title: 'GPT-3 Launch', description: 'OpenAI releases GPT-3 with 175B parameters' },
];

// Mutable state for existing cards
let mockExistingCards: UserFlashcard[] = [];

// Mock functions
const mockAddCard = jest.fn();
const mockCreatePack = jest.fn();
const mockMoveCardToPack = jest.fn();
const mockIsCardSaved = jest.fn();

// =============================================================================
// Test Data
// =============================================================================

const mockPath: LearningPath = {
  id: 'transformer-path',
  title: 'The Transformer Revolution',
  description: 'Learn about the transformer architecture',
  icon: '🤖',
  milestoneIds: ['M2017_TRANSFORMER', 'M2018_BERT'],
  conceptsCovered: ['transformer', 'attention'],
  keyTakeaways: ['Understanding attention', 'Modern NLP foundations'],
  estimatedMinutes: 30,
  difficulty: 'intermediate',
  suggestedNextPathIds: [],
  prerequisites: [],
  learningObjectives: [],
};

const mockNewPack: FlashcardPack = {
  id: 'pack-123',
  name: 'The Transformer Revolution Flashcards',
  description: 'Flashcards from completing "The Transformer Revolution"',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// =============================================================================
// Tests
// =============================================================================

describe('PathFlashcardsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExistingCards = [];
    mockIsCardSaved.mockReturnValue(false);
    mockCreatePack.mockReturnValue(mockNewPack);
    mockAddCard.mockImplementation((sourceType, sourceId, packIds) => ({
      id: `card-${sourceId}`,
      sourceType,
      sourceId,
      packIds,
    }));

    // Set up mocks
    mockUseFlashcardContext.mockReturnValue({
      cards: mockExistingCards,
      addCard: mockAddCard,
      createPack: mockCreatePack,
      moveCardToPack: mockMoveCardToPack,
      isCardSaved: mockIsCardSaved,
      packs: [],
      deletePack: jest.fn(),
      removeCard: jest.fn(),
      recordReview: jest.fn(),
      getDueCards: jest.fn().mockReturnValue([]),
      getPackCards: jest.fn().mockReturnValue([]),
      renamePack: jest.fn(),
      updatePackDescription: jest.fn(),
    } as unknown as ReturnType<typeof useFlashcardContext>);

    mockUseGlossary.mockReturnValue({
      data: mockGlossaryTerms,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useGlossary>);

    mockUseMilestones.mockReturnValue({
      data: mockMilestones,
      isLoading: false,
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useMilestones>);
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render modal with path title', () => {
      render(
        <PathFlashcardsModal path={mockPath} onClose={jest.fn()} />
      );

      expect(screen.getByText('Create Flashcards')).toBeInTheDocument();
      expect(screen.getByText('from The Transformer Revolution')).toBeInTheDocument();
    });

    it('should display milestones section with items', () => {
      render(
        <PathFlashcardsModal path={mockPath} onClose={jest.fn()} />
      );

      expect(screen.getByText('Milestones')).toBeInTheDocument();
      expect(screen.getByText('Attention Is All You Need')).toBeInTheDocument();
      expect(screen.getByText('BERT Release')).toBeInTheDocument();
    });

    it('should display concepts section with items', () => {
      render(
        <PathFlashcardsModal path={mockPath} onClose={jest.fn()} />
      );

      expect(screen.getByText('Concepts')).toBeInTheDocument();
      expect(screen.getByText('Transformer')).toBeInTheDocument();
      expect(screen.getByText('Attention')).toBeInTheDocument();
    });

    it('should show all items selected by default', () => {
      render(
        <PathFlashcardsModal path={mockPath} onClose={jest.fn()} />
      );

      // 2 milestones + 2 concepts = 4 items
      expect(screen.getByText('4 of 4 selected')).toBeInTheDocument();
    });

    it('should display item descriptions', () => {
      render(
        <PathFlashcardsModal path={mockPath} onClose={jest.fn()} />
      );

      expect(screen.getByText('Introduced the Transformer architecture')).toBeInTheDocument();
      expect(screen.getByText('Neural network architecture using attention')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Selection Tests
  // ===========================================================================

  describe('Selection', () => {
    it('should toggle item selection when checkbox clicked', () => {
      render(
        <PathFlashcardsModal path={mockPath} onClose={jest.fn()} />
      );

      // Find the checkbox for the first milestone
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked();

      // Uncheck it
      fireEvent.click(checkboxes[0]);
      expect(checkboxes[0]).not.toBeChecked();
      expect(screen.getByText('3 of 4 selected')).toBeInTheDocument();
    });

    it('should deselect all when "Deselect All" clicked', () => {
      render(
        <PathFlashcardsModal path={mockPath} onClose={jest.fn()} />
      );

      fireEvent.click(screen.getByText('Deselect All'));

      expect(screen.getByText('0 of 4 selected')).toBeInTheDocument();
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it('should select all when "Select All" clicked', () => {
      render(
        <PathFlashcardsModal path={mockPath} onClose={jest.fn()} />
      );

      // First deselect all
      fireEvent.click(screen.getByText('Deselect All'));
      expect(screen.getByText('0 of 4 selected')).toBeInTheDocument();

      // Then select all
      fireEvent.click(screen.getByText('Select All'));
      expect(screen.getByText('4 of 4 selected')).toBeInTheDocument();
    });

    it('should disable create button when nothing selected', () => {
      render(
        <PathFlashcardsModal path={mockPath} onClose={jest.fn()} />
      );

      fireEvent.click(screen.getByText('Deselect All'));

      const createButton = screen.getByTestId('create-path-flashcards-button');
      expect(createButton).toBeDisabled();
      expect(screen.getByText('Select items to create flashcards')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Already Saved Indicator Tests
  // ===========================================================================

  describe('Already Saved Indicator', () => {
    it('should show "Already saved" badge for existing cards', () => {
      mockIsCardSaved.mockImplementation((type, id) => {
        return type === 'milestone' && id === 'M2017_TRANSFORMER';
      });

      render(
        <PathFlashcardsModal path={mockPath} onClose={jest.fn()} />
      );

      expect(screen.getByText('Already saved')).toBeInTheDocument();
    });

    it('should show count of existing vs new cards in footer', () => {
      mockIsCardSaved.mockImplementation((type, id) => {
        return type === 'milestone' && id === 'M2017_TRANSFORMER';
      });

      render(
        <PathFlashcardsModal path={mockPath} onClose={jest.fn()} />
      );

      expect(screen.getByText('3 new cards will be added')).toBeInTheDocument();
      expect(screen.getByText('1 existing cards will be linked')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Card Creation Tests
  // ===========================================================================

  describe('Card Creation', () => {
    it('should create pack and add cards when create button clicked', async () => {
      const onClose = jest.fn();
      const onFlashcardsCreated = jest.fn();

      render(
        <PathFlashcardsModal
          path={mockPath}
          onClose={onClose}
          onFlashcardsCreated={onFlashcardsCreated}
        />
      );

      fireEvent.click(screen.getByTestId('create-path-flashcards-button'));

      await waitFor(() => {
        // Should create a pack
        expect(mockCreatePack).toHaveBeenCalledWith(
          'The Transformer Revolution Flashcards',
          'Flashcards from completing "The Transformer Revolution"'
        );

        // Should add 4 cards (2 milestones + 2 concepts)
        expect(mockAddCard).toHaveBeenCalledTimes(4);

        // Should call callback
        expect(onFlashcardsCreated).toHaveBeenCalledWith('pack-123', 4);
      });
    });

    it('should show success view after creating flashcards', async () => {
      render(
        <PathFlashcardsModal path={mockPath} onClose={jest.fn()} />
      );

      fireEvent.click(screen.getByTestId('create-path-flashcards-button'));

      await waitFor(() => {
        expect(screen.getByText('Flashcards Created!')).toBeInTheDocument();
        expect(screen.getByText('4 new cards added')).toBeInTheDocument();
      });
    });

    it('should link existing cards to pack instead of creating duplicates', async () => {
      // Set up existing card
      const existingCard: UserFlashcard = {
        id: 'existing-card-1',
        sourceType: 'milestone',
        sourceId: 'M2017_TRANSFORMER',
        packIds: ['other-pack'],
        createdAt: '2024-01-01T00:00:00.000Z',
        reviews: [],
        nextReview: '2024-01-02T00:00:00.000Z',
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
      };
      mockExistingCards = [existingCard];

      // Reconfigure mock to return our existing cards
      mockUseFlashcardContext.mockReturnValue({
        cards: [existingCard],
        addCard: mockAddCard,
        createPack: mockCreatePack,
        moveCardToPack: mockMoveCardToPack,
        isCardSaved: mockIsCardSaved,
        packs: [],
        deletePack: jest.fn(),
        removeCard: jest.fn(),
        recordReview: jest.fn(),
        getDueCards: jest.fn().mockReturnValue([]),
        getPackCards: jest.fn().mockReturnValue([]),
        renamePack: jest.fn(),
        updatePackDescription: jest.fn(),
      } as unknown as ReturnType<typeof useFlashcardContext>);

      mockIsCardSaved.mockImplementation((type, id) => {
        return type === 'milestone' && id === 'M2017_TRANSFORMER';
      });

      render(
        <PathFlashcardsModal path={mockPath} onClose={jest.fn()} />
      );

      fireEvent.click(screen.getByTestId('create-path-flashcards-button'));

      await waitFor(() => {
        // Should link existing card, not create new
        expect(mockMoveCardToPack).toHaveBeenCalledWith('existing-card-1', 'pack-123');
        // Should create 3 new cards (1 milestone + 2 concepts)
        expect(mockAddCard).toHaveBeenCalledTimes(3);
      });
    });

    it('should only create cards for selected items', async () => {
      render(
        <PathFlashcardsModal path={mockPath} onClose={jest.fn()} />
      );

      // Deselect first two items
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);

      fireEvent.click(screen.getByTestId('create-path-flashcards-button'));

      await waitFor(() => {
        // Should only add 2 cards
        expect(mockAddCard).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ===========================================================================
  // Modal Behavior Tests
  // ===========================================================================

  describe('Modal Behavior', () => {
    it('should call onClose when close button clicked', () => {
      const onClose = jest.fn();
      render(
        <PathFlashcardsModal path={mockPath} onClose={onClose} />
      );

      fireEvent.click(screen.getByLabelText('Close'));
      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when backdrop clicked', () => {
      const onClose = jest.fn();
      render(
        <PathFlashcardsModal path={mockPath} onClose={onClose} />
      );

      // Find backdrop by class
      const backdrop = document.querySelector('.backdrop-blur-sm');
      expect(backdrop).toBeInTheDocument();
      fireEvent.click(backdrop!);

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when Escape key pressed', () => {
      const onClose = jest.fn();
      render(
        <PathFlashcardsModal path={mockPath} onClose={onClose} />
      );

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when "Start Studying" clicked in success view', async () => {
      const onClose = jest.fn();
      render(
        <PathFlashcardsModal path={mockPath} onClose={onClose} />
      );

      // Create flashcards to get to success view
      fireEvent.click(screen.getByTestId('create-path-flashcards-button'));

      await waitFor(() => {
        expect(screen.getByText('Flashcards Created!')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('path-flashcards-done-button'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have proper dialog role and aria attributes', () => {
      render(
        <PathFlashcardsModal path={mockPath} onClose={jest.fn()} />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'path-flashcards-title');
    });

    it('should have accessible close button', () => {
      render(
        <PathFlashcardsModal path={mockPath} onClose={jest.fn()} />
      );

      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    it('should have labeled checkboxes', () => {
      render(
        <PathFlashcardsModal path={mockPath} onClose={jest.fn()} />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        // Each checkbox should be within a label
        expect(checkbox.closest('label')).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle path with no concepts', () => {
      const pathNoConceptsCovered: LearningPath = {
        ...mockPath,
        conceptsCovered: [],
      };

      render(
        <PathFlashcardsModal path={pathNoConceptsCovered} onClose={jest.fn()} />
      );

      expect(screen.getByText('Milestones')).toBeInTheDocument();
      expect(screen.queryByText('Concepts')).not.toBeInTheDocument();
      expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
    });

    it('should handle path with no milestones', () => {
      const pathNoMilestones: LearningPath = {
        ...mockPath,
        milestoneIds: [],
      };

      render(
        <PathFlashcardsModal path={pathNoMilestones} onClose={jest.fn()} />
      );

      expect(screen.queryByText('Milestones')).not.toBeInTheDocument();
      expect(screen.getByText('Concepts')).toBeInTheDocument();
      expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
    });

    it('should handle concept not found in glossary', () => {
      const pathUnknownConcept: LearningPath = {
        ...mockPath,
        conceptsCovered: ['unknown-concept'],
      };

      render(
        <PathFlashcardsModal path={pathUnknownConcept} onClose={jest.fn()} />
      );

      // Should only show milestones, unknown concept is skipped
      expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
    });

    it('should handle milestone not found', () => {
      const pathUnknownMilestone: LearningPath = {
        ...mockPath,
        milestoneIds: ['UNKNOWN_MILESTONE'],
      };

      render(
        <PathFlashcardsModal path={pathUnknownMilestone} onClose={jest.fn()} />
      );

      // Should only show concepts, unknown milestone is skipped
      expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
    });
  });
});
