/**
 * MatchingQuestion Component Tests
 *
 * Tests the matching question component for:
 * - Rendering prompt and items
 * - Click-to-match functionality
 * - Correct/incorrect match checking
 * - Feedback display after submission
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { MatchingQuestion } from '../../../../src/components/Checkpoints/MatchingQuestion';
import type { MatchingQuestion as MQuestion } from '../../../../src/types/checkpoint';

// Mock question data
const mockQuestion: MQuestion = {
  type: 'matching',
  id: 'test-match-q1',
  prompt: 'Match each architecture to what it does best:',
  pairs: [
    { id: 'p1', left: 'CNN', right: 'Image recognition' },
    { id: 'p2', left: 'GAN', right: 'Image generation' },
    { id: 'p3', left: 'Transformer', right: 'Language understanding' },
  ],
};

describe('MatchingQuestion', () => {
  it('renders the prompt text', () => {
    render(<MatchingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    expect(screen.getByText('Match each architecture to what it does best:')).toBeInTheDocument();
  });

  it('renders all left items (terms)', () => {
    render(<MatchingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    expect(screen.getByText('CNN')).toBeInTheDocument();
    expect(screen.getByText('GAN')).toBeInTheDocument();
    expect(screen.getByText('Transformer')).toBeInTheDocument();
  });

  it('renders all right items (definitions)', () => {
    render(<MatchingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    expect(screen.getByText('Image recognition')).toBeInTheDocument();
    expect(screen.getByText('Image generation')).toBeInTheDocument();
    expect(screen.getByText('Language understanding')).toBeInTheDocument();
  });

  it('renders submit button in disabled state when not all matched', () => {
    render(<MatchingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    const submitButton = screen.getByTestId('submit-button');
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Match all items');
  });

  it('shows instruction text before submission', () => {
    render(<MatchingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    expect(screen.getByText(/Click an item on the left/)).toBeInTheDocument();
  });

  it('allows selecting a left item', () => {
    render(<MatchingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    const leftItem = screen.getByTestId('left-p1');
    fireEvent.click(leftItem);

    // Item should be visually selected (has ring class)
    expect(leftItem.className).toContain('ring');
  });

  it('creates a match when clicking right item after selecting left', () => {
    render(<MatchingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    // Select left item
    fireEvent.click(screen.getByTestId('left-p1'));

    // Click matching right item
    fireEvent.click(screen.getByTestId('right-p1'));

    // Should show remove button indicating match was made
    expect(screen.getByTestId('remove-match-p1')).toBeInTheDocument();
  });

  it('enables submit button when all items are matched', () => {
    render(<MatchingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    // Match all pairs
    fireEvent.click(screen.getByTestId('left-p1'));
    fireEvent.click(screen.getByTestId('right-p1'));

    fireEvent.click(screen.getByTestId('left-p2'));
    fireEvent.click(screen.getByTestId('right-p2'));

    fireEvent.click(screen.getByTestId('left-p3'));
    fireEvent.click(screen.getByTestId('right-p3'));

    const submitButton = screen.getByTestId('submit-button');
    expect(submitButton).not.toBeDisabled();
    expect(submitButton).toHaveTextContent('Check Matches');
  });

  it('calls onAnswer with correct=true when all matches are correct', () => {
    const onAnswer = jest.fn();
    render(<MatchingQuestion question={mockQuestion} onAnswer={onAnswer} />);

    // Match all pairs correctly
    fireEvent.click(screen.getByTestId('left-p1'));
    fireEvent.click(screen.getByTestId('right-p1'));

    fireEvent.click(screen.getByTestId('left-p2'));
    fireEvent.click(screen.getByTestId('right-p2'));

    fireEvent.click(screen.getByTestId('left-p3'));
    fireEvent.click(screen.getByTestId('right-p3'));

    // Submit
    fireEvent.click(screen.getByTestId('submit-button'));

    expect(onAnswer).toHaveBeenCalledWith(
      { p1: 'p1', p2: 'p2', p3: 'p3' },
      true
    );
  });

  it('calls onAnswer with correct=false when some matches are incorrect', () => {
    const onAnswer = jest.fn();
    render(<MatchingQuestion question={mockQuestion} onAnswer={onAnswer} />);

    // Match some incorrectly
    fireEvent.click(screen.getByTestId('left-p1'));
    fireEvent.click(screen.getByTestId('right-p2')); // Wrong!

    fireEvent.click(screen.getByTestId('left-p2'));
    fireEvent.click(screen.getByTestId('right-p1')); // Wrong!

    fireEvent.click(screen.getByTestId('left-p3'));
    fireEvent.click(screen.getByTestId('right-p3')); // Correct

    // Submit
    fireEvent.click(screen.getByTestId('submit-button'));

    expect(onAnswer).toHaveBeenCalled();
    const [, isCorrect] = onAnswer.mock.calls[0];
    expect(isCorrect).toBe(false);
  });

  it('shows feedback section after submission', () => {
    render(<MatchingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    // Initially no feedback
    expect(screen.queryByTestId('feedback-section')).not.toBeInTheDocument();

    // Match all and submit
    fireEvent.click(screen.getByTestId('left-p1'));
    fireEvent.click(screen.getByTestId('right-p1'));
    fireEvent.click(screen.getByTestId('left-p2'));
    fireEvent.click(screen.getByTestId('right-p2'));
    fireEvent.click(screen.getByTestId('left-p3'));
    fireEvent.click(screen.getByTestId('right-p3'));
    fireEvent.click(screen.getByTestId('submit-button'));

    // Feedback should now be visible
    expect(screen.getByTestId('feedback-section')).toBeInTheDocument();
    expect(screen.getByText('All matches correct!')).toBeInTheDocument();
  });

  it('shows correct count when not all matches are correct', () => {
    render(<MatchingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    // Match incorrectly
    fireEvent.click(screen.getByTestId('left-p1'));
    fireEvent.click(screen.getByTestId('right-p2'));
    fireEvent.click(screen.getByTestId('left-p2'));
    fireEvent.click(screen.getByTestId('right-p1'));
    fireEvent.click(screen.getByTestId('left-p3'));
    fireEvent.click(screen.getByTestId('right-p3'));
    fireEvent.click(screen.getByTestId('submit-button'));

    expect(screen.getByText(/1 of 3 matches correct/)).toBeInTheDocument();
  });

  it('hides submit button after submission', () => {
    render(<MatchingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    // Match all and submit
    fireEvent.click(screen.getByTestId('left-p1'));
    fireEvent.click(screen.getByTestId('right-p1'));
    fireEvent.click(screen.getByTestId('left-p2'));
    fireEvent.click(screen.getByTestId('right-p2'));
    fireEvent.click(screen.getByTestId('left-p3'));
    fireEvent.click(screen.getByTestId('right-p3'));
    fireEvent.click(screen.getByTestId('submit-button'));

    expect(screen.queryByTestId('submit-button')).not.toBeInTheDocument();
  });

  it('allows removing a match before submission', () => {
    render(<MatchingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    // Create a match
    fireEvent.click(screen.getByTestId('left-p1'));
    fireEvent.click(screen.getByTestId('right-p1'));

    // Remove button should be visible
    const removeButton = screen.getByTestId('remove-match-p1');
    expect(removeButton).toBeInTheDocument();

    // Remove the match
    fireEvent.click(removeButton);

    // Remove button should be gone
    expect(screen.queryByTestId('remove-match-p1')).not.toBeInTheDocument();
  });

  it('renders with previous answer state', () => {
    const previousAnswer = {
      matches: { p1: 'p1', p2: 'p2', p3: 'p3' },
      isCorrect: true,
    };
    render(
      <MatchingQuestion
        question={mockQuestion}
        onAnswer={jest.fn()}
        previousAnswer={previousAnswer}
      />
    );

    // Feedback should be visible immediately
    expect(screen.getByTestId('feedback-section')).toBeInTheDocument();
    expect(screen.getByText('All matches correct!')).toBeInTheDocument();
    // Submit button should not be visible
    expect(screen.queryByTestId('submit-button')).not.toBeInTheDocument();
  });

  it('disables interaction after submission', () => {
    render(<MatchingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    // Match all and submit
    fireEvent.click(screen.getByTestId('left-p1'));
    fireEvent.click(screen.getByTestId('right-p1'));
    fireEvent.click(screen.getByTestId('left-p2'));
    fireEvent.click(screen.getByTestId('right-p2'));
    fireEvent.click(screen.getByTestId('left-p3'));
    fireEvent.click(screen.getByTestId('right-p3'));
    fireEvent.click(screen.getByTestId('submit-button'));

    // Left items should be disabled
    expect(screen.getByTestId('left-p1')).toBeDisabled();
    expect(screen.getByTestId('left-p2')).toBeDisabled();
    expect(screen.getByTestId('left-p3')).toBeDisabled();
  });
});
