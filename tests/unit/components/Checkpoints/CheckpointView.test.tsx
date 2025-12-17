/**
 * CheckpointView Component Tests
 *
 * Tests the checkpoint view component for:
 * - Rendering checkpoints with multiple question types
 * - Progress through questions
 * - Score calculation
 * - Skip functionality
 * - Completion screen
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CheckpointView } from '../../../../src/components/Checkpoints/CheckpointView';
import type { Checkpoint } from '../../../../src/types/checkpoint';

// Mock checkpoint with multiple question types
const mockCheckpoint: Checkpoint = {
  id: 'cp-test-1',
  title: 'Test Checkpoint',
  afterMilestoneId: 'E2017_TRANSFORMER',
  questions: [
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'What is attention?',
      options: [
        'A way to compress data',
        'A mechanism to focus on relevant parts',
        'A type of neural network',
        'A training technique',
      ],
      correctIndex: 1,
      explanation: 'Attention lets models focus on relevant input parts.',
    },
    {
      id: 'q2',
      type: 'ordering',
      prompt: 'Order these chronologically',
      items: [
        { id: 'item1', label: 'RNN', date: '1986' },
        { id: 'item2', label: 'LSTM', date: '1997' },
        { id: 'item3', label: 'Transformer', date: '2017' },
      ],
      correctOrder: ['item1', 'item2', 'item3'],
    },
    {
      id: 'q3',
      type: 'matching',
      prompt: 'Match concepts to definitions',
      pairs: [
        { id: 'p1', left: 'Attention', right: 'Focus mechanism' },
        { id: 'p2', left: 'Transformer', right: 'Parallel architecture' },
      ],
    },
  ],
};

// Single question checkpoint for simpler tests
const singleQuestionCheckpoint: Checkpoint = {
  id: 'cp-single',
  title: 'Single Question',
  afterMilestoneId: 'E2017_TRANSFORMER',
  questions: [
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'Test question?',
      options: ['Option Alpha', 'Option Beta', 'Option Gamma', 'Option Delta'],
      correctIndex: 0,
      explanation: 'Alpha is correct.',
    },
  ],
};

describe('CheckpointView', () => {
  it('renders the checkpoint view', () => {
    render(<CheckpointView checkpoint={mockCheckpoint} onComplete={jest.fn()} />);

    expect(screen.getByTestId('checkpoint-view')).toBeInTheDocument();
  });

  it('renders the checkpoint title', () => {
    render(<CheckpointView checkpoint={mockCheckpoint} onComplete={jest.fn()} />);

    expect(screen.getByText('Test Checkpoint')).toBeInTheDocument();
  });

  it('shows question counter', () => {
    render(<CheckpointView checkpoint={mockCheckpoint} onComplete={jest.fn()} />);

    expect(screen.getByText(/Question 1 of 3/)).toBeInTheDocument();
  });

  it('renders skip button when allowSkip is true', () => {
    const onSkip = jest.fn();
    render(
      <CheckpointView
        checkpoint={mockCheckpoint}
        onComplete={jest.fn()}
        onSkip={onSkip}
        allowSkip={true}
      />
    );

    expect(screen.getByTestId('skip-button')).toBeInTheDocument();
  });

  it('does not render skip button when allowSkip is false', () => {
    render(
      <CheckpointView
        checkpoint={mockCheckpoint}
        onComplete={jest.fn()}
        onSkip={jest.fn()}
        allowSkip={false}
      />
    );

    expect(screen.queryByTestId('skip-button')).not.toBeInTheDocument();
  });

  it('calls onSkip when skip button is clicked', () => {
    const onSkip = jest.fn();
    render(
      <CheckpointView
        checkpoint={mockCheckpoint}
        onComplete={jest.fn()}
        onSkip={onSkip}
        allowSkip={true}
      />
    );

    fireEvent.click(screen.getByTestId('skip-button'));

    expect(onSkip).toHaveBeenCalled();
  });

  it('renders multiple choice question first', () => {
    render(<CheckpointView checkpoint={mockCheckpoint} onComplete={jest.fn()} />);

    // Should show the first question which is multiple choice
    expect(screen.getByText('What is attention?')).toBeInTheDocument();
  });

  it('shows continue button after answering a question', async () => {
    render(<CheckpointView checkpoint={mockCheckpoint} onComplete={jest.fn()} />);

    // Answer the multiple choice question
    const correctOption = screen.getByText('A mechanism to focus on relevant parts');
    fireEvent.click(correctOption);

    // Submit the answer
    const submitButton = screen.getByText('Check Answer');
    fireEvent.click(submitButton);

    // Continue button should appear
    await waitFor(() => {
      expect(screen.getByTestId('continue-button')).toBeInTheDocument();
    });
  });

  it('advances to next question when continue is clicked', async () => {
    render(<CheckpointView checkpoint={mockCheckpoint} onComplete={jest.fn()} />);

    // Answer first question
    fireEvent.click(screen.getByText('A mechanism to focus on relevant parts'));
    fireEvent.click(screen.getByText('Check Answer'));

    // Click continue
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('continue-button'));
    });

    // Should now show question 2 of 3
    expect(screen.getByText(/Question 2 of 3/)).toBeInTheDocument();
  });

  it('shows completion screen after last question', async () => {
    const onComplete = jest.fn();
    render(
      <CheckpointView checkpoint={singleQuestionCheckpoint} onComplete={onComplete} />
    );

    // Answer the only question correctly (Option Alpha is at index 0)
    fireEvent.click(screen.getByTestId('option-0'));
    fireEvent.click(screen.getByText('Check Answer'));

    // Should show completion screen
    await waitFor(() => {
      expect(screen.getByTestId('checkpoint-complete')).toBeInTheDocument();
    });
  });

  it('calls onComplete with results and score', async () => {
    const onComplete = jest.fn();
    render(
      <CheckpointView checkpoint={singleQuestionCheckpoint} onComplete={onComplete} />
    );

    // Answer correctly (Option Alpha is at index 0)
    fireEvent.click(screen.getByTestId('option-0'));
    fireEvent.click(screen.getByText('Check Answer'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            questionId: 'q1',
            isCorrect: true,
          }),
        ]),
        100 // 100% score
      );
    });
  });

  it('displays score on completion screen', async () => {
    render(
      <CheckpointView checkpoint={singleQuestionCheckpoint} onComplete={jest.fn()} />
    );

    // Answer correctly (index 0)
    fireEvent.click(screen.getByTestId('option-0'));
    fireEvent.click(screen.getByText('Check Answer'));

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText(/1 of 1/)).toBeInTheDocument();
    });
  });

  it('shows encouraging message for high score', async () => {
    render(
      <CheckpointView checkpoint={singleQuestionCheckpoint} onComplete={jest.fn()} />
    );

    // Answer correctly for 100% (index 0)
    fireEvent.click(screen.getByTestId('option-0'));
    fireEvent.click(screen.getByText('Check Answer'));

    await waitFor(() => {
      expect(screen.getByText(/Excellent work/)).toBeInTheDocument();
    });
  });

  it('shows review message for low score', async () => {
    const onComplete = jest.fn();
    render(
      <CheckpointView checkpoint={singleQuestionCheckpoint} onComplete={onComplete} />
    );

    // Answer incorrectly (index 1 is wrong, correct is 0)
    fireEvent.click(screen.getByTestId('option-1'));
    fireEvent.click(screen.getByText('Check Answer'));

    await waitFor(() => {
      expect(screen.getByText(/Consider reviewing/)).toBeInTheDocument();
    });
  });

  it('renders progress bar', () => {
    render(<CheckpointView checkpoint={mockCheckpoint} onComplete={jest.fn()} />);

    // Progress bar should exist
    const progressBar = document.querySelector('.bg-blue-500');
    expect(progressBar).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <CheckpointView
        checkpoint={mockCheckpoint}
        onComplete={jest.fn()}
        className="custom-class"
      />
    );

    expect(screen.getByTestId('checkpoint-view')).toHaveClass('custom-class');
  });
});
