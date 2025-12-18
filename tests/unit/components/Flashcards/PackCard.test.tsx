/**
 * PackCard Component Tests
 *
 * Tests for the flashcard pack display card including:
 * - Pack name with color indicator
 * - Total and due card counts
 * - Navigation links
 * - Study button
 * - System pack visual distinction
 */

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PackCard } from '../../../../src/components/Flashcards/PackCard';
import type { FlashcardPack } from '../../../../src/types/flashcard';

// =============================================================================
// Test Setup
// =============================================================================

// Mock pack data
const createMockPack = (overrides: Partial<FlashcardPack> = {}): FlashcardPack => ({
  id: 'pack-1',
  name: 'Test Pack',
  color: '#3B82F6',
  isDefault: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

/**
 * Wrapper component for testing with BrowserRouter
 */
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

// =============================================================================
// Tests
// =============================================================================

describe('PackCard', () => {
  describe('Pack Display', () => {
    it('should display pack name', () => {
      const pack = createMockPack({ name: 'Transformers Era' });

      render(
        <TestWrapper>
          <PackCard pack={pack} totalCards={10} dueCards={3} />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: /transformers era/i })).toBeInTheDocument();
    });

    it('should display color indicator with pack color', () => {
      const pack = createMockPack({ color: '#8B5CF6' });

      render(
        <TestWrapper>
          <PackCard pack={pack} totalCards={10} dueCards={0} />
        </TestWrapper>
      );

      const colorIndicator = document.querySelector('[style*="background-color: rgb(139, 92, 246)"]');
      expect(colorIndicator).toBeInTheDocument();
    });

    it('should display total cards count', () => {
      const pack = createMockPack();

      render(
        <TestWrapper>
          <PackCard pack={pack} totalCards={15} dueCards={0} />
        </TestWrapper>
      );

      expect(screen.getByText('15 cards')).toBeInTheDocument();
    });

    it('should use singular "card" for single card', () => {
      const pack = createMockPack();

      render(
        <TestWrapper>
          <PackCard pack={pack} totalCards={1} dueCards={0} />
        </TestWrapper>
      );

      expect(screen.getByText('1 card')).toBeInTheDocument();
    });
  });

  describe('Due Cards Display', () => {
    it('should display due count badge when cards are due', () => {
      const pack = createMockPack();

      render(
        <TestWrapper>
          <PackCard pack={pack} totalCards={10} dueCards={5} />
        </TestWrapper>
      );

      expect(screen.getByText('5 due')).toBeInTheDocument();
    });

    it('should not display due count badge when no cards due', () => {
      const pack = createMockPack();

      render(
        <TestWrapper>
          <PackCard pack={pack} totalCards={10} dueCards={0} />
        </TestWrapper>
      );

      expect(screen.queryByText(/due/)).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should link to pack detail page', () => {
      const pack = createMockPack({ id: 'test-pack-id' });

      render(
        <TestWrapper>
          <PackCard pack={pack} totalCards={10} dueCards={0} />
        </TestWrapper>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/study/packs/test-pack-id');
    });
  });

  describe('Study Button', () => {
    it('should display Study This Pack button when cards are due', () => {
      const pack = createMockPack({ id: 'study-pack' });

      render(
        <TestWrapper>
          <PackCard pack={pack} totalCards={10} dueCards={3} />
        </TestWrapper>
      );

      const studyButton = screen.getByRole('link', { name: /study this pack/i });
      expect(studyButton).toBeInTheDocument();
      expect(studyButton).toHaveAttribute('href', '/study/session/study-pack');
    });

    it('should not display Study button when no cards due', () => {
      const pack = createMockPack();

      render(
        <TestWrapper>
          <PackCard pack={pack} totalCards={10} dueCards={0} />
        </TestWrapper>
      );

      expect(screen.queryByRole('link', { name: /study this pack/i })).not.toBeInTheDocument();
    });
  });

  describe('System Pack Distinction', () => {
    it('should display System badge for default packs', () => {
      const pack = createMockPack({ isDefault: true });

      render(
        <TestWrapper>
          <PackCard pack={pack} totalCards={10} dueCards={0} />
        </TestWrapper>
      );

      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('should not display System badge for custom packs', () => {
      const pack = createMockPack({ isDefault: false });

      render(
        <TestWrapper>
          <PackCard pack={pack} totalCards={10} dueCards={0} />
        </TestWrapper>
      );

      expect(screen.queryByText('System')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate data-testid attributes', () => {
      const pack = createMockPack({ id: 'accessible-pack' });

      render(
        <TestWrapper>
          <PackCard pack={pack} totalCards={10} dueCards={2} />
        </TestWrapper>
      );

      expect(screen.getByTestId('pack-card-accessible-pack')).toBeInTheDocument();
      expect(screen.getByTestId('study-pack-accessible-pack')).toBeInTheDocument();
    });

    it('should have color indicator hidden from screen readers', () => {
      const pack = createMockPack();

      render(
        <TestWrapper>
          <PackCard pack={pack} totalCards={10} dueCards={0} />
        </TestWrapper>
      );

      const colorIndicator = document.querySelector('[aria-hidden="true"]');
      expect(colorIndicator).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should accept custom className', () => {
      const pack = createMockPack({ id: 'styled-pack' });

      render(
        <TestWrapper>
          <PackCard pack={pack} totalCards={10} dueCards={0} className="custom-class" />
        </TestWrapper>
      );

      const card = screen.getByTestId('pack-card-styled-pack');
      expect(card).toHaveClass('custom-class');
    });
  });
});
