/**
 * AddToFlashcardButton Component Tests
 *
 * Tests the flashcard add/remove button component including:
 * - Icon and button variants
 * - Size variants (sm, md, lg)
 * - Saved/unsaved state rendering
 * - Click interactions
 * - Tooltip behavior
 * - Keyboard accessibility
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddToFlashcardButton } from '../../../../src/components/Flashcards/AddToFlashcardButton';
import { useFlashcardContext } from '../../../../src/contexts/FlashcardContext';

// Mock the FlashcardContext
jest.mock('../../../../src/contexts/FlashcardContext', () => ({
  useFlashcardContext: jest.fn(),
}));

const mockUseFlashcardContext = useFlashcardContext as jest.MockedFunction<typeof useFlashcardContext>;

describe('AddToFlashcardButton', () => {
  // Default mock values
  const mockAddCard = jest.fn();
  const mockRemoveCard = jest.fn();
  const mockGetCardBySource = jest.fn();
  const mockIsCardSaved = jest.fn();

  const defaultContextValue = {
    cards: [],
    packs: [],
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
    isCardSaved: mockIsCardSaved,
    addCard: mockAddCard,
    removeCard: mockRemoveCard,
    getCardBySource: mockGetCardBySource,
    getDueCards: jest.fn(() => []),
    recordReview: jest.fn(),
    createPack: jest.fn(),
    deletePack: jest.fn(),
    renamePack: jest.fn(),
    moveCardToPack: jest.fn(),
    removeCardFromPack: jest.fn(),
    updatePackColor: jest.fn(),
    getPackById: jest.fn(),
    getCardsInPack: jest.fn(() => []),
    resetStore: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsCardSaved.mockReturnValue(false);
    mockAddCard.mockReturnValue({ id: 'new-card-id' });
    mockGetCardBySource.mockReturnValue(undefined);
    mockUseFlashcardContext.mockReturnValue(defaultContextValue);
  });

  // =========================================================================
  // Rendering Tests
  // =========================================================================

  describe('Rendering', () => {
    it('renders icon variant by default', () => {
      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Add to Flashcards');
    });

    it('renders button variant with text', () => {
      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
          variant="button"
        />
      );

      expect(screen.getByText('Add to Flashcards')).toBeInTheDocument();
    });

    it('renders saved state correctly for icon variant', () => {
      mockIsCardSaved.mockReturnValue(true);
      mockUseFlashcardContext.mockReturnValue({
        ...defaultContextValue,
        isCardSaved: mockIsCardSaved,
      });

      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
          variant="icon"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Remove from Flashcards');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('renders saved state correctly for button variant', () => {
      mockIsCardSaved.mockReturnValue(true);
      mockUseFlashcardContext.mockReturnValue({
        ...defaultContextValue,
        isCardSaved: mockIsCardSaved,
      });

      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
          variant="button"
        />
      );

      expect(screen.getByText('In Flashcards')).toBeInTheDocument();
    });

    it('applies correct data-testid', () => {
      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
        />
      );

      expect(screen.getByTestId('add-to-flashcard-button-milestone-E2017_TRANSFORMER')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
          className="custom-class"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  // =========================================================================
  // Size Variant Tests
  // =========================================================================

  describe('Size Variants', () => {
    it('renders small size for icon variant', () => {
      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
          variant="icon"
          size="sm"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('p-1.5');
    });

    it('renders medium size for icon variant', () => {
      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
          variant="icon"
          size="md"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('p-2');
    });

    it('renders large size for icon variant', () => {
      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
          variant="icon"
          size="lg"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('p-2.5');
    });

    it('renders small size for button variant', () => {
      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
          variant="button"
          size="sm"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-2');
      expect(button).toHaveClass('py-1');
      expect(button).toHaveClass('text-xs');
    });

    it('renders medium size for button variant', () => {
      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
          variant="button"
          size="md"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3');
      expect(button).toHaveClass('py-1.5');
      expect(button).toHaveClass('text-sm');
    });

    it('renders large size for button variant', () => {
      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
          variant="button"
          size="lg"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4');
      expect(button).toHaveClass('py-2');
      expect(button).toHaveClass('text-base');
    });
  });

  // =========================================================================
  // Interaction Tests
  // =========================================================================

  describe('Interactions', () => {
    it('calls addCard when clicking unsaved card', async () => {
      const user = userEvent.setup();

      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockAddCard).toHaveBeenCalledWith('milestone', 'E2017_TRANSFORMER');
    });

    it('calls removeCard when clicking saved card', async () => {
      const user = userEvent.setup();
      const mockCard = { id: 'existing-card-id' };

      mockIsCardSaved.mockReturnValue(true);
      mockGetCardBySource.mockReturnValue(mockCard);
      mockUseFlashcardContext.mockReturnValue({
        ...defaultContextValue,
        isCardSaved: mockIsCardSaved,
        getCardBySource: mockGetCardBySource,
      });

      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockRemoveCard).toHaveBeenCalledWith('existing-card-id');
    });

    it('calls onToggle callback after adding', async () => {
      const user = userEvent.setup();
      const onToggle = jest.fn();

      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
          onToggle={onToggle}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('calls onToggle callback after removing', async () => {
      const user = userEvent.setup();
      const onToggle = jest.fn();
      const mockCard = { id: 'existing-card-id' };

      mockIsCardSaved.mockReturnValue(true);
      mockGetCardBySource.mockReturnValue(mockCard);
      mockUseFlashcardContext.mockReturnValue({
        ...defaultContextValue,
        isCardSaved: mockIsCardSaved,
        getCardBySource: mockGetCardBySource,
      });

      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
          onToggle={onToggle}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(onToggle).toHaveBeenCalledWith(false);
    });

    it('stops event propagation on click', async () => {
      const user = userEvent.setup();
      const parentClickHandler = jest.fn();

      render(
        <div onClick={parentClickHandler}>
          <AddToFlashcardButton
            sourceType="milestone"
            sourceId="E2017_TRANSFORMER"
          />
        </div>
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Keyboard Accessibility Tests
  // =========================================================================

  describe('Keyboard Accessibility', () => {
    it('triggers action on Enter key', async () => {
      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
        />
      );

      const button = screen.getByRole('button');
      button.focus();
      fireEvent.keyDown(button, { key: 'Enter' });

      expect(mockAddCard).toHaveBeenCalled();
    });

    it('triggers action on Space key', async () => {
      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
        />
      );

      const button = screen.getByRole('button');
      button.focus();
      fireEvent.keyDown(button, { key: ' ' });

      expect(mockAddCard).toHaveBeenCalled();
    });

    it('has correct aria-pressed state when unsaved', () => {
      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });

    it('has correct aria-pressed state when saved', () => {
      mockIsCardSaved.mockReturnValue(true);
      mockUseFlashcardContext.mockReturnValue({
        ...defaultContextValue,
        isCardSaved: mockIsCardSaved,
      });

      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });
  });

  // =========================================================================
  // Tooltip Tests
  // =========================================================================

  describe('Tooltip', () => {
    it('shows tooltip on mouse enter for icon variant', async () => {
      const user = userEvent.setup();

      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
          variant="icon"
        />
      );

      const button = screen.getByRole('button');
      await user.hover(button);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toHaveTextContent('Add to Flashcards');
      });
    });

    it('shows "Remove from Flashcards" tooltip when saved', async () => {
      const user = userEvent.setup();

      mockIsCardSaved.mockReturnValue(true);
      mockUseFlashcardContext.mockReturnValue({
        ...defaultContextValue,
        isCardSaved: mockIsCardSaved,
      });

      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
          variant="icon"
        />
      );

      const button = screen.getByRole('button');
      await user.hover(button);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toHaveTextContent('Remove from Flashcards');
      });
    });

    it('hides tooltip on mouse leave', async () => {
      const user = userEvent.setup();

      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
          variant="icon"
        />
      );

      const button = screen.getByRole('button');
      await user.hover(button);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });

      await user.unhover(button);

      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });

    it('shows "Click to remove" tooltip for saved button variant', async () => {
      const user = userEvent.setup();

      mockIsCardSaved.mockReturnValue(true);
      mockUseFlashcardContext.mockReturnValue({
        ...defaultContextValue,
        isCardSaved: mockIsCardSaved,
      });

      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
          variant="button"
        />
      );

      const button = screen.getByRole('button');
      await user.hover(button);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toHaveTextContent('Click to remove');
      });
    });

    it('shows tooltip on focus', async () => {
      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
          variant="icon"
        />
      );

      const button = screen.getByRole('button');
      fireEvent.focus(button);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('hides tooltip on blur', async () => {
      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
          variant="icon"
        />
      );

      const button = screen.getByRole('button');
      fireEvent.focus(button);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });

      fireEvent.blur(button);

      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Source Type Tests
  // =========================================================================

  describe('Source Types', () => {
    it('handles milestone source type', async () => {
      const user = userEvent.setup();

      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
        />
      );

      await user.click(screen.getByRole('button'));

      expect(mockAddCard).toHaveBeenCalledWith('milestone', 'E2017_TRANSFORMER');
    });

    it('handles concept source type', async () => {
      const user = userEvent.setup();

      render(
        <AddToFlashcardButton
          sourceType="concept"
          sourceId="C_SELF_ATTENTION"
        />
      );

      await user.click(screen.getByRole('button'));

      expect(mockAddCard).toHaveBeenCalledWith('concept', 'C_SELF_ATTENTION');
    });

    it('creates correct testid for concept', () => {
      render(
        <AddToFlashcardButton
          sourceType="concept"
          sourceId="C_SELF_ATTENTION"
        />
      );

      expect(screen.getByTestId('add-to-flashcard-button-concept-C_SELF_ATTENTION')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles addCard returning null gracefully', async () => {
      const user = userEvent.setup();
      const onToggle = jest.fn();
      mockAddCard.mockReturnValue(null);

      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
          onToggle={onToggle}
        />
      );

      await user.click(screen.getByRole('button'));

      // onToggle should not be called when addCard returns null
      expect(onToggle).not.toHaveBeenCalled();
    });

    it('handles getCardBySource returning undefined when removing', async () => {
      const user = userEvent.setup();

      mockIsCardSaved.mockReturnValue(true);
      mockGetCardBySource.mockReturnValue(undefined);
      mockUseFlashcardContext.mockReturnValue({
        ...defaultContextValue,
        isCardSaved: mockIsCardSaved,
        getCardBySource: mockGetCardBySource,
      });

      render(
        <AddToFlashcardButton
          sourceType="milestone"
          sourceId="E2017_TRANSFORMER"
        />
      );

      await user.click(screen.getByRole('button'));

      // removeCard should not be called if card not found
      expect(mockRemoveCard).not.toHaveBeenCalled();
    });
  });
});
