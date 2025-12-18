/**
 * CardInsights Component Tests
 *
 * Tests for the card performance insights display including:
 * - Most Challenging cards section
 * - Well Known cards section
 * - Needs Review (overdue) cards section
 * - Card click navigation
 * - Empty state handling
 * - Study weak cards button
 */

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CardInsights } from '../../../../src/components/Flashcards/CardInsights';
import type { UserFlashcard } from '../../../../src/types/flashcard';

// =============================================================================
// Test Setup
// =============================================================================

/**
 * Wrapper component for testing with BrowserRouter
 */
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

/**
 * Create a mock flashcard with customizable properties
 */
function createMockCard(overrides: Partial<UserFlashcard> = {}): UserFlashcard {
  const id = overrides.id ?? `card-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    sourceType: 'milestone',
    sourceId: 'E2017_TRANSFORMER',
    packIds: [],
    createdAt: new Date().toISOString(),
    easeFactor: 2.5,
    interval: 1,
    repetitions: 1,
    nextReviewDate: new Date().toISOString(),
    lastReviewedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a challenging card (low ease factor)
 */
function createChallengingCard(id: string, easeFactor: number = 1.5): UserFlashcard {
  return createMockCard({
    id,
    sourceId: `E2017_${id.toUpperCase()}`,
    easeFactor,
    lastReviewedAt: new Date().toISOString(),
  });
}

/**
 * Create a well-known card (high interval)
 */
function createWellKnownCard(id: string, interval: number = 30): UserFlashcard {
  return createMockCard({
    id,
    sourceId: `E2020_${id.toUpperCase()}`,
    interval,
    easeFactor: 2.8,
  });
}

/**
 * Create an overdue card
 */
function createOverdueCard(id: string, daysOverdue: number = 5): UserFlashcard {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - daysOverdue);
  return createMockCard({
    id,
    sourceId: `E2019_${id.toUpperCase()}`,
    nextReviewDate: pastDate.toISOString(),
    lastReviewedAt: new Date(pastDate.getTime() - 86400000).toISOString(),
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('CardInsights', () => {
  describe('Component Rendering', () => {
    it('should render the insights container', () => {
      const cards = [createMockCard()];

      render(
        <TestWrapper>
          <CardInsights cards={cards} />
        </TestWrapper>
      );

      expect(screen.getByTestId('card-insights')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const cards = [createMockCard()];

      render(
        <TestWrapper>
          <CardInsights cards={cards} className="custom-insights" />
        </TestWrapper>
      );

      expect(screen.getByTestId('card-insights')).toHaveClass('custom-insights');
    });
  });

  describe('Most Challenging Section', () => {
    it('should display most challenging section', () => {
      const cards = [createChallengingCard('test1', 1.5)];

      render(
        <TestWrapper>
          <CardInsights cards={cards} />
        </TestWrapper>
      );

      expect(screen.getByTestId('insight-section-challenging')).toBeInTheDocument();
      expect(screen.getByText('Most Challenging')).toBeInTheDocument();
    });

    it('should show challenging cards sorted by ease factor', () => {
      const cards = [
        createChallengingCard('hard', 1.4),
        createChallengingCard('harder', 1.3),
        createChallengingCard('medium', 2.0),
      ];

      render(
        <TestWrapper>
          <CardInsights cards={cards} limit={3} />
        </TestWrapper>
      );

      // Should display ease factors
      expect(screen.getByText('1.30')).toBeInTheDocument();
      expect(screen.getByText('1.40')).toBeInTheDocument();
    });

    it('should only show reviewed cards in challenging section', () => {
      const reviewedCard = createChallengingCard('reviewed', 1.5);
      const newCard = createMockCard({
        id: 'new-card',
        lastReviewedAt: null,
        easeFactor: 1.3,
      });

      render(
        <TestWrapper>
          <CardInsights cards={[reviewedCard, newCard]} limit={5} />
        </TestWrapper>
      );

      // Should show the reviewed card somewhere (may appear in multiple sections)
      const reviewedCards = screen.getAllByTestId(`insight-card-${reviewedCard.id}`);
      expect(reviewedCards.length).toBeGreaterThan(0);

      // The challenging section specifically should only contain the reviewed card
      const challengingSection = screen.getByTestId('insight-section-challenging');
      expect(challengingSection.querySelector(`[data-testid="insight-card-reviewed"]`)).toBeInTheDocument();
      // New card should NOT be in challenging section (but may appear in well-known)
      expect(challengingSection.querySelector(`[data-testid="insight-card-new-card"]`)).not.toBeInTheDocument();
    });
  });

  describe('Well Known Section', () => {
    it('should display well known section', () => {
      const cards = [createWellKnownCard('mastered', 30)];

      render(
        <TestWrapper>
          <CardInsights cards={cards} />
        </TestWrapper>
      );

      expect(screen.getByTestId('insight-section-wellKnown')).toBeInTheDocument();
      expect(screen.getByText('Well Known')).toBeInTheDocument();
    });

    it('should show interval for well-known cards', () => {
      const cards = [createWellKnownCard('mastered', 30)];

      render(
        <TestWrapper>
          <CardInsights cards={cards} />
        </TestWrapper>
      );

      // 30 days should show as "1 month"
      expect(screen.getByText('1 month')).toBeInTheDocument();
    });

    it('should format intervals correctly', () => {
      const cards = [
        createWellKnownCard('week', 7),
        createWellKnownCard('day', 1),
      ];

      render(
        <TestWrapper>
          <CardInsights cards={cards} limit={5} />
        </TestWrapper>
      );

      expect(screen.getByText('1 week')).toBeInTheDocument();
      expect(screen.getByText('1 day')).toBeInTheDocument();
    });
  });

  describe('Needs Review Section', () => {
    it('should display needs review section', () => {
      const cards = [createOverdueCard('overdue', 5)];

      render(
        <TestWrapper>
          <CardInsights cards={cards} />
        </TestWrapper>
      );

      expect(screen.getByTestId('insight-section-overdue')).toBeInTheDocument();
      expect(screen.getByText('Needs Review')).toBeInTheDocument();
    });

    it('should show days overdue for overdue cards', () => {
      const cards = [createOverdueCard('overdue', 5)];

      render(
        <TestWrapper>
          <CardInsights cards={cards} />
        </TestWrapper>
      );

      expect(screen.getByText('5d')).toBeInTheDocument();
    });

    it('should show "All caught up!" when no overdue cards', () => {
      // Create a card that's not overdue
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const card = createMockCard({
        nextReviewDate: futureDate.toISOString(),
      });

      render(
        <TestWrapper>
          <CardInsights cards={[card]} />
        </TestWrapper>
      );

      expect(screen.getByText('All caught up!')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no cards', () => {
      render(
        <TestWrapper>
          <CardInsights cards={[]} />
        </TestWrapper>
      );

      expect(screen.getByTestId('insights-empty')).toBeInTheDocument();
    });

    it('should show appropriate messages when sections are empty', () => {
      // Create a card that has never been reviewed and is not overdue
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const newCard = createMockCard({
        lastReviewedAt: null,
        nextReviewDate: futureDate.toISOString(),
        interval: 0,
      });

      render(
        <TestWrapper>
          <CardInsights cards={[newCard]} />
        </TestWrapper>
      );

      // Card shows in Well Known section (sorted by interval, even if interval=0 shows as "New")
      // Challenging section should show "No challenging cards yet" since no reviewed cards
      expect(screen.getByText('No challenging cards yet')).toBeInTheDocument();
      // Overdue section should show "All caught up!" since card is not overdue
      expect(screen.getByText('All caught up!')).toBeInTheDocument();
    });
  });

  describe('Card Navigation', () => {
    it('should link cards to study session', () => {
      const card = createChallengingCard('test-card', 1.5);

      render(
        <TestWrapper>
          <CardInsights cards={[card]} />
        </TestWrapper>
      );

      // Card may appear in multiple sections, get all instances
      const cardLinks = screen.getAllByTestId(`insight-card-${card.id}`);
      expect(cardLinks.length).toBeGreaterThan(0);
      // Check that at least one has the correct href
      expect(cardLinks[0]).toHaveAttribute('href', `/study/session?card=${card.id}`);
    });
  });

  describe('Study Weak Cards Button', () => {
    it('should show "Study Weak Cards" button when challenging cards exist', () => {
      const cards = [createChallengingCard('hard', 1.5)];

      render(
        <TestWrapper>
          <CardInsights cards={cards} />
        </TestWrapper>
      );

      expect(screen.getByTestId('study-weak-cards')).toBeInTheDocument();
      expect(screen.getByText('Study Weak Cards')).toBeInTheDocument();
    });

    it('should link to challenging filter session', () => {
      const cards = [createChallengingCard('hard', 1.5)];

      render(
        <TestWrapper>
          <CardInsights cards={cards} />
        </TestWrapper>
      );

      const button = screen.getByTestId('study-weak-cards');
      expect(button).toHaveAttribute('href', '/study/session?filter=challenging');
    });

    it('should not show button when no challenging cards', () => {
      // Create cards that are not reviewed (won't appear in challenging)
      const newCard = createMockCard({ lastReviewedAt: null });

      render(
        <TestWrapper>
          <CardInsights cards={[newCard]} />
        </TestWrapper>
      );

      expect(screen.queryByTestId('study-weak-cards')).not.toBeInTheDocument();
    });
  });

  describe('Limit Prop', () => {
    it('should respect limit for each category', () => {
      const challengingCards = [
        createChallengingCard('c1', 1.3),
        createChallengingCard('c2', 1.4),
        createChallengingCard('c3', 1.5),
        createChallengingCard('c4', 1.6),
        createChallengingCard('c5', 1.7),
      ];

      render(
        <TestWrapper>
          <CardInsights cards={challengingCards} limit={2} />
        </TestWrapper>
      );

      // Should only show 2 cards in challenging section
      const section = screen.getByTestId('insight-section-challenging');
      const cardItems = section.querySelectorAll('[data-testid^="insight-card-"]');
      expect(cardItems.length).toBe(2);
    });

    it('should default to limit of 3', () => {
      const cards = [
        createChallengingCard('c1', 1.3),
        createChallengingCard('c2', 1.4),
        createChallengingCard('c3', 1.5),
        createChallengingCard('c4', 1.6),
      ];

      render(
        <TestWrapper>
          <CardInsights cards={cards} />
        </TestWrapper>
      );

      // Default limit is 3
      const section = screen.getByTestId('insight-section-challenging');
      const cardItems = section.querySelectorAll('[data-testid^="insight-card-"]');
      expect(cardItems.length).toBe(3);
    });
  });

  describe('Card Name Formatting', () => {
    it('should format card names correctly', () => {
      const card = createMockCard({
        sourceId: 'E2017_ATTENTION_IS_ALL_YOU_NEED',
        lastReviewedAt: new Date().toISOString(),
        easeFactor: 1.5,
      });

      render(
        <TestWrapper>
          <CardInsights cards={[card]} />
        </TestWrapper>
      );

      // Should remove prefix and convert underscores
      // Card may appear in multiple sections
      const formattedNames = screen.getAllByText('ATTENTION IS ALL YOU NEED');
      expect(formattedNames.length).toBeGreaterThan(0);
    });
  });

  describe('Section Count Badges', () => {
    it('should show count badge for sections with cards', () => {
      const cards = [
        createChallengingCard('c1', 1.3),
        createChallengingCard('c2', 1.4),
      ];

      render(
        <TestWrapper>
          <CardInsights cards={cards} limit={5} />
        </TestWrapper>
      );

      // Should show "2" badge for challenging section
      const section = screen.getByTestId('insight-section-challenging');
      expect(section).toHaveTextContent('2');
    });
  });
});
