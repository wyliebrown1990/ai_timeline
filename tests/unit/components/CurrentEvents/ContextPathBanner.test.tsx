/**
 * ContextPathBanner Component Tests
 *
 * Tests the context path banner displayed when navigating from current events:
 * - Visibility based on URL context parameter
 * - Progress display and navigation
 * - Exit functionality
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { ContextPathBanner } from '../../../../src/components/CurrentEvents/ContextPathBanner';
import * as contextPathUtils from '../../../../src/utils/contextPathUtils';

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock the contextPathUtils
jest.mock('../../../../src/utils/contextPathUtils');

// Test context path data
const mockContextPath: contextPathUtils.ContextPath = {
  newsEventId: 'test-news-1',
  newsHeadline: 'OpenAI Releases GPT-5',
  milestoneIds: ['E2017_TRANSFORMER', 'E2020_GPT3', 'E2023_GPT4'],
  estimatedMinutes: 9,
  title: 'Understanding: OpenAI Releases GPT-5',
  createdAt: '2024-03-15T12:00:00Z',
};

// Wrapper component that sets URL params
function TestWrapper({
  children,
  contextParam,
}: {
  children: React.ReactNode;
  contextParam?: string;
}) {
  const initialEntry = contextParam
    ? `/timeline?context=${contextParam}`
    : '/timeline';
  return (
    <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  );
}

describe('ContextPathBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when no context param in URL', () => {
    (contextPathUtils.loadContextPath as jest.Mock).mockReturnValue(null);

    render(
      <TestWrapper>
        <ContextPathBanner />
      </TestWrapper>
    );

    expect(screen.queryByTestId('context-path-banner')).not.toBeInTheDocument();
  });

  it('does not render when context param present but no saved path', () => {
    (contextPathUtils.loadContextPath as jest.Mock).mockReturnValue(null);

    render(
      <TestWrapper contextParam="test-news-1">
        <ContextPathBanner />
      </TestWrapper>
    );

    expect(screen.queryByTestId('context-path-banner')).not.toBeInTheDocument();
  });

  it('renders when context param matches saved path', () => {
    (contextPathUtils.loadContextPath as jest.Mock).mockReturnValue(mockContextPath);

    render(
      <TestWrapper contextParam="test-news-1">
        <ContextPathBanner currentMilestoneId="E2017_TRANSFORMER" />
      </TestWrapper>
    );

    expect(screen.getByTestId('context-path-banner')).toBeInTheDocument();
    expect(screen.getByText('OpenAI Releases GPT-5')).toBeInTheDocument();
    expect(screen.getByText('Understanding the News')).toBeInTheDocument();
  });

  it('shows correct progress (1 of 3) for first milestone', () => {
    (contextPathUtils.loadContextPath as jest.Mock).mockReturnValue(mockContextPath);

    render(
      <TestWrapper contextParam="test-news-1">
        <ContextPathBanner currentMilestoneId="E2017_TRANSFORMER" />
      </TestWrapper>
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows correct progress (2 of 3) for second milestone', () => {
    (contextPathUtils.loadContextPath as jest.Mock).mockReturnValue(mockContextPath);

    render(
      <TestWrapper contextParam="test-news-1">
        <ContextPathBanner currentMilestoneId="E2020_GPT3" />
      </TestWrapper>
    );

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('disables previous button on first milestone', () => {
    (contextPathUtils.loadContextPath as jest.Mock).mockReturnValue(mockContextPath);

    render(
      <TestWrapper contextParam="test-news-1">
        <ContextPathBanner currentMilestoneId="E2017_TRANSFORMER" />
      </TestWrapper>
    );

    const prevButton = screen.getByLabelText('Previous milestone');
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last milestone', () => {
    (contextPathUtils.loadContextPath as jest.Mock).mockReturnValue(mockContextPath);

    render(
      <TestWrapper contextParam="test-news-1">
        <ContextPathBanner currentMilestoneId="E2023_GPT4" />
      </TestWrapper>
    );

    const nextButton = screen.getByLabelText('Next milestone');
    expect(nextButton).toBeDisabled();
  });

  it('enables both navigation buttons on middle milestone', () => {
    (contextPathUtils.loadContextPath as jest.Mock).mockReturnValue(mockContextPath);

    render(
      <TestWrapper contextParam="test-news-1">
        <ContextPathBanner currentMilestoneId="E2020_GPT3" />
      </TestWrapper>
    );

    const prevButton = screen.getByLabelText('Previous milestone');
    const nextButton = screen.getByLabelText('Next milestone');
    expect(prevButton).not.toBeDisabled();
    expect(nextButton).not.toBeDisabled();
  });

  it('navigates to next milestone when next button clicked', () => {
    (contextPathUtils.loadContextPath as jest.Mock).mockReturnValue(mockContextPath);
    const onNavigate = jest.fn();

    render(
      <TestWrapper contextParam="test-news-1">
        <ContextPathBanner
          currentMilestoneId="E2017_TRANSFORMER"
          onNavigate={onNavigate}
        />
      </TestWrapper>
    );

    fireEvent.click(screen.getByLabelText('Next milestone'));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/timeline?milestone=E2020_GPT3&context=test-news-1'
    );
    expect(onNavigate).toHaveBeenCalledWith('E2020_GPT3');
  });

  it('navigates to previous milestone when previous button clicked', () => {
    (contextPathUtils.loadContextPath as jest.Mock).mockReturnValue(mockContextPath);
    const onNavigate = jest.fn();

    render(
      <TestWrapper contextParam="test-news-1">
        <ContextPathBanner
          currentMilestoneId="E2020_GPT3"
          onNavigate={onNavigate}
        />
      </TestWrapper>
    );

    fireEvent.click(screen.getByLabelText('Previous milestone'));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/timeline?milestone=E2017_TRANSFORMER&context=test-news-1'
    );
    expect(onNavigate).toHaveBeenCalledWith('E2017_TRANSFORMER');
  });

  it('clears context path and navigates when exit button clicked', () => {
    (contextPathUtils.loadContextPath as jest.Mock).mockReturnValue(mockContextPath);

    render(
      <TestWrapper contextParam="test-news-1">
        <ContextPathBanner currentMilestoneId="E2020_GPT3" />
      </TestWrapper>
    );

    fireEvent.click(screen.getByLabelText('Exit context path'));

    expect(contextPathUtils.clearContextPath).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/timeline?milestone=E2020_GPT3');
  });

  it('shows dash for progress when current milestone not in path', () => {
    (contextPathUtils.loadContextPath as jest.Mock).mockReturnValue(mockContextPath);

    render(
      <TestWrapper contextParam="test-news-1">
        <ContextPathBanner currentMilestoneId="E1999_RANDOM" />
      </TestWrapper>
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
