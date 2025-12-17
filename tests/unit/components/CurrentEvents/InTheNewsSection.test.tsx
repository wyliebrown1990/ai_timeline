/**
 * InTheNewsSection Component Tests
 *
 * Tests the In The News homepage section for:
 * - Rendering current events
 * - Featured events display
 * - Expand/collapse functionality
 * - Modal opening on card click
 */

import type { CurrentEvent } from '../../../../src/types/currentEvent';

// Mock the useContent hooks BEFORE importing the component
const mockUseFeaturedCurrentEvents = jest.fn();
const mockUseCurrentEvents = jest.fn();

jest.mock('../../../../src/hooks/useContent', () => ({
  useFeaturedCurrentEvents: () => mockUseFeaturedCurrentEvents(),
  useCurrentEvents: () => mockUseCurrentEvents(),
}));

// Now import the components after mocking
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InTheNewsSection } from '../../../../src/components/CurrentEvents/InTheNewsSection';

// Mock the NewsContextModal to simplify testing
jest.mock(
  '../../../../src/components/CurrentEvents/NewsContextModal',
  () => ({
    NewsContextModal: ({ event, onClose }: { event: CurrentEvent; onClose: () => void }) => (
      <div data-testid="mock-modal">
        <span data-testid="modal-headline">{event.headline}</span>
        <button onClick={onClose} data-testid="close-modal">
          Close
        </button>
      </div>
    ),
  })
);

// Test data
const mockFeaturedEvents: CurrentEvent[] = [
  {
    id: 'featured-1',
    headline: 'Featured AI News Story 1',
    summary: 'This is a featured story about AI developments.',
    sourcePublisher: 'TechNews',
    publishedDate: '2024-03-15',
    prerequisiteMilestoneIds: ['E2017_TRANSFORMER', 'E2020_GPT3'],
    connectionExplanation: 'Connection explanation here.',
    featured: true,
  },
  {
    id: 'featured-2',
    headline: 'Featured AI News Story 2',
    summary: 'Another featured story about AI.',
    sourcePublisher: 'AIWeekly',
    publishedDate: '2024-03-14',
    prerequisiteMilestoneIds: ['E2022_CHATGPT'],
    connectionExplanation: 'Another connection explanation.',
    featured: true,
  },
];

const mockAllEvents: CurrentEvent[] = [
  ...mockFeaturedEvents,
  {
    id: 'regular-1',
    headline: 'Regular AI News Story 1',
    summary: 'A regular news story.',
    sourcePublisher: 'TechBlog',
    publishedDate: '2024-03-13',
    prerequisiteMilestoneIds: ['E2023_GPT4'],
    connectionExplanation: 'Regular connection.',
    featured: false,
  },
  {
    id: 'regular-2',
    headline: 'Regular AI News Story 2',
    summary: 'Another regular story.',
    sourcePublisher: 'AI Journal',
    publishedDate: '2024-03-12',
    prerequisiteMilestoneIds: ['E2017_TRANSFORMER'],
    connectionExplanation: 'Another regular connection.',
    featured: false,
  },
  {
    id: 'regular-3',
    headline: 'Regular AI News Story 3',
    summary: 'Third regular story.',
    sourcePublisher: 'Tech Times',
    publishedDate: '2024-03-11',
    prerequisiteMilestoneIds: ['E2020_GPT3'],
    connectionExplanation: 'Third connection.',
    featured: false,
  },
];

// Wrapper component for Router context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe('InTheNewsSection', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Default mock implementation
    mockUseFeaturedCurrentEvents.mockReturnValue({
      data: mockFeaturedEvents,
      isLoading: false,
      error: null,
    });
    mockUseCurrentEvents.mockReturnValue({
      data: mockAllEvents,
      isLoading: false,
      error: null,
    });
  });

  it('renders the section header', () => {
    render(
      <TestWrapper>
        <InTheNewsSection />
      </TestWrapper>
    );

    expect(screen.getByText('In The News')).toBeInTheDocument();
    expect(
      screen.getByText("Understand today's AI headlines through history")
    ).toBeInTheDocument();
  });

  it('renders default number of event cards (3)', () => {
    render(
      <TestWrapper>
        <InTheNewsSection />
      </TestWrapper>
    );

    // Should show 3 events by default
    expect(
      screen.getByTestId('current-event-card-featured-1')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('current-event-card-featured-2')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('current-event-card-regular-1')
    ).toBeInTheDocument();

    // Should not show 4th and 5th events
    expect(
      screen.queryByTestId('current-event-card-regular-2')
    ).not.toBeInTheDocument();
  });

  it('renders custom maxEvents when specified', () => {
    render(
      <TestWrapper>
        <InTheNewsSection maxEvents={2} />
      </TestWrapper>
    );

    // Should show only 2 events
    expect(
      screen.getByTestId('current-event-card-featured-1')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('current-event-card-featured-2')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('current-event-card-regular-1')
    ).not.toBeInTheDocument();
  });

  it('shows expand button when more events available', () => {
    render(
      <TestWrapper>
        <InTheNewsSection />
      </TestWrapper>
    );

    expect(screen.getByText('See all 5 stories')).toBeInTheDocument();
  });

  it('expands to show all events when button clicked', () => {
    render(
      <TestWrapper>
        <InTheNewsSection />
      </TestWrapper>
    );

    // Click expand button
    fireEvent.click(screen.getByText('See all 5 stories'));

    // Should now show all 5 events
    expect(
      screen.getByTestId('current-event-card-featured-1')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('current-event-card-featured-2')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('current-event-card-regular-1')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('current-event-card-regular-2')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('current-event-card-regular-3')
    ).toBeInTheDocument();

    // Button text should change
    expect(screen.getByText('Show less')).toBeInTheDocument();
  });

  it('collapses when show less button clicked', () => {
    render(
      <TestWrapper>
        <InTheNewsSection />
      </TestWrapper>
    );

    // Expand first
    fireEvent.click(screen.getByText('See all 5 stories'));

    // Then collapse
    fireEvent.click(screen.getByText('Show less'));

    // Should be back to 3 events
    expect(
      screen.queryByTestId('current-event-card-regular-2')
    ).not.toBeInTheDocument();
    expect(screen.getByText('See all 5 stories')).toBeInTheDocument();
  });

  it('opens modal when event card is clicked', () => {
    render(
      <TestWrapper>
        <InTheNewsSection />
      </TestWrapper>
    );

    // Click on an event card
    fireEvent.click(screen.getByTestId('current-event-card-featured-1'));

    // Modal should appear with the event headline
    expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-headline')).toHaveTextContent(
      'Featured AI News Story 1'
    );
  });

  it('closes modal when close button clicked', () => {
    render(
      <TestWrapper>
        <InTheNewsSection />
      </TestWrapper>
    );

    // Open modal
    fireEvent.click(screen.getByTestId('current-event-card-featured-1'));
    expect(screen.getByTestId('mock-modal')).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByTestId('close-modal'));
    expect(screen.queryByTestId('mock-modal')).not.toBeInTheDocument();
  });

  it('does not render when no events available', () => {
    mockUseFeaturedCurrentEvents.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    mockUseCurrentEvents.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    const { container } = render(
      <TestWrapper>
        <InTheNewsSection />
      </TestWrapper>
    );

    // Section should not render anything
    expect(container.firstChild).toBeNull();
  });

  it('prioritizes featured events in display order', () => {
    render(
      <TestWrapper>
        <InTheNewsSection />
      </TestWrapper>
    );

    // Get all cards in order
    const cards = screen.getAllByRole('button');

    // First two should be featured events
    expect(cards[0]).toHaveAttribute(
      'data-testid',
      'current-event-card-featured-1'
    );
    expect(cards[1]).toHaveAttribute(
      'data-testid',
      'current-event-card-featured-2'
    );
  });

  it('does not show expand button when events <= maxEvents', () => {
    mockUseFeaturedCurrentEvents.mockReturnValue({
      data: [mockFeaturedEvents[0]],
      isLoading: false,
      error: null,
    });
    mockUseCurrentEvents.mockReturnValue({
      data: [mockFeaturedEvents[0]],
      isLoading: false,
      error: null,
    });

    render(
      <TestWrapper>
        <InTheNewsSection maxEvents={3} />
      </TestWrapper>
    );

    expect(screen.queryByText(/See all/)).not.toBeInTheDocument();
    expect(screen.queryByText('Show less')).not.toBeInTheDocument();
  });
});
