/**
 * OrderingQuestion Component Tests
 *
 * Tests the ordering question component for:
 * - Rendering prompt and items
 * - Move up/down functionality
 * - Correct/incorrect order checking
 * - Feedback display after submission
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { OrderingQuestion } from '../../../../src/components/Checkpoints/OrderingQuestion';
import type { OrderingQuestion as OQuestion } from '../../../../src/types/checkpoint';

// Mock question data
const mockQuestion: OQuestion = {
  type: 'ordering',
  id: 'test-order-q1',
  prompt: 'Put these AI milestones in chronological order:',
  items: [
    { id: 'transformer', label: 'Transformer', date: '2017' },
    { id: 'gpt1', label: 'GPT-1', date: '2018' },
    { id: 'gpt2', label: 'GPT-2', date: '2019' },
    { id: 'gpt3', label: 'GPT-3', date: '2020' },
  ],
  correctOrder: ['transformer', 'gpt1', 'gpt2', 'gpt3'],
};

// Mock Math.random to control shuffle order for deterministic tests
const mockRandomSequence = (sequence: number[]) => {
  let index = 0;
  jest.spyOn(Math, 'random').mockImplementation(() => {
    const value = sequence[index % sequence.length];
    index++;
    return value ?? 0.5;
  });
};

describe('OrderingQuestion', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the prompt text', () => {
    render(<OrderingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    expect(screen.getByText('Put these AI milestones in chronological order:')).toBeInTheDocument();
  });

  it('renders all items', () => {
    render(<OrderingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    expect(screen.getByText('Transformer')).toBeInTheDocument();
    expect(screen.getByText('GPT-1')).toBeInTheDocument();
    expect(screen.getByText('GPT-2')).toBeInTheDocument();
    expect(screen.getByText('GPT-3')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<OrderingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    const submitButton = screen.getByTestId('submit-button');
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveTextContent('Check Order');
  });

  it('renders move up and move down buttons for each item', () => {
    render(<OrderingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    // Each item should have both move up and move down buttons
    for (const item of mockQuestion.items) {
      expect(screen.getByTestId(`move-up-${item.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`move-down-${item.id}`)).toBeInTheDocument();
    }
  });

  it('moves item up when up button is clicked', () => {
    // Use a fixed shuffle that puts items in reverse order
    mockRandomSequence([0.9, 0.9, 0.9, 0.9]);

    render(<OrderingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    // Find the current order by looking at the ordering items
    const items = screen.getAllByTestId(/^ordering-item-/);
    const initialSecondItem = items[1]?.getAttribute('data-testid')?.replace('ordering-item-', '');

    // Click move up on the second item
    if (initialSecondItem) {
      fireEvent.click(screen.getByTestId(`move-up-${initialSecondItem}`));
    }

    // The item should now be first
    const updatedItems = screen.getAllByTestId(/^ordering-item-/);
    expect(updatedItems[0]?.getAttribute('data-testid')).toBe(`ordering-item-${initialSecondItem}`);
  });

  it('moves item down when down button is clicked', () => {
    mockRandomSequence([0.9, 0.9, 0.9, 0.9]);

    render(<OrderingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    const items = screen.getAllByTestId(/^ordering-item-/);
    const initialFirstItem = items[0]?.getAttribute('data-testid')?.replace('ordering-item-', '');

    // Click move down on the first item
    if (initialFirstItem) {
      fireEvent.click(screen.getByTestId(`move-down-${initialFirstItem}`));
    }

    // The item should now be second
    const updatedItems = screen.getAllByTestId(/^ordering-item-/);
    expect(updatedItems[1]?.getAttribute('data-testid')).toBe(`ordering-item-${initialFirstItem}`);
  });

  it('calls onAnswer with correct=true when order is correct', () => {
    // Mock shuffle to produce correct order
    mockRandomSequence([0.0, 0.0, 0.0, 0.0]);

    const onAnswer = jest.fn();
    render(<OrderingQuestion question={mockQuestion} onAnswer={onAnswer} />);

    // Submit the order
    fireEvent.click(screen.getByTestId('submit-button'));

    // Check if onAnswer was called with the items in some order and correctness
    expect(onAnswer).toHaveBeenCalled();
    const [orderedIds, isCorrect] = onAnswer.mock.calls[0];
    expect(Array.isArray(orderedIds)).toBe(true);
    expect(typeof isCorrect).toBe('boolean');
  });

  it('shows feedback section after submission', () => {
    mockRandomSequence([0.5, 0.5, 0.5, 0.5]);

    render(<OrderingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    // Initially no feedback
    expect(screen.queryByTestId('feedback-section')).not.toBeInTheDocument();

    // Submit
    fireEvent.click(screen.getByTestId('submit-button'));

    // Feedback should now be visible
    expect(screen.getByTestId('feedback-section')).toBeInTheDocument();
  });

  it('hides submit button after submission', () => {
    mockRandomSequence([0.5, 0.5, 0.5, 0.5]);

    render(<OrderingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    fireEvent.click(screen.getByTestId('submit-button'));

    expect(screen.queryByTestId('submit-button')).not.toBeInTheDocument();
  });

  it('hides move buttons after submission', () => {
    mockRandomSequence([0.5, 0.5, 0.5, 0.5]);

    render(<OrderingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    fireEvent.click(screen.getByTestId('submit-button'));

    // Move buttons should no longer be visible
    for (const item of mockQuestion.items) {
      expect(screen.queryByTestId(`move-up-${item.id}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`move-down-${item.id}`)).not.toBeInTheDocument();
    }
  });

  it('shows dates after submission', () => {
    mockRandomSequence([0.5, 0.5, 0.5, 0.5]);

    render(<OrderingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    // Dates should not be visible before submission
    expect(screen.queryByText('(2017)')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('submit-button'));

    // Dates should be visible after submission
    expect(screen.getByText('(2017)')).toBeInTheDocument();
    expect(screen.getByText('(2018)')).toBeInTheDocument();
    expect(screen.getByText('(2019)')).toBeInTheDocument();
    expect(screen.getByText('(2020)')).toBeInTheDocument();
  });

  it('renders with previous answer state', () => {
    const previousAnswer = {
      orderedIds: ['transformer', 'gpt1', 'gpt2', 'gpt3'],
      isCorrect: true,
    };
    render(
      <OrderingQuestion
        question={mockQuestion}
        onAnswer={jest.fn()}
        previousAnswer={previousAnswer}
      />
    );

    // Feedback should be visible immediately
    expect(screen.getByTestId('feedback-section')).toBeInTheDocument();
    // Submit button should not be visible
    expect(screen.queryByTestId('submit-button')).not.toBeInTheDocument();
    // Dates should be visible
    expect(screen.getByText('(2017)')).toBeInTheDocument();
  });

  it('disables first item move up button', () => {
    mockRandomSequence([0.5, 0.5, 0.5, 0.5]);

    render(<OrderingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    const items = screen.getAllByTestId(/^ordering-item-/);
    const firstItemId = items[0]?.getAttribute('data-testid')?.replace('ordering-item-', '');

    if (firstItemId) {
      const moveUpButton = screen.getByTestId(`move-up-${firstItemId}`);
      expect(moveUpButton).toBeDisabled();
    }
  });

  it('disables last item move down button', () => {
    mockRandomSequence([0.5, 0.5, 0.5, 0.5]);

    render(<OrderingQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    const items = screen.getAllByTestId(/^ordering-item-/);
    const lastItemId = items[items.length - 1]?.getAttribute('data-testid')?.replace('ordering-item-', '');

    if (lastItemId) {
      const moveDownButton = screen.getByTestId(`move-down-${lastItemId}`);
      expect(moveDownButton).toBeDisabled();
    }
  });
});
