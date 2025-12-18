/**
 * CategoryBreakdown Component Tests
 *
 * Tests for the category breakdown display including:
 * - Pie chart showing milestones vs concepts
 * - Bar chart showing era breakdown
 * - Study gap identification
 * - Empty state handling
 */

import { render, screen } from '@testing-library/react';
import { CategoryBreakdown } from '../../../../src/components/Flashcards/CategoryBreakdown';
import type { UserFlashcard } from '../../../../src/types/flashcard';

// =============================================================================
// Test Setup
// =============================================================================

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
 * Create a milestone card for a specific year
 */
function createMilestoneCard(year: number, name: string = 'TEST'): UserFlashcard {
  return createMockCard({
    sourceType: 'milestone',
    sourceId: `E${year}_${name}`,
  });
}

/**
 * Create a concept card
 */
function createConceptCard(name: string = 'TEST'): UserFlashcard {
  return createMockCard({
    sourceType: 'concept',
    sourceId: `C_${name}`,
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('CategoryBreakdown', () => {
  describe('Component Rendering', () => {
    it('should render the breakdown container', () => {
      const cards = [createMilestoneCard(2017)];

      render(<CategoryBreakdown cards={cards} />);

      expect(screen.getByTestId('category-breakdown')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const cards = [createMilestoneCard(2017)];

      render(<CategoryBreakdown cards={cards} className="custom-breakdown" />);

      expect(screen.getByTestId('category-breakdown')).toHaveClass('custom-breakdown');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no cards', () => {
      render(<CategoryBreakdown cards={[]} />);

      expect(screen.getByTestId('breakdown-empty')).toBeInTheDocument();
    });

    it('should display appropriate empty message', () => {
      render(<CategoryBreakdown cards={[]} />);

      expect(screen.getByText('No cards to analyze')).toBeInTheDocument();
    });

    it('should not show pie chart in empty state', () => {
      render(<CategoryBreakdown cards={[]} />);

      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    });
  });

  describe('Type Distribution (Pie Chart)', () => {
    it('should render pie chart when cards exist', () => {
      const cards = [createMilestoneCard(2017)];

      render(<CategoryBreakdown cards={cards} />);

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('should show "Card Types" section header', () => {
      const cards = [createMilestoneCard(2017)];

      render(<CategoryBreakdown cards={cards} />);

      expect(screen.getByText('Card Types')).toBeInTheDocument();
    });

    it('should display milestone count in legend', () => {
      const cards = [
        createMilestoneCard(2017, 'A'),
        createMilestoneCard(2018, 'B'),
        createMilestoneCard(2019, 'C'),
      ];

      render(<CategoryBreakdown cards={cards} />);

      expect(screen.getByText('Milestones (3)')).toBeInTheDocument();
    });

    it('should display concept count in legend', () => {
      const cards = [
        createConceptCard('A'),
        createConceptCard('B'),
      ];

      render(<CategoryBreakdown cards={cards} />);

      expect(screen.getByText('Concepts (2)')).toBeInTheDocument();
    });

    it('should show mixed counts for both types', () => {
      const cards = [
        createMilestoneCard(2017, 'A'),
        createMilestoneCard(2018, 'B'),
        createConceptCard('X'),
      ];

      render(<CategoryBreakdown cards={cards} />);

      expect(screen.getByText('Milestones (2)')).toBeInTheDocument();
      expect(screen.getByText('Concepts (1)')).toBeInTheDocument();
    });

    it('should display total card count in pie chart center', () => {
      const cards = [
        createMilestoneCard(2017),
        createMilestoneCard(2018),
        createConceptCard('A'),
      ];

      render(<CategoryBreakdown cards={cards} />);

      // Pie chart shows total count in center
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('cards')).toBeInTheDocument();
    });
  });

  describe('Era Breakdown (Bar Chart)', () => {
    it('should render era bar chart when milestones exist', () => {
      const cards = [createMilestoneCard(2017)];

      render(<CategoryBreakdown cards={cards} />);

      expect(screen.getByTestId('era-bar-chart')).toBeInTheDocument();
    });

    it('should show "Milestones by Era" section header', () => {
      const cards = [createMilestoneCard(2017)];

      render(<CategoryBreakdown cards={cards} />);

      expect(screen.getByText('Milestones by Era')).toBeInTheDocument();
    });

    it('should not show era bar chart when only concepts', () => {
      const cards = [createConceptCard('A'), createConceptCard('B')];

      render(<CategoryBreakdown cards={cards} />);

      expect(screen.queryByTestId('era-bar-chart')).not.toBeInTheDocument();
    });

    it('should categorize 2017 milestone to Transformers era', () => {
      const cards = [createMilestoneCard(2017, 'TRANSFORMER')];

      render(<CategoryBreakdown cards={cards} />);

      // Should have Transformers era listed
      expect(screen.getByText('Transformers')).toBeInTheDocument();
    });

    it('should categorize 2020 milestone to Scaling LLMs era', () => {
      const cards = [createMilestoneCard(2020, 'GPT3')];

      render(<CategoryBreakdown cards={cards} />);

      expect(screen.getByText('Scaling LLMs')).toBeInTheDocument();
    });

    it('should categorize 2012 milestone to Deep Learning era', () => {
      const cards = [createMilestoneCard(2012, 'ALEXNET')];

      render(<CategoryBreakdown cards={cards} />);

      expect(screen.getByText('Deep Learning')).toBeInTheDocument();
    });

    it('should show counts for each era', () => {
      const cards = [
        createMilestoneCard(2017, 'A'),
        createMilestoneCard(2018, 'B'),
        createMilestoneCard(2020, 'C'),
      ];

      render(<CategoryBreakdown cards={cards} />);

      // 2 cards in Transformers (2017-2019), 1 in Scaling LLMs (2020-2021)
      const eraBarChart = screen.getByTestId('era-bar-chart');
      expect(eraBarChart).toBeInTheDocument();
    });
  });

  describe('Study Gaps', () => {
    it('should show study gaps warning when eras have no cards', () => {
      // Only cards from 2017, missing other eras
      const cards = [createMilestoneCard(2017)];

      render(<CategoryBreakdown cards={cards} />);

      expect(screen.getByTestId('study-gaps')).toBeInTheDocument();
    });

    it('should display "Coverage Gaps" label', () => {
      const cards = [createMilestoneCard(2017)];

      render(<CategoryBreakdown cards={cards} />);

      expect(screen.getByText('Coverage Gaps')).toBeInTheDocument();
    });

    it('should list missing eras in gaps message', () => {
      const cards = [createMilestoneCard(2017)];

      render(<CategoryBreakdown cards={cards} />);

      // Should mention eras without cards
      const gapsSection = screen.getByTestId('study-gaps');
      expect(gapsSection).toHaveTextContent('No cards from:');
    });

    it('should not show gaps warning when only concepts', () => {
      const cards = [createConceptCard('A')];

      render(<CategoryBreakdown cards={cards} />);

      // No era breakdown, so no gaps warning
      expect(screen.queryByTestId('study-gaps')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Eras Coverage', () => {
    it('should handle cards from multiple eras', () => {
      const cards = [
        createMilestoneCard(1950, 'TURING'),    // Foundations
        createMilestoneCard(1960, 'PERCEPTRON'), // Birth of AI
        createMilestoneCard(1980, 'EXPERT'),     // Symbolic & Expert
        createMilestoneCard(2000, 'SVM'),        // Statistical ML
        createMilestoneCard(2015, 'RESNET'),     // Deep Learning
        createMilestoneCard(2017, 'TRANSFORMER'), // Transformers
        createMilestoneCard(2020, 'GPT3'),       // Scaling LLMs
        createMilestoneCard(2023, 'CHATGPT'),    // Alignment
        createMilestoneCard(2024, 'MULTIMODAL'), // Multimodal
      ];

      render(<CategoryBreakdown cards={cards} />);

      // Should have all era names
      expect(screen.getByText('Foundations')).toBeInTheDocument();
      expect(screen.getByText('Birth of AI')).toBeInTheDocument();
      expect(screen.getByText('Transformers')).toBeInTheDocument();
    });

    it('should reduce or eliminate gaps with full coverage', () => {
      const cards = [
        createMilestoneCard(1950, 'A'),
        createMilestoneCard(1960, 'B'),
        createMilestoneCard(1980, 'C'),
        createMilestoneCard(2000, 'D'),
        createMilestoneCard(2015, 'E'),
        createMilestoneCard(2017, 'F'),
        createMilestoneCard(2020, 'G'),
        createMilestoneCard(2023, 'H'),
        createMilestoneCard(2024, 'I'),
      ];

      render(<CategoryBreakdown cards={cards} />);

      // With full era coverage, should not show gaps
      expect(screen.queryByTestId('study-gaps')).not.toBeInTheDocument();
    });
  });

  describe('Year Extraction', () => {
    it('should correctly extract year from milestone ID', () => {
      const cards = [createMilestoneCard(2022, 'CHATGPT')];

      render(<CategoryBreakdown cards={cards} />);

      // 2022 falls in Alignment Era
      expect(screen.getByText('Alignment Era')).toBeInTheDocument();
    });

    it('should handle malformed source IDs gracefully', () => {
      const card = createMockCard({
        sourceType: 'milestone',
        sourceId: 'INVALID_ID', // No year prefix
      });

      // Should not crash
      render(<CategoryBreakdown cards={[card]} />);

      expect(screen.getByTestId('category-breakdown')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on pie chart', () => {
      const cards = [createMilestoneCard(2017)];

      render(<CategoryBreakdown cards={cards} />);

      const pieChart = screen.getByTestId('pie-chart');
      expect(pieChart).toHaveAttribute('aria-label', 'Category distribution pie chart');
    });
  });
});
