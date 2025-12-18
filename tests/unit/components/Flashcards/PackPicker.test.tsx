/**
 * PackPicker Component Tests
 *
 * Tests the pack selection popover component including:
 * - Pack list rendering with checkboxes
 * - Multi-pack selection
 * - Inline pack creation
 * - Color picker
 * - Close behavior (outside click, Escape key)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PackPicker } from '../../../../src/components/Flashcards/PackPicker';
import { useFlashcardContext } from '../../../../src/contexts/FlashcardContext';
import { PACK_COLORS } from '../../../../src/types/flashcard';

// Mock the FlashcardContext
jest.mock('../../../../src/contexts/FlashcardContext', () => ({
  useFlashcardContext: jest.fn(),
}));

const mockUseFlashcardContext = useFlashcardContext as jest.MockedFunction<typeof useFlashcardContext>;

describe('PackPicker', () => {
  // Mock packs
  const mockPacks = [
    { id: 'pack-1', name: 'All Cards', color: '#3B82F6', isDefault: true, createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 'pack-2', name: 'Recently Added', color: '#10B981', isDefault: true, createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 'pack-3', name: 'Custom Pack', color: '#F59E0B', isDefault: false, createdAt: '2024-01-02T00:00:00.000Z' },
  ];

  const mockCreatePack = jest.fn();
  const mockOnPackToggle = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnPackCreated = jest.fn();

  const defaultContextValue = {
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
    addCard: jest.fn(),
    removeCard: jest.fn(),
    getCardBySource: jest.fn(),
    getDueCards: jest.fn(() => []),
    recordReview: jest.fn(),
    createPack: mockCreatePack,
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
    mockCreatePack.mockReturnValue({
      id: 'new-pack-id',
      name: 'New Pack',
      color: '#3B82F6',
      isDefault: false,
      createdAt: new Date().toISOString(),
    });
    mockUseFlashcardContext.mockReturnValue(defaultContextValue);
  });

  // =========================================================================
  // Rendering Tests
  // =========================================================================

  describe('Rendering', () => {
    it('renders the pack picker dialog', () => {
      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Add to Pack')).toBeInTheDocument();
    });

    it('renders all packs from context', () => {
      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('All Cards')).toBeInTheDocument();
      expect(screen.getByText('Recently Added')).toBeInTheDocument();
      expect(screen.getByText('Custom Pack')).toBeInTheDocument();
    });

    it('shows default badge for default packs', () => {
      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      // Default packs should have "(default)" text
      const defaultBadges = screen.getAllByText('(default)');
      expect(defaultBadges).toHaveLength(2); // All Cards and Recently Added
    });

    it('shows color dots for each pack', () => {
      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      // Each pack should have a color indicator
      mockPacks.forEach((pack) => {
        const colorDot = screen.getByLabelText(`Color: ${pack.color}`);
        expect(colorDot).toBeInTheDocument();
        expect(colorDot).toHaveStyle({ backgroundColor: pack.color });
      });
    });

    it('shows Create New Pack button', () => {
      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('create-pack-button')).toBeInTheDocument();
      expect(screen.getByText('Create New Pack')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
          className="custom-class"
        />
      );

      expect(screen.getByTestId('pack-picker')).toHaveClass('custom-class');
    });

    it('shows empty state when no packs', () => {
      mockUseFlashcardContext.mockReturnValue({
        ...defaultContextValue,
        packs: [],
      });

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('No packs yet. Create one below!')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Selection Tests
  // =========================================================================

  describe('Pack Selection', () => {
    it('shows selected state for packs in selectedPackIds', () => {
      render(
        <PackPicker
          selectedPackIds={['pack-1', 'pack-3']}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      // Pack 1 and 3 should be selected
      expect(screen.getByTestId('pack-option-pack-1')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('pack-option-pack-3')).toHaveAttribute('aria-pressed', 'true');
      // Pack 2 should not be selected
      expect(screen.getByTestId('pack-option-pack-2')).toHaveAttribute('aria-pressed', 'false');
    });

    it('calls onPackToggle when clicking unselected pack', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('pack-option-pack-1'));

      expect(mockOnPackToggle).toHaveBeenCalledWith('pack-1', true);
    });

    it('calls onPackToggle when clicking selected pack', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={['pack-1']}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('pack-option-pack-1'));

      expect(mockOnPackToggle).toHaveBeenCalledWith('pack-1', false);
    });

    it('allows selecting multiple packs', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={['pack-1']}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('pack-option-pack-2'));
      await user.click(screen.getByTestId('pack-option-pack-3'));

      expect(mockOnPackToggle).toHaveBeenCalledWith('pack-2', true);
      expect(mockOnPackToggle).toHaveBeenCalledWith('pack-3', true);
    });
  });

  // =========================================================================
  // Pack Creation Tests
  // =========================================================================

  describe('Pack Creation', () => {
    it('shows create form when clicking Create New Pack', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('create-pack-button'));

      expect(screen.getByTestId('create-pack-form')).toBeInTheDocument();
      expect(screen.getByTestId('new-pack-name-input')).toBeInTheDocument();
    });

    it('focuses name input when entering create mode', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('create-pack-button'));

      await waitFor(() => {
        expect(screen.getByTestId('new-pack-name-input')).toHaveFocus();
      });
    });

    it('shows color picker with all colors', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('create-pack-button'));

      PACK_COLORS.forEach((color) => {
        expect(screen.getByTestId(`color-option-${color}`)).toBeInTheDocument();
      });
    });

    it('creates pack with entered name and selected color', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
          onPackCreated={mockOnPackCreated}
        />
      );

      await user.click(screen.getByTestId('create-pack-button'));
      await user.type(screen.getByTestId('new-pack-name-input'), 'My New Pack');
      await user.click(screen.getByTestId(`color-option-${PACK_COLORS[2]}`));
      await user.click(screen.getByTestId('confirm-create-button'));

      expect(mockCreatePack).toHaveBeenCalledWith('My New Pack', undefined, PACK_COLORS[2]);
    });

    it('auto-selects newly created pack', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('create-pack-button'));
      await user.type(screen.getByTestId('new-pack-name-input'), 'My New Pack');
      await user.click(screen.getByTestId('confirm-create-button'));

      expect(mockOnPackToggle).toHaveBeenCalledWith('new-pack-id', true);
    });

    it('calls onPackCreated callback when pack is created', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
          onPackCreated={mockOnPackCreated}
        />
      );

      await user.click(screen.getByTestId('create-pack-button'));
      await user.type(screen.getByTestId('new-pack-name-input'), 'My New Pack');
      await user.click(screen.getByTestId('confirm-create-button'));

      expect(mockOnPackCreated).toHaveBeenCalled();
    });

    it('creates pack on Enter key in name input', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('create-pack-button'));
      await user.type(screen.getByTestId('new-pack-name-input'), 'My New Pack{Enter}');

      expect(mockCreatePack).toHaveBeenCalledWith('My New Pack', undefined, PACK_COLORS[0]);
    });

    it('cancels create mode when clicking Cancel', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('create-pack-button'));
      expect(screen.getByTestId('create-pack-form')).toBeInTheDocument();

      await user.click(screen.getByTestId('cancel-create-button'));

      expect(screen.queryByTestId('create-pack-form')).not.toBeInTheDocument();
      expect(screen.getByTestId('create-pack-button')).toBeInTheDocument();
    });

    it('resets form when cancelling', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('create-pack-button'));
      await user.type(screen.getByTestId('new-pack-name-input'), 'Some Name');
      await user.click(screen.getByTestId('cancel-create-button'));

      // Re-open create mode
      await user.click(screen.getByTestId('create-pack-button'));

      expect(screen.getByTestId('new-pack-name-input')).toHaveValue('');
    });
  });

  // =========================================================================
  // Validation Tests
  // =========================================================================

  describe('Validation', () => {
    it('shows error for empty pack name', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('create-pack-button'));
      await user.click(screen.getByTestId('confirm-create-button'));

      expect(screen.getByText('Pack name is required')).toBeInTheDocument();
      expect(mockCreatePack).not.toHaveBeenCalled();
    });

    it('shows error for whitespace-only pack name', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('create-pack-button'));
      await user.type(screen.getByTestId('new-pack-name-input'), '   ');
      await user.click(screen.getByTestId('confirm-create-button'));

      expect(screen.getByText('Pack name is required')).toBeInTheDocument();
    });

    it('shows error for duplicate pack name', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('create-pack-button'));
      await user.type(screen.getByTestId('new-pack-name-input'), 'All Cards');
      await user.click(screen.getByTestId('confirm-create-button'));

      expect(screen.getByText('A pack with this name already exists')).toBeInTheDocument();
      expect(mockCreatePack).not.toHaveBeenCalled();
    });

    it('duplicate check is case-insensitive', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('create-pack-button'));
      await user.type(screen.getByTestId('new-pack-name-input'), 'ALL CARDS');
      await user.click(screen.getByTestId('confirm-create-button'));

      expect(screen.getByText('A pack with this name already exists')).toBeInTheDocument();
    });

    it('clears error when typing in name input', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('create-pack-button'));
      await user.click(screen.getByTestId('confirm-create-button'));
      expect(screen.getByText('Pack name is required')).toBeInTheDocument();

      await user.type(screen.getByTestId('new-pack-name-input'), 'N');
      expect(screen.queryByText('Pack name is required')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Close Behavior Tests
  // =========================================================================

  describe('Close Behavior', () => {
    it('calls onClose when clicking outside', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <div data-testid="outside">Outside element</div>
          <PackPicker
            selectedPackIds={[]}
            onPackToggle={mockOnPackToggle}
            onClose={mockOnClose}
          />
        </div>
      );

      await user.click(screen.getByTestId('outside'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not close when clicking inside', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByText('Add to Pack'));

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('calls onClose when pressing Escape', () => {
      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('cancels create mode first on Escape, then closes', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      // Enter create mode
      await user.click(screen.getByTestId('create-pack-button'));
      expect(screen.getByTestId('create-pack-form')).toBeInTheDocument();

      // First Escape cancels create mode
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByTestId('create-pack-form')).not.toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalled();

      // Second Escape closes the picker
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Color Picker Tests
  // =========================================================================

  describe('Color Picker', () => {
    it('selects first color by default', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('create-pack-button'));

      const firstColorButton = screen.getByTestId(`color-option-${PACK_COLORS[0]}`);
      expect(firstColorButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('updates selected color when clicking different color', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('create-pack-button'));
      await user.click(screen.getByTestId(`color-option-${PACK_COLORS[3]}`));

      const selectedColor = screen.getByTestId(`color-option-${PACK_COLORS[3]}`);
      expect(selectedColor).toHaveAttribute('aria-pressed', 'true');

      // Previous color should be deselected
      const firstColor = screen.getByTestId(`color-option-${PACK_COLORS[0]}`);
      expect(firstColor).toHaveAttribute('aria-pressed', 'false');
    });
  });

  // =========================================================================
  // Accessibility Tests
  // =========================================================================

  describe('Accessibility', () => {
    it('has accessible dialog role', () => {
      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Select packs');
    });

    it('has accessible color picker radiogroup', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('create-pack-button'));

      expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-label', 'Pack color');
    });

    it('has aria-pressed on pack options', () => {
      render(
        <PackPicker
          selectedPackIds={['pack-1']}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('pack-option-pack-1')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('pack-option-pack-2')).toHaveAttribute('aria-pressed', 'false');
    });

    it('has aria-invalid on name input when error', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('create-pack-button'));
      await user.click(screen.getByTestId('confirm-create-button'));

      expect(screen.getByTestId('new-pack-name-input')).toHaveAttribute('aria-invalid', 'true');
    });

    it('error message has role="alert"', async () => {
      const user = userEvent.setup();

      render(
        <PackPicker
          selectedPackIds={[]}
          onPackToggle={mockOnPackToggle}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('create-pack-button'));
      await user.click(screen.getByTestId('confirm-create-button'));

      expect(screen.getByRole('alert')).toHaveTextContent('Pack name is required');
    });
  });
});
