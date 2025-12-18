/**
 * CreatePackModal Component Tests
 *
 * Tests for the create pack modal including:
 * - Name input validation (1-50 chars, unique)
 * - Optional description textarea
 * - Color picker functionality
 * - Create button disabled state
 * - Success feedback display
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { CreatePackModal } from '../../../../src/components/Flashcards/CreatePackModal';
import { PACK_COLORS } from '../../../../src/types/flashcard';

// =============================================================================
// Mocks
// =============================================================================

const mockCreatePack = jest.fn();

// Mock the FlashcardContext
jest.mock('../../../../src/contexts/FlashcardContext', () => ({
  useFlashcardContext: () => ({
    packs: [
      { id: 'pack-1', name: 'All Cards', color: '#3B82F6', isDefault: true, createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'pack-2', name: 'Existing Pack', color: '#10B981', isDefault: false, createdAt: '2024-01-01T00:00:00.000Z' },
    ],
    createPack: mockCreatePack,
  }),
}));

// =============================================================================
// Test Setup
// =============================================================================

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

function renderModal(props: Partial<React.ComponentProps<typeof CreatePackModal>> = {}) {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
  };
  return render(
    <TestWrapper>
      <CreatePackModal {...defaultProps} {...props} />
    </TestWrapper>
  );
}

// =============================================================================
// Tests
// =============================================================================

describe('CreatePackModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreatePack.mockReturnValue({
      id: 'new-pack-id',
      name: 'Test Pack',
      color: '#3B82F6',
      isDefault: false,
      createdAt: new Date().toISOString(),
    });
  });

  describe('Modal Visibility', () => {
    it('should render when isOpen is true', () => {
      renderModal({ isOpen: true });
      expect(screen.getByTestId('create-pack-modal')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      renderModal({ isOpen: false });
      expect(screen.queryByTestId('create-pack-modal')).not.toBeInTheDocument();
    });

    it('should display Create New Pack header', () => {
      renderModal();
      expect(screen.getByRole('heading', { name: /create new pack/i })).toBeInTheDocument();
    });
  });

  describe('Name Input Validation', () => {
    it('should display name input field', () => {
      renderModal();
      expect(screen.getByTestId('pack-name-input')).toBeInTheDocument();
    });

    it('should have Create button disabled when name is empty', () => {
      renderModal();
      const createButton = screen.getByTestId('create-button');
      expect(createButton).toBeDisabled();
    });

    it('should enable Create button when valid name is entered', async () => {
      renderModal();
      const input = screen.getByTestId('pack-name-input');
      await userEvent.type(input, 'New Pack');

      const createButton = screen.getByTestId('create-button');
      expect(createButton).not.toBeDisabled();
    });

    it('should show error for duplicate pack name', async () => {
      renderModal();
      const input = screen.getByTestId('pack-name-input');
      await userEvent.type(input, 'Existing Pack');

      expect(screen.getByText(/a pack with this name already exists/i)).toBeInTheDocument();
      expect(screen.getByTestId('create-button')).toBeDisabled();
    });

    it('should show error when name exceeds 50 characters', async () => {
      renderModal();
      const input = screen.getByTestId('pack-name-input');
      const longName = 'a'.repeat(51);
      await userEvent.type(input, longName);

      expect(screen.getByText(/name must be 50 characters or less/i)).toBeInTheDocument();
      expect(screen.getByTestId('create-button')).toBeDisabled();
    });

    it('should display character count', async () => {
      renderModal();
      const input = screen.getByTestId('pack-name-input');
      await userEvent.type(input, 'Test Pack');

      expect(screen.getByText('9/50')).toBeInTheDocument();
    });

    it('should ignore leading/trailing whitespace in validation', async () => {
      renderModal();
      const input = screen.getByTestId('pack-name-input');
      await userEvent.type(input, '  Existing Pack  ');

      // Should detect duplicate even with whitespace
      expect(screen.getByText(/a pack with this name already exists/i)).toBeInTheDocument();
    });
  });

  describe('Description Input', () => {
    it('should display description textarea', () => {
      renderModal();
      expect(screen.getByTestId('pack-description-input')).toBeInTheDocument();
    });

    it('should allow entering description', async () => {
      renderModal();
      const textarea = screen.getByTestId('pack-description-input');
      await userEvent.type(textarea, 'This is a test description');

      expect(textarea).toHaveValue('This is a test description');
    });

    it('should display description character count', async () => {
      renderModal();
      const textarea = screen.getByTestId('pack-description-input');
      await userEvent.type(textarea, 'Test');

      expect(screen.getByText('4/200')).toBeInTheDocument();
    });
  });

  describe('Color Picker', () => {
    it('should display all 8 color options', () => {
      renderModal();
      PACK_COLORS.forEach((color) => {
        const colorLabel = {
          '#3B82F6': 'blue',
          '#10B981': 'green',
          '#F59E0B': 'amber',
          '#EF4444': 'red',
          '#8B5CF6': 'purple',
          '#EC4899': 'pink',
          '#06B6D4': 'cyan',
          '#6B7280': 'gray',
        }[color];
        expect(screen.getByTestId(`color-${colorLabel}`)).toBeInTheDocument();
      });
    });

    it('should have first color selected by default', () => {
      renderModal();
      const blueButton = screen.getByTestId('color-blue');
      expect(blueButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should allow selecting different colors', async () => {
      renderModal();
      const purpleButton = screen.getByTestId('color-purple');
      await userEvent.click(purpleButton);

      expect(purpleButton).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByTestId('color-blue')).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('Form Submission', () => {
    it('should call createPack with correct arguments', async () => {
      renderModal();
      const input = screen.getByTestId('pack-name-input');
      const textarea = screen.getByTestId('pack-description-input');

      await userEvent.type(input, 'My New Pack');
      await userEvent.type(textarea, 'Pack description');

      // Select purple color
      await userEvent.click(screen.getByTestId('color-purple'));

      const createButton = screen.getByTestId('create-button');
      await userEvent.click(createButton);

      expect(mockCreatePack).toHaveBeenCalledWith('My New Pack', 'Pack description', '#8B5CF6');
    });

    it('should call createPack without description when empty', async () => {
      renderModal();
      const input = screen.getByTestId('pack-name-input');
      await userEvent.type(input, 'Simple Pack');

      const createButton = screen.getByTestId('create-button');
      await userEvent.click(createButton);

      expect(mockCreatePack).toHaveBeenCalledWith('Simple Pack', undefined, '#3B82F6');
    });

    it('should show success screen after creation', async () => {
      renderModal();
      const input = screen.getByTestId('pack-name-input');
      await userEvent.type(input, 'Success Pack');

      const createButton = screen.getByTestId('create-button');
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/pack created!/i)).toBeInTheDocument();
      });
    });

    it('should call onCreated callback with pack ID', async () => {
      const onCreated = jest.fn();
      renderModal({ onCreated });

      const input = screen.getByTestId('pack-name-input');
      await userEvent.type(input, 'Callback Pack');

      const createButton = screen.getByTestId('create-button');
      await userEvent.click(createButton);

      expect(onCreated).toHaveBeenCalledWith('new-pack-id');
    });
  });

  describe('Success Screen', () => {
    beforeEach(async () => {
      renderModal();
      const input = screen.getByTestId('pack-name-input');
      await userEvent.type(input, 'Test Pack');
      await userEvent.click(screen.getByTestId('create-button'));
    });

    it('should display success message', async () => {
      await waitFor(() => {
        expect(screen.getByText(/pack created!/i)).toBeInTheDocument();
      });
    });

    it('should show View Pack link', async () => {
      await waitFor(() => {
        const viewPackButton = screen.getByTestId('view-pack-button');
        expect(viewPackButton).toBeInTheDocument();
        expect(viewPackButton).toHaveAttribute('href', '/study/packs/new-pack-id');
      });
    });

    it('should show Close button', async () => {
      await waitFor(() => {
        expect(screen.getByTestId('close-success-button')).toBeInTheDocument();
      });
    });
  });

  describe('Modal Close Behavior', () => {
    it('should call onClose when close button is clicked', async () => {
      const onClose = jest.fn();
      renderModal({ onClose });

      const closeButton = screen.getByTestId('close-modal-button');
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when cancel button is clicked', async () => {
      const onClose = jest.fn();
      renderModal({ onClose });

      const cancelButton = screen.getByTestId('cancel-button');
      await userEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking backdrop', async () => {
      const onClose = jest.fn();
      renderModal({ onClose });

      const backdrop = screen.getByTestId('create-pack-modal');
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when pressing Escape', async () => {
      const onClose = jest.fn();
      renderModal({ onClose });

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      renderModal();
      expect(screen.getByLabelText(/pack name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('should have color radiogroup with aria-label', () => {
      renderModal();
      expect(screen.getByRole('radiogroup', { name: /pack color/i })).toBeInTheDocument();
    });

    it('should have aria-invalid on name input when error', async () => {
      renderModal();
      const input = screen.getByTestId('pack-name-input');
      await userEvent.type(input, 'Existing Pack');

      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should focus name input when modal opens', async () => {
      renderModal();
      await waitFor(() => {
        expect(screen.getByTestId('pack-name-input')).toHaveFocus();
      });
    });
  });
});
