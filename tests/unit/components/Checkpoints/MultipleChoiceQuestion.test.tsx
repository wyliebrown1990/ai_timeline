/**
 * MultipleChoiceQuestion Component Tests
 *
 * Tests the multiple choice question component for:
 * - Rendering question and options
 * - Selection and submission behavior
 * - Correct/incorrect feedback display
 * - Disabled state after submission
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { MultipleChoiceQuestion } from '../../../../src/components/Checkpoints/MultipleChoiceQuestion';
import type { MultipleChoiceQuestion as MCQuestion } from '../../../../src/types/checkpoint';

// Mock question data
const mockQuestion: MCQuestion = {
  type: 'multiple_choice',
  id: 'test-q1',
  question: 'What year was the Transformer introduced?',
  options: ['2015', '2016', '2017', '2018'],
  correctIndex: 2,
  explanation: 'The Transformer was introduced in 2017 in the paper "Attention Is All You Need".',
};

describe('MultipleChoiceQuestion', () => {
  it('renders the question text', () => {
    render(<MultipleChoiceQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    expect(screen.getByText('What year was the Transformer introduced?')).toBeInTheDocument();
  });

  it('renders all four options', () => {
    render(<MultipleChoiceQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    expect(screen.getByText('2015')).toBeInTheDocument();
    expect(screen.getByText('2016')).toBeInTheDocument();
    expect(screen.getByText('2017')).toBeInTheDocument();
    expect(screen.getByText('2018')).toBeInTheDocument();
  });

  it('renders submit button that is initially disabled', () => {
    render(<MultipleChoiceQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    const submitButton = screen.getByTestId('submit-button');
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when an option is selected', () => {
    render(<MultipleChoiceQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    // Click on option A
    fireEvent.click(screen.getByTestId('option-0'));

    const submitButton = screen.getByTestId('submit-button');
    expect(submitButton).not.toBeDisabled();
  });

  it('calls onAnswer with correct result when correct answer is submitted', () => {
    const onAnswer = jest.fn();
    render(<MultipleChoiceQuestion question={mockQuestion} onAnswer={onAnswer} />);

    // Select the correct answer (index 2 = "2017")
    fireEvent.click(screen.getByTestId('option-2'));
    fireEvent.click(screen.getByTestId('submit-button'));

    expect(onAnswer).toHaveBeenCalledWith(2, true);
  });

  it('calls onAnswer with incorrect result when wrong answer is submitted', () => {
    const onAnswer = jest.fn();
    render(<MultipleChoiceQuestion question={mockQuestion} onAnswer={onAnswer} />);

    // Select an incorrect answer (index 0 = "2015")
    fireEvent.click(screen.getByTestId('option-0'));
    fireEvent.click(screen.getByTestId('submit-button'));

    expect(onAnswer).toHaveBeenCalledWith(0, false);
  });

  it('shows feedback section after submission', () => {
    render(<MultipleChoiceQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    // Initially no feedback
    expect(screen.queryByTestId('feedback-section')).not.toBeInTheDocument();

    // Select and submit
    fireEvent.click(screen.getByTestId('option-2'));
    fireEvent.click(screen.getByTestId('submit-button'));

    // Feedback should now be visible
    expect(screen.getByTestId('feedback-section')).toBeInTheDocument();
    expect(screen.getByText(/Attention Is All You Need/)).toBeInTheDocument();
  });

  it('shows "Correct!" when correct answer is selected', () => {
    render(<MultipleChoiceQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    // Select correct answer
    fireEvent.click(screen.getByTestId('option-2'));
    fireEvent.click(screen.getByTestId('submit-button'));

    expect(screen.getByText('Correct!')).toBeInTheDocument();
  });

  it('shows "Not quite" when incorrect answer is selected', () => {
    render(<MultipleChoiceQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    // Select incorrect answer
    fireEvent.click(screen.getByTestId('option-0'));
    fireEvent.click(screen.getByTestId('submit-button'));

    expect(screen.getByText('Not quite')).toBeInTheDocument();
  });

  it('hides submit button after submission', () => {
    render(<MultipleChoiceQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    fireEvent.click(screen.getByTestId('option-2'));
    fireEvent.click(screen.getByTestId('submit-button'));

    expect(screen.queryByTestId('submit-button')).not.toBeInTheDocument();
  });

  it('disables option buttons after submission', () => {
    render(<MultipleChoiceQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    fireEvent.click(screen.getByTestId('option-2'));
    fireEvent.click(screen.getByTestId('submit-button'));

    // All option buttons should be disabled
    expect(screen.getByTestId('option-0')).toBeDisabled();
    expect(screen.getByTestId('option-1')).toBeDisabled();
    expect(screen.getByTestId('option-2')).toBeDisabled();
    expect(screen.getByTestId('option-3')).toBeDisabled();
  });

  it('renders with previous answer state', () => {
    const previousAnswer = { selectedIndex: 2, isCorrect: true };
    render(
      <MultipleChoiceQuestion
        question={mockQuestion}
        onAnswer={jest.fn()}
        previousAnswer={previousAnswer}
      />
    );

    // Feedback should be visible immediately
    expect(screen.getByTestId('feedback-section')).toBeInTheDocument();
    expect(screen.getByText('Correct!')).toBeInTheDocument();
    // Submit button should not be visible
    expect(screen.queryByTestId('submit-button')).not.toBeInTheDocument();
  });

  it('has accessible button structure with aria-pressed', () => {
    render(<MultipleChoiceQuestion question={mockQuestion} onAnswer={jest.fn()} />);

    const option0 = screen.getByTestId('option-0');
    expect(option0).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(option0);
    expect(option0).toHaveAttribute('aria-pressed', 'true');
  });
});
