/**
 * CurrentEventCard Component Tests
 *
 * Tests the current event card component for:
 * - Rendering event headline and summary
 * - Display of source and date information
 * - Click interaction to view context
 * - Featured badge visibility
 * - Keyboard accessibility
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { CurrentEventCard } from '../../../../src/components/CurrentEvents/CurrentEventCard';
import type { CurrentEvent } from '../../../../src/types/currentEvent';

// Mock current event data
const mockEvent: CurrentEvent = {
  id: 'test-event-1',
  headline: 'OpenAI releases GPT-5 with advanced reasoning',
  summary:
    'OpenAI has announced GPT-5, featuring unprecedented reasoning capabilities and improved safety measures. The model demonstrates breakthrough performance on complex tasks.',
  sourceUrl: 'https://openai.com/blog/gpt-5',
  sourcePublisher: 'OpenAI',
  publishedDate: '2024-03-15',
  prerequisiteMilestoneIds: ['E2017_TRANSFORMER', 'E2020_GPT3', 'E2023_GPT4'],
  connectionExplanation:
    'GPT-5 builds on the transformer architecture and scaling insights from previous GPT models.',
  featured: true,
};

const mockNonFeaturedEvent: CurrentEvent = {
  ...mockEvent,
  id: 'test-event-2',
  headline: 'Meta releases Llama 3',
  featured: false,
};

describe('CurrentEventCard', () => {
  it('renders the event headline', () => {
    render(<CurrentEventCard event={mockEvent} onViewContext={jest.fn()} />);

    expect(
      screen.getByText('OpenAI releases GPT-5 with advanced reasoning')
    ).toBeInTheDocument();
  });

  it('renders the event summary', () => {
    render(<CurrentEventCard event={mockEvent} onViewContext={jest.fn()} />);

    expect(
      screen.getByText(/OpenAI has announced GPT-5/)
    ).toBeInTheDocument();
  });

  it('renders the source publisher', () => {
    render(<CurrentEventCard event={mockEvent} onViewContext={jest.fn()} />);

    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });

  it('renders the formatted date', () => {
    render(<CurrentEventCard event={mockEvent} onViewContext={jest.fn()} />);

    // Date format varies by timezone, so check for partial match
    expect(screen.getByText(/Mar \d+, 2024/)).toBeInTheDocument();
  });

  it('displays milestone count', () => {
    render(<CurrentEventCard event={mockEvent} onViewContext={jest.fn()} />);

    expect(screen.getByText('3 milestones to understand this')).toBeInTheDocument();
  });

  it('shows "Get context" CTA', () => {
    render(<CurrentEventCard event={mockEvent} onViewContext={jest.fn()} />);

    expect(screen.getByText('Get context')).toBeInTheDocument();
  });

  it('shows Featured badge when event is featured', () => {
    render(<CurrentEventCard event={mockEvent} onViewContext={jest.fn()} />);

    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('does not show Featured badge when event is not featured', () => {
    render(
      <CurrentEventCard event={mockNonFeaturedEvent} onViewContext={jest.fn()} />
    );

    expect(screen.queryByText('Featured')).not.toBeInTheDocument();
  });

  it('calls onViewContext when card is clicked', () => {
    const onViewContext = jest.fn();
    render(<CurrentEventCard event={mockEvent} onViewContext={onViewContext} />);

    const card = screen.getByTestId('current-event-card-test-event-1');
    fireEvent.click(card);

    expect(onViewContext).toHaveBeenCalledWith(mockEvent);
  });

  it('calls onViewContext when Enter key is pressed', () => {
    const onViewContext = jest.fn();
    render(<CurrentEventCard event={mockEvent} onViewContext={onViewContext} />);

    const card = screen.getByTestId('current-event-card-test-event-1');
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(onViewContext).toHaveBeenCalledWith(mockEvent);
  });

  it('calls onViewContext when Space key is pressed', () => {
    const onViewContext = jest.fn();
    render(<CurrentEventCard event={mockEvent} onViewContext={onViewContext} />);

    const card = screen.getByTestId('current-event-card-test-event-1');
    fireEvent.keyDown(card, { key: ' ' });

    expect(onViewContext).toHaveBeenCalledWith(mockEvent);
  });

  it('has correct test ID based on event ID', () => {
    render(<CurrentEventCard event={mockEvent} onViewContext={jest.fn()} />);

    expect(screen.getByTestId('current-event-card-test-event-1')).toBeInTheDocument();
  });

  it('has role="button" for accessibility', () => {
    render(<CurrentEventCard event={mockEvent} onViewContext={jest.fn()} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles event without sourcePublisher', () => {
    const eventWithoutSource: CurrentEvent = {
      ...mockEvent,
      sourcePublisher: undefined,
    };
    render(
      <CurrentEventCard event={eventWithoutSource} onViewContext={jest.fn()} />
    );

    // Should still render without errors
    expect(
      screen.getByText('OpenAI releases GPT-5 with advanced reasoning')
    ).toBeInTheDocument();
    // Source publisher text should not be present
    expect(screen.queryByText('OpenAI')).not.toBeInTheDocument();
  });
});
