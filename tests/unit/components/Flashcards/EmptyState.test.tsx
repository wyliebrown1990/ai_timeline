/**
 * EmptyState Component Tests
 *
 * Tests for the enhanced empty state component including:
 * - Value proposition display
 * - Featured deck suggestion
 * - Interactive study example
 * - CTAs and navigation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { EmptyState } from '../../../../src/components/Flashcards/EmptyState';

// =============================================================================
// Test Setup
// =============================================================================

/**
 * Wrapper component for tests that require routing context.
 */
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

/**
 * Helper to render EmptyState with required context.
 */
function renderEmptyState(props: Partial<React.ComponentProps<typeof EmptyState>> = {}) {
  const defaultProps = {
    onBrowseDecks: jest.fn(),
  };

  return render(
    <TestWrapper>
      <EmptyState {...defaultProps} {...props} />
    </TestWrapper>
  );
}

// =============================================================================
// Tests
// =============================================================================

describe('EmptyState', () => {
  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render welcome message', () => {
      renderEmptyState();

      expect(screen.getByText('Welcome to the Study Center')).toBeInTheDocument();
      expect(
        screen.getByText('Master AI concepts with smart flashcards that adapt to your learning pace.')
      ).toBeInTheDocument();
    });

    it('should render value proposition cards', () => {
      renderEmptyState();

      expect(screen.getByText('Spaced Repetition')).toBeInTheDocument();
      expect(screen.getByText('Track Progress')).toBeInTheDocument();
      expect(screen.getByText('Just Minutes a Day')).toBeInTheDocument();
    });

    it('should render value proposition descriptions', () => {
      renderEmptyState();

      expect(
        screen.getByText('Review cards at optimal intervals for long-term retention')
      ).toBeInTheDocument();
      expect(
        screen.getByText('See your streaks, mastery levels, and learning statistics')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Short daily sessions build lasting knowledge over time')
      ).toBeInTheDocument();
    });

    it('should render featured deck section', () => {
      renderEmptyState();

      expect(screen.getByText('Recommended for You')).toBeInTheDocument();
      expect(screen.getByText('AI Essentials')).toBeInTheDocument();
      expect(screen.getByText('Recommended')).toBeInTheDocument();
    });

    it('should render featured deck details', () => {
      renderEmptyState();

      // AI Essentials deck has 15 cards and ~8 min
      expect(screen.getByText(/15 cards/)).toBeInTheDocument();
      expect(screen.getByText(/~8 min/)).toBeInTheDocument();
    });

    it('should render study example section', () => {
      renderEmptyState();

      expect(screen.getByText('What Studying Looks Like')).toBeInTheDocument();
      expect(screen.getByTestId('study-example-card')).toBeInTheDocument();
    });

    it('should show example question', () => {
      renderEmptyState();

      expect(screen.getByText('What is a Transformer?')).toBeInTheDocument();
      expect(screen.getByText('Tap to reveal answer')).toBeInTheDocument();
    });

    it('should render bottom CTAs', () => {
      renderEmptyState();

      expect(screen.getByTestId('browse-all-decks-button')).toBeInTheDocument();
      expect(screen.getByText('Explore Timeline')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('Interactions', () => {
    it('should call onBrowseDecks when "Get Started with This Deck" clicked', () => {
      const onBrowseDecks = jest.fn();
      renderEmptyState({ onBrowseDecks });

      fireEvent.click(screen.getByTestId('featured-deck-cta'));

      expect(onBrowseDecks).toHaveBeenCalled();
    });

    it('should call onBrowseDecks when "Browse All Decks" clicked', () => {
      const onBrowseDecks = jest.fn();
      renderEmptyState({ onBrowseDecks });

      fireEvent.click(screen.getByTestId('browse-all-decks-button'));

      expect(onBrowseDecks).toHaveBeenCalled();
    });

    it('should have link to timeline', () => {
      renderEmptyState();

      const timelineLink = screen.getByText('Explore Timeline').closest('a');
      expect(timelineLink).toHaveAttribute('href', '/timeline');
    });
  });

  // ===========================================================================
  // Study Example Tests
  // ===========================================================================

  describe('Study Example', () => {
    it('should flip card when clicked', async () => {
      renderEmptyState();

      const card = screen.getByTestId('study-example-card');
      fireEvent.click(card);

      await waitFor(() => {
        // Answer should be visible after flip
        expect(
          screen.getByText(/neural network architecture that processes sequences/)
        ).toBeInTheDocument();
      });
    });

    it('should show rating buttons after flip', async () => {
      renderEmptyState();

      const card = screen.getByTestId('study-example-card');
      fireEvent.click(card);

      await waitFor(() => {
        expect(screen.getByTestId('rating-buttons')).toBeInTheDocument();
      });

      // Check all rating buttons are visible
      expect(screen.getByText('Again')).toBeInTheDocument();
      expect(screen.getByText('Hard')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
      expect(screen.getByText('Easy')).toBeInTheDocument();
    });

    it('should reset card when rating button clicked', async () => {
      renderEmptyState();

      // Flip the card
      const card = screen.getByTestId('study-example-card');
      fireEvent.click(card);

      await waitFor(() => {
        expect(screen.getByTestId('rating-buttons')).toBeInTheDocument();
      });

      // Click a rating button
      fireEvent.click(screen.getByText('Good'));

      await waitFor(() => {
        // Rating buttons should be hidden
        expect(screen.queryByTestId('rating-buttons')).not.toBeInTheDocument();
      });

      // Question should be visible again
      expect(screen.getByText('Tap to reveal answer')).toBeInTheDocument();
    });

    it('should show reset button after flip', async () => {
      renderEmptyState();

      const card = screen.getByTestId('study-example-card');
      fireEvent.click(card);

      await waitFor(() => {
        expect(screen.getByLabelText('Reset example')).toBeInTheDocument();
      });
    });

    it('should reset card when reset button clicked', async () => {
      renderEmptyState();

      // Flip the card
      const card = screen.getByTestId('study-example-card');
      fireEvent.click(card);

      await waitFor(() => {
        expect(screen.getByLabelText('Reset example')).toBeInTheDocument();
      });

      // Click reset
      fireEvent.click(screen.getByLabelText('Reset example'));

      await waitFor(() => {
        // Card should be back to question side
        expect(screen.getByText('Tap to reveal answer')).toBeInTheDocument();
        expect(screen.queryByTestId('rating-buttons')).not.toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have testid on main container', () => {
      renderEmptyState();

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    it('should have accessible button labels', () => {
      renderEmptyState();

      expect(screen.getByText('Get Started with This Deck')).toBeInTheDocument();
      expect(screen.getByText('Browse All Decks')).toBeInTheDocument();
      expect(screen.getByText('Explore Timeline')).toBeInTheDocument();
    });

    it('should have accessible reset button', async () => {
      renderEmptyState();

      // Flip card to show reset button
      fireEvent.click(screen.getByTestId('study-example-card'));

      await waitFor(() => {
        const resetButton = screen.getByLabelText('Reset example');
        expect(resetButton).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Styling Tests
  // ===========================================================================

  describe('Styling', () => {
    it('should apply custom className', () => {
      renderEmptyState({ className: 'custom-class' });

      const container = screen.getByTestId('empty-state');
      expect(container).toHaveClass('custom-class');
    });
  });
});
