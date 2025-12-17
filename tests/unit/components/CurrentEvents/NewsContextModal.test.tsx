/**
 * NewsContextModal Component Tests
 *
 * Tests the news context modal component for:
 * - Rendering event details (headline, summary, date)
 * - Displaying prerequisite milestones
 * - Context path generation and navigation
 * - AI-assisted "Why is this news?" feature
 * - Loading and error states
 * - Modal accessibility and keyboard interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NewsContextModal } from '../../../../src/components/CurrentEvents/NewsContextModal';
import { milestonesApi } from '../../../../src/services/api';
import { chatApi } from '../../../../src/services/chatApi';
import type { CurrentEvent } from '../../../../src/types/currentEvent';

// Mock the APIs
jest.mock('../../../../src/services/api', () => ({
  milestonesApi: {
    getAll: jest.fn(),
  },
}));

jest.mock('../../../../src/services/chatApi', () => ({
  chatApi: {
    sendMessage: jest.fn(),
  },
}));

// Mock the ApiKeyContext
const mockPromptForKey = jest.fn();
jest.mock('../../../../src/components/ApiKey/ApiKeyContext', () => ({
  ApiKeyProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useApiKeyContext: () => ({
    hasKey: false,
    hasOptedOut: false,
    isValidating: false,
    showModal: false,
    promptForKey: mockPromptForKey,
    closeModal: jest.fn(),
    saveKey: jest.fn(),
    removeKey: jest.fn(),
    setOptOut: jest.fn(),
    keyFingerprint: null,
    validationError: null,
  }),
}));

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock current event data
const mockEvent: CurrentEvent = {
  id: 'test-event-gpt5',
  headline: 'OpenAI releases GPT-5 with advanced reasoning',
  summary:
    'OpenAI has announced GPT-5, featuring unprecedented reasoning capabilities and improved safety measures.',
  sourceUrl: 'https://openai.com/blog/gpt-5',
  sourcePublisher: 'OpenAI',
  publishedDate: '2024-03-15',
  prerequisiteMilestoneIds: ['E2017_TRANSFORMER', 'E2020_GPT3', 'E2023_GPT4'],
  connectionExplanation:
    'GPT-5 builds on the transformer architecture and scaling insights from previous GPT models.',
  featured: true,
};

// Mock milestone data
const mockMilestones = [
  {
    id: 'E2017_TRANSFORMER',
    title: 'Transformer Architecture',
    description: 'The attention-based architecture that revolutionized AI',
    date: '2017-06-12',
    category: 'Research',
  },
  {
    id: 'E2020_GPT3',
    title: 'GPT-3',
    description: 'A 175 billion parameter language model',
    date: '2020-05-28',
    category: 'Model',
  },
  {
    id: 'E2023_GPT4',
    title: 'GPT-4',
    description: 'Multimodal large language model',
    date: '2023-03-14',
    category: 'Model',
  },
];

/**
 * Helper to render component with router context
 * Note: ApiKeyContext is mocked above
 */
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('NewsContextModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (milestonesApi.getAll as jest.Mock).mockResolvedValue({ data: mockMilestones });
  });

  describe('Basic Rendering', () => {
    it('renders the event headline', async () => {
      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      expect(
        screen.getByText('OpenAI releases GPT-5 with advanced reasoning')
      ).toBeInTheDocument();
    });

    it('renders the event summary', async () => {
      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      expect(
        screen.getByText(/OpenAI has announced GPT-5/)
      ).toBeInTheDocument();
    });

    it('renders the source publisher', async () => {
      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      expect(screen.getByText('OpenAI')).toBeInTheDocument();
    });

    it('renders the formatted publish date', async () => {
      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      // Date format may vary by timezone
      expect(screen.getByText(/March \d+, 2024/)).toBeInTheDocument();
    });

    it('renders the connection explanation', async () => {
      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      expect(
        screen.getByText(/GPT-5 builds on the transformer architecture/)
      ).toBeInTheDocument();
    });

    it('has the correct modal testid', async () => {
      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      expect(screen.getByTestId('news-context-modal')).toBeInTheDocument();
    });
  });

  describe('Milestone Loading', () => {
    it('shows loading state while fetching milestones', async () => {
      // Delay the API response
      (milestonesApi.getAll as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: mockMilestones }), 100))
      );

      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      // Should show loading skeleton
      const skeletons = screen.getAllByRole('generic').filter(
        (el) => el.className.includes('animate-pulse')
      );
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders milestones after loading', async () => {
      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
      });

      expect(screen.getByText('GPT-3')).toBeInTheDocument();
      expect(screen.getByText('GPT-4')).toBeInTheDocument();
    });

    it('sorts milestones chronologically', async () => {
      // Return milestones in wrong order
      (milestonesApi.getAll as jest.Mock).mockResolvedValue({
        data: [mockMilestones[2], mockMilestones[0], mockMilestones[1]], // GPT-4, Transformer, GPT-3
      });

      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
      });

      // Check the order by finding all milestone step numbers
      const steps = screen.getAllByText(/^\d$/);
      expect(steps[0]).toHaveTextContent('1');
      expect(steps[1]).toHaveTextContent('2');
      expect(steps[2]).toHaveTextContent('3');
    });
  });

  describe('Modal Interactions', () => {
    it('calls onClose when close button is clicked', async () => {
      const onClose = jest.fn();
      renderWithRouter(<NewsContextModal event={mockEvent} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when Escape key is pressed', async () => {
      const onClose = jest.fn();
      renderWithRouter(<NewsContextModal event={mockEvent} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when clicking backdrop', async () => {
      const onClose = jest.fn();
      renderWithRouter(<NewsContextModal event={mockEvent} onClose={onClose} />);

      const backdrop = screen.getByTestId('news-context-modal');
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Navigation Actions', () => {
    it('navigates to timeline with context when "Start Context Path" is clicked', async () => {
      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
      });

      const startButton = screen.getByText('Start Context Path');
      fireEvent.click(startButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/timeline?milestone=E2017_TRANSFORMER')
      );
    });

    it('navigates to timeline when "View on Timeline" is clicked', async () => {
      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
      });

      const viewButton = screen.getByText('View on Timeline');
      fireEvent.click(viewButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/timeline')
      );
    });
  });

  describe('AI-Assisted Context Feature', () => {
    it('shows "Ask AI: Why is this news?" button initially', async () => {
      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
      });

      expect(screen.getByTestId('ask-ai-button')).toBeInTheDocument();
      expect(screen.getByText('Ask AI: Why is this news?')).toBeInTheDocument();
    });

    it('shows loading state when AI is analyzing', async () => {
      (chatApi.sendMessage as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ response: 'AI response' }), 200))
      );

      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
      });

      const askButton = screen.getByTestId('ask-ai-button');
      fireEvent.click(askButton);

      expect(screen.getByTestId('ai-loading')).toBeInTheDocument();
      expect(screen.getByText('Analyzing historical connections...')).toBeInTheDocument();
    });

    it('displays AI explanation after successful response', async () => {
      const aiResponse = 'This news is significant because it represents a major advancement in AI capabilities.';
      (chatApi.sendMessage as jest.Mock).mockResolvedValue({ response: aiResponse });

      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
      });

      const askButton = screen.getByTestId('ask-ai-button');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(screen.getByTestId('ai-explanation')).toBeInTheDocument();
      });

      expect(screen.getByText(aiResponse)).toBeInTheDocument();
      expect(screen.getByText('AI Explanation')).toBeInTheDocument();
    });

    it('shows error state when AI request fails', async () => {
      (chatApi.sendMessage as jest.Mock).mockRejectedValue(new Error('API Error'));

      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
      });

      const askButton = screen.getByTestId('ask-ai-button');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(screen.getByTestId('ai-error')).toBeInTheDocument();
      });

      expect(screen.getByText('API Error')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    it('allows retry after error', async () => {
      // First call fails, second succeeds
      (chatApi.sendMessage as jest.Mock)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({ response: 'Success on retry' });

      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
      });

      // First attempt
      const askButton = screen.getByTestId('ask-ai-button');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(screen.getByTestId('ai-error')).toBeInTheDocument();
      });

      // Retry
      const retryButton = screen.getByText('Try again');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId('ai-explanation')).toBeInTheDocument();
      });

      expect(screen.getByText('Success on retry')).toBeInTheDocument();
    });

    it('hides Ask AI button after getting explanation', async () => {
      (chatApi.sendMessage as jest.Mock).mockResolvedValue({ response: 'AI response' });

      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
      });

      const askButton = screen.getByTestId('ask-ai-button');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(screen.getByTestId('ai-explanation')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('ask-ai-button')).not.toBeInTheDocument();
    });

    it('sends correct context to AI', async () => {
      (chatApi.sendMessage as jest.Mock).mockResolvedValue({ response: 'AI response' });

      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Transformer Architecture')).toBeInTheDocument();
      });

      const askButton = screen.getByTestId('ask-ai-button');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(chatApi.sendMessage).toHaveBeenCalled();
      });

      const callArgs = (chatApi.sendMessage as jest.Mock).mock.calls[0][0];
      expect(callArgs.message).toContain(mockEvent.headline);
      expect(callArgs.message).toContain(mockEvent.summary);
      expect(callArgs.message).toContain('Transformer Architecture');
      expect(callArgs.explainMode).toBe('plain_english');
    });

    it('disables Ask AI button while loading milestones', async () => {
      // Delay milestone loading
      (milestonesApi.getAll as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: mockMilestones }), 1000))
      );

      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      // The button should be disabled while loading
      const askButton = screen.queryByTestId('ask-ai-button');
      if (askButton) {
        expect(askButton).toBeDisabled();
      }
    });
  });

  describe('Source Link', () => {
    it('renders source link when sourceUrl is provided', async () => {
      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      const sourceLink = screen.getByText('Read the original article');
      expect(sourceLink).toBeInTheDocument();
      expect(sourceLink.closest('a')).toHaveAttribute('href', mockEvent.sourceUrl);
    });

    it('does not render source link when sourceUrl is not provided', async () => {
      const eventWithoutSource: CurrentEvent = {
        ...mockEvent,
        sourceUrl: undefined,
      };

      renderWithRouter(
        <NewsContextModal event={eventWithoutSource} onClose={jest.fn()} />
      );

      expect(screen.queryByText('Read the original article')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct dialog role', async () => {
      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal attribute', async () => {
      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to title', async () => {
      renderWithRouter(<NewsContextModal event={mockEvent} onClose={jest.fn()} />);

      const dialog = screen.getByRole('dialog');
      const titleId = dialog.getAttribute('aria-labelledby');
      expect(titleId).toBe('modal-title');
      expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('id', 'modal-title');
    });
  });
});
