/**
 * FlashcardDeck Component Tests
 *
 * Tests the flashcard deck component for:
 * - Rendering cards with term and definition
 * - Flip animation
 * - Got it / Review again functionality
 * - Progress tracking
 * - Deck completion
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { FlashcardDeck } from '../../../../src/components/Checkpoints/FlashcardDeck';
import type { Flashcard } from '../../../../src/types/checkpoint';

// Mock flashcard data
const mockFlashcards: Flashcard[] = [
  {
    id: 'fc-1',
    term: 'Transformer',
    definition: 'A neural network architecture that processes sequences in parallel.',
    category: 'model_architecture',
    relatedMilestoneIds: ['E2017_TRANSFORMER'],
  },
  {
    id: 'fc-2',
    term: 'Attention',
    definition: 'A mechanism that lets models focus on relevant parts of input.',
    category: 'technical_term',
    relatedMilestoneIds: ['E2017_TRANSFORMER'],
  },
  {
    id: 'fc-3',
    term: 'LLM',
    definition: 'Large Language Model trained on massive text data.',
    category: 'core_concept',
    relatedMilestoneIds: ['E2020_GPT3'],
  },
];

// Mock Math.random for consistent shuffling
const mockRandomSequence = (sequence: number[]) => {
  let index = 0;
  jest.spyOn(Math, 'random').mockImplementation(() => {
    const value = sequence[index % sequence.length];
    index++;
    return value ?? 0.5;
  });
};

describe('FlashcardDeck', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    // Use predictable shuffle order
    mockRandomSequence([0.1, 0.2, 0.3, 0.4, 0.5]);
  });

  it('renders the flashcard deck', () => {
    render(<FlashcardDeck flashcards={mockFlashcards} />);

    expect(screen.getByTestId('flashcard-deck')).toBeInTheDocument();
  });

  it('renders the title', () => {
    render(<FlashcardDeck flashcards={mockFlashcards} title="AI Terms" />);

    expect(screen.getByText('AI Terms')).toBeInTheDocument();
  });

  it('renders card counter', () => {
    render(<FlashcardDeck flashcards={mockFlashcards} />);

    // Should show 1 / 3 (first card of three)
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
  });

  it('renders the flashcard with term visible initially', () => {
    render(<FlashcardDeck flashcards={mockFlashcards} />);

    expect(screen.getByTestId('flashcard')).toBeInTheDocument();
    expect(screen.getByTestId('flashcard-front')).toBeInTheDocument();
  });

  it('renders Got It and Review Again buttons', () => {
    render(<FlashcardDeck flashcards={mockFlashcards} />);

    expect(screen.getByTestId('got-it-button')).toBeInTheDocument();
    expect(screen.getByTestId('review-again-button')).toBeInTheDocument();
  });

  it('renders navigation buttons', () => {
    render(<FlashcardDeck flashcards={mockFlashcards} />);

    expect(screen.getByTestId('prev-button')).toBeInTheDocument();
    expect(screen.getByTestId('next-button')).toBeInTheDocument();
  });

  it('disables previous button on first card', () => {
    render(<FlashcardDeck flashcards={mockFlashcards} />);

    expect(screen.getByTestId('prev-button')).toBeDisabled();
  });

  it('flips card when clicked', () => {
    render(<FlashcardDeck flashcards={mockFlashcards} />);

    const flashcard = screen.getByTestId('flashcard');

    // Initially not flipped (0deg)
    expect(flashcard.style.transform).toBe('rotateY(0deg)');

    // Click to flip
    fireEvent.click(flashcard);

    // Should be flipped (180deg)
    expect(flashcard.style.transform).toBe('rotateY(180deg)');
  });

  it('navigates to next card when clicking next', () => {
    render(<FlashcardDeck flashcards={mockFlashcards} />);

    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('next-button'));

    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument();
  });

  it('navigates to previous card when clicking previous', () => {
    render(<FlashcardDeck flashcards={mockFlashcards} />);

    // Go to second card first
    fireEvent.click(screen.getByTestId('next-button'));
    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument();

    // Go back
    fireEvent.click(screen.getByTestId('prev-button'));
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
  });

  it('calls onGotIt callback when clicking Got It', () => {
    const onGotIt = jest.fn();
    render(<FlashcardDeck flashcards={mockFlashcards} onGotIt={onGotIt} />);

    fireEvent.click(screen.getByTestId('got-it-button'));

    expect(onGotIt).toHaveBeenCalled();
  });

  it('calls onReviewAgain callback when clicking Review Again', () => {
    const onReviewAgain = jest.fn();
    render(<FlashcardDeck flashcards={mockFlashcards} onReviewAgain={onReviewAgain} />);

    fireEvent.click(screen.getByTestId('review-again-button'));

    expect(onReviewAgain).toHaveBeenCalled();
  });

  it('advances to next card after Got It', () => {
    render(<FlashcardDeck flashcards={mockFlashcards} />);

    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('got-it-button'));

    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument();
  });

  it('advances to next card after Review Again', () => {
    render(<FlashcardDeck flashcards={mockFlashcards} />);

    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('review-again-button'));

    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument();
  });

  it('shows Got it count', () => {
    render(<FlashcardDeck flashcards={mockFlashcards} />);

    expect(screen.getByText(/Got it: 0/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('got-it-button'));

    expect(screen.getByText(/Got it: 1/)).toBeInTheDocument();
  });

  it('shows Review count', () => {
    render(<FlashcardDeck flashcards={mockFlashcards} />);

    expect(screen.getByText(/Review: 0/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('review-again-button'));

    expect(screen.getByText(/Review: 1/)).toBeInTheDocument();
  });

  it('shows completion screen when all cards are marked as Got It', () => {
    render(<FlashcardDeck flashcards={mockFlashcards} />);

    // Mark all cards as Got It
    fireEvent.click(screen.getByTestId('got-it-button'));
    fireEvent.click(screen.getByTestId('got-it-button'));
    fireEvent.click(screen.getByTestId('got-it-button'));

    // Should show completion screen
    expect(screen.getByTestId('flashcard-deck-complete')).toBeInTheDocument();
    expect(screen.getByText('Deck Complete!')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('calls onComplete when deck is finished', () => {
    const onComplete = jest.fn();
    render(<FlashcardDeck flashcards={mockFlashcards} onComplete={onComplete} />);

    // Mark all cards
    fireEvent.click(screen.getByTestId('got-it-button'));
    fireEvent.click(screen.getByTestId('got-it-button'));
    fireEvent.click(screen.getByTestId('got-it-button'));

    expect(onComplete).toHaveBeenCalledWith({
      gotIt: 3,
      reviewAgain: 0,
    });
  });

  it('shows restart button on completion', () => {
    render(<FlashcardDeck flashcards={mockFlashcards} />);

    // Mark all cards
    fireEvent.click(screen.getByTestId('got-it-button'));
    fireEvent.click(screen.getByTestId('got-it-button'));
    fireEvent.click(screen.getByTestId('got-it-button'));

    expect(screen.getByTestId('restart-button')).toBeInTheDocument();
  });

  it('restarts deck when clicking restart', () => {
    render(<FlashcardDeck flashcards={mockFlashcards} />);

    // Mark all cards
    fireEvent.click(screen.getByTestId('got-it-button'));
    fireEvent.click(screen.getByTestId('got-it-button'));
    fireEvent.click(screen.getByTestId('got-it-button'));

    // Click restart
    fireEvent.click(screen.getByTestId('restart-button'));

    // Should be back to deck view
    expect(screen.getByTestId('flashcard-deck')).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
    expect(screen.getByText(/Got it: 0/)).toBeInTheDocument();
  });

  it('handles empty flashcard array', () => {
    render(<FlashcardDeck flashcards={[]} />);

    expect(screen.getByText('No flashcards available')).toBeInTheDocument();
  });

  it('enters review mode when there are cards to review', () => {
    render(<FlashcardDeck flashcards={mockFlashcards} />);

    // Mark first two for review, last one got it
    fireEvent.click(screen.getByTestId('review-again-button'));
    fireEvent.click(screen.getByTestId('review-again-button'));
    fireEvent.click(screen.getByTestId('got-it-button'));

    // Should now be in review mode
    expect(screen.getByText('Review Mode')).toBeInTheDocument();
  });

  it('shows partial score when some cards are for review', () => {
    render(<FlashcardDeck flashcards={mockFlashcards} />);

    // Mark first for review, rest got it
    fireEvent.click(screen.getByTestId('review-again-button'));
    fireEvent.click(screen.getByTestId('got-it-button'));
    fireEvent.click(screen.getByTestId('got-it-button'));

    // In review mode, mark the review card as got it
    fireEvent.click(screen.getByTestId('got-it-button'));

    // Should show completion with all 3 got it
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
