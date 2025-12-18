/**
 * DataManagement Component Tests
 *
 * Tests for the data management component including:
 * - Export button functionality
 * - Clear data with double confirmation
 * - Data summary display
 * - Disabled states
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { DataManagement } from '../../../../src/components/Flashcards/DataManagement';
import * as flashcardStats from '../../../../src/lib/flashcardStats';

// =============================================================================
// Mocks
// =============================================================================

jest.mock('../../../../src/lib/flashcardStats', () => ({
  downloadFlashcardData: jest.fn(),
  clearAllFlashcardData: jest.fn(),
  getDataSummary: jest.fn(),
}));

const mockGetDataSummary = flashcardStats.getDataSummary as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  // Reset default mock return value before each test
  mockGetDataSummary.mockReturnValue({
    totalCards: 10,
    totalPacks: 3,
    totalReviews: 150,
    streakDays: 7,
    oldestCardDate: '2024-01-01T00:00:00Z',
  });
});

// =============================================================================
// Tests
// =============================================================================

describe('DataManagement', () => {
  describe('Component Rendering', () => {
    it('should render the data management container', () => {
      render(<DataManagement />);

      expect(screen.getByTestId('data-management')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<DataManagement className="custom-class" />);

      expect(screen.getByTestId('data-management')).toHaveClass('custom-class');
    });
  });

  describe('Data Summary', () => {
    it('should display data summary section', () => {
      render(<DataManagement />);

      expect(screen.getByTestId('data-summary')).toBeInTheDocument();
    });

    it('should display total cards count', () => {
      render(<DataManagement />);

      expect(screen.getByText(/10 flashcards/)).toBeInTheDocument();
    });

    it('should display total packs count', () => {
      render(<DataManagement />);

      expect(screen.getByText(/3 packs/)).toBeInTheDocument();
    });

    it('should display total reviews count', () => {
      render(<DataManagement />);

      expect(screen.getByText(/150 total reviews/)).toBeInTheDocument();
    });

    it('should display best streak', () => {
      render(<DataManagement />);

      expect(screen.getByText(/Best streak: 7 days/)).toBeInTheDocument();
    });

    it('should display first card date', () => {
      render(<DataManagement />);

      expect(screen.getByText(/First card:/)).toBeInTheDocument();
    });
  });

  describe('Export Button', () => {
    it('should render export button', () => {
      render(<DataManagement />);

      expect(screen.getByTestId('export-button')).toBeInTheDocument();
    });

    it('should have correct text', () => {
      render(<DataManagement />);

      expect(screen.getByText('Export Data')).toBeInTheDocument();
    });

    it('should call downloadFlashcardData when clicked', () => {
      render(<DataManagement />);

      fireEvent.click(screen.getByTestId('export-button'));

      expect(flashcardStats.downloadFlashcardData).toHaveBeenCalled();
    });

    it('should be disabled when no cards', () => {
      mockGetDataSummary.mockReturnValue({
        totalCards: 0,
        totalPacks: 0,
        totalReviews: 0,
        streakDays: 0,
        oldestCardDate: null,
      });

      render(<DataManagement />);

      expect(screen.getByTestId('export-button')).toBeDisabled();
    });

    it('should show success message after export', () => {
      render(<DataManagement />);

      fireEvent.click(screen.getByTestId('export-button'));

      expect(screen.getByText('Exported!')).toBeInTheDocument();
    });
  });

  describe('Clear Data Button', () => {
    it('should render clear button', () => {
      render(<DataManagement />);

      expect(screen.getByTestId('clear-button')).toBeInTheDocument();
    });

    it('should have correct text', () => {
      render(<DataManagement />);

      expect(screen.getByText('Clear All Data')).toBeInTheDocument();
    });

    it('should be disabled when no data', () => {
      mockGetDataSummary.mockReturnValue({
        totalCards: 0,
        totalPacks: 0,
        totalReviews: 0,
        streakDays: 0,
        oldestCardDate: null,
      });

      render(<DataManagement />);

      expect(screen.getByTestId('clear-button')).toBeDisabled();
    });
  });

  describe('First Confirmation Dialog', () => {
    it('should show first confirmation dialog when clear clicked', () => {
      render(<DataManagement />);

      fireEvent.click(screen.getByTestId('clear-button'));

      expect(screen.getByTestId('confirmation-dialog-first')).toBeInTheDocument();
    });

    it('should display warning message', () => {
      render(<DataManagement />);

      fireEvent.click(screen.getByTestId('clear-button'));

      expect(screen.getByText('Clear All Data?')).toBeInTheDocument();
    });

    it('should display data to be deleted', () => {
      render(<DataManagement />);

      fireEvent.click(screen.getByTestId('clear-button'));

      const dialog = screen.getByTestId('confirmation-dialog-first');
      // Both summary and dialog show the same data, so check dialog-specific content
      expect(dialog).toHaveTextContent(/10 flashcards/);
      expect(dialog).toHaveTextContent(/150 review records/);
    });

    it('should close dialog when cancel clicked', () => {
      render(<DataManagement />);

      fireEvent.click(screen.getByTestId('clear-button'));
      fireEvent.click(screen.getByTestId('cancel-button'));

      expect(screen.queryByTestId('confirmation-dialog-first')).not.toBeInTheDocument();
    });

    it('should proceed to second confirmation when confirmed', () => {
      render(<DataManagement />);

      fireEvent.click(screen.getByTestId('clear-button'));
      fireEvent.click(screen.getByTestId('confirm-first-button'));

      expect(screen.getByTestId('confirmation-dialog-second')).toBeInTheDocument();
    });
  });

  describe('Second Confirmation Dialog', () => {
    it('should display final confirmation message', () => {
      render(<DataManagement />);

      fireEvent.click(screen.getByTestId('clear-button'));
      fireEvent.click(screen.getByTestId('confirm-first-button'));

      expect(screen.getByText('Final Confirmation')).toBeInTheDocument();
    });

    it('should have input field for DELETE confirmation', () => {
      render(<DataManagement />);

      fireEvent.click(screen.getByTestId('clear-button'));
      fireEvent.click(screen.getByTestId('confirm-first-button'));

      expect(screen.getByTestId('delete-confirmation-input')).toBeInTheDocument();
    });

    it('should have disabled delete button initially', () => {
      render(<DataManagement />);

      fireEvent.click(screen.getByTestId('clear-button'));
      fireEvent.click(screen.getByTestId('confirm-first-button'));

      expect(screen.getByTestId('confirm-final-button')).toBeDisabled();
    });

    it('should enable delete button when DELETE is typed', () => {
      render(<DataManagement />);

      fireEvent.click(screen.getByTestId('clear-button'));
      fireEvent.click(screen.getByTestId('confirm-first-button'));

      const input = screen.getByTestId('delete-confirmation-input');
      fireEvent.change(input, { target: { value: 'DELETE' } });

      expect(screen.getByTestId('confirm-final-button')).not.toBeDisabled();
    });

    it('should call clearAllFlashcardData when confirmed', () => {
      render(<DataManagement />);

      fireEvent.click(screen.getByTestId('clear-button'));
      fireEvent.click(screen.getByTestId('confirm-first-button'));

      const input = screen.getByTestId('delete-confirmation-input');
      fireEvent.change(input, { target: { value: 'DELETE' } });
      fireEvent.click(screen.getByTestId('confirm-final-button'));

      expect(flashcardStats.clearAllFlashcardData).toHaveBeenCalled();
    });

    it('should call onDataCleared callback after clearing', () => {
      const onDataCleared = jest.fn();
      render(<DataManagement onDataCleared={onDataCleared} />);

      fireEvent.click(screen.getByTestId('clear-button'));
      fireEvent.click(screen.getByTestId('confirm-first-button'));

      const input = screen.getByTestId('delete-confirmation-input');
      fireEvent.change(input, { target: { value: 'DELETE' } });
      fireEvent.click(screen.getByTestId('confirm-final-button'));

      expect(onDataCleared).toHaveBeenCalled();
    });
  });

  describe('Singular/Plural Text', () => {
    it('should use singular when count is 1', () => {
      mockGetDataSummary.mockReturnValue({
        totalCards: 1,
        totalPacks: 1,
        totalReviews: 1,
        streakDays: 1,
        oldestCardDate: null,
      });

      render(<DataManagement />);

      expect(screen.getByText('1 flashcard')).toBeInTheDocument();
      expect(screen.getByText('1 pack')).toBeInTheDocument();
      expect(screen.getByText('1 total review')).toBeInTheDocument();
      expect(screen.getByText(/Best streak: 1 day$/)).toBeInTheDocument();
    });
  });
});
